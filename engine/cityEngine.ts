
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BuildingType, CityStats, Grid, TileData, ActionResult } from '../types';
import { BUILDINGS, GRID_SIZE, GAME_BALANCE, DEMOLISH_COST } from '../constants';

export const cityEngine = {
  calculateNextDay(currentStats: CityStats, grid: Grid): CityStats {
    const metrics = this.aggregateMetrics(grid);
    const happiness = this.calculateHappiness(currentStats.population, metrics.counts);
    const population = this.calculatePopulation(currentStats.population, metrics.grossPopGrowth, metrics.counts, happiness);

    // Edge Case: Financial protection - Clamping money to 0 unless sandbox
    const nextMoney = currentStats.money + metrics.dailyIncome;

    return {
      money: Number.isFinite(nextMoney) ? nextMoney : currentStats.money,
      population: Math.max(0, Math.floor(population)),
      day: currentStats.day + 1,
      happiness: Math.min(100, Math.max(0, happiness))
    };
  },

  aggregateMetrics(grid: Grid) {
    const counts: Record<BuildingType, number> = {
      [BuildingType.None]: 0,
      [BuildingType.Residential]: 0,
      [BuildingType.Commercial]: 0,
      [BuildingType.Industrial]: 0,
      [BuildingType.Park]: 0,
      [BuildingType.Road]: 0,
    };

    let dailyIncome = 0;
    let grossPopGrowth = 0;

    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const type = row[x].buildingType;
        if (counts[type] !== undefined) {
            counts[type]++;
        }
        
        const config = BUILDINGS[type];
        if (config) {
          dailyIncome += config.incomeGen;
          grossPopGrowth += config.popGen;
        }
      }
    }

    return { counts, dailyIncome, grossPopGrowth };
  },

  calculatePopulation(currentPop: number, grossGrowth: number, counts: Record<BuildingType, number>, happiness: number): number {
    const resCount = counts[BuildingType.Residential] || 0;
    const cap = resCount * GAME_BALANCE.POPULATION_PER_RESIDENTIAL;
    
    // Happiness multiplier between 0.5 and 1.5
    const happinessMultiplier = 0.5 + (Math.max(0, Math.min(100, happiness)) / 100);
    const parkBonus = (counts[BuildingType.Park] || 0) * 0.5;
    
    const growth = Math.floor((grossGrowth + parkBonus) * happinessMultiplier);

    let nextPop = currentPop + growth;
    
    // Decay if no housing exists or overcrowding
    if (resCount === 0 && currentPop > 0) {
      nextPop = Math.max(0, currentPop - GAME_BALANCE.POPULATION_DECAY);
    } else if (nextPop > cap) {
      // Overcrowding penalty - pop slowly settles to cap
      nextPop = currentPop > cap ? currentPop - 1 : cap;
    }
    
    return Math.max(0, nextPop);
  },

  calculateHappiness(population: number, counts: Record<BuildingType, number>): number {
    const roadsNeeded = population / GAME_BALANCE.TRAFFIC_PENALTY_THRESHOLD;
    const roadCount = counts[BuildingType.Road] || 0;
    
    const trafficPenalty = roadCount < roadsNeeded 
      ? Math.min(40, Math.floor((roadsNeeded - roadCount) * 2))
      : 0;
      
    const parkBonus = (counts[BuildingType.Park] || 0) * GAME_BALANCE.HAPPINESS_PER_PARK;
    
    const total = GAME_BALANCE.HAPPINESS_BASE + parkBonus - trafficPenalty;
    return Math.min(100, Math.max(0, total));
  },

  executeAction(grid: Grid, stats: CityStats, x: number, y: number, tool: BuildingType, sandbox: boolean): ActionResult {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) {
        return { success: false, cost: 0, error: 'Target coordinates out of bounds.' };
    }

    const tile = grid[y][x];
    const isBulldoze = tool === BuildingType.None;
    
    // Cost logic with safety
    const buildingConfig = BUILDINGS[tool];
    if (!buildingConfig) return { success: false, cost: 0, error: 'Invalid building type.' };
    
    const cost = isBulldoze ? DEMOLISH_COST : buildingConfig.cost;

    if (isBulldoze && tile.buildingType === BuildingType.None) {
        return { success: false, cost: 0, error: 'Plot is already empty.' };
    }
    if (!isBulldoze && tile.buildingType !== BuildingType.None) {
        return { success: false, cost: 0, error: 'Plot is already occupied. Bulldoze first.' };
    }
    if (!sandbox && stats.money < cost) {
        return { success: false, cost, error: `Insufficient funds. Need $${cost}.` };
    }

    const newGrid = grid.map((row, ry) => 
      ry !== y ? row : row.map((t, rx) => 
        rx !== x ? t : {
          ...t,
          buildingType: tool,
          variant: isBulldoze ? t.variant : Math.floor(Math.random() * 100),
          rotation: Math.floor(Math.random() * 4)
        }
      )
    );

    return { success: true, cost, newGrid, isBulldoze };
  },

  createInitialGrid(): Grid {
    const grid: TileData[][] = Array.from({ length: GRID_SIZE }, (_, y) => 
      Array.from({ length: GRID_SIZE }, (_, x) => ({
        x, y, 
        buildingType: BuildingType.None,
        variant: Math.floor(Math.random() * 100),
        rotation: 0
      }))
    );

    const mid = Math.floor(GRID_SIZE / 2);
    const mainRoads = [
        { x: mid, y: mid, id: 'intersection-1' },
        { x: mid - 1, y: mid, id: 'main-road-texture' },
        { x: mid + 1, y: mid, id: 'road-segment-a' },
        { x: mid, y: mid - 1 },
        { x: mid, y: mid + 1 }
    ];

    mainRoads.forEach(r => {
        if (grid[r.y] && grid[r.y][r.x]) {
            grid[r.y][r.x] = { 
                ...grid[r.y][r.x], 
                buildingType: BuildingType.Road, 
                customId: (r as any).id 
            };
        }
    });
    
    return grid as unknown as Grid;
  }
};
