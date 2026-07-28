import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Wrench, ChevronRight, Info, Rocket, Bell, Calendar, Zap, Layout, Star, Plus } from 'lucide-react';
import { db, collection, query, orderBy, limit, where, onSnapshot } from '../firebase';
import { VersionLog } from '../types';
import { cn } from '../lib/utils';

interface UpdateNotificationProps {
  isDarkMode: boolean;
  uid?: string;
}

export const markVersionAsRead = async (versionId: string, uid?: string) => {
  if (!uid || !versionId) return;
  try {
    const { arrayUnion, updateDoc, doc } = await import('../firebase');
    await updateDoc(doc(db, 'versions', versionId), {
      readBy: arrayUnion(uid)
    });
  } catch (e: any) {
    if (e?.code === 'permission-denied' || e?.message?.includes('permission')) {
      // Intentionally ignore permission-denied for non-operator users
    } else {
      console.warn("Could not update read status in Firestore:", e);
    }
  }
};

// Reusable content component for the announcement
export const VersionUpdateContent: React.FC<{ 
  version: VersionLog; 
  allVersions?: VersionLog[];
  onSelectVersion?: (v: VersionLog) => void;
  isDarkMode: boolean; 
  onClose: () => void;
  ctaText?: string;
}> = ({ version, allVersions = [], onSelectVersion, isDarkMode, onClose, ctaText = "Khám phá ngay" }) => {
  return (
    <div className={cn(
      "relative w-full h-full md:h-auto max-w-none md:max-w-2xl max-h-none md:max-h-[90vh] overflow-hidden rounded-none md:rounded-[40px] shadow-2xl flex flex-col border-0 md:border",
      isDarkMode ? "bg-slate-900 border-slate-800 shadow-primary/10" : "bg-white border-slate-100 shadow-indigo-200/50"
    )}>
      {/* Dynamic Header with Animated Gradient */}
      <div className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-emerald-500 opacity-10 animate-pulse pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <motion.div 
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 5, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-primary/30"
            >
              <Rocket size={24} className="md:w-8 md:h-8 drop-shadow-lg" />
            </motion.div>
            <div className="space-y-0.5 md:space-y-1">
              <div className="flex items-center gap-2 md:gap-3">
                <h3 className={cn("text-xl md:text-3xl font-black tracking-tighter", isDarkMode ? "text-white" : "text-slate-900")}>
                  Có gì mới?
                </h3>
                <span className="px-2 py-0.5 md:px-2 md:py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] md:text-[9px] font-black border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1">
                  <Star size={8} className="md:w-2 md:h-2" fill="currentColor" /> Mới
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
                <div className={cn("flex items-center gap-1 text-[10px] md:text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  <Calendar size={12} className="md:w-3.5 md:h-3.5" />
                  {version.releaseDate ? new Date(version.releaseDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Vừa cập nhật'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <button 
              onClick={onClose}
              className={cn(
                "p-2 md:p-3 rounded-xl md:rounded-2xl transition-all text-slate-400",
                isDarkMode ? "hover:bg-slate-800 hover:text-white" : "hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <X size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Version Selector Pills if multiple versions exist */}
        {allVersions.length > 1 && (
          <div className="relative z-10 px-4 md:px-6 pb-3 flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider shrink-0", isDarkMode ? "text-slate-400" : "text-slate-500")}>Các phiên bản:</span>
            {allVersions.map((v) => {
              const isSelected = v.id === version.id || v.versionName === version.versionName;
              return (
                <button
                  key={v.id || v.versionName}
                  onClick={() => onSelectVersion && onSelectVersion(v)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer border",
                    isSelected
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                      : isDarkMode
                        ? "bg-slate-800/80 text-slate-300 border-slate-700/60 hover:text-white hover:bg-slate-800"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  )}
                >
                  {v.versionName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0 space-y-4 md:space-y-8 custom-scrollbar">
        {version.notes && (
          <div className={cn(
            "p-4 md:p-6 rounded-[24px] md:rounded-[32px] border leading-relaxed relative overflow-hidden group",
            isDarkMode ? "bg-slate-800/40 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-700 shadow-inner"
          )}>
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-500">
              <Bell size={80} className="md:w-[100px] md:h-[100px] text-primary" />
            </div>
            <div className="relative space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <Sparkles size={12} className="md:w-3 md:h-3" /> Lời nhắn từ Dev
              </div>
              <p className="font-bold text-xs md:text-sm leading-relaxed whitespace-pre-line italic">
                "{version.notes}"
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4 px-2">
            <div className={cn("h-px flex-1", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
            <h4 className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-slate-400" : "text-slate-500")}>Danh sách cập nhật</h4>
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
                    "mt-1 p-2 md:p-2.5 rounded-xl md:rounded-2xl shrink-0 shadow-lg transition-transform group-hover:scale-110",
                    change.type === 'new' ? "bg-purple-500 text-white shadow-purple-500/20" :
                    change.type === 'feature' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                    change.type === 'fix' ? "bg-rose-500 text-white shadow-rose-500/20" :
                    change.type === 'improvement' ? "bg-blue-500 text-white shadow-blue-500/20" :
                    "bg-amber-500 text-white shadow-amber-500/20"
                  )}>
                    {change.type === 'new' ? <Plus size={14} className="md:w-4 md:h-4" /> :
                     change.type === 'feature' ? <Sparkles size={14} className="md:w-4 md:h-4" /> :
                     change.type === 'fix' ? <Wrench size={14} className="md:w-4 md:h-4" /> :
                     change.type === 'improvement' ? <Layout size={14} className="md:w-4 md:h-4" /> :
                     <Info size={14} className="md:w-4 md:h-4" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                    <p className={cn(
                      "text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-60",
                      change.type === 'new' ? "text-purple-500" :
                      change.type === 'feature' ? "text-emerald-500" :
                      change.type === 'fix' ? "text-rose-500" :
                      change.type === 'improvement' ? "text-blue-500" :
                      "text-amber-500"
                    )}>
                      {change.type === 'new' ? 'Mới' :
                       change.type === 'feature' ? 'Tính năng mới' :
                       change.type === 'fix' ? 'Sửa lỗi' :
                       change.type === 'improvement' ? 'Cải tiến' :
                       'Thay đổi hệ thống'}
                    </p>
                    <span className={cn("text-xs md:text-sm font-bold leading-tight tracking-tight", isDarkMode ? "text-slate-200" : "text-slate-900")}>
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
        "p-4 md:p-6 shrink-0 bg-gradient-to-t to-transparent",
        isDarkMode ? "from-slate-950/80" : "from-slate-50/80"
      )}>
        <button 
          onClick={onClose}
          className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 group"
        >
          <span className="text-xs md:text-sm">{ctaText}</span>
          <ChevronRight size={16} className="md:w-5 md:h-5 group-hover:translate-x-2 transition-transform" />
        </button>
      </div>
    </div>
  );
};

const defaultVersionLog: VersionLog = {
  id: 'v1.0.0',
  versionName: 'v1.0.0',
  releaseDate: new Date().toISOString().split('T')[0],
  notes: 'Chào mừng bạn đến với hệ thống Quản lý Dược & Y tế lâm sàng!',
  changes: [
    { type: 'new', description: 'Cập nhật giao diện tra cứu thuốc và tính liều lượng chính xác.' },
    { type: 'feature', description: 'Tích hợp tra cứu tương tác thuốc và nhóm dược lý.' },
    { type: 'improvement', description: 'Tối ưu hóa hiệu năng và trải nghiệm người dùng.' }
  ],
  createdBy: 'system',
  createdAt: new Date().toISOString()
};

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ isDarkMode, uid }) => {
  const [allVersions, setAllVersions] = useState<VersionLog[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionLog | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const handleOpenWhatsNew = () => {
      if (allVersions.length > 0) {
        setSelectedVersion(allVersions[0]);
      }
      setIsOpen(true);
    };
    window.addEventListener('open-whats-new', handleOpenWhatsNew);
    return () => window.removeEventListener('open-whats-new', handleOpenWhatsNew);
  }, [allVersions]);

  useEffect(() => {
    const q = query(
      collection(db, 'versions'),
      where('isDraft', '==', false),
      orderBy('releaseDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as VersionLog));
        setAllVersions(list);
        if (!selectedVersion || !list.some(v => v.id === selectedVersion.id)) {
          setSelectedVersion(list[0]);
        }

        const v = list[0];
        const lastSeen = localStorage.getItem('lastSeenVersion');
        if (lastSeen !== v.versionName && !hasChecked) {
          setIsOpen(true);
          setHasChecked(true);
        }
      } else {
        setAllVersions([defaultVersionLog]);
        setSelectedVersion(defaultVersionLog);
      }
    }, (error) => {
      console.warn("UpdateNotification snapshot listener error:", error);
      setAllVersions([defaultVersionLog]);
      setSelectedVersion(defaultVersionLog);
    });

    return () => unsubscribe();
  }, [uid, hasChecked]);

  const activeVersion = selectedVersion || allVersions[0] || defaultVersionLog;

  const handleClose = () => {
    setIsOpen(false);
    const latest = allVersions[0];
    if (latest) {
      localStorage.setItem('lastSeenVersion', latest.versionName);
      if (uid && latest.id) {
        markVersionAsRead(latest.id, uid);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-8 cursor-pointer"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full h-full md:h-auto max-w-none md:max-w-2xl flex justify-center items-center cursor-default"
          >
            <VersionUpdateContent 
              version={activeVersion} 
              allVersions={allVersions}
              onSelectVersion={(v) => setSelectedVersion(v)}
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
