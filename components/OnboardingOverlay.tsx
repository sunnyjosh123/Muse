import React, { useEffect, useState, useRef } from 'react';
import { Language, getTranslation } from '../services/i18n';
import { BrainCircuit, Sparkles, Activity, Fingerprint } from 'lucide-react';

interface OnboardingOverlayProps {
    username: string;
    emotion: 'Joy' | 'Calm' | 'Neutral';
    language: Language;
    onComplete: () => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ username, emotion, language, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState<'scanning' | 'analyzing' | 'welcome' | 'dynamic' | 'closing'>('scanning');
    const [text, setText] = useState('');
    
    // Refs for speech synthesis to ensure clean cleanup
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    const speak = (textToSpeak: string, onEnd?: () => void) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop any previous speech
            const utter = new SpeechSynthesisUtterance(textToSpeak);
            utter.rate = 0.95;
            utter.pitch = 1.0;
            // Try to select a good voice based on language
            const voices = window.speechSynthesis.getVoices();
            if (language === 'zh') {
                const zhVoice = voices.find(v => v.lang.includes('zh'));
                if (zhVoice) utter.voice = zhVoice;
            } else {
                const enVoice = voices.find(v => v.lang.includes('en'));
                if (enVoice) utter.voice = enVoice;
            }
            
            utter.onend = () => {
                if (onEnd) onEnd();
            };
            
            speechRef.current = utter;
            window.speechSynthesis.speak(utter);
        } else {
            // Fallback if no TTS
            if (onEnd) setTimeout(onEnd, 3000); 
        }
    };

    useEffect(() => {
        // Step 1: Scanning Progress (0-100%)
        if (stage === 'scanning') {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setStage('welcome');
                        return 100;
                    }
                    return prev + 2; // ~2.5 seconds to reach 100
                });
            }, 30);
            return () => clearInterval(interval);
        }
    }, [stage]);

    useEffect(() => {
        if (stage === 'welcome') {
            const welcomeMsg = getTranslation(language, 'onboarding.welcome') + username + ".";
            setText(welcomeMsg);
            speak(welcomeMsg, () => {
                setStage('dynamic');
            });
        } else if (stage === 'dynamic') {
            const dynamicKey = (emotion === 'Joy' || emotion === 'Neutral') ? 'onboarding.joy' : 'onboarding.calm'; 
            // Defaulting Neutral to Joy for now as per prompt "Joy/Calm", usually Neutral maps to Calm but user said "Joy/Calm" logic.
            // User logic: Smile/Surprise -> Joy, Else -> Calm. 
            // My previous implementation in MagicCanvas: 
            // const emotion = expr === 'SMILE' || expr === 'SURPRISE' ? 'Joy' : 'Calm';
            // So 'Neutral' shouldn't happen if MagicCanvas logic is used, but type has it.
            // I'll stick to emotion passed.
            
            // Correction: MagicCanvas logic:
            // const emotion = expr === 'SMILE' || expr === 'SURPRISE' ? 'Joy' : 'Calm';
            // So emotion is either Joy or Calm.
            
            const dynamicMsg = getTranslation(language, emotion === 'Joy' ? 'onboarding.joy' : 'onboarding.calm');
            setText(dynamicMsg);
            speak(dynamicMsg, () => {
                setStage('closing');
            });
        } else if (stage === 'closing') {
            const closingMsg = getTranslation(language, 'onboarding.closing');
            setText(closingMsg);
            speak(closingMsg, () => {
                setTimeout(onComplete, 1000);
            });
        }
    }, [stage, language, username, emotion, onComplete]);

    // Initial voice load (sometimes needed for browsers)
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }
    }, []);

    return (
        <div className="absolute inset-0 z-[55] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-500">
            <div className="w-full max-w-2xl p-8 flex flex-col items-center gap-8">
                
                {/* HUD Circle */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                            cx="64" cy="64" r="60"
                            fill="none"
                            stroke="#333"
                            strokeWidth="4"
                        />
                        <circle
                            cx="64" cy="64" r="60"
                            fill="none"
                            stroke={emotion === 'Joy' ? '#fbbf24' : '#60a5fa'} // Amber for Joy, Blue for Calm
                            strokeWidth="4"
                            strokeDasharray="377"
                            strokeDashoffset={377 - (377 * progress) / 100}
                            className="transition-all duration-100 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                         {progress < 100 ? (
                            <Fingerprint className="w-12 h-12 text-gray-400 opacity-50" />
                         ) : (
                            <BrainCircuit className={`w-12 h-12 ${emotion === 'Joy' ? 'text-amber-400' : 'text-blue-400'}`} />
                         )}
                    </div>
                </div>

                {/* Text Display */}
                <div className="text-center space-y-4 min-h-[120px]">
                    <h2 className="text-xl font-mono text-gray-400 tracking-widest uppercase">
                        {progress < 100 ? getTranslation(language, 'onboard.initializing') : getTranslation(language, 'onboard.established')}
                    </h2>
                    
                    {stage !== 'scanning' && (
                        <p className={`text-2xl md:text-3xl font-bold leading-relaxed transition-all duration-500 ${
                            stage === 'dynamic' ? (emotion === 'Joy' ? 'text-amber-200' : 'text-blue-200') : 'text-white'
                        }`}>
                            "{text}"
                        </p>
                    )}
                </div>

                {/* Footer / Interaction Prompt */}
                {stage === 'closing' && (
                     <div className="animate-bounce mt-8 text-gray-500 text-sm font-mono">
                        {getTranslation(language, 'onboard.waiting')}
                     </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingOverlay;
