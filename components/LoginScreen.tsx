import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Settings, Activity, AlertTriangle, Command, Globe, Github, User, ArrowRight, HelpCircle, ExternalLink, Copy, RefreshCw, Sparkles, Mail, ArrowLeft } from 'lucide-react';
import { signInWithGoogle, signInWithGithub, signInWithApple, isFirebaseConfigured, signInAsGuest, registerWithEmail, signInWithEmail } from '../services/firebaseService';
import UserManagementModal from './UserManagementModal';
import { soundService } from '../services/soundService';
import { Language, getTranslation } from '../services/i18n';

interface LoginScreenProps {
    onLogin: (username: string) => void;
    initialError?: { message: string, code?: string } | null;
    language?: Language;
    blockGuest?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, initialError, language = 'en', blockGuest = false }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDomainError, setIsDomainError] = useState(false);
    const [showUserManagement, setShowUserManagement] = useState(false);
    const [currentDomain, setCurrentDomain] = useState('');
    const [isBgReady, setIsBgReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Email Auth State
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const backgroundSource = '/login-bg.mp4';
    const placeholderData =
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23060610'/><stop offset='0.5' stop-color='%230e1a2b'/><stop offset='1' stop-color='%23080412'/></linearGradient></defs><rect width='1200' height='800' fill='url(%23g)'/><circle cx='260' cy='200' r='140' fill='%231e3a8a' opacity='0.35'/><circle cx='860' cy='520' r='220' fill='%237c3aed' opacity='0.25'/></svg>";

    // Construct the Firebase Console URL
    const PROJECT_ID = "gen-lang-client-0961416397";
    const FIREBASE_CONSOLE_URL = `https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings`;

    const detectDomain = () => {
        if (typeof window !== 'undefined') {
            try {
                // More robust domain detection
                const host = window.location.host;
                const hostname = window.location.hostname;
                const origin = window.location.origin ? new URL(window.location.origin).hostname : '';

                const detected = host || hostname || origin || 'localhost';
                setCurrentDomain(detected);
            } catch (e) {
                setCurrentDomain(window.location.hostname || 'localhost');
            }
        }
    };

    useEffect(() => {
        detectDomain();
    }, []);

    // Handle initial error passed from parent
    useEffect(() => {
        if (initialError) {
            handleError(initialError.message, initialError.code);
        }
    }, [initialError]);

    const handleError = (errMsg: string, errCode?: string) => {
        soundService.playError();

        if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
            setIsDomainError(true);
            setError(getTranslation(language, 'login.domain_error'));
            detectDomain();
        } else if (errCode === 'auth/email-already-in-use') {
            setError(getTranslation(language, 'login.email_in_use'));
            setIsRegistering(true);
        } else if (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) {
            setError(getTranslation(language, 'login.invalid_credential'));
        } else if (errCode === 'auth/wrong-password') {
            setError(getTranslation(language, 'login.wrong_password'));
        } else if (errCode === 'auth/too-many-requests') {
            setError(getTranslation(language, 'login.too_many_requests'));
        } else if (errCode === 'auth/weak-password') {
            setError(getTranslation(language, 'login.weak_password'));
        } else if (errCode === 'auth/invalid-email') {
            setError(getTranslation(language, 'login.invalid_email'));
        } else if (errCode === 'auth/operation-not-allowed') {
            setError(getTranslation(language, 'login.operation_not_allowed'));
        } else if (errMsg.includes('postMessage') || errMsg.includes('iframe') || errMsg.includes('origin')) {
            setError(getTranslation(language, 'login.env_restriction'));
        } else if (errCode === 'auth/popup-closed-by-user') {
            setError(getTranslation(language, 'login.cancelled'));
        } else {
            setError(errMsg);
        }
    };

    const handleAuth = async (provider: 'google' | 'github' | 'apple') => {
        soundService.playClick();
        setIsLoading(true);
        setLoadingAction(provider);
        setError(null);
        setIsDomainError(false);
        detectDomain();

        let result;
        if (provider === 'google') result = await signInWithGoogle();
        else if (provider === 'github') result = await signInWithGithub();
        else if (provider === 'apple') result = await signInWithApple();

        if (result?.success && result.user) {
            soundService.playSuccess();
            const name = result.user.displayName || result.user.email?.split('@')[0] || "Operator";
            onLogin(name);
        } else {
            handleError(result?.error || getTranslation(language, 'login.auth_failed'), result?.code);
            setIsLoading(false);
            setLoadingAction(null);
        }
    };

    const handleGuestLogin = async () => {
        soundService.playClick();
        setIsLoading(true);
        const result = await signInAsGuest();
        if (result.success && result.user) {
            soundService.playSuccess();
            onLogin(getTranslation(language, 'user.guest'));
        }
        setIsLoading(false);
    };

    const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const handleEmailRegister = async () => {
        if (!email || !password) return;
        if (!isEmailValid(email)) {
            setError(getTranslation(language, 'login.invalid_email'));
            return;
        }
        if (password.length < 6) {
            setError(getTranslation(language, 'login.weak_password'));
            return;
        }
        soundService.playClick();
        setIsLoading(true);
        setLoadingAction('register');
        setError(null);
        
        const result = await registerWithEmail(email, password);
        
        if (result.success && result.user) {
            soundService.playSuccess();
            const name = result.user.displayName || result.user.email?.split('@')[0] || "Operator";
            onLogin(name);
        } else {
            handleError(result.error || "Registration Failed", result.code);
            setIsLoading(false);
            setLoadingAction(null);
        }
    };

    const handleEmailLogin = async () => {
        if (!email || !password) return;
        if (!isEmailValid(email)) {
            setError(getTranslation(language, 'login.invalid_email'));
            return;
        }
        soundService.playClick();
        setIsLoading(true);
        setLoadingAction('signin');
        setError(null);

        const result = await signInWithEmail(email, password);

        if (result.success && result.user) {
            soundService.playSuccess();
            const name = result.user.displayName || result.user.email?.split('@')[0] || "Operator";
            onLogin(name);
        } else {
            handleError(result.error || getTranslation(language, 'login.signin_failed'), result.code);
            setIsLoading(false);
            setLoadingAction(null);
        }
    };

    const firebaseReady = isFirebaseConfigured();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            {/* 1. Background Layer - Fixed to Viewport with w-screen/h-screen to ensure full coverage */}
            <div className="fixed top-0 left-0 w-screen h-screen z-0 overflow-hidden bg-black">
                {/* Static Placeholder */}
                <div
                    className="absolute inset-0 bg-cover bg-center filter brightness-[0.6] contrast-[1.1]"
                    style={{ backgroundImage: `url("${placeholderData}")` }}
                />

                {/* Video Background */}
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={placeholderData}
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    onLoadedData={() => setIsBgReady(true)}
                >
                    <source src={backgroundSource} type="video/mp4" />
                </video>

                {/* 2. Semi-transparent Overlay */}
                <div className="absolute inset-0 bg-black/30 z-10 pointer-events-none"></div>
            </div>

            {/* Login Box - Transparent Mode */}
            <div className="relative z-20 w-full max-w-md p-4 sm:p-6 lg:p-12 bg-transparent backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] mx-4 sm:mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>

                <div className="text-center mb-6 lg:mb-8 shrink-0">
                    <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full mb-4 lg:mb-6 shadow-[0_0_30px_rgba(168,85,247,0.4)] overflow-hidden">
                        <img src="/muse-logo.svg" alt="Muse" className="w-full h-full" draggable={false} />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-white to-blue-200 mb-2 font-display italic">{getTranslation(language, 'login.title')}</h1>
                    <p className="text-xs font-mono text-blue-200/60 tracking-[0.3em] uppercase mb-2">{getTranslation(language, 'login.subtitle')}</p>
                    <p className="text-[11px] text-gray-400/80 leading-relaxed">{getTranslation(language, 'login.desc')}</p>
                </div>

                <div className="overflow-y-auto custom-scrollbar px-1">
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex flex-col gap-2">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs text-red-400 font-bold mb-1 break-words">{error}</p>
                                    {isDomainError && (
                                        <div className="text-[10px] text-red-300/80 leading-relaxed mt-1 border-t border-red-500/20 pt-2 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span>1. Go to Firebase Authorized Domains</span>
                                                <a href={FIREBASE_CONSOLE_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-white flex items-center gap-1">
                                                    Open Console <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                            <div className="font-semibold text-white flex justify-between items-center">
                                                <span>2. Add this domain:</span>
                                                <button onClick={detectDomain} title="Refresh Domain" className="text-blue-400 hover:text-white"><RefreshCw className="w-3 h-3" /></button>
                                            </div>
                                            <div className="flex items-center gap-2 bg-black/40 p-2 rounded border border-red-500/30 group cursor-pointer" onClick={() => {
                                                navigator.clipboard.writeText(currentDomain);
                                                soundService.playPing();
                                            }}>
                                                <code className="flex-1 truncate font-mono text-blue-300 select-all">
                                                    {currentDomain}
                                                </code>
                                                <Copy className="w-3 h-3 text-gray-500 group-hover:text-white" />
                                            </div>
                                            <div className="text-[9px] text-gray-500 italic flex justify-between">
                                                <span>Click to copy</span>
                                                {currentDomain.includes('scf.usercontent.goog') && <span className="text-yellow-500/70 text-[8px]">Cloud Preview Mode Detected</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isRegistering ? (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <input
                                    type="email"
                                    placeholder={getTranslation(language, 'login.email_placeholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all focus:bg-black/40"
                                />
                                <input
                                    type="password"
                                    placeholder={getTranslation(language, 'login.password_placeholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all focus:bg-black/40"
                                />
                            </div>
                            <button
                                onClick={handleEmailRegister}
                                disabled={isLoading || !email || !password}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {loadingAction === 'register' ? <Activity className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                                <span>{getTranslation(language, 'login.create_account')}</span>
                            </button>
                            <button
                                onClick={handleEmailLogin}
                                disabled={isLoading || !email || !password}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
                            >
                                {loadingAction === 'signin' ? <Activity className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                <span>{getTranslation(language, 'login.signin_email')}</span>
                            </button>
                            <button
                                onClick={() => { setIsRegistering(false); setError(null); setIsDomainError(false); }}
                                className="w-full text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 mt-4"
                            >
                                <ArrowLeft className="w-3 h-3" /> {getTranslation(language, 'login.back_to_login')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1">
                            {/* Google & GitHub — always visible */}
                            <button
                                onClick={() => handleAuth('google')}
                                data-testid="login-google-btn"
                                disabled={isLoading || !firebaseReady}
                                className="w-full flex items-center justify-center gap-4 py-3.5 lg:py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {loadingAction === 'google' ? (
                                    <Activity className="w-5 h-5 animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                )}
                                <span>{getTranslation(language, 'login.signin_google')}</span>
                            </button>

                            <button
                                onClick={() => handleAuth('github')}
                                disabled={isLoading || !firebaseReady}
                                className="w-full flex items-center justify-center gap-4 py-3.5 lg:py-4 bg-[#24292e] border border-white/10 text-white font-bold rounded-xl hover:bg-[#2f363d] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {loadingAction === 'github' ? <Activity className="w-5 h-5 animate-spin" /> : <Github className="w-5 h-5" />}
                                <span>{getTranslation(language, 'login.signin_github')}</span>
                            </button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-white/10"></div>
                                <span className="flex-shrink-0 mx-4 text-xs text-gray-500 font-mono">{getTranslation(language, 'login.or')}</span>
                                <div className="flex-grow border-t border-white/10"></div>
                            </div>

                            <button
                                onClick={() => setIsRegistering(true)}
                                className="w-full flex items-center justify-center gap-4 py-3.5 lg:py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all group hover:border-purple-500/30"
                            >
                                <Mail className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
                                <span>{getTranslation(language, 'login.continue_email')}</span>
                            </button>

                            {!blockGuest && (
                            <button
                                onClick={handleGuestLogin}
                                data-testid="login-guest-btn"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-4 py-3.5 lg:py-4 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group bg-blue-900/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50"
                            >
                                <User className="w-5 h-5" />
                                <span>{getTranslation(language, 'login.continue_guest')}</span>
                            </button>
                            )}
                        </div>
                    )}
                </div>

                {!firebaseReady && (
                    <div className="mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-white/5 shrink-0">
                        <div className="flex items-center gap-3 justify-center text-yellow-500/80 mb-2">
                            <Lock className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">{getTranslation(language, 'login.demo_locked')}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                            {getTranslation(language, 'login.firebase_missing')} <br />
                            Update <code className="text-blue-400">services/firebaseService.ts</code>
                        </p>
                    </div>
                )}
            </div>

            <UserManagementModal isOpen={showUserManagement} onClose={() => setShowUserManagement(false)} language={language} />
        </div>
    );
};

export default LoginScreen;
