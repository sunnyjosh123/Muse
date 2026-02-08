
import React, { useEffect, useState } from 'react';
import { X, Trash2, User, Database, HardDrive, RefreshCw, Clock, Shield, Search } from 'lucide-react';
import { getUsers, deleteUser, UserRecord } from '../services/firebaseService';
import { Language, getTranslation } from '../services/i18n';
import { getThemeModalStyles } from '../services/themeUtils';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    language?: Language;
    theme?: string;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, language = 'en', theme = 'retro' }) => {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) loadUsers();
    }, [isOpen]);

    const themeStyles = getThemeModalStyles(theme);

    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

    // Deduplicate users based on username (keep the first occurrence or latest based on sort)
    const uniqueUsers = Array.from(new Map(filteredUsers.map(user => [user.username, user])).values());

    const handleDelete = async (id: string, isLocal: boolean) => {
        if (window.confirm(getTranslation(language, 'user.mgmt.purge_confirm'))) {
            const success = await deleteUser(id, isLocal);
            if (success) loadUsers();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
            <div className={`${themeStyles} border w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,1)] relative flex flex-col overflow-hidden`}>

                {/* Header */}
                <div className="p-6 sm:p-10 border-b border-white/5 flex flex-col sm:flex-row justify-between gap-6 bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 tracking-tighter">
                            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                            {getTranslation(language, 'user.mgmt.title')}
                        </h2>
                        <p className="text-[10px] text-blue-400/60 mt-2 font-mono tracking-widest uppercase">{getTranslation(language, 'user.mgmt.subtitle')}</p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={getTranslation(language, 'user.mgmt.search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 w-full sm:w-64"
                            />
                        </div>
                        <button onClick={loadUsers} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-blue-400 transition-all border border-white/5">
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-3 bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white text-red-500 transition-all border border-red-500/10">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main List */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max">
                    {isLoading && users.length === 0 ? (
                        <div className="col-span-full py-20 text-center flex flex-col items-center">
                            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="font-mono text-xs text-gray-500 tracking-widest">QUERYING CLOUD NODES...</p>
                        </div>
                    ) : uniqueUsers.length === 0 ? (
                        <div className="col-span-full py-20 text-center opacity-20">
                            <User className="w-20 h-20 mx-auto mb-6" />
                            <p className="text-lg font-mono tracking-widest uppercase">No Operators Found</p>
                        </div>
                    ) : (
                        uniqueUsers.map((user) => (
                            <div key={user.id} className="flex items-center gap-6 bg-white/[0.02] border border-white/5 p-4 rounded-[1.5rem] hover:bg-white/[0.05] hover:border-blue-500/30 transition-all group overflow-hidden relative">
                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black border border-white/10 shrink-0">
                                    {user.snapshot ? (
                                        <>
                                            <img src={user.snapshot} className="w-full h-full object-cover transform -scale-x-100 opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                                            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-transparent"></div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-800"><User className="w-10 h-10" /></div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-white font-bold text-lg tracking-tight group-hover:text-blue-400 transition-colors uppercase">{user.username}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${user.isLocal ? 'border-gray-700 text-gray-600' : 'border-blue-900 text-blue-500 bg-blue-500/5'}`}>
                                            {user.isLocal ? 'LOCAL_DISK' : 'CLOUD_LINK'}
                                        </span>
                                        <span className="text-[8px] text-gray-600 font-mono tracking-tighter">ID: {user.id.slice(0, 12)}</span>
                                    </div>
                                </div>

                                <button onClick={() => handleDelete(user.id, user.isLocal)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all border border-red-500/10">
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <div className="absolute top-0 right-0 w-0.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-white/5 bg-black/50 text-center">
                    <p className="text-[9px] text-gray-700 font-mono tracking-[0.2em] uppercase">{getTranslation(language, 'user.mgmt.security')}</p>
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
