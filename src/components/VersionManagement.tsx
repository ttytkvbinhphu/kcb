import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Plus, X, Save, Trash2, Calendar, FileText, CheckCircle2, AlertCircle, Info, Sparkles, Wrench, ChevronRight, Maximize2 } from 'lucide-react';
import { db, collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { VersionLog, UserProfile } from '../types';
import { cn, getBustedPhotoURL } from '../lib/utils';
import { Users, UserCheck } from 'lucide-react';
import { VersionUpdateContent, markVersionAsRead } from './UpdateNotification';

interface VersionLogViewProps {
  isDarkMode: boolean;
  userRole: string;
  uid: string;
}

const VersionManagement: React.FC<VersionLogViewProps> = ({ isDarkMode, userRole, uid }) => {
  const [versions, setVersions] = useState<VersionLog[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Partial<VersionLog> | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const isAdmin = ['admin', 'operator'].includes(userRole);

  useEffect(() => {
    const q = query(collection(db, 'versions'), orderBy('releaseDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VersionLog));
      setVersions(data);
      if (data.length > 0 && !selectedVersionId) {
        setSelectedVersionId(data[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'versions');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(doc => doc.data() as UserProfile));
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleSave = async () => {
    if (!editingVersion?.versionName || !editingVersion?.releaseDate) return;

    const id = editingVersion.id || `v-${Date.now()}`;
    const data = {
      ...editingVersion,
      id,
      isDraft: editingVersion.isDraft ?? false,
      createdBy: uid,
      createdAt: editingVersion.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'versions', id), data);
      setIsAdding(false);
      setEditingVersion(null);
    } catch (e) {
      console.error("Error saving version:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa phiên bản này?")) {
      await deleteDoc(doc(db, 'versions', id));
      if (selectedVersionId === id) {
        setSelectedVersionId(versions.find(v => v.id !== id)?.id || null);
      }
    }
  };

  useEffect(() => {
    const handleTriggerAdd = () => {
      setEditingVersion({ 
        versionName: '', 
        releaseDate: new Date().toISOString().split('T')[0],
        notes: '',
        changes: [],
        isDraft: false
      });
      setIsAdding(true);
    };
    window.addEventListener('trigger-add-version', handleTriggerAdd);
    return () => window.removeEventListener('trigger-add-version', handleTriggerAdd);
  }, []);

  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  // Shared content renderer to avoid duplication
  const renderVersionDetails = (v: VersionLog, isPopup = false) => (
    <div className={cn(
      "relative overflow-hidden",
      isPopup ? "p-8 md:p-12" : "p-10 rounded-[40px] border",
      !isPopup && (isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-2xl shadow-slate-200/50")
    )}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <Sparkles size={isPopup ? 200 : 120} />
      </div>

      <div className="flex items-start justify-between mb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <History size={isPopup ? 40 : 32} />
            </div>
            <div>
              <h1 className={cn("font-black tracking-tighter", isPopup ? "text-5xl" : "text-4xl")}>{v.versionName}</h1>
              <p className="text-sm font-bold opacity-50 flex items-center gap-2">
                <Calendar size={14} />
                Phát hành ngày {new Date(v.releaseDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {v.isDraft && (
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20 uppercase tracking-widest">Bản nháp</span>
            )}
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20 uppercase tracking-widest">
              {versions[0]?.id === v.id ? "Phiên bản mới nhất" : "Phiên bản cũ"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isPopup && (
            <button 
              onClick={() => setShowPopup(true)}
              className="p-2.5 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/10"
              title="Xem toàn màn hình"
            >
              <Maximize2 size={18} />
            </button>
          )}
          {isAdmin && !isPopup && (
            <>
              <button 
                onClick={() => {
                  setEditingVersion(v);
                  setIsAdding(true);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                  isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                )}
              >
                <Wrench size={14} />
                Chỉnh sửa
              </button>
              <button 
                onClick={() => handleDelete(v.id)}
                className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          {isPopup && (
            <button onClick={() => setShowPopup(false)} className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={32} />
            </button>
          )}
        </div>
      </div>

      {v.notes && (
        <div className={cn(
          "mb-10 p-6 rounded-3xl border-l-4 border-primary italic leading-relaxed",
          isPopup ? "text-xl" : "text-lg",
          isDarkMode ? "bg-slate-800/30 border-primary/30 text-slate-300" : "bg-primary/5 border-primary/20 text-slate-700"
        )}>
          "{v.notes}"
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Danh sách các thay đổi</h3>
        {v.changes && v.changes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {v.changes.map((change, cIdx) => (
              <motion.div 
                key={cIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: cIdx * 0.05 }}
                className={cn(
                  "p-5 rounded-[28px] border flex items-start gap-4 group transition-all hover:scale-[1.01]",
                  isDarkMode ? "bg-slate-800/50 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn(
                  "mt-0.5 p-2 rounded-xl shrink-0 shadow-sm",
                  change.type === 'feature' ? "bg-emerald-500/10 text-emerald-500" :
                  change.type === 'fix' ? "bg-rose-500/10 text-rose-500" :
                  change.type === 'improvement' ? "bg-blue-500/10 text-blue-500" :
                  "bg-amber-500/10 text-amber-500"
                )}>
                  {change.type === 'feature' ? <Sparkles size={16} /> :
                   change.type === 'fix' ? <Wrench size={16} /> :
                   change.type === 'improvement' ? <ChevronRight size={16} /> :
                   <Info size={16} />}
                </div>
                <div className="space-y-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    change.type === 'feature' ? "text-emerald-500" :
                    change.type === 'fix' ? "text-rose-500" :
                    change.type === 'improvement' ? "text-blue-500" :
                    "text-amber-500"
                  )}>
                    {change.type === 'feature' ? 'Tính năng mới' :
                     change.type === 'fix' ? 'Sửa lỗi' :
                     change.type === 'improvement' ? 'Cải tiến' :
                     'Thay đổi lớn'}
                  </span>
                  <p className="text-sm font-bold leading-relaxed">{change.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 opacity-30 italic text-sm">
            Không có chi tiết thay đổi cho phiên bản này.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-full mx-auto py-8 px-6 lg:px-16">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Left: Version List */}
        <div className="w-full xl:w-80 space-y-4 shrink-0 relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <History className="text-primary" />
              Lịch sử phiên bản
            </h2>
          </div>

          <div className="space-y-4 relative">
            <div className={cn(
              "absolute left-4 top-4 bottom-4 w-px",
              isDarkMode ? "bg-slate-800" : "bg-slate-200"
            )} />

            {versions.map((v, idx) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative pl-10"
                onClick={() => setSelectedVersionId(v.id)}
              >
                <div className={cn(
                  "absolute left-[13px] top-6 w-3 h-3 rounded-full border-2 z-10 transition-all duration-300",
                  selectedVersionId === v.id ? "bg-primary border-primary ring-4 ring-primary/20 scale-125" : 
                  (isDarkMode ? "bg-slate-950 border-slate-700" : "bg-white border-slate-300")
                )} />

                <div className={cn(
                  "p-5 rounded-2xl border transition-all cursor-pointer group",
                  selectedVersionId === v.id 
                    ? (isDarkMode ? "bg-slate-800 border-primary/50 shadow-lg shadow-primary/5" : "bg-white border-primary shadow-lg shadow-primary/5")
                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 hover:border-slate-200")
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-black tracking-tight">{v.versionName}</span>
                        {v.isDraft && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] font-black border border-amber-500/20">DRAFT</span>
                        )}
                        {idx === 0 && !v.isDraft && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black border border-emerald-500/20">LATEST</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] opacity-50 font-bold">
                        <Calendar size={10} />
                        {new Date(v.releaseDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVersionId(v.id);
                          setShowPopup(true);
                        }}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Maximize2 size={14} />
                      </button>
                      <ChevronRight size={16} className={cn(
                        "transition-transform",
                        selectedVersionId === v.id ? "translate-x-0 opacity-100 text-primary" : "translate-x-[-4px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                      )} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {versions.length === 0 && (
              <div className="text-center py-20 opacity-30">
                <History size={48} className="mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-tighter">Chưa có nhật ký</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div className="hidden lg:block flex-1 sticky top-24">
          <AnimatePresence mode="wait">
            {selectedVersion ? (
              <motion.div
                key={selectedVersion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {renderVersionDetails(selectedVersion)}
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] opacity-30 min-h-[400px]">
                <div className="text-center">
                  <FileText size={64} className="mx-auto mb-4" />
                  <p className="text-xl font-black uppercase tracking-tighter">Chọn một phiên bản để xem chi tiết</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Read Status Panel (Admin only) */}
        {isAdmin && selectedVersion && (
          <div className="hidden xl:block w-80 shrink-0 sticky top-24 space-y-6">
            <div className={cn(
              "p-8 rounded-[40px] border",
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/50"
            )}>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Trạng thái đọc</h3>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Theo dõi cập nhật</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-2xl font-black text-emerald-500">
                      {Array.isArray(selectedVersion.readBy) ? selectedVersion.readBy.length : 0}
                    </p>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Đã đọc</p>
                  </div>
                  <div className="p-4 rounded-3xl bg-rose-500/5 border border-rose-500/10">
                    <p className="text-2xl font-black text-rose-500">
                      {Math.max(0, allUsers.length - (Array.isArray(selectedVersion.readBy) ? selectedVersion.readBy.length : 0))}
                    </p>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Chưa đọc</p>
                  </div>
                </div>

                {/* User List */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {allUsers.map((user) => {
                    const hasRead = Array.isArray(selectedVersion.readBy) && selectedVersion.readBy.includes(user.uid);
                    return (
                      <div key={user.uid} className="flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden ring-2 ring-offset-2 transition-all",
                            hasRead ? "ring-emerald-500/30" : "ring-slate-100 dark:ring-slate-800 opacity-40",
                            !user.photoURL && (hasRead ? "bg-emerald-500" : "bg-slate-400")
                          )}>
                            {user.photoURL ? (
                              <img src={getBustedPhotoURL(user.photoURL)} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : (
                              user.displayName?.[0] || 'U'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={cn(
                              "text-xs font-black truncate",
                              !hasRead && "opacity-40"
                            )}>{user.displayName}</p>
                            <p className="text-[9px] font-bold opacity-30 truncate">{user.title}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          hasRead ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-slate-200 dark:bg-slate-800"
                        )} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Preview Popup (Annoucement Style) */}
      <AnimatePresence>
        {showPopup && selectedVersion && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPopup(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative z-10 w-full flex justify-center"
            >
              <VersionUpdateContent 
                version={selectedVersion} 
                isDarkMode={isDarkMode} 
                onClose={async () => {
                  setShowPopup(false);
                  if (uid && selectedVersion.id) {
                    await markVersionAsRead(selectedVersion.id, uid);
                  }
                }}
                ctaText="Đóng bản xem trước"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col",
                isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white"
              )}
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-2xl font-black tracking-tight">{editingVersion?.id ? 'Cập nhật phiên bản' : 'Phiên bản mới'}</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Tên phiên bản</label>
                    <input 
                      type="text" 
                      value={editingVersion?.versionName || ''}
                      onChange={e => setEditingVersion({ ...editingVersion!, versionName: e.target.value })}
                      placeholder="VD: v1.2.0"
                      className={cn(
                        "w-full p-4 rounded-2xl border font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none",
                        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Ngày phát hành</label>
                    <input 
                      type="date" 
                      value={editingVersion?.releaseDate || ''}
                      onChange={e => setEditingVersion({ ...editingVersion!, releaseDate: e.target.value })}
                      className={cn(
                        "w-full p-4 rounded-2xl border font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none",
                        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Lời nhắn / Ghi chú nhanh</label>
                  <textarea 
                    value={editingVersion?.notes || ''}
                    onChange={e => setEditingVersion({ ...editingVersion!, notes: e.target.value })}
                    placeholder="VD: Bản cập nhật lớn tối ưu trải nghiệm người dùng..."
                    className={cn(
                      "w-full p-4 rounded-2xl border font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none h-24 resize-none",
                      isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Danh sách thay đổi</label>
                    <button 
                      onClick={() => {
                        const changes = [...(editingVersion?.changes || [])];
                        changes.push({ type: 'feature', description: '' });
                        setEditingVersion({ ...editingVersion!, changes });
                      }}
                      className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                    >
                      + Thêm thay đổi
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editingVersion?.changes?.map((change, idx) => (
                      <div key={idx} className="flex gap-2">
                        <select 
                          value={change.type}
                          onChange={e => {
                            const changes = [...(editingVersion?.changes || [])];
                            changes[idx].type = e.target.value as any;
                            setEditingVersion({ ...editingVersion!, changes });
                          }}
                          className={cn(
                            "p-3 rounded-xl border text-xs font-bold outline-none",
                            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                          )}
                        >
                          <option value="feature">Tính năng</option>
                          <option value="fix">Sửa lỗi</option>
                          <option value="improvement">Cải tiến</option>
                          <option value="breaking">Thay đổi lớn</option>
                        </select>
                        <input 
                          type="text" 
                          value={change.description}
                          onChange={e => {
                            const changes = [...(editingVersion?.changes || [])];
                            changes[idx].description = e.target.value;
                            setEditingVersion({ ...editingVersion!, changes });
                          }}
                          placeholder="Mô tả thay đổi..."
                          className={cn(
                            "flex-1 p-3 rounded-xl border text-xs font-bold outline-none",
                            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                          )}
                        />
                        <button 
                          onClick={() => {
                            const changes = editingVersion?.changes?.filter((_, i) => i !== idx);
                            setEditingVersion({ ...editingVersion!, changes });
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-4 rounded-2xl bg-slate-50">
                  <input 
                    type="checkbox" 
                    id="isDraft"
                    checked={editingVersion?.isDraft || false}
                    onChange={e => setEditingVersion({ ...editingVersion!, isDraft: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isDraft" className="text-xs font-bold opacity-70">Lưu dưới dạng nháp (Chỉ admin thấy)</label>
                </div>
              </div>

              <div className={cn(
                "p-8 border-t transition-colors",
                isDarkMode ? "border-slate-800 bg-slate-900/50 text-white" : "border-slate-100 bg-slate-50/50 text-slate-900"
              )}>
                <button 
                  onClick={handleSave}
                  className="w-full p-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Save size={20} />
                  Lưu phiên bản
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VersionManagement;
