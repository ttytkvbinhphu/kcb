import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, Database, Search } from 'lucide-react';
import { Ingredient, Excipient } from '../types';
import { db, collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface CatalogManagementProps {
  type: 'ingredient' | 'excipient' | 'ingredient_category' | 'excipient_category';
  isDarkMode: boolean;
  onClose: () => void;
  inline?: boolean;
}

const CatalogManagement: React.FC<CatalogManagementProps> = ({ type, isDarkMode, onClose, inline = false }) => {
  const collectionName = 
    type === 'ingredient' ? 'ingredients' : 
    type === 'excipient' ? 'excipients' : 
    type === 'ingredient_category' ? 'ingredient_categories' :
    'excipient_categories';

  const label = 
    type === 'ingredient' ? 'Hoạt chất' : 
    type === 'excipient' ? 'Tá dược' : 
    type === 'ingredient_category' ? 'Phân loại hoạt chất' :
    'Phân loại tá dược';
  
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string, name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<any>({
    name: '',
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setItems(data);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      setLoading(false);
      // Don't throw for list errors to avoid crashing the UI
    });

    return () => unsubscribe();
  }, [collectionName]);

  useEffect(() => {
    if (type === 'ingredient') {
      const q = query(collection(db, 'ingredient_categories'), orderBy('name'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setCategories(snapshot.docs.map(doc => doc.data()));
      }, (error) => {
        console.error("Error fetching ingredient categories:", error);
      });
      return () => unsubscribe();
    } else if (type === 'excipient') {
      const q = query(collection(db, 'excipient_categories'), orderBy('name'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setCategories(snapshot.docs.map(doc => doc.data()));
      }, (error) => {
        console.error("Error fetching excipient categories:", error);
      });
      return () => unsubscribe();
    }
  }, [type]);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item });
    } else {
      setEditingItem(null);
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        description: '',
        categoryId: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const id = formData.id || Math.random().toString(36).substring(2, 11);

    try {
      // Clean up data to satisfy firestore rules
      const saveData: any = { 
        id, 
        name: formData.name.trim()
      };
      
      if (formData.description && formData.description.trim()) {
        saveData.description = formData.description.trim();
      }
      
      if ((type === 'ingredient' || type === 'excipient') && formData.categoryId) {
        saveData.categoryId = formData.categoryId;
      }

      await setDoc(doc(db, collectionName, id), saveData);
      setIsModalOpen(false);
    } catch (error) {
      console.error(`Error saving ${type}:`, error);
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmData({ id, name });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmData) return;
    try {
      await deleteDoc(doc(db, collectionName, confirmData.id));
      setIsConfirmOpen(false);
      setConfirmData(null);
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${confirmData.id}`);
    }
  };

  const filteredItems = items.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const content = (
    <motion.div 
      initial={inline ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        inline 
          ? "w-full h-full min-h-[600px] flex flex-col" 
          : "w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col sm:max-h-[85vh]",
        isDarkMode ? "bg-slate-950 border border-slate-800" : "bg-slate-50"
      )}
    >
      <div className={cn(
        "p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
      )}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-indigo-600 rounded-lg sm:rounded-xl text-white">
            <Database className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className={cn("text-lg sm:text-xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>Quản lý {label}</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Tổng cộng: {items.length} mục</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus size={16} /> Thêm mới
          </button>
          {!inline && (
            <button 
              onClick={onClose}
              className={cn(
                "p-2 rounded-lg sm:rounded-xl transition-colors",
                isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              )}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className={cn(
        "p-4 border-b",
        isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white/50"
      )}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder={`Tìm kiếm ${label.toLowerCase()}...`}
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium",
              isDarkMode ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-900"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map(item => (
              <div key={item.id} className={cn(
                "p-4 rounded-2xl border transition-all group relative",
                isDarkMode ? "bg-slate-900 border-slate-800 hover:border-indigo-900/50" : "bg-white border-slate-100 hover:border-indigo-200 shadow-sm"
              )}>
                 <div className="flex justify-between items-start">
                  <div className="flex-1 overflow-hidden pr-8">
                     <h4 className={cn("font-bold text-sm truncate mb-1", isDarkMode ? "text-white" : "text-slate-900")}>{item.name}</h4>
                     {(type === 'ingredient' || type === 'excipient') && item.categoryId && (
                       <div className={cn(
                         "inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mb-1",
                         isDarkMode ? "bg-indigo-900/40 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                       )}>
                         {categories.find(c => c.id === item.categoryId)?.name || 'Chưa phân loại'}
                       </div>
                     )}
                     {item.description && (
                       <p className="text-[10px] text-slate-500 line-clamp-2">{item.description}</p>
                     )}
                  </div>
                  <div className="absolute right-3 top-3 flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                      onClick={() => handleOpenModal(item)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors bg-white/10 sm:bg-transparent",
                        isDarkMode ? "text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/30" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      )}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id, item.name)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors bg-white/10 sm:bg-transparent",
                        isDarkMode ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Database size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">Không tìm thấy {label.toLowerCase()} nào</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      {inline ? (
        content
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          {content}
        </div>
      )}

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
                    {editingItem ? `Chỉnh sửa ${label.toLowerCase()}` : `Thêm ${label.toLowerCase()} mới`}
                  </h4>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 p-4 sm:p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tên {label.toLowerCase()}</label>
                    <input
                      autoFocus
                      type="text"
                      required
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={`Ví dụ: ${type === 'ingredient' ? 'Paracetamol' : type === 'excipient' ? 'Lactose' : 'Kháng sinh'}...`}
                    />
                  </div>

                  {(type === 'ingredient' || type === 'excipient') && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Phân loại {type === 'ingredient' ? 'hoạt chất' : 'tá dược'}</label>
                      <select
                        className={cn(
                          "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm appearance-none",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                        )}
                        value={formData.categoryId || ''}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      >
                        <option value="">-- Chọn phân loại --</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Mô tả / Ghi chú</label>
                    <textarea
                      rows={3}
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm resize-none",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Thông tin bổ sung..."
                    />
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
                      "flex-1 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-700 transition-all shadow-lg",
                      isDarkMode ? "shadow-none" : "shadow-indigo-200"
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

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={`Xác nhận xóa ${label}`}
        message={`Bạn có chắc chắn muốn xóa "${confirmData?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        isDarkMode={isDarkMode}
      />
    </>
  );
};

export default CatalogManagement;
