import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Image as ImageIcon, Layout, Palette, Save, Loader2, CheckCircle2, Pill, LogIn, Search, Zap, ClipboardList, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { SystemSettings } from '../types';

interface ThemeSettingsProps {
  isDarkMode: boolean;
  editSettings: SystemSettings;
  setEditSettings: (settings: SystemSettings) => void;
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ 
  isDarkMode, 
  editSettings, 
  setEditSettings, 
  onSave, 
  isSaving, 
  saveSuccess 
}) => {
  const previewFeatures = [
    { icon: <Search className="text-blue-500" size={12} />, title: "Tra cứu thuốc" },
    { icon: <Zap className="text-amber-500" size={12} />, title: "Tương tác" },
    { icon: <ClipboardList className="text-emerald-500" size={12} />, title: "ICD-10" },
    { icon: <MessageSquare className="text-indigo-500" size={12} />, title: "Social" }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* Editor Panel */}
      <div className={cn(
        "p-8 rounded-[32px] border transition-all space-y-8 h-fit",
        isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
      )}>
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Tùy chỉnh Giao diện Đăng nhập</h3>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Logo URL (Icon Pill làm mặc định)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  className={cn(
                    "flex-1 px-5 py-3 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-sm",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                  )}
                  value={editSettings.loginLogoUrl || ''}
                  onChange={(e) => setEditSettings({ ...editSettings, loginLogoUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Ảnh nền Login URL</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                className={cn(
                  "w-full px-5 py-3 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-sm",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                )}
                value={editSettings.loginBgUrl || ''}
                onChange={(e) => setEditSettings({ ...editSettings, loginBgUrl: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Độ mờ nền (Blur: {editSettings.loginBgBlur || 0}px)</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  value={editSettings.loginBgBlur || 0}
                  onChange={(e) => setEditSettings({ ...editSettings, loginBgBlur: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Độ tối nền ({editSettings.loginBgOpacity || 0}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  value={editSettings.loginBgOpacity || 0}
                  onChange={(e) => setEditSettings({ ...editSettings, loginBgOpacity: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Màu chủ đạo Login</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  className="w-12 h-12 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                  value={editSettings.loginPrimaryColor || '#3b82f6'}
                  onChange={(e) => setEditSettings({ ...editSettings, loginPrimaryColor: e.target.value })}
                />
                <input
                  type="text"
                  className={cn(
                    "flex-1 px-5 py-3 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-sm",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                  )}
                  value={editSettings.loginPrimaryColor || '#3b82f6'}
                  onChange={(e) => setEditSettings({ ...editSettings, loginPrimaryColor: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <Layout size={18} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Chế độ Glassmorphism</p>
                  <p className="text-[10px] text-slate-500 font-medium">Làm trong suốt thẻ đăng nhập</p>
                </div>
              </div>
              <button
                onClick={() => setEditSettings({ ...editSettings, loginCardGlassMode: !editSettings.loginCardGlassMode })}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-all flex items-center shadow-inner",
                  editSettings.loginCardGlassMode ? "bg-primary justify-end" : "bg-slate-200 justify-start"
                )}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-100">
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 text-emerald-500 font-bold text-sm"
              >
                <CheckCircle2 size={16} />
                Đã cập nhật giao diện!
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50",
              saveSuccess 
                ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" 
                : "bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700"
            )}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : (saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />)}
            {saveSuccess ? 'Đã lưu' : 'Lưu giao diện'}
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-2">Live Preview (Bản xem trước)</h3>
        <div className={cn(
          "relative w-full aspect-[4/3] rounded-[40px] overflow-hidden border-8 border-slate-900/5 shadow-2xl transition-all",
          isDarkMode ? "bg-slate-950" : "bg-slate-200"
        )}>
          {/* Mock Mobile Viewport */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {/* Background */}
            <div className="absolute inset-0 z-0">
              {editSettings.loginBgUrl ? (
                <img 
                  src={editSettings.loginBgUrl} 
                  className="w-full h-full object-cover" 
                  alt="Background preview" 
                  style={{ filter: `blur(${editSettings.loginBgBlur || 0}px)` }}
                />
              ) : (
                <div className="absolute inset-0 bg-slate-900/5" />
              )}
              <div 
                className="absolute inset-0 bg-black" 
                style={{ opacity: (editSettings.loginBgOpacity || 0) / 100 }} 
              />
            </div>

            {/* Login Card Preview */}
            <div className="w-full max-w-sm grid grid-cols-1 lg:grid-cols-2 gap-4 items-center relative z-10 scale-[0.6]">
               <div className="hidden lg:block space-y-4">
                  <div className="inline-flex items-center gap-2 px-2 py-1 bg-white/20 text-white rounded-full text-[8px] font-bold backdrop-blur-sm">
                    <Sparkles size={10} />
                    <span>Nền tảng y tế thông minh</span>
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight">Nâng tầm Chất lượng Y tế</h2>
                  <p className="text-[10px] text-white/70 line-clamp-2">{editSettings.appDescription}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {previewFeatures.map((f, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                        <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center mb-1">
                          {f.icon}
                        </div>
                        <p className="text-[7px] font-bold text-white">{f.title}</p>
                      </div>
                    ))}
                  </div>
               </div>

               <div className={cn(
                 "p-6 rounded-[32px] border transition-all text-center",
                 editSettings.loginCardGlassMode 
                  ? "bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl" 
                  : "bg-white border-transparent shadow-2xl"
               )}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: editSettings.loginPrimaryColor || '#3b82f6' }}>
                    {editSettings.loginLogoUrl ? (
                      <img src={editSettings.loginLogoUrl} className="w-8 h-8 object-contain" alt="Logo preview" referrerPolicy="no-referrer" />
                    ) : (
                      <Pill size={24} className="text-white" />
                    )}
                  </div>
                  <h1 className={cn("text-xl font-black mb-1", editSettings.loginCardGlassMode ? "text-white" : "text-slate-900")}>{editSettings.appName}</h1>
                  <p className={cn("text-[9px] font-bold text-slate-500 mb-6", editSettings.loginCardGlassMode ? "text-white/60" : "text-slate-500")}>{editSettings.loginSubtitle}</p>
                  
                  <div className="space-y-3">
                    <div className="h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-white" style={{ backgroundColor: '#111827' }}>
                      Đăng nhập <LogIn size={12} />
                    </div>
                    <div className="h-0.5 bg-slate-200 w-1/2 mx-auto" />
                    <p className="text-[8px] text-slate-400">Bảo mật bởi Google</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
