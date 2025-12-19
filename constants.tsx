/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingConfig, BuildingType } from './types';

// World Configuration
export const GRID_SIZE = 16;
export const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;

// Simulation Configuration
export const TICK_RATE_MS = 2000; 
export const INITIAL_MONEY = 1500;
export const DEMOLISH_COST = 5;

// Balance Constants
export const GAME_BALANCE = {
  POPULATION_PER_RESIDENTIAL: 50, 
  POPULATION_DECAY: 10,           
  TRAFFIC_PENALTY_THRESHOLD: 20,  
  HAPPINESS_BASE: 50,
  HAPPINESS_PER_PARK: 3,          // Buffed parks
  HAPPINESS_TRAFFIC_PENALTY: 15,  // Increased penalty
};

// Building Registry
export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.None]: {
    type: BuildingType.None,
    cost: DEMOLISH_COST, // Sync with constant
    name: 'Bulldoze',
    description: 'Clear land ($5)',
    color: '#ef4444',
    popGen: 0,
    incomeGen: 0,
  },
  [BuildingType.Road]: {
    type: BuildingType.Road,
    cost: 10,
    name: 'Road',
    description: 'Infrastructure',
    color: '#374151',
    popGen: 0,
    incomeGen: -1,
  },
  [BuildingType.Residential]: {
    type: BuildingType.Residential,
    cost: 100,
    name: 'House',
    description: '+5 Pop/day',
    color: '#f87171',
    popGen: 5,
    incomeGen: 2,
  },
  [BuildingType.Commercial]: {
    type: BuildingType.Commercial,
    cost: 200,
    name: 'Shop',
    description: '+$15/day',
    color: '#60a5fa',
    popGen: 0,
    incomeGen: 15,
  },
  [BuildingType.Industrial]: {
    type: BuildingType.Industrial,
    cost: 400,
    name: 'Factory',
    description: '+$40/day',
    color: '#facc15',
    popGen: 0,
    incomeGen: 40,
  },
  [BuildingType.Park]: {
    type: BuildingType.Park,
    cost: 50,
    name: 'Park',
    description: '+Happiness',
    color: '#4ade80',
    popGen: 1,
    incomeGen: -2,
  },
};