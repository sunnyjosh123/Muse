
import React from 'react';
import { GestureType } from '../types';
import { Hand, Mic, Sparkles, Flame, Heart, Camera, PartyPopper, Film } from 'lucide-react';

interface GestureProgressRingProps {
    gesture: GestureType;
    progress: number; // 0 to 1
    isActive: boolean;
}

/**
 * GESTURE PROGRESS RING
 * A circular loader that shows gesture confirmation progress.
 * This provides physical feedback and increases perceived stability.
 */
const GestureProgressRing: React.FC<GestureProgressRingProps> = ({
    gesture,
    progress,
    isActive
}) => {
    const size = 120;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    const getGestureConfig = () => {
        switch (gesture) {
            case GestureType.FIST:
                return {
                    icon: <Mic className="w-8 h-8" />,
                    color: '#ef4444',
                    label: 'VOICE',
                    glow: 'shadow-red-500/50'
                };
            case GestureType.OPEN_PALM:
                return {
                    icon: <img src="/muse-logo.svg" alt="Inspire" className="w-8 h-8" draggable={false} />,
                    color: '#facc15',
                    label: 'INSPIRE',
                    glow: 'shadow-yellow-500/50'
                };
            case GestureType.OK:
                return {
                    icon: <Camera className="w-8 h-8" />,
                    color: '#3b82f6',
                    label: 'GENERATE',
                    glow: 'shadow-blue-500/50'
                };
            case GestureType.ROCK:
                return {
                    icon: <Flame className="w-8 h-8" />,
                    color: '#f97316',
                    label: 'METAL',
                    glow: 'shadow-orange-500/50'
                };
            case GestureType.LOVE:
                return {
                    icon: <Heart className="w-8 h-8" />,
                    color: '#ec4899',
                    label: 'ANIME',
                    glow: 'shadow-pink-500/50'
                };
            case GestureType.VICTORY:
                return {
                    icon: <Film className="w-8 h-8" />,
                    color: '#a855f7',
                    label: 'CYBER/VIDEO',
                    glow: 'shadow-purple-500/50'
                };
            case GestureType.SHAKA:
                return {
                    icon: <PartyPopper className="w-8 h-8" />,
                    color: '#14b8a6',
                    label: 'FUN!',
                    glow: 'shadow-teal-500/50'
                };
            default:
                return {
                    icon: <Hand className="w-8 h-8" />,
                    color: '#6b7280',
                    label: 'READY',
                    glow: ''
                };
        }
    };

    const config = getGestureConfig();

    if (!isActive || gesture === GestureType.NONE) return null;

    return (
        <div
            className={`
        fixed bottom-1/4 left-1/2 -translate-x-1/2 z-40
        pointer-events-none
        transition-all duration-300
        ${progress > 0 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
      `}
        >
            <div className={`
        relative flex items-center justify-center
        ${config.glow} shadow-2xl
      `}>
                {/* Background Glow */}
                <div
                    className="absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse"
                    style={{ backgroundColor: config.color }}
                />

                {/* SVG Ring */}
                <svg
                    width={size}
                    height={size}
                    className="transform -rotate-90"
                >
                    {/* Background Ring */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={strokeWidth}
                    />

                    {/* Progress Ring */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke={config.color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{
                            filter: `drop-shadow(0 0 8px ${config.color})`,
                            transition: 'stroke-dashoffset 0.1s ease-out'
                        }}
                    />

                    {/* Outer Decorative Ring */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius + 8}
                        fill="transparent"
                        stroke={config.color}
                        strokeWidth={1}
                        strokeDasharray="4 8"
                        strokeOpacity={0.3}
                        style={{
                            animation: 'spin 10s linear infinite'
                        }}
                    />
                </svg>

                {/* Center Icon */}
                <div
                    className="absolute flex flex-col items-center justify-center"
                    style={{ color: config.color }}
                >
                    {config.icon}
                    <span
                        className="text-[8px] font-bold tracking-[0.2em] mt-1 text-white/80"
                    >
                        {config.label}
                    </span>
                </div>

                {/* Progress Percentage */}
                <div
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center"
                >
                    <span
                        className="font-mono text-sm font-bold"
                        style={{ color: config.color }}
                    >
                        {Math.round(progress * 100)}%
                    </span>
                </div>

                {/* Completion Flash Effect */}
                {progress >= 1 && (
                    <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                            backgroundColor: config.color,
                            opacity: 0.3
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default GestureProgressRing;
