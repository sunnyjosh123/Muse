import React from 'react';
import { Search, Globe, Image as ImageIcon, ExternalLink, Loader2 } from 'lucide-react';
import { Language, getTranslation } from '../services/i18n';

interface ComputerUseHUDProps {
    query: string | null;
    results: string[];
    isVisible: boolean;
    language?: Language;
}

const ComputerUseHUD: React.FC<ComputerUseHUDProps> = ({ query, results, isVisible, language = 'en' }) => {
    if (!isVisible) return null;

    return (
        <div className="flex flex-col gap-2 p-4 max-w-sm w-full animate-in fade-in slide-in-from-left-10 duration-500">
            {/* Browser Header Bar */}
            <div 
                className="flex items-center gap-2 rounded-t-lg p-2 border-b text-xs font-mono backdrop-blur-md"
                style={{ 
                    background: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)'
                }}
            >
                <Globe className="w-3 h-3" style={{ color: 'var(--accent-primary)' }} />
                <span className="flex-1 truncate">agent://research/{query ? encodeURIComponent(query).substring(0, 20) : ''}</span>
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>

            {/* Browser Content */}
            <div 
                className="backdrop-blur-md border-x border-b rounded-b-lg p-4 font-mono text-xs"
                style={{ 
                    background: 'var(--glass-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                }}
            >
                {/* Search Query */}
                <div className="flex items-center gap-3 mb-4">
                    <Search className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-lg font-bold tracking-tight">"{query}"</span>
                </div>

                {/* Simulated Results */}
                <div className="space-y-2">
                    {/* Placeholder loading skeletons if no results yet */}
                    {results.length === 0 && (
                        <div className="space-y-2 opacity-50">
                            <div className="h-2 rounded w-3/4 animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
                            <div className="h-2 rounded w-1/2 animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
                            <div className="h-2 rounded w-5/6 animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
                        </div>
                    )}

                    {results.map((res, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded transition-colors group cursor-pointer border border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)]">
                            <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: 'var(--bg-secondary)' }}>
                                <ImageIcon className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="truncate font-semibold" style={{ color: 'var(--accent-primary)' }}>{res}</div>
                                <div className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>source.gemini.google.com/ref/{i}</div>
                            </div>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" style={{ color: 'var(--text-primary)' }} />
                        </div>
                    ))}
                </div>

                {/* Status Footer */}
                <div className="mt-4 pt-2 border-t flex justify-between text-[10px] uppercase tracking-wider" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    <span>{getTranslation(language, 'hud.research_mode')}</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{getTranslation(language, 'hud.agent_active')}</span>
                </div>
            </div>
        </div>
    );
};

export default ComputerUseHUD;
