
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GameState } from '../types';

const STORAGE_KEY = 'sky_metropolis_save_v2.1'; // Incremented version
const SCHEMA_VERSION = 2.1;

export const storageRepository = {
  save(state: Partial<GameState>): void {
    try {
      // Don't save transient state
      const { lastSound, gameStarted, isGeneratingGoal, ...toSave } = state as any;
      const payload = {
        version: SCHEMA_VERSION,
        timestamp: Date.now(),
        data: toSave
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage full. Save ignored.');
      } else {
        console.error('Failed to persist game state:', error);
      }
    }
  },

  load(): Partial<GameState> | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      
      const payload = JSON.parse(raw);
      
      // Edge Case: Version mismatch handling
      if (!payload || payload.version !== SCHEMA_VERSION) {
        console.warn('Save version mismatch. Starting fresh to ensure stability.');
        return null;
      }

      // Basic integrity check for the grid
      if (!payload.data?.grid || !Array.isArray(payload.data.grid)) {
        return null;
      }

      return payload.data;
    } catch (error) {
      console.error('Failed to load persisted game state:', error);
      return null;
    }
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
