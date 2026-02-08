
import React from 'react';
import { X, Clock, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Language, getTranslation } from '../services/i18n';
import { getThemeModalStyles } from '../services/themeUtils';

interface HistoryEntry {
    id: string;
    prompt: string;
    style: string;
    image: string | null;
    timestamp: number;
}

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryEntry[];
    currentIndex: number;
    onSelectEntry: (index: number) => void;
    onClearHistory?: () => void;
    language?: Language;
    theme?: string;
    accessibilityMode?: boolean;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
    isOpen,
    onClose,
    history,
    currentIndex,
    onSelectEntry,
    onClearHistory,
    language = 'en',
    theme = 'retro',
    accessibilityMode = false
}) => {
    if (!isOpen) return null;

    const themeStyles = getThemeModalStyles(theme);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`${themeStyles} border w-full max-w-xl max-h-[70vh] rounded-3xl shadow-2xl relative flex flex-col overflow-hidden`}>
                
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-bold text-white">{getTranslation(language, 'history.title')}</h2>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-mono">
                            {history.length} {getTranslation(language, 'history.items')}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {onClearHistory && history.length > 0 && (
                            <button
                                onClick={() => {
                                    if (window.confirm(getTranslation(language, 'history.clear.confirm'))) {
                                        onClearHistory();
                                    }
                                }}
                                className={`${accessibilityMode ? 'px-3 py-1.5 rounded-xl flex items-center gap-2' : 'p-2 rounded-lg'} text-red-400 hover:bg-red-500/20 transition-colors`}
                                aria-label={getTranslation(language, 'history.clear.title')}
                                title={getTranslation(language, 'history.clear.title')}
                            >
                                <Trash2 className="w-4 h-4" />
                                {accessibilityMode && <span className="text-xs">{getTranslation(language, 'history.clear.title')}</span>}
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className={`${accessibilityMode ? 'px-3 py-1.5 rounded-xl flex items-center gap-2' : 'p-2 rounded-lg'} text-gray-400 hover:text-white hover:bg-white/10 transition-all`}
                            aria-label={getTranslation(language, 'action.close')}
                            title={getTranslation(language, 'action.close')}
                        >
                            <X className="w-5 h-5" />
                            {accessibilityMode && <span className="text-xs">{getTranslation(language, 'action.close')}</span>}
                        </button>
                    </div>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {history.length === 0 ? (
                        <div className="py-16 text-center opacity-40">
                            <Clock className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-sm font-mono">{getTranslation(language, 'history.empty.title')}</p>
                            <p className="text-xs text-gray-600 mt-1">{getTranslation(language, 'history.empty.desc')}</p>
                        </div>
                    ) : (
                        history.map((entry, index) => (
                            <button
                                key={entry.id}
                                onClick={() => {
                                    onSelectEntry(index);
                                    onClose();
                                }}
                                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group ${index === currentIndex
                                        ? 'bg-blue-500/20 border border-blue-500/30'
                                        : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                    }`}
                            >
                                {/* Thumbnail */}
                                <div className="w-14 h-14 rounded-lg bg-black border border-white/10 overflow-hidden shrink-0">
                                    {entry.image ? (
                                        <img src={entry.image} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate group-hover:text-blue-300 transition-colors">
                                        {entry.prompt || getTranslation(language, 'history.untitled')}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {entry.style && (
                                            <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                                                {entry.style.split(',')[0]}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-600 font-mono">
                                            {formatTime(entry.timestamp)}
                                        </span>
                                    </div>
                                </div>

                                {/* Index indicator */}
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${index === currentIndex
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white/5 text-gray-500'
                                    }`}>
                                    {index + 1}
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-black/30 text-center">
                    <p className="text-[10px] text-gray-600 font-mono">
                        {getTranslation(language, 'history.footer')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
