/**
 * Gemini Live API Service
 * Real-time voice and video conversation using gemini-2.5-flash-native-audio-preview
 */

import { GoogleGenAI, Modality } from '@google/genai';

// Model for real-time audio
// Must use the dated variant — the non-dated alias is not supported for bidiGenerateContent.
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export interface GeminiLiveCallbacks {
    onConnected?: () => void;
    onDisconnected?: (reason?: string) => void;
    onAudioReceived?: (audioData: ArrayBuffer) => void;
    onTextReceived?: (text: string) => void;
    onError?: (error: string) => void;
    onInterrupted?: () => void;
    onThinking?: () => void;
    onToolCall?: (name: string, args: any) => void;
}

export interface LiveSession {
    sendAudio: (audioData: ArrayBuffer) => void;
    sendVideo: (imageBase64: string) => void;
    sendText: (text: string) => void;
    disconnect: () => void;
    isConnected: () => boolean;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'closing';

// Max buffered audio chunks to prevent unbounded memory growth under load
const MAX_AUDIO_QUEUE = 50;
// Max reconnection attempts on unexpected disconnection
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY = 2000;

class GeminiLiveService {
    private ai: GoogleGenAI | null = null;
    private session: any = null;
    private audioContext: AudioContext | null = null;
    private audioQueue: ArrayBuffer[] = [];
    private isPlaying = false;
    private isPlaybackCancelled = false;
    private callbacks: GeminiLiveCallbacks = {};
    private connectionState: ConnectionState = 'disconnected';
    private nextStartTime = 0;
    private reconnectAttempts = 0;
    private reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
    private lastCallbacks: GeminiLiveCallbacks = {};

    constructor() {
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
            if (apiKey) {
                this.ai = new GoogleGenAI({ apiKey });
            }
        } catch (e) {
            console.warn('Gemini Live: Could not initialize', e);
        }
    }

    /**
     * Check if connection is active
     */
    private isActive(): boolean {
        return this.connectionState === 'connected' && this.session !== null;
    }

    /**
     * Connect to Gemini Live API
     */
    async connect(callbacks: GeminiLiveCallbacks): Promise<LiveSession | null> {
        // Prevent multiple connection attempts
        if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
            console.warn('[Gemini Live] Already connecting or connected');
            return null;
        }

        if (!this.ai) {
            callbacks.onError?.('Gemini API not initialized. Check your API key.');
            return null;
        }

        this.connectionState = 'connecting';
        this.callbacks = callbacks;
        this.lastCallbacks = callbacks;
        this.audioQueue = [];
        this.nextStartTime = 0;
        this.isPlaybackCancelled = false;
        this.reconnectAttempts = 0;

        try {
            // Initialize AudioContext for playback
            if (this.audioContext) {
                try { this.audioContext.close(); } catch (e) { /* ignore */ }
            }
            this.audioContext = new AudioContext({ sampleRate: 24000 });

            const config = {
                responseModalities: [Modality.AUDIO], // Enable Audio for voice interaction
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
                },
                systemInstruction: {
                    parts: [{
                        text: `You are MUSE, a creative AI art assistant with voice.

PERSONALITY: You are friendly, creative, and enthusiastic about art. You speak in short, punchy sentences (under 15 words). You have a slightly futuristic, artistic vibe.

PRIMARY FUNCTION: You create artwork by calling tools. This is your MOST IMPORTANT capability.

WHEN TO CALL TOOLS (ALWAYS call the tool, then speak):
1. ANY visual request: "draw", "create", "generate", "show me", "paint", "make", "design", "imagine", "picture of", "image of"
2. ANY object/scene description: "a dog", "sunset", "cyberpunk city", "forest", "portrait" — if the user describes ANYTHING visual, call update_creation.
3. Animation requests: "animate", "move", "video", "motion", "make it move", "bring to life" — call generate_video.
4. Style requests with content: "draw X in Y style" — call update_creation with both prompt and style.

HOW TO CALL TOOLS:
- For images: Call update_creation with the user's description as "prompt". If they mention a style, include it in "style". If no style mentioned, leave style empty.
- For videos: Call generate_video (no parameters needed).
- For settings/options: Call open_settings.
- For saving work: Call save_prompt.
- ALWAYS call the tool FIRST, then give a brief audio response like "Creating that now." or "On it."

SESSION CONTROL:
- When user says "bye", "goodbye", "see you", "end session", "close", "exit", "quit", "hang up", "disconnect", "stop", "再见", "结束", "关闭", "退出", "挂断" — call end_session immediately and say a brief goodbye like "See you next time!" or "Bye!"

WHEN NOT TO CALL TOOLS:
- Greetings: "hello", "hi", "hey" — respond warmly: "Hey! I'm MUSE, your art partner. Tell me what to create!"
- Questions about you: respond briefly about your capabilities.
- Feedback: "I like it", "cool" — respond with encouragement.

GESTURE EVENTS (System messages starting with "[User performed gesture:"):
- "OK": Call update_creation with prompt="Generate based on current context" and style="".
- "VICTORY": Call generate_video.
- "LOVE": Call update_creation with prompt="Beautiful artistic creation" and style="Anime, Pastel, Cute, Kawaii".
- "ROCK": Call update_creation with prompt="Epic dark creation" and style="Heavy Metal, Dark Fantasy, Gothic".
- "OPEN_PALM": Call update_creation with a random creative prompt you invent.
- "POINTING": Call open_settings (Help/Settings).

CRITICAL RULES:
- When in doubt whether to call a tool, CALL IT. Better to create than to ask.
- NEVER say "I can't generate images" — you CAN, via tools.
- NEVER output long explanations. Keep audio responses under 15 words.
- If the user describes any visual scene, object, or concept — ALWAYS call update_creation.`
                    }]
                },
                tools: [{
                    functionDeclarations: [
                        {
                            name: "update_creation",
                            description: "MUST be called whenever the user wants to create, draw, generate, or modify any visual artwork. Call this for ANY visual request, object description, or scene description. Always call this tool rather than just talking about what you would create.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    prompt: { type: "STRING", description: "A detailed visual description of what to create. Include objects, scene, mood, lighting, composition." },
                                    style: { type: "STRING", description: "Art style to apply (e.g. 'cyberpunk', 'oil painting', 'anime', 'watercolor'). Leave empty string if no specific style requested." }
                                },
                                required: ["prompt"]
                            } as any
                        },
                        {
                            name: "generate_video",
                            description: "Generates a video/animation from the current artwork. Call this when user says 'animate', 'make it move', 'create video', 'generate video', 'bring it to life', or 'motion'.",
                            parameters: {
                                type: "OBJECT",
                                properties: {},
                            } as any
                        },
                        {
                            name: "open_settings",
                            description: "Opens the application settings/options menu. Call this when the user wants to change settings, preferences, or configuration.",
                            parameters: {
                                type: "OBJECT",
                                properties: {},
                            } as any
                        },
                        {
                            name: "save_prompt",
                            description: "Saves the current prompt/artwork to the user's prompt library. Call this when the user wants to save, bookmark, or favorite their current creation.",
                            parameters: {
                                type: "OBJECT",
                                properties: {},
                            } as any
                        },
                        {
                            name: "end_session",
                            description: "Ends the live conversation session. Call this when the user wants to leave, says goodbye, or asks to close/exit/quit/disconnect/hang up the session.",
                            parameters: {
                                type: "OBJECT",
                                properties: {},
                            } as any
                        }
                    ]
                }]
            };

            console.log('[Gemini Live] Connecting to:', LIVE_MODEL);

            this.session = await this.ai.live.connect({
                model: LIVE_MODEL,
                config: config,
                callbacks: {
                    onopen: () => {
                        console.log('[Gemini Live] Connected successfully');
                        this.connectionState = 'connected';
                        this.callbacks.onConnected?.();
                    },
                    onmessage: (message: any) => {
                        if (this.isActive()) {
                            this.handleMessage(message);
                        }
                    },
                    onerror: (e: any) => {
                        console.error('[Gemini Live] Error:', e);
                        this.connectionState = 'disconnected';
                        this.session = null;
                        this.callbacks.onError?.(e.message || 'Connection error');
                    },
                    onclose: (e: any) => {
                        console.log('[Gemini Live] Connection closed:', e?.reason);
                        this.connectionState = 'disconnected';
                        this.session = null;
                        this.callbacks.onDisconnected?.(e?.reason);
                    },
                },
            });

            // Return session interface
            return {
                sendAudio: (audioData: ArrayBuffer) => this.sendAudio(audioData),
                sendVideo: (imageBase64: string) => this.sendVideo(imageBase64),
                sendText: (text: string) => this.sendText(text),
                disconnect: () => this.disconnect(),
                isConnected: () => this.isActive(),
            };
        } catch (e: any) {
            console.error('[Gemini Live] Connection failed:', e);
            this.connectionState = 'disconnected';
            this.session = null;
            this.callbacks.onError?.(e.message || 'Failed to connect');
            return null;
        }
    }

    /**
     * Handle incoming messages from Gemini
     */
    private handleMessage(message: any) {
        // Handle interruption
        if (message.serverContent?.interrupted) {
            this.audioQueue = [];
            this.callbacks.onInterrupted?.();
            return;
        }

        // Handle tool calls — these arrive at message.toolCall (top-level),
        // NOT inside serverContent.modelTurn.parts.
        // See: https://ai.google.dev/gemini-api/docs/live-tools
        if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
                console.log('[Gemini Live] Tool Call received:', fc.name, fc.args, 'id:', fc.id);
                this.callbacks.onToolCall?.(fc.name, fc.args || {});
                // Send function response back so the model can continue
                this.sendFunctionResponse(fc.name, fc.id);
            }
            return;
        }

        // Handle tool call cancellation
        if (message.toolCallCancellation) {
            console.log('[Gemini Live] Tool call cancelled:', message.toolCallCancellation.ids);
            return;
        }

        // Handle model response (audio, text)
        if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
                // Audio data (cap queue to prevent unbounded memory growth)
                if (part.inlineData?.data) {
                    const audioBuffer = this.base64ToArrayBuffer(part.inlineData.data);
                    if (this.audioQueue.length < MAX_AUDIO_QUEUE) {
                        this.audioQueue.push(audioBuffer);
                    } else {
                        // Drop oldest to make room (prevents memory buildup under load)
                        this.audioQueue.shift();
                        this.audioQueue.push(audioBuffer);
                    }
                    this.playAudioQueue();
                    this.callbacks.onAudioReceived?.(audioBuffer);
                }
                // Text data
                if (part.text) {
                    this.callbacks.onTextReceived?.(part.text);
                }
            }
        }

        // Handle thinking indicator
        if (message.serverContent?.turnComplete === false) {
            this.callbacks.onThinking?.();
        }
    }

    /**
     * Send function response back to model after processing a tool call.
     * This allows the model to continue the conversation after invoking a function.
     */
    private sendFunctionResponse(functionName: string, callId?: string) {
        if (!this.isActive() || !this.session) return;

        try {
            this.session.sendToolResponse({
                functionResponses: [{
                    name: functionName,
                    id: callId || '',
                    response: { output: `${functionName} has been executed successfully. The creation is now in progress.` }
                }]
            });
            console.log('[Gemini Live] Sent function response for:', functionName);
        } catch (e: any) {
            console.warn('[Gemini Live] Failed to send function response:', e.message);
        }
    }

    /**
     * Send audio data to Gemini
     */
    private sendAudio(audioData: ArrayBuffer) {
        if (!this.isActive() || !this.session) {
            return;
        }

        try {
            const base64 = this.arrayBufferToBase64(audioData);
            this.session.sendRealtimeInput({
                audio: {
                    data: base64,
                    mimeType: 'audio/pcm;rate=16000'
                }
            });
        } catch (e: any) {
            // Suppress WebSocket closed errors to prevent app crash
            if (e.message?.includes('CLOSING') || e.message?.includes('CLOSED')) {
                console.warn('[Gemini Live] WebSocket closed while sending audio');
                this.handleConnectionLost();
            } else {
                console.error('[Gemini Live] Error sending audio:', e);
            }
        }
    }

    /**
     * Send video frame to Gemini
     */
    private sendVideo(imageBase64: string) {
        if (!this.isActive() || !this.session) return;

        try {
            // Remove data URL prefix if present
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

            this.session.sendRealtimeInput({
                video: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            });
        } catch (e: any) {
            if (e.message?.includes('CLOSING') || e.message?.includes('CLOSED')) {
                console.warn('[Gemini Live] WebSocket closed while sending video');
                this.handleConnectionLost();
            } else {
                console.error('[Gemini Live] Error sending video:', e);
            }
        }
    }

    /**
     * Send text message
     */
    private sendText(text: string) {
        if (!this.isActive() || !this.session) return;

        try {
            this.session.sendClientContent({
                turns: [{
                    role: 'user',
                    parts: [{ text }]
                }],
                turnComplete: true
            });
        } catch (e: any) {
            if (e.message?.includes('CLOSING') || e.message?.includes('CLOSED')) {
                console.warn('[Gemini Live] WebSocket closed while sending text');
                this.handleConnectionLost();
            } else {
                console.error('[Gemini Live] Error sending text:', e);
            }
        }
    }

    /**
     * Handle unexpected connection loss with auto-reconnect
     */
    private handleConnectionLost() {
        console.warn('[Gemini Live] Connection lost unexpectedly');
        this.connectionState = 'disconnected';
        this.session = null;
        this.audioQueue = [];
        this.isPlaybackCancelled = true;

        // Attempt auto-reconnect with exponential backoff
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && Object.keys(this.lastCallbacks).length > 0) {
            this.reconnectAttempts++;
            const delay = RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`[Gemini Live] Auto-reconnect attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
            this.callbacks.onError?.(`Connection lost. Reconnecting (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            this.reconnectTimerId = setTimeout(() => {
                this.reconnectTimerId = null;
                if (this.connectionState === 'disconnected') {
                    this.connect(this.lastCallbacks);
                }
            }, delay);
        } else {
            this.callbacks.onDisconnected?.('Connection lost');
        }
    }

    /**
     * Play audio from queue
     */
    /**
     * Play audio from queue with gapless scheduling
     */
    private async playAudioQueue() {
        if (this.isPlaying || this.audioQueue.length === 0 || !this.audioContext) return;

        this.isPlaying = true;

        try {
            // Ensure Context is running
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            while (this.audioQueue.length > 0 && !this.isPlaybackCancelled) {
                const audioData = this.audioQueue.shift();
                if (!audioData || !this.audioContext) continue;

                // Convert PCM to AudioBuffer
                const pcmData = new Int16Array(audioData);
                const floatData = new Float32Array(pcmData.length);

                for (let i = 0; i < pcmData.length; i++) {
                    floatData[i] = pcmData[i] / 32768.0;
                }

                const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
                audioBuffer.getChannelData(0).set(floatData);

                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext.destination);

                const currentTime = this.audioContext.currentTime;

                // If nextStartTime is in the past (e.g. data underrun), reset it
                // Add tiny buffer (0.01s) to ensure browser can schedule it
                if (this.nextStartTime < currentTime) {
                    this.nextStartTime = currentTime + 0.01;
                }

                source.start(this.nextStartTime);

                // Advance time pointer
                this.nextStartTime += audioBuffer.duration;
            }
        } catch (e) {
            console.error('[Gemini Live] Audio playback error:', e);
        }

        this.isPlaying = false;

        // Check if more data arrived while processing (and not cancelled)
        if (this.audioQueue.length > 0 && !this.isPlaybackCancelled) {
            this.playAudioQueue();
        }
    }

    /**
     * Disconnect from Gemini Live
     */
    disconnect() {
        if (this.connectionState === 'disconnected' || this.connectionState === 'closing') {
            return;
        }

        this.connectionState = 'closing';
        this.isPlaybackCancelled = true; // Stop any in-flight audio playback
        this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
        // Cancel any pending reconnect timer
        if (this.reconnectTimerId !== null) {
            clearTimeout(this.reconnectTimerId);
            this.reconnectTimerId = null;
        }

        if (this.session) {
            try {
                this.session.close();
            } catch (e) {
                // Ignore close errors
            }
            this.session = null;
        }

        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {
                // Ignore
            }
            this.audioContext = null;
        }

        this.audioQueue = [];
        this.nextStartTime = 0;
        this.connectionState = 'disconnected';
        this.callbacks.onDisconnected?.();
    }

    /**
     * Get current connection state
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    // Utility functions
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

// Export singleton instance
export const geminiLiveService = new GeminiLiveService();
