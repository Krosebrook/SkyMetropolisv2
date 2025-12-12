/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingType, CityStats, Grid } from '../types';
import { BUILDINGS, GRID_SIZE } from '../constants';

/**
 * Calculates the next state of the city based on the current grid and stats.
 * Pure function for determinism.
 */
export const calculateNextDay = (currentStats: CityStats, grid: Grid): CityStats => {
  let dailyIncome = 0;
  let dailyPopGrowth = 0;
  let residentialCount = 0;
  let parkCount = 0;

  // 1. Scan Grid
  grid.forEach(row => {
    row.forEach(tile => {
      if (tile.buildingType !== BuildingType.None) {
        const config = BUILDINGS[tile.buildingType];
        dailyIncome += config.incomeGen;
        dailyPopGrowth += config.popGen;

        if (tile.buildingType === BuildingType.Residential) residentialCount++;
        if (tile.buildingType === BuildingType.Park) parkCount++;
      }
    });
  });

  // 2. Logic Modifiers
  const maxPopulation = residentialCount * 50;
  
  // Park bonus to income (tourism/value) and population attraction
  if (parkCount > 0) {
    dailyPopGrowth += Math.floor(parkCount * 0.5); 
  }

  // 3. Apply Changes
  let newPop = currentStats.population + dailyPopGrowth;
  
  // Cap population
  if (newPop > maxPopulation) newPop = maxPopulation;
  
  // Decay if overpopulated or no homes
  if (residentialCount === 0 && currentStats.population > 0) {
    newPop = Math.max(0, currentStats.population - 10);
  }

  // Calculate Happiness (Simple heuristic)
  // Base 50, +1 per park, -1 per 100 pop if low infrastructure
  const happiness = Math.min(100, Math.max(0, 50 + (parkCount * 2) - (currentStats.population > 200 && parkCount < 2 ? 10 : 0)));

  return {
    money: currentStats.money + dailyIncome,
    population: newPop,
    day: currentStats.day + 1,
    happiness
  };
};

export const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  const center = GRID_SIZE / 2;
  
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: any[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      // Procedural noise for variants
      const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      row.push({ 
        x, 
        y, 
        buildingType: BuildingType.None,
        variant: Math.floor(noise * 100),
        rotation: Math.floor(noise * 4) 
      });
    }
    grid.push(row);
  }
  return grid;
};