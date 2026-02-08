import React from 'react';
import { X, HelpCircle, Bot, Code, Zap, Keyboard, Mic, Image, Film, Phone, Share2, Eye, Cpu } from 'lucide-react';
import { Language, getTranslation } from '../services/i18n';
import { getThemeModalStyles } from '../services/themeUtils';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  theme?: string;
  accessibilityMode?: boolean;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, language = 'en', theme = 'retro', accessibilityMode = false }) => {
  if (!isOpen) return null;

  const themeStyles = getThemeModalStyles(theme);

  return (
    <div data-testid="help-modal" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`${themeStyles} border w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col`}>
        
        {/* Header */}
        <div className="sticky top-0 bg-black/80 backdrop-blur z-10 p-6 lg:p-8 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-500 flex items-center gap-4">
                <img src="/muse-logo.svg" alt="Muse" className="w-10 h-10 lg:w-12 lg:h-12" draggable={false} />
                {getTranslation(language, 'help.title')}
            </h2>
            <button 
              onClick={onClose}
              data-testid="help-close"
              className={`${accessibilityMode ? 'px-4 py-2 rounded-xl flex items-center gap-2' : 'p-3 lg:p-4 rounded-full'} bg-gray-900 hover:bg-gray-800 hover:text-white text-gray-400 transition-colors`}
              aria-label={getTranslation(language, 'action.close')}
              title={getTranslation(language, 'action.close')}
            >
              <X className={accessibilityMode ? "w-5 h-5" : "w-8 h-8 lg:w-10 lg:h-10"} />
              {accessibilityMode && <span className="text-sm">{getTranslation(language, 'action.close')}</span>}
            </button>
        </div>

        <div className="p-6 lg:p-10 space-y-10 overflow-y-auto custom-scrollbar">
            
            {/* Intro */}
            <section className="bg-gray-900/30 p-6 lg:p-8 rounded-2xl border border-gray-800/50">
                <p className="text-gray-200 text-lg lg:text-2xl leading-relaxed">
                    <span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.intro') }} />
                </p>
            </section>

            {/* Gestures Section */}
            <section>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-6 pl-4 border-l-8 border-blue-500">
                    Muse
                </h3>
                
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                    <span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture_intro') }} />
                </p>
                
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Voice */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-red-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">✊</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.voice')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.voice.desc') }} />
                            </div>
                        </div>

                        {/* Inspiration */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-yellow-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">🖐️</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.inspire')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.inspire.desc') }} />
                            </div>
                        </div>

                        {/* Art */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-blue-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">👌</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.create')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.create.desc') }} />
                            </div>
                        </div>

                        {/* Video */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-purple-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">✌️</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.video')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.cyber.desc') }} />
                            </div>
                        </div>

                        {/* Metal */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-orange-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">🤘</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.metal')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.metal.desc') }} />
                            </div>
                        </div>

                        {/* Anime */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-pink-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">🤟</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.anime')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.anime.desc') }} />
                            </div>
                        </div>

                        {/* Fun/Shaka */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-teal-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">🤙</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.fun')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.fun.desc') }} />
                            </div>
                        </div>

                        {/* Help */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-gray-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">👆</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.help')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.select.desc') }} />
                            </div>
                        </div>

                        {/* Dial / Pinch */}
                        <div className="bg-[#111] border border-gray-800 p-6 lg:p-8 rounded-2xl flex items-center gap-6 hover:border-green-500/50 transition-colors group">
                            <div className="text-5xl lg:text-7xl group-hover:scale-110 transition-transform">🤏</div>
                            <div>
                                <div className="font-bold text-white text-xl lg:text-2xl mb-2">{getTranslation(language, 'gesture.dial')}</div>
                                <div className="text-base lg:text-lg text-gray-400 leading-snug" dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.gesture.dial.desc') }} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MUSE Live — Voice Control Section */}
            <section>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-6 pl-4 border-l-8 border-purple-500 flex items-center gap-3">
                    <Mic className="w-7 h-7 lg:w-8 lg:h-8 text-purple-400" />
                    MUSE Live
                </h3>
                <div className="bg-gray-900/30 p-6 lg:p-8 rounded-2xl border border-gray-800/50">
                    <p className="text-gray-300 text-sm lg:text-base leading-relaxed mb-4">
                        {getTranslation(language, 'help.live.intro') || "Engage in real-time voice conversations with MUSE. Simply perform the 'Shaka' (🤙) gesture or click the phone icon to start."}
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm lg:text-base mb-5">
                        <li><strong>{getTranslation(language, 'help.live.cmd1') || "Voice Control:"}</strong> {getTranslation(language, 'help.live.cmd1.desc') || "Say 'Create a cyberpunk city' to generate art instantly."}</li>
                        <li><strong>{getTranslation(language, 'help.live.cmd2') || "Animation:"}</strong> {getTranslation(language, 'help.live.cmd2.desc') || "Say 'Make it move' or 'Animate this' to generate a video."}</li>
                        <li><strong>{getTranslation(language, 'help.live.cmd3') || "Language:"}</strong> {getTranslation(language, 'help.live.cmd3.desc') || "Speak in your preferred language, and MUSE will respond accordingly."}</li>
                    </ul>

                    {/* Voice Commands — integrated into Live section */}
                    <div className="border-t border-white/5 pt-5 mt-2">
                        <p className="text-gray-400 text-sm mb-4">
                            {getTranslation(language, 'help.voicecmd.desc')}
                        </p>

                        {/* Creation Commands */}
                        <p className="text-[11px] font-mono uppercase tracking-wider text-orange-400/70 mb-2">{language === 'zh' ? '🎨 创作指令' : '🎨 Creation'}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            {(language === 'zh' ? [
                                ['"生成图片" / "画一张"', '创建图片'],
                                ['"生成视频" / "制作视频"', '创建视频'],
                                ['"给我灵感" / "启发"', '获取灵感'],
                                ['"保存" / "收藏"', '保存提示词'],
                            ] : [
                                ['"Generate image"', 'Create image'],
                                ['"Generate video"', 'Create video'],
                                ['"Inspire me"', 'Get inspiration'],
                                ['"Save prompt"', 'Save current prompt'],
                            ]).map(([cmd, desc]) => (
                                <div key={cmd} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5 hover:border-orange-500/30 transition-colors">
                                    <span className="text-orange-400 font-mono text-xs font-bold whitespace-nowrap">{cmd}</span>
                                    <span className="text-gray-500 text-xs">→</span>
                                    <span className="text-gray-400 text-xs">{desc}</span>
                                </div>
                            ))}
                        </div>

                        {/* Navigation Commands */}
                        <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-400/70 mb-2">{language === 'zh' ? '📂 导航指令' : '📂 Navigation'}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            {(language === 'zh' ? [
                                ['"打开设置" / "设置"', '打开设置'],
                                ['"帮助" / "打开帮助"', '打开帮助'],
                                ['"历史" / "打开历史"', '查看历史'],
                                ['"实时对话" / "开始对话"', '开启 Live 对话'],
                                ['"开关摄像头"', '切换摄像头'],
                                ['"撤销" / "上一步"', '撤销操作'],
                                ['"清除" / "清空"', '清空输入'],
                            ] : [
                                ['"Open settings"', 'Open settings'],
                                ['"Open help"', 'Open help page'],
                                ['"Show history"', 'View history'],
                                ['"Start live"', 'Start live chat'],
                                ['"Toggle camera"', 'Camera on/off'],
                                ['"Undo"', 'Undo action'],
                                ['"Clear prompt"', 'Clear text'],
                            ]).map(([cmd, desc]) => (
                                <div key={cmd} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5 hover:border-cyan-500/30 transition-colors">
                                    <span className="text-cyan-400 font-mono text-xs font-bold whitespace-nowrap">{cmd}</span>
                                    <span className="text-gray-500 text-xs">→</span>
                                    <span className="text-gray-400 text-xs">{desc}</span>
                                </div>
                            ))}
                        </div>

                        {/* Theme & Language Commands */}
                        <p className="text-[11px] font-mono uppercase tracking-wider text-purple-400/70 mb-2">{language === 'zh' ? '🎭 主题 & 语言' : '🎭 Theme & Language'}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(language === 'zh' ? [
                                ['"Cyberpunk" / "Zen" / "Retro"...', '切换主题'],
                                ['"中文" / "English" / "日本語"...', '切换语言'],
                            ] : [
                                ['"Cyberpunk" / "Zen" / "Retro"...', 'Switch theme'],
                                ['"Switch to English" / "中文"...', 'Switch language'],
                            ]).map(([cmd, desc]) => (
                                <div key={cmd} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5 hover:border-purple-500/30 transition-colors">
                                    <span className="text-purple-400 font-mono text-xs font-bold whitespace-nowrap">{cmd}</span>
                                    <span className="text-gray-500 text-xs">→</span>
                                    <span className="text-gray-400 text-xs">{desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Keyboard Shortcuts Section */}
            <section>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-6 pl-4 border-l-8 border-cyan-500 flex items-center gap-3">
                    <Keyboard className="w-7 h-7 lg:w-8 lg:h-8 text-cyan-400" />
                    {getTranslation(language, 'help.keyboard.title')}
                </h3>
                <div className="bg-gray-900/30 p-6 lg:p-8 rounded-2xl border border-gray-800/50">
                    <p className="text-gray-400 text-sm lg:text-base mb-5">
                        {getTranslation(language, 'help.keyboard.desc')}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {[
                            ['V', language === 'zh' ? '语音输入' : 'Voice Input'],
                            ['I', language === 'zh' ? '获取灵感' : 'Inspire'],
                            ['G', language === 'zh' ? '生成图片' : 'Generate Image'],
                            ['D', language === 'zh' ? '生成视频' : 'Generate Video'],
                            ['L', language === 'zh' ? '实时对话' : 'Live Chat'],
                            ['S', language === 'zh' ? '设置' : 'Settings'],
                            ['H', language === 'zh' ? '帮助' : 'Help'],
                            ['Y', language === 'zh' ? '历史记录' : 'History'],
                            ['C', language === 'zh' ? '摄像头开关' : 'Toggle Camera'],
                            ['X', language === 'zh' ? '清除文字' : 'Clear Prompt'],
                            ['Esc', language === 'zh' ? '关闭弹窗' : 'Close Modal'],
                            ['Ctrl+Z', language === 'zh' ? '撤销' : 'Undo'],
                        ].map(([key, label]) => (
                            <div key={key} className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5 hover:border-cyan-500/30 transition-colors">
                                <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] text-gray-300 min-w-[2rem] text-center font-mono font-bold">{key}</kbd>
                                <span className="text-gray-400 text-xs lg:text-sm">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Subscription Section (NEW) */}
            <section>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-6 pl-4 border-l-8 border-amber-500">
                    {getTranslation(language, 'subscription.title') || "Membership"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    {/* Guest Tier */}
                    <div className="bg-gray-900/30 p-5 rounded-2xl border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded-full bg-gray-600/30 text-gray-400 text-[10px] font-bold uppercase">Guest</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-300 mb-2">{getTranslation(language, 'help.tier.guest') || 'Guest'}</h4>
                        <ul className="space-y-2 text-gray-500 text-sm">
                            <li>• {getTranslation(language, 'help.tier.guest.1') || '3 generations per day'}</li>
                            <li>• {getTranslation(language, 'help.tier.guest.2') || 'Image generation only'}</li>
                            <li>• {getTranslation(language, 'help.tier.guest.3') || 'Standard quality'}</li>
                            <li className="text-red-400/60">• {getTranslation(language, 'help.tier.guest.4') || 'No save / library'}</li>
                            <li className="text-red-400/60">• {getTranslation(language, 'help.tier.guest.5') || 'No video / Live Chat'}</li>
                        </ul>
                    </div>
                    {/* Free Tier */}
                    <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800">
                        <h4 className="text-lg font-bold text-white mb-2">{getTranslation(language, 'help.tier.free')}</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li>• {getTranslation(language, 'help.tier.free.1')}</li>
                            <li>• {getTranslation(language, 'help.tier.free.2')}</li>
                            <li>• {getTranslation(language, 'help.tier.free.3')}</li>
                        </ul>
                    </div>
                    {/* Pro Tier */}
                    <div className="bg-gradient-to-br from-amber-900/20 to-black p-5 rounded-2xl border border-amber-500/30">
                        <h4 className="text-lg font-bold text-amber-400 mb-2">{getTranslation(language, 'help.tier.pro')}</h4>
                        <ul className="space-y-2 text-gray-300 text-sm">
                            <li>• {getTranslation(language, 'sub.feature.unlimited')}</li>
                            <li>• <strong>{getTranslation(language, 'help.tier.pro.video')}</strong></li>
                            <li>• {getTranslation(language, 'help.tier.pro.priority')}</li>
                            <li>• {getTranslation(language, 'sub.feature.themes')}</li>
                            <li>• {getTranslation(language, 'sub.feature.share')}</li>
                            <li>• {getTranslation(language, 'sub.feature.persona')}</li>
                            <li className="text-amber-400/80">• {getTranslation(language, 'sub.feature.3d')} <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{getTranslation(language, 'sub.feature.coming_soon')}</span></li>
                            <li className="text-amber-400/80">• {getTranslation(language, 'sub.feature.genie')} <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{getTranslation(language, 'sub.feature.coming_soon')}</span></li>
                        </ul>
                    </div>
                </div>
            </section>


            {/* Tech Stack — Gemini API Section */}
            <section>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2 pl-4 border-l-8 border-gray-600">
                    {getTranslation(language, 'help.tech_stack')}
                </h3>
                <p className="text-sm text-gray-500 mb-6 pl-5">{getTranslation(language, 'help.tech.subtitle') || 'Powered by Google GenAI SDK (@google/genai)'}</p>

                {/* Row 1: Core Gemini Models */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm lg:text-base text-gray-300 mb-4">
                     {/* Gemini 3 Flash — Reasoning */}
                     <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 hover:border-yellow-500/30 transition-colors">
                        <div className="flex items-center gap-2.5 mb-2 text-yellow-400">
                            <Zap className="w-5 h-5 lg:w-6 lg:h-6" />
                            <strong className="text-base lg:text-lg">{getTranslation(language, 'help.tech.reasoning.title')}</strong>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed"><span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.tech.reasoning.desc') }} /></p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/80 text-[10px] font-mono">gemini-3-flash-preview</span>
                        </div>
                     </div>

                     {/* Gemini 2.5 Flash Image — Art Generation */}
                     <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 hover:border-pink-500/30 transition-colors">
                        <div className="flex items-center gap-2.5 mb-2 text-pink-400">
                            <Image className="w-5 h-5 lg:w-6 lg:h-6" />
                            <strong className="text-base lg:text-lg">{getTranslation(language, 'help.tech.image.title') || 'Image Generation'}</strong>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed"><span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.tech.image.desc') || '<b>Gemini 2.5 Flash Image</b> generates high-quality art from refined prompts.' }} /></p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400/80 text-[10px] font-mono">gemini-2.5-flash-image</span>
                        </div>
                     </div>

                     {/* Veo 3.1 — Video Generation */}
                     <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 hover:border-purple-500/30 transition-colors">
                        <div className="flex items-center gap-2.5 mb-2 text-purple-400">
                            <Film className="w-5 h-5 lg:w-6 lg:h-6" />
                            <strong className="text-base lg:text-lg">{getTranslation(language, 'help.tech.video.title') || 'Video Generation'}</strong>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed"><span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.tech.video.desc') || '<b>Veo 3.1 Fast</b> creates cinematic video from images with motion prompts.' }} /></p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400/80 text-[10px] font-mono">veo-3.1-fast-generate-preview</span>
                        </div>
                     </div>
                </div>

                {/* Row 2: Live, Vision Analysis, Social */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm lg:text-base text-gray-300 mb-4">
                     {/* Gemini 2.5 Flash Native Audio — Live Chat */}
                     <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 hover:border-green-500/30 transition-colors">
                        <div className="flex items-center gap-2.5 mb-2 text-green-400">
                            <Phone className="w-5 h-5 lg:w-6 lg:h-6" />
                            <strong className="text-base lg:text-lg">{getTranslation(language, 'help.tech.live.title') || 'Live Voice Chat'}</strong>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed"><span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.tech.live.desc') || '<b>Gemini 2.5 Flash Native Audio</b> enables real-time bidirectional voice conversations with tool calling.' }} /></p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400/80 text-[10px] font-mono">gemini-2.5-flash-native-audio</span>
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400/80 text-[10px] font-mono">Live API</span>
                        </div>
                     </div>

                     {/* Gemini 2.0 Flash — Cloud Vision / Social */}
                     <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center gap-2.5 mb-2 text-cyan-400">
                            <Eye className="w-5 h-5 lg:w-6 lg:h-6" />
                            <strong className="text-base lg:text-lg">{getTranslation(language, 'help.tech.analysis.title') || 'Vision Analysis'}</strong>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed"><span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.tech.analysis.desc') || '<b>Gemini 2.0 Flash</b> analyzes generated images for social copy and scene understanding.' }} /></p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400/80 text-[10px] font-mono">gemini-2.0-flash</span>
                        </div>
                     </div>

                     {/* Gemini 3 Flash — Cloud Vision / Research */}
                     <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-center gap-2.5 mb-2 text-indigo-400">
                            <Bot className="w-5 h-5 lg:w-6 lg:h-6" />
                            <strong className="text-base lg:text-lg">{getTranslation(language, 'help.tech.cloud_vision.title') || 'Cloud Vision'}</strong>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed"><span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.tech.cloud_vision.desc') || '<b>Gemini 3 Flash</b> with structured output for scene detection, object recognition, and style analysis.' }} /></p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400/80 text-[10px] font-mono">gemini-3-flash-preview</span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400/80 text-[10px] font-mono">Structured Output</span>
                        </div>
                     </div>
                </div>

                {/* Row 3: Client-side tech */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm lg:text-base text-gray-300">
                     {/* Web Speech API */}
                     <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-2.5 mb-2 text-blue-400">
                            <Mic className="w-5 h-5 lg:w-6 lg:h-6" />
                            <strong className="text-base lg:text-lg">{getTranslation(language, 'help.tech.voice.title')}</strong>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed"><span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.tech.voice.desc') }} /></p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400/80 text-[10px] font-mono">Web Speech API</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400/80 text-[10px] font-mono">Browser Native</span>
                        </div>
                     </div>

                     {/* MediaPipe Hands */}
                     <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 hover:border-orange-500/30 transition-colors">
                        <div className="flex items-center gap-2.5 mb-2 text-orange-400">
                            <Cpu className="w-5 h-5 lg:w-6 lg:h-6" />
                            <strong className="text-base lg:text-lg">{getTranslation(language, 'help.tech.mediapipe.title') || 'Gesture Detection'}</strong>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed"><span dangerouslySetInnerHTML={{ __html: getTranslation(language, 'help.tech.mediapipe.desc') || '<b>MediaPipe Holistic</b> for real-time hand gesture and face tracking via WASM, running entirely on-device.' }} /></p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400/80 text-[10px] font-mono">MediaPipe Hands</span>
                            <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400/80 text-[10px] font-mono">Client WASM</span>
                        </div>
                     </div>
                </div>
            </section>

        </div>
        
        <div className="p-6 lg:p-8 border-t border-gray-800 bg-[#0A0A0A] text-center flex justify-between items-center text-sm lg:text-base text-gray-500 font-mono">
            <span>Gemini 3 Hackathon Edition</span>
            <span>Google GenAI SDK</span>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;
