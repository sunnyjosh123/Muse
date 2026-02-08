import React, { useState } from 'react';
import { X, Settings, Palette, LogOut, Globe, User, Crown, Database, BrainCircuit, Lock, ChevronDown, Volume2, Hand } from 'lucide-react';
import { ThemeMode, UserTier } from '../types';
import { Language, languages, getTranslation } from '../services/i18n';
import { getThemeModalStyles } from '../services/themeUtils';
import { a11yService } from '../services/accessibilityService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: ThemeMode;
    onThemeSelect: (theme: ThemeMode) => void;
    language: Language;
    onLanguageChange: (lang: Language) => void;
    onLogout?: () => void;
    username?: string | null;
    userTier?: UserTier;
    onOpenUserMgmt?: () => void;
    enableMemory?: boolean;
    onEnableMemoryChange?: (enabled: boolean) => void;
    customInstructions?: string;
    onCustomInstructionsChange?: (instructions: string) => void;
    onUpgradeRequest?: () => void;
    accessibilityMode?: boolean;
    onAccessibilityModeChange?: (enabled: boolean) => void;
}

const PRO_THEMES: ThemeMode[] = ['alchemist', 'comic', 'game'];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, theme, onThemeSelect, language, onLanguageChange, onLogout,
    username, userTier = 'free', onOpenUserMgmt,
    enableMemory = false, onEnableMemoryChange, customInstructions = '', onCustomInstructionsChange,
    onUpgradeRequest, accessibilityMode = false, onAccessibilityModeChange
}) => {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    // Haptic feedback toggle (persisted in localStorage)
    const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
        try { const v = localStorage.getItem('muse-haptic'); return v === null ? true : v === 'true'; } catch { return true; }
    });
    // Audio announcements toggle (persisted in localStorage)
    const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
        try { const v = localStorage.getItem('muse-audio-announce'); return v === null ? true : v === 'true'; } catch { return true; }
    });

    if (!isOpen) return null;

    const themeOptions: { key: ThemeMode; label: string; color: string; desc: string }[] = [
        { key: 'cyberpunk', label: getTranslation(language, 'theme.name.cyberpunk'), color: '#00f0ff', desc: getTranslation(language, 'theme.desc.cyberpunk') },
        { key: 'zen', label: getTranslation(language, 'theme.name.zen'), color: '#10b981', desc: getTranslation(language, 'theme.desc.zen') },
        { key: 'retro', label: getTranslation(language, 'theme.name.retro'), color: '#ff9e64', desc: getTranslation(language, 'theme.desc.retro') },
        { key: 'alchemist', label: getTranslation(language, 'theme.name.alchemist'), color: '#f59e0b', desc: getTranslation(language, 'theme.desc.alchemist') },
        { key: 'comic', label: getTranslation(language, 'theme.name.comic'), color: '#ec4899', desc: getTranslation(language, 'theme.desc.comic') },
        { key: 'game', label: getTranslation(language, 'theme.name.game'), color: '#ef4444', desc: getTranslation(language, 'theme.desc.game') },
    ];

    const themeStyles = getThemeModalStyles(theme);

    return (
        <div data-testid="settings-modal" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className={`${themeStyles} border w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl relative overflow-hidden`}>
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <Settings className="w-6 h-6 text-gray-400" />
                        {getTranslation(language, 'settings.title')}
                    </h2>
                    <button onClick={onClose} data-testid="settings-close" className={`${accessibilityMode ? 'px-3 py-1.5 rounded-xl flex items-center gap-2' : 'p-2 rounded-full'} hover:bg-white/10 transition-colors`} aria-label={getTranslation(language, 'action.close')} title={getTranslation(language, 'action.close')}>
                        <X className="w-5 h-5 text-gray-400" />
                        {accessibilityMode && <span className="text-xs text-gray-400">{getTranslation(language, 'action.close')}</span>}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                            {/* User Info & Sign Out */}
                            {username && (
                                <div>
                                    <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        {getTranslation(language, 'settings.user.profile')}
                                    </h3>
                                    <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                        <div className="flex-1 p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                                                {username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-bold text-lg truncate">{username === 'Operator' || username === 'GUEST' ? getTranslation(language, 'user.guest') : username}</div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full border ${userTier === 'pro' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
                                                        {userTier === 'pro' ? getTranslation(language, 'user.tier.pro') : getTranslation(language, 'user.tier.free')}
                                                    </span>
                                                </div>
                                            </div>
                                            {userTier === 'pro' && <Crown className="w-5 h-5 text-amber-500 shrink-0" />}
                                        </div>

                                        {/* Sign Out Button */}
                                        {onLogout && (
                                            <button
                                                onClick={() => {
                                                    onLogout();
                                                    onClose();
                                                }}
                                                className="w-20 bg-red-500/10 border-l border-white/10 text-red-400 text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-red-500/20 transition-all shrink-0"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                {getTranslation(language, 'settings.user.signout')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                    {/* Language Section */}
                    <div>
                        <button 
                            onClick={() => setExpandedSection(expandedSection === 'language' ? null : 'language')}
                            className="w-full text-sm font-mono text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2 hover:text-gray-300 transition-colors py-2"
                        >
                            <Globe className="w-4 h-4" />
                            <span className="flex-1 text-left">{getTranslation(language, 'settings.language.title')}</span>
                            <span className="text-xs text-[var(--accent-primary)] font-bold normal-case tracking-normal">{languages[language]}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'language' ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedSection === 'language' && (
                            <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                                {(Object.keys(languages) as Language[]).map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => onLanguageChange(lang)}
                                        className={`
                                            px-4 py-3 rounded-xl border text-sm font-bold transition-all text-left flex items-center justify-between
                                            ${language === lang 
                                                ? 'bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                                                : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10 hover:text-gray-200'}
                                        `}
                                    >
                                        <span>{languages[lang]}</span>
                                        {language === lang && <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Theme Section */}
                    <div>
                        <button 
                            onClick={() => setExpandedSection(expandedSection === 'theme' ? null : 'theme')}
                            className="w-full text-sm font-mono text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2 hover:text-gray-300 transition-colors py-2"
                        >
                            <Palette className="w-4 h-4" />
                            <span className="flex-1 text-left">{getTranslation(language, 'settings.theme.title')}</span>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeOptions.find(t => t.key === theme)?.color }}></div>
                                <span className="text-xs text-[var(--accent-primary)] font-bold normal-case tracking-normal">{themeOptions.find(t => t.key === theme)?.label}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'theme' ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedSection === 'theme' && (
                            <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-top-2 duration-200">
                                {themeOptions.map((t) => {
                                    const isLocked = PRO_THEMES.includes(t.key) && userTier !== 'pro';
                                    return (
                                    <button
                                        key={t.key}
                                        data-testid={`theme-option-${t.key}`}
                                        onClick={() => {
                                            if (isLocked) {
                                                onUpgradeRequest?.();
                                            } else {
                                                onThemeSelect(t.key);
                                            }
                                        }}
                                        className={`
                                            flex items-center justify-between p-4 rounded-xl border transition-all group relative
                                            ${isLocked
                                                ? 'bg-black/20 border-white/5 opacity-60 hover:opacity-80 hover:border-amber-500/20'
                                                : theme === t.key 
                                                    ? 'bg-white/10 border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.3)]' 
                                                    : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'}
                                        `}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div 
                                                className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/10 transition-transform group-hover:scale-110`}
                                                style={{ backgroundColor: `${t.color}20` }}
                                            >
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }}></div>
                                            </div>
                                            <div className="text-left">
                                                <div className={`font-bold ${isLocked ? 'text-gray-500' : theme === t.key ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                    {t.label}
                                                </div>
                                                <div className="text-xs text-gray-600 font-mono">
                                                    {t.desc}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {isLocked ? (
                                            <div className="flex items-center gap-1.5">
                                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pro</span>
                                            </div>
                                        ) : theme === t.key ? (
                                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                                        ) : null}
                                    </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Championship Tuning Section (Persona & Memory) - Pro Only */}
                    <div>
                        <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4" />
                            {getTranslation(language, 'settings.persona.title') || 'Muse Persona & Memory'}
                            {userTier !== 'pro' && <span className="ml-auto flex items-center gap-1 text-amber-500"><Lock className="w-3 h-3" /><span className="text-[10px] font-bold uppercase tracking-wider">Pro</span></span>}
                        </h3>
                        
                        <div className={`bg-black/20 border border-white/5 rounded-xl p-4 space-y-4 ${userTier !== 'pro' ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Memory Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${enableMemory ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400'}`}>
                                        <Database className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-200">
                                            {getTranslation(language, 'settings.memory.label') || 'Enable Memory'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {getTranslation(language, 'settings.memory.desc') || 'Remember context from past conversations'}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onEnableMemoryChange?.(!enableMemory)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${enableMemory ? 'bg-purple-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enableMemory ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Custom Instructions */}
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 flex items-center gap-2">
                                    <img src="/muse-logo.svg" alt="" className="w-3 h-3" draggable={false} />
                                    {getTranslation(language, 'settings.custom.label') || 'Custom Instructions (System Prompt)'}
                                </label>
                                <textarea
                                    value={customInstructions}
                                    onChange={(e) => onCustomInstructionsChange?.(e.target.value)}
                                    spellCheck={false}
                                    placeholder={getTranslation(language, 'settings.custom.placeholder') || "e.g. You are a cynical cyberpunk AI. Keep answers short and poetic..."}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none min-h-[80px]"
                                />
                            </div>
                        </div>
                        {userTier !== 'pro' && (
                            <div className="mt-3 flex justify-center">
                                <button onClick={() => onUpgradeRequest?.()} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-sm font-bold rounded-xl shadow-lg hover:shadow-amber-500/30 hover:scale-105 transition-all flex items-center gap-2">
                                    <Crown className="w-4 h-4" />
                                    {getTranslation(language, 'action.upgrade')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Enhanced Accessibility Section */}
                    <div>
                        <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <img src="/muse-logo.svg" alt="" className="w-4 h-4" draggable={false} />
                            {getTranslation(language, 'settings.accessibility.label')}
                        </h3>
                        <div className="space-y-3">
                            {/* Button Text Labels Toggle */}
                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${accessibilityMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400'}`}>
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-200">
                                                {getTranslation(language, 'settings.a11y.labels.title')}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {getTranslation(language, 'settings.a11y.labels.desc')}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onAccessibilityModeChange?.(!accessibilityMode)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${accessibilityMode ? 'bg-blue-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${accessibilityMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Audio Announcements */}
                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${audioEnabled ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'}`}>
                                            <Volume2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-200">
                                                {getTranslation(language, 'settings.a11y.audio.title')}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {getTranslation(language, 'settings.a11y.audio.desc')}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newVal = !audioEnabled;
                                            setAudioEnabled(newVal);
                                            a11yService.setSpeechEnabled(newVal);
                                            try { localStorage.setItem('muse-audio-announce', newVal ? 'true' : 'false'); } catch {}
                                        }}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${audioEnabled ? 'bg-green-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${audioEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Haptic Feedback */}
                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${hapticEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400'}`}>
                                            <Hand className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-200">
                                                {getTranslation(language, 'settings.a11y.haptic.title')}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {getTranslation(language, 'settings.a11y.haptic.desc')}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newVal = !hapticEnabled;
                                            setHapticEnabled(newVal);
                                            a11yService.setHapticEnabled(newVal);
                                            try { localStorage.setItem('muse-haptic', newVal ? 'true' : 'false'); } catch {}
                                            // Give immediate feedback if turning on
                                            if (newVal) a11yService.haptic('tap');
                                        }}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${hapticEnabled ? 'bg-purple-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${hapticEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Logout Section - Removed */}
                </div>

            </div>
        </div>
    );
};

export default SettingsModal;
