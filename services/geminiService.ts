
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIGoal, BuildingType, CityStats, Grid, NewsItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const DEFAULT_MODEL = 'gemini-3-flash-preview';

const STRATEGIC_AI_INSTRUCTION = "You are the 'Nexus City Architect' AI. Your tone is professional, futuristic, and highly strategic. Use technical urban planning terms like 'sustainability index', 'grid efficiency', and 'zoning optimization'. Be helpful but treat the user as a capable lead engineer.";

export const createLiveSession = (callbacks: any) => {
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
      },
      systemInstruction: `${STRATEGIC_AI_INSTRUCTION} Analyze the city and provide data-driven suggestions for growth.`,
    },
  });
};

export const getThinkingAdvisorResponse = async (query: string, stats: CityStats): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Urban Planning Query: ${query}`,
    config: {
      thinkingConfig: { thinkingBudget: 2000 },
      systemInstruction: `${STRATEGIC_AI_INSTRUCTION} Provide a multi-step strategic plan for the requested city expansion.`
    }
  });
  return response.text || "Strategic data unavailable.";
};

export const searchLocalPlaces = async (query: string, lat: number, lng: number): Promise<{text: string, sources: any[]}> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      },
      systemInstruction: `${STRATEGIC_AI_INSTRUCTION} Analyze the real-world surroundings and provide architectural or urban planning insights based on the user's current location.`
    },
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return {
    text: response.text || "No spatial data retrieved.",
    sources
  };
};

export const generateCityGoal = async (stats: CityStats, grid: Grid): Promise<AIGoal | null> => {
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Generate a high-level infrastructure challenge for a smart city architect.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING, description: "Professional goal like 'Optimize grid stability by expanding the Bio-Factory district.'" },
              targetType: { type: Type.STRING, enum: ['population', 'money', 'building_count'] },
              targetValue: { type: Type.INTEGER },
              buildingType: { type: Type.STRING },
              reward: { type: Type.INTEGER },
            },
            required: ['description', 'targetType', 'targetValue', 'reward'],
          },
          systemInstruction: STRATEGIC_AI_INSTRUCTION
        },
      });
      const data = JSON.parse(response.text?.trim() || "{}");
      return { id: crypto.randomUUID(), ...data, completed: false };
    } catch (error) { return null; }
};

export const generateNewsEvent = async (stats: CityStats): Promise<NewsItem | null> => {
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Generate a smart city news alert about technology, economy, or environment.`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "e.g., 'Quantum computing breakthrough boosts Tech District efficiency.'" },
                  type: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
                },
                required: ['text', 'type'],
              },
            systemInstruction: STRATEGIC_AI_INSTRUCTION
        },
      });
      const data = JSON.parse(response.text?.trim() || "{}");
      return { id: crypto.randomUUID(), text: data.text, type: data.type, timestamp: Date.now() };
    } catch (error) { return null; }
};

export const generateProImage = async (prompt: string, size: "1K" | "2K" | "4K"): Promise<string | null> => {
  const aiPro = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await aiPro.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `A photorealistic futuristic smart city design showing: ${prompt}. Cinematic lighting, 8k, architectural visualization.` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: size } },
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
  } catch (e) { return null; }
};

export const generateCouncilMeeting = async (prompt: string): Promise<string | null> => {
  try {
    const meetingPrompt = `Conduct a short 2-person council meeting about the following city topic: ${prompt}.
      Speakers: Architect (Technical, strategic) and Resident (Enthusiastic, community-focused).
      Architect: ...
      Resident: ...`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: meetingPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Architect',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
              },
              {
                speaker: 'Resident',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
              }
            ]
          }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    console.error("Council meeting generation failed:", e);
    return null;
  }
};

export const generateVeoVideo = async (prompt: string, imageBase64?: string): Promise<string | null> => {
  const aiVeo = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const payload: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Breathtaking cinematic drone sweep of a futuristic city: ${prompt}`,
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
    };
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      payload.image = { imageBytes: base64Data, mimeType: 'image/png' };
    }
    let operation = await aiVeo.models.generateVideos(payload);
    while (!operation.done) {
      await new Promise(r => setTimeout(r, 10000));
      operation = await aiVeo.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    return downloadLink ? `${downloadLink}&key=${process.env.API_KEY}` : null;
  } catch (e) { return null; }
};
