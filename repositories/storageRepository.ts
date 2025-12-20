
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GameState, Grid, TileData } from '../types';
import { GRID_SIZE } from '../constants';

const STORAGE_KEY = 'sky_metropolis_save_v2.5';
const SCHEMA_VERSION = 2.5;

export const storageRepository = {
  save(state: Partial<GameState>): void {
    try {
      const { lastSound, gameStarted, isGeneratingGoal, ...toSave } = state as any;
      const payload = {
        version: SCHEMA_VERSION,
        gridSize: GRID_SIZE,
        timestamp: Date.now(),
        data: toSave
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to persist game state:', error);
    }
  },

  load(): Partial<GameState> | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      
      const payload = JSON.parse(raw);
      if (!payload || !payload.data) return null;

      // Migration Logic: If the saved grid size is different from the current GRID_SIZE
      if (payload.gridSize !== GRID_SIZE && payload.data.grid) {
        console.log(`Migrating grid from ${payload.gridSize} to ${GRID_SIZE}`);
        payload.data.grid = this.migrateGrid(payload.data.grid, payload.gridSize, GRID_SIZE);
      }

      return payload.data;
    } catch (error) {
      console.error('Failed to load persisted game state:', error);
      return null;
    }
  },

  migrateGrid(oldGrid: Grid, oldSize: number, newSize: number): Grid {
    // Create a fresh empty grid of the new size
    const newGrid: TileData[][] = Array.from({ length: newSize }, (_, y) => 
      Array.from({ length: newSize }, (_, x) => ({
        x, y, 
        buildingType: 'None' as any,
        variant: Math.floor(Math.random() * 100),
        rotation: 0
      }))
    );

    const offset = Math.floor((newSize - oldSize) / 2);

    // Copy old data into the center of the new grid
    for (let y = 0; y < oldSize; y++) {
      for (let x = 0; x < oldSize; x++) {
        const targetX = x + offset;
        const targetY = y + offset;
        if (newGrid[targetY] && newGrid[targetY][targetX]) {
          newGrid[targetY][targetX] = {
            ...oldGrid[y][x],
            x: targetX,
            y: targetY
          };
        }
      }
    }

    return newGrid as unknown as Grid;
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
