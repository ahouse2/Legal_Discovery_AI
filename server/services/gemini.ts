import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API client
// Note: The API key is injected via process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiModel = ai.models;
