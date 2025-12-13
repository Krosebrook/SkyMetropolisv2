/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { AIGoal, BuildingType, CityStats, Grid, NewsItem } from "../types";
import { BUILDINGS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = 'gemini-2.5-flash';

// --- Schemas ---

const GOAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING },
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

// --- Helpers ---

const safeJSONParse = <T>(text: string): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error("AI Response Parse Error:", e);
    return null;
  }
};

const countBuildings = (grid: Grid) => {
  const counts: Record<string, number> = {};
  grid.flat().forEach(t => counts[t.buildingType] = (counts[t.buildingType] || 0) + 1);
  return counts;
};

// --- Services ---

export const generateCityGoal = async (stats: CityStats, grid: Grid): Promise<AIGoal | null> => {
  const counts = countBuildings(grid);
  const context = `
    CITY METRICS:
    - Day: ${stats.day}
    - Treasury: $${stats.money}
    - Population: ${stats.population}
    - Happiness: ${stats.happiness}
    - Buildings: ${JSON.stringify(counts)}
    
    CATALOG:
    ${JSON.stringify(Object.values(BUILDINGS).filter(b => b.type !== BuildingType.None).map(b => ({type: b.type, cost: b.cost})))}
  `;

  const prompt = `As a City Advisor, define a strategic goal. If money is low, focus on economy. If happiness is low, focus on parks. Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: GOAL_SCHEMA,
        temperature: 0.7, // Lower temperature for more reliable logic
      },
    });

    if (response.text) {
      const data = safeJSONParse<Partial<AIGoal>>(response.text);
      if (data && data.description && data.targetType) {
        return { 
          id: crypto.randomUUID(), 
          description: data.description,
          targetType: data.targetType,
          targetValue: data.targetValue || 10,
          buildingType: data.buildingType,
          reward: data.reward || 100,
          completed: false 
        };
      }
    }
  } catch (error) {
    console.warn("Gemini API Error (Goal):", error);
  }
  return null;
};

export const generateNewsEvent = async (stats: CityStats): Promise<NewsItem | null> => {
  const context = `City State: Pop ${stats.population}, Money ${stats.money}, Day ${stats.day}, Happy ${stats.happiness}.`;
  const prompt = "Generate a single-sentence news headline. Satirical or informative. JSON.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWS_SCHEMA,
        temperature: 1.1, // Higher temperature for creativity
      },
    });

    if (response.text) {
      const data = safeJSONParse<Partial<NewsItem>>(response.text);
      if (data && data.text && data.type) {
        return {
          id: crypto.randomUUID(),
          text: data.text,
          type: data.type,
          timestamp: Date.now(),
        };
      }
    }
  } catch (error) {
    console.warn("Gemini API Error (News):", error);
  }
  return null;
};
