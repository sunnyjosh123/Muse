/**
 * Shared Theme Styles Utility
 * Extracted from 7+ components to eliminate duplication.
 */

export const getThemeModalStyles = (theme?: string): string => {
    switch (theme) {
        case 'cyberpunk': return 'bg-[#050510] border-cyan-500/30';
        case 'zen': return 'bg-[#101015] border-blue-200/30';
        case 'retro': return 'bg-[#1a1005] border-orange-500/30';
        case 'alchemist': return 'bg-[#1a0520] border-purple-500/30';
        case 'comic': return 'bg-[#050510] border-pink-500/30';
        case 'game': return 'bg-[#0a0a0f] border-red-500/30';
        default: return 'bg-[#0a0a0f] border-white/10';
    }
};
