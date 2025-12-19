/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GameState } from '../types';

const STORAGE_KEY = 'sky_metropolis_save_v2';

export const storageRepository = {
  save(state: Partial<GameState>): void {
    try {
      // Don't save transient state
      const { lastSound, gameStarted, ...toSave } = state as any;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to persist game state:', error);
    }
  },

  load(): Partial<GameState> | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load persisted game state:', error);
      return null;
    }
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
