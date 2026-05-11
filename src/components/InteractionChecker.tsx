import React, { useState, useEffect, useRef } from 'react';
import { Search, ShieldAlert, X, Plus, Sparkles, Loader2, AlertTriangle, CheckCircle2, Info, Library, FileText, Edit2, Trash2, ChevronRight, MoreVertical, AlertOctagon } from 'lucide-react';
import { Drug, InteractionResult, ManualInteraction, ICD10 } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import DrugDetailModal from './DrugDetailModal';
import { db, collection, getDocs, handleFirestoreError, OperationType, onSnapshot, setDoc, doc, deleteDoc, query, orderBy, sanitizeData } from '../firebase';
import ConfirmModal from './ConfirmModal';

interface InteractionCheckerProps {
  canManage: boolean;
  isDarkMode: boolean;
  currentUserUid: string;
  currentUserName: string;
  featureSettings?: any;
}

const INTERACTION_TYPES = [
  'Thuốc - Thuốc',
  'Thuốc - ICD-10',
  'Thuốc - Đối tượng',
  'Tương tác phức tạp'
];

const AutoExpandingTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onInput={(e) => {
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        if (props.onInput) props.onInput(e);
      }}
    />
  );
};

const InteractionChecker: React.FC<InteractionCheckerProps> = ({ 
  canManage, 
  isDarkMode,
  currentUserUid,
  currentUserName,
  featureSettings
}) => {
  const [activeTab, setActiveTab] = useState<'checker' | 'catalog'>('checker');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [icd10List, setIcd10List] = useState<ICD10[]>([]);
  const [manualInteractions, setManualInteractions] = useState<ManualInteraction[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<Drug[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [icdSearchTerm, setIcdSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<ManualInteraction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ManualInteraction>>({
    type: 'Thuốc - Thuốc',
    sourceIds: [],
    sourceNames: [],
    severity: 'medium',
    description: '',
    recommendation: ''
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string, name: string } | null>(null);

  // Drug Detail Modal State
  const [detailDrug, setDetailDrug] = useState<Drug | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const findDrugByName = (name: string) => {
    return drugs.find(d => d.name.toLowerCase() === name.toLowerCase());
  };

  const handleShowDrugDetail = (drug: Drug) => {
    setDetailDrug(drug);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    const unsubscribeDrugs = onSnapshot(collection(db, 'drugs'), (snapshot) => {
      setDrugs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Drug)));
    }, (error) => {
      console.error("Error fetching drugs for interaction check:", error);
      handleFirestoreError(error, OperationType.LIST, 'drugs');
    });

    const unsubscribeICD = onSnapshot(collection(db, 'icd10'), (snapshot) => {
      setIcd10List(snapshot.docs.map(doc => doc.data() as ICD10));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'icd10');
    });

    const unsubscribeManual = onSnapshot(query(collection(db, 'manual_interactions'), orderBy('updatedAt', 'desc')), (snapshot) => {
      setManualInteractions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ManualInteraction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'manual_interactions');
    });

    return () => {
      unsubscribeDrugs();
      unsubscribeICD();
      unsubscribeManual();
    };
  }, []);

  const filteredDrugs = drugs.filter(drug => 
    !selectedDrugs.find(sd => sd.id === drug.id) &&
    ((drug.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
     (drug.activeIngredients?.some(ai => ai.name.toLowerCase().includes(searchTerm.toLowerCase())) || false))
  );

  const addDrug = (drug: Drug) => {
    if (selectedDrugs.length < 5) {
      setSelectedDrugs([...selectedDrugs, drug]);
      setSearchTerm('');
      setResult(null);
    }
  };

  const removeDrug = (id: string) => {
    setSelectedDrugs(selectedDrugs.filter(d => d.id !== id));
    setResult(null);
  };

  const handleOpenModal = (interaction?: ManualInteraction) => {
    if (interaction) {
      setEditingInteraction(interaction);
      setFormData(interaction);
    } else {
      setEditingInteraction(null);
      setFormData({
        type: 'Thuốc - Thuốc',
        sourceIds: [],
        sourceNames: [],
        severity: 'medium',
        description: '',
        recommendation: '',
        contraindicated: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type || !formData.description) return;

    setIsSaving(true);
    try {
      const id = editingInteraction?.id || `INT-${Date.now()}`;
      const data: ManualInteraction = {
        ...(formData as ManualInteraction),
        id,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserName
      };

      await setDoc(doc(db, 'manual_interactions', id), sanitizeData(data));
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'manual_interactions');
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
      await deleteDoc(doc(db, 'manual_interactions', confirmData.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'manual_interactions');
    }
  };

  const checkInteractions = async () => {
    if (selectedDrugs.length < 2) return;
    
    setLoading(true);
    try {
      // 1. Check manual interactions first
      const drugIds = selectedDrugs.map(d => d.id);
      const matchedManual = manualInteractions.find(mi => 
        mi.type === 'Thuốc - Thuốc' && 
        mi.sourceIds.every(id => drugIds.includes(id)) &&
        mi.sourceIds.length === drugIds.length
      );

      if (matchedManual) {
        setResult({
          severity: matchedManual.severity,
          description: matchedManual.description,
          recommendation: matchedManual.recommendation,
          isAI: false,
          contraindicated: matchedManual.contraindicated
        });
        setLoading(false);
        return;
      }

      // 2. Fallback to AI - ONLY for admins/managers as requested
      if (!canManage) {
        setResult({
          severity: 'low',
          description: 'Không tìm thấy dữ liệu tương tác trong danh mục chính thức cho sự kết hợp này.',
          recommendation: 'Vui lòng kiểm tra lại với Dược thư Quốc gia hoặc các tài liệu chuyên khoa tin cậy. Chức năng phân tích AI hiện chỉ dành cho Quản trị viên.',
          isAI: false
        });
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const drugNames = selectedDrugs.map(d => d.name).join(', ');
      
      const prompt = `Kiểm tra tương tác thuốc giữa các loại thuốc sau: ${drugNames}. 
      Trả về kết quả dưới định dạng JSON với các trường:
      - severity: 'low' | 'medium' | 'high'
      - description: Mô tả chi tiết các tương tác (nếu có) bằng tiếng Việt.
      - recommendation: Lời khuyên cho bác sĩ bằng tiếng Việt.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
        }
      });

      const text = response.text || '{}';
      try {
        const data = JSON.parse(text.trim());
        setResult({ ...data, isAI: true });
      } catch (parseError) {
        console.error("JSON Parse failed in InteractionChecker:", parseError);
        throw new Error("Dữ liệu phản hồi từ AI không hợp lệ.");
      }
    } catch (error) {
      console.error("Lỗi kiểm tra tương tác:", error);
      setResult({
        severity: 'medium',
        description: 'Không thể kết nối với hệ thống phân tích AI lúc này. Vui lòng kiểm tra thủ công.',
        recommendation: 'Tham khảo dược thư quốc gia hoặc liên hệ dược sĩ lâm sàng.',
        isAI: false
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "p-1 lg:p-6 max-w-full mx-auto min-h-screen transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      <div className="mb-2 lg:mb-10 space-y-4">
        <div className="hidden lg:block space-y-4">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
            isDarkMode ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-600 border border-rose-100"
          )}>
            <ShieldAlert size={12} />
            An toàn sử dụng thuốc
          </div>
          <h2 className={cn("text-2xl lg:text-4xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
            {featureSettings?.customTitle || (canManage ? "Quản lý tương tác thuốc" : "Tra cứu tương tác thuốc")}
          </h2>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-8">
          <div className="hidden lg:block">
            <p className={cn(
              "font-medium max-w-md transition-colors text-[11px] lg:text-base",
              isDarkMode ? "text-slate-400" : "text-slate-500"
            )}>
              {canManage 
                ? "Quản lý dữ liệu tương tác giữa các loại thuốc và các yếu tố lâm sàng khác."
                : "Phân tích sự tương tác giữa các loại thuốc và các yếu tố khác."
              }
            </p>
          </div>

        {canManage && activeTab === 'catalog' && (
          <button
            onClick={() => handleOpenModal()}
            className={cn(
              "flex items-center justify-center gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-blue-600 text-white rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-xs lg:text-sm shadow-lg",
              isDarkMode ? "shadow-none hover:bg-blue-700" : "shadow-blue-100 hover:bg-blue-700"
            )}
          >
            <Plus size={18} /> Thêm tương tác
          </button>
        )}
      </div>
    </div>

      {/* Tabs */}
      <div className={cn(
        "flex gap-1 lg:gap-2 mb-6 lg:mb-10 p-1 rounded-xl lg:rounded-2xl w-full lg:w-fit transition-all border overflow-x-auto",
        isDarkMode 
          ? "bg-slate-900 border-slate-800" 
          : "bg-white border-slate-100 shadow-sm shadow-slate-100"
      )}>
        <button
          type="button"
          onClick={() => setActiveTab('checker')}
          className={cn(
            "flex-1 lg:flex-none px-4 lg:px-8 py-2 lg:py-3 rounded-lg lg:rounded-xl text-[11px] lg:text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap",
            activeTab === 'checker' 
              ? (isDarkMode ? "bg-slate-800 text-blue-400 shadow-sm" : "bg-blue-50 text-blue-600 shadow-sm") 
              : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
          )}
        >
          {canManage ? <Sparkles size={14} /> : <Search size={14} />}
          Kiểm tra tương tác
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={cn(
            "flex-1 lg:flex-none px-4 lg:px-8 py-2 lg:py-3 rounded-lg lg:rounded-xl text-[11px] lg:text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap",
            activeTab === 'catalog' 
              ? (isDarkMode ? "bg-slate-800 text-emerald-400 shadow-sm" : "bg-emerald-50 text-emerald-600 shadow-sm") 
              : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
          )}
        >
          <Library size={14} />
          Danh mục tương tác
          <span className={cn(
            "ml-1 px-2 py-0.5 rounded-full text-[9px] lg:text-[10px]",
            activeTab === 'catalog' 
              ? "bg-emerald-100 text-emerald-600" 
              : (isDarkMode ? "bg-slate-900 text-slate-500" : "bg-slate-100 text-slate-500")
          )}>
            {manualInteractions.length}
          </span>
        </button>
      </div>

      {activeTab === 'checker' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className={cn(
              "p-6 lg:p-8 rounded-2xl lg:rounded-[32px] border shadow-sm transition-colors",
              isDarkMode 
                ? "bg-slate-900 border-slate-800 shadow-none" 
                : "bg-white border-slate-100 shadow-slate-200/20"
            )}>
              <h3 className={cn(
                "text-lg lg:text-xl font-bold mb-6 flex items-center gap-2 transition-colors",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                <Plus size={20} className="text-blue-600" />
                Chọn thuốc cần kiểm tra
              </h3>
              
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Tìm tên thuốc hoặc hoạt chất..."
                  className={cn(
                    "w-full pl-11 pr-4 py-3 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium",
                    isDarkMode ? "bg-slate-800 text-white focus:bg-slate-800" : "bg-slate-50 text-slate-900 focus:bg-white shadow-sm border-slate-100"
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                {searchTerm && (
                  <div className={cn(
                    "absolute top-full left-0 right-0 mt-2 border rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-2 transition-colors",
                    isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                  )}>
                    {filteredDrugs.length > 0 ? (
                      filteredDrugs.map(drug => (
                        <button
                          key={drug.id}
                          type="button"
                          onClick={() => addDrug(drug)}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between group",
                            isDarkMode ? "hover:bg-blue-900/30" : "hover:bg-blue-50"
                          )}
                        >
                          <div className="flex-1 text-left">
                            <p 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowDrugDetail(drug);
                              }}
                              className={cn(
                                "font-bold transition-colors hover:underline underline-offset-4 decoration-blue-500",
                                isDarkMode ? "text-white group-hover:text-blue-400" : "text-slate-900 group-hover:text-blue-700"
                              )}
                            >
                              {drug.name}
                            </p>
                            <p className={cn(
                              "text-xs uppercase font-medium transition-colors",
                              isDarkMode ? "text-slate-400" : "text-slate-50"
                            )}>{drug.activeIngredients?.[0]?.name || 'N/A'}</p>
                          </div>
                          <Plus size={18} className={cn(
                            "transition-colors",
                            isDarkMode ? "text-slate-600 group-hover:text-blue-400" : "text-slate-300 group-hover:text-blue-500"
                          )} />
                        </button>
                      ))
                    ) : (
                      <p className={cn(
                        "p-4 text-center text-sm transition-colors",
                        isDarkMode ? "text-slate-500" : "text-slate-400"
                      )}>Không tìm thấy thuốc</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mb-2 transition-colors",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Danh sách đã chọn ({selectedDrugs.length}/5)</p>
                <AnimatePresence>
                  {selectedDrugs.map(drug => (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={drug.id}
                      className={cn(
                        "flex items-center justify-between p-4 border rounded-2xl group transition-colors",
                        isDarkMode ? "bg-blue-900/10 border-blue-900/30" : "bg-blue-50/50 border-blue-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                          <ShieldAlert size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p 
                            onClick={() => handleShowDrugDetail(drug)}
                            className={cn("font-bold transition-colors cursor-pointer hover:underline decoration-blue-500", isDarkMode ? "text-white" : "text-slate-900")}
                          >
                            {drug.name}
                          </p>
                          <p className={cn("text-[10px] font-bold uppercase tracking-tighter transition-colors", isDarkMode ? "text-blue-400" : "text-blue-600")}>{drug.activeIngredients?.[0]?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeDrug(drug.id)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          isDarkMode ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                        )}
                      >
                        <X size={18} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {selectedDrugs.length === 0 && (
                  <div className={cn(
                    "py-12 text-center border-2 border-dashed rounded-3xl transition-colors",
                    isDarkMode ? "border-slate-800" : "border-slate-100"
                  )}>
                    <p className={cn("text-sm font-medium transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Chưa có thuốc nào được chọn</p>
                  </div>
                )}
              </div>

              <button
                disabled={selectedDrugs.length < 2 || loading}
                onClick={checkInteractions}
                className={cn(
                  "w-full mt-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg",
                  isDarkMode ? "shadow-none" : "shadow-blue-100",
                  selectedDrugs.length < 2 || loading
                    ? cn("cursor-not-allowed shadow-none", isDarkMode ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-400")
                    : "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-blue-200 active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    {canManage ? <Sparkles size={24} className="text-blue-400" /> : <Search size={22} className="text-blue-400" />}
                    Kiểm tra tương tác
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 lg:sticky lg:top-8">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "rounded-2xl lg:rounded-[32px] border shadow-sm overflow-hidden transition-colors",
                    isDarkMode ? "bg-slate-900 border-slate-800 shadow-none" : "bg-white border-slate-100 shadow-slate-200/20"
                  )}
                >
                    <div className={cn(
                      "p-6 lg:p-8 text-white flex items-center justify-between",
                      result.contraindicated ? "bg-rose-700" : (
                        result.severity === 'high' ? "bg-rose-600" : 
                        result.severity === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                      )
                    )}>
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2 lg:p-3 rounded-xl lg:rounded-2xl backdrop-blur-md">
                          {result.contraindicated ? <AlertOctagon size={24} /> : (
                            result.severity === 'high' ? <AlertTriangle size={24} /> : 
                            result.severity === 'medium' ? <Info size={24} /> : <CheckCircle2 size={24} />
                          )}
                        </div>
                      <div>
                        <h4 className="text-xl lg:text-2xl font-black tracking-tight">
                          {result.contraindicated ? "Chống chỉ định" : (
                            result.severity === 'high' ? "Cảnh báo nghiêm trọng" : 
                            result.severity === 'medium' ? "Cần lưu ý" : "An toàn"
                          )}
                        </h4>
                        <p className="text-white/80 font-bold text-[10px] lg:text-xs uppercase tracking-widest">Kết quả phân tích AI</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 lg:p-8 space-y-6 lg:space-y-8">
                    <section>
                      <h5 className={cn(
                        "text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] mb-3 lg:mb-4 transition-colors",
                        isDarkMode ? "text-slate-500" : "text-slate-400"
                      )}>Chi tiết tương tác</h5>
                      <p className={cn(
                        "leading-relaxed text-base lg:text-lg font-bold transition-colors",
                        isDarkMode ? "text-slate-300" : "text-slate-700"
                      )}>
                        {result.description}
                      </p>
                    </section>
                    
                    <div className={cn("h-px w-full transition-colors", isDarkMode ? "bg-slate-800" : "bg-slate-100")}></div>
                    
                    <section>
                      <h5 className={cn(
                        "text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] mb-3 lg:mb-4 transition-colors",
                        isDarkMode ? "text-slate-500" : "text-slate-400"
                      )}>Khuyến nghị lâm sàng</h5>
                      <div className={cn(
                        "p-4 lg:p-6 rounded-xl lg:rounded-2xl border transition-colors",
                        isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                      )}>
                        <p className={cn(
                          "font-bold italic leading-relaxed text-sm lg:text-base transition-colors",
                          isDarkMode ? "text-slate-200" : "text-slate-800"
                        )}>
                          "{result.recommendation}"
                        </p>
                      </div>
                    </section>

                    {result.isAI && (
                      <div className={cn(
                        "p-4 rounded-xl flex gap-3 items-start transition-colors",
                        isDarkMode ? "bg-blue-900/10" : "bg-blue-50"
                      )}>
                        <Info size={18} className={cn("shrink-0 mt-0.5", isDarkMode ? "text-blue-400" : "text-blue-500")} />
                        <p className={cn(
                          "text-xs leading-relaxed transition-colors",
                          isDarkMode ? "text-blue-300" : "text-blue-700"
                        )}>
                          Thông tin này được tạo bởi AI và chỉ mang tính chất tham khảo. Bác sĩ cần đối chiếu với dược thư và tình trạng lâm sàng của bệnh nhân trước khi quyết định.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className={cn(
                  "h-full flex flex-col items-center justify-center text-center p-12 rounded-3xl border-2 border-dashed min-h-[500px] transition-colors",
                  isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
                )}>
                  <div className={cn(
                    "p-8 rounded-full shadow-xl transition-colors mb-8",
                    isDarkMode ? "bg-slate-800 shadow-none" : "bg-blue-50 shadow-blue-100/50"
                  )}>
                    {canManage ? (
                      <Sparkles size={64} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                    ) : (
                      <Library size={64} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                    )}
                  </div>
                  <h3 className={cn("text-2xl font-black mb-4 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                    {canManage ? "Sẵn sàng phân tích AI" : "Sẵn sàng tra cứu"}
                  </h3>
                  <p className={cn("max-w-sm text-lg leading-relaxed transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {canManage 
                      ? "Chọn ít nhất 2 loại thuốc để bắt đầu quá trình kiểm tra tương tác tự động bằng AI."
                      : "Chọn ít nhất 2 loại thuốc để kiểm tra tương tác dựa trên danh mục chính thức."
                    }
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className={cn(
            "hidden lg:grid grid-cols-12 gap-4 px-8 py-4 text-xs font-black uppercase tracking-widest transition-colors border-b",
            isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-100"
          )}>
            <div className="col-span-1">Mức độ</div>
            <div className="col-span-2">Phân loại</div>
            <div className="col-span-3">Nguồn / Đối tượng</div>
            <div className="col-span-3">Mô tả tương tác</div>
            <div className="col-span-2">Khuyến nghị</div>
            <div className="col-span-1 text-right">Thao tác</div>
          </div>
          
          <AnimatePresence mode="popLayout">
            {manualInteractions.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group relative rounded-2xl lg:rounded-3xl border transition-all duration-300 hover:shadow-md",
                  isDarkMode 
                    ? "bg-slate-900/50 border-slate-800 hover:border-slate-700" 
                    : "bg-white border-slate-100 hover:border-blue-50 shadow-sm shadow-slate-100/50"
                )}
              >
                {/* Mobile View */}
                <div className="lg:hidden p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      item.severity === 'high' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                      item.severity === 'medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>
                      {item.severity === 'high' ? 'Nghiêm trọng' : item.severity === 'medium' ? 'Trung bình' : 'Nhẹ'}
                    </div>
                    {item.contraindicated && (
                      <div className="px-3 py-1 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <AlertOctagon size={10} />
                        Chống chỉ định
                      </div>
                    )}
                    {canManage && (
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => handleOpenModal(item)}
                          className={isDarkMode ? "text-slate-500 hover:text-blue-400" : "text-slate-400 hover:text-blue-600"}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(item.id, item.sourceNames.join(' + '))}
                          className={isDarkMode ? "text-slate-500 hover:text-rose-400" : "text-slate-400 hover:text-rose-600"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0">
                      <Library size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("font-black text-sm", isDarkMode ? "text-white" : "text-slate-900")}>{item.type}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
                        {item.sourceNames.map((name, idx) => {
                          const drug = findDrugByName(name);
                          return (
                            <React.Fragment key={idx}>
                              {idx > 0 && " + "}
                              <span 
                                onClick={() => drug && handleShowDrugDetail(drug)}
                                className={cn(
                                  drug ? "cursor-pointer hover:text-blue-500 hover:underline decoration-blue-500/50" : ""
                                )}
                              >
                                {name}
                              </span>
                            </React.Fragment>
                          );
                        })}
                        {item.targetName && (
                          <>
                            {" vs "}
                            {(() => {
                              const drug = item.type === 'Thuốc - Thuốc' ? findDrugByName(item.targetName) : null;
                              return (
                                <span 
                                  onClick={() => drug && handleShowDrugDetail(drug)}
                                  className={cn(
                                    drug ? "cursor-pointer hover:text-blue-500 hover:underline decoration-blue-500/50" : ""
                                  )}
                                >
                                  {item.targetName}
                                </span>
                              );
                            })()}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border text-xs leading-relaxed transition-colors",
                    isDarkMode ? "bg-slate-800/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-50 text-slate-600"
                  )}>
                    {item.description}
                  </div>
                </div>

                {/* Desktop List View */}
                <div className="hidden lg:grid grid-cols-12 gap-4 items-center px-8 py-5">
                  <div className="col-span-1">
                    <div className={cn(
                      "inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                      item.severity === 'high' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                      item.severity === 'medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>
                      {item.severity === 'high' ? 'Cao' : item.severity === 'medium' ? 'TB' : 'Thấp'}
                    </div>
                    {item.contraindicated && (
                      <div className="ml-2 inline-flex px-2 py-1 bg-rose-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider items-center gap-1">
                        <AlertOctagon size={8} />
                        CCĐ
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0">
                        <Library size={16} />
                      </div>
                      <span className={cn("text-xs font-black truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                        {item.type}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-3 min-w-0">
                    <div className={cn("text-xs font-bold leading-tight flex flex-wrap gap-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                      {item.sourceNames.map((name, idx) => {
                        const drug = findDrugByName(name);
                        return (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span className="opacity-40">+</span>}
                            <span 
                              onClick={() => drug && handleShowDrugDetail(drug)}
                              className={cn(
                                "transition-colors",
                                drug ? "cursor-pointer hover:text-blue-500 hover:underline underline-offset-2 decoration-blue-500/50" : ""
                              )}
                            >
                              {name}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {item.targetName && (
                      <div className="text-[10px] text-blue-500 font-extrabold uppercase mt-1 flex flex-wrap gap-1">
                        <span className="opacity-40">vs</span>
                        {(() => {
                          const drug = item.type === 'Thuốc - Thuốc' ? findDrugByName(item.targetName) : null;
                          return (
                            <span 
                              onClick={() => drug && handleShowDrugDetail(drug)}
                              className={cn(
                                "transition-colors",
                                drug ? "cursor-pointer hover:text-blue-600 hover:underline underline-offset-2 decoration-blue-600/50" : ""
                              )}
                            >
                              {item.targetName}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="col-span-3">
                    <p className={cn("text-[11px] font-medium leading-relaxed transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      {item.description}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className={cn("text-[10px] font-bold italic leading-snug", isDarkMode ? "text-slate-500" : "text-slate-600")}>
                      {item.recommendation}
                    </p>
                  </div>

                  <div className="col-span-1 flex justify-end gap-1">
                    {canManage && (
                      <>
                        <button 
                          type="button"
                          onClick={() => handleOpenModal(item)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            isDarkMode ? "hover:bg-slate-800 text-slate-500 hover:text-blue-400" : "hover:bg-slate-50 text-slate-400 hover:text-blue-600"
                          )}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(item.id, item.sourceNames.join(' + '))}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            isDarkMode ? "hover:bg-slate-800 text-slate-500 hover:text-rose-400" : "hover:bg-slate-50 text-slate-400 hover:text-rose-600"
                          )}
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {manualInteractions.length === 0 && (
            <div className={cn(
              "py-16 text-center border-2 border-dashed rounded-[32px] transition-colors",
              isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-100"
            )}>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                <Library size={32} className="text-slate-400" />
              </div>
              <p className={cn("font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>Chưa có dữ liệu tương tác</p>
            </div>
          )}
        </div>
      )}

      {/* Manual Interaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-8 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg",
                    isDarkMode ? "shadow-none" : "shadow-blue-200"
                  )}>
                    <Library size={24} />
                  </div>
                  <div>
                    <h3 className={cn("text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                      {editingInteraction ? 'Chỉnh sửa tương tác' : 'Thêm tương tác mới'}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nhập thông tin tương tác thủ công</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "p-3 rounded-2xl transition-colors text-slate-400",
                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  )}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phân loại tương tác</label>
                  <div className="grid grid-cols-2 gap-2">
                    {INTERACTION_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({...formData, type: type as any})}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                          formData.type === type
                            ? cn("bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200", isDarkMode && "shadow-none")
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200")
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Thuốc liên quan</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.sourceNames?.map((name, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center gap-2">
                        {name}
                        <button type="button" onClick={() => {
                          const newIds = [...(formData.sourceIds || [])];
                          const newNames = [...(formData.sourceNames || [])];
                          newIds.splice(idx, 1);
                          newNames.splice(idx, 1);
                          setFormData({...formData, sourceIds: newIds, sourceNames: newNames});
                        }}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Tìm thuốc để thêm..."
                      className={cn(
                        "w-full pl-10 pr-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                        isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                      )}
                      onChange={(e) => {
                        const term = (e.target.value || '').toLowerCase();
                        if (term.length > 1) {
                          const found = drugs.find(d => (d.name || '').toLowerCase().includes(term));
                          if (found && !formData.sourceIds?.includes(found.id)) {
                            setFormData({
                              ...formData, 
                              sourceIds: [...(formData.sourceIds || []), found.id],
                              sourceNames: [...(formData.sourceNames || []), found.name]
                            });
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {formData.type === 'Thuốc - ICD-10' && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mã ICD-10 liên quan</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.targetId && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-bold flex items-center gap-2">
                          {formData.targetId} - {formData.targetName}
                          <button type="button" onClick={() => {
                            setFormData({...formData, targetId: '', targetName: ''});
                          }}><X size={12} /></button>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Tìm mã hoặc tên bệnh ICD-10..."
                        className={cn(
                          "w-full pl-10 pr-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                        value={icdSearchTerm}
                        onChange={(e) => setIcdSearchTerm(e.target.value)}
                      />
                      
                      {icdSearchTerm && (
                        <div className={cn(
                          "absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto p-2 transition-colors",
                          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                        )}>
                          {icd10List
                            .filter(icd => 
                              icd.code.toLowerCase().includes(icdSearchTerm.toLowerCase()) || 
                              icd.description.toLowerCase().includes(icdSearchTerm.toLowerCase())
                            )
                            .slice(0, 10)
                            .map(icd => (
                              <button
                                key={icd.code}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData, 
                                    targetId: icd.code,
                                    targetName: icd.description
                                  });
                                  setIcdSearchTerm('');
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-amber-50"
                                )}
                              >
                                <span className="text-amber-600 mr-2">{icd.code}</span>
                                <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{icd.description}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.type === 'Thuốc - Đối tượng' && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Đối tượng liên quan</label>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                        isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                      )}
                      value={formData.targetName || ''}
                      onChange={(e) => setFormData({...formData, targetName: e.target.value})}
                      placeholder="VD: Phụ nữ có thai, Trẻ em < 12 tuổi..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Trạng thái đặc biệt</label>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, contraindicated: !formData.contraindicated})}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all w-full lg:w-fit font-bold",
                      formData.contraindicated
                        ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200"
                        : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-100 text-slate-400")
                    )}
                  >
                    <AlertOctagon size={20} className={formData.contraindicated ? "text-white" : "text-slate-400"} />
                    Chống chỉ định
                    {formData.contraindicated && (
                      <span className="ml-auto lg:ml-2 px-2 py-0.5 bg-white/20 rounded-md text-[10px] uppercase font-black">Bật</span>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mức độ</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'low', label: 'Nhẹ' },
                      { val: 'medium', label: 'Trung bình' },
                      { val: 'high', label: 'Nghiêm trọng' }
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setFormData({...formData, severity: s.val as any})}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                          formData.severity === s.val
                            ? cn("bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200", isDarkMode && "shadow-none")
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200")
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mô tả tương tác</label>
                  <AutoExpandingTextarea
                    required
                    rows={3}
                    className={cn(
                      "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none",
                      isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                    )}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: (e.target as HTMLTextAreaElement).value})}
                    placeholder="Mô tả chi tiết cơ chế và hậu quả của tương tác..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Khuyến nghị</label>
                  <AutoExpandingTextarea
                    required
                    rows={2}
                    className={cn(
                      "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none",
                      isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                    )}
                    value={formData.recommendation || ''}
                    onChange={(e) => setFormData({...formData, recommendation: (e.target as HTMLTextAreaElement).value})}
                    placeholder="Lời khuyên xử trí lâm sàng..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-bold transition-all",
                      isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={cn(
                      "flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2",
                      isDarkMode && "shadow-none"
                    )}
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Library size={20} />}
                    {editingInteraction ? 'Cập nhật' : 'Lưu tương tác'}
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
        title="Xác nhận xóa tương tác"
        message={`Bạn có chắc chắn muốn xóa tương tác thuốc này? Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        isDarkMode={isDarkMode}
      />
      <DrugDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        drug={detailDrug} 
        isDarkMode={isDarkMode} 
      />
    </div>
  );
};

export default InteractionChecker;
