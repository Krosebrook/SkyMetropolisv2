
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum BuildingType {
  None = 'None',
  Road = 'Road',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Park = 'Park',
  Water = 'Water',
}

export type NewsType = 'positive' | 'negative' | 'neutral';
export type GoalTargetType = 'population' | 'money' | 'building_count';

export interface BuildingConfig {
  readonly type: BuildingType;
  readonly cost: number;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly popGen: number;
  readonly incomeGen: number;
}

export interface TileData {
  readonly x: number;
  readonly y: number;
  readonly buildingType: BuildingType;
  readonly variant: number; 
  readonly rotation: number;
  readonly customId?: string;
}

export type Grid = readonly (readonly TileData[])[];

export interface CityStats {
  readonly money: number;
  readonly population: number;
  readonly day: number;
  readonly happiness: number; // 0-100
}

export interface AIGoal {
  readonly id: string;
  readonly description: string;
  readonly targetType: GoalTargetType;
  readonly targetValue: number;
  readonly buildingType?: BuildingType;
  readonly reward: number;
  readonly completed: boolean;
}

export interface NewsItem {
  readonly id: string;
  readonly text: string;
  readonly type: NewsType;
  readonly timestamp: number;
}

export interface SoundEvent {
  readonly key: string;
  readonly id: number;
}

export interface ActionResult {
  readonly success: boolean;
  readonly cost: number;
  readonly newGrid?: Grid;
  readonly error?: string;
  readonly isBulldoze?: boolean;
}

export interface GameState {
  readonly grid: Grid;
  readonly stats: CityStats;
  readonly selectedTool: BuildingType;
  readonly gameStarted: boolean;
  readonly aiEnabled: boolean;
  readonly sandboxMode: boolean;
  readonly currentGoal: AIGoal | null;
  readonly isGeneratingGoal: boolean;
  readonly newsFeed: readonly NewsItem[];
  readonly lastSound: SoundEvent | null;
}

export type GameAction =
  | { type: 'START_GAME'; aiEnabled: boolean; sandboxMode: boolean }
  | { type: 'TICK' }
  | { type: 'SELECT_TOOL'; tool: BuildingType }
  | { type: 'APPLY_ACTION'; grid: Grid; cost: number; isBulldoze: boolean }
  | { type: 'ACTION_FAILED'; error: string }
  | { type: 'SET_GOAL'; goal: AIGoal | null }
  | { type: 'SET_GENERATING_GOAL'; isGenerating: boolean }
  | { type: 'ADD_NEWS'; news: NewsItem }
  | { type: 'CLAIM_REWARD' }
  | { type: 'RESET_GAME' }
  | { type: 'TRIGGER_SOUND'; key: string };
