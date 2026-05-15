import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Plus, X, Save, Trash2, Calendar, FileText, CheckCircle2, AlertCircle, Info, Sparkles, Wrench, ChevronRight } from 'lucide-react';
import { db, collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { VersionLog } from '../types';
import { cn } from '../lib/utils';

interface VersionLogViewProps {
  isDarkMode: boolean;
  userRole: string;
  uid: string;
}

const VersionManagement: React.FC<VersionLogViewProps> = ({ isDarkMode, userRole, uid }) => {
  const [versions, setVersions] = useState<VersionLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Partial<VersionLog> | null>(null);
  const isAdmin = ['admin', 'operator'].includes(userRole);

  useEffect(() => {
    const q = query(collection(db, 'versions'), orderBy('releaseDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setVersions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VersionLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'versions');
    });
    return () => unsubscribe();
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="space-y-8 relative">
          {/* Vertical Line */}
          <div className={cn(
            "absolute left-4 sm:left-8 top-4 bottom-4 w-px",
            isDarkMode ? "bg-slate-800" : "bg-slate-200"
          )} />

          {versions.map((v, idx) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-12 sm:pl-20"
            >
              {/* Dot */}
              <div className={cn(
                "absolute left-[13px] sm:left-[29px] top-6 w-3 h-3 rounded-full border-2 z-10",
                idx === 0 ? "bg-primary border-primary ring-4 ring-primary/20" : 
                (isDarkMode ? "bg-slate-950 border-slate-700" : "bg-white border-slate-300")
              )} />

              <div className={cn(
                "p-6 lg:p-8 rounded-[32px] border transition-all hover:shadow-2xl",
                isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 shadow-sm hover:border-slate-200"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-black tracking-tight">{v.versionName}</h3>
                      {v.isDraft && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20">DRAFT</span>
                      )}
                      {idx === 0 && !v.isDraft && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20">LATEST</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs opacity-50 font-bold">
                      <Calendar size={12} />
                      {new Date(v.releaseDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingVersion(v);
                          setIsAdding(true);
                        }}
                        className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                      >
                        <Wrench size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(v.id)}
                        className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {v.notes && (
                  <div className="mb-6 text-sm leading-relaxed opacity-70 italic whitespace-pre-line">
                    "{v.notes}"
                  </div>
                )}

                {v.changes && v.changes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {v.changes.map((change, cIdx) => (
                      <div key={cIdx} className={cn(
                        "p-4 rounded-2xl border flex items-start gap-3",
                        isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                      )}>
                        <div className={cn(
                          "mt-1 p-1 rounded-md shrink-0",
                          change.type === 'feature' ? "bg-emerald-500/10 text-emerald-500" :
                          change.type === 'fix' ? "bg-rose-500/10 text-rose-500" :
                          change.type === 'improvement' ? "bg-blue-500/10 text-blue-500" :
                          "bg-amber-500/10 text-amber-500"
                        )}>
                          {change.type === 'feature' ? <Sparkles size={12} /> :
                           change.type === 'fix' ? <Wrench size={12} /> :
                           change.type === 'improvement' ? <ChevronRight size={12} /> :
                           <Info size={12} />}
                        </div>
                        <span className="text-sm font-bold">{change.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {versions.length === 0 && (
            <div className="text-center py-20 opacity-30">
              <History size={64} className="mx-auto mb-4" />
              <p className="text-xl font-black uppercase tracking-tighter">Chưa có nhật ký phiên bản</p>
            </div>
          )}
        </div>

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

                <div className="flex items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
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

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
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
