import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Folder, FolderPlus, Save, X, Loader2, GripVertical } from 'lucide-react';
import { DrugGroup } from '../types';
import { db, collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface DrugGroupManagementProps {
  isDarkMode: boolean;
  onClose: () => void;
}

const DrugGroupManagement: React.FC<DrugGroupManagementProps> = ({ isDarkMode, onClose }) => {
  const [groups, setGroups] = useState<DrugGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<DrugGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string, name: string } | null>(null);
  const [formData, setFormData] = useState<Partial<DrugGroup>>({
    name: '',
    parentId: null,
    level: 0,
    order: 0,
    bannerUrl: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'drug_groups'), orderBy('order'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => doc.data() as DrugGroup);
      setGroups(groupsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'drug_groups');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (group?: DrugGroup, parentId: string | null = null, level: number = 0) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        ...group,
        bannerUrl: group.bannerUrl || ''
      });
    } else {
      setEditingGroup(null);
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        parentId: parentId,
        level: level,
        order: groups.filter(g => g.parentId === parentId).length,
        bannerUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.level === undefined) return;

    try {
      const id = formData.id || Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'drug_groups', id), { ...formData, id });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving drug group:", error);
      alert("Lỗi khi lưu nhóm thuốc.");
    }
  };

  const handleDelete = (id: string, name: string) => {
    const hasChildren = groups.some(g => g.parentId === id);
    if (hasChildren) {
      alert("Không thể xóa nhóm này vì có chứa nhóm con. Vui lòng xóa các nhóm con trước.");
      return;
    }

    setConfirmData({ id, name });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmData) return;
    try {
      await deleteDoc(doc(db, 'drug_groups', confirmData.id));
    } catch (error) {
      console.error("Error deleting drug group:", error);
      alert("Lỗi khi xóa nhóm thuốc.");
    }
  };

  const renderGroupItem = (group: DrugGroup, level: number) => {
    const children = groups.filter(g => g.parentId === group.id).sort((a, b) => a.order - b.order);
    
    return (
      <div key={group.id} className="mb-2">
        <div className={cn(
          "flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all group",
          isDarkMode ? "bg-slate-900/50 border-slate-800 hover:border-blue-900" : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
        )}>
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <div className={cn(
              "p-1.5 sm:p-2 rounded-lg shrink-0",
              level === 0 ? "bg-blue-500/10 text-blue-500" : 
              level === 1 ? "bg-indigo-500/10 text-indigo-500" : 
              level === 2 ? "bg-emerald-500/10 text-emerald-500" :
              "bg-amber-500/10 text-amber-500"
            )}>
              <Folder size={18} />
            </div>
            <div className="overflow-hidden">
              <h4 className={cn("font-bold text-xs sm:text-sm truncate", isDarkMode ? "text-white" : "text-slate-900")}>{group.name}</h4>
              <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Cấp {level + 1}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {level < 3 && (
              <button 
                onClick={() => handleOpenModal(undefined, group.id, level + 1)}
                className={cn(
                  "p-1.5 sm:p-2 rounded-lg transition-colors",
                  isDarkMode ? "text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/30" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                )}
                title="Thêm nhóm con"
              >
                <FolderPlus size={16} />
              </button>
            )}
            <button 
              onClick={() => handleOpenModal(group)}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg transition-colors",
                isDarkMode ? "text-slate-400 hover:text-blue-400 hover:bg-blue-900/30" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              )}
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={() => handleDelete(group.id, group.name)}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg transition-colors",
                isDarkMode ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              )}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {children.length > 0 && (
          <div className={cn(
            "ml-4 sm:ml-8 mt-2 border-l-2 pl-3 sm:pl-4",
            isDarkMode ? "border-slate-800" : "border-slate-100"
          )}>
            {children.map(child => renderGroupItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh]",
          isDarkMode ? "bg-slate-950 border border-slate-800" : "bg-slate-50"
        )}
      >
        <div className={cn(
          "p-4 sm:p-6 border-b flex items-center justify-between",
          isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        )}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-600 rounded-lg sm:rounded-xl text-white">
              <Folder className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className={cn("text-lg sm:text-xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>Quản lý nhóm thuốc</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium hidden xs:block">Phân cấp 3 tầng: Nhóm lớn &gt; Nhóm trung &gt; Nhóm nhỏ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-sm hover:bg-blue-700 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Thêm nhóm cấp 1</span><span className="sm:hidden">Thêm</span>
            </button>
            <button 
              onClick={onClose}
              className={cn(
                "p-2 rounded-lg sm:rounded-xl transition-colors",
                isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              )}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : groups.length > 0 ? (
            <div className="space-y-4">
              {groups
                .filter(g => g.parentId === null)
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(group => renderGroupItem(group, 0))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Folder size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">Chưa có nhóm thuốc nào</p>
              <button 
                onClick={() => handleOpenModal()}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                Tạo nhóm đầu tiên
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col",
                isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white"
              )}
            >
              <form onSubmit={handleSave} className="flex flex-col h-full">
                <div className={cn(
                  "p-4 sm:p-6 border-b flex items-center justify-between",
                  isDarkMode ? "border-slate-800" : "border-slate-100"
                )}>
                  <h4 className={cn("font-black text-sm sm:text-base", isDarkMode ? "text-white" : "text-slate-900")}>
                    {editingGroup ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}
                  </h4>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tên nhóm thuốc</label>
                    <input
                      autoFocus
                      type="text"
                      required
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ví dụ: Kháng sinh, Giảm đau..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">URL Ảnh bìa (Banner)</label>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={formData.bannerUrl || ''}
                      onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                      placeholder="Dán URL ảnh bìa cho nhóm này..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Cấp độ</label>
                      <div className={cn(
                        "px-4 py-2.5 sm:py-3 rounded-xl border font-bold text-xs sm:text-sm",
                        isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
                      )}>
                        Cấp {formData.level! + 1}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Thứ tự</label>
                      <input
                        type="number"
                        className={cn(
                          "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                        )}
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-4 sm:p-6 flex gap-2 sm:gap-3",
                  isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
                )}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={cn(
                      "flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all",
                      isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                    )}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={cn(
                      "flex-1 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-lg",
                      isDarkMode ? "shadow-none" : "shadow-blue-200"
                    )}
                  >
                    Lưu lại
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa nhóm thuốc"
        message={`Bạn có chắc chắn muốn xóa nhóm "${confirmData?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default DrugGroupManagement;
