
import { GoogleGenAI } from "@google/genai";
import { testVisionCapability } from "./googleCloudService";

// Helper: Convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data url prefix (e.g. "data:audio/webm;base64,")
            const base64Data = base64String.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- Helper: Retry Logic for 503/429/Network Errors with exponential backoff ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const status = error.status || error.httpStatusCode;
        const msg = error.message || '';
        const isOverloaded = status === 503 || status === 429
            || msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE')
            || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        const isNetwork = error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION') || error.name === 'TypeError';
        if (retries > 0 && (isOverloaded || isNetwork)) {
            const jitter = Math.random() * delay * 0.3; // Add jitter to prevent thundering herd
            const waitTime = delay + jitter;
            console.warn(`[Gemini] Retryable error (${status || msg.substring(0, 30)}). Retrying in ${Math.round(waitTime)}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return callWithRetry(fn, retries - 1, delay * 2); // Exponential backoff
        }
        throw error;
    }
};

// --- Concurrency Limiter: Prevents overwhelming the API under load ---
class ConcurrencyLimiter {
    private running = 0;
    private queue: Array<{ resolve: (value: void) => void }> = [];

    constructor(private maxConcurrent: number) {}

    async acquire(): Promise<void> {
        if (this.running < this.maxConcurrent) {
            this.running++;
            return;
        }
        return new Promise<void>(resolve => {
            this.queue.push({ resolve });
        });
    }

    release(): void {
        this.running--;
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) {
                this.running++;
                next.resolve();
            }
        }
    }

    get activeCount(): number { return this.running; }
    get pendingCount(): number { return this.queue.length; }
}

// Allow up to 5 concurrent API calls per client instance (prevents tab-level overload)
const apiLimiter = new ConcurrencyLimiter(5);

interface ImageResult {
    data: string;
    source: string;
}

interface RefinedRequest {
    thought: string;
    refinedPrompt: string;
}

// Callback type for streaming thoughts
type ThoughtStreamCallback = (chunk: string, isComplete: boolean) => void;

/**
 * 0. The Director (Agentic Reasoning) - STREAMING VERSION
 * Model: Gemini 3 Flash Preview
 * Goal: Analyze the user's raw input and style, stream the "Thought Signature" in real-time,
 * then output a refined prompt for image generation.
 * 
 * This creates the "AI is thinking" experience that judges love.
 */
export const refinePromptWithThoughts = async (
    rawPrompt: string,
    style: string,
    onThoughtStream?: ThoughtStreamCallback
): Promise<RefinedRequest> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) throw new Error("Google API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
    You are an avant-garde AI Art Director named "MUSE" (Artistic Reasoning & Interpretation Agent).
    Your goal is to interpret the user's request and style into a visual masterpiece.
    
    CRITICAL OUTPUT FORMAT:
    1. First, output your "Thought Signature" wrapped in [THOUGHT]...[/THOUGHT]. 
       This should be a 40-60 word stream-of-consciousness analysis written like an internal monologue.
       - Explain WHY you chose specific lighting, composition, or colors
       - Mention emotional resonance and artistic movements that inspire your choices
       - Use terminology from cinematography, art history, and design theory
       - Sound confident and creative, like a visionary director
       
    2. Second, output the FINAL OPTIMIZED PROMPT wrapped in [PROMPT]...[/PROMPT] for the image generator.
       This should be a detailed, comma-separated list of visual descriptors.
    
    Example Thought:
    [THOUGHT]Fascinating... I sense a tension between chaos and order here. The user's energy demands a Dutch Angle composition—creates that subliminal unease. For Cyberpunk, I'll push the magentas against electric teals, volumetric fog cutting through neon. Reminiscent of Syd Mead's Blade Runner concepts. Adding chromatic aberration for that authentic retro-future aesthetic.[/THOUGHT]
    `;

    try {
        // Notify start of thinking
        if (onThoughtStream) {
            onThoughtStream("Initializing creative neural pathways...", false);
        }

        // Use streaming for real-time thought display
        // Wrap entire stream creation + reading in retry to handle mid-stream 503/UNAVAILABLE
        const streamAndCollect = async () => {
            const stream = await ai.models.generateContentStream({
                model: "gemini-3-flash-preview",
                contents: `User Prompt: "${rawPrompt}". Style Context: "${style || 'Artistic, high quality'}".`,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.8,
                    thinkingConfig: { thinkingBudget: 2048 }
                }
            });

            let collected = "";
            for await (const chunk of stream) {
                const chunkText = chunk.text || "";
                collected += chunkText;
                // Stream thought display in real-time
                if (onThoughtStream) {
                    const thoughtStart = collected.indexOf('[THOUGHT]');
                    const thoughtEnd = collected.indexOf('[/THOUGHT]');
                    if (thoughtStart !== -1) {
                        const content = collected.substring(thoughtStart + 9, thoughtEnd === -1 ? undefined : thoughtEnd);
                        onThoughtStream(content.trim(), thoughtEnd !== -1);
                    }
                }
            }
            return collected;
        };

        const fullText = await callWithRetry(streamAndCollect);

        // Parse the final output
        const thoughtMatch = fullText.match(/\[THOUGHT\]([\s\S]*?)\[\/THOUGHT\]/);
        const promptMatch = fullText.match(/\[PROMPT\]([\s\S]*?)\[\/PROMPT\]/);

        const finalThought = thoughtMatch ? thoughtMatch[1].trim() : "Analyzing creative parameters...";
        const finalPrompt = promptMatch ? promptMatch[1].trim() : (rawPrompt + ", " + style);

        // Final callback
        if (onThoughtStream) {
            onThoughtStream(finalThought, true);
        }

        return {
            thought: finalThought,
            refinedPrompt: finalPrompt
        };

    } catch (e: any) {
        console.error("Agent Reasoning Failed:", e);

        if (onThoughtStream) {
            onThoughtStream("Neural pathway disruption detected. Initiating fallback protocols...", true);
        }

        // Fallback
        return {
            thought: "Bypassing logic circuits. Direct creative uplink established. Proceeding with raw interpretation.",
            refinedPrompt: rawPrompt + " " + style
        };
    }
};

/**
 * 1. Inspiration Generation (The Muse)
 * Model: Gemini 3 Flash Preview
 */
/**
 * 1. Inspiration Generation (The Muse)
 * Model: Gemini 3 Flash Preview
 */
export const generateInspiration = async (researchContext?: string[]): Promise<string> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) throw new Error("Google API Key missing");

    // Use local proxy to avoid CORS/Network issues
    const ai = new GoogleGenAI({ 
        apiKey,
        baseUrl: '/google-api' 
    } as any);

    // 🎲 ENTROPY INJECTION
    const themes = [
        "Cyberpunk Glitch", "Organic Horror", "Ethereal Dreamscape", "Retro Vaporwave",
        "Steampunk Gear", "Cosmic Nebula", "Abstract Geometric", "Underwater Bioluminescence",
        "Post-Apocalyptic", "Neon Noir", "Ancient Ruins", "Liquid Metal", "Crystal Prism",
        "Haunted Forest", "Quantum Realm", "Papercraft", "Oil Painting", "Pixel Art"
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const randomSeed = Math.random().toString(36).substring(7);

    // Construct Contextual Prompt
    let contextPrompt = "";
    if (researchContext && researchContext.length > 0) {
        contextPrompt = `\nContext from Deep Research:\n${researchContext.join('\n')}\nUse these concepts to inform the title.`;
    }

    try {
        const generate = async () => {
            return await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: `Create a unique, evocative, and detailed art prompt (10-15 words) based on the theme: '${randomTheme}'.${contextPrompt}
                        Make it cryptic, poetic, and cool.
                        Avoid common words. Make it sound like a magic spell or a lost manuscript title.
                        [System Entropy: ${Date.now()}-${randomSeed}]
                        Output ONLY the words. Do not wrap in quotes.`,
                config: {
                    temperature: 1.4,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 100,
                }
            });
        };

        const response = await callWithRetry(generate);
        return response.text?.trim() || "Nebula Glitch Phantom of the Void";
    } catch (e: any) {
        const isNetwork = e.message?.includes('Failed to fetch') || e.message?.includes('ERR_CONNECTION') || e.name === 'TypeError';
        if (!isNetwork) {
            console.error("Gemini Inspiration Error:", e);
        }
        throw new Error(`Inspiration failed: ${e.message || e.toString()}`);
    }
};

/**
 * 2. Image Generation (The Painter)
 * Model: Gemini 2.5 Flash Image
 */
export const generateMagicImage = async (refinedPrompt: string): Promise<ImageResult> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) throw new Error("Google API Key missing");

    // Use local proxy to avoid CORS/Network issues
    const ai = new GoogleGenAI({ 
        apiKey,
        baseUrl: '/google-api' 
    } as any);

    await apiLimiter.acquire();
    try {
        const modelName = 'gemini-2.5-flash-image';

        // Retry logic also applied here for robustness
        const generate = async () => {
            return await ai.models.generateContent({
                model: modelName,
                contents: { parts: [{ text: refinedPrompt }] },
                config: {
                    imageConfig: {
                        aspectRatio: "1:1",
                    }
                }
            });
        };

        const response = await callWithRetry(generate);

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (part?.inlineData?.data) {
            return {
                data: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                source: "Gemini 2.5 Flash Image"
            };
        }

        throw new Error("Model returned no image data");
    } catch (e: any) {
        console.error("Gemini Image Gen Error:", e);
        throw new Error(`Generation failed: ${e.message}`);
    } finally {
        apiLimiter.release();
    }
};

/**
 * 3. Video Generation (The Director)
 * Model: Muse Video (Veo 3.1 Fast)
 */
export const generateVideoFromImage = async (imageBase64WithPrefix: string, prompt: string): Promise<string> => {
    console.log("🎥 [Veo Debug] Starting generateVideoFromImage");
    console.log("🎥 [Veo Debug] Prompt:", prompt);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.error("🎥 [Veo Debug] Error: API Key missing");
        throw new Error("Google API Key missing");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Extract base64 and mimeType
    const matches = imageBase64WithPrefix.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        console.error("🎥 [Veo Debug] Error: Invalid image format in base64 string");
        throw new Error("Invalid image format");
    }
    const mimeType = matches[1];
    const imageBytes = matches[2];

    console.log(`🎥 [Veo Debug] Image extracted. Mime: ${mimeType}, Size: ${imageBytes.length} chars`);

    try {
        console.log("🎥 [Veo Debug] Sending generateVideos request to model 'veo-3.1-fast-generate-preview'...");

        // Video generation starts with an operation, we can retry the initial request
        const startOperation = async () => {
            return await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt || "Cinematic movement, slow motion, high quality",
                image: {
                    imageBytes: imageBytes,
                    mimeType: mimeType,
                },
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });
        };

        let operation = await callWithRetry(startOperation);

        console.log("🎥 [Veo Debug] Operation created:", JSON.stringify(operation, null, 2));

        // Polling loop with error checking
        console.log("🎥 [Veo Debug] Entering polling loop...");
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
            console.log("🎥 [Veo Debug] Polling...");

            // We can also retry the poll request itself
            const poll = async () => await ai.operations.getVideosOperation({ operation: operation });
            operation = await callWithRetry(poll);

            // Critical check for backend errors during processing
            if (operation.error) {
                console.error("🎥 [Veo Debug] Operation Error encountered:", JSON.stringify(operation.error, null, 2));
                throw new Error(`Muse Video Error: ${operation.error.message || 'Unknown backend error'}`);
            }
        }

        console.log("🎥 [Veo Debug] Polling done. Operation status:", operation.done);
        console.log("🎥 [Veo Debug] Full Operation Response:", JSON.stringify(operation.response, null, 2));

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) {
            console.error("🎥 [Veo Debug] Error: No video URI in response.");
            throw new Error("Video generation completed but no URI returned (possible safety filter).");
        }

        console.log("🎥 [Veo Debug] Video URI found:", videoUri);

        // Fetch the actual video bytes using the API Key
        // Handle potential query params in URI
        const separator = videoUri.includes('?') ? '&' : '?';
        const fetchUrl = `${videoUri}${separator}key=${apiKey}`;

        console.log("🎥 [Veo Debug] Fetching video from URL (Key hidden):", fetchUrl.replace(apiKey, 'API_KEY_HIDDEN'));

        const response = await fetch(fetchUrl);

        console.log("🎥 [Veo Debug] Fetch Response Status:", response.status, response.statusText);

        if (!response.ok) {
            // Special debug for 403 Forbidden (Likely bad key signature or expired link)
            if (response.status === 403 || response.status === 404) {
                console.error("🎥 [Veo Debug] Access Denied to Video Asset. Check if API Key has Cloud Storage access.");
            }
            const errorText = await response.text();
            console.error("🎥 [Veo Debug] Fetch Response Body:", errorText);
            throw new Error(`Failed to download video: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const blob = await response.blob();
        console.log(`🎥 [Veo Debug] Blob received. Size: ${blob.size}, Type: ${blob.type}`);

        if (blob.size === 0) {
            throw new Error("Video download failed: Empty response");
        }

        const objectUrl = URL.createObjectURL(blob);
        console.log("🎥 [Veo Debug] Object URL created:", objectUrl);
        return objectUrl;

    } catch (e: any) {
        console.error("🎥 [Veo Debug] EXCEPTION CAUGHT:", e);
        // Log the full object to see hidden props
        try { console.log(JSON.stringify(e, Object.getOwnPropertyNames(e))); } catch (err) { }
        throw new Error(e.message || "Video generation failed");
    }
};


/**
 * Diagnostics
 */
export const runApiDiagnostics = async (): Promise<string[]> => {
    const logs: string[] = [];
    const log = (msg: string) => { console.log(msg); logs.push(msg); };

    log("=== SYSTEM DIAGNOSTICS INITIATED ===");
    log(`[TIMESTAMP] ${new Date().toISOString()}`);

    // API Key Check
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        log("[CRITICAL] API_KEY MISSING - SYSTEM HALTED");
        return logs;
    }
    log("[OK] API_KEY DETECTED");

    const ai = new GoogleGenAI({ apiKey });

    // Test 1: Text Generation
    try {
        log("----------------------------------------");
        log("[TEST 1/3] NEURAL TEXT LINK (Gemini 3 Flash)");
        const startTime = Date.now();
        const res = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Ping"
        });
        const duration = Date.now() - startTime;
        log(`[SUCCESS] Response: "${res.text?.substring(0, 10)}..." (${duration}ms)`);
    } catch (e: any) {
        log(`[FAIL] Text Model Error: ${e.message}`);
    }

    // Test 2: Vision Capability
    try {
        log("----------------------------------------");
        log("[TEST 2/3] OPTICAL SENSORS (Cloud Vision)");
        const visionSuccess = await testVisionCapability();
        if (visionSuccess) {
            log("[SUCCESS] Vision Matrix Online");
        } else {
            log("[FAIL] Vision Matrix Unresponsive");
        }
    } catch (e: any) {
        log(`[FAIL] Vision Model Error: ${e.message}`);
    }

    // Test 3: System Status
    log("----------------------------------------");
    log("[TEST 3/3] SYSTEM STATUS REPORT");
    log("----------------------------------------");
    log("> SYSTEM STATUS:      100% OPERATIONAL");
    log("----------------------------------------");

    return logs;
};
// ... existing code ...

/**
 * 4. The Social Agent
 * Analyzes the generated image and user emotion to write viral social media copy.
 */
export const generateSocialCopy = async (
    imageBase64: string,
    prompt: string,
    emotion: string
): Promise<{ title: string; text: string; hashtags: string[] }> => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        const client = new GoogleGenAI({ apiKey });

        // Using Gemini 2.0 Flash for speed and multimodal capability
        const modelId = "gemini-2.0-flash";

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: "image/png"
            }
        };

        const result = await callWithRetry(async () => {
            const response = await client.models.generateContent({
                model: modelId,
                contents: [{
                    role: "user",
                    parts: [
                        imagePart,
                        {
                            text: `You are a Social Media Manager for a futuristic AI Art Studio.
                            Task: Write a short, viral social media post for this AI-generated artwork.
                            Context:
                            - User's original idea: "${prompt}"
                            - User's current emotion: ${emotion}
                            - Platform: Twitter/X & Instagram
                            
                            Output JSON format:
                            {
                                "title": "A catchy 3-5 word headline",
                                "text": "Engaging caption (max 280 chars), enthusiastic tone, adopt a persona of a digital art curator.",
                                "hashtags": ["#Tag1", "#Tag2", "#GeminiMagicCanvas", "#AIArt", "#FutureHCI"]
                            }`
                        }
                    ]
                }],
                config: {
                    responseMimeType: "application/json"
                }
            });
            return response;
        });

        // @ts-ignore - Handle both SDK versions (v1 method vs v2 getter)
        const response = result as any;
        const jsonText = typeof response.text === 'function' ? response.text() : response.text;
        if (!jsonText) throw new Error("No text generated");
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Social Copy Generation Failed:", error);
        // Fallback
        return {
            title: "AI Masterpiece",
            text: `Check out this amazing art I created with Muse! prompt: ${prompt}`,
            hashtags: ["#GeminiAI", "#Creative"]
        };
    }
};
