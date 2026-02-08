import React, { useState } from 'react';
import { X, Check, Star, Zap, Crown, Shield } from 'lucide-react';
import { soundService } from '../services/soundService';
import { UserTier } from '../types';
import { Language, getTranslation } from '../services/i18n';
import { getThemeModalStyles } from '../services/themeUtils';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    currentTier?: UserTier;
    language?: Language;
    theme?: string;
    accessibilityMode?: boolean;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onUpgrade, currentTier, language = 'en', theme = 'retro', accessibilityMode = false }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

    if (!isOpen) return null;

    const themeStyles = getThemeModalStyles(theme);
    const isPro = currentTier === 'pro';

    const handlePayment = () => {
        soundService.playClick();
        setIsLoading(true);
        // Mock payment delay
        setTimeout(() => {
            setIsLoading(false);
            soundService.playSuccess();
            onUpgrade();
            onClose();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
            
            <div className={`relative w-full max-w-4xl ${themeStyles} border rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-300`}>
                
                {/* Left Side: Visual & Value Prop */}
                <div className="w-full md:w-2/5 bg-gradient-to-br from-purple-900 to-blue-900 p-8 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mb-6">
                            <Crown className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">{getTranslation(language, 'sub.title')}</h2>
                        <p className="text-purple-200 text-sm leading-relaxed">
                            {getTranslation(language, 'sub.desc')}
                        </p>
                    </div>

                    <div className="relative z-10 space-y-4 mt-8">
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.unlimited')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.4k')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.cloud')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.commercial')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.share')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.themes')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.persona')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-blue-500/20 text-blue-400"><Star className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.3d')}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">{getTranslation(language, 'sub.feature.coming_soon')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="p-1 rounded-full bg-blue-500/20 text-blue-400"><Star className="w-3 h-3" /></div>
                            <span>{getTranslation(language, 'sub.feature.genie')}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">{getTranslation(language, 'sub.feature.coming_soon')}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Plans & Payment */}
                <div className="w-full md:w-3/5 p-8 bg-[#0f172a] relative">
                    <button 
                        onClick={onClose} 
                        className={`absolute top-4 right-4 ${accessibilityMode ? 'px-3 py-1.5 rounded-xl flex items-center gap-2' : 'p-2 rounded-full'} hover:bg-white/5 text-gray-400 hover:text-white transition-all`}
                        aria-label={getTranslation(language, 'action.close')}
                        title={getTranslation(language, 'action.close')}
                    >
                        <X className="w-5 h-5" />
                        {accessibilityMode && <span className="text-xs">{getTranslation(language, 'action.close')}</span>}
                    </button>

                    <h3 className="text-xl font-bold text-white mb-6">{getTranslation(language, 'sub.choose_plan')}</h3>

                    <div className="space-y-4 mb-8">
                        {/* Monthly Plan */}
                        <div className="relative group cursor-pointer" onClick={() => setSelectedPlan('monthly')}>
                            <div className={`absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl transition-opacity blur-sm ${selectedPlan === 'monthly' ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'}`}></div>
                            <div className={`relative bg-[#1e293b] border rounded-xl p-4 flex items-center justify-between transition-all ${selectedPlan === 'monthly' ? 'border-blue-500/50' : 'border-white/10 group-hover:border-transparent'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                        {selectedPlan === 'monthly' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold">{getTranslation(language, 'sub.plan.monthly')}</div>
                                        <div className="text-xs text-gray-400">{getTranslation(language, 'sub.plan.monthly.desc')}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-bold text-xl">$9.99</div>
                                    <div className="text-xs text-gray-400">/mo</div>
                                </div>
                            </div>
                        </div>

                        {/* Yearly Plan */}
                        <div className="relative group cursor-pointer" onClick={() => setSelectedPlan('yearly')}>
                            <div className="absolute -top-3 left-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full z-20">
                                {getTranslation(language, 'sub.plan.save')}
                            </div>
                            <div className={`relative bg-[#1e293b] border rounded-xl p-4 flex items-center justify-between hover:bg-[#253045] transition-all ${selectedPlan === 'yearly' ? 'border-yellow-500/50 opacity-100' : 'border-white/10 opacity-60 hover:opacity-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-yellow-500' : 'border-gray-600'}`}>
                                        {selectedPlan === 'yearly' && <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold">{getTranslation(language, 'sub.plan.yearly')}</div>
                                        <div className="text-xs text-gray-400">{getTranslation(language, 'sub.plan.yearly.desc')}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-bold text-xl">$95.99</div>
                                    <div className="text-xs text-gray-400">/yr</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subscribe Button */}
                    <button
                        onClick={handlePayment}
                        disabled={isLoading}
                        className="w-full h-14 bg-gradient-to-r from-white to-gray-200 text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-lg tracking-wide"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                <span>{getTranslation(language, 'sub.action.processing')}</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 w-full">
                                <Zap className="w-5 h-5 fill-black" />
                                <span>{getTranslation(language, 'sub.action.subscribe')}</span>
                            </div>
                        )}
                    </button>
                    
                    <p className="text-[10px] text-gray-500 text-center mt-4">
                        {getTranslation(language, 'sub.footer')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
