import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Wrench, ChevronRight, Info, Rocket, Bell, Calendar, Zap, Layout, Star } from 'lucide-react';
import { db, collection, query, orderBy, limit, where, onSnapshot } from '../firebase';
import { VersionLog } from '../types';
import { cn } from '../lib/utils';

interface UpdateNotificationProps {
  isDarkMode: boolean;
  uid?: string;
}

export const markVersionAsRead = async (versionId: string, uid: string) => {
  try {
    const { arrayUnion, updateDoc, doc } = await import('../firebase');
    await updateDoc(doc(db, 'versions', versionId), {
      readBy: arrayUnion(uid)
    });
  } catch (e) {
    console.error("Error updating read status:", e);
  }
};

// Reusable content component for the announcement
export const VersionUpdateContent: React.FC<{ 
  version: VersionLog; 
  isDarkMode: boolean; 
  onClose: () => void;
  ctaText?: string;
}> = ({ version, isDarkMode, onClose, ctaText = "Khám phá ngay" }) => {
  return (
    <div className={cn(
      "relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] md:rounded-[40px] shadow-2xl flex flex-col border",
      isDarkMode ? "bg-slate-900 border-slate-800 shadow-primary/10" : "bg-white border-slate-100 shadow-indigo-200/50"
    )}>
      {/* Dynamic Header with Animated Gradient */}
      <div className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-emerald-500 opacity-10 animate-pulse" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="relative p-6 md:p-10 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <motion.div 
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 5, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-primary/30"
            >
              <Rocket size={28} className="md:w-10 md:h-10 drop-shadow-lg" />
            </motion.div>
            <div className="space-y-0.5 md:space-y-1">
              <div className="flex items-center gap-2 md:gap-3">
                <h3 className={cn("text-2xl md:text-4xl font-black tracking-tighter", isDarkMode ? "text-white" : "text-slate-900")}>
                  Có gì mới?
                </h3>
                <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] md:text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1">
                  <Star size={8} className="md:w-2.5 md:h-2.5" fill="currentColor" /> Mới
                </span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                 <div className={cn(
                   "flex items-center gap-1 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-black tracking-tight",
                   isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                 )}>
                  <Zap size={10} className="md:w-3 md:h-3 text-primary fill-primary" />
                  PHIÊN BẢN {version.versionName}
                </div>
                <div className="flex items-center gap-1 text-[10px] md:text-xs font-bold opacity-40 uppercase tracking-widest">
                  <Calendar size={12} className="md:w-3.5 md:h-3.5" />
                  {new Date(version.releaseDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={cn(
              "p-2 md:p-3 rounded-xl md:rounded-2xl transition-all text-slate-400",
              isDarkMode ? "hover:bg-slate-800 hover:text-white" : "hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <X size={20} className="md:w-7 md:h-7" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-0 space-y-6 md:space-y-10 custom-scrollbar">
        {version.notes && (
          <div className={cn(
            "p-5 md:p-8 rounded-[32px] md:rounded-[40px] border leading-relaxed relative overflow-hidden group",
            isDarkMode ? "bg-slate-800/40 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-700 shadow-inner"
          )}>
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-500">
              <Bell size={80} className="md:w-[120px] md:h-[120px] text-primary" />
            </div>
            <div className="relative space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 text-[9px] md:text-xs font-black uppercase tracking-[0.2em] text-primary">
                <Sparkles size={12} className="md:w-3.5 md:h-3.5" /> Lời nhắn từ Dev
              </div>
              <p className="font-bold text-sm md:text-lg leading-relaxed whitespace-pre-line italic">
                "{version.notes}"
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4 px-2">
            <div className={cn("h-px flex-1", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
            <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Danh sách cập nhật</h4>
            <div className={cn("h-px flex-1", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {version.changes && version.changes.length > 0 ? (
              version.changes.map((change, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx} 
                  className={cn(
                    "p-4 md:p-6 rounded-[24px] md:rounded-[32px] border flex items-start gap-3 md:gap-5 transition-all hover:translate-x-2 group",
                    isDarkMode ? "bg-slate-800/30 border-slate-800 hover:bg-slate-800/50" : "bg-white border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5"
                  )}
                >
                  <div className={cn(
                    "mt-1 p-2 md:p-3 rounded-xl md:rounded-2xl shrink-0 shadow-lg transition-transform group-hover:scale-110",
                    change.type === 'feature' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                    change.type === 'fix' ? "bg-rose-500 text-white shadow-rose-500/20" :
                    change.type === 'improvement' ? "bg-blue-500 text-white shadow-blue-500/20" :
                    "bg-amber-500 text-white shadow-amber-500/20"
                  )}>
                    {change.type === 'feature' ? <Sparkles size={14} className="md:w-5 md:h-5" /> :
                     change.type === 'fix' ? <Wrench size={14} className="md:w-5 md:h-5" /> :
                     change.type === 'improvement' ? <Layout size={14} className="md:w-5 md:h-5" /> :
                     <Info size={14} className="md:w-5 md:h-5" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                    <p className={cn(
                      "text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-60",
                      change.type === 'feature' ? "text-emerald-500" :
                      change.type === 'fix' ? "text-rose-500" :
                      change.type === 'improvement' ? "text-blue-500" :
                      "text-amber-500"
                    )}>
                      {change.type === 'feature' ? 'Tính năng mới' :
                       change.type === 'fix' ? 'Sửa lỗi' :
                       change.type === 'improvement' ? 'Cải tiến' :
                       'Thay đổi hệ thống'}
                    </p>
                    <span className={cn("text-sm md:text-lg font-bold leading-tight tracking-tight", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                      {change.description}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 md:py-12 opacity-30 italic font-bold text-xs">
                Không có chi tiết thay đổi nào được liệt kê.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cn(
        "p-6 md:p-10 shrink-0 bg-gradient-to-t to-transparent",
        isDarkMode ? "from-slate-950/80" : "from-slate-50/80"
      )}>
        <button 
          onClick={onClose}
          className="w-full p-4 md:p-6 rounded-2xl md:rounded-3xl bg-gradient-to-r from-primary to-indigo-600 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 md:gap-4 group"
        >
          <span className="text-sm md:text-lg">{ctaText}</span>
          <ChevronRight size={20} className="md:w-6 md:h-6 group-hover:translate-x-2 transition-transform" />
        </button>
      </div>
    </div>
  );
};

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ isDarkMode, uid }) => {
  const [latestVersion, setLatestVersion] = useState<VersionLog | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'versions'),
      where('isDraft', '==', false),
      orderBy('releaseDate', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const v = { id: snap.docs[0].id, ...snap.docs[0].data() } as VersionLog;
        setLatestVersion(v);
        
        const lastSeen = localStorage.getItem('lastSeenVersion');
        if (lastSeen !== v.versionName && !hasChecked) {
          setIsOpen(true);
          setHasChecked(true);
        }
      }
    });

    return () => unsubscribe();
  }, [hasChecked]);

  const handleClose = async () => {
    if (latestVersion) {
      localStorage.setItem('lastSeenVersion', latestVersion.versionName);
      
      if (uid) {
        await markVersionAsRead(latestVersion.id, uid);
      }
    }
    setIsOpen(false);
  };

  if (!latestVersion) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative z-10 w-full flex justify-center"
          >
            <VersionUpdateContent 
              version={latestVersion} 
              isDarkMode={isDarkMode} 
              onClose={handleClose} 
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpdateNotification;
