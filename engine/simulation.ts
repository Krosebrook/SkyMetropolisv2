
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingType, CityStats, Grid, TileData, ActionResult } from '../types';
import { BUILDINGS, GRID_SIZE, GAME_BALANCE, DEMOLISH_COST } from '../constants';

type BuildingCounts = Record<BuildingType, number>;

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
      const type = tile.buildingType;
      counts[type]++;
      
      const config = BUILDINGS[type];
      if (config) {
        dailyIncome += config.incomeGen;
        grossPopGrowth += config.popGen;
      }
    }
  }

  return { counts, dailyIncome, grossPopGrowth };
};

const calculatePopulation = (currentPop: number, grossGrowth: number, counts: BuildingCounts, happiness: number): number => {
  const populationCap = counts[BuildingType.Residential] * GAME_BALANCE.POPULATION_PER_RESIDENTIAL;
  
  // Growth is modified by happiness (0.5x at 0% happiness, 1.5x at 100% happiness)
  const happinessMultiplier = 0.5 + (happiness / 100);
  const parkBonus = counts[BuildingType.Park] * 0.5;
  const totalGrowth = Math.floor((grossGrowth + parkBonus) * happinessMultiplier);

  let newPop = currentPop + totalGrowth;
  
  if (newPop > populationCap) newPop = populationCap;
  
  if (counts[BuildingType.Residential] === 0 && currentPop > 0) {
    newPop = Math.max(0, currentPop - GAME_BALANCE.POPULATION_DECAY);
  }

  return Math.max(0, newPop);
};

const calculateHappiness = (population: number, counts: BuildingCounts): number => {
  const roadsNeeded = population / GAME_BALANCE.TRAFFIC_PENALTY_THRESHOLD;
  const trafficPenalty = counts[BuildingType.Road] < roadsNeeded 
    ? Math.min(30, Math.floor((roadsNeeded - counts[BuildingType.Road]) * 2))
    : 0;
    
  const parkBonus = counts[BuildingType.Park] * GAME_BALANCE.HAPPINESS_PER_PARK;
  
  return Math.min(100, Math.max(0, GAME_BALANCE.HAPPINESS_BASE + parkBonus - trafficPenalty));
};

export const calculateNextDay = (currentStats: CityStats, grid: Grid): CityStats => {
  const { counts, dailyIncome, grossPopGrowth } = aggregateGridMetrics(grid);
  const newHappiness = calculateHappiness(currentStats.population, counts);
  const newPopulation = calculatePopulation(currentStats.population, grossPopGrowth, counts, newHappiness);

  return {
    money: currentStats.money + dailyIncome,
    population: newPopulation,
    day: currentStats.day + 1,
    happiness: newHappiness
  };
};

export const executeGridAction = (
  grid: Grid, 
  stats: CityStats, 
  x: number, 
  y: number, 
  tool: BuildingType,
  sandboxMode: boolean = false
): ActionResult => {
  const tile = grid[y][x];
  const isBulldoze = tool === BuildingType.None;
  
  const cost = isBulldoze ? DEMOLISH_COST : BUILDINGS[tool].cost;
  
  if (isBulldoze) {
    if (tile.buildingType === BuildingType.None) return { success: false, cost: 0, error: "Empty plot" };
  } else {
    if (tile.buildingType !== BuildingType.None) return { success: false, cost: 0, error: "Already built" };
  }

  if (!sandboxMode && stats.money < cost) return { success: false, cost, error: "Need more funds" };

  // Strict immutable clone
  const newGrid = grid.map(row => row.map(t => ({ ...t })));
  newGrid[y][x] = {
    ...newGrid[y][x],
    buildingType: tool,
    variant: isBulldoze ? tile.variant : Math.floor(Math.random() * 100),
    rotation: Math.floor(Math.random() * 4)
  };

  return { success: true, cost, newGrid, isBulldoze };
};

export const createInitialGrid = (): Grid => {
  // Use a mutable grid internally for initialization to avoid readonly modification errors
  const grid: TileData[][] = Array.from({ length: GRID_SIZE }, (_, y) => 
    Array.from({ length: GRID_SIZE }, (_, x) => {
      const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const tile: TileData = { 
        x, 
        y, 
        buildingType: BuildingType.None,
        variant: Math.floor(noise * 100),
        rotation: 0
      };
      return tile;
    })
  );

  const centerX = Math.floor(GRID_SIZE / 2);
  const centerY = Math.floor(GRID_SIZE / 2);

  // Fix readonly index modification errors by modifying the mutable array before casting to Grid
  grid[centerY][centerX] = { ...grid[centerY][centerX], buildingType: BuildingType.Road, customId: 'intersection-1' };
  grid[centerY][centerX-1] = { ...grid[centerY][centerX-1], buildingType: BuildingType.Road, customId: 'main-road-texture' };
  grid[centerY][centerX+1] = { ...grid[centerY][centerX+1], buildingType: BuildingType.Road, customId: 'road-segment-a' };
  grid[centerY-1][centerX] = { ...grid[centerY-1][centerX], buildingType: BuildingType.Road };
  grid[centerY+1][centerX] = { ...grid[centerY+1][centerX], buildingType: BuildingType.Road };

  return grid as unknown as Grid;
};
