/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingType, CityStats, Grid } from '../types';
import { BUILDINGS, GRID_SIZE } from '../constants';

/**
 * Calculates the next city state based on current grid configuration.
 * Pure function: (Stats, Grid) -> Stats
 */
export const calculateNextDay = (currentStats: CityStats, grid: Grid): CityStats => {
  let dailyIncome = 0;
  let grossPopGrowth = 0;
  
  const counts = {
    [BuildingType.Residential]: 0,
    [BuildingType.Commercial]: 0,
    [BuildingType.Industrial]: 0,
    [BuildingType.Park]: 0,
    [BuildingType.Road]: 0,
  };

  // 1. Aggregate Tile Data
  for(const row of grid) {
    for(const tile of row) {
        if (tile.buildingType === BuildingType.None) continue;
        
        const config = BUILDINGS[tile.buildingType];
        dailyIncome += config.incomeGen;
        grossPopGrowth += config.popGen;
        
        if (counts[tile.buildingType] !== undefined) {
            counts[tile.buildingType]++;
        }
    }
  }

  // 2. Apply Simulation Rules
  const populationCap = counts[BuildingType.Residential] * 50;
  
  // Bonus: Parks boost growth
  if (counts[BuildingType.Park] > 0) {
    grossPopGrowth += Math.floor(counts[BuildingType.Park] * 0.5); 
  }

  // 3. Update Population
  let newPop = currentStats.population + grossPopGrowth;
  
  // Cap Logic
  if (newPop > populationCap) newPop = populationCap;
  
  // Decay Logic: No homes = people leave
  if (counts[BuildingType.Residential] === 0 && currentStats.population > 0) {
    newPop = Math.max(0, currentStats.population - 10);
  }

  // 4. Calculate Happiness
  // Base 50
  // +2 per Park
  // -1 per 100 pop if Road < Pop/20 (Traffic congestion heuristic)
  const trafficPenalty = (currentStats.population / 20) > counts[BuildingType.Road] ? 10 : 0;
  const parkBonus = counts[BuildingType.Park] * 2;
  const happiness = Math.min(100, Math.max(0, 50 + parkBonus - trafficPenalty));

  return {
    money: currentStats.money + dailyIncome,
    population: newPop,
    day: currentStats.day + 1,
    happiness
  };
};

/**
 * Generates the initial procedural terrain grid.
 */
export const createInitialGrid = (): Grid => {
  return Array.from({ length: GRID_SIZE }, (_, y) => 
    Array.from({ length: GRID_SIZE }, (_, x) => {
      // Simplex-like noise for texture variation
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
