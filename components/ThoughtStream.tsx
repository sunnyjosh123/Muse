import React, { useEffect, useRef, useState } from 'react';
import { BrainCircuit, Cpu, Sparkles, Terminal } from 'lucide-react';

interface ThoughtStreamProps {
    thought: string;
    isReasoning: boolean;
}

const ThoughtStream: React.FC<ThoughtStreamProps> = ({ thought, isReasoning }) => {
    const [visibleLines, setVisibleLines] = useState<string[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Effect to handle streaming updates
    useEffect(() => {
        if (!thought) {
            if (!isReasoning && visibleLines.length > 0) {
                // Clear after delay
                const timer = setTimeout(() => setVisibleLines([]), 5000);
                return () => clearTimeout(timer);
            }
            return;
        }

        // Split by thinking steps or newlines
        // This simulates a log stream
        const lines = thought.split('\n').filter(Boolean);
        setVisibleLines(lines.slice(-5)); // Keep last 5 lines

    }, [thought, isReasoning]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visibleLines]);

    if (visibleLines.length === 0 && !isReasoning) return null;

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl pointer-events-none">
            <div className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--accent-secondary)]/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(var(--accent-secondary),0.2)] animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-[var(--accent-primary)]/10 px-4 py-2 flex items-center justify-between border-b border-[var(--accent-secondary)]/20">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className={`w-4 h-4 text-[var(--accent-secondary)] ${isReasoning ? 'animate-pulse' : ''}`} />
                        <span className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                            Gemini 3 Thought Stream
                        </span>
                    </div>
                    {isReasoning && (
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[var(--accent-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-[var(--accent-secondary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-[var(--accent-secondary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    )}
                </div>

                <div className="p-4 font-mono text-sm space-y-2 max-h-48 overflow-y-auto">
                    {visibleLines.map((line, idx) => (
                        <div key={idx} className="text-[var(--text-primary)] leading-relaxed flex gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                            <span className="text-[var(--accent-primary)] select-none">›</span>
                            <span className="typing-effect">{line}</span>
                        </div>
                    ))}
                    {isReasoning && (
                        <div className="flex gap-2 text-[var(--text-secondary)] animate-pulse">
                            <span>›</span>
                            <span className="italic">Reasoning...</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Decorative Tech Lines */}
                <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-[var(--accent-primary)]/5 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[var(--accent-secondary)]/50 to-transparent" />
            </div>
        </div>
    );
};

export default ThoughtStream;
