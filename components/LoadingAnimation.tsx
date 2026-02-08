import React, { useEffect, useState, useMemo } from 'react';
import { Sparkles, Zap, Wand2, Palette, Film, Brain } from 'lucide-react';

interface LoadingAnimationProps {
    stage: 'thinking' | 'painting' | 'directing' | 'idle';
    progress?: number;
    message?: string;
}

// --- Fun Messages Per Stage ---
const thinkingMessages = [
    "Channeling artistic frequencies...",
    "Consulting the color wheel of destiny...",
    "Decoding your creative DNA...",
    "Mining the depths of imagination...",
    "Aligning aesthetic parameters...",
    "Calibrating the muse engine...",
    "Reading between the brushstrokes...",
    "Translating vision to light...",
    "Processing creative wavelengths...",
    "Harmonizing composition elements...",
    "Exploring chromatic possibilities...",
    "Weaving visual narratives...",
    "Distilling artistic essence...",
    "Mapping the creative cosmos...",
    "Tuning the inspiration matrix...",
];

const paintingMessages = [
    "Mixing digital pigments...",
    "Layering luminance and shadow...",
    "Rendering photons into art...",
    "Sculpting pixels with precision...",
    "Infusing colors with emotion...",
    "Composing the visual symphony...",
    "Painting with neural brushes...",
    "Crafting every pixel with care...",
    "Blending reality and imagination...",
    "Applying artistic algorithms...",
    "Illuminating the canvas...",
    "Manifesting your vision...",
    "Fine-tuning the masterpiece...",
    "Adding the finishing touches...",
    "Bringing imagination to life...",
];

const directingMessages = [
    "Setting up the virtual camera...",
    "Choreographing pixel dancers...",
    "Directing the digital actors...",
    "Animating frame by frame...",
    "Adding cinematic motion...",
    "Orchestrating the timeline...",
    "Rendering motion sequences...",
    "Compositing visual layers...",
    "Applying motion dynamics...",
    "Synchronizing animation curves...",
    "Building temporal harmony...",
    "Crafting fluid transitions...",
    "Encoding visual poetry...",
    "Polishing the final cut...",
    "Rolling the virtual camera...",
];

const stageMessagesMap: Record<string, string[]> = {
    thinking: thinkingMessages,
    painting: paintingMessages,
    directing: directingMessages,
};

/**
 * Enhanced Loading Animation Component
 * Shows different animations based on the generation stage
 */
const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
    stage,
    progress = 0,
    message
}) => {
    const [dots, setDots] = useState('');
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
    const [funMessageIndex, setFunMessageIndex] = useState(0);
    const [messageFade, setMessageFade] = useState(true);

    // Animated dots effect
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Generate floating particles
    useEffect(() => {
        const newParticles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 2
        }));
        setParticles(newParticles);
    }, [stage]);

    // Rotating fun messages every 3 seconds with fade transition
    useEffect(() => {
        const msgs = stageMessagesMap[stage];
        if (!msgs) return;
        setFunMessageIndex(0);
        setMessageFade(true);

        const interval = setInterval(() => {
            // Fade out
            setMessageFade(false);
            // After fade-out, swap message and fade in
            setTimeout(() => {
                setFunMessageIndex(prev => (prev + 1) % msgs.length);
                setMessageFade(true);
            }, 300);
        }, 3000);
        return () => clearInterval(interval);
    }, [stage]);

    const currentFunMessage = useMemo(() => {
        const msgs = stageMessagesMap[stage];
        if (!msgs) return '';
        return msgs[funMessageIndex % msgs.length];
    }, [stage, funMessageIndex]);

    const getStageConfig = () => {
        switch (stage) {
            case 'thinking':
                return {
                    icon: Brain,
                    color: 'from-purple-600 to-pink-500',
                    glow: 'shadow-purple-500/50',
                    borderColor: 'border-purple-500/30',
                    title: 'Muse is Thinking',
                    subtitle: 'Analyzing your creative vision...',
                    blobColor1: 'rgba(147, 51, 234, 0.07)',
                    blobColor2: 'rgba(168, 85, 247, 0.05)',
                    blobColor3: 'rgba(192, 132, 252, 0.06)',
                    estimatedTime: '10-20s',
                };
            case 'painting':
                return {
                    icon: Palette,
                    color: 'from-cyan-600 to-blue-500',
                    glow: 'shadow-cyan-500/50',
                    borderColor: 'border-cyan-500/30',
                    title: 'Painting Your Vision',
                    subtitle: 'Gemini 2.5 Flash is creating...',
                    blobColor1: 'rgba(6, 182, 212, 0.07)',
                    blobColor2: 'rgba(34, 211, 238, 0.05)',
                    blobColor3: 'rgba(103, 232, 249, 0.06)',
                    estimatedTime: '15-30s',
                };
            case 'directing':
                return {
                    icon: Film,
                    color: 'from-pink-600 to-purple-500',
                    glow: 'shadow-pink-500/50',
                    borderColor: 'border-pink-500/30',
                    title: 'Directing Your Scene',
                    subtitle: 'Muse Video is animating...',
                    blobColor1: 'rgba(219, 39, 119, 0.07)',
                    blobColor2: 'rgba(236, 72, 153, 0.05)',
                    blobColor3: 'rgba(244, 114, 182, 0.06)',
                    estimatedTime: '20-45s',
                };
            default:
                return {
                    icon: Sparkles,
                    color: 'from-blue-600 to-cyan-500',
                    glow: 'shadow-blue-500/50',
                    borderColor: 'border-blue-500/30',
                    title: 'Preparing',
                    subtitle: 'Getting ready...',
                    blobColor1: 'rgba(37, 99, 235, 0.07)',
                    blobColor2: 'rgba(59, 130, 246, 0.05)',
                    blobColor3: 'rgba(96, 165, 250, 0.06)',
                    estimatedTime: '5-10s',
                };
        }
    };

    const config = getStageConfig();
    const IconComponent = config.icon;

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden min-h-0">

            {/* === DYNAMIC BACKGROUND LAYER === */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">

                {/* 1. Flowing Wave Lines — like audio waveforms */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.08]" preserveAspectRatio="none" viewBox="0 0 1200 600">
                    {[0, 1, 2, 3, 4].map(i => (
                        <path
                            key={`wave-${i}`}
                            d={`M0,${200 + i * 50} C200,${150 + i * 40} 400,${280 + i * 30} 600,${200 + i * 50} S1000,${160 + i * 45} 1200,${220 + i * 50}`}
                            fill="none"
                            stroke="url(#waveGrad)"
                            strokeWidth={1.5 - i * 0.2}
                            className={`loading-wave loading-wave-${i}`}
                        />
                    ))}
                    <defs>
                        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={stage === 'thinking' ? '#a855f7' : stage === 'painting' ? '#06b6d4' : '#ec4899'} />
                            <stop offset="50%" stopColor={stage === 'thinking' ? '#ec4899' : stage === 'painting' ? '#3b82f6' : '#a855f7'} />
                            <stop offset="100%" stopColor={stage === 'thinking' ? '#8b5cf6' : stage === 'painting' ? '#22d3ee' : '#db2777'} />
                        </linearGradient>
                    </defs>
                </svg>

                {/* 2. Neural Network Grid — interconnected nodes */}
                <div className="absolute inset-0 loading-grid" />

                {/* 3. Floating Orbs — large glowing spheres drifting slowly */}
                {[
                    { size: 200, x: '10%', y: '20%', delay: '0s', dur: '20s' },
                    { size: 150, x: '70%', y: '60%', delay: '-5s', dur: '25s' },
                    { size: 180, x: '40%', y: '80%', delay: '-10s', dur: '22s' },
                    { size: 120, x: '85%', y: '15%', delay: '-7s', dur: '18s' },
                    { size: 100, x: '25%', y: '50%', delay: '-12s', dur: '23s' },
                ].map((orb, i) => (
                    <div
                        key={`orb-${i}`}
                        className="absolute rounded-full loading-orb"
                        style={{
                            width: orb.size,
                            height: orb.size,
                            left: orb.x,
                            top: orb.y,
                            background: `radial-gradient(circle at 30% 30%, ${
                                stage === 'thinking' ? 'rgba(168,85,247,0.12), rgba(147,51,234,0.03)' :
                                stage === 'painting' ? 'rgba(6,182,212,0.12), rgba(59,130,246,0.03)' :
                                'rgba(236,72,153,0.12), rgba(168,85,247,0.03)'
                            }, transparent)`,
                            animationDelay: orb.delay,
                            animationDuration: orb.dur,
                        }}
                    />
                ))}

                {/* 4. Rising Sparkle Particles — float upward like embers */}
                {Array.from({ length: 30 }, (_, i) => (
                    <div
                        key={`sparkle-${i}`}
                        className="absolute loading-sparkle"
                        style={{
                            left: `${5 + Math.random() * 90}%`,
                            width: 2 + Math.random() * 3,
                            height: 2 + Math.random() * 3,
                            animationDelay: `${Math.random() * 8}s`,
                            animationDuration: `${5 + Math.random() * 6}s`,
                            opacity: 0.15 + Math.random() * 0.3,
                            background: stage === 'thinking' ? '#a855f7' : stage === 'painting' ? '#22d3ee' : '#ec4899',
                        }}
                    />
                ))}

                {/* 5. Concentric Pulse Rings — emanate from center */}
                {[0, 1, 2].map(i => (
                    <div
                        key={`ring-${i}`}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full loading-pulse-ring"
                        style={{
                            border: `1px solid ${stage === 'thinking' ? 'rgba(168,85,247,0.15)' : stage === 'painting' ? 'rgba(6,182,212,0.15)' : 'rgba(236,72,153,0.15)'}`,
                            animationDelay: `${i * 2}s`,
                        }}
                    />
                ))}

                {/* 6. Morphing Blobs (kept from before, enhanced) */}
                <div className="loading-blob loading-blob-1" style={{ background: config.blobColor1 }} />
                <div className="loading-blob loading-blob-2" style={{ background: config.blobColor2 }} />
                <div className="loading-blob loading-blob-3" style={{ background: config.blobColor3 }} />
            </div>

            {/* Rotating Gradient Ring */}
            <div className={`absolute w-40 h-40 rounded-full bg-gradient-to-r ${config.color} opacity-15 blur-3xl animate-spin`}
                style={{ animationDuration: '8s' }}
            />

            {/* Main Content - More Compact */}
            <div className="relative z-10 flex flex-col items-center gap-4 p-4">

                {/* Animated Icon with Breathing Effect */}
                <div className="relative">
                    {/* Pulsing Ring */}
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${config.color} opacity-30 animate-ping`} />

                    {/* Icon Container with breathing animation */}
                    <div
                        className={`relative p-5 rounded-full bg-black/50 backdrop-blur-xl border ${config.borderColor} shadow-2xl ${config.glow} loading-breathe`}
                    >
                        <IconComponent
                            className={`w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r ${config.color} animate-pulse`}
                            style={{ filter: 'drop-shadow(0 0 20px currentColor)' }}
                        />
                    </div>

                    {/* Orbiting Dots - Smaller orbit */}
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${config.color}`}
                            style={{
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                animation: `orbit 2s linear infinite`,
                                animationDelay: `${i * 0.66}s`
                            }}
                        />
                    ))}
                </div>

                {/* Text Content - Smaller */}
                <div className="text-center space-y-1">
                    <h2 className={`text-xl font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
                        {config.title}{dots}
                    </h2>
                    <p className="text-gray-400 font-mono text-xs tracking-wider">
                        {message || config.subtitle}
                    </p>
                </div>

                {/* Improved Progress Bar */}
                {progress > 0 && (
                    <div className="w-64 max-w-full space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono text-gray-500">
                            <span>PROGRESS</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                            <div
                                className={`h-full bg-gradient-to-r ${config.color} transition-all duration-300 relative`}
                                style={{ width: `${progress}%` }}
                            >
                                {/* Enhanced shimmer/shine effect */}
                                <div
                                    className="absolute inset-0 loading-shimmer"
                                />
                            </div>
                        </div>
                        {/* Estimated time remaining */}
                        <p className="text-[9px] font-mono text-gray-600 text-center tracking-wide">
                            Usually takes {config.estimatedTime}
                        </p>
                    </div>
                )}

                {/* Fun Loading Messages with Fade Transition */}
                <div
                    className="text-[10px] text-gray-500 font-mono italic max-w-xs text-center h-4 flex items-center justify-center"
                    style={{
                        opacity: messageFade ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out',
                    }}
                >
                    {currentFunMessage}
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
                    50% { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
                }
                @keyframes orbit {
                    0%   { transform: translate(-50%, -50%) rotate(0deg) translateX(50px) rotate(0deg); opacity: 1; }
                    50%  { opacity: 0.3; }
                    100% { transform: translate(-50%, -50%) rotate(360deg) translateX(50px) rotate(-360deg); opacity: 1; }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes breathe {
                    0%, 100% { transform: scale(0.95); }
                    50%      { transform: scale(1.05); }
                }
                .loading-breathe { animation: breathe 3s ease-in-out infinite; }

                /* === FLOWING WAVE LINES === */
                .loading-wave {
                    stroke-dasharray: 800;
                    stroke-dashoffset: 800;
                    animation: waveDraw 4s ease-in-out infinite alternate;
                }
                .loading-wave-0 { animation-delay: 0s; }
                .loading-wave-1 { animation-delay: 0.4s; }
                .loading-wave-2 { animation-delay: 0.8s; }
                .loading-wave-3 { animation-delay: 1.2s; }
                .loading-wave-4 { animation-delay: 1.6s; }
                @keyframes waveDraw {
                    0%   { stroke-dashoffset: 800; opacity: 0.3; }
                    50%  { stroke-dashoffset: 0; opacity: 1; }
                    100% { stroke-dashoffset: -800; opacity: 0.3; }
                }

                /* === NEURAL NETWORK GRID === */
                .loading-grid {
                    background-image:
                        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
                    background-size: 60px 60px;
                    animation: gridPan 20s linear infinite;
                }
                @keyframes gridPan {
                    0%   { background-position: 0 0; }
                    100% { background-position: 60px 60px; }
                }

                /* === FLOATING ORBS === */
                .loading-orb {
                    animation: orbFloat 20s ease-in-out infinite;
                }
                @keyframes orbFloat {
                    0%   { transform: translate(0, 0) scale(1); }
                    25%  { transform: translate(30px, -40px) scale(1.1); }
                    50%  { transform: translate(-20px, 20px) scale(0.9); }
                    75%  { transform: translate(15px, 35px) scale(1.05); }
                    100% { transform: translate(0, 0) scale(1); }
                }

                /* === RISING SPARKLE PARTICLES === */
                .loading-sparkle {
                    position: absolute;
                    bottom: -10px;
                    border-radius: 50%;
                    animation: sparkleRise 8s ease-out infinite;
                }
                @keyframes sparkleRise {
                    0%   { transform: translateY(0) scale(0); opacity: 0; }
                    10%  { transform: translateY(-10vh) scale(1); opacity: 0.6; }
                    50%  { transform: translateY(-50vh) scale(0.8); opacity: 0.3; }
                    100% { transform: translateY(-110vh) scale(0.2); opacity: 0; }
                }

                /* === CONCENTRIC PULSE RINGS === */
                .loading-pulse-ring {
                    width: 80px;
                    height: 80px;
                    animation: pulseExpand 6s ease-out infinite;
                }
                @keyframes pulseExpand {
                    0%   { width: 80px; height: 80px; opacity: 0.4; }
                    100% { width: 600px; height: 600px; opacity: 0; }
                }

                /* === MORPHING BLOBS === */
                .loading-blob {
                    position: absolute;
                    width: 50%;
                    height: 50%;
                    filter: blur(80px);
                }
                .loading-blob-1 { top: 5%; left: 10%; animation: blobMorph1 7s ease-in-out infinite alternate; }
                .loading-blob-2 { top: 35%; right: 5%; animation: blobMorph2 11s ease-in-out infinite alternate; }
                .loading-blob-3 { bottom: 5%; left: 20%; animation: blobMorph3 13s ease-in-out infinite alternate; }
                @keyframes blobMorph1 {
                    0%   { border-radius: 40% 60% 60% 40% / 60% 40% 60% 40%; }
                    50%  { border-radius: 60% 40% 50% 50% / 50% 50% 40% 60%; }
                    100% { border-radius: 55% 45% 45% 55% / 45% 55% 45% 55%; }
                }
                @keyframes blobMorph2 {
                    0%   { border-radius: 55% 45% 50% 50% / 50% 50% 45% 55%; }
                    50%  { border-radius: 50% 50% 45% 55% / 45% 55% 55% 45%; }
                    100% { border-radius: 40% 60% 55% 45% / 55% 45% 45% 55%; }
                }
                @keyframes blobMorph3 {
                    0%   { border-radius: 50% 50% 55% 45% / 45% 55% 50% 50%; }
                    50%  { border-radius: 45% 55% 50% 50% / 55% 45% 45% 55%; }
                    100% { border-radius: 55% 45% 40% 60% / 60% 40% 55% 45%; }
                }

                /* Enhanced shimmer on progress bar */
                .loading-shimmer {
                    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 55%, transparent 100%);
                    background-size: 200% 100%;
                    animation: shimmer 1.8s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default LoadingAnimation;
