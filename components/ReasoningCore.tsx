
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { BrainCircuit, Sparkles, Zap, Activity, Radio, Eye, Cpu, Disc } from 'lucide-react';
import { Language, getTranslation } from '../services/i18n';

interface ReasoningCoreProps {
    thought: string | null;
    status: 'idle' | 'thinking' | 'generating' | 'complete';
    progress?: number;
    modelInfo?: string;
    mode?: 'card' | 'bar';
    language?: Language;
}

/** Split raw streaming text into segments, detecting "✦ Muse" brand prefixes */
function parseMuseSegments(text: string): { type: 'brand' | 'text'; value: string }[] {
    const segments: { type: 'brand' | 'text'; value: string }[] = [];
    const re = /✦\s*Muse/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        if (match.index > last) {
            segments.push({ type: 'text', value: text.slice(last, match.index) });
        }
        segments.push({ type: 'brand', value: '✦ Muse' });
        last = match.index + match[0].length;
    }
    if (last < text.length) {
        segments.push({ type: 'text', value: text.slice(last) });
    }
    return segments;
}

const ReasoningCore: React.FC<ReasoningCoreProps> = ({
    thought,
    status,
    progress = 0,
    modelInfo,
    mode = 'card',
    language = 'en'
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Typewriter effect
    useEffect(() => {
        if (thought) {
            setIsTyping(true);
            setDisplayedText('');
            let i = 0;
            const speed = 10; // Faster typing
            const typeWriter = setInterval(() => {
                if (i < thought.length) {
                    setDisplayedText(thought.slice(0, i + 1));
                    i++;
                    if (containerRef.current && mode === 'card') {
                        containerRef.current.scrollTop = containerRef.current.scrollHeight;
                    }
                } else {
                    clearInterval(typeWriter);
                    setIsTyping(false);
                }
            }, speed);
            return () => clearInterval(typeWriter);
        } else {
            setDisplayedText('');
            setIsTyping(false);
        }
    }, [thought, mode]);

    const getStatusIcon = () => {
        switch (status) {
            case 'thinking': return <BrainCircuit className="w-3 h-3 animate-pulse" />;
            case 'generating': return <img src="/muse-logo.svg" alt="" className="w-3 h-3 animate-spin" draggable={false} />;
            case 'complete': return <Zap className="w-3 h-3" />;
            default: return <Radio className="w-3 h-3 opacity-50" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'thinking': return 'text-purple-400 border-purple-500/30';
            case 'generating': return 'text-blue-400 border-blue-500/30';
            case 'complete': return 'text-green-400 border-green-500/30';
            default: return 'text-gray-500 border-gray-700';
        }
    };

    const isActive = status === 'thinking' || status === 'generating';

    /** Render displayed text with branded "✦ Muse" segments highlighted */
    const renderedSegments = useMemo(() => {
        if (!displayedText) return null;
        const segments = parseMuseSegments(displayedText);
        return segments.map((seg, i) =>
            seg.type === 'brand' ? (
                <span key={i} className={isActive ? 'muse-shimmer-active' : 'muse-gradient-text'}>
                    {seg.value}
                </span>
            ) : (
                <span key={i}>{seg.value}</span>
            )
        );
    }, [displayedText, isActive]);

    // --- BAR MODE LAYOUT ---
    if (mode === 'bar') {
        return (
            <div 
                className={`
                    relative w-full border-t backdrop-blur-xl transition-all duration-300
                    flex flex-col
                    ${getStatusColor()}
                    ${isActive ? 'muse-border-active bg-black/70' : status === 'complete' ? 'bg-black/60' : ''}
                    ${status === 'idle' ? 'opacity-0 translate-y-full hover:opacity-100 hover:translate-y-0' : 'opacity-100 translate-y-0'}
                `}
                style={{
                    borderTopColor: 'var(--border-color)',
                    ...(status === 'idle' && !isActive ? { background: 'var(--glass-gradient)' } : {})
                }}
            >
                {/* Progress Line (Top Edge) */}
                {isActive && (
                    <div className="absolute top-0 left-0 h-[2px] w-full bg-gray-800/60 overflow-hidden">
                        <div
                            className="h-full transition-all duration-300"
                            style={{
                                width: `${progress}%`,
                                background: `linear-gradient(to right, var(--accent-primary), var(--accent-secondary))`,
                                boxShadow: `0 0 8px var(--accent-primary)`
                            }}
                        />
                    </div>
                )}

                <div className="flex items-center justify-between px-4 py-2 gap-4 h-12">
                    {/* Left: Muse Brand + Status */}
                    <div className="flex items-center gap-2.5 min-w-fit">
                        <div 
                            className={`p-1.5 rounded-md transition-colors ${
                                isActive 
                                    ? '' 
                                    : status === 'complete' 
                                        ? 'bg-green-500/10' 
                                        : 'bg-white/5'
                            }`}
                            style={isActive ? {
                                backgroundColor: 'var(--accent-primary)',
                                opacity: 0.1
                            } : {}}
                        >
                            {getStatusIcon()}
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${isActive ? 'muse-shimmer-active' : 'muse-gradient-text'}`}>
                                Muse
                            </span>
                            <span className="text-[8px] font-mono opacity-50 tracking-wider mt-0.5">
                                {status === 'thinking' ? getTranslation(language, 'reasoning.thinking') : status === 'generating' ? getTranslation(language, 'reasoning.creating') : status === 'complete' ? getTranslation(language, 'reasoning.done') : getTranslation(language, 'reasoning.ready')}
                                {modelInfo && <span className="ml-1.5 opacity-70">· {modelInfo}</span>}
                            </span>
                        </div>
                    </div>

                    {/* Center: Thought Stream (Single Line) */}
                    <div className="flex-1 overflow-hidden relative">
                        <div className={`font-mono text-xs truncate text-center px-4 ${isActive ? 'text-gray-200 muse-glow' : 'text-gray-400'}`}>
                            {renderedSegments || <span className="opacity-30 italic text-[11px]">{getTranslation(language, 'reasoning.awaiting')}</span>}
                            {isTyping && (
                                <span 
                                    className="inline-block w-1.5 h-3.5 ml-1 animate-pulse align-middle rounded-sm" 
                                    style={{ backgroundColor: 'var(--accent-primary)' }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right: Activity Graphic */}
                    <div className={`flex items-center gap-1 min-w-fit transition-opacity ${isActive ? 'opacity-80' : 'opacity-30'}`}>
                        <Activity 
                            className={`w-3 h-3 ${isActive ? 'animate-pulse' : ''}`}
                            style={isActive ? { color: 'var(--accent-primary)' } : {}}
                        />
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className={`w-0.5 rounded-full transition-all ${isActive ? 'animate-bounce' : 'bg-current'}`}
                                style={{
                                    height: isActive ? '10px' : '6px',
                                    animationDelay: `${i * 0.12}s`,
                                    ...(isActive ? { backgroundColor: 'var(--accent-primary)' } : {})
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- CARD MODE LAYOUT (Original) ---
    return (
        <div className={`
      relative overflow-hidden rounded-2xl border backdrop-blur-xl
      bg-black/60 transition-all duration-500
      ${getStatusColor()}
      ${status === 'idle' ? 'opacity-40' : 'opacity-100'}
    `}>
            {/* Animated Background Grid */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
                    backgroundSize: '20px 20px',
                    animation: status !== 'idle' ? 'gridMove 20s linear infinite' : 'none'
                }} />
            </div>

            {/* Scanning Line Effect */}
            {status === 'thinking' && (
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                        style={{
                            animation: 'scanLine 2s ease-in-out infinite',
                            top: '50%',
                            opacity: 0.5
                        }}
                    />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className={`
            p-1.5 rounded-lg 
            ${status === 'thinking' ? 'bg-purple-500/20' : status === 'generating' ? 'bg-blue-500/20' : 'bg-gray-800'}
          `}>
                        {getStatusIcon()}
                    </div>
                    <div>
                        <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/80">
                            {getTranslation(language, 'reasoning.core')}
                        </h3>
                        <p className={`text-[9px] font-mono tracking-wider ${getStatusColor()}`}>
                            {status === 'thinking' ? getTranslation(language, 'reasoning.neural') :
                                status === 'generating' ? getTranslation(language, 'reasoning.artifact') :
                                    status === 'complete' ? getTranslation(language, 'reasoning.status.complete') : getTranslation(language, 'reasoning.status.waiting')}
                        </p>
                    </div>
                </div>

                {/* Activity Indicator */}
                <div className="flex items-center gap-2">
                    {status !== 'idle' && (
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1 bg-current rounded-full transition-all`}
                                    style={{
                                        height: `${Math.random() * 12 + 4}px`,
                                        animation: status !== 'complete' ? `barPulse 0.5s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
                                        opacity: status === 'complete' ? 0.3 : 1
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    <Eye className={`w-3 h-3 ${status !== 'idle' ? 'animate-pulse' : 'opacity-30'}`} />
                </div>
            </div>

            {/* Thought Content */}
            <div
                ref={containerRef}
                className="px-4 py-3 max-h-32 overflow-y-auto custom-scrollbar"
            >
                {displayedText ? (
                    <p className="font-mono text-xs leading-relaxed text-gray-300">
                        <span className="text-purple-400 mr-2">{'>'}</span>
                        {displayedText}
                        {isTyping && (
                            <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-pulse" />
                        )}
                    </p>
                ) : (
                    <p className="font-mono text-xs text-gray-600 italic">
                        Neural pathways dormant. Awaiting gesture activation...
                    </p>
                )}
            </div>

            {/* Progress Bar */}
            {status !== 'idle' && status !== 'complete' && (
                <div className="px-4 pb-3">
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${status === 'thinking' ? 'bg-gradient-to-r from-purple-600 to-pink-500' :
                                'bg-gradient-to-r from-blue-600 to-cyan-400'
                                }`}
                            style={{
                                width: `${progress}%`,
                                boxShadow: `0 0 10px ${status === 'thinking' ? '#a855f7' : '#3b82f6'}`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Model Info Footer */}
            {modelInfo && (
                <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500">
                        <Cpu className="w-3 h-3" />
                        <span>{modelInfo}</span>
                    </div>
                    <Disc className={`w-3 h-3 text-gray-600 ${status !== 'idle' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                </div>
            )}

            {/* Corner Decorations */}
            <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-current opacity-50" />
            <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-current opacity-50" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-current opacity-50" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-current opacity-50" />
        </div>
    );
};

export default ReasoningCore;
