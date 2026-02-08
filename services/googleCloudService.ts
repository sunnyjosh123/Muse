
import { GoogleGenAI, Type } from "@google/genai";

export interface VisionAnalysisResult {
    joy: string;
    sorrow: string;
    anger: string;
    surprise: string;
    headwear: string;
    timestamp: number;
}

// --- Helper: Retry Logic for Network & 503 Errors ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const isOverloaded = error.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('UNAVAILABLE');
        const isNetwork = error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION') || error.name === 'TypeError';
        if (retries > 0 && (isOverloaded || isNetwork)) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return callWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

/**
 * Uses Gemini 3 Flash as the 'Official Vision API' to analyze emotions and attributes.
 * This replaces the Google Cloud Vision REST API to ensure compatibility with Gemini API keys.
 */
export const analyzeImageWithCloudVision = async (base64Image: string): Promise<VisionAnalysisResult | null> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY; 
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const generate = async () => {
            return await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        parts: [
                            { text: "Analyze the facial expression in this image with high sensitivity. Determine the likelihood of Joy, Sorrow, Anger, Surprise, and Headwear. Pay close attention to subtle micro-expressions. Return one of these exact strings for each category: VERY_LIKELY, LIKELY, POSSIBLE, UNLIKELY, VERY_UNLIKELY." },
                            { inlineData: { mimeType: "image/jpeg", data: base64Image } }
                        ]
                    }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            joy: { type: Type.STRING },
                            sorrow: { type: Type.STRING },
                            anger: { type: Type.STRING },
                            surprise: { type: Type.STRING },
                            headwear: { type: Type.STRING }
                        },
                        required: ["joy", "sorrow", "anger", "surprise", "headwear"]
                    }
                }
            });
        };

        const response = await callWithRetry(generate);
        const result = JSON.parse(response.text || "{}");
        
        return {
            ...result,
            timestamp: Date.now()
        };
    } catch (error: any) {
        // Graceful handling for Rate Limits (429) and Server Overload (503) after retries fail
        const isOverloaded = 
            error.status === 503 || 
            error.message?.includes('503') || 
            error.message?.includes('overloaded');

        const isRateLimited = 
            error.status === 429 || 
            error.message?.includes('429') || 
            error.message?.includes('quota');

        const isNetwork = 
            error.message?.includes('Failed to fetch') || 
            error.message?.includes('ERR_CONNECTION') ||
            error.name === 'TypeError';

        if (isOverloaded || isRateLimited || isNetwork) {
            // Silently skip — transient issues, no need to alarm
        } else {
            console.error("Gemini Vision Analysis Error:", error);
        }
        return null;
    }
}

/**
 * Diagnostic Tool: Explicitly tests if the Vision Model is accepting images.
 */
export const testVisionCapability = async (): Promise<boolean> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return false;

    // 1x1 Pixel Transparent GIF Base64
    const dummyImage = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                {
                    parts: [
                        { text: "Describe this image in 1 word." },
                        { inlineData: { mimeType: "image/gif", data: dummyImage } }
                    ]
                }
            ]
        });
        // If we get any text back, the vision model processed the image successfully.
        return !!response.text;
    } catch (e) {
        console.error("Vision Diagnostic Failed:", e);
        return false;
    }
};

/**
 * Helper to determine the text color based on likelihood
 */
export const getLikelihoodColor = (likelihood: string): string => {
    switch (likelihood) {
        case 'VERY_LIKELY': return '#22c55e'; // Green
        case 'LIKELY': return '#86efac';       // Light Green
        case 'POSSIBLE': return '#facc15';     // Yellow
        case 'UNLIKELY': return '#9ca3af';     // Gray
        case 'VERY_UNLIKELY': return '#4b5563';// Dark Gray
        default: return '#374151';
    }
};
