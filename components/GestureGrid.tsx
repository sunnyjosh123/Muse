
import React from 'react';
import { GestureType } from '../types';
import { Mic, Lightbulb, Palette, Film, Flame, Heart, PartyPopper, HelpCircle } from 'lucide-react';
import { Language, getTranslation } from '../services/i18n';

interface GestureGridProps {
    gesture: GestureType;
    onGestureClick?: (gesture: GestureType) => void;
    language?: Language;
}

const GestureGrid: React.FC<GestureGridProps> = ({ gesture, onGestureClick, language = 'en' }) => {

    // Ordered by natural workflow: Voice -> Create -> Video -> Inspire -> Undo -> Clear -> Others
    const items = [
        {
            icon: '✊',
            lucideIcon: Mic,
            label: getTranslation(language, 'gesture.voice'),
            gesture: GestureType.FIST,
            desc: getTranslation(language, 'gesture.voice'),
            color: 'text-red-400',
            border: 'border-red-500/50',
            bg: 'bg-red-500/20',
            glow: 'shadow-red-500/30'
        },
        {
            icon: '👌',
            lucideIcon: Palette,
            label: getTranslation(language, 'gesture.create'),
            gesture: GestureType.OK,
            desc: getTranslation(language, 'gesture.create'),
            color: 'text-blue-400',
            border: 'border-blue-500/50',
            bg: 'bg-blue-500/20',
            glow: 'shadow-blue-500/30'
        },
        {
            icon: '✌️',
            lucideIcon: Film,
            label: getTranslation(language, 'gesture.video'),
            gesture: GestureType.VICTORY,
            desc: getTranslation(language, 'gesture.video'),
            color: 'text-purple-400',
            border: 'border-purple-500/50',
            bg: 'bg-purple-500/20',
            glow: 'shadow-purple-500/30'
        },
        {
            icon: '🖐️',
            lucideIcon: Lightbulb,
            label: getTranslation(language, 'gesture.inspire'),
            gesture: GestureType.OPEN_PALM,
            desc: getTranslation(language, 'gesture.inspire'),
            color: 'text-yellow-400',
            border: 'border-yellow-500/50',
            bg: 'bg-yellow-500/20',
            glow: 'shadow-yellow-500/30'
        },
        {
            icon: '👆',
            lucideIcon: HelpCircle,
            label: getTranslation(language, 'gesture.help'),
            gesture: GestureType.POINTING,
            desc: getTranslation(language, 'gesture.help'),
            color: 'text-gray-400',
            border: 'border-gray-500/50',
            bg: 'bg-gray-500/20',
            glow: 'shadow-gray-500/30'
        },
        {
            icon: '🤟',
            lucideIcon: Heart,
            label: getTranslation(language, 'gesture.anime'),
            gesture: GestureType.LOVE,
            desc: getTranslation(language, 'gesture.anime'),
            color: 'text-pink-400',
            border: 'border-pink-500/50',
            bg: 'bg-pink-500/20',
            glow: 'shadow-pink-500/30'
        },
        {
            icon: '🤘',
            lucideIcon: Flame,
            label: getTranslation(language, 'gesture.metal'),
            gesture: GestureType.ROCK,
            desc: getTranslation(language, 'gesture.metal'),
            color: 'text-orange-500',
            border: 'border-orange-500/50',
            bg: 'bg-orange-500/20',
            glow: 'shadow-orange-500/30'
        },
        {
            icon: '🤙',
            lucideIcon: PartyPopper,
            label: getTranslation(language, 'gesture.fun'),
            gesture: GestureType.SHAKA,
            desc: getTranslation(language, 'gesture.fun'),
            color: 'text-teal-400',
            border: 'border-teal-500/50',
            bg: 'bg-teal-500/20',
            glow: 'shadow-teal-500/30'
        },
    ];

    const handleClick = (itemGesture: GestureType) => {
        if (onGestureClick) {
            onGestureClick(itemGesture);
        }
    };

    return (
        <div 
            className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 border border-[var(--border-color)] rounded-xl sm:rounded-2xl shadow-lg transition-all backdrop-blur-md overflow-x-auto scrollbar-hide max-w-[calc(100vw-1rem)] sm:max-w-none sm:flex-wrap sm:justify-center"
            style={{ background: 'var(--glass-gradient)' }}
        >
            {items.map((item, i) => {
                const isActive = gesture === item.gesture;
                const IconComponent = item.lucideIcon;

                return (
                    <button
                        key={i}
                        onClick={() => handleClick(item.gesture)}
                        title={item.desc}
                        className={`
                        relative group flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-300 min-w-[2.5rem] sm:min-w-[3.5rem] shrink-0
                        cursor-pointer hover:scale-110 active:scale-95
                        ${isActive
                                ? `${item.bg} ${item.border} border shadow-lg ${item.glow} scale-105 z-10`
                                : 'bg-white/5 border border-transparent hover:bg-white/10 opacity-70 hover:opacity-100 scale-100'}
                    `}
                    >
                        {/* Pulse ring on active */}
                        {isActive && (
                            <div className={`absolute inset-0 rounded-lg sm:rounded-xl ${item.bg} animate-ping opacity-30`} />
                        )}

                        <div className={`relative z-10 flex flex-col items-center gap-0.5 sm:gap-1`}>
                            <div className="text-base sm:text-xl filter drop-shadow-md transition-transform group-hover:scale-110">
                                {item.icon}
                            </div>
                            <div className={`text-[7px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors leading-tight ${isActive ? item.color : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                                {item.label}
                            </div>
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 hidden sm:block">
                            <div className="bg-black/90 rounded-lg px-2 py-1 text-[8px] text-white whitespace-nowrap border border-white/10">
                                {item.desc}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default GestureGrid;
