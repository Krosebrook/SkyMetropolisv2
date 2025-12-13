/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { Grid, CityStats, BuildingType, AIGoal, NewsItem } from '../types';
import { createInitialGrid, calculateNextDay } from '../engine/simulation';
import { INITIAL_MONEY, TICK_RATE_MS, BUILDINGS, DEMOLISH_COST } from '../constants';
import { generateCityGoal, generateNewsEvent } from '../services/geminiService';
import { useAudio } from '../hooks/useAudio';

// --- State Definition ---

interface GameState {
  grid: Grid;
  stats: CityStats;
  selectedTool: BuildingType;
  gameStarted: boolean;
  aiEnabled: boolean;
  currentGoal: AIGoal | null;
  isGeneratingGoal: boolean;
  newsFeed: NewsItem[];
}

const initialState: GameState = {
  grid: createInitialGrid(),
  stats: { money: INITIAL_MONEY, population: 0, day: 1, happiness: 100 },
  selectedTool: BuildingType.Road,
  gameStarted: false,
  aiEnabled: true,
  currentGoal: null,
  isGeneratingGoal: false,
  newsFeed: [],
};

// --- Actions ---

type Action =
  | { type: 'START_GAME'; aiEnabled: boolean }
  | { type: 'TICK' }
  | { type: 'SELECT_TOOL'; tool: BuildingType }
  | { type: 'INTERACT_TILE'; x: number; y: number }
  | { type: 'SET_GOAL'; goal: AIGoal | null }
  | { type: 'SET_GENERATING_GOAL'; isGenerating: boolean }
  | { type: 'ADD_NEWS'; news: NewsItem }
  | { type: 'CLAIM_REWARD' };

// --- Reducer ---

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, gameStarted: true, aiEnabled: action.aiEnabled };
    
    case 'TICK': {
      // 1. Advance Simulation
      const newStats = calculateNextDay(state.stats, state.grid);
      
      // 2. Check Goal Completion
      let updatedGoal = state.currentGoal;
      if (state.aiEnabled && state.currentGoal && !state.currentGoal.completed) {
        const g = state.currentGoal;
        const counts: Record<string, number> = {};
        state.grid.flat().forEach(t => counts[t.buildingType] = (counts[t.buildingType] || 0) + 1);
        
        let isMet = false;
        if (g.targetType === 'money' && newStats.money >= g.targetValue) isMet = true;
        else if (g.targetType === 'population' && newStats.population >= g.targetValue) isMet = true;
        else if (g.targetType === 'building_count' && g.buildingType && (counts[g.buildingType] || 0) >= g.targetValue) isMet = true;

        if (isMet) updatedGoal = { ...g, completed: true };
      }

      return { ...state, stats: newStats, currentGoal: updatedGoal };
    }

    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.tool };

    case 'INTERACT_TILE': {
      const { x, y } = action;
      const tile = state.grid[y][x];
      const tool = state.selectedTool;
      
      if (tool === BuildingType.None) {
        // Demolish Logic
        if (tile.buildingType === BuildingType.None) return state; 
        if (state.stats.money < DEMOLISH_COST) return state;

        const newGrid = state.grid.map(row => [...row]);
        newGrid[y][x] = { ...tile, buildingType: BuildingType.None };
        return {
          ...state,
          grid: newGrid,
          stats: { ...state.stats, money: state.stats.money - DEMOLISH_COST }
        };
      } else {
        // Build Logic
        if (tile.buildingType !== BuildingType.None) return state; 
        const cost = BUILDINGS[tool].cost;
        if (state.stats.money < cost) return state;

        const newGrid = state.grid.map(row => [...row]);
        newGrid[y][x] = { ...tile, buildingType: tool };
        return {
          ...state,
          grid: newGrid,
          stats: { ...state.stats, money: state.stats.money - cost }
        };
      }
    }

    case 'SET_GOAL':
      return { ...state, currentGoal: action.goal };
    
    case 'SET_GENERATING_GOAL':
      return { ...state, isGeneratingGoal: action.isGenerating };

    case 'ADD_NEWS':
      return { ...state, newsFeed: [...state.newsFeed.slice(-12), action.news] };

    case 'CLAIM_REWARD':
      if (!state.currentGoal?.completed) return state;
      return {
        ...state,
        stats: { ...state.stats, money: state.stats.money + state.currentGoal.reward },
        currentGoal: null
      };

    default:
      return state;
  }
};

// --- Context Provider ---

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<Action>;
  actions: {
    handleTileClick: (x: number, y: number) => void;
    claimReward: () => void;
  };
} | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { play, stop } = useAudio();
  const stateRef = useRef(state);
  
  // Keep ref synced for async operations
  useEffect(() => { stateRef.current = state; }, [state]);

  // --- Handlers ---
  
  const handleTileClick = (x: number, y: number) => {
    if (!state.gameStarted) return;
    
    const tile = state.grid[y][x];
    const tool = state.selectedTool;
    const money = state.stats.money;

    // Audio Feedback Logic
    if (tool === BuildingType.None) {
      if (tile.buildingType !== BuildingType.None) {
        if (money >= DEMOLISH_COST) play('bulldoze');
        else {
           play('error');
           dispatch({ type: 'ADD_NEWS', news: { id: Date.now().toString(), text: "Funds insufficient for demolition.", type: 'negative', timestamp: Date.now() }});
           return;
        }
      }
    } else {
      if (tile.buildingType === BuildingType.None) {
        const cost = BUILDINGS[tool].cost;
        if (money >= cost) play('place');
        else {
            play('error');
            dispatch({ type: 'ADD_NEWS', news: { id: Date.now().toString(), text: "Funds insufficient for construction.", type: 'negative', timestamp: Date.now() }});
            return;
        }
      }
    }
    dispatch({ type: 'INTERACT_TILE', x, y });
  };

  const claimReward = () => {
    if (stateRef.current.currentGoal?.completed) {
      play('reward');
      dispatch({ type: 'CLAIM_REWARD' });
    }
  };

  // --- Systems Loops ---

  // 1. Simulation Loop
  useEffect(() => {
    if (!state.gameStarted) return;
    play('bgm');
    const interval = setInterval(() => dispatch({ type: 'TICK' }), TICK_RATE_MS);
    return () => { clearInterval(interval); stop('bgm'); };
  }, [state.gameStarted]);

  // 2. AI Goal Loop
  useEffect(() => {
    const goalLoop = setInterval(async () => {
      const s = stateRef.current;
      if (!s.gameStarted || !s.aiEnabled || s.currentGoal || s.isGeneratingGoal) return;
      
      dispatch({ type: 'SET_GENERATING_GOAL', isGenerating: true });
      const goal = await generateCityGoal(s.stats, s.grid);
      if (goal) dispatch({ type: 'SET_GOAL', goal });
      dispatch({ type: 'SET_GENERATING_GOAL', isGenerating: false });
    }, 5000);
    return () => clearInterval(goalLoop);
  }, []);

  // 3. AI News Loop
  useEffect(() => {
    const newsLoop = setInterval(async () => {
       const s = stateRef.current;
       if (!s.gameStarted || !s.aiEnabled || Math.random() > 0.25) return;
       const news = await generateNewsEvent(s.stats);
       if (news) dispatch({ type: 'ADD_NEWS', news });
    }, TICK_RATE_MS * 3);
    return () => clearInterval(newsLoop);
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, actions: { handleTileClick, claimReward } }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
