/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BuildingType, CityStats, Grid, TileData, ActionResult } from '../types';
import { BUILDINGS, GRID_SIZE, GAME_BALANCE, DEMOLISH_COST } from '../constants';

export const cityService = {
  calculateNextDay(currentStats: CityStats, grid: Grid): CityStats {
    const metrics = this.aggregateMetrics(grid);
    const happiness = this.calculateHappiness(currentStats.population, metrics.counts);
    const population = this.calculatePopulation(currentStats.population, metrics.grossPopGrowth, metrics.counts, happiness);

    return {
      money: currentStats.money + metrics.dailyIncome,
      population,
      day: currentStats.day + 1,
      happiness
    };
  },

  aggregateMetrics(grid: Grid) {
    const counts = {
      [BuildingType.None]: 0,
      [BuildingType.Residential]: 0,
      [BuildingType.Commercial]: 0,
      [BuildingType.Industrial]: 0,
      [BuildingType.Park]: 0,
      [BuildingType.Road]: 0,
    };

    let dailyIncome = 0;
    let grossPopGrowth = 0;

    grid.flat().forEach(tile => {
      const type = tile.buildingType;
      counts[type]++;
      
      const config = BUILDINGS[type];
      if (config) {
        dailyIncome += config.incomeGen;
        grossPopGrowth += config.popGen;
      }
    });

    return { counts, dailyIncome, grossPopGrowth };
  },

  calculatePopulation(currentPop: number, grossGrowth: number, counts: Record<BuildingType, number>, happiness: number): number {
    const cap = counts[BuildingType.Residential] * GAME_BALANCE.POPULATION_PER_RESIDENTIAL;
    const multiplier = 0.5 + (happiness / 100);
    const parkBonus = counts[BuildingType.Park] * 0.5;
    const growth = Math.floor((grossGrowth + parkBonus) * multiplier);

    let nextPop = currentPop + growth;
    if (nextPop > cap) nextPop = cap;
    if (counts[BuildingType.Residential] === 0 && currentPop > 0) {
      nextPop = Math.max(0, currentPop - GAME_BALANCE.POPULATION_DECAY);
    }
    return Math.max(0, nextPop);
  },

  calculateHappiness(population: number, counts: Record<BuildingType, number>): number {
    const roadsNeeded = population / GAME_BALANCE.TRAFFIC_PENALTY_THRESHOLD;
    const trafficPenalty = counts[BuildingType.Road] < roadsNeeded 
      ? Math.min(30, Math.floor((roadsNeeded - counts[BuildingType.Road]) * 2))
      : 0;
    const parkBonus = counts[BuildingType.Park] * GAME_BALANCE.HAPPINESS_PER_PARK;
    return Math.min(100, Math.max(0, GAME_BALANCE.HAPPINESS_BASE + parkBonus - trafficPenalty));
  },

  executeAction(grid: Grid, stats: CityStats, x: number, y: number, tool: BuildingType, sandbox: boolean): any {
    const tile = grid[y][x];
    const isBulldoze = tool === BuildingType.None;
    const cost = isBulldoze ? DEMOLISH_COST : BUILDINGS[tool].cost;

    if (isBulldoze && tile.buildingType === BuildingType.None) return { success: false, error: 'Plot is already empty' };
    if (!isBulldoze && tile.buildingType !== BuildingType.None) return { success: false, error: 'Plot is occupied' };
    if (!sandbox && stats.money < cost) return { success: false, error: 'Insufficient funds' };

    const newGrid = grid.map(row => row.map(t => {
      if (t.x === x && t.y === y) {
        return {
          ...t,
          buildingType: tool,
          variant: isBulldoze ? t.variant : Math.floor(Math.random() * 100),
          rotation: Math.floor(Math.random() * 4)
        };
      }
      return t;
    }));

    return { success: true, cost, newGrid, isBulldoze };
  },

  createInitialGrid(): Grid {
    const grid = Array.from({ length: GRID_SIZE }, (_, y) => 
      Array.from({ length: GRID_SIZE }, (_, x) => ({
        x, y, 
        buildingType: BuildingType.None,
        variant: Math.floor(Math.random() * 100),
        rotation: 0
      }))
    );

    const mid = Math.floor(GRID_SIZE / 2);
    // Initial road strip
    [mid-1, mid, mid+1].forEach(x => {
        (grid[mid] as any)[x] = { ...grid[mid][x], buildingType: BuildingType.Road, customId: x === mid ? 'intersection-1' : undefined };
    });
    
    return grid as unknown as Grid;
  }
};
