/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { cityEngine } from './cityEngine';

/**
 * @deprecated Use cityEngine or cityService instead.
 */
export const aggregateGridMetrics = cityEngine.aggregateMetrics.bind(cityEngine);
export const calculateNextDay = cityEngine.calculateNextDay.bind(cityEngine);
export const executeGridAction = cityEngine.executeAction.bind(cityEngine);
export const createInitialGrid = cityEngine.createInitialGrid.bind(cityEngine);
