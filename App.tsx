
import React, { useState, useRef, useCallback, useEffect, Suspense, lazy } from 'react';
import MagicCanvas from './components/MagicCanvas';
import ControlPanel from './components/ControlPanel';
import GestureGrid from './components/GestureGrid';
import LoginScreen from './components/LoginScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-load modal components to improve initial load performance
const HelpModal = lazy(() => import('./components/HelpModal'));
const UserManagementModal = lazy(() => import('./components/UserManagementModal'));
const HistoryModal = lazy(() => import('./components/HistoryModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const GeminiLiveChat = lazy(() => import('./components/GeminiLiveChat'));
const ReasoningCore = lazy(() => import('./components/ReasoningCore'));
const SubscriptionModal = lazy(() => import('./components/SubscriptionModal'));
const PromptLibraryModal = lazy(() => import('./components/PromptLibraryModal'));
const OnboardingOverlay = lazy(() => import('./components/OnboardingOverlay'));
import { GestureType, FaceData, ThemeMode, UserTier, SavedPrompt } from './types';
import { useSpeechToText } from './hooks/useSpeechToText';
import { useGeminiStudio } from './hooks/useGeminiStudio';
import { subscribeToAuthChanges, signOutUser, checkRedirectResult } from './services/firebaseService';
import { soundService } from './services/soundService';
import { a11yService } from './services/accessibilityService';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { HelpCircle, User, ScanFace, Database, Camera, CameraOff, LogOut, LogIn, Undo2, Redo2, History, Phone, Share2, Settings, Sparkles, Crown, X } from 'lucide-react';
import { Language, getTranslation } from './services/i18n';


const App: React.FC = () => {
    // --- Auth State ---
    const [username, setUsername] = useState<string | null>(null);
    const [userTier, setUserTier] = useState<UserTier>('free');
    const [language, setLanguage] = useState<Language>('en');
    // 'feature' = guest tried a restricted feature, 'trial' = 3/3 used up, false = hidden
    const [loginPromptReason, setLoginPromptReason] = useState<false | 'feature' | 'trial'>(false);
    const [blockGuestLogin, setBlockGuestLogin] = useState(false);
    const [authError, setAuthError] = useState<{ message: string, code?: string } | null>(null);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isDbOpen, setIsDbOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
    const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
    const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
    const [liveChatAutoConnect, setLiveChatAutoConnect] = useState(false);
    const [currentFaceData, setCurrentFaceData] = useState<FaceData | null>(null);

    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(false);
    const hasOnboardedRef = useRef(false);

    // --- Championship Settings (Persona & Memory) ---
    const [customInstructions, setCustomInstructions] = useState<string>(getTranslation('en', 'settings.custom.default'));
    const [enableMemory, setEnableMemory] = useState<boolean>(false);

    // --- Accessibility Mode ---
    const [accessibilityMode, setAccessibilityMode] = useState<boolean>(() => {
        try { const v = localStorage.getItem('muse-accessibility-mode'); return v === null ? true : v === 'true'; } catch { return true; }
    });
    const handleAccessibilityModeChange = useCallback((enabled: boolean) => {
        setAccessibilityMode(enabled);
        try { localStorage.setItem('muse-accessibility-mode', enabled ? 'true' : 'false'); } catch {}
    }, []);

    // --- Guest Detection ---
    // Guest users have restricted features compared to authenticated free users
    const GUEST_NAMES = React.useMemo(() => [
        'Guest', 'GUEST OPERATOR', '访客', 'OPERADOR INVITADO',
        'ゲストオペレーター', '게스트 운영자', 'OPÉRATEUR INVITÉ', 'GAST-OPERATOR'
    ], []);
    const isGuest = React.useMemo(() => {
        if (!username) return false;
        return GUEST_NAMES.includes(username) || username === getTranslation(language, 'user.guest');
    }, [username, language, GUEST_NAMES]);
    const GUEST_DAILY_LIMIT = 10;

    const guestGate = useCallback((action: () => void) => {
        if (isGuest) { setLoginPromptReason('feature'); return; }
        action();
    }, [isGuest]);

    // Guest users must log in before subscribing
    const handleSubscribe = useCallback(() => {
        if (isGuest) {
            setBlockGuestLogin(true);
            setLoginPromptReason('feature');
            return;
        }
        setIsSubscriptionOpen(true);
    }, [isGuest]);

    // Saved Prompts State — per-user, persisted in localStorage
    const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);

    const [cameraError, setCameraError] = useState<string | null>(null);

    // Camera Control State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [theme, setTheme] = useState<ThemeMode>('retro');
    const [themeTransition, setThemeTransition] = useState(false);
    const [ambientLight, setAmbientLight] = useState(1);
    const [trackingStats, setTrackingStats] = useState({ hand: 0, face: 0 });
    const [retroDial, setRetroDial] = useState(0);
    const [breathLevel, setBreathLevel] = useState(0.5);
    const [zenAccent, setZenAccent] = useState('#93c5fd');
    const lastThemeSwitchRef = useRef(0);
    const lastVoiceCommandRef = useRef(0);
    const breathBaselineRef = useRef<number | null>(null);
    const lastBreathUpdateRef = useRef(0);

    // --- Core Logic Hooks ---
    const {
        prompt,
        styleModifier,
        generatedImage,
        generatedVideo,
        isLoading,
        feedbackMessage,
        providerInfo,
        thoughtLog,
        uiMode,
        streamingThought,
        generationProgress,
        currentStage,
        updatePrompt,
        setFeedback,
        triggerInspiration,
        triggerImageGeneration,
        triggerVideoGeneration,
        setStyle,
        closeImage,
        runDiagnostics,
        // NEW: Agentic & History props
        researchQuery,
        researchResults,
        goBackInHistory,
        goForwardInHistory,
        historyIndex,
        historyLength,
        // NEW: For history modal
        getHistoryList,
        goToHistoryIndex,
        clearHistory,
        triggerSocialShare,
        socialCopy,
        isSharing
    } = useGeminiStudio({ enableMemory, customInstructions, isGuest });

    // Load per-user prompt library when user changes
    useEffect(() => {
        if (!username) { setSavedPrompts([]); return; }
        const uid = currentUidRef.current || 'guest';
        try {
            const stored = localStorage.getItem(`muse-prompts-${uid}`);
            if (stored) {
                setSavedPrompts(JSON.parse(stored));
            } else {
                setSavedPrompts([]);
            }
        } catch { setSavedPrompts([]); }
    }, [username]);

    // Persist prompt library helper
    const persistPrompts = useCallback((prompts: SavedPrompt[]) => {
        const uid = currentUidRef.current || 'guest';
        try {
            localStorage.setItem(`muse-prompts-${uid}`, JSON.stringify(prompts));
        } catch { /* ignore */ }
    }, []);

    // Saved Prompts Handlers (must be after useGeminiStudio which provides setFeedback)
    const handleSavePrompt = useCallback((text: string, style: string) => {
        if (isGuest) { setLoginPromptReason('feature'); return; }
        const newPrompt: SavedPrompt = {
            id: Date.now().toString(),
            text,
            style,
            timestamp: Date.now()
        };
        setSavedPrompts(prev => {
            const updated = [newPrompt, ...prev];
            persistPrompts(updated);
            return updated;
        });
        setFeedback(getTranslation(language, 'app.prompt_saved'));
        soundService.playSuccess();
    }, [isGuest, setFeedback, persistPrompts, language]);

    const handleDeletePrompt = useCallback((id: string) => {
        setSavedPrompts(prev => {
            const updated = prev.filter(p => p.id !== id);
            persistPrompts(updated);
            return updated;
        });
        soundService.playClick();
    }, [persistPrompts]);

    // --- Free Tier Generation Limits (per-user, persisted in localStorage) ---
    const FREE_DAILY_LIMIT = isGuest ? GUEST_DAILY_LIMIT : 20;
    const [dailyGenerations, setDailyGenerations] = useState<number>(0);
    const generationDateRef = useRef(new Date().toDateString());

    // Load per-user generation count when user changes
    useEffect(() => {
        if (!username) { setDailyGenerations(0); return; }
        const uid = currentUidRef.current || 'guest';
        try {
            const stored = JSON.parse(localStorage.getItem(`muse-daily-gen-${uid}`) || '{}');
            if (stored.date === new Date().toDateString()) {
                setDailyGenerations(stored.count || 0);
            } else {
                setDailyGenerations(0);
            }
        } catch { setDailyGenerations(0); }
    }, [username]);

    // Persist per-user generation count to localStorage
    useEffect(() => {
        if (!username) return;
        const uid = currentUidRef.current || 'guest';
        try {
            localStorage.setItem(`muse-daily-gen-${uid}`, JSON.stringify({ date: new Date().toDateString(), count: dailyGenerations }));
        } catch {}
    }, [dailyGenerations, username]);

    const checkGenerationLimit = useCallback((): boolean => {
        if (userTier === 'pro') return true;
        // Reset counter on new day
        const today = new Date().toDateString();
        if (today !== generationDateRef.current) {
            generationDateRef.current = today;
            setDailyGenerations(0);
            return true;
        }
        if (dailyGenerations >= FREE_DAILY_LIMIT) {
            const msg = getTranslation(language, 'limit.reached').replace('{limit}', String(FREE_DAILY_LIMIT));
            setFeedback(msg);
            soundService.playClick();
            // Guest: show login prompt; Free: show subscription modal
            if (isGuest) {
                setLoginPromptReason('trial');
            } else {
                setIsSubscriptionOpen(true);
            }
            return false;
        }
        return true;
    }, [userTier, dailyGenerations, setFeedback, language, isGuest]);

    const incrementGeneration = useCallback(() => {
        if (userTier !== 'pro') {
            setDailyGenerations(prev => prev + 1);
        }
    }, [userTier]);

    const themeOrder = React.useMemo<ThemeMode[]>(() => ['cyberpunk', 'zen', 'retro', 'alchemist', 'comic', 'game'], []);
    const themeProfiles = React.useMemo<Record<ThemeMode, { style: string; label: string }>>(() => ({
        cyberpunk: { style: 'Cyberpunk, Neon, Tactical HUD, Holographic, Sci-Fi', label: 'Theme: Cyberpunk' },
        zen: { style: 'Minimal, Zen, Soft light, Pastel, Calm, Glassmorphism', label: 'Theme: Zen' },
        retro: { style: 'Retro, Analog, CRT, Film Grain, Vintage Lab', label: 'Theme: Retro' },
        alchemist: { style: 'Arcane, Alchemy Lab, Glowing Runes, Mystic, Fantasy', label: 'Theme: Alchemist' },
        comic: { style: 'Comic Book, Pop Art, Halftone, Vibrant, Anime', label: 'Theme: Comic' },
        game: { style: 'E-Sports, Mechanical, RGB, Aggressive, Gamer', label: 'Theme: Game' }
    }), []);

    const applyTheme = useCallback((next: ThemeMode, source: 'gesture' | 'voice' | 'ambient') => {
        setTheme(prevTheme => {
            if (next === prevTheme) return prevTheme;
            setStyle(themeProfiles[next].style, themeProfiles[next].label);
            if (source === 'voice') {
                setFeedback(getTranslation(language, 'app.switching_theme'));
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(getTranslation(language, 'app.switching_theme'));
                    utter.rate = 0.95;
                    utter.pitch = 0.9;
                    window.speechSynthesis.speak(utter);
                }
            }
            return next;
        });
    }, [setStyle, setFeedback, themeProfiles, language]);

    // Use a ref to read current theme without stale closure
    const themeRef = useRef(theme);
    useEffect(() => { themeRef.current = theme; }, [theme]);

    const PRO_THEMES = React.useMemo<ThemeMode[]>(() => ['alchemist', 'comic', 'game'], []);

    const cycleTheme = useCallback((direction: 'cw' | 'ccw', source: 'gesture' | 'voice' | 'ambient') => {
        const currentTheme = themeRef.current;
        // Build available themes — skip Pro-locked themes for free users
        const available = userTier === 'pro' ? themeOrder : themeOrder.filter(t => !PRO_THEMES.includes(t));
        const idx = available.indexOf(currentTheme);
        const startIdx = idx === -1 ? 0 : idx;
        const offset = direction === 'cw' ? 1 : -1;
        const next = available[(startIdx + offset + available.length) % available.length];
        applyTheme(next, source);
    }, [themeOrder, PRO_THEMES, applyTheme, userTier]);

    // --- Generation wrappers with limit check ---
    const gatedImageGeneration = useCallback((overridePrompt?: string, overrideStyle?: string) => {
        if (!checkGenerationLimit()) return;
        incrementGeneration();
        triggerImageGeneration(overridePrompt, overrideStyle);
    }, [checkGenerationLimit, incrementGeneration, triggerImageGeneration]);

    const gatedVideoGeneration = useCallback(() => {
        if (isGuest) { setLoginPromptReason('feature'); return; }
        if (!generatedImage) {
            setFeedback(getTranslation(language, 'video.need_image'));
            soundService.playClick();
            return;
        }
        if (!checkGenerationLimit()) return;
        incrementGeneration();
        triggerVideoGeneration();
    }, [isGuest, generatedImage, checkGenerationLimit, incrementGeneration, triggerVideoGeneration, setFeedback, language]);

    const gatedLiveChat = useCallback(() => {
        if (isGuest) { setLoginPromptReason('feature'); return; }
        if (!checkGenerationLimit()) return;
        incrementGeneration();
        // forceStop() is auto-called by the useEffect that watches isLiveChatOpen
        setIsLiveChatOpen(true);
        setLiveChatAutoConnect(true);
        setFeedback(getTranslation(language, 'live.connecting'));
    }, [isGuest, checkGenerationLimit, incrementGeneration, setFeedback, language]);

    const handleThemeSelect = useCallback((next: ThemeMode) => {
        // Block Pro-only themes for free users
        if (PRO_THEMES.includes(next) && userTier !== 'pro') {
            handleSubscribe();
            return;
        }
        lastThemeSwitchRef.current = Date.now();
        applyTheme(next, 'gesture');
    }, [applyTheme, userTier, PRO_THEMES, handleSubscribe]);

    const handleLanguageChange = useCallback((lang: Language) => {
        // Auto-update custom instructions if they match the previous default
        // This ensures the persona language matches the UI language unless the user has customized it
        const currentDefault = getTranslation(language, 'settings.custom.default');
        // Check loosely for the Chinese default too, just in case
        const isDefault = customInstructions === currentDefault || customInstructions.includes("Role: 你是 Muse");
        
        if (isDefault) {
            setCustomInstructions(getTranslation(lang, 'settings.custom.default'));
        }

        setLanguage(lang);
        setFeedback(getTranslation(lang, 'app.ready'));
        soundService.playClick();
    }, [language, customInstructions, setFeedback]);

    // --- Ambient Light Handler ---
    // Only tracks ambient light level for UI effects (e.g. opacity adjustments).
    // Does NOT auto-switch theme — that was overriding the user's chosen theme.
    const handleAmbientLight = useCallback((level: number) => {
        setAmbientLight(level);
    }, []);

    const handleRuneCast = useCallback((rune: 'circle' | 'triangle') => {
        if (theme !== 'alchemist') return;
        setFeedback(`Rune Cast: ${rune.toUpperCase()}`);
        if (rune === 'circle') {
             triggerInspiration();
        } else if (rune === 'triangle') {
             gatedImageGeneration();
        }
    }, [theme, triggerInspiration, gatedImageGeneration, setFeedback]);

    // Speech Hook with voice commands for UI navigation
    const { isRecording, startRecording, stopRecording, stopAndCapture, toggleRecording, forceStop } = useSpeechToText({
        isEnabled: !!username && isCameraActive && !isLiveChatOpen, // Disable STT when Live is open to prevent audio conflict
        onResult: (text) => {
            const lower = text.toLowerCase();
            
            // --- Voice Commands for Language Switching ---
            if (lower.includes('switch to english')) { handleLanguageChange('en'); return; }
            if (lower.includes('chinese') || lower.includes('中文')) { handleLanguageChange('zh'); return; }
            if (lower.includes('spanish') || lower.includes('español')) { handleLanguageChange('es'); return; }
            if (lower.includes('japanese') || lower.includes('日本語')) { handleLanguageChange('ja'); return; }
            if (lower.includes('korean') || lower.includes('한국어')) { handleLanguageChange('ko'); return; }
            if (lower.includes('french') || lower.includes('français')) { handleLanguageChange('fr'); return; }
            if (lower.includes('german') || lower.includes('deutsch')) { handleLanguageChange('de'); return; }

            // --- Voice Commands for UI Navigation ---
            // Generate image
            if (lower.includes('generate image') || lower.includes('create image') || lower.includes('生成图片') || lower.includes('画一张')) {
                a11yService.announce(getTranslation(language, 'a11y.generating_image'));
                a11yService.haptic('confirm');
                gatedImageGeneration();
                return;
            }
            // Generate video
            if (lower.includes('generate video') || lower.includes('create video') || lower.includes('生成视频') || lower.includes('制作视频')) {
                a11yService.announce(getTranslation(language, 'a11y.generating_video'));
                a11yService.haptic('confirm');
                gatedVideoGeneration();
                return;
            }
            // Inspire / get suggestion
            if (lower.includes('inspire me') || lower.includes('get inspiration') || lower.includes('给我灵感') || lower.includes('启发')) {
                a11yService.announce(getTranslation(language, 'a11y.getting_inspiration'));
                triggerInspiration();
                return;
            }
            // Open settings
            if (lower.includes('open settings') || lower.includes('打开设置') || lower.includes('设置')) {
                setIsSettingsOpen(true);
                a11yService.announce(getTranslation(language, 'a11y.settings_opened'));
                return;
            }
            // Open help
            if (lower.includes('open help') || lower.includes('帮助') || lower.includes('打开帮助')) {
                setIsHelpOpen(true);
                a11yService.announce(getTranslation(language, 'a11y.help_opened'));
                return;
            }
            // Open history
            if (lower.includes('show history') || lower.includes('open history') || lower.includes('历史') || lower.includes('打开历史')) {
                setIsHistoryOpen(true);
                a11yService.announce(getTranslation(language, 'a11y.history_opened'));
                return;
            }
            // Clear prompt
            if (lower.includes('clear prompt') || lower.includes('clear text') || lower.includes('清除') || lower.includes('清空')) {
                updatePrompt('');
                a11yService.announce(getTranslation(language, 'a11y.prompt_cleared'));
                a11yService.haptic('tap');
                return;
            }
            // Start live chat
            if (lower.includes('start live') || lower.includes('live chat') || lower.includes('实时对话') || lower.includes('开始对话')) {
                gatedLiveChat();
                a11yService.announce(getTranslation(language, 'a11y.starting_live'));
                return;
            }
            // Undo
            if (lower.includes('undo') || lower.includes('撤销') || lower.includes('上一步')) {
                goBackInHistory();
                a11yService.announce(getTranslation(language, 'a11y.undo'));
                return;
            }

            // Save prompt
            if (lower.includes('save prompt') || lower.includes('save this') || lower.includes('保存') || lower.includes('收藏')) {
                handleSavePrompt(prompt, styleModifier);
                a11yService.announce(getTranslation(language, 'a11y.prompt_saved'));
                return;
            }

            // Toggle camera
            if (lower.includes('toggle camera') || lower.includes('camera off') || lower.includes('camera on') || lower.includes('开关摄像头')) {
                 // For safety, we only toggle if not in guest mode or handle appropriately
                 // But here we just toggle the active state if username exists
                 if (username) {
                     setIsCameraActive(prev => !prev);
                     a11yService.announce(getTranslation(language, 'a11y.camera_toggle'));
                     setFeedback(getTranslation(language, 'app.camera_toggling'));
                 }
                 return;
            }

            // Change Theme
            const themes: ThemeMode[] = ['cyberpunk', 'zen', 'retro', 'alchemist', 'comic', 'game'];
            for (const t of themes) {
                if (lower.includes(t)) {
                    handleThemeSelect(t);
                    return;
                }
            }

            // Default: treat as prompt text
            updatePrompt(text);
        },
        onStart: () => {
            setFeedback(getTranslation(language, 'app.listening'));
            a11yService.announce(getTranslation(language, 'app.listening'));
            a11yService.haptic('tap');
        },
        onEnd: () => {
            setFeedback(getTranslation(language, 'app.voice_input'));
            a11yService.haptic('confirm');
        },
        onError: () => {
            setFeedback(getTranslation(language, 'app.voice_error'));
            a11yService.announce(getTranslation(language, 'app.voice_error'));
            a11yService.haptic('error');
        }
    });

    // --- Visual & Logic State ---
    const [lastGesture, setLastGesture] = useState<GestureType>(GestureType.NONE);
    const sharedVideoRef = useRef<HTMLVideoElement>(null);
    const gestureCooldownRef = useRef<number>(0);
    const toolCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Theme Application Effect ---
    // Moved from body class manipulation to React state driven wrapper

    // Zen Breathing Effect
    useEffect(() => {
        if (theme === 'zen') {
            const interval = setInterval(() => {
                setBreathLevel(prev => {
                    const time = Date.now() / 1000;
                    return (Math.sin(time * 1.5) + 1) / 2; // ~4s cycle
                });
            }, 50);
            return () => clearInterval(interval);
        }
    }, [theme]);

    // --- Helper: Persist / restore Pro membership ---
    const restoreUserTier = useCallback((uid: string) => {
        try {
            const stored = localStorage.getItem(`muse-tier-${uid}`);
            if (stored === 'pro') {
                setUserTier('pro');
            } else {
                setUserTier('free');
            }
        } catch { setUserTier('free'); }
    }, []);

    const persistUserTier = useCallback((uid: string, tier: UserTier) => {
        try {
            localStorage.setItem(`muse-tier-${uid}`, tier);
        } catch { /* ignore */ }
    }, []);

    // Track current Firebase user UID for tier persistence
    const currentUidRef = useRef<string | null>(null);

    // --- Auth Effect ---
    useEffect(() => {
        // 1. Subscribe to auth state changes
        const unsubscribe = subscribeToAuthChanges((user) => {
            if (user) {
                currentUidRef.current = user.uid;
                setUsername(user.displayName || user.email?.split('@')[0] || "Operator");
                // Restore Pro membership for non-anonymous users
                if (!user.isAnonymous) {
                    restoreUserTier(user.uid);
                } else {
                    setUserTier('free');
                }
            } else {
                currentUidRef.current = null;
                setUsername(null);
                setUserTier('free');
            }
        });

        // 2. Check for redirect result (if returning from redirect login)
        checkRedirectResult().then(result => {
            if (result.success && result.user) {
                currentUidRef.current = result.user.uid;
                setUsername(result.user.displayName || result.user.email?.split('@')[0] || "Operator");
                if (!result.user.isAnonymous) {
                    restoreUserTier(result.user.uid);
                }
            } else if (result.error) {
                setAuthError({ message: result.error, code: result.code });
            }
        });

        return () => unsubscribe();
    }, [restoreUserTier]);

    // Cleanup tool call timeout on unmount
    useEffect(() => {
        return () => {
            if (toolCallTimeoutRef.current) clearTimeout(toolCallTimeoutRef.current);
        };
    }, []);

    // Auto-manage Camera Permissions:
    // Login -> Camera ON
    // Logout -> Camera OFF (Privacy First)
    useEffect(() => {
        setIsCameraActive(!!username);
    }, [username]);

    // Force-stop recording when camera is disabled or live chat opens
    useEffect(() => {
        if (!isCameraActive || isLiveChatOpen) {
            forceStop();
        }
    }, [isCameraActive, isLiveChatOpen, forceStop]);

    // Logout Logic
    const handleLogout = useCallback(() => {
        forceStop(); // Ensure recording is stopped on logout
        signOutUser();
        currentUidRef.current = null;
        setUsername(null);
        setUserTier('free');
        setAuthError(null);
        setFeedback(getTranslation(language, 'app.ready'));
        setIsLiveChatOpen(false);
        applyTheme('retro', 'gesture');
    }, [setFeedback, applyTheme, forceStop, language]);

    // --- Real-time State Change Handler ---
    // Recording is now controlled exclusively by FIST toggle in handleGestureTrigger,
    // so we no longer auto-stop when the gesture changes away from FIST.
    const handleGestureChange = useCallback((newGesture: GestureType) => {
        setLastGesture(prev => prev !== newGesture ? newGesture : prev);
    }, []);

    const handleFaceData = useCallback((data: FaceData) => {
        setCurrentFaceData(data);
    }, []);

    // --- Agent Tool Handler ---
    const handleToolCall = useCallback((name: string, args: any) => {
        console.log('[App] Tool Call:', name, args);
        // Clear any pending timeout from previous tool calls
        if (toolCallTimeoutRef.current) {
            clearTimeout(toolCallTimeoutRef.current);
            toolCallTimeoutRef.current = null;
        }
        if (name === 'update_creation' && args.prompt) {
            soundService.playSuccess();
            setFeedback(`MUSE: "${args.prompt}"`);
            const style = args.style || "";
            if (style) {
                setStyle(style, `Style: ${style}`);
            }
            updatePrompt(args.prompt);
            toolCallTimeoutRef.current = setTimeout(() => gatedImageGeneration(args.prompt, style), 500);
        } else if (name === 'generate_video') {
            soundService.playSuccess();
            setFeedback(getTranslation(language, 'app.muse_generating_video'));
            gatedVideoGeneration();
        } else if (name === 'open_settings') {
            soundService.playClick();
            setFeedback(getTranslation(language, 'app.muse_settings'));
            setIsSettingsOpen(true);
        } else if (name === 'save_prompt') {
            soundService.playSuccess();
            handleSavePrompt(prompt, styleModifier);
            setFeedback(getTranslation(language, 'app.muse_saved'));
        } else if (name === 'end_session') {
            soundService.playClick();
            setFeedback(getTranslation(language, 'app.muse_ended'));
            toolCallTimeoutRef.current = setTimeout(() => {
                setIsLiveChatOpen(false);
                setLiveChatAutoConnect(false);
            }, 1500);
        }
    }, [updatePrompt, setFeedback, gatedImageGeneration, gatedVideoGeneration, setStyle, prompt, styleModifier, handleSavePrompt, language]);

    // --- Trigger Action Handler ---
    const handleGestureTrigger = useCallback(async (gesture: GestureType) => {
        if (!username) return;
        const now = Date.now();
        if (now < gestureCooldownRef.current) return;
        if (isLoading) return;

        // Cooldown 1.5s
        gestureCooldownRef.current = now + 1500;

        // Haptic + audio feedback for every gesture detection
        a11yService.haptic('gesture');
        const gestureNames: Record<string, string> = {
            [GestureType.FIST]: getTranslation(language, 'app.gesture.voice'),
            [GestureType.OPEN_PALM]: getTranslation(language, 'app.gesture.inspire'),
            [GestureType.OK]: getTranslation(language, 'app.gesture.create'),
            [GestureType.VICTORY]: getTranslation(language, 'app.gesture.video'),
            [GestureType.LOVE]: getTranslation(language, 'app.gesture.anime'),
            [GestureType.ROCK]: getTranslation(language, 'app.gesture.dark'),
            [GestureType.SHAKA]: getTranslation(language, 'app.gesture.live'),
            [GestureType.POINTING]: getTranslation(language, 'app.gesture.help'),
        };
        const gestureName = gestureNames[gesture] || gesture;
        setFeedback(`Gesture: ${gestureName}`);
        a11yService.announce(`${getTranslation(language, 'a11y.gesture_detected')}: ${gestureName}`);

        // If Live Chat is open, handle gestures differently
        if (isLiveChatOpen) {
             if (gesture === GestureType.OPEN_PALM || gesture === GestureType.SHAKA) {
                 setIsLiveChatOpen(false);
                 setLiveChatAutoConnect(false);
                 setFeedback(getTranslation(language, 'app.live_ended'));
                 a11yService.announce(getTranslation(language, 'app.live_ended'));
                 a11yService.haptic('confirm');
                 soundService.playClick();
                 setLastGesture(GestureType.NONE);
                 return;
             }
             setLastGesture(gesture);
             return;
        }

        // If Help is open, any gesture closes it
        if (isHelpOpen) {
            setIsHelpOpen(false);
            a11yService.announce(getTranslation(language, 'a11y.help_closed'));
            a11yService.haptic('confirm');
            soundService.playClick();
            setLastGesture(GestureType.NONE);
            return;
        }

        setLastGesture(gesture);

        // Map Gestures to Actions
        switch (gesture) {
            case GestureType.FIST:
                toggleRecording();
                break;
            case GestureType.OPEN_PALM:
                triggerInspiration();
                break;
            case GestureType.OK:
                if (isRecording) {
                    // User was dictating (FIST) then did OK — stop recording first,
                    // wait for final transcript, then generate.
                    await stopAndCapture();
                    // Small delay to let React flush the prompt state update from onResult
                    await new Promise(r => setTimeout(r, 200));
                }
                gatedImageGeneration();
                break;
            case GestureType.VICTORY:
                gatedVideoGeneration();
                break;
            case GestureType.LOVE:
                setStyle("Anime, Pastel, Cute, Soft lighting", "Style: Anime");
                a11yService.haptic('confirm');
                break;
            case GestureType.ROCK:
                setStyle("Heavy Metal, Dark Fantasy, Gothic, Intense", "Style: Dark Fantasy");
                a11yService.haptic('confirm');
                break;
            case GestureType.SHAKA:
                gatedLiveChat();
                break;
            case GestureType.POINTING:
                setIsHelpOpen(true);
                a11yService.announce(getTranslation(language, 'a11y.help_opened'));
                a11yService.haptic('confirm');
                break;
            default:
                break;
        }
    }, [username, isLoading, isLiveChatOpen, isHelpOpen, isRecording, triggerInspiration, gatedImageGeneration, gatedVideoGeneration, gatedLiveChat, setStyle, setFeedback, toggleRecording, stopAndCapture, language]);

    // --- Keyboard Shortcuts for Accessibility ---
    // Allows full app control via keyboard for users who cannot use gestures
    const closeAllModals = useCallback(() => {
        setIsHelpOpen(false);
        setIsSettingsOpen(false);
        setIsHistoryOpen(false);
        setIsSubscriptionOpen(false);
        setIsPromptLibraryOpen(false);
        if (isLiveChatOpen) {
            setIsLiveChatOpen(false);
            setLiveChatAutoConnect(false);
        }
    }, [isLiveChatOpen]);

    useKeyboardShortcuts({
        onVoiceToggle: () => { 
            if (!username) return;
            toggleRecording(); 
            a11yService.haptic('tap');
            a11yService.announce(isRecording ? getTranslation(language, 'a11y.voice_stopped') : getTranslation(language, 'a11y.voice_started'));
        },
        onInspire: () => { if (!username || isLoading) return; triggerInspiration(); a11yService.haptic('confirm'); a11yService.announce(getTranslation(language, 'a11y.getting_inspiration')); },
        onGenerate: () => { if (!username || isLoading) return; gatedImageGeneration(); a11yService.haptic('confirm'); a11yService.announce(getTranslation(language, 'a11y.generating_image')); },
        onVideo: () => { if (!username || isLoading) return; gatedVideoGeneration(); a11yService.haptic('confirm'); a11yService.announce(getTranslation(language, 'a11y.generating_video')); },
        onLiveChat: () => { if (!username) return; gatedLiveChat(); a11yService.haptic('confirm'); a11yService.announce(getTranslation(language, 'a11y.starting_live')); },
        onOpenSettings: () => { setIsSettingsOpen(true); a11yService.announce(getTranslation(language, 'a11y.settings_opened')); },
        onOpenHelp: () => { setIsHelpOpen(true); a11yService.announce(getTranslation(language, 'a11y.help_opened')); },
        onOpenHistory: () => { setIsHistoryOpen(true); a11yService.announce(getTranslation(language, 'a11y.history_opened')); },
        onUndo: () => { goBackInHistory(); a11yService.announce(getTranslation(language, 'a11y.undo')); },
        onRedo: () => { goForwardInHistory(); a11yService.announce(getTranslation(language, 'a11y.redo')); },
        onToggleCamera: () => { 
            setIsCameraActive(prev => !prev); 
            a11yService.haptic('tap');
            a11yService.announce(isCameraActive ? getTranslation(language, 'a11y.camera_disabled') : getTranslation(language, 'a11y.camera_enabled')); 
        },
        onClearPrompt: () => { updatePrompt(''); a11yService.haptic('tap'); a11yService.announce(getTranslation(language, 'a11y.prompt_cleared')); },
        onEscape: closeAllModals,
    }, !!username);

    // --- Audio announcements for generation state changes ---
    const prevStageRef = useRef(currentStage);
    useEffect(() => {
        if (currentStage !== prevStageRef.current) {
            prevStageRef.current = currentStage;
            switch (currentStage) {
                case 'thinking':
                    a11yService.announce(getTranslation(language, 'app.thinking'));
                    break;
                case 'painting':
                    a11yService.announce(getTranslation(language, 'a11y.generating_image'));
                    break;
                case 'directing':
                    a11yService.announce(getTranslation(language, 'a11y.generating_video'));
                    break;
                case 'complete':
                    a11yService.announce(getTranslation(language, 'reasoning.status.complete'));
                    a11yService.haptic('success');
                    break;
            }
        }
    }, [currentStage]);

    // Announce when image/video is generated
    const prevImageRef = useRef(generatedImage);
    const prevVideoRef = useRef(generatedVideo);
    useEffect(() => {
        if (generatedImage && generatedImage !== prevImageRef.current) {
            a11yService.announce(getTranslation(language, 'reasoning.status.complete'));
            a11yService.haptic('success');
        }
        prevImageRef.current = generatedImage;
    }, [generatedImage]);
    useEffect(() => {
        if (generatedVideo && generatedVideo !== prevVideoRef.current) {
            a11yService.announce(getTranslation(language, 'reasoning.status.complete'));
            a11yService.haptic('success');
        }
        prevVideoRef.current = generatedVideo;
    }, [generatedVideo]);

    return (
        <div className={`relative w-screen h-[100dvh] overflow-hidden flex flex-col md:flex-row transition-colors duration-500 theme-${theme}`}>
            
            {/* GLOBAL BACKGROUND LAYER */}
            <div className="fixed inset-0 z-[-1] w-full h-full pointer-events-none bg-[var(--bg-primary)] transition-colors duration-500">
                {/* 1. Base Image Layer (Gradients/Patterns) */}
                <div className="absolute inset-0 transition-opacity duration-1000" style={{ backgroundImage: 'var(--theme-bg-image)' }}></div>
                
                {/* 2. Dynamic Overlay Layer (Grid/Animations) */}
                <div className="absolute inset-0 opacity-40 bg-[image:var(--hud-grid)] bg-fixed animate-pulse"></div>
                
                {/* 3. Theme Specific Animations */}
                <div className={`absolute inset-0 ${theme === 'cyberpunk' ? 'animate-[cyber-grid-scroll_3s_linear_infinite] opacity-30' : ''}`} style={{ backgroundImage: theme === 'cyberpunk' ? 'var(--hud-grid)' : 'none' }}></div>
                <div className={`absolute inset-0 ${theme === 'retro' ? 'animate-[retro-flicker_0.1s_infinite] opacity-20' : ''}`} style={{ backgroundImage: theme === 'retro' ? 'var(--hud-grid)' : 'none' }}></div>
                <div className={`absolute inset-0 ${theme === 'comic' ? 'animate-[comic-pop_0.5s_steps(2)_infinite] opacity-20' : ''}`} style={{ backgroundImage: theme === 'comic' ? 'var(--hud-grid)' : 'none' }}></div>
            </div>



            {/* --- LEFT PANEL: IMMERSIVE CAMERA & HUD --- */}
            <div className="relative w-full h-[30vh] md:w-1/2 md:h-full bg-transparent border-r border-white/5 overflow-hidden">

                {/* 1. The Video Canvas (Background) */}
                <div className="absolute inset-0 z-0">
                    <ErrorBoundary fallbackTitle="Camera Error">
                    <MagicCanvas
                        onGestureDetected={handleGestureTrigger}
                        onGestureChanged={handleGestureChange}
                        onFaceDataDetected={handleFaceData}
                        onDialTurn={(dir) => cycleTheme(dir, 'gesture')}
                        onAmbientLightDetected={handleAmbientLight}
                        currentGesture={lastGesture}
                        onError={setCameraError}
                        isCameraActive={isCameraActive}
                        enableCloudVision={!!username} // Enable Vision features only when logged in
                        videoRef={sharedVideoRef}
                        generationStage={currentStage}
                    />
                    </ErrorBoundary>
                </div>

                {/* 2. HUD Overlay Layer */}
                {username && (
                    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-1.5 sm:p-3 lg:p-6">

                        {/* Top Section: Title & User Info */}
                        <div className="flex justify-between items-start w-full pointer-events-auto">
                            <div className="flex items-end gap-2 sm:gap-3">
                                <h1 className="text-lg sm:text-3xl lg:text-6xl font-bold tracking-tighter text-white drop-shadow-lg font-display italic leading-none">
                                    Muse
                                </h1>
                                <p className="hidden md:block text-xs lg:text-lg font-light text-white/60 italic font-display pb-0.5 lg:pb-1">
            {getTranslation(language, 'app.tagline')}
          </p>
                            </div>
                            
                            {/* User Info Moved to Settings */}
                        </div>

                        {/* Gesture Grid (Floating Centered) */}
                        {isCameraActive && (
                            <div className="pointer-events-auto absolute top-8 sm:top-14 lg:top-24 left-1 right-1 sm:left-0 sm:right-0 flex justify-center z-20">
                                <GestureGrid
                                    gesture={lastGesture}
                                    onGestureClick={(clickedGesture) => {
                                        handleGestureTrigger(clickedGesture);
                                    }}
                                    language={language}
                                />
                            </div>
                        )}

                        {/* NEW: REASONING CORE - Bottom Full Width Bar overlaid on camera view */}
                        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
                            <Suspense fallback={null}><ReasoningCore
                                thought={streamingThought || thoughtLog}
                                status={
                                    currentStage === 'thinking' ? 'thinking' :
                                        currentStage === 'painting' || currentStage === 'directing' ? 'generating' :
                                            currentStage === 'complete' ? 'complete' : 'idle'
                                }
                                progress={generationProgress}
                                modelInfo={
                                    currentStage === 'thinking' ? 'Gemini 3 Flash Preview' :
                                        currentStage === 'painting' ? 'Gemini 2.5 Flash Image' :
                                            currentStage === 'directing' ? 'Muse Video' : undefined
                                }
                                mode="bar"
                                language={language}
                            /></Suspense>
                        </div>
                    </div>
                )}

                {/* Mobile bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black via-black/80 to-transparent md:hidden pointer-events-none z-10"></div>
            </div>

            {/* --- LAYER 2: LOGIN SCREEN --- */}
            {!username && (
                <div className="absolute inset-0 z-50">
                    <LoginScreen
                        onLogin={(name) => { setUsername(name); setBlockGuestLogin(false); }}
                        initialError={authError}
                        language={language}
                        blockGuest={blockGuestLogin}
                    />
                </div>
            )}

            {/* --- LAYER 2.2: ONBOARDING OVERLAY --- */}
            {showOnboarding && username && currentFaceData && (
                <Suspense fallback={null}><OnboardingOverlay
                    username={username}
                    emotion={currentFaceData.emotion || 'Calm'}
                    language={language}
                    onComplete={() => {
                        setShowOnboarding(false);
                        setFeedback(getTranslation(language, 'app.ready_short'));
                    }}
                /></Suspense>
            )}

            {/* --- LAYER 2.5: SOCIAL AGENT HUD --- */}
            {socialCopy && (
                <div className="fixed md:absolute top-auto md:top-24 bottom-16 md:bottom-auto right-2 sm:right-4 z-[45] w-[calc(100%-1rem)] sm:w-80 max-h-[40vh] overflow-y-auto p-3 sm:p-5 bg-black/95 border border-purple-500/50 rounded-xl backdrop-blur-xl animate-in slide-in-from-right-10 fade-in duration-500 shadow-[0_0_50px_-12px_rgba(168,85,247,0.5)] pointer-events-auto">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-purple-400 font-bold flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-purple-400" />
                            <span className="tracking-wider text-sm font-mono">MUSE SOCIAL</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 font-mono">GEMINI 2.0 FLASH</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-white text-lg font-bold leading-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            {socialCopy.title}
                        </div>
                        <p className="text-gray-300 text-sm font-mono leading-relaxed border-l-2 border-purple-500/30 pl-3">
                            {socialCopy.text}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {socialCopy.hashtags.map(tag => (
                                <span key={tag} className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 font-mono">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                        <button
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: socialCopy.title,
                                        text: `${socialCopy.title}\n\n${socialCopy.text}\n\n${socialCopy.hashtags.join(' ')}`
                                    }).catch(console.error);
                                }
                            }}
                            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Share2 className="w-4 h-4" />
                            Share Now
                        </button>
                    </div>
                </div>
            )}

            {/* --- RIGHT PANEL: CONTROL STATION --- */}
            {username && (
                <div className="relative w-full h-[calc(100dvh-30vh)] md:w-1/2 md:h-full bg-transparent flex flex-col overflow-hidden">

                    {/* Top Toolbar (Tablet & Desktop) */}
                    <div className="hidden md:flex justify-end items-center p-2 lg:p-4 gap-1.5 lg:gap-2 border-b border-white/5 bg-transparent shrink-0">
                        {/* Guest / Free Badge & Generation Counter */}
                        {(isGuest || userTier === 'free') && (
                            <div className="flex items-center gap-1.5 mr-auto px-2.5 py-1 rounded-lg bg-[var(--glass-bg)] border border-[var(--border-color)] backdrop-blur-sm">
                                {isGuest ? (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-[11px] text-amber-400 font-semibold tracking-wide">{getTranslation(language, 'help.tier.guest').toUpperCase()}</span>
                                        <span className="text-[10px] text-[var(--text-secondary)] opacity-50">·</span>
                                        <span className="text-[11px] text-[var(--text-secondary)] font-mono">{dailyGenerations}<span className="opacity-50">/{GUEST_DAILY_LIMIT}</span></span>
                                        <span className="text-[10px] text-[var(--text-secondary)] opacity-60">{getTranslation(language, 'guest.trial')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                        <span className="text-[11px] text-[var(--text-secondary)] font-mono">{dailyGenerations}<span className="opacity-50">/{FREE_DAILY_LIMIT}</span></span>
                                    </>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => setIsCameraActive(!isCameraActive)}
                            data-testid="toolbar-camera"
                            className={`theme-btn p-2.5 rounded-full flex items-center justify-center ${!isCameraActive ? '!bg-red-900/20 !border-red-500/50 !text-red-500' : ''} ${accessibilityMode ? 'px-4 gap-2 w-auto' : ''}`}
                            title={isCameraActive ? getTranslation(language, 'action.camera.on') : getTranslation(language, 'action.camera.off')}
                            aria-label={isCameraActive ? getTranslation(language, 'action.camera.on') : getTranslation(language, 'action.camera.off')}
                        >
                            {isCameraActive ? <Camera className="w-[18px] h-[18px]" /> : <CameraOff className="w-[18px] h-[18px]" />}
                            {accessibilityMode && <span className="text-xs font-bold">{isCameraActive ? getTranslation(language, 'action.camera.on') : getTranslation(language, 'action.camera.off')}</span>}
                        </button>

                        {/* History Button */}
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            data-testid="toolbar-history"
                            className={`theme-btn p-2.5 rounded-full flex items-center justify-center relative ${accessibilityMode ? 'px-4 gap-2 w-auto' : ''}`}
                            title={getTranslation(language, 'action.history')}
                            aria-label={getTranslation(language, 'action.history')}
                        >
                            <History className="w-[18px] h-[18px]" />
                            {accessibilityMode && <span className="text-xs font-bold">{getTranslation(language, 'action.history')}</span>}
                            {historyLength > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-primary)] text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                                    {historyLength}
                                </span>
                            )}
                        </button>

                        {/* Subscription Button */}
                        <button
                            onClick={handleSubscribe}
                            data-testid="toolbar-subscription"
                            className={`theme-btn p-2.5 rounded-full flex items-center justify-center relative ${userTier === 'pro' ? '!bg-gradient-to-r !from-amber-500/20 !to-yellow-500/20 !border-amber-500/50' : ''} ${accessibilityMode ? 'px-4 gap-2 w-auto' : ''}`}
                            title={userTier === 'pro' ? getTranslation(language, 'action.pro') : getTranslation(language, 'action.upgrade')}
                            aria-label={userTier === 'pro' ? getTranslation(language, 'action.pro') : getTranslation(language, 'action.upgrade')}
                        >
                            <Crown className={`w-[18px] h-[18px] ${userTier === 'pro' ? '!text-amber-400' : ''}`} />
                            {accessibilityMode && <span className="text-xs font-bold">{userTier === 'pro' ? getTranslation(language, 'action.pro') : getTranslation(language, 'action.upgrade')}</span>}
                            {userTier === 'free' && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                            )}
                        </button>

                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            data-testid="toolbar-settings"
                            className={`theme-btn p-2.5 rounded-full flex items-center justify-center ${accessibilityMode ? 'px-4 gap-2 w-auto' : ''}`}
                            title={getTranslation(language, 'action.settings')}
                            aria-label={getTranslation(language, 'action.settings')}
                        >
                            <Settings className="w-[18px] h-[18px]" />
                            {accessibilityMode && <span className="text-xs font-bold">{getTranslation(language, 'action.settings')}</span>}
                        </button>
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            data-testid="toolbar-help"
                            className={`theme-btn p-2.5 rounded-full flex items-center justify-center ${accessibilityMode ? 'px-4 gap-2 w-auto' : ''}`}
                            title={getTranslation(language, 'action.help')}
                            aria-label={getTranslation(language, 'action.help')}
                        >
                            <HelpCircle className="w-[18px] h-[18px]" />
                            {accessibilityMode && <span className="text-xs font-bold">{getTranslation(language, 'action.help')}</span>}
                        </button>
                    </div>

                    {/* Main Control Panel */}
                    <div className="flex-1 p-1.5 sm:p-3 lg:p-8 flex flex-col justify-center min-h-0 overflow-hidden">
                        <ControlPanel
                            prompt={prompt}
                            styleModifier={styleModifier}
                            generatedImage={generatedImage}
                            generatedVideo={generatedVideo}
                            isLoading={isLoading}
                            feedback={feedbackMessage}
                            providerInfo={providerInfo}
                            gesture={lastGesture}
                            isRecording={isRecording}
                            isApiEnabled={true}
                            onToggleApi={() => { }}
                            onRunDiagnostics={runDiagnostics}
                            onUpdatePrompt={updatePrompt}
                            onCloseImage={closeImage}
                            onTriggerVideo={gatedVideoGeneration}
                            thoughtLog={thoughtLog}
                            streamingThought={streamingThought}
                            currentStage={currentStage}
                            generationProgress={generationProgress}
                            theme={theme}
                            onThemeSelect={handleThemeSelect}
                            // NEW: History Control Passing
                            onUndo={goBackInHistory}
                            onRedo={goForwardInHistory}
                            canUndo={historyIndex > 0}
                            canRedo={historyIndex < historyLength - 1}
                            // NEW: Agentic Props Passing
                            researchQuery={researchQuery}
                            researchResults={researchResults}
                            userTier={userTier}
                            isGuest={isGuest}
                            onGuestGate={() => setLoginPromptReason('feature')}
                            onUpgradeRequest={handleSubscribe}
                            onSavePrompt={handleSavePrompt}
                            onOpenLibrary={() => isGuest ? setLoginPromptReason('feature') : setIsPromptLibraryOpen(true)}
                            language={language}
                            accessibilityMode={accessibilityMode}
                        />
                    </div>

                    {/* Mobile Guest Badge */}
                    {isGuest && (
                        <div className="flex md:hidden items-center justify-center gap-1.5 py-1 border-t border-white/5 bg-[var(--glass-bg)]/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[10px] text-amber-400 font-semibold">{getTranslation(language, 'help.tier.guest').toUpperCase()}</span>
                            <span className="text-[9px] text-[var(--text-secondary)] opacity-50">·</span>
                            <span className="text-[10px] text-[var(--text-secondary)] font-mono">{dailyGenerations}<span className="opacity-50">/{GUEST_DAILY_LIMIT}</span></span>
                            <span className="text-[9px] text-[var(--text-secondary)] opacity-60">{getTranslation(language, 'guest.trial')}</span>
                        </div>
                    )}
                    {/* Mobile Bottom Toolbar */}
                    <div className="flex md:hidden justify-center items-center gap-3 px-3 py-1.5 border-t border-white/5 bg-[var(--glass-bg)] backdrop-blur-md shrink-0 safe-area-bottom">
                        <button onClick={() => setIsCameraActive(!isCameraActive)} className={`theme-btn p-2 rounded-full ${!isCameraActive ? '!bg-red-900/20 !border-red-500/50 !text-red-500' : ''} ${accessibilityMode ? 'px-3 gap-2 w-auto flex items-center' : ''}`} aria-label={isCameraActive ? getTranslation(language, 'action.camera.on') : getTranslation(language, 'action.camera.off')}>
                            {isCameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                            {accessibilityMode && <span className="text-[10px] font-bold">{isCameraActive ? getTranslation(language, 'action.camera.on') : getTranslation(language, 'action.camera.off')}</span>}
                        </button>
                        <button onClick={() => setIsHistoryOpen(true)} className={`theme-btn p-2 rounded-full relative ${accessibilityMode ? 'px-3 gap-2 w-auto flex items-center' : ''}`} aria-label={getTranslation(language, 'action.history')}>
                            <History className="w-4 h-4" />
                            {accessibilityMode && <span className="text-[10px] font-bold">{getTranslation(language, 'action.history')}</span>}
                            {historyLength > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--accent-primary)] text-white text-[7px] rounded-full flex items-center justify-center font-bold">{historyLength}</span>}
                        </button>
                        <button onClick={handleSubscribe} className={`theme-btn p-2 rounded-full relative ${userTier === 'pro' ? '!bg-gradient-to-r !from-amber-500/20 !to-yellow-500/20 !border-amber-500/50' : ''} ${accessibilityMode ? 'px-3 gap-2 w-auto flex items-center' : ''}`} aria-label={userTier === 'pro' ? getTranslation(language, 'action.pro') : getTranslation(language, 'action.upgrade')}>
                            <Crown className={`w-4 h-4 ${userTier === 'pro' ? '!text-amber-400' : ''}`} />
                            {accessibilityMode && <span className="text-[10px] font-bold">{userTier === 'pro' ? getTranslation(language, 'action.pro') : getTranslation(language, 'action.upgrade')}</span>}
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className={`theme-btn p-2 rounded-full ${accessibilityMode ? 'px-3 gap-2 w-auto flex items-center' : ''}`} aria-label={getTranslation(language, 'action.settings')}>
                            <Settings className="w-4 h-4" />
                            {accessibilityMode && <span className="text-[10px] font-bold">{getTranslation(language, 'action.settings')}</span>}
                        </button>
                        <button onClick={() => setIsHelpOpen(true)} className={`theme-btn p-2 rounded-full ${accessibilityMode ? 'px-3 gap-2 w-auto flex items-center' : ''}`} aria-label={getTranslation(language, 'action.help')}>
                            <HelpCircle className="w-4 h-4" />
                            {accessibilityMode && <span className="text-[10px] font-bold">{getTranslation(language, 'action.help')}</span>}
                        </button>
                    </div>
                </div>
            )}

            <Suspense fallback={null}>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} language={language} theme={theme} accessibilityMode={accessibilityMode} />
            <UserManagementModal isOpen={isDbOpen} onClose={() => setIsDbOpen(false)} language={language} theme={theme} />
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                theme={theme}
                onThemeSelect={handleThemeSelect}
                language={language}
                onLanguageChange={handleLanguageChange}
                onLogout={handleLogout}
                username={username}
                userTier={userTier}
                onOpenUserMgmt={() => {
                    setIsSettingsOpen(false);
                    setIsDbOpen(true);
                }}
                enableMemory={enableMemory}
                onEnableMemoryChange={setEnableMemory}
                customInstructions={customInstructions}
                onCustomInstructionsChange={setCustomInstructions}
                onUpgradeRequest={() => {
                    setIsSettingsOpen(false);
                    handleSubscribe();
                }}
                accessibilityMode={accessibilityMode}
                onAccessibilityModeChange={handleAccessibilityModeChange}
            />
            <SubscriptionModal
                isOpen={isSubscriptionOpen}
                onClose={() => setIsSubscriptionOpen(false)}
                currentTier={userTier}
                language={language}
                theme={theme}
                accessibilityMode={accessibilityMode}
                onUpgrade={() => {
                    setUserTier('pro');
                    // Persist Pro membership so it's remembered on next login
                    if (currentUidRef.current) {
                        persistUserTier(currentUidRef.current, 'pro');
                    }
                    setIsSubscriptionOpen(false);
                    soundService.playSuccess();
                    setFeedback(getTranslation(language, 'app.welcome_pro'));
                }}
            />
            {/* Login Prompt Modal for Guest Users */}
            {loginPromptReason && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={getTranslation(language, 'guest.modal.title.feature')}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setLoginPromptReason(false)} />
                    <div className="relative z-10 w-full max-w-sm mx-4 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-xl shadow-2xl">
                        <button onClick={() => setLoginPromptReason(false)} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-[var(--text-secondary)] transition-colors" aria-label={getTranslation(language, 'action.close')}>
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                                <LogIn className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                {loginPromptReason === 'trial'
                                    ? getTranslation(language, 'guest.modal.title.trial')
                                    : getTranslation(language, 'guest.modal.title.feature')
                                }
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                {loginPromptReason === 'trial'
                                    ? getTranslation(language, 'guest.modal.desc.trial')
                                    : getTranslation(language, 'guest.modal.desc.feature')
                                }
                            </p>
                            <div className="flex flex-col gap-2 w-full mt-2">
                                <button
                                    onClick={() => {
                                        setLoginPromptReason(false);
                                        setBlockGuestLogin(true);
                                        handleLogout();
                                    }}
                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-sm hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg"
                                >
                                    {getTranslation(language, 'guest.modal.login')}
                                </button>
                                <button
                                    onClick={() => setLoginPromptReason(false)}
                                    className="w-full py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:bg-white/5 transition-colors"
                                >
                                    {getTranslation(language, 'guest.modal.dismiss')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <PromptLibraryModal
                isOpen={isPromptLibraryOpen}
                onClose={() => setIsPromptLibraryOpen(false)}
                savedPrompts={savedPrompts}
                language={language}
                theme={theme}
                onSelectPrompt={(text) => {
                    updatePrompt(text);
                    setIsPromptLibraryOpen(false);
                    soundService.playSuccess();
                }}
                onDeletePrompt={handleDeletePrompt}
            />
            <HistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                history={getHistoryList()}
                currentIndex={historyIndex}
                language={language}
                theme={theme}
                onSelectEntry={goToHistoryIndex}
                onClearHistory={clearHistory}
                accessibilityMode={accessibilityMode}
            />
            <GeminiLiveChat
                isOpen={isLiveChatOpen}
                onClose={() => {
                    setIsLiveChatOpen(false);
                    setLiveChatAutoConnect(false);
                }}
                videoRef={sharedVideoRef}
                onToolCall={handleToolCall}
                gesture={lastGesture}
                language={language}
                autoConnect={liveChatAutoConnect}
                theme={theme}
            />
            </Suspense>

            {/* Theme Transition Overlay */}
            <div className={`fixed inset-0 pointer-events-none z-[100] transition-opacity duration-300 ${themeTransition ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-full h-full bg-black/10 backdrop-blur-md flex items-center justify-center">
                    <div className={`text-4xl font-bold tracking-widest text-white uppercase transition-all duration-500 transform ${themeTransition ? 'scale-110 rotate-0 blur-none' : 'scale-90 rotate-12 blur-sm'}`}>
                        System Change
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
