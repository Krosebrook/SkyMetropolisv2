
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, GameAction, BuildingType, NewsType } from '../types';
import { cityService } from '../services/cityService';
import { storageRepository } from '../repositories/storageRepository';
import { INITIAL_MONEY, TICK_RATE_MS } from '../constants';
import { generateCityGoal, generateNewsEvent } from '../services/geminiService';

const getInitialState = (): GameState => {
  const saved = storageRepository.load();
  return {
    grid: cityService.createInitialGrid(),
    stats: { money: INITIAL_MONEY, population: 0, day: 1, happiness: 100 },
    selectedTool: BuildingType.Road,
    aiEnabled: true,
    sandboxMode: false,
    currentGoal: null,
    isGeneratingGoal: false,
    newsFeed: [],
    lastSound: null,
    ...saved,
    gameStarted: false, // Reset session state - this overrides the earlier gameStarted if it was in saved
  };
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, gameStarted: true, aiEnabled: action.aiEnabled, sandboxMode: action.sandboxMode };
    
    case 'TICK': {
      const newStats = cityService.calculateNextDay(state.stats, state.grid);
      let updatedGoal = state.currentGoal;
      
      // Goal completion check
      if (state.aiEnabled && state.currentGoal && !state.currentGoal.completed) {
        const metrics = cityService.aggregateMetrics(state.grid);
        const g = state.currentGoal;
        const isMet = 
            (g.targetType === 'money' && newStats.money >= g.targetValue) ||
            (g.targetType === 'population' && newStats.population >= g.targetValue) ||
            (g.targetType === 'building_count' && g.buildingType && metrics.counts[g.buildingType] >= g.targetValue);

        if (isMet) updatedGoal = { ...g, completed: true };
      }
      return { ...state, stats: newStats, currentGoal: updatedGoal };
    }

    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.tool };

    case 'APPLY_ACTION':
      return {
        ...state,
        grid: action.grid,
        stats: { ...state.stats, money: state.sandboxMode ? state.stats.money : state.stats.money - action.cost },
        lastSound: { key: action.isBulldoze ? 'bulldoze' : 'place', id: Date.now() }
      };

    case 'ACTION_FAILED':
      return {
        ...state,
        lastSound: { key: 'error', id: Date.now() },
        // Use type assertion 'as NewsType' to fix assignment compatibility error
        newsFeed: [{ id: Date.now().toString(), text: action.error, type: 'negative' as NewsType, timestamp: Date.now() }, ...state.newsFeed].slice(0, 10)
      };

    case 'SET_GOAL':
      return { ...state, currentGoal: action.goal };
    
    case 'SET_GENERATING_GOAL':
      return { ...state, isGeneratingGoal: action.isGenerating };

    case 'ADD_NEWS':
      return { ...state, newsFeed: [action.news, ...state.newsFeed].slice(0, 12) };

    case 'CLAIM_REWARD':
      if (!state.currentGoal?.completed) return state;
      return {
        ...state,
        stats: { ...state.stats, money: state.stats.money + state.currentGoal.reward },
        currentGoal: null,
        lastSound: { key: 'reward', id: Date.now() }
      };

    case 'RESET_GAME':
      storageRepository.clear();
      return getInitialState();

    default:
      return state;
  }
};

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  actions: {
    handleTileClick: (x: number, y: number) => void;
  };
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, undefined, getInitialState);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Persist on change
  useEffect(() => {
    storageRepository.save(state);
  }, [state]);

  // Game loop
  useEffect(() => {
    if (!state.gameStarted) return;
    const interval = setInterval(() => dispatch({ type: 'TICK' }), TICK_RATE_MS);
    return () => clearInterval(interval);
  }, [state.gameStarted]);

  // AI Services
  useEffect(() => {
    if (!state.gameStarted || !state.aiEnabled) return;
    
    const goalInt = setInterval(async () => {
      const s = stateRef.current;
      if (s.currentGoal || s.isGeneratingGoal) return;
      dispatch({ type: 'SET_GENERATING_GOAL', isGenerating: true });
      const goal = await generateCityGoal(s.stats, s.grid as any);
      dispatch({ type: 'SET_GOAL', goal });
      dispatch({ type: 'SET_GENERATING_GOAL', isGenerating: false });
    }, 15000);

    const newsInt = setInterval(async () => {
      if (Math.random() > 0.4) return;
      const news = await generateNewsEvent(stateRef.current.stats);
      if (news) dispatch({ type: 'ADD_NEWS', news });
    }, 20000);

    return () => { clearInterval(goalInt); clearInterval(newsInt); };
  }, [state.gameStarted, state.aiEnabled]);

  const handleTileClick = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    const result = cityService.executeAction(s.grid, s.stats, x, y, s.selectedTool, s.sandboxMode);
    if (result.success) {
      dispatch({ type: 'APPLY_ACTION', grid: result.newGrid, cost: result.cost, isBulldoze: result.isBulldoze });
    } else {
      dispatch({ type: 'ACTION_FAILED', error: result.error });
    }
  }, []);

  const value = useMemo(() => ({
    state,
    dispatch,
    actions: { handleTileClick }
  }), [state, handleTileClick]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
