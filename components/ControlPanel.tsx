import React, { useEffect, useRef, useState } from 'react';
import { GestureType, ThemeMode, UserTier } from '../types';
import { soundService } from '../services/soundService';
import { Mic, Sparkles, Image as ImageIcon, Music, Loader2, Heart, Flame, Activity, Copy, Eraser, Download, X, PartyPopper, Film, PlayCircle, RefreshCw, BrainCircuit, ChevronRight, Zap, Undo2, Redo2, Wand2, History, Share2, Save, Crown, Lock, ExternalLink, Box, Globe } from 'lucide-react';
import LoadingAnimation from './LoadingAnimation';
import ComputerUseHUD from './ComputerUseHUD';
import { Language, getTranslation } from '../services/i18n';

interface ControlPanelProps {
    prompt: string;
    styleModifier: string;
    gesture: GestureType;
    generatedImage: string | null;
    generatedVideo?: string | null;
    isLoading: boolean;
    feedback: string;
    isRecording: boolean;
    providerInfo?: string;
    isApiEnabled: boolean;
    onToggleApi: (enabled: boolean) => void;
    onRunDiagnostics?: () => void;
    onUpdatePrompt?: (text: string) => void;
    onCloseImage?: () => void;
    onTriggerVideo?: () => void;
    thoughtLog?: string | null;
    // NEW: Enhanced props
    streamingThought?: string;
    currentStage?: 'idle' | 'thinking' | 'researching' | 'painting' | 'directing' | 'complete';
    generationProgress?: number;
    theme: ThemeMode;
    onThemeSelect?: (theme: ThemeMode) => void;
    // History Controls
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    // Agentic Props
    researchQuery?: string | null;
    researchResults?: string[];
    // User Tier Props
    userTier?: UserTier;
    isGuest?: boolean;
    onGuestGate?: () => void;
    onUpgradeRequest?: () => void;
    onSavePrompt?: (text: string, style: string) => void;
    onOpenLibrary?: () => void;
    // Language
    language?: Language;
    // Accessibility
    accessibilityMode?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    prompt, styleModifier, gesture, generatedImage, generatedVideo, isLoading, feedback, isRecording, providerInfo,
    onRunDiagnostics, onUpdatePrompt, onCloseImage, onTriggerVideo, thoughtLog,
    streamingThought, currentStage, generationProgress,
    theme, onThemeSelect,
    onUndo, onRedo, canUndo, canRedo,
    researchQuery, researchResults,
    userTier = 'free', isGuest = false, onGuestGate,
    onUpgradeRequest, onSavePrompt, onOpenLibrary,
    language = 'en',
    accessibilityMode = false
}) => {

    const [copied, setCopied] = React.useState(false);
    const [isPromptNew, setIsPromptNew] = useState(false);
    const [comingSoonToast, setComingSoonToast] = useState<string | null>(null);
    const prevPromptRef = useRef(prompt);

    // Auto-dismiss "Coming Soon" toast after 2.5s
    useEffect(() => {
        if (comingSoonToast) {
            const t = setTimeout(() => setComingSoonToast(null), 2500);
            return () => clearTimeout(t);
        }
    }, [comingSoonToast]);

    const [displayedThought, setDisplayedThought] = useState('');
    useEffect(() => {
        if (thoughtLog) {
            setDisplayedThought('');
            let i = 0;
            const speed = 20;
            const fullText = thoughtLog;
            const interval = setInterval(() => {
                setDisplayedThought(fullText.slice(0, i + 1));
                i++;
                if (i >= fullText.length) clearInterval(interval);
            }, speed);
            return () => clearInterval(interval);
        } else {
            setDisplayedThought('');
        }
    }, [thoughtLog]);


    const [loadingProgress, setLoadingProgress] = useState(0);
    useEffect(() => {
        if (isLoading) {
            setLoadingProgress(0);
            const interval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 2;
                });
            }, 300);
            return () => clearInterval(interval);
        } else {
            setLoadingProgress(100);
        }
    }, [isLoading]);

    useEffect(() => {
        if (prompt && prompt !== prevPromptRef.current && !isRecording) {
            setIsPromptNew(true);
            soundService.playPing();
            const timer = setTimeout(() => setIsPromptNew(false), 2000);
            return () => clearTimeout(timer);
        }
        prevPromptRef.current = prompt;
    }, [prompt, isRecording]);

    const handleCopy = () => {
        soundService.playClick();
        if (prompt) {
            navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClear = () => {
        soundService.playClick();
        if (onUpdatePrompt) onUpdatePrompt('');
    };

    const handleShare = async () => {
        soundService.playClick();
        if (userTier === 'free') {
            onUpgradeRequest?.();
            return;
        }
        
        const shareText = `Check out my AI creation made with Muse! #MuseAI #Gemini3 #AIArt`;
        
        // Try native Web Share API first
        if (navigator.share) {
            try {
                const shareData: ShareData = { title: 'Muse Creation', text: shareText };
                
                if (generatedImage && !generatedVideo) {
                    const response = await fetch(generatedImage);
                    const blob = await response.blob();
                    const file = new File([blob], 'muse-creation.png', { type: 'image/png' });
                    shareData.files = [file];
                }
                
                await navigator.share(shareData);
            } catch (err) {
                // User cancelled or sharing failed, fallback to clipboard
                await navigator.clipboard.writeText(shareText);
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareText);
        }
    };

    const handleSavePrompt = () => {
        soundService.playClick();
        if (isGuest) {
            onGuestGate?.();
            return;
        }
        if (onSavePrompt && prompt) {
            onSavePrompt(prompt, styleModifier);
        }
    };

    const themeOptions: { key: ThemeMode; label: string; color: string; glow: string }[] = [
        { key: 'cyberpunk', label: 'Cyber', color: '#3b82f6', glow: '0 0 12px rgba(59,130,246,0.6)' },
        { key: 'zen', label: 'Zen', color: '#94a3b8', glow: '0 0 12px rgba(148,163,184,0.6)' },
        { key: 'retro', label: 'Retro', color: '#ff9e64', glow: '0 0 12px rgba(255,158,100,0.6)' },
        { key: 'alchemist', label: 'Magic', color: '#f59e0b', glow: '0 0 12px rgba(245,158,11,0.6)' },
        { key: 'comic', label: 'Comic', color: '#ec4899', glow: '0 0 12px rgba(236,72,153,0.6)' },
        { key: 'game', label: 'Game', color: '#ef4444', glow: '0 0 12px rgba(239,68,68,0.6)' }
    ];

    const currentTheme = themeOptions.find((t) => t.key === theme) || themeOptions[0];

    // Theme switching handled via Settings modal

    const handleDownload = () => {
        const quality = userTier === 'pro' ? '4K' : 'HD';
        if (generatedVideo) {
            const link = document.createElement('a');
            link.href = generatedVideo;
            link.download = `muse-${quality}-${Date.now()}.mp4`;
            link.click();
        } else if (generatedImage) {
            const link = document.createElement('a');
            link.href = generatedImage;
            link.download = `muse-${quality}-${Date.now()}.png`;
            link.click();
        }
    };

    return (
        <>
            <div className="flex flex-col h-full gap-1.5 sm:gap-2 lg:gap-3 font-sans">

      {/* 1. COMPACT STATUS CARD */}
      <div className={`
          border border-[var(--border-color)] rounded-xl sm:rounded-2xl lg:rounded-3xl p-2 sm:p-3 lg:p-5 relative transition-all duration-300
          flex flex-col justify-center shrink-0 backdrop-blur-md z-10
          ${isLoading ? 'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : ''}
          ${currentStage === 'thinking' ? 'border-purple-500/30' : ''}
          ${currentStage === 'researching' ? 'border-indigo-500/30' : ''}
          ${currentStage === 'painting' ? 'border-cyan-500/30' : ''}
          ${currentStage === 'directing' ? 'border-pink-500/30' : ''}
      `} style={{ background: 'var(--glass-gradient)' }}>
                    <div className="flex flex-col gap-1 sm:gap-2 lg:gap-3">
                        {/* Status Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* Neural Link Indicator */}
                                <div className="relative flex items-center justify-center w-6 h-6">
                                    {isLoading ? (
                                        <>
                                            {/* Breathing Aura */}
                                            <div className={`absolute inset-0 rounded-full opacity-40 animate-ping duration-1000 ${
                                                currentStage === 'thinking' ? 'bg-purple-500' :
                                                currentStage === 'researching' ? 'bg-indigo-500' :
                                                currentStage === 'painting' ? 'bg-cyan-500' :
                                                'bg-pink-500'
                                            }`}></div>
                                            {/* Core */}
                                            <div className={`relative w-3 h-3 rounded-full shadow-[0_0_15px_currentColor] animate-pulse duration-[2000ms] ${
                                                currentStage === 'thinking' ? 'bg-purple-400 shadow-purple-500' :
                                                currentStage === 'researching' ? 'bg-indigo-400 shadow-indigo-500' :
                                                currentStage === 'painting' ? 'bg-cyan-400 shadow-cyan-500' :
                                                'bg-pink-400 shadow-pink-500'
                                            }`}></div>
                                        </>
                                    ) : (
                                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                                            isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]' : 
                                            'bg-green-500 shadow-[0_0_8px_#22c55e]'
                                        }`}></div>
                                    )}
                                </div>

                                <span role="status" aria-live="assertive" className={`text-sm sm:text-base lg:text-xl font-bold uppercase tracking-wider ${isLoading ? 'animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400' : 'text-[var(--text-primary)]'}`}>
                                    {currentStage === 'thinking' ? getTranslation(language as Language, 'status.thinking') :
                                        currentStage === 'researching' ? getTranslation(language as Language, 'status.researching') :
                                            currentStage === 'painting' ? getTranslation(language as Language, 'status.painting') :
                                                currentStage === 'directing' ? getTranslation(language as Language, 'status.directing') :
                                                    isRecording ? getTranslation(language as Language, 'status.listening') : getTranslation(language as Language, 'status.ready')}
                                </span>

                                {/* Visual Audio Level Indicator - for deaf users to verify mic is active */}
                                {isRecording && !isLoading && (
                                    <div className="flex items-center gap-[2px] h-4 ml-2" aria-label="Microphone active" role="img">
                                        {[8, 12, 14, 10, 16].map((h, i) => (
                                            <div key={i} className="w-[3px] bg-red-500 rounded-full animate-pulse" 
                                                style={{ 
                                                    height: `${h}px`,
                                                    animationDelay: `${i * 0.1}s`,
                                                    animationDuration: `${0.3 + i * 0.1}s`
                                                }} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Progress indicator */}
                            {isLoading && generationProgress !== undefined && (
                                <span className="font-mono text-sm text-blue-400" role="progressbar" aria-valuenow={Math.round(generationProgress)} aria-valuemin={0} aria-valuemax={100}>
                                    {Math.round(generationProgress)}%
                                </span>
                            )}
                        </div>

                        {/* Feedback Row - aria-live for screen readers */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[var(--accent-primary)] font-mono text-xs sm:text-sm lg:text-lg" role="status" aria-live="polite">
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 opacity-50 flex-shrink-0" />
                            <span className="truncate">{feedback}</span>
                        </div>

                        {/* Theme indicator only - switching via Settings */}
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] font-mono uppercase tracking-[0.2em]">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.color }}></div>
                            <span>{currentTheme.label}</span>
                        </div>

                        {/* Progress bar - only show when loading */}
                        {isLoading && generationProgress !== undefined && (
                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden mt-2">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${currentStage === 'thinking' ? 'bg-gradient-to-r from-purple-600 to-pink-500' :
                                        currentStage === 'painting' ? 'bg-gradient-to-r from-cyan-600 to-blue-500' :
                                            'bg-gradient-to-r from-pink-600 to-purple-500'
                                        }`}
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. MEDIA DISPLAY (Large Card) - Enhanced for responsive flex */}
                <div className={`
        image-display-container
        flex-1 rounded-xl sm:rounded-2xl lg:rounded-3xl border border-[var(--border-color)] relative overflow-hidden flex items-center justify-center backdrop-blur-md
        ${generatedImage ? 'shadow-2xl shadow-[var(--accent-primary)]/10' : ''}
        min-h-0 transition-all duration-300
      `} style={{ background: 'var(--glass-gradient)' }}>

                    {currentStage === 'researching' ? (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <ComputerUseHUD
                                query={researchQuery || ''}
                                results={researchResults || []}
                                isVisible={true}
                                language={language}
                            />
                        </div>
                    ) : isLoading ? (
                        <LoadingAnimation
                            stage={
                                currentStage === 'thinking' ? 'thinking' :
                                    currentStage === 'painting' ? 'painting' :
                                        currentStage === 'directing' ? 'directing' : 'idle'
                            }
                            progress={generationProgress}
                            message={feedback}
                        />
                    ) : generatedVideo ? (
                        <div className="relative w-full h-full group bg-black">
                            <video src={generatedVideo} controls autoPlay muted loop playsInline className="w-full h-full object-contain" />

                            {/* Overlay Controls */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={handleDownload} className="p-3 bg-black/60 backdrop-blur rounded-xl text-white hover:bg-white hover:text-black transition-colors relative flex items-center gap-1" title={getTranslation(language as Language, 'action.download')} aria-label={getTranslation(language as Language, 'action.download')}>
                                    <Download className="w-4 h-4" />
                                    {userTier === 'pro' && <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-amber-500 text-black px-1 rounded">4K</span>}
                                </button>
                                {/* Social Share Buttons for Video */}
                                <button 
                                    onClick={() => {
                                        soundService.playClick();
                                        if (userTier === 'free') {
                                            onUpgradeRequest?.();
                                        } else {
                                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my AI video created with Muse! #Gemini3 #AIArt`)}`, '_blank');
                                        }
                                    }}
                                    className="p-3 bg-black/60 backdrop-blur rounded-xl text-white hover:bg-[#1DA1F2] hover:text-white transition-colors relative group/btn"
                                    title={userTier === 'free' ? getTranslation(language as Language, 'action.upgrade_save') : getTranslation(language as Language, 'share.x')}
                                    aria-label={userTier === 'free' ? getTranslation(language as Language, 'action.upgrade_save') : getTranslation(language as Language, 'share.x')}
                                >
                                    <Share2 className="w-4 h-4" />
                                    {userTier === 'free' && <Lock className="w-3 h-3 absolute top-0 right-0 text-amber-500" />}
                                </button>
                                <button 
                                    onClick={() => {
                                        soundService.playClick();
                                        if (userTier === 'free') {
                                            onUpgradeRequest?.();
                                        } else {
                                            window.open('https://studio.youtube.com', '_blank');
                                        }
                                    }}
                                    className="p-3 bg-black/60 backdrop-blur rounded-xl text-white hover:bg-[#FF0000] hover:text-white transition-colors relative group/btn"
                                    title={userTier === 'free' ? getTranslation(language as Language, 'action.upgrade_save') : getTranslation(language as Language, 'share.youtube')}
                                    aria-label={userTier === 'free' ? getTranslation(language as Language, 'action.upgrade_save') : getTranslation(language as Language, 'share.youtube')}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    {userTier === 'free' && <Lock className="w-3 h-3 absolute top-0 right-0 text-amber-500" />}
                                </button>
                            </div>
                        </div>
                    ) : generatedImage ? (
                        <div className="relative w-full h-full group">
                            <img src={generatedImage} className="w-full h-full object-contain" alt="Generated" />

                            {/* History indicator (always visible in corner) */}
                            {(canUndo || canRedo) && (
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <button
                                        onClick={onUndo}
                                        disabled={!canUndo}
                                        className="p-2 bg-black/60 backdrop-blur rounded-lg text-white hover:bg-white hover:text-black transition-colors disabled:opacity-30 flex items-center gap-2"
                                        title={getTranslation(language as Language, 'action.undo')}
                                        aria-label={getTranslation(language as Language, 'action.undo')}
                                    >
                                        <Undo2 className="w-4 h-4" />
                                        {accessibilityMode && <span className="text-xs font-bold">{getTranslation(language as Language, 'action.undo')}</span>}
                                    </button>
                                    <button
                                        onClick={onRedo}
                                        disabled={!canRedo}
                                        className="p-2 bg-black/60 backdrop-blur rounded-lg text-white hover:bg-white hover:text-black transition-colors disabled:opacity-30 flex items-center gap-2"
                                        title={getTranslation(language as Language, 'action.redo')}
                                        aria-label={getTranslation(language as Language, 'action.redo')}
                                    >
                                        <Redo2 className="w-4 h-4" />
                                        {accessibilityMode && <span className="text-xs font-bold">{getTranslation(language as Language, 'action.redo')}</span>}
                                    </button>
                                </div>
                            )}

                            {/* Action buttons on hover */}
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-4">
                                {/* Main Action Row */}
                                <div className="flex justify-center gap-3">
                                    <button onClick={() => { if (isGuest) { onGuestGate?.(); return; } onTriggerVideo?.(); }} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg shadow-purple-500/30 relative">
                                        <Film className="w-5 h-5" />
                                        <span>{getTranslation(language as Language, 'action.animate')}</span>
                                        {isGuest && <Lock className="w-3 h-3 ml-1 text-amber-300" />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            soundService.playClick();
                                            // Prepend "refine:" to existing prompt to signal edit mode
                                            onUpdatePrompt && onUpdatePrompt(`Refine: ${prompt}`);
                                        }}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg shadow-cyan-500/30"
                                    >
                                        <Wand2 className="w-5 h-5" />
                                        <span>{getTranslation(language as Language, 'action.edit')}</span>
                                    </button>
                                    <button onClick={handleDownload} className={`bg-white/10 hover:bg-white hover:text-black text-white p-3 rounded-xl backdrop-blur-md transition-all relative flex items-center gap-2`} title={getTranslation(language as Language, 'action.download')} aria-label={getTranslation(language as Language, 'action.download')}>
                                        <Download className="w-4 h-4" />
                                        {accessibilityMode && <span className="text-xs font-bold">{getTranslation(language as Language, 'action.download')}</span>}
                                        {userTier === 'pro' && <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-amber-500 text-black px-1 rounded">4K</span>}
                                    </button>
                                    
                                    {/* Social Share Buttons */}
                                    <button 
                                        onClick={() => {
                                            soundService.playClick();
                                            if (userTier === 'free') {
                                                onUpgradeRequest?.();
                                            } else {
                                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my AI masterpiece created with Muse! #Gemini3 #AIArt`)}`, '_blank');
                                            }
                                        }}
                                        className={`bg-white/10 hover:bg-[#1DA1F2] hover:text-white text-white p-3 rounded-xl backdrop-blur-md transition-all relative flex items-center gap-2`}
                                        title={userTier === 'free' ? getTranslation(language as Language, 'action.upgrade_save') : getTranslation(language as Language, 'share.x')}
                                        aria-label={userTier === 'free' ? getTranslation(language as Language, 'action.upgrade_save') : getTranslation(language as Language, 'share.x')}
                                    >
                                        <Share2 className="w-4 h-4" />
                                        {accessibilityMode && <span className="text-xs font-bold">{getTranslation(language as Language, 'share.x')}</span>}
                                        {userTier === 'free' && <Lock className="w-3 h-3 absolute top-0 right-0 text-amber-500" />}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            soundService.playClick();
                                            if (userTier === 'free') {
                                                onUpgradeRequest?.();
                                            } else {
                                                window.open('https://studio.youtube.com', '_blank');
                                            }
                                        }}
                                        className={`bg-white/10 hover:bg-[#FF0000] hover:text-white text-white p-3 rounded-xl backdrop-blur-md transition-all relative flex items-center gap-2`}
                                        title={userTier === 'free' ? getTranslation(language as Language, 'action.upgrade_save') : getTranslation(language as Language, 'share.youtube')}
                                        aria-label={userTier === 'free' ? getTranslation(language as Language, 'action.upgrade_save') : getTranslation(language as Language, 'share.youtube')}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        {accessibilityMode && <span className="text-xs font-bold">{getTranslation(language as Language, 'share.youtube')}</span>}
                                        {userTier === 'free' && <Lock className="w-3 h-3 absolute top-0 right-0 text-amber-500" />}
                                    </button>
                                </div>

                                {/* Prompt preview */}
                                {prompt && (
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 italic truncate max-w-md mx-auto">
                                            "{prompt}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ENHANCED EMPTY/READY STATE */
                        <>
                            {prompt ? (
                                <div className="flex flex-col items-center justify-center h-full p-6 gap-6">
                                    <div className="w-full max-w-md space-y-4">
                                        {/* Artistic Prompt Display */}
                                        <div className="relative bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-pink-900/20 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                                            <div className="absolute top-3 right-3">
                                                <img src="/muse-logo.svg" alt="" className="w-4 h-4 animate-pulse" draggable={false} />
                                            </div>
                                            <p className="text-xs font-mono text-blue-400/70 uppercase tracking-[0.2em] mb-3">
                                                ✨ {getTranslation(language as Language, 'prompt.inspiration')}
                                            </p>
                                            <p className="text-xl font-medium text-white leading-relaxed italic">
                                                "{prompt}"
                                            </p>
                                            {styleModifier && (
                                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">{getTranslation(language as Language, 'style.label')}</span>
                                                    <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300 font-medium">
                                                        {styleModifier}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Hint */}
                                        <div className="text-center">
                                            <p className="text-sm text-gray-500">
                                                {getTranslation(language as Language, 'prompt.hint')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ENHANCED IDLE STATE - ARTISTIC FULL BLEED */
                                <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden group">
                                    {/* Layer 1: Theme-specific artistic background image */}
                                    <div className="absolute inset-0 z-0">
                                        <div 
                                            className="w-full h-full bg-cover bg-center transition-all duration-1000 group-hover:scale-105"
                                            style={{ 
                                                backgroundImage: 'var(--theme-idle-image)',
                                                opacity: 0.7,
                                                filter: 'saturate(1.3) contrast(1.05)'
                                            }}
                                        />
                                    </div>

                                    {/* Layer 2: Artistic color overlay with theme accent blending */}
                                    <div className="absolute inset-0 z-[1] mix-blend-overlay opacity-40"
                                        style={{
                                            background: `
                                                radial-gradient(ellipse at 25% 25%, var(--accent-primary) 0%, transparent 55%),
                                                radial-gradient(ellipse at 75% 75%, var(--accent-secondary) 0%, transparent 55%),
                                                radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)
                                            `
                                        }}
                                    />

                                    {/* Layer 3: Depth gradient for readability */}
                                    <div className="absolute inset-0 z-[2]"
                                        style={{
                                            background: `
                                                linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 40%, transparent 65%),
                                                linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%),
                                                radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.25) 100%)
                                            `
                                        }}
                                    />

                                    {/* Layer 4: Animated accent shimmer */}
                                    <div className="absolute inset-0 z-[3] opacity-20 group-hover:opacity-35 transition-opacity duration-700"
                                        style={{
                                            background: `
                                                conic-gradient(from 0deg at 30% 40%, transparent 0deg, var(--accent-primary) 30deg, transparent 60deg),
                                                conic-gradient(from 180deg at 70% 60%, transparent 0deg, var(--accent-secondary) 30deg, transparent 60deg)
                                            `,
                                            filter: 'blur(60px)',
                                            animation: 'muse-idle-rotate 20s linear infinite'
                                        }}
                                    />

                                    {/* Central Visual */}
                                    <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 lg:gap-5">
                                        <div className="relative cursor-pointer transition-transform duration-500 hover:scale-110">
                                            {/* Outer decorative rings - hidden on small screens */}
                                            <div className="hidden lg:block absolute inset-[-8px] rounded-full animate-spin" 
                                                style={{ 
                                                    animationDuration: '12s',
                                                    border: '1px solid var(--accent-primary)',
                                                    opacity: 0.25 
                                                }} 
                                            />
                                            <div className="hidden lg:block absolute inset-[-18px] rounded-full animate-spin" 
                                                style={{ 
                                                    animationDuration: '18s', 
                                                    animationDirection: 'reverse',
                                                    border: '1px dashed var(--accent-secondary)',
                                                    opacity: 0.15 
                                                }} 
                                            />
                                            <div className="hidden lg:block absolute inset-[-28px] rounded-full opacity-10"
                                                style={{
                                                    border: '1px solid var(--accent-primary)',
                                                    animation: 'pulse 3s ease-in-out infinite'
                                                }}
                                            />

                                            {/* Muse Logo */}
                                            <div className="relative w-10 h-10 sm:w-14 sm:h-14 lg:w-20 lg:h-20 rounded-full overflow-hidden transition-shadow duration-500"
                                                style={{
                                                    boxShadow: `0 0 30px color-mix(in srgb, var(--accent-primary) 20%, transparent), 
                                                                 0 0 60px color-mix(in srgb, var(--accent-secondary) 10%, transparent)`
                                                }}
                                            >
                                                <img src="/muse-logo.svg" alt="Muse" className="w-full h-full" draggable={false} />
                                            </div>
                                        </div>

                                        <div className="text-center space-y-0.5 sm:space-y-1 lg:space-y-2">
                                            <h3 className="text-base sm:text-lg lg:text-2xl font-bold tracking-wide"
                                                style={{
                                                    background: `linear-gradient(135deg, #ffffff, color-mix(in srgb, var(--accent-primary) 60%, white), rgba(255,255,255,0.6))`,
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    textShadow: 'none'
                                                }}
                                            >
                                                {getTranslation(language as Language, 'app.ready')}
                                            </h3>
                                            <p className="text-[10px] sm:text-xs lg:text-sm max-w-xs mx-auto leading-relaxed opacity-70 hidden sm:block" 
                                               style={{ color: 'rgba(255,255,255,0.7)' }}>
                                                {getTranslation(language as Language, 'prompt.placeholder')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 3. PROMPT INPUT — unified card with toolbar */}
                <div className="shrink-0 border border-[var(--border-color)] rounded-xl backdrop-blur-md transition-all duration-300"
                    style={{ background: 'var(--glass-gradient)' }}>
                    <textarea
                        value={prompt}
                        onChange={(e) => onUpdatePrompt && onUpdatePrompt(e.target.value)}
                        placeholder={getTranslation(language as Language, 'prompt.placeholder')}
                        data-testid="prompt-input"
                        className={`
                            w-full bg-transparent px-3.5 lg:px-5 pt-2.5 pb-1.5 lg:pt-3 lg:pb-2
                            font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60
                            focus:outline-none transition-all duration-300 resize-none h-[40px] lg:h-[52px] overflow-hidden rounded-t-xl
                            ${isPromptNew ? 'shadow-[inset_0_0_20px_rgba(234,179,8,0.08)]' : ''}
                        `}
                    />
                    {/* Toolbar — single row, icons only on narrow screens */}
                    <div className="flex items-center gap-0.5 px-1.5 pb-1.5 lg:px-2 lg:pb-2">
                        {/* Undo / Redo */}
                        {(onUndo && onRedo) && (
                            <>
                                <button onClick={onUndo} disabled={!canUndo} data-testid="prompt-undo"
                                    className="prompt-tool-btn disabled:opacity-25"
                                    title={getTranslation(language as Language, 'action.undo')} aria-label={getTranslation(language as Language, 'action.undo')}>
                                    <Undo2 className="w-3 h-3" />
                                    <span className="hidden xl:inline">{getTranslation(language as Language, 'action.undo')}</span>
                                </button>
                                <button onClick={onRedo} disabled={!canRedo} data-testid="prompt-redo"
                                    className="prompt-tool-btn disabled:opacity-25"
                                    title={getTranslation(language as Language, 'action.redo')} aria-label={getTranslation(language as Language, 'action.redo')}>
                                    <Redo2 className="w-3 h-3" />
                                    <span className="hidden xl:inline">{getTranslation(language as Language, 'action.redo')}</span>
                                </button>
                                <div className="w-px h-3.5 bg-[var(--border-color)] mx-0.5 shrink-0 opacity-40" />
                            </>
                        )}
                        {/* Copy */}
                        <button onClick={handleCopy} data-testid="prompt-copy" className="prompt-tool-btn"
                            title={getTranslation(language as Language, 'action.copy')} aria-label={getTranslation(language as Language, 'action.copy')}>
                            <Copy className="w-3 h-3" />
                            <span className="hidden xl:inline">{getTranslation(language as Language, 'action.copy')}</span>
                        </button>
                        {/* Save */}
                        <button onClick={handleSavePrompt} data-testid="prompt-save" className="prompt-tool-btn relative"
                            title={isGuest ? getTranslation(language as Language, 'control.upgrade_save') : getTranslation(language as Language, 'action.save_prompt')}
                            aria-label={isGuest ? getTranslation(language as Language, 'control.upgrade_save') : getTranslation(language as Language, 'action.save_prompt')}>
                            <Save className="w-3 h-3" />
                            <span className="hidden xl:inline">{getTranslation(language as Language, 'action.save_prompt')}</span>
                            {isGuest && <Lock className="w-2 h-2 absolute -top-0.5 -right-0.5 text-amber-500" />}
                        </button>
                        {/* Clear — right after Save */}
                        <button onClick={handleClear} data-testid="prompt-clear"
                            className="prompt-tool-btn hover:!text-red-400 hover:!bg-red-500/10"
                            title={getTranslation(language as Language, 'action.clear')} aria-label={getTranslation(language as Language, 'action.clear')}>
                            <Eraser className="w-3 h-3" />
                            <span className="hidden xl:inline">{getTranslation(language as Language, 'action.clear')}</span>
                        </button>
                        <div className="w-px h-3.5 bg-[var(--border-color)] mx-0.5 shrink-0 opacity-40" />
                        {/* Library */}
                        <button onClick={() => { 
                            soundService.playClick(); 
                            if (isGuest) { onGuestGate?.(); return; }
                            onOpenLibrary?.();
                        }} data-testid="prompt-library" className="prompt-tool-btn relative"
                            title={isGuest ? getTranslation(language as Language, 'control.upgrade_library') : getTranslation(language as Language, 'action.library')} 
                            aria-label={isGuest ? getTranslation(language as Language, 'control.upgrade_library') : getTranslation(language as Language, 'action.library')}>
                            <img src="/muse-logo.svg" alt="" className="w-3 h-3" draggable={false} />
                            <span className="hidden xl:inline">{getTranslation(language as Language, 'action.library')}</span>
                            {isGuest && <Lock className="w-2 h-2 absolute -top-0.5 -right-0.5 text-amber-500" />}
                        </button>
                        {/* 3D Model - Pro / Coming Soon */}
                        <button onClick={() => { soundService.playClick(); if (userTier !== 'pro') { onUpgradeRequest?.(); } else { setComingSoonToast(getTranslation(language as Language, 'sub.feature.3d')); } }} className="prompt-tool-btn relative">
                            <Box className="w-3 h-3" />
                            <span>3D</span>
                            <span className="text-[7px] px-0.5 py-px rounded bg-amber-500/20 text-amber-400 font-bold leading-none">NEW</span>
                            {userTier === 'free' && <Lock className="w-2 h-2 absolute -top-0.5 -right-0.5 text-amber-500" />}
                        </button>
                        {/* Genie 3 - Pro / Coming Soon */}
                        <button onClick={() => { soundService.playClick(); if (userTier !== 'pro') { onUpgradeRequest?.(); } else { setComingSoonToast(getTranslation(language as Language, 'sub.feature.genie')); } }} className="prompt-tool-btn relative">
                            <Globe className="w-3 h-3" />
                            <span>Genie</span>
                            <span className="text-[7px] px-0.5 py-px rounded bg-amber-500/20 text-amber-400 font-bold leading-none">NEW</span>
                            {userTier === 'free' && <Lock className="w-2 h-2 absolute -top-0.5 -right-0.5 text-amber-500" />}
                        </button>
                    </div>
                    {/* Coming Soon Toast */}
                    {comingSoonToast && (
                        <div className="flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 border-t border-amber-500/20 animate-in fade-in duration-200">
                            <Sparkles className="w-3 h-3" />
                            <span>{comingSoonToast} — {getTranslation(language as Language, 'sub.feature.coming_soon')}</span>
                        </div>
                    )}
                </div>

            </div >

            {/* --- MOBILE FULLSCREEN OVERLAY FOR RESULT --- */}
            {
                (generatedImage || generatedVideo || (isLoading && window.innerWidth < 768)) && (
                    <div className="md:hidden fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300">

                        {/* Header */}
                        <div className="flex justify-between items-center p-6 bg-black/80 backdrop-blur z-10 border-b border-gray-800">
                            <div className="flex items-center gap-3">
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : generatedVideo ? <Film className="w-6 h-6 text-purple-500" /> : <img src="/muse-logo.svg" alt="Muse" className="w-6 h-6" draggable={false} />}
                                <span className="text-lg font-bold tracking-widest text-white">
                                    {isLoading ? getTranslation(language as Language, 'control.generating') : getTranslation(language as Language, 'control.result')}
                                </span>
                            </div>
                            {!isLoading && (
                                <button onClick={onCloseImage} className="p-2 bg-gray-900 rounded-full text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 relative flex items-center justify-center p-4 bg-black">
                            {isLoading ? (
                                <LoadingAnimation
                                    stage={
                                        currentStage === 'thinking' ? 'thinking' :
                                            currentStage === 'painting' ? 'painting' :
                                                currentStage === 'directing' ? 'directing' : 'idle'
                                    }
                                    progress={generationProgress}
                                    message={feedback}
                                />
                            ) : generatedVideo ? (
                                <video src={generatedVideo} controls autoPlay muted loop playsInline className="max-w-full max-h-full object-contain rounded-lg" />
                            ) : (
                                <img src={generatedImage!} className="max-w-full max-h-full object-contain rounded-lg" alt="Result" />
                            )}
                        </div>

                        {/* Footer Actions */}
                        {!isLoading && (
                            <div className="p-6 bg-black flex gap-3 border-t border-white/10">
                                {generatedImage && !generatedVideo && (
                                    <button onClick={() => { if (isGuest) { onGuestGate?.(); return; } onTriggerVideo?.(); }} className="flex-1 bg-purple-600 text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2">
                                        <Film className="w-5 h-5" />
                                        {getTranslation(language as Language, 'mobile.animate')}
                                        {isGuest && <Lock className="w-4 h-4 ml-1 text-amber-300" />}
                                    </button>
                                )}
                                <button onClick={handleDownload} className="flex-1 bg-white/10 text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2">
                                    <Download className="w-5 h-5" /> {getTranslation(language as Language, 'mobile.save')}
                                    {userTier === 'pro' && <span className="text-[10px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded ml-1">4K</span>}
                                </button>
                            </div>
                        )}
                    </div>
                )
            }
        </>
    );
};

export default React.memo(ControlPanel);
