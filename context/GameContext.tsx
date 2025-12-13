/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { Grid, CityStats, BuildingType, AIGoal, NewsItem } from '../types';
import { createInitialGrid, calculateNextDay } from '../engine/simulation';
import { INITIAL_MONEY, TICK_RATE_MS, BUILDINGS, DEMOLISH_COST } from '../constants';
import { generateCityGoal, generateNewsEvent } from '../services/geminiService';

// --- State ---

interface GameState {
  grid: Grid;
  stats: CityStats;
  selectedTool: BuildingType;
  gameStarted: boolean;
  aiEnabled: boolean;
  currentGoal: AIGoal | null;
  isGeneratingGoal: boolean;
  newsFeed: NewsItem[];
  lastSound: { key: string; id: number } | null;
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
  lastSound: null,
};

// --- Actions ---

type Action =
  | { type: 'START_GAME'; aiEnabled: boolean }
  | { type: 'TICK' }
  | { type: 'SELECT_TOOL'; tool: BuildingType }
  | { type: 'UPDATE_GRID'; grid: Grid; cost: number }
  | { type: 'SET_GOAL'; goal: AIGoal | null }
  | { type: 'SET_GENERATING_GOAL'; isGenerating: boolean }
  | { type: 'ADD_NEWS'; news: NewsItem }
  | { type: 'CLAIM_REWARD' }
  | { type: 'TRIGGER_SOUND'; key: string };

// --- Reducer ---

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, gameStarted: true, aiEnabled: action.aiEnabled };
    
    case 'TICK': {
      // 1. Advance Simulation
      const newStats = calculateNextDay(state.stats, state.grid);
      
      // 2. Check Goal Logic
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

    case 'UPDATE_GRID':
      return {
        ...state,
        grid: action.grid,
        stats: { ...state.stats, money: state.stats.money - action.cost }
      };

    case 'SET_GOAL':
      return { ...state, currentGoal: action.goal };
    
    case 'SET_GENERATING_GOAL':
      return { ...state, isGeneratingGoal: action.isGenerating };

    case 'ADD_NEWS':
      return { ...state, newsFeed: [...state.newsFeed.slice(-11), action.news] };

    case 'CLAIM_REWARD':
      if (!state.currentGoal?.completed) return state;
      return {
        ...state,
        stats: { ...state.stats, money: state.stats.money + state.currentGoal.reward },
        currentGoal: null
      };
      
    case 'TRIGGER_SOUND':
      return { ...state, lastSound: { key: action.key, id: Date.now() } };

    default:
      return state;
  }
};

// --- Context ---

interface GameContextProps {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  actions: {
    handleTileClick: (x: number, y: number) => void;
    claimReward: () => void;
  };
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef = useRef(state);
  
  useEffect(() => { stateRef.current = state; }, [state]);

  // --- Interaction Logic ---
  
  const handleTileClick = (x: number, y: number) => {
    if (!state.gameStarted) return;
    
    const tile = state.grid[y][x];
    const tool = state.selectedTool;
    const currentMoney = state.stats.money;
    let cost = 0;
    let isValidAction = false;
    let isBulldoze = false;

    // 1. Validate Action
    if (tool === BuildingType.None) {
      // Demolish
      if (tile.buildingType !== BuildingType.None) {
        cost = DEMOLISH_COST;
        isValidAction = true;
        isBulldoze = true;
      }
    } else {
      // Build
      if (tile.buildingType === BuildingType.None) {
        cost = BUILDINGS[tool].cost;
        isValidAction = true;
      }
    }

    // 2. Check Funds & Execute
    if (isValidAction) {
      if (currentMoney >= cost) {
        dispatch({ type: 'TRIGGER_SOUND', key: isBulldoze ? 'bulldoze' : 'place' });
        
        const newGrid = state.grid.map(row => [...row]);
        newGrid[y][x] = { 
          ...tile, 
          buildingType: tool,
          // Reset variant if building, keep if bulldozing (or reset to 0)
          variant: isBulldoze ? tile.variant : Math.floor(Math.random() * 100) 
        };

        dispatch({ type: 'UPDATE_GRID', grid: newGrid, cost });
      } else {
        dispatch({ type: 'TRIGGER_SOUND', key: 'error' });
        dispatch({ 
          type: 'ADD_NEWS', 
          news: { 
            id: Date.now().toString(), 
            text: "Insufficient funds for this operation.", 
            type: 'negative', 
            timestamp: Date.now() 
          }
        });
      }
    }
  };

  const claimReward = () => {
    if (stateRef.current.currentGoal?.completed) {
      dispatch({ type: 'TRIGGER_SOUND', key: 'reward' });
      dispatch({ type: 'CLAIM_REWARD' });
    }
  };

  // --- Game Loops ---

  // Simulation
  useEffect(() => {
    if (!state.gameStarted) return;
    const interval = setInterval(() => dispatch({ type: 'TICK' }), TICK_RATE_MS);
    return () => clearInterval(interval);
  }, [state.gameStarted]);

  // AI Goals
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

  // AI News
  useEffect(() => {
    const newsLoop = setInterval(async () => {
       const s = stateRef.current;
       if (!s.gameStarted || !s.aiEnabled || Math.random() > 0.3) return;
       const news = await generateNewsEvent(s.stats);
       if (news) dispatch({ type: 'ADD_NEWS', news });
    }, TICK_RATE_MS * 4);
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
