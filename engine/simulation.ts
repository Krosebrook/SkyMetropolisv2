/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingType, CityStats, Grid, TileData } from '../types';
import { BUILDINGS, GRID_SIZE, GAME_BALANCE, DEMOLISH_COST } from '../constants';

type BuildingCounts = Record<BuildingType, number>;

// --- Analysis Helpers ---

/**
 * Aggregates building counts and basic production metrics from the grid.
 */
export const aggregateGridMetrics = (grid: Grid) => {
  const counts: BuildingCounts = {
    [BuildingType.None]: 0,
    [BuildingType.Residential]: 0,
    [BuildingType.Commercial]: 0,
    [BuildingType.Industrial]: 0,
    [BuildingType.Park]: 0,
    [BuildingType.Road]: 0,
  };

  let dailyIncome = 0;
  let grossPopGrowth = 0;

  for (const row of grid) {
    for (const tile of row) {
      if (tile.buildingType === BuildingType.None) continue;
      
      const config = BUILDINGS[tile.buildingType];
      if (config) {
        dailyIncome += config.incomeGen;
        grossPopGrowth += config.popGen;
      }
      
      counts[tile.buildingType]++;
    }
  }

  return { counts, dailyIncome, grossPopGrowth };
};

// --- Core Simulation Logic ---

/**
 * Calculates new population based on capacity, growth factors, and decay.
 */
const calculatePopulation = (currentPop: number, grossGrowth: number, counts: BuildingCounts): number => {
  const populationCap = counts[BuildingType.Residential] * GAME_BALANCE.POPULATION_PER_RESIDENTIAL;
  
  // Bonus: Parks boost growth
  const parkBonus = counts[BuildingType.Park] > 0 ? Math.floor(counts[BuildingType.Park] * 0.5) : 0;
  const totalGrowth = grossGrowth + parkBonus;

  let newPop = currentPop + totalGrowth;
  
  // Apply Cap
  if (newPop > populationCap) newPop = populationCap;
  
  // Apply Decay (Homelessness)
  if (counts[BuildingType.Residential] === 0 && currentPop > 0) {
    newPop = Math.max(0, currentPop - GAME_BALANCE.POPULATION_DECAY);
  }

  return newPop;
};

/**
 * Calculates city happiness based on amenities and congestion.
 */
const calculateHappiness = (population: number, counts: BuildingCounts): number => {
  const roadsNeeded = population / GAME_BALANCE.TRAFFIC_PENALTY_THRESHOLD;
  const trafficPenalty = roadsNeeded > counts[BuildingType.Road] 
    ? GAME_BALANCE.HAPPINESS_TRAFFIC_PENALTY 
    : 0;
    
  const parkBonus = counts[BuildingType.Park] * GAME_BALANCE.HAPPINESS_PER_PARK;
  
  return Math.min(100, Math.max(0, GAME_BALANCE.HAPPINESS_BASE + parkBonus - trafficPenalty));
};

/**
 * Main Simulation Tick
 * Pure function: (Stats, Grid) -> Stats
 */
export const calculateNextDay = (currentStats: CityStats, grid: Grid): CityStats => {
  const { counts, dailyIncome, grossPopGrowth } = aggregateGridMetrics(grid);

  const newPopulation = calculatePopulation(currentStats.population, grossPopGrowth, counts);
  const newHappiness = calculateHappiness(currentStats.population, counts);

  return {
    money: currentStats.money + dailyIncome,
    population: newPopulation,
    day: currentStats.day + 1,
    happiness: newHappiness
  };
};

// --- Action Logic (Validation & Mutation) ---

export interface ActionResult {
  success: boolean;
  cost: number;
  newGrid?: Grid;
  error?: string;
  isBulldoze?: boolean;
}

/**
 * Validates and executes a player action on the grid.
 * Returns a result object indicating success/failure and the new state.
 */
export const executeGridAction = (
  grid: Grid, 
  stats: CityStats, 
  x: number, 
  y: number, 
  tool: BuildingType
): ActionResult => {
  const tile = grid[y][x];
  const isBulldoze = tool === BuildingType.None;
  
  // 1. Determine Cost and Validity
  let cost = 0;
  
  if (isBulldoze) {
    if (tile.buildingType === BuildingType.None) {
      return { success: false, cost: 0, error: "Nothing to demolish" };
    }
    cost = DEMOLISH_COST;
  } else {
    // Prevent building on top of existing buildings (unless bulldozing first)
    if (tile.buildingType !== BuildingType.None) {
      return { success: false, cost: 0, error: "Tile is occupied" };
    }
    cost = BUILDINGS[tool].cost;
  }

  // 2. Check Funds
  if (stats.money < cost) {
    return { success: false, cost, error: "Insufficient funds" };
  }

  // 3. Mutate Grid (Immutable update)
  const newGrid = grid.map(row => [...row]);
  newGrid[y][x] = {
    ...tile,
    buildingType: tool,
    // Preserve variant if bulldozing (ground texture), randomize if building
    variant: isBulldoze ? tile.variant : Math.floor(Math.random() * 100),
    rotation: Math.floor(Math.random() * 4) // Randomize rotation for visual variety
  };

  return { success: true, cost, newGrid, isBulldoze };
};

/**
 * Generates the initial procedural terrain grid.
 */
export const createInitialGrid = (): Grid => {
  return Array.from({ length: GRID_SIZE }, (_, y) => 
    Array.from({ length: GRID_SIZE }, (_, x) => {
      // Deterministic noise for reproducibility (pseudo-random)
      const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      return { 
        x, 
        y, 
        buildingType: BuildingType.None,
        variant: Math.floor(noise * 100),
        rotation: Math.floor(noise * 4) 
      };
    })
  );
};
