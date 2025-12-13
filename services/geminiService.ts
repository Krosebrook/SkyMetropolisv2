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
    description: {
      type: Type.STRING,
      description: "A short, engaging mission description for a city builder game.",
    },
    targetType: {
      type: Type.STRING,
      enum: ['population', 'money', 'building_count'],
      description: "The metric the player needs to achieve.",
    },
    targetValue: {
      type: Type.INTEGER,
      description: "The numeric target value.",
    },
    buildingType: {
      type: Type.STRING,
      enum: [BuildingType.Residential, BuildingType.Commercial, BuildingType.Industrial, BuildingType.Park, BuildingType.Road],
      description: "Required only if targetType is 'building_count'.",
    },
    reward: {
      type: Type.INTEGER,
      description: "Currency reward amount.",
    },
  },
  required: ['description', 'targetType', 'targetValue', 'reward'],
};

const NEWS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "A witty 1-sentence news headline." },
    type: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['text', 'type'],
};

// --- Services ---

export const generateCityGoal = async (stats: CityStats, grid: Grid): Promise<AIGoal | null> => {
  const counts: Record<string, number> = {};
  grid.flat().forEach(t => counts[t.buildingType] = (counts[t.buildingType] || 0) + 1);

  const context = `
    CITY DATA:
    - Day: ${stats.day}
    - Money: $${stats.money}
    - Population: ${stats.population}
    - Happiness: ${stats.happiness}%
    - Buildings: ${JSON.stringify(counts)}
    
    GAME BALANCE:
    ${JSON.stringify(Object.values(BUILDINGS).filter(b => b.type !== BuildingType.None).map(b => ({type: b.type, cost: b.cost})))}
  `;

  const prompt = `Act as a City Council Advisor. Generate a balanced, achievable goal based on the city's current status. The goal should encourage growth or stability.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: GOAL_SCHEMA,
        temperature: 0.8,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return { 
        ...data, 
        id: crypto.randomUUID(), 
        completed: false 
      };
    }
  } catch (error) {
    console.warn("AI Goal Generation Failed:", error);
  }
  return null;
};

export const generateNewsEvent = async (stats: CityStats): Promise<NewsItem | null> => {
  const context = `Status: Pop ${stats.population}, Money ${stats.money}, Day ${stats.day}, Happy ${stats.happiness}.`;
  const prompt = "Generate a satirical or informative news headline for this city.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWS_SCHEMA,
        temperature: 1.0,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        id: crypto.randomUUID(),
        text: data.text,
        type: data.type,
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    console.warn("AI News Generation Failed:", error);
  }
  return null;
};
