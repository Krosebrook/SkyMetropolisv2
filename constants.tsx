
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingConfig, BuildingType } from './types';

export const GRID_SIZE = 48;
export const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;

export const TICK_RATE_MS = 2500; 
export const INITIAL_MONEY = 5000; 
export const DEMOLISH_COST = 50; 

export const GAME_BALANCE = {
  POPULATION_PER_RESIDENTIAL: 50, 
  POPULATION_DECAY: 5,           
  TRAFFIC_PENALTY_THRESHOLD: 150,
  HAPPINESS_BASE: 70,
  HAPPINESS_PER_PARK: 8,          
  HAPPINESS_PER_WATER: 4,         
  HAPPINESS_TRAFFIC_PENALTY: 5,  
};

export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.None]: {
    type: BuildingType.None,
    cost: DEMOLISH_COST,
    name: 'Deconstruct',
    description: 'Remove structure and recycle materials.',
    color: '#ef4444',
    popGen: 0,
    incomeGen: 0,
  },
  [BuildingType.Road]: {
    type: BuildingType.Road,
    cost: 20,
    name: 'Smart Grid',
    description: 'Transit and data connectivity backbone.',
    color: '#334155',
    popGen: 0,
    incomeGen: 0,
  },
  [BuildingType.Residential]: {
    type: BuildingType.Residential,
    cost: 200,
    name: 'Eco-Housing',
    description: 'Sustainable high-density living units.',
    color: '#2dd4bf',
    popGen: 10,
    incomeGen: 15,
  },
  [BuildingType.Commercial]: {
    type: BuildingType.Commercial,
    cost: 450,
    name: 'Tech District',
    description: 'Innovation hubs and commercial centers.',
    color: '#a855f7',
    popGen: 0,
    incomeGen: 60,
  },
  [BuildingType.Industrial]: {
    type: BuildingType.Industrial,
    cost: 800,
    name: 'Bio-Factory',
    description: 'Automated sustainable manufacturing.',
    color: '#f59e0b',
    popGen: 0,
    incomeGen: 150,
  },
  [BuildingType.Park]: {
    type: BuildingType.Park,
    cost: 150,
    name: 'Carbon Sink',
    description: 'Public green space and air filtration.',
    color: '#bef264',
    popGen: 2,
    incomeGen: -5,
  },
  [BuildingType.Water]: {
    type: BuildingType.Water,
    cost: 100,
    name: 'Hydro-Reservoir',
    description: 'Water management and cooling systems.',
    color: '#3b82f6',
    popGen: 0,
    incomeGen: 0,
  },
};
