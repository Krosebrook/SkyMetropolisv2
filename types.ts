/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Domain Enums ---
export enum BuildingType {
  None = 'None',
  Road = 'Road',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Park = 'Park',
}

export type NewsType = 'positive' | 'negative' | 'neutral';
export type GoalTargetType = 'population' | 'money' | 'building_count';

// --- Entities ---
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
  buildingType: BuildingType;
  variant: number; // 0-99 for procedural variation
  rotation: number; // 0-3 for orientation (0, PI/2, PI, 3PI/2)
}

export type Grid = TileData[][];

export interface CityStats {
  money: number;
  population: number;
  day: number;
  happiness: number; // 0-100
}

export interface AIGoal {
  readonly id: string;
  description: string;
  targetType: GoalTargetType;
  targetValue: number;
  buildingType?: BuildingType;
  reward: number;
  completed: boolean;
}

export interface NewsItem {
  readonly id: string;
  text: string;
  type: NewsType;
  timestamp: number;
}

// --- Global ---
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
