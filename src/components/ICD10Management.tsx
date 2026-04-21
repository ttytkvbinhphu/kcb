import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, X, Check, ClipboardList, Info, AlertTriangle, Pill, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, writeBatch } from '../firebase';
import * as XLSX from 'xlsx';
import { ICD10, Drug } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ICD10ManagementProps {
  canManage: boolean;
  isDarkMode?: boolean;
  featureSettings?: any;
}

const ICD10Management: React.FC<ICD10ManagementProps> = ({ canManage, isDarkMode, featureSettings }) => {
  const [icdList, setIcdList] = useState<ICD10[]>([]);
  const [drugList, setDrugList] = useState<Drug[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [editingIcd, setEditingIcd] = useState<ICD10 | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ICD10>({
    code: '',
    description: '',
    commonDrugs: []
  });

  useEffect(() => {
    const unsubscribeICD = onSnapshot(collection(db, 'icd10'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as ICD10);
      setIcdList(list);
      setLoading(false);
    });

    const unsubscribeDrugs = onSnapshot(collection(db, 'drugs'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Drug);
      setDrugList(list);
    });

    return () => {
      unsubscribeICD();
      unsubscribeDrugs();
    };
  }, []);

  const filteredList = useMemo(() => {
    return icdList.filter(icd => 
      (icd.code || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (icd.description || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );
  }, [icdList, searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const handleOpenModal = (icd?: ICD10) => {
    if (icd) {
      setEditingIcd(icd);
      setFormData(icd);
    } else {
      setEditingIcd(null);
      setFormData({ code: '', description: '', commonDrugs: [] });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.description) return;

    try {
      await setDoc(doc(db, 'icd10', formData.code), formData);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving ICD-10:", error);
    }
  };

  const confirmDelete = (code: string) => {
    setDeletingCode(code);
    setIsDeleteModalOpen(true);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // Skip header row (A1, B1)
        const itemsToImport = data.slice(1).filter(row => row[0] && row[1]);
        
        if (itemsToImport.length === 0) {
          alert("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
          setImporting(false);
          return;
        }

        // Use batches for efficiency (max 500 per batch)
        const batchSize = 500;
        for (let i = 0; i < itemsToImport.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = itemsToImport.slice(i, i + batchSize);
          
          chunk.forEach(row => {
            const code = row[0].toString().trim().toUpperCase();
            const description = row[1].toString().trim();
            const icdRef = doc(db, 'icd10', code);
            batch.set(icdRef, {
              code,
              description,
              commonDrugs: []
            });
          });
          
          await batch.commit();
        }

        alert(`Đã import thành công ${itemsToImport.length} mã ICD-10.`);
      } catch (error) {
        console.error("Error importing Excel:", error);
        alert("Có lỗi xảy ra khi import file Excel. Vui lòng kiểm tra lại định dạng file.");
      } finally {
        setImporting(false);
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    try {
      await deleteDoc(doc(db, 'icd10', deletingCode));
      setIsDeleteModalOpen(false);
      setDeletingCode(null);
    } catch (error) {
      console.error("Error deleting ICD-10:", error);
    }
  };

  const toggleDrug = (drugName: string) => {
    const currentDrugs = formData.commonDrugs || [];
    if (currentDrugs.includes(drugName)) {
      setFormData({ ...formData, commonDrugs: currentDrugs.filter(d => d !== drugName) });
    } else {
      setFormData({ ...formData, commonDrugs: [...currentDrugs, drugName] });
    }
  };

  const filteredDrugs = useMemo(() => {
    return drugList.filter(drug => 
      (drug.name || '').toLowerCase().includes((drugSearchTerm || '').toLowerCase()) ||
      (drug.activeIngredients?.some(ai => ai.name.toLowerCase().includes(drugSearchTerm.toLowerCase())) || false)
    );
  }, [drugList, drugSearchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin transition-colors" />
      </div>
    );
  }

  return (
    <div className={cn(
      "p-1 sm:p-4 lg:p-6 max-w-full mx-auto min-h-screen transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      <div className="mb-2 lg:mb-10 space-y-4">
        <div className="hidden lg:block space-y-4">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
            isDarkMode ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
          )}>
            <ClipboardList size={12} />
            Danh mục bệnh lý
          </div>
          <h2 className={cn("text-2xl lg:text-4xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
            {featureSettings?.customTitle || (canManage ? "Quản lý ICD-10" : "Tra cứu ICD-10")}
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="hidden lg:block">
            <p className={cn(
              "font-medium max-w-md transition-colors text-[10px] sm:text-xs lg:text-base",
              isDarkMode ? "text-slate-400" : "text-slate-500"
            )}>
              {canManage 
                ? "Hệ thống cập nhật và quản lý danh mục mã bệnh chuẩn ICD-10 cùng các gợi ý điều trị."
                : "Hệ thống quản lý mã bệnh và gợi ý phác đồ điều trị chuẩn."
              }
            </p>
          </div>
          
          {canManage && (
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="file"
                accept=".xlsx, .xls"
                ref={excelInputRef}
                onChange={handleExcelImport}
                className="hidden"
              />
              <button
                disabled={importing}
                onClick={() => excelInputRef.current?.click()}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-[10px] sm:text-xs lg:text-sm border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {importing ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                <span>Import Excel</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-2 lg:py-3 bg-emerald-600 text-white rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-[10px] sm:text-xs lg:text-sm",
                  isDarkMode ? "shadow-none" : "shadow-lg shadow-emerald-100"
                )}
              >
                <Plus size={16} /> <span className="hidden xs:inline">Thêm mã mới</span><span className="xs:hidden">Thêm</span>
              </button>
            </div>
          )}
        </div>
        
        <div className={cn(
          "p-1.5 lg:p-2 rounded-xl lg:rounded-2xl shadow-sm border transition-colors",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        )}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm mã ICD-10, tên bệnh..."
              className={cn(
                "w-full pl-10 pr-4 py-2 lg:py-3 border-transparent rounded-lg lg:rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-xs lg:text-sm font-medium",
                isDarkMode ? "bg-slate-800/50 text-white focus:bg-slate-800" : "bg-white text-slate-900 focus:bg-white shadow-sm border-slate-100"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={cn(
        "rounded-2xl lg:rounded-[32px] shadow-sm transition-colors border overflow-hidden",
        isDarkMode 
          ? "bg-slate-900 border-slate-800 shadow-none" 
          : "bg-white border-slate-100 shadow-slate-200/20"
      )}>
        {/* Mobile Card View */}
        <div className={cn(
          "sm:hidden divide-y",
          isDarkMode ? "divide-slate-800" : "divide-slate-100"
        )}>
          {paginatedList.length > 0 ? (
            paginatedList.map((icd) => (
              <div 
                key={icd.code}
                className={cn(
                  "p-4 transition-colors",
                  isDarkMode ? "bg-slate-900/50" : "bg-white"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={cn(
                    "px-3 py-1 rounded-lg font-black text-[10px] tracking-wider border",
                    isDarkMode ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/30" : "bg-white text-emerald-700 border-emerald-100"
                  )}>
                    {icd.code}
                  </span>
                  {canManage && (
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleOpenModal(icd)} 
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          isDarkMode ? "text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/30" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        )}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => confirmDelete(icd.code)} 
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          isDarkMode ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        )}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <h4 className={cn("font-bold text-sm mb-3", isDarkMode ? "text-white" : "text-black")}>
                  {icd.description}
                </h4>
                <div className="space-y-2">
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-colors",
                    isDarkMode ? "text-slate-500" : "text-slate-400"
                  )}>Gợi ý thuốc</p>
                  <div className="flex flex-wrap gap-1.5">
                    {icd.commonDrugs && icd.commonDrugs.length > 0 ? (
                      icd.commonDrugs.map((drug, idx) => (
                        <span key={idx} className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors",
                          isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {drug}
                        </span>
                      ))
                    ) : (
                      <span className={cn(
                        "text-[10px] italic transition-colors",
                        isDarkMode ? "text-slate-500" : "text-slate-400"
                      )}>Chưa có gợi ý</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-sm font-medium">Không tìm thấy mã ICD-10 nào.</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto custom-scrollbar -mx-px">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className={cn(
                "transition-colors border-b",
                isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <th className={cn("w-24 sm:w-32 lg:w-40 px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mã ICD-10</th>
                <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mô tả bệnh</th>
                <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Gợi ý thuốc</th>
                {canManage && <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest text-right transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Thao tác</th>}
              </tr>
            </thead>
            <tbody className={cn(
              "divide-y transition-colors",
              isDarkMode ? "divide-slate-800" : "divide-slate-100"
            )}>
              {paginatedList.map((icd) => (
                <tr 
                  key={icd.code} 
                  className={cn(
                    "transition-colors group",
                    isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50/80"
                  )}
                >
                  <td className="w-24 sm:w-32 lg:w-40 px-4 sm:px-6 lg:px-8 py-4">
                    <span className={cn(
                      "px-3 lg:px-4 py-1 rounded-lg font-black text-[10px] lg:text-xs tracking-wider transition-colors border",
                      isDarkMode ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/30" : "bg-white text-emerald-700 border-emerald-100"
                    )}>
                      {icd.code}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 lg:px-8 py-4">
                    <p className={cn(
                      "font-bold text-sm lg:text-base transition-colors",
                      isDarkMode ? "text-white" : "text-black"
                    )}>{icd.description}</p>
                  </td>
                  <td className="px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {icd.commonDrugs && icd.commonDrugs.length > 0 ? (
                        icd.commonDrugs.map((drug, idx) => (
                          <span key={idx} className={cn(
                            "px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-md text-[9px] lg:text-[11px] font-bold border transition-colors",
                            isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                          )}>
                            {drug}
                          </span>
                        ))
                      ) : (
                        <span className={cn(
                          "text-[10px] lg:text-xs italic transition-colors",
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        )}>Chưa có gợi ý</span>
                      )}
                    </div>
                  </td>
                  {canManage && (
                    <td className="px-4 sm:px-6 lg:px-8 py-4 text-right">
                      <div className="flex justify-end gap-1 lg:gap-2">
                        <button
                          onClick={() => handleOpenModal(icd)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            isDarkMode 
                              ? "text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/30" 
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          )}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => confirmDelete(icd.code)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            isDarkMode 
                              ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/30" 
                              : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          )}
                          title="Xóa mã bệnh"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="px-8 py-20 text-center">
                    <div className={cn(
                      "w-16 lg:w-20 h-16 lg:h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors",
                      isDarkMode ? "bg-slate-800" : "bg-slate-50"
                    )}>
                      <Search size={32} className={isDarkMode ? "text-slate-600" : "text-slate-300"} />
                    </div>
                    <p className={cn("font-bold text-base lg:text-lg transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>Không tìm thấy mã bệnh nào phù hợp.</p>
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className={cn(
                          "mt-4 font-bold text-sm hover:underline transition-colors",
                          isDarkMode ? "text-emerald-400" : "text-emerald-600"
                        )}
                      >
                        Xóa tìm kiếm
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className={cn(
            "p-6 lg:p-8 border-t flex flex-col lg:flex-row items-center justify-between gap-4 transition-colors",
            isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50/30 border-slate-100"
          )}>
            <p className={cn("text-xs lg:text-sm font-bold transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>
              Hiển thị <span className={cn("transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{(currentPage - 1) * itemsPerPage + 1}</span> - <span className={cn("transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{Math.min(currentPage * itemsPerPage, filteredList.length)}</span> trong tổng số <span className={cn("transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{filteredList.length}</span> mã bệnh
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className={cn(
                  "p-2 rounded-xl border transition-all disabled:opacity-30",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(Math.min(3, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage <= 2) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 1) {
                    pageNum = totalPages - 2 + i;
                  } else {
                    pageNum = currentPage - 1 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 lg:w-10 lg:h-10 rounded-xl font-bold text-xs lg:text-sm transition-all",
                        currentPage === pageNum 
                          ? cn("bg-emerald-600 text-white", isDarkMode ? "shadow-none" : "shadow-lg shadow-emerald-100")
                          : cn("border transition-colors", isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className={cn(
                  "p-2 rounded-xl border transition-all disabled:opacity-30",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col transition-colors",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
            >
              <div className={cn(
                "p-4 sm:p-8 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                <div className="flex items-center gap-4">
                  <h3 className={cn(
                    "text-lg sm:text-2xl font-bold tracking-tight transition-colors",
                    isDarkMode ? "text-white" : "text-black"
                  )}>
                    {editingIcd ? 'Chỉnh sửa mã ICD-10' : 'Thêm mã ICD-10 mới'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className={cn(
                    "p-2 rounded-full transition-colors text-slate-400",
                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  )}
                >
                  <X size={24} />
                </button>
              </div>

              <form 
                onSubmit={handleSave} 
                className={cn(
                  "flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar transition-colors",
                  isDarkMode ? "bg-slate-900" : "bg-white"
                )}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mã ICD-10</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingIcd}
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="VD: A00.0"
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm disabled:opacity-50",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mô tả bệnh</label>
                    <input
                      type="text"
                      required
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Nhập mô tả bệnh chi tiết..."
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Gợi ý thuốc điều trị</label>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      isDarkMode ? "text-emerald-400 bg-emerald-900/30" : "text-emerald-600 bg-emerald-50"
                    )}>
                      Đã chọn: {formData.commonDrugs?.length || 0}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Tìm thuốc trong danh mục..."
                      value={drugSearchTerm || ''}
                      onChange={(e) => setDrugSearchTerm(e.target.value)}
                      className={cn(
                        "w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-xs font-medium",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div className={cn(
                    "grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl border custom-scrollbar transition-colors",
                    isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
                  )}>
                    {filteredDrugs.map(drug => (
                      <button
                        key={drug.id}
                        type="button"
                        onClick={() => toggleDrug(drug.name)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 border",
                          formData.commonDrugs?.includes(drug.name)
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-emerald-900" : "bg-white border-slate-100 text-slate-600 hover:border-emerald-200")
                        )}
                      >
                        <Pill size={12} />
                        <span className="truncate">{drug.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
                      isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className={cn(
                      "flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98]",
                      isDarkMode ? "shadow-none" : "shadow-lg shadow-emerald-100"
                    )}
                  >
                    {editingIcd ? 'Cập nhật' : 'Lưu mã bệnh'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-colors",
                isDarkMode ? "bg-rose-900/30 text-rose-400" : "bg-rose-100 text-rose-600"
              )}>
                <AlertTriangle size={40} />
              </div>
              <h3 className={cn("text-2xl font-black mb-2 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Xác nhận xóa?</h3>
              <p className={cn("font-medium mb-8 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Bạn có chắc chắn muốn xóa mã ICD-10 <span className={cn("font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{deletingCode}</span>? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold transition-all",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className={cn(
                    "flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold transition-all",
                    isDarkMode ? "shadow-none" : "shadow-lg shadow-rose-200"
                  )}
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ICD10Management;
