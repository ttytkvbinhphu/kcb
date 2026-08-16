import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, Database, Search, Check, Pill } from 'lucide-react';
import { Ingredient, Excipient } from '../types';
import { db, collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc, handleFirestoreError, OperationType, sanitizeData } from '../firebase';
import { cn, sanitizeFirestoreData } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface CatalogManagementProps {
  type: 'ingredient' | 'excipient' | 'ingredient_category' | 'excipient_category' | 'company';
  isDarkMode: boolean;
  onClose?: () => void;
  inline?: boolean;
  externalTrigger?: number;
  onDrugClick?: (drug: any) => void;
}

const CatalogManagement: React.FC<CatalogManagementProps> = ({ 
  type, 
  isDarkMode, 
  onClose, 
  inline = false, 
  externalTrigger = 0,
  onDrugClick
}) => {
  const collectionName = 
    type === 'ingredient' ? 'ingredients' : 
    type === 'excipient' ? 'excipients' : 
    type === 'ingredient_category' ? 'ingredient_categories' :
    type === 'excipient_category' ? 'excipient_categories' :
    'companies';

  const label = 
    type === 'ingredient' ? 'Hoạt chất' : 
    type === 'excipient' ? 'Tá dược' : 
    type === 'ingredient_category' ? 'Phân loại hoạt chất' :
    type === 'excipient_category' ? 'Phân loại tá dược' :
    'Công ty';
  
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
  const [drugs, setDrugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string, name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentAlias, setCurrentAlias] = useState('');
  const [currentGrade, setCurrentGrade] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDetailExcipient, setSelectedDetailExcipient] = useState<any | null>(null);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  
  useEffect(() => {
    setSelectedCategoryId('all');
  }, [type]);
  
  const [formData, setFormData] = useState<any>({
    name: '',
    aliases: [],
    grades: [],
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => sanitizeFirestoreData(doc.data()));
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
    if (type === 'ingredient_category') {
      const q = query(collection(db, 'ingredients'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setRelatedItems(snapshot.docs.map(doc => sanitizeFirestoreData(doc.data())));
      });
      return () => unsubscribe();
    } else if (type === 'excipient_category') {
      const q = query(collection(db, 'excipients'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setRelatedItems(snapshot.docs.map(doc => sanitizeFirestoreData(doc.data())));
      });
      return () => unsubscribe();
    }
  }, [type]);

  useEffect(() => {
    if (type === 'ingredient') {
      const q = query(collection(db, 'ingredient_categories'), orderBy('name'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setCategories(snapshot.docs.map(doc => sanitizeFirestoreData(doc.data())));
      }, (error) => {
        console.error("Error fetching ingredient categories:", error);
      });
      return () => unsubscribe();
    } else if (type === 'excipient') {
      const q = query(collection(db, 'excipient_categories'), orderBy('name'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setCategories(snapshot.docs.map(doc => sanitizeFirestoreData(doc.data())));
      }, (error) => {
        console.error("Error fetching excipient categories:", error);
      });
      return () => unsubscribe();
    }
  }, [type]);

  useEffect(() => {
    if (externalTrigger > 0) {
      handleOpenModal();
    }
  }, [externalTrigger]);

  useEffect(() => {
    if (type !== 'excipient') return;
    const q = query(collection(db, 'drugs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDrugs(snapshot.docs.map(doc => sanitizeFirestoreData(doc.data())));
    }, (error) => {
      console.error("Error fetching drugs for CatalogManagement:", error);
    });
    return () => unsubscribe();
  }, [type]);

  const getDrugsWithExcipient = (excipient: any) => {
    if (type !== 'excipient') return [];
    
    const nameLower = (excipient.name || '').toLowerCase().trim();
    if (!nameLower) return [];
    
    const aliases = (excipient.aliases || []).map((a: string) => a.toLowerCase().trim());
    if (excipient.alias) {
      aliases.push(excipient.alias.toLowerCase().trim());
    }
    
    return drugs.filter(drug => {
      const drugExStr = (drug.excipients || '').toLowerCase().trim();
      if (!drugExStr) return false;
      
      // Direct whole string match
      if (drugExStr === nameLower || aliases.includes(drugExStr)) return true;
      
      // Comma/semicolon/newline separation check
      const parts = drugExStr.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (part === nameLower || aliases.includes(part)) {
          return true;
        }
        
        // Match base name if the part has extra descriptors, e.g., "Lactose khan" matches "Lactose"
        if (nameLower.length >= 4 && part.includes(nameLower)) return true;
        for (const alias of aliases) {
          if (alias.length >= 4 && part.includes(alias)) return true;
        }
      }
      return false;
    });
  };

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      // Ensure aliases and grades are arrays
      const aliases = item.aliases || (item.alias ? [item.alias] : []);
      const grades = item.grades || (item.grade ? [item.grade] : []);
      setFormData({ ...item, aliases, grades });
    } else {
      setEditingItem(null);
      setCurrentAlias('');
      setCurrentGrade('');
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        aliases: [],
        grades: [],
        description: '',
        categoryId: '',
        grade: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;

    const id = formData.id || Math.random().toString(36).substring(2, 11);
    setIsSaving(true);

    try {
      // Add any pending alias before saving
      let finalAliases = [...(formData.aliases || [])];
      const pendingAlias = currentAlias.trim();
      if (pendingAlias && !finalAliases.includes(pendingAlias)) {
        finalAliases.push(pendingAlias);
      }

      // Clean up data to satisfy firestore rules
      const saveData: any = { 
        id, 
        name: formData.name.trim()
      };
      
      if (finalAliases.length > 0) {
        saveData.aliases = finalAliases.map((a: string) => a.trim()).filter(Boolean);
        if (saveData.aliases.length > 0) {
          saveData.alias = saveData.aliases[0]; // For backward compatibility
        }
      }

      if (formData.description && formData.description.trim()) {
        saveData.description = formData.description.trim();
      }

      if (type === 'company') {
        if (formData.address) saveData.address = formData.address.trim();
        if (formData.factoryAddress) saveData.factoryAddress = formData.factoryAddress.trim();
        if (formData.phone) saveData.phone = formData.phone.trim();
        if (formData.fax) saveData.fax = formData.fax.trim();
        if (formData.factoryPhone) saveData.factoryPhone = formData.factoryPhone.trim();
        if (formData.factoryFax) saveData.factoryFax = formData.factoryFax.trim();
        if (formData.email) saveData.email = formData.email.trim();
        if (formData.website) saveData.website = formData.website.trim();
      }
      
      if ((type === 'ingredient' || type === 'excipient')) {
        if (formData.categoryIds && formData.categoryIds.length > 0) {
          saveData.categoryIds = formData.categoryIds;
          saveData.categoryId = formData.categoryIds[0]; // For backward compatibility
        } else if (formData.categoryId) {
          saveData.categoryId = formData.categoryId;
          saveData.categoryIds = [formData.categoryId];
        }
        if (type === 'excipient') {
          if (formData.grades && formData.grades.length > 0) {
            saveData.grades = formData.grades;
            saveData.grade = formData.grades[0]; // backward compatibility
          } else if (formData.grade) {
            saveData.grade = formData.grade.trim();
            saveData.grades = [formData.grade.trim()];
          }
        }
      }

      await setDoc(doc(db, collectionName, id), sanitizeData(saveData));
      setIsModalOpen(false);
      
      // Auto-close the whole management modal if we just added a company from the drug editor
      if (!inline && type === 'company' && !editingItem && onClose) {
        onClose();
      }
    } catch (error) {
      console.error(`Error saving ${type}:`, error);
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    } finally {
      setIsSaving(false);
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

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (type === 'ingredient') {
      if (selectedCategoryId === 'all') return matchesSearch;
      if (selectedCategoryId === 'none') {
        const hasCategory = (item.categoryIds && item.categoryIds.length > 0) || item.categoryId;
        return matchesSearch && !hasCategory;
      }
      const itemCategoryIds = Array.isArray(item.categoryIds) ? item.categoryIds : (item.categoryId ? [item.categoryId] : []);
      return matchesSearch && itemCategoryIds.includes(selectedCategoryId);
    }
    return matchesSearch;
  });

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
      {!inline && (
        <div className={cn(
          "p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        )}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-indigo-600 rounded-lg sm:rounded-xl text-white">
              <Database className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className={cn("text-lg sm:text-xl font-black", isDarkMode ? "text-white" : "text-slate-900", type === 'company' && "hidden sm:block")}>Quản lý {label}</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Tổng cộng: {items.length} mục</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button 
              onClick={() => handleOpenModal()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 text-xs",
                "hover:bg-indigo-700 active:scale-95"
              )}
            >
              <Plus size={16} /> Thêm mới
            </button>
            {onClose && (
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
      )}

      <div className={cn(
        "p-4 border-b",
        isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white/50"
      )}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder={type === 'company' ? "Tìm kiếm tên công ty..." : `Tìm kiếm ${label.toLowerCase()}...`}
              className={cn(
                "w-full pl-10 pr-10 py-2.5 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium",
                isDarkMode ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-900"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all text-slate-400 hover:text-rose-500",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-200"
                )}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {type === 'ingredient' && categories.length > 0 && (
            <div className="w-full sm:w-64">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-bold cursor-pointer",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                )}
              >
                <option value="all">Tất cả Phân loại ({categories.length})</option>
                <option value="none">Chưa phân loại</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              <div 
                key={item.id} 
                onClick={() => {
                  if (type === 'excipient') {
                    setSelectedDetailExcipient(item);
                  }
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all group relative",
                  type === 'excipient' && "cursor-pointer hover:shadow-md",
                  type === 'excipient' && (isDarkMode ? "hover:bg-slate-800/20" : "hover:bg-slate-50/50"),
                  isDarkMode ? "bg-slate-900 border-slate-800 hover:border-indigo-900/50" : "bg-white border-slate-100 hover:border-indigo-200 shadow-sm"
                )}
              >
                 <div className="flex justify-between items-start">
                  <div className="flex-1 overflow-hidden pr-8">
                     <h4 className={cn("font-bold text-sm mb-1 flex flex-wrap items-center gap-2", isDarkMode ? "text-white" : "text-slate-900")}>
                        {type === 'excipient' ? (
                          <span className={cn(
                            "text-left font-bold text-sm hover:underline transition-colors",
                            isDarkMode ? "hover:text-indigo-400" : "hover:text-indigo-600"
                          )}>
                            {item.name}
                          </span>
                        ) : (
                          <span className={cn(type === 'company' ? "" : "truncate max-w-[150px] sm:max-w-[260px]")}>{item.name}</span>
                        )}
                        {type === 'excipient' && (() => {
                          const matchingDrugs = getDrugsWithExcipient(item);
                          if (matchingDrugs.length > 0) {
                            return (
                              <span className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0",
                                isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                              )}>
                                <Pill size={8} className="text-emerald-500" /> {matchingDrugs.length} thuốc
                              </span>
                            );
                          }
                          return (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 opacity-60",
                              isDarkMode ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-slate-100 text-slate-400 border-slate-200"
                            )}>
                              Chưa có thuốc
                            </span>
                          );
                        })()}
                       {(type === 'ingredient_category' || type === 'excipient_category') && (
                         <span className={cn(
                           "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black",
                           isDarkMode ? "bg-indigo-900/40 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                         )}>
                           <Database size={10} />
                           {relatedItems.filter(ri => ri.categoryId === item.id || (ri.categoryIds || []).includes(item.id)).length}
                         </span>
                       )}
                       {item.aliases && item.aliases.length > 0 ? (
                         <span className="ml-2 font-medium text-xs text-slate-400 italic">
                           ({item.aliases.join(', ')})
                         </span>
                       ) : item.alias ? (
                         <span className="ml-2 font-medium text-xs text-slate-400 italic">
                           ({item.alias})
                         </span>
                       ) : null}
                     </h4>
                     {(type === 'ingredient' || type === 'excipient') && (
                       <div className="flex flex-wrap gap-1 mb-1">
                         {item.categoryIds && item.categoryIds.length > 0 ? (
                           item.categoryIds.map((catId: string) => (
                             <span key={catId} className={cn(
                               "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                               isDarkMode ? "bg-indigo-900/40 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                             )}>
                               {categories.find(c => c.id === catId)?.name || 'Không rõ'}
                             </span>
                           ))
                         ) : item.categoryId ? (
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                             isDarkMode ? "bg-indigo-900/40 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                           )}>
                             {categories.find(c => c.id === item.categoryId)?.name || 'Chưa phân loại'}
                           </span>
                         ) : (
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                             isDarkMode ? "bg-slate-800 text-slate-500 font-bold" : "bg-slate-100 text-slate-400 font-bold"
                           )}>
                             Chưa có phân loại
                           </span>
                         )}
                       </div>
                     )}

                     {type === 'excipient' && (item.grades || item.grade) && (
                       <div className="flex flex-wrap gap-1 mb-1">
                         <span className={cn(
                           "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border",
                           isDarkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"
                         )}>
                           Grade: {item.grades && item.grades.length > 0 ? item.grades.join(', ') : item.grade}
                         </span>
                       </div>
                     )}

                                                                 {type === 'company' && (item.address || item.factoryAddress || item.phone || item.fax || item.factoryPhone || item.factoryFax || item.email || item.website) && (
                        <div className="flex flex-col gap-1 mb-1">
                          {(item.address || item.phone || item.fax) && (
                            <div className="text-[10px] text-slate-500 italic flex flex-wrap gap-x-2 items-center">
                              <span>📍 VP: {item.address || 'Chưa cập nhật'}</span>
                              {item.phone && <span className="font-bold text-indigo-500">📞 SĐT: {item.phone}</span>}
                              {item.fax && <span className="font-bold text-slate-400">📠 Fax: {item.fax}</span>}
                            </div>
                          )}
                          
                          {(item.factoryAddress || item.factoryPhone || item.factoryFax) && (
                            <div className="text-[10px] text-slate-500 italic flex flex-wrap gap-x-2 items-center">
                              <span>🏭 Nhà máy: {item.factoryAddress || 'Chưa cập nhật'}</span>
                              {item.factoryPhone && <span className="font-bold text-indigo-500">📞 SĐT: {item.factoryPhone}</span>}
                              {item.factoryFax && <span className="font-bold text-slate-400">📠 Fax: {item.factoryFax}</span>}
                            </div>
                          )}

                          {(item.email || item.website) && (
                            <div className="flex flex-wrap gap-x-2 text-[10px] mt-0.5">
                              {item.email && (
                                <p className="font-semibold text-teal-600 dark:text-teal-400">✉️ Email: {item.email}</p>
                              )}
                              {item.website && (
                                <a 
                                  href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold text-blue-500 hover:underline"
                                >
                                  🌐 Web: {item.website}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {item.description && (
                        <p className={cn(
                          "text-[10px] leading-relaxed mt-1 font-medium",
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        )}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    {/* Action buttons */}
                    <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(item);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-indigo-400" : "hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                        )}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id, item.name);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-rose-400" : "hover:bg-slate-100 text-slate-500 hover:text-rose-600"
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
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Database className="w-12 h-12 mb-3 stroke-1" />
              <p className="text-sm font-semibold">Chưa có {label.toLowerCase()} nào được lưu.</p>
              <p className="text-xs">Hãy nhấn nút "Thêm mới" để bắt đầu.</p>
            </div>
          )}
        </div>

        <div className={cn(
          "p-4 border-t flex justify-end gap-3",
          isDarkMode ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-white"
        )}>
          {inline && type === 'company' && (
            <button 
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              Đóng
            </button>
          )}
        </div>
      </motion.div>
    );

    return (
      <>
        {inline ? content : (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="absolute inset-0" onClick={onClose} />
            {content}
          </div>
        )}

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "w-full h-full sm:h-auto sm:max-w-xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full sm:max-h-[90vh]",
                  isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white"
                )}
              >
                <div className={cn(
                  "p-4 sm:p-6 border-b flex items-center justify-between",
                  isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
                )}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                      <Database size={20} />
                    </div>
                    <div>
                      <h4 className={cn("font-black text-base sm:text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                        {editingItem ? `Chỉnh sửa ${label}` : `Thêm ${label} mới`}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Thông tin danh mục hệ thống</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tên gọi / Nhãn hiệu</label>
                      <input
                        type="text"
                        required
                        className={cn(
                          "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                        )}
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={`Nhập tên ${label.toLowerCase()}...`}
                      />
                    </div>

                    {type === 'company' && (
                      <>
                        <div className="space-y-4">
                          {/* Office Address Group */}
                          <div className={cn(
                            "p-4 rounded-xl border space-y-4",
                            isDarkMode ? "bg-slate-800/20 border-slate-700/60" : "bg-slate-50/50 border-slate-200/60"
                          )}>
                            <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                              <span>📍</span> Văn phòng đại diện / Trụ sở chính
                            </h4>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Địa chỉ văn phòng</label>
                              <input
                                type="text"
                                className={cn(
                                  "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                )}
                                value={formData.address || ''}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Địa chỉ văn phòng..."
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Số điện thoại văn phòng</label>
                                <input
                                  type="text"
                                  className={cn(
                                    "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                  )}
                                  value={formData.phone || ''}
                                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                  placeholder="Số điện thoại văn phòng..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Số Fax văn phòng</label>
                                <input
                                  type="text"
                                  className={cn(
                                    "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                  )}
                                  value={formData.fax || ''}
                                  onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                                  placeholder="Số Fax văn phòng..."
                                />
                              </div>
                            </div>
                          </div>

                          {/* Factory Address Group */}
                          <div className={cn(
                            "p-4 rounded-xl border space-y-4",
                            isDarkMode ? "bg-slate-800/20 border-slate-700/60" : "bg-slate-50/50 border-slate-200/60"
                          )}>
                            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                              <span>🏭</span> Nhà máy sản xuất
                            </h4>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Địa chỉ nhà máy</label>
                              <input
                                type="text"
                                className={cn(
                                  "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                )}
                                value={formData.factoryAddress || ''}
                                onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                                placeholder="Địa chỉ nhà máy..."
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Số điện thoại nhà máy</label>
                                <input
                                  type="text"
                                  className={cn(
                                    "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                  )}
                                  value={formData.factoryPhone || ''}
                                  onChange={(e) => setFormData({ ...formData, factoryPhone: e.target.value })}
                                  placeholder="Số điện thoại nhà máy..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Số Fax nhà máy</label>
                                <input
                                  type="text"
                                  className={cn(
                                    "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                  )}
                                  value={formData.factoryFax || ''}
                                  onChange={(e) => setFormData({ ...formData, factoryFax: e.target.value })}
                                  placeholder="Số Fax nhà máy..."
                                />
                              </div>
                            </div>
                          </div>

                          {/* General Contact Info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
                              <input
                                type="email"
                                className={cn(
                                  "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                )}
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Email liên hệ..."
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Website</label>
                              <input
                                type="text"
                                className={cn(
                                  "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                )}
                                value={formData.website || ''}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                placeholder="Ví dụ: www.company.com..."
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {(type === 'ingredient' || type === 'excipient') && categories.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Phân loại danh mục
                        </label>
                        <select
                          className={cn(
                            "w-full px-4 py-2.5 sm:py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                          )}
                          value={formData.categoryId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ 
                              ...formData, 
                              categoryId: val,
                              categoryIds: val ? [val] : []
                            });
                          }}
                        >
                          <option value="">-- Chọn phân loại --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(type === 'ingredient' || type === 'excipient') && (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Tên gọi khác / Biến thể (Aliases)
                        </label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                            )}
                            value={currentAlias}
                            onChange={(e) => setCurrentAlias(e.target.value)}
                            placeholder="Thêm tên gọi khác..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = currentAlias.trim();
                                if (val && !formData.aliases.includes(val)) {
                                  setFormData({ ...formData, aliases: [...formData.aliases, val] });
                                  setCurrentAlias('');
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = currentAlias.trim();
                              if (val && !formData.aliases.includes(val)) {
                                setFormData({ ...formData, aliases: [...formData.aliases, val] });
                                setCurrentAlias('');
                              }
                            }}
                            className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs sm:text-sm border border-slate-700"
                          >
                            Thêm
                          </button>
                        </div>
                        {formData.aliases && formData.aliases.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {formData.aliases.map((alias, idx) => (
                              <span 
                                key={idx}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                                )}
                              >
                                {alias}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      aliases: formData.aliases.filter((a) => a !== alias)
                                    });
                                  }}
                                  className="text-slate-400 hover:text-rose-500 ml-1 font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {type === 'excipient' && (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Tầng / Mác / Cấp độ (Grades)
                        </label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                            )}
                            value={currentGrade}
                            onChange={(e) => setCurrentGrade(e.target.value)}
                            placeholder="Ví dụ: USP, EP, Food Grade..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = currentGrade.trim();
                                if (val && !formData.grades.includes(val)) {
                                  setFormData({ ...formData, grades: [...formData.grades, val] });
                                  setCurrentGrade('');
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = currentGrade.trim();
                              if (val && !formData.grades.includes(val)) {
                                setFormData({ ...formData, grades: [...formData.grades, val] });
                                setCurrentGrade('');
                              }
                            }}
                            className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs sm:text-sm border border-slate-700"
                          >
                            Thêm
                          </button>
                        </div>
                        {formData.grades && formData.grades.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {formData.grades.map((grade, idx) => (
                              <span 
                                key={idx}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                                )}
                              >
                                {grade}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      grades: formData.grades.filter((g) => g !== grade)
                                    });
                                  }}
                                  className="text-slate-400 hover:text-rose-500 ml-1 font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
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
                      disabled={isSaving}
                      className={cn(
                        "flex-1 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2",
                        (isDarkMode ? "shadow-none" : "shadow-indigo-200"),
                        isSaving && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Lưu lại
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
{selectedDetailExcipient && (
          <div 
            onClick={() => setSelectedDetailExcipient(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full h-full sm:h-auto sm:max-w-xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[80vh]",
                isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white"
              )}
            >
              <div className={cn(
                "p-4 sm:p-6 border-b flex items-center justify-between",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className={cn("font-black text-base sm:text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                      Chi tiết Tá dược
                    </h4>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Thông tin hoạt chất phụ trợ</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedDetailExcipient(null)} 
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
                {/* Name and Categories */}
                <div>
                  <h3 className={cn("text-xl font-extrabold mb-1.5", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                    {selectedDetailExcipient.name}
                  </h3>
                  
                  {/* Category badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailExcipient.categoryIds && selectedDetailExcipient.categoryIds.length > 0 ? (
                      selectedDetailExcipient.categoryIds.map((catId: string) => (
                        <span key={catId} className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          isDarkMode ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                        )}>
                          {categories.find(c => c.id === catId)?.name || 'Không rõ'}
                        </span>
                      ))
                    ) : selectedDetailExcipient.categoryId ? (
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        isDarkMode ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                      )}>
                        {categories.find(c => c.id === selectedDetailExcipient.categoryId)?.name || 'Chưa phân loại'}
                      </span>
                    ) : (
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        isDarkMode ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-slate-100 text-slate-400 border-slate-200"
                      )}>
                        Chưa có phân loại
                      </span>
                    )}
                  </div>
                </div>

                {/* Aliases */}
                {((selectedDetailExcipient.aliases && selectedDetailExcipient.aliases.length > 0) || selectedDetailExcipient.alias) && (
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tên gọi khác (Aliases)</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedDetailExcipient.aliases || (selectedDetailExcipient.alias ? [selectedDetailExcipient.alias] : [])).map((alias: string, idx: number) => (
                        <span 
                          key={`${alias}-${idx}`} 
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold border",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                          )}
                        >
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grade */}
                {(selectedDetailExcipient.grades || selectedDetailExcipient.grade) && (
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tầng / Mác / Cấp độ (Grade)</h5>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold border shadow-sm",
                      isDarkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {selectedDetailExcipient.grades && selectedDetailExcipient.grades.length > 0 ? selectedDetailExcipient.grades.join(', ') : selectedDetailExcipient.grade}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Mô tả tá dược</h5>
                  <div className={cn(
                    "p-3.5 rounded-2xl border text-xs sm:text-sm leading-relaxed font-semibold",
                    isDarkMode ? "bg-slate-800/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600"
                  )}>
                    {selectedDetailExcipient.description || "Chưa có thông tin mô tả chi tiết cho tá dược này."}
                  </div>
                </div>

                {/* Associated Drugs */}
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
                    <span>Thuốc có chứa tá dược này ({getDrugsWithExcipient(selectedDetailExcipient).length})</span>
                  </h5>
                  {(() => {
                    const matchingDrugs = getDrugsWithExcipient(selectedDetailExcipient);
                    if (matchingDrugs.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic font-medium py-4 text-center">
                          Chưa có thuốc nào trong hệ thống được định nghĩa chứa tá dược này.
                        </p>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {matchingDrugs.map((d, index) => (
                          <div
                            key={d.id || index}
                            className={cn(
                              "p-3 rounded-xl border flex items-center justify-between transition-all group/item",
                              isDarkMode ? "bg-slate-800/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60" : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                            )}
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">
                                <Pill size={14} />
                              </div>
                              <span className={cn("text-xs font-bold truncate", isDarkMode ? "text-slate-200" : "text-slate-850")}>
                                {d.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDetailExcipient(null);
                                onDrugClick?.(d);
                              }}
                              className={cn(
                                "px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer shadow-sm border shrink-0",
                                isDarkMode ? "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700" : "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100"
                              )}
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className={cn(
                "p-4 sm:p-6 border-t flex justify-end",
                isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"
              )}>
                <button
                  type="button"
                  onClick={() => setSelectedDetailExcipient(null)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95",
                    isDarkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSubCategoryModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <CatalogManagement
              type={type === 'ingredient' ? 'ingredient_category' : 'excipient_category'}
              isDarkMode={isDarkMode}
              onClose={() => setIsSubCategoryModalOpen(false)}
              inline={false}
            />
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
