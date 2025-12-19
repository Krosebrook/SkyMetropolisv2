/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from "@google/genai";
import { AIGoal, BuildingType, CityStats, Grid, NewsItem } from "../types";
import { BUILDINGS } from "../constants";

// Corrected initialization per @google/genai guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = 'gemini-3-flash-preview';

const GOAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "A catchy mission description" },
    targetType: { type: Type.STRING, enum: ['population', 'money', 'building_count'] },
    targetValue: { type: Type.INTEGER },
    buildingType: { 
      type: Type.STRING, 
      enum: [BuildingType.Residential, BuildingType.Commercial, BuildingType.Industrial, BuildingType.Park, BuildingType.Road] 
    },
    reward: { type: Type.INTEGER },
  },
  required: ['description', 'targetType', 'targetValue', 'reward'],
};

const NEWS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    type: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['text', 'type'],
};

const getBuildingCounts = (grid: Grid) => {
  const counts: Record<string, number> = {};
  grid.flat().forEach(t => counts[t.buildingType] = (counts[t.buildingType] || 0) + 1);
  return counts;
};

export const generateCityGoal = async (stats: CityStats, grid: Grid): Promise<AIGoal | null> => {
  const counts = getBuildingCounts(grid);
  const context = `
    CITY STATE: Day ${stats.day}, $${stats.money}, Pop ${stats.population}, Happy ${stats.happiness}%.
    INVENTORY: ${JSON.stringify(counts)}.
    AVAILABLE BUILDINGS: ${JSON.stringify(Object.values(BUILDINGS).filter(b => b.type !== BuildingType.None).map(b => ({type: b.type, cost: b.cost})))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `${context}\nAct as a strategic advisor. Suggest a specific milestone goal. Output JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: GOAL_SCHEMA,
      },
    });

    // Accessing response.text directly as a property, as per guidelines.
    const data = JSON.parse(response.text || '{}');
    if (data.description) {
      return { 
        id: crypto.randomUUID(), 
        ...data,
        completed: false 
      };
    }
  } catch (error) {
    console.warn("Gemini Service: Goal Generation failed. Continuing in offline mode.");
  }
  return null;
};

export const generateNewsEvent = async (stats: CityStats): Promise<NewsItem | null> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `City Pop: ${stats.population}, Money: ${stats.money}. Generate a short, witty news headline about this city. Output JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWS_SCHEMA,
      },
    });

    // Accessing response.text directly as a property, as per guidelines.
    const data = JSON.parse(response.text || '{}');
    if (data.text) {
      return {
        id: crypto.randomUUID(),
        text: data.text,
        type: data.type,
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    console.warn("Gemini Service: News Generation failed.");
  }
  return null;
};