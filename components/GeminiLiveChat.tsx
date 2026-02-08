/**
 * GeminiLiveChat Component
 * Real-time voice and video conversation with Gemini
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Volume2, VolumeX, Loader2, Sparkles, X, Minimize2, Maximize2, Settings } from 'lucide-react';
import { geminiLiveService, LiveSession } from '../services/geminiLiveService';
import { Language, getTranslation } from '../services/i18n';

import { GestureType } from '../types';

interface GeminiLiveChatProps {
    isOpen: boolean;
    onClose: () => void;
    videoRef?: React.RefObject<HTMLVideoElement>;
    onToolCall?: (name: string, args: any) => void;
    gesture?: GestureType;
    language?: Language;
    autoConnect?: boolean;
    theme?: string; // Add theme prop
}

const GeminiLiveChat: React.FC<GeminiLiveChatProps> = ({ isOpen, onClose, videoRef, onToolCall, gesture, language = 'en', autoConnect = false, theme = 'retro' }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false); // Add minimized state
    const [transcript, setTranscript] = useState<string[]>([]);
    const [currentResponse, setCurrentResponse] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Auto-connect effect
    useEffect(() => {
        if (isOpen && autoConnect && !isConnected && !isConnecting && !sessionRef.current) {
            connect();
        }
    }, [isOpen, autoConnect]);

    const sessionRef = useRef<LiveSession | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const videoIntervalRef = useRef<number | null>(null);
    
    // Use ref for onToolCall to avoid stale closure in connect callback
    const onToolCallRef = useRef(onToolCall);
    useEffect(() => { onToolCallRef.current = onToolCall; }, [onToolCall]);

    // Connect to Gemini Live
    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);

        const session = await geminiLiveService.connect({
            onConnected: () => {
                setIsConnected(true);
                setIsConnecting(false);
                setTranscript(prev => [...prev.slice(-48), getTranslation(language, 'live.connected')]);
            },
            onDisconnected: (reason) => {
                setIsConnected(false);
                setTranscript(prev => [...prev.slice(-48), `${getTranslation(language, 'app.disconnected')}${reason ? `: ${reason}` : ''}`]);
                cleanup();
            },
            onAudioReceived: () => {
                setIsThinking(false);
            },
            onTextReceived: (text) => {
                setCurrentResponse(prev => prev + text);
            },
            onError: (err) => {
                setError(err);
                setIsConnecting(false);
            },
            onInterrupted: () => {
                setCurrentResponse('');
            },
            onThinking: () => {
                setIsThinking(true);
            },
            onToolCall: (name, args) => {
                console.log('[GeminiLiveChat] Tool Call received:', name, args);
                onToolCallRef.current?.(name, args);
            }
        });

        if (session) {
            sessionRef.current = session;
            await startAudioCapture(session);
            if (isVideoEnabled) {
                startVideoCapture(session);
            }
        } else {
            setIsConnecting(false);
        }
    }, [isVideoEnabled, language]);

    // Ref to track muted state inside AudioWorklet callback (avoids stale closure)
    const isMutedRef = useRef(isMuted);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    // Start capturing audio from microphone using modern AudioWorklet API
    const startAudioCapture = async (session: LiveSession) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            mediaStreamRef.current = stream;
            const ctx = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);

            // Try AudioWorklet first (modern), fallback to ScriptProcessor (deprecated but widely supported)
            try {
                const workletCode = `
                    class PCMProcessor extends AudioWorkletProcessor {
                        process(inputs) {
                            const input = inputs[0];
                            if (input.length > 0) {
                                const channelData = input[0];
                                const pcmData = new Int16Array(channelData.length);
                                for (let i = 0; i < channelData.length; i++) {
                                    pcmData[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
                                }
                                this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
                            }
                            return true;
                        }
                    }
                    registerProcessor('pcm-processor', PCMProcessor);
                `;
                const blob = new Blob([workletCode], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                await ctx.audioWorklet.addModule(url);
                URL.revokeObjectURL(url);

                const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
                workletNode.port.onmessage = (e) => {
                    if (!isMutedRef.current && sessionRef.current?.isConnected()) {
                        session.sendAudio(e.data);
                    }
                };
                source.connect(workletNode);
                workletNode.connect(ctx.destination);
            } catch {
                // Fallback: ScriptProcessorNode for browsers without AudioWorklet support
                console.warn('[GeminiLiveChat] AudioWorklet unavailable, falling back to ScriptProcessor');
                const processor = ctx.createScriptProcessor(4096, 1, 1);
                processor.onaudioprocess = (e) => {
                    if (isMutedRef.current || !sessionRef.current?.isConnected()) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                    }
                    session.sendAudio(pcmData.buffer);
                };
                source.connect(processor);
                processor.connect(ctx.destination);
                processorRef.current = processor;
            }

        } catch (e: any) {
            setError(`${getTranslation(language, 'live.mic_error')}${e.message}`);
        }
    };

    // Start capturing video frames
    const startVideoCapture = (session: LiveSession) => {
        if (!videoRef?.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Send video frame every 1 second (as per API recommendation)
        videoIntervalRef.current = window.setInterval(() => {
            if (!videoRef.current || !ctx || !sessionRef.current?.isConnected()) return;

            canvas.width = 640;
            canvas.height = 480;
            ctx.drawImage(videoRef.current, 0, 0, 640, 480);

            const imageData = canvas.toDataURL('image/jpeg', 0.7);
            session.sendVideo(imageData);
        }, 1000);
    };

    // Cleanup resources
    const cleanup = useCallback(() => {
        if (processorRef.current) {
            try {
                processorRef.current.disconnect();
            } catch (e) { /* ignore */ }
            processorRef.current = null;
        }

        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch (e) { /* ignore */ }
            audioContextRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (videoIntervalRef.current) {
            clearInterval(videoIntervalRef.current);
            videoIntervalRef.current = null;
        }

        sessionRef.current = null;
    }, []);

    // Disconnect
    const disconnect = useCallback(() => {
        if (sessionRef.current) {
            try {
                sessionRef.current.disconnect();
            } catch (e) { /* ignore */ }
        }
        cleanup();
        setIsConnected(false);
        setIsConnecting(false);
    }, [cleanup]);

    // Send gesture updates to Gemini
    useEffect(() => {
        if (isConnected && gesture && gesture !== 'NONE' && sessionRef.current) {
            sessionRef.current.sendText(`[User performed gesture: ${gesture}]`);
            setTranscript(prev => [...prev, `${getTranslation(language, 'live.gesture_detect')}${gesture}`]);
        }
    }, [gesture, isConnected]);

    // Disconnect when component closes
    const isOpenRef = useRef(isOpen);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            disconnect();
        }
        return () => {
            disconnect();
        };
    }, [isOpen, disconnect]);

    // When response completes, add to transcript
    useEffect(() => {
        if (currentResponse && !isThinking) {
            const timer = setTimeout(() => {
                if (currentResponse.trim()) {
                    setTranscript(prev => [...prev, `${currentResponse}`]);
                    setCurrentResponse('');
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentResponse, isThinking]);

    if (!isOpen) return null;
    
    // Theme-based styles
    const getThemeStyles = () => {
        // User requested fully transparent background
        return 'bg-transparent border-none shadow-none backdrop-blur-none';
    };

    if (isMinimized) {
        return (
            <div className="absolute top-14 sm:top-24 left-2 sm:left-4 z-[40] pointer-events-auto transition-all animate-in slide-in-from-left duration-300">
                <div className={`p-3 rounded-full flex items-center gap-3 backdrop-blur-md border cursor-pointer hover:scale-105 transition-transform bg-black/20 border-white/10`}
                    onClick={() => setIsMinimized(false)}
                >
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                    <img src="/muse-logo.svg" alt="Muse" className="w-5 h-5" draggable={false} />
                    {isThinking && <Loader2 className="w-4 h-4 text-white animate-spin" />}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed md:absolute inset-2 md:inset-auto md:top-48 md:left-4 z-[40] md:w-80 flex flex-col justify-end pointer-events-none md:pb-4">  
            <div className={`backdrop-blur-md border w-full rounded-2xl shadow-2xl overflow-hidden pointer-events-auto transition-all animate-in slide-in-from-left duration-300 ${getThemeStyles()}`}>

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <img src="/muse-logo.svg" alt="Muse" className="w-5 h-5" draggable={false} />
                            {getTranslation(language, 'live.title')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => {
                                disconnect();
                                onClose();
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Transcript Area - Hidden/Simplified */}
                <div className="h-32 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-purple-900/50 scrollbar-track-transparent">
                    {/* Only show current status/response, hide full history log */}
                    {transcript.length === 0 && !currentResponse && !isThinking ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="text-xl font-bold text-white/90 mb-1 drop-shadow-md">
                                {isConnected ? getTranslation(language, 'live.hint_draw') : getTranslation(language, 'live.hint_tap')}
                            </div>
                            <div className="text-sm text-white/60 font-medium">
                                {isConnected ? getTranslation(language, 'live.hint_animate') : getTranslation(language, 'live.hint_voice')}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col justify-end min-h-full">
                            {/* Show last 2 messages only */}
                            {transcript.slice(-2).map((msg, i) => (
                                <div key={i} className="text-sm text-white/90 py-1 drop-shadow-md font-medium">
                                    {msg}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Current streaming response */}
                    {currentResponse && (
                        <div className="text-sm text-purple-200 py-1 animate-pulse font-bold drop-shadow-md">
                            {currentResponse}
                        </div>
                    )}

                    {/* Thinking indicator */}
                    {isThinking && !currentResponse && (
                        <div className="flex items-center gap-2 text-sm text-white/70 py-1 drop-shadow-md">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {getTranslation(language, 'live.thinking')}
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Controls */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center justify-center gap-4">
                        {/* Mute Button */}
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            disabled={!isConnected}
                            className={`p-4 rounded-full transition-all ${isMuted
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
                                } disabled:opacity-30`}
                        >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        {/* Settings Button (New) */}
                        <button
                            onClick={() => onToolCall?.('open_settings', {})}
                            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                            title={getTranslation(language, 'live.settings')}
                        >
                            <Settings className="w-5 h-5" />
                        </button>

                        {/* Connect/Disconnect Button */}
                        {isConnected ? (
                            <button
                                onClick={() => {
                                    disconnect();
                                    onClose();
                                }}
                                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all transform hover:scale-105"
                            >
                                <PhoneOff className="w-6 h-6" />
                            </button>
                        ) : (
                            <button
                                onClick={connect}
                                disabled={isConnecting}
                                className="p-5 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all shadow-lg shadow-green-500/30 disabled:opacity-50"
                            >
                                {isConnecting ? (
                                    <Loader2 className="w-7 h-7 animate-spin" />
                                ) : (
                                    <Phone className="w-7 h-7" />
                                )}
                            </button>
                        )}

                        {/* Video Toggle */}
                        <button
                            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                            disabled={!isConnected}
                            className={`p-4 rounded-full transition-all ${!isVideoEnabled
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
                                } disabled:opacity-30`}
                        >
                            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Status */}
                    <p className="text-center text-xs text-gray-600 mt-3 font-mono">
                        {isConnecting ? getTranslation(language, 'live.connecting') :
                            isConnected ? (isMuted ? getTranslation(language, 'live.muted') : getTranslation(language, 'live.listening')) :
                                getTranslation(language, 'live.tap_connect')}
                    </p>
                </div>

                {/* Close Button */}
                <button
                    onClick={() => {
                        disconnect();
                        onClose();
                    }}
                    className="w-full py-3 text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all border-t border-white/5"
                >
                    {getTranslation(language, 'live.close')}
                </button>
            </div>
        </div>
    );
};

export default GeminiLiveChat;
