import React, { useState } from 'react';
import { X, Copy, Trash2, Sparkles, Search } from 'lucide-react';
import { SavedPrompt } from '../types';
import { Language, getTranslation } from '../services/i18n';
import { getThemeModalStyles } from '../services/themeUtils';

interface PromptLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedPrompts: SavedPrompt[];
    onSelectPrompt: (text: string) => void;
    onDeletePrompt: (id: string) => void;
    language?: Language;
    theme?: string;
}

const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
    isOpen,
    onClose,
    savedPrompts,
    onSelectPrompt,
    onDeletePrompt,
    language = 'en',
    theme = 'retro'
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const themeStyles = getThemeModalStyles(theme);
    const filteredPrompts = searchTerm
        ? savedPrompts.filter(p => p.text.toLowerCase().includes(searchTerm.toLowerCase()) || (p.style || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : savedPrompts;

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
            
            <div className={`relative w-full max-w-2xl ${themeStyles} border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300`}>
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-purple-500/20">
                            <img src="/muse-logo.svg" alt="Muse" className="w-full h-full" draggable={false} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{getTranslation(language, 'lib.title')}</h2>
                            <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">{getTranslation(language, 'lib.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search / Filter (Mock) */}
                <div className="p-4 border-b border-white/5 bg-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder={getTranslation(language, 'lib.search.placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredPrompts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden opacity-40">
                                <img src="/muse-logo.svg" alt="" className="w-full h-full" draggable={false} />
                            </div>
                            <div>
                                <h3 className="text-gray-300 font-medium">{getTranslation(language, 'lib.empty.title')}</h3>
                                <p className="text-sm text-gray-500 mt-1">{getTranslation(language, 'lib.empty.desc')}</p>
                            </div>
                        </div>
                    ) : (
                        filteredPrompts.map((item) => (
                            <div key={item.id} className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-4">
                                    <p className="text-gray-200 text-sm leading-relaxed line-clamp-2 font-medium">
                                        "{item.text}"
                                    </p>
                                    <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {item.style || getTranslation(language, 'lib.style.none')}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onSelectPrompt(item.text)}
                                            className="p-1.5 hover:bg-purple-500 hover:text-white rounded-lg text-gray-400 transition-all"
                                            title={getTranslation(language, 'lib.action.use')}
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={() => onDeletePrompt(item.id)}
                                            className="p-1.5 hover:bg-red-500 hover:text-white rounded-lg text-gray-400 transition-all"
                                            title={getTranslation(language, 'lib.action.delete')}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromptLibraryModal;
