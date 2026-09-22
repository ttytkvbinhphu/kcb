import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ShieldAlert, X, Plus, Sparkles, Loader2, AlertTriangle, CheckCircle2, Info, Library, FileText, Edit2, Trash2, ChevronRight, ChevronLeft, MoreVertical, AlertOctagon, Heart, Activity, Baby, Users, Car, Scale, Pill, Filter, Tag, ArrowLeft } from 'lucide-react';
import { Drug, InteractionResult, ManualInteraction, ICD10 } from '../types';
import { subscribeICD10 } from '../lib/icdStore';
import { motion, AnimatePresence } from 'motion/react';
import { cn, sanitizeFirestoreData } from '../lib/utils';
import DrugDetailModal from './DrugDetailModal';
import { db, collection, getDocs, handleFirestoreError, OperationType, onSnapshot, setDoc, doc, deleteDoc, query, orderBy, sanitizeData } from '../firebase';
import ConfirmModal from './ConfirmModal';
import { extractAllInteractionsFromDrugs, checkPairInteractions, UnifiedInteraction } from '../lib/drugInteractionHelper';

interface InteractionCheckerProps {
  isActive?: boolean;
  canManage: boolean;
  isDarkMode: boolean;
  subHeaderPortalId?: string;
  currentUserUid: string;
  currentUserName: string;
  featureSettings?: any;
}

const INTERACTION_TYPES = [
  'Thuốc - Thuốc',
  'Thuốc - ICD-10',
  'Thuốc - Đối tượng'
];

const SUBJECT_CATEGORIES = [
  'Tất cả đối tượng',
  'Phụ nữ có thai',
  'Phụ nữ cho con bú',
  'Trẻ em / Độ tuổi',
  'Người cao tuổi',
  'Suy thận',
  'Suy gan',
  'Lái xe & Vận hành máy',
  'Khả năng sinh sản',
  'Cân nặng'
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
  isActive,
  canManage,
  isDarkMode,
  subHeaderPortalId,
  currentUserUid,
  currentUserName,
  featureSettings
}) => {
  const [activeTab, setActiveTab] = useState<'checker' | 'catalog'>('catalog');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileCheckerDrawer, setShowMobileCheckerDrawer] = useState(false);
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (showMobileCheckerDrawer && isMobile) {
      window.dispatchEvent(new CustomEvent("set-tab-swipe-lock", { detail: { locked: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent("set-tab-swipe-lock", { detail: { locked: false } }));
      };
    }
  }, [showMobileCheckerDrawer, isMobile]);

  // Catalog Filtering State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedSubjectCategory, setSelectedSubjectCategory] = useState<string>('Tất cả đối tượng');
  const [filterSource, setFilterSource] = useState<'all' | 'directory' | 'manual'>('all');

  // Catalog Pagination State
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogItemsPerPage, setCatalogItemsPerPage] = useState(25);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogSearch, filterSeverity, filterType, selectedSubjectCategory, filterSource]);

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
      setDrugs(snapshot.docs.map(doc => ({ ...sanitizeFirestoreData(doc.data()), id: doc.id } as Drug)));
    }, (error) => {
      console.error("Error fetching drugs for interaction check:", error);
      handleFirestoreError(error, OperationType.LIST, 'drugs');
    });

    const unsubscribeICD = subscribeICD10((list) => {
      setIcd10List(list);
    });

    const unsubscribeManual = onSnapshot(query(collection(db, 'manual_interactions'), orderBy('updatedAt', 'desc')), (snapshot) => {
      setManualInteractions(snapshot.docs.map(doc => ({ ...sanitizeFirestoreData(doc.data()), id: doc.id } as ManualInteraction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'manual_interactions');
    });

    return () => {
      unsubscribeDrugs();
      unsubscribeICD();
      unsubscribeManual();
    };
  }, []);

  // Extract interactions automatically from Drug Directory data
  const autoInteractions = useMemo(() => {
    return extractAllInteractionsFromDrugs(drugs);
  }, [drugs]);

  // Unified list of interactions combining manual and auto-extracted
  const allInteractions: UnifiedInteraction[] = useMemo(() => {
    return [...manualInteractions, ...autoInteractions];
  }, [manualInteractions, autoInteractions]);

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

  // Derived catalog listings with search, type, severity, subject category, and source filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterSeverity !== 'all') count++;
    if (filterType !== 'all') count++;
    if (filterSource !== 'all') count++;
    if (selectedSubjectCategory !== 'Tất cả đối tượng') count++;
    return count;
  }, [filterSeverity, filterType, filterSource, selectedSubjectCategory]);

  const getPortalTarget = () => {
    if (subHeaderPortalId) {
      const el = document.getElementById(subHeaderPortalId);
      if (el) return el;
    }
    return null;
  };

  const filteredCatalogInteractions = useMemo(() => {
    return allInteractions.filter(item => {
      const searchLower = catalogSearch.toLowerCase().trim();
      const matchesSearch = !searchLower ||
        item.sourceNames.some(name => name.toLowerCase().includes(searchLower)) ||
        (item.targetName && item.targetName.toLowerCase().includes(searchLower)) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.recommendation && item.recommendation.toLowerCase().includes(searchLower)) ||
        (item.type && item.type.toLowerCase().includes(searchLower)) ||
        (item.sourceCategory && item.sourceCategory.toLowerCase().includes(searchLower));

      const matchesSeverity = filterSeverity === 'all' || item.severity === filterSeverity;
      const matchesType = filterType === 'all' || item.type === filterType;

      const matchesSource = filterSource === 'all' ||
        (filterSource === 'directory' && item.isFromDrugDirectory) ||
        (filterSource === 'manual' && !item.isFromDrugDirectory);

      let matchesSubjectCategory = true;
      if (selectedSubjectCategory !== 'Tất cả đối tượng' && (filterType === 'Thuốc - Đối tượng' || filterType === 'all')) {
        const cat = selectedSubjectCategory.toLowerCase();
        const itemCat = (item.sourceCategory || '').toLowerCase();
        const target = (item.targetName || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const rec = (item.recommendation || '').toLowerCase();

        let isMatch = itemCat.includes(cat) || target.includes(cat) || desc.includes(cat) || rec.includes(cat);

        if (!isMatch) {
          if (selectedSubjectCategory === 'Phụ nữ có thai') {
            isMatch = itemCat.includes('thai') || target.includes('thai') || desc.includes('thai') || desc.includes('mang thai');
          } else if (selectedSubjectCategory === 'Phụ nữ cho con bú') {
            isMatch = itemCat.includes('bú') || target.includes('bú') || desc.includes('cho con bú') || desc.includes('sữa mẹ');
          } else if (selectedSubjectCategory === 'Trẻ em / Độ tuổi') {
            isMatch = itemCat.includes('trẻ') || itemCat.includes('tuổi') || target.includes('trẻ') || target.includes('tuổi') || desc.includes('trẻ em') || desc.includes('sơ sinh');
          } else if (selectedSubjectCategory === 'Người cao tuổi') {
            isMatch = itemCat.includes('cao tuổi') || target.includes('cao tuổi') || desc.includes('cao tuổi') || desc.includes('người già');
          } else if (selectedSubjectCategory === 'Suy thận') {
            isMatch = itemCat.includes('thận') || target.includes('thận') || desc.includes('thận') || desc.includes('crcl');
          } else if (selectedSubjectCategory === 'Suy gan') {
            isMatch = itemCat.includes('gan') || target.includes('gan') || desc.includes('gan') || desc.includes('men gan');
          } else if (selectedSubjectCategory === 'Cân nặng') {
            isMatch = itemCat.includes('cân nặng') || target.includes('cân nặng') || desc.includes('cân nặng') || desc.includes('thể trọng') || desc.includes('kg');
          } else if (selectedSubjectCategory === 'Lái xe & Vận hành máy') {
            isMatch = itemCat.includes('lái xe') || target.includes('lái xe') || desc.includes('lái xe') || desc.includes('vận hành máy');
          } else if (selectedSubjectCategory === 'Khả năng sinh sản') {
            isMatch = itemCat.includes('sinh sản') || target.includes('sinh sản') || desc.includes('sinh sản') || desc.includes('vô sinh');
          }
        }

        matchesSubjectCategory = isMatch;
      }

      return matchesSearch && matchesSeverity && matchesType && matchesSource && matchesSubjectCategory;
    });
  }, [allInteractions, catalogSearch, filterSeverity, filterType, filterSource, selectedSubjectCategory]);

  const totalCatalogPages = Math.ceil(filteredCatalogInteractions.length / catalogItemsPerPage);
  const activeCatalogPage = Math.min(catalogPage, Math.max(1, totalCatalogPages));
  const paginatedCatalogInteractions = filteredCatalogInteractions.slice(
    (activeCatalogPage - 1) * catalogItemsPerPage,
    activeCatalogPage * catalogItemsPerPage
  );

  // Quick subject warnings for the currently selected drugs in the Checker tab
  const selectedDrugsSubjectWarnings = useMemo(() => {
    if (selectedDrugs.length === 0) return [];
    const selectedIds = new Set(selectedDrugs.map(d => d.id));
    return autoInteractions.filter(item =>
      item.type === 'Thuốc - Đối tượng' &&
      item.sourceIds.some(id => selectedIds.has(id))
    );
  }, [selectedDrugs, autoInteractions]);

  const checkInteractions = async () => {
    if (selectedDrugs.length < 2) return;

    setLoading(true);
    try {
      // 1. Check pair interactions from both manual interactions and auto-extracted drug data
      const pairResult = checkPairInteractions(selectedDrugs, manualInteractions, autoInteractions);

      if (pairResult.matchedInteractions.length > 0) {
        const fullDescription = pairResult.matchedInteractions.map(m => {
          const names = m.sourceNames.join(' + ');
          const target = m.targetName ? ` vs ${m.targetName}` : '';
          return `• [${m.sourceCategory || m.type}] ${names}${target}: ${m.description}`;
        }).join('\n\n');

        const fullRecommendation = pairResult.matchedInteractions.map(m => m.recommendation).filter(Boolean).join(' ');

        setResult({
          severity: pairResult.highestSeverity,
          description: fullDescription,
          recommendation: fullRecommendation || 'Tham khảo hướng dẫn chuyên khoa và theo dõi sát người bệnh.',
          isAI: false,
          contraindicated: pairResult.isContraindicated
        });
        setLoading(false);
        return;
      }

      // 2. Fallback to AI - for admins or managers, or provide standard message
      if (!canManage) {
        setResult({
          severity: 'low',
          description: 'Không phát hiện tương tác đối kháng hay tương kỵ nghiêm trọng được ghi nhận trong Dược thư Quốc gia giữa các thuốc đã chọn.',
          recommendation: 'Tuy nhiên, vẫn nên theo dõi sát phản ứng lâm sàng của người bệnh khi phối hợp đa thuốc.',
          isAI: false
        });
        setLoading(false);
        return;
      }

      const drugNames = selectedDrugs.map(d => d.name).join(', ');

      const prompt = `Kiểm tra tương tác thuốc giữa các loại thuốc sau: ${drugNames}. 
      Trả về kết quả dưới định dạng JSON với các trường:
      - severity: 'low' | 'medium' | 'high'
      - description: Mô tả chi tiết các tương tác (nếu có) bằng tiếng Việt.
      - recommendation: Lời khuyên cho bác sĩ bằng tiếng Việt.`;

      const { generateGeminiContent } = await import('../lib/gemini');
      const text = await generateGeminiContent(
        "gemini-3.5-flash",
        [{ parts: [{ text: prompt }] }],
        {
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
        }
      );

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

  const renderCheckerFormAndResult = (isMobileDrawer = false) => {
    return (
      <div className={isMobileDrawer ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-12 gap-8"}>
        <div className={isMobileDrawer ? "space-y-6" : "lg:col-span-5 space-y-6"}>
          <div className={cn(
            "p-5 lg:p-8 rounded-2xl lg:rounded-[32px] border shadow-sm transition-colors",
            isDarkMode
              ? "bg-slate-900 border-slate-800 shadow-none"
              : "bg-white border-slate-100 shadow-slate-200/20"
          )}>
            <h3 className={cn(
              "text-base lg:text-xl font-bold mb-4 lg:mb-6 flex items-center gap-2 transition-colors",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>
              <Plus size={18} className="text-blue-600" />
              Chọn thuốc cần kiểm tra
            </h3>

            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm tên thuốc hoặc hoạt chất..."
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 lg:py-3 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-xs lg:text-sm font-medium",
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
                    filteredDrugs.map((drug, dIdx) => (
                      <div
                        key={`filt-drug-${drug.id || 'd'}-${dIdx}`}
                        onClick={() => addDrug(drug)}
                        className={cn(
                          "w-full text-left px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-between group cursor-pointer",
                          isDarkMode ? "hover:bg-blue-900/30" : "hover:bg-blue-50"
                        )}
                      >
                        <div className="flex-1 text-left min-w-0 pr-2">
                          <p
                            className={cn(
                              "font-bold text-xs lg:text-sm truncate transition-colors",
                              isDarkMode ? "text-white" : "text-slate-900"
                            )}
                          >
                            {drug.name}
                          </p>
                          <p className={cn(
                            "text-[10px] lg:text-xs uppercase font-medium truncate transition-colors",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>{drug.activeIngredients?.[0]?.name || 'N/A'}</p>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDrugDetail(drug);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer",
                              isDarkMode 
                                ? "text-slate-400 hover:text-blue-400 hover:bg-slate-800" 
                                : "text-slate-400 hover:text-blue-600 hover:bg-slate-100/80"
                            )}
                            title="Xem chi tiết thuốc"
                          >
                            <Info size={14} />
                          </button>
                          <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isDarkMode ? "text-slate-500 group-hover:text-blue-400" : "text-slate-300 group-hover:text-blue-500"
                          )}>
                            <Plus size={15} />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={cn(
                      "p-4 text-center text-xs lg:text-sm transition-colors",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>Không tìm thấy thuốc</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest mb-1.5 transition-colors",
                isDarkMode ? "text-slate-500" : "text-slate-400"
              )}>Danh sách đã chọn ({selectedDrugs.length}/5)</p>
              <AnimatePresence>
                {selectedDrugs.map((drug, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={`sel-drug-${drug.id || 'd'}-${idx}`}
                    className={cn(
                      "flex items-center justify-between p-3 lg:p-4 border rounded-2xl group transition-colors",
                      isDarkMode ? "bg-blue-900/10 border-blue-900/30" : "bg-blue-50/50 border-blue-100"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div className="bg-blue-600 p-1.5 rounded-lg text-white shrink-0">
                        <ShieldAlert size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          onClick={() => handleShowDrugDetail(drug)}
                          className={cn("font-bold text-xs lg:text-sm truncate transition-colors cursor-pointer hover:underline decoration-blue-500", isDarkMode ? "text-white" : "text-slate-900")}
                        >
                          {drug.name}
                        </p>
                        <p className={cn("text-[9.5px] lg:text-[10px] font-bold uppercase tracking-tighter truncate transition-colors", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                          {drug.activeIngredients?.[0]?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDrug(drug.id)}
                      className={cn(
                        "p-1.5 rounded-xl transition-all shrink-0 cursor-pointer",
                        isDarkMode ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                      )}
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {selectedDrugs.length === 0 && (
                <div className={cn(
                  "py-8 lg:py-12 text-center border-2 border-dashed rounded-2xl lg:rounded-3xl transition-colors",
                  isDarkMode ? "border-slate-800" : "border-slate-100"
                )}>
                  <p className={cn("text-xs lg:text-sm font-medium transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Chưa có thuốc nào được chọn</p>
                </div>
              )}
            </div>

            {/* Quick Special Populations warnings for selected drugs */}
            {selectedDrugsSubjectWarnings.length > 0 && (
              <div className={cn(
                "mt-5 p-3.5 lg:p-4 rounded-2xl border transition-colors",
                isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50/80 border-slate-200/70"
              )}>
                <h4 className="text-[10.5px] lg:text-[11px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} />
                  Cảnh báo đối tượng đặc biệt ({selectedDrugsSubjectWarnings.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedDrugsSubjectWarnings.slice(0, 6).map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs flex items-start gap-2 transition-colors",
                        item.contraindicated
                          ? (isDarkMode ? "bg-rose-950/20 border-rose-900/30 text-rose-300" : "bg-rose-50 border-rose-100 text-rose-700")
                          : (isDarkMode ? "bg-slate-900/70 border-slate-700/60 text-slate-300" : "bg-white border-slate-200/70 text-slate-700")
                      )}
                    >
                      <div className="shrink-0 mt-0.5">
                        {item.sourceCategory === 'Phụ nữ có thai' ? <Heart size={13} className="text-rose-500" /> :
                          item.sourceCategory === 'Phụ nữ cho con bú' ? <Baby size={13} className="text-pink-500" /> :
                            item.sourceCategory === 'Lái xe & Vận hành máy' ? <Car size={13} className="text-amber-500" /> :
                              item.sourceCategory === 'Trẻ em / Độ tuổi' ? <Baby size={13} className="text-blue-500" /> :
                                <Activity size={13} className="text-teal-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold">{item.sourceNames[0]}:</span>
                          <span className="font-black text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-200/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.targetName}
                          </span>
                          {item.contraindicated && (
                            <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-100 dark:bg-rose-900/50 px-1 py-0.2 rounded">CCĐ</span>
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed mt-0.5 line-clamp-2 opacity-90">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={selectedDrugs.length < 2 || loading}
              onClick={checkInteractions}
              className={cn(
                "w-full mt-6 py-3.5 lg:py-4 rounded-2xl font-bold text-sm lg:text-lg flex items-center justify-center gap-2.5 lg:gap-3 transition-all shadow-lg cursor-pointer",
                isDarkMode ? "shadow-none" : "shadow-blue-100",
                selectedDrugs.length < 2 || loading
                  ? cn("cursor-not-allowed shadow-none", isDarkMode ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-400")
                  : "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-blue-200 active:scale-[0.98]"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Đang phân tích...
                </>
              ) : (
                <>
                  {canManage ? <Sparkles size={20} className="text-blue-400" /> : <Search size={18} className="text-blue-400" />}
                  Kiểm tra tương tác ({selectedDrugs.length}/5)
                </>
              )}
            </button>
          </div>
        </div>

        <div className={isMobileDrawer ? "space-y-6" : "lg:col-span-7 lg:sticky lg:top-8"}>
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
                  "p-5 lg:p-8 text-white flex items-center justify-between",
                  result.contraindicated ? "bg-rose-700" : (
                    result.severity === 'high' ? "bg-rose-600" :
                      result.severity === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                  )
                )}>
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="bg-white/20 p-2 lg:p-3 rounded-xl lg:rounded-2xl backdrop-blur-md">
                      {result.contraindicated ? <AlertOctagon size={22} /> : (
                        result.severity === 'high' ? <AlertTriangle size={22} /> :
                          result.severity === 'medium' ? <Info size={22} /> : <CheckCircle2 size={22} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base lg:text-2xl font-black tracking-tight leading-snug">
                        {result.contraindicated ? "Chống chỉ định phối hợp" : (
                          result.severity === 'high' ? "Cảnh báo tương tác nghiêm trọng" :
                            result.severity === 'medium' ? "Cần lưu ý khi phối hợp" : "Không ghi nhận tương tác bất lợi"
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="p-5 lg:p-8 space-y-5 lg:space-y-8">
                  <section>
                    <h5 className={cn(
                      "text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] mb-2.5 lg:mb-4 transition-colors",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>Chi tiết tương tác</h5>
                    <div className={cn(
                      "leading-relaxed text-xs lg:text-base font-semibold whitespace-pre-line transition-colors",
                      isDarkMode ? "text-slate-200" : "text-slate-800"
                    )}>
                      {result.description}
                    </div>
                  </section>

                  <div className={cn("h-px w-full transition-colors", isDarkMode ? "bg-slate-800" : "bg-slate-100")}></div>

                  <section>
                    <h5 className={cn(
                      "text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] mb-2.5 lg:mb-4 transition-colors",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>Khuyến nghị lâm sàng</h5>
                    <div className={cn(
                      "p-3.5 lg:p-6 rounded-xl lg:rounded-2xl border transition-colors",
                      isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                    )}>
                      <p className={cn(
                        "font-bold italic leading-relaxed text-xs lg:text-base transition-colors",
                        isDarkMode ? "text-slate-200" : "text-slate-800"
                      )}>
                        "{result.recommendation}"
                      </p>
                    </div>
                  </section>

                  {result.isAI && (
                    <div className={cn(
                      "p-3.5 rounded-xl flex gap-2.5 items-start transition-colors",
                      isDarkMode ? "bg-blue-900/10" : "bg-blue-50"
                    )}>
                      <Info size={16} className={cn("shrink-0 mt-0.5", isDarkMode ? "text-blue-400" : "text-blue-500")} />
                      <p className={cn(
                        "text-[11px] lg:text-xs leading-relaxed transition-colors",
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
                "h-full flex flex-col items-center justify-center text-center p-8 lg:p-12 rounded-3xl border-2 border-dashed min-h-[300px] lg:min-h-[500px] transition-colors",
                isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className={cn(
                  "p-6 lg:p-8 rounded-full shadow-xl transition-colors mb-5 lg:mb-8",
                  isDarkMode ? "bg-slate-800 shadow-none" : "bg-blue-50 shadow-blue-100/50"
                )}>
                  {canManage ? (
                    <Sparkles size={48} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                  ) : (
                    <Library size={48} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                  )}
                </div>
                <h3 className={cn("text-lg lg:text-2xl font-black mb-2 lg:mb-4 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                  {canManage ? "Sẵn sàng phân tích & kiểm tra" : "Sẵn sàng tra cứu"}
                </h3>
                <p className={cn("max-w-sm text-xs lg:text-lg leading-relaxed transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  {canManage
                    ? "Chọn ít nhất 2 loại thuốc để bắt đầu kiểm tra tương tác tự động dựa trên Dược thư và AI."
                    : "Chọn ít nhất 2 loại thuốc để kiểm tra tương tác dựa trên danh mục chính thức."
                  }
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "p-1 lg:p-6 max-w-full mx-auto min-h-screen transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      {/* Mobile Header Portal Search & Controls */}
      {(() => {
        if (isActive === false) return null;
        const portalTarget = getPortalTarget();
        if (!portalTarget) return null;

        return createPortal(
          <div className="flex items-center justify-between w-full gap-1.5 lg:hidden">
            {/* Left: Thanh tìm kiếm Danh mục tương tác */}
            <div className="relative flex-1 min-w-0 flex items-center">
              <Search
                className={cn(
                  "absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
                  catalogSearch ? "text-blue-500" : "text-slate-400"
                )}
                size={14}
              />
              <input
                type="text"
                placeholder="Tìm tương tác, thuốc, đối tượng..."
                className={cn(
                  "w-full pl-8 pr-7 py-1.5 text-xs bg-transparent border-0 outline-none focus:outline-none focus:ring-0 transition-all font-bold",
                  isDarkMode
                    ? "text-white placeholder:text-slate-500"
                    : "text-slate-900 placeholder:text-slate-400"
                )}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              {catalogSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Xóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Right: Nút bộ lọc & Nút đi vào giao diện Kiểm tra tương tác */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Nút bộ lọc */}
              <button
                type="button"
                onClick={() => setShowMobileFilters(prev => !prev)}
                className={cn(
                  "p-1.5 rounded-lg transition-all flex items-center justify-center relative cursor-pointer active:scale-95",
                  showMobileFilters
                    ? isDarkMode
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-blue-50 text-blue-600"
                    : isDarkMode
                      ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
                title="Bộ lọc tương tác"
              >
                <Filter size={15} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center bg-blue-600 text-white text-[8.5px] min-w-3.5 h-3.5 px-0.5 rounded-full font-black border border-white dark:border-slate-900 shadow-2xs pointer-events-none z-10">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Nút đi vào giao diện Kiểm tra tương tác (mở drawer trượt từ phải sang trái) */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileFilters(false);
                  setShowMobileCheckerDrawer(true);
                }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 border",
                  isDarkMode
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30"
                    : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 shadow-sm"
                )}
                title="Kiểm tra tương tác"
              >
                <Sparkles size={13} className="text-blue-500 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Kiểm tra</span>
                {selectedDrugs.length > 0 && (
                  <span className="px-1 py-0.2 rounded-full bg-blue-600 text-white text-[8.5px] font-black leading-none">
                    {selectedDrugs.length}
                  </span>
                )}
              </button>
            </div>
          </div>,
          portalTarget
        );
      })()}

      {/* Mobile Expandable Filter Drawer */}
      <AnimatePresence>
        {showMobileFilters && activeTab === 'catalog' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden mb-3"
          >
            <div className={cn(
              "p-3 rounded-2xl border space-y-3.5 shadow-sm transition-all",
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-blue-50/40 border-blue-100"
            )}>
              {/* Reset Filters */}
              {activeFiltersCount > 0 && (
                <div className={cn("flex items-center justify-between pb-2 border-b border-dashed", isDarkMode ? "border-slate-800" : "border-slate-200")}>
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Bộ lọc đang chọn ({activeFiltersCount})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSeverity('all');
                      setFilterType('all');
                      setSelectedSubjectCategory('Tất cả đối tượng');
                      setFilterSource('all');
                    }}
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg transition-colors cursor-pointer",
                      isDarkMode ? "hover:bg-rose-950/40" : "hover:bg-rose-50"
                    )}
                  >
                    <Trash2 size={12} />
                    <span>Xóa bộ lọc</span>
                  </button>
                </div>
              )}

              {/* Filter Type */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-blue-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Phân loại tương tác
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {['all', ...INTERACTION_TYPES].map((t, idx) => (
                    <button
                      key={`mob-type-${t}-${idx}`}
                      type="button"
                      onClick={() => {
                        setFilterType(t);
                        if (t !== 'Thuốc - Đối tượng') setSelectedSubjectCategory('Tất cả đối tượng');
                      }}
                      className={cn(
                        "py-1.5 px-2 rounded-xl text-[10px] font-black tracking-wider transition-all text-center border truncate cursor-pointer",
                        filterType === t
                          ? (isDarkMode ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-blue-700 border-blue-200 shadow-sm font-black")
                          : (isDarkMode ? "bg-slate-800/80 border-slate-700/60 text-slate-400" : "bg-white/60 border-slate-200 text-slate-500")
                      )}
                    >
                      {t === 'all' ? 'Tất cả phân loại' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Severity */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-rose-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Mức độ tương tác
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'all', label: 'Tất cả mức độ' },
                    { id: 'high', label: 'Nghiêm trọng / CCĐ' },
                    { id: 'medium', label: 'Trung bình' },
                    { id: 'low', label: 'Nhẹ' }
                  ].map((s, idx) => (
                    <button
                      key={`mob-sev-${s.id}-${idx}`}
                      type="button"
                      onClick={() => setFilterSeverity(s.id)}
                      className={cn(
                        "py-1.5 px-2 rounded-xl text-[10px] font-black tracking-wider transition-all text-center border truncate cursor-pointer",
                        filterSeverity === s.id
                          ? (isDarkMode ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-rose-700 border-rose-200 shadow-sm font-black")
                          : (isDarkMode ? "bg-slate-800/80 border-slate-700/60 text-slate-400" : "bg-white/60 border-slate-200 text-slate-500")
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Source */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Nguồn dữ liệu
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'directory', label: 'Dược thư' },
                    { id: 'manual', label: 'Thủ công' }
                  ].map((src, idx) => (
                    <button
                      key={`mob-src-${src.id}-${idx}`}
                      type="button"
                      onClick={() => setFilterSource(src.id as any)}
                      className={cn(
                        "py-1.5 px-2 rounded-xl text-[10px] font-black tracking-wider transition-all text-center border truncate cursor-pointer",
                        filterSource === src.id
                          ? (isDarkMode ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-emerald-700 border-emerald-200 shadow-sm font-black")
                          : (isDarkMode ? "bg-slate-800/80 border-slate-700/60 text-slate-400" : "bg-white/60 border-slate-200 text-slate-500")
                      )}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Subject Categories Filter Chips */}
              {(filterType === 'all' || filterType === 'Thuốc - Đối tượng') && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-purple-500 rounded-full" />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Đối tượng đặc biệt
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {SUBJECT_CATEGORIES.map((category, catIdx) => {
                      const isSelected = selectedSubjectCategory === category;
                      return (
                        <button
                          key={`mob-subj-cat-${category}-${catIdx}`}
                          type="button"
                          onClick={() => {
                            setSelectedSubjectCategory(category);
                            if (filterType !== 'Thuốc - Đối tượng' && category !== 'Tất cả đối tượng') {
                              setFilterType('Thuốc - Đối tượng');
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border cursor-pointer",
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : (isDarkMode
                                ? "bg-slate-800/80 border-slate-700/60 text-slate-300"
                                : "bg-white border-slate-200 text-slate-600")
                          )}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area with Push Transition when Mobile Drawer Opens */}
      <motion.div
        animate={{
          x: isMobile && showMobileCheckerDrawer ? "-100%" : "0%",
          scale: 1,
          opacity: 1,
        }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full origin-left transition-colors"
      >
        <div className="mb-4 lg:mb-10 space-y-6">
        <div className="hidden lg:flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className={cn(
              "inline-flex items-center gap-4 px-6 py-3 rounded-[32px] border-2 transition-all",
              isDarkMode 
                ? "bg-rose-500/5 border-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/5" 
                : "bg-rose-50 border-rose-100 text-rose-600 shadow-xl shadow-rose-500/10"
            )}>
              <div className="p-2 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-600/20">
                <ShieldAlert size={32} />
              </div>
              <span className="text-[35px] font-black tracking-tighter uppercase">
                {featureSettings?.customTitle || (canManage ? "Quản lý tương tác thuốc" : "Tương tác thuốc")}
              </span>
            </div>
          </div>

          {/* Tabs - Desktop view */}
          <div className={cn(
            "flex gap-1 lg:gap-2 p-1 rounded-xl lg:rounded-2xl w-fit transition-all border shrink-0",
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-100 shadow-sm shadow-slate-100"
          )}>
            <button
              type="button"
              onClick={() => setActiveTab('checker')}
              className={cn(
                "px-4 lg:px-8 py-2 lg:py-3 rounded-lg lg:rounded-xl text-xs lg:text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer",
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
                "px-4 lg:px-8 py-2 lg:py-3 rounded-lg lg:rounded-xl text-xs lg:text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer",
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
                {allInteractions.length}
              </span>
            </button>
          </div>
        </div>

        <div className="hidden lg:flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-8">
          <div>
            <p className={cn(
              "font-medium max-w-md transition-colors text-xs lg:text-base",
              isDarkMode ? "text-slate-400" : "text-slate-500"
            )}>
              {canManage
                ? "Quản lý dữ liệu tương tác giữa các loại thuốc, đối tượng đặc biệt và bệnh lý lâm sàng."
                : "Phân tích và tra cứu tương tác thuốc, cảnh báo đối tượng đặc biệt (thai kỳ, cho con bú, trẻ em, suy gan/thận...)."
              }
            </p>
          </div>

          {canManage && activeTab === 'catalog' && (
            <button
              onClick={() => handleOpenModal()}
              className={cn(
                "flex items-center justify-center gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-blue-600 text-white rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-xs lg:text-sm shadow-lg cursor-pointer",
                isDarkMode ? "shadow-none hover:bg-blue-700" : "shadow-blue-100 hover:bg-blue-700"
              )}
            >
              <Plus size={18} /> Thêm tương tác thủ công
            </button>
          )}
        </div>
      </div>

        {!isMobile && activeTab === 'checker' ? (
          renderCheckerFormAndResult(false)
        ) : (
        <div className="flex flex-col gap-6">
          {/* Catalog Filters - Desktop */}
          <div className={cn(
            "hidden lg:flex p-4 lg:p-6 rounded-2xl border flex-col gap-4 transition-colors",
            isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-sm"
          )}>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Tìm trong danh mục (tên thuốc, đối tượng, thai kỳ, trẻ em, suy thận, mô tả...)"
                  className={cn(
                    "w-full pl-11 pr-4 py-2.5 rounded-xl border-transparent focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium",
                    isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900 border-slate-100"
                  )}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  className={cn(
                    "px-4 py-2.5 rounded-xl border-transparent focus:ring-2 focus:ring-blue-500 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer",
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600 border-slate-100"
                  )}
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    if (e.target.value !== 'Thuốc - Đối tượng') {
                      setSelectedSubjectCategory('Tất cả đối tượng');
                    }
                  }}
                >
                  <option value="all">Tất cả phân loại</option>
                  {INTERACTION_TYPES.map((t, tIdx) => <option key={`int-type-opt-${t}-${tIdx}`} value={t}>{t}</option>)}
                </select>

                <select
                  className={cn(
                    "px-4 py-2.5 rounded-xl border-transparent focus:ring-2 focus:ring-blue-500 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer",
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600 border-slate-100"
                  )}
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                >
                  <option value="all">Tất cả mức độ</option>
                  <option value="high">Nghiêm trọng / CCĐ</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Nhẹ</option>
                </select>

                <select
                  className={cn(
                    "px-4 py-2.5 rounded-xl border-transparent focus:ring-2 focus:ring-blue-500 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer",
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600 border-slate-100"
                  )}
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value as any)}
                >
                  <option value="all">Tất cả nguồn dữ liệu</option>
                  <option value="directory">Dược thư Tra cứu (Tự động)</option>
                  <option value="manual">Dữ liệu thủ công</option>
                </select>
              </div>
            </div>

            {/* Quick Subject Categories Filter Chips */}
            {(filterType === 'all' || filterType === 'Thuốc - Đối tượng') && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {SUBJECT_CATEGORIES.map((category, catIdx) => {
                  const isSelected = selectedSubjectCategory === category;
                  return (
                    <button
                      key={`subj-cat-${category}-${catIdx}`}
                      type="button"
                      onClick={() => {
                        setSelectedSubjectCategory(category);
                        if (filterType !== 'Thuốc - Đối tượng' && category !== 'Tất cả đối tượng') {
                          setFilterType('Thuốc - Đối tượng');
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : (isDarkMode
                            ? "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700"
                            : "bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-200/80")
                      )}
                    >
                      {category === 'Phụ nữ có thai' && <Heart size={12} className={isSelected ? "text-white" : "text-rose-500"} />}
                      {category === 'Phụ nữ cho con bú' && <Baby size={12} className={isSelected ? "text-white" : "text-pink-500"} />}
                      {category === 'Trẻ em / Độ tuổi' && <Baby size={12} className={isSelected ? "text-white" : "text-blue-500"} />}
                      {category === 'Người cao tuổi' && <Users size={12} className={isSelected ? "text-white" : "text-indigo-500"} />}
                      {category === 'Suy thận' && <Activity size={12} className={isSelected ? "text-white" : "text-teal-500"} />}
                      {category === 'Suy gan' && <ShieldAlert size={12} className={isSelected ? "text-white" : "text-amber-500"} />}
                      {category === 'Lái xe & Vận hành máy' && <Car size={12} className={isSelected ? "text-white" : "text-orange-500"} />}
                      {category === 'Cân nặng' && <Scale size={12} className={isSelected ? "text-white" : "text-emerald-500"} />}
                      {category === 'Khả năng sinh sản' && <Sparkles size={12} className={isSelected ? "text-white" : "text-purple-500"} />}
                      <span>{category}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className={cn(
              "hidden lg:grid grid-cols-12 gap-4 px-8 py-4 text-xs font-black uppercase tracking-widest transition-colors border-b",
              isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-100"
            )}>
              <div className="col-span-1">Mức độ</div>
              <div className="col-span-2">Phân loại</div>
              <div className="col-span-3">Thuốc & Đối tượng</div>
              <div className="col-span-3">Mô tả tương tác / Cảnh báo</div>
              <div className="col-span-2">Khuyến nghị lâm sàng</div>
              <div className="col-span-1 text-right">Nguồn / Thao tác</div>
            </div>

            <AnimatePresence mode="popLayout">
              {filteredCatalogInteractions.length === 0 ? (
                <div className={cn(
                  "py-20 text-center rounded-3xl border-2 border-dashed transition-colors w-full",
                  isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
                )}>
                  <Search size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold">Không tìm thấy tương tác nào phù hợp với bộ lọc</p>
                </div>
              ) : (
                paginatedCatalogInteractions.map((item, itIdx) => {
                  const isSubject = item.type === 'Thuốc - Đối tượng';
                  const isIcd = item.type === 'Thuốc - ICD-10';

                  return (
                    <motion.div
                      key={`cat-item-${item.id || 'it'}-${itIdx}`}
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
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              isSubject
                                ? (item.sourceCategory === 'Phụ nữ có thai' ? "bg-rose-500/10 text-rose-500" :
                                    item.sourceCategory === 'Phụ nữ cho con bú' ? "bg-pink-500/10 text-pink-500" :
                                      item.sourceCategory === 'Lái xe & Vận hành máy' ? "bg-amber-500/10 text-amber-500" :
                                        item.sourceCategory === 'Trẻ em / Độ tuổi' ? "bg-blue-500/10 text-blue-500" :
                                          item.sourceCategory === 'Suy thận' ? "bg-teal-500/10 text-teal-500" :
                                            item.sourceCategory === 'Suy gan' ? "bg-amber-500/10 text-amber-500" :
                                              "bg-purple-500/10 text-purple-500")
                                : isIcd
                                  ? "bg-rose-500/10 text-rose-500"
                                  : "bg-blue-600/10 text-blue-600"
                            )}>
                              {isSubject ? (
                                item.sourceCategory === 'Phụ nữ có thai' ? <Heart size={20} /> :
                                  item.sourceCategory === 'Phụ nữ cho con bú' ? <Baby size={20} /> :
                                    item.sourceCategory === 'Lái xe & Vận hành máy' ? <Car size={20} /> :
                                      item.sourceCategory === 'Trẻ em / Độ tuổi' ? <Baby size={20} /> :
                                        item.sourceCategory === 'Người cao tuổi' ? <Users size={20} /> :
                                          item.sourceCategory === 'Suy thận' ? <Activity size={20} /> :
                                            item.sourceCategory === 'Suy gan' ? <ShieldAlert size={20} /> :
                                              item.sourceCategory === 'Cân nặng' ? <Scale size={20} /> :
                                                <Users size={20} />
                              ) : isIcd ? (
                                <Heart size={20} fill="currentColor" />
                              ) : (
                                <Library size={20} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className={cn("font-black text-xs leading-tight flex flex-wrap gap-x-2 gap-y-1 items-center", isDarkMode ? "text-white" : "text-slate-900")}>
                                {item.sourceNames.map((name, idx) => {
                                  const drug = findDrugByName(name);
                                  return (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="opacity-40">+</span>}
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
                                {item.targetName && <span className="text-[10px] opacity-40 font-bold ml-1">vs</span>}
                              </div>
                              {item.targetName && (
                                <div className={cn("font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                                  {(() => {
                                    const drug = item.type === 'Thuốc - Thuốc' ? findDrugByName(item.targetName) : null;
                                    return (
                                      <span
                                        onClick={() => drug && handleShowDrugDetail(drug)}
                                        className={cn(
                                          drug ? "cursor-pointer hover:text-blue-500 hover:underline decoration-blue-500/50" : ""
                                        )}
                                      >
                                        {isSubject ? `Đối tượng: ${item.targetName}` : item.targetName}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className={cn(
                              "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
                            )}>
                              {item.sourceCategory || item.type}
                            </div>
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border whitespace-nowrap",
                              item.severity === 'high' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                item.severity === 'medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            )}>
                              {item.severity === 'high' ? 'Nghiêm trọng' : item.severity === 'medium' ? 'Trung bình' : 'Nhẹ'}
                            </div>
                            {item.contraindicated && (
                              <div className="px-3 py-1 bg-rose-600 text-white rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm whitespace-nowrap">
                                <AlertOctagon size={10} />
                                CCĐ
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <div className={cn(
                            "flex-1 p-3 rounded-xl border text-xs leading-relaxed transition-colors space-y-1.5",
                            isDarkMode ? "bg-slate-800/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-50 text-slate-600"
                          )}>
                            <p>{item.description}</p>
                            {item.recommendation && (
                              <p className={cn("text-[11px] font-bold italic pt-1 border-t", isDarkMode ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-600")}>
                                Khuyến nghị: {item.recommendation}
                              </p>
                            )}
                          </div>
                          {canManage && !item.isFromDrugDirectory && (
                            <div className="flex flex-col gap-3 pt-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenModal(item)}
                                className={isDarkMode ? "text-slate-500 hover:text-blue-400 p-1" : "text-slate-400 hover:text-blue-600 p-1"}
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id, item.sourceNames.join(' + '))}
                                className={isDarkMode ? "text-slate-500 hover:text-rose-400 p-1" : "text-slate-400 hover:text-rose-600 p-1"}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                          {item.isFromDrugDirectory && item.sourceNames.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const drug = findDrugByName(item.sourceNames[0]);
                                if (drug) handleShowDrugDetail(drug);
                              }}
                              className="p-1 text-blue-500 hover:text-blue-600 shrink-0"
                              title="Xem chi tiết thuốc"
                            >
                              <Info size={18} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Desktop List View */}
                      <div className="hidden lg:grid grid-cols-12 gap-4 items-center px-8 py-5">
                        <div className="col-span-1 flex flex-col items-start gap-1">
                          <div className={cn(
                            "inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                            item.severity === 'high' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                              item.severity === 'medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          )}>
                            {item.severity === 'high' ? 'Nghiêm trọng' : item.severity === 'medium' ? 'Trung bình' : 'Nhẹ'}
                          </div>
                          {item.contraindicated && (
                            <div className="inline-flex px-2 py-1 bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider items-center gap-1 whitespace-nowrap">
                              <AlertOctagon size={8} />
                              Chống chỉ định
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              isSubject
                                ? (item.sourceCategory === 'Phụ nữ có thai' ? "bg-rose-500/10 text-rose-500" :
                                    item.sourceCategory === 'Phụ nữ cho con bú' ? "bg-pink-500/10 text-pink-500" :
                                      item.sourceCategory === 'Lái xe & Vận hành máy' ? "bg-amber-500/10 text-amber-500" :
                                        item.sourceCategory === 'Trẻ em / Độ tuổi' ? "bg-blue-500/10 text-blue-500" :
                                          item.sourceCategory === 'Suy thận' ? "bg-teal-500/10 text-teal-500" :
                                            item.sourceCategory === 'Suy gan' ? "bg-amber-500/10 text-amber-500" :
                                              "bg-purple-500/10 text-purple-500")
                                : isIcd
                                  ? "bg-rose-500/10 text-rose-500"
                                  : "bg-blue-600/10 text-blue-600"
                            )}>
                              {isSubject ? (
                                item.sourceCategory === 'Phụ nữ có thai' ? <Heart size={16} /> :
                                  item.sourceCategory === 'Phụ nữ cho con bú' ? <Baby size={16} /> :
                                    item.sourceCategory === 'Lái xe & Vận hành máy' ? <Car size={16} /> :
                                      item.sourceCategory === 'Trẻ em / Độ tuổi' ? <Baby size={16} /> :
                                        item.sourceCategory === 'Người cao tuổi' ? <Users size={16} /> :
                                          item.sourceCategory === 'Suy thận' ? <Activity size={16} /> :
                                            item.sourceCategory === 'Suy gan' ? <ShieldAlert size={16} /> :
                                              item.sourceCategory === 'Cân nặng' ? <Scale size={16} /> :
                                                <Users size={16} />
                              ) : isIcd ? (
                                <Heart size={16} fill="currentColor" />
                              ) : (
                                <Library size={16} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className={cn("text-xs font-black truncate block", isDarkMode ? "text-white" : "text-slate-900")}>
                                {item.sourceCategory || item.type}
                              </span>
                              {item.isFromDrugDirectory ? (
                                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tight">Dược thư</span>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Thủ công</span>
                              )}
                            </div>
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
                                    {isSubject ? `Đối tượng: ${item.targetName}` : item.targetName}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        <div className="col-span-3">
                          <p className={cn("text-[11px] font-medium leading-relaxed transition-colors line-clamp-3", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                            {item.description}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className={cn("text-[10px] font-bold italic leading-snug line-clamp-3", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                            {item.recommendation || "Tham khảo ý kiến bác sĩ/dược sĩ lâm sàng."}
                          </p>
                        </div>

                        <div className="col-span-1 flex justify-end gap-1 items-center">
                          {item.isFromDrugDirectory ? (
                            <button
                              type="button"
                              onClick={() => {
                                const drug = item.sourceNames[0] ? findDrugByName(item.sourceNames[0]) : null;
                                if (drug) handleShowDrugDetail(drug);
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                isDarkMode ? "hover:bg-slate-800 text-blue-400 hover:text-blue-300" : "hover:bg-blue-50 text-blue-600"
                              )}
                              title="Xem chi tiết thuốc"
                            >
                              <Info size={16} />
                            </button>
                          ) : (
                            canManage && (
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
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>

            {allInteractions.length === 0 && (
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

            {/* Pagination Controls */}
            {filteredCatalogInteractions.length > 0 && (
              <div className={cn(
                "mt-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl lg:rounded-3xl border shadow-sm",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mỗi trang:</span>
                  <select
                    value={catalogItemsPerPage}
                    onChange={(e) => {
                      setCatalogItemsPerPage(Number(e.target.value));
                      setCatalogPage(1);
                    }}
                    className={cn(
                      "text-[10px] font-bold py-1 px-2 rounded-md border appearance-none cursor-pointer outline-none transition-all",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 shadow-sm"
                    )}
                  >
                    {[10, 25, 50, 100].map((val, vIdx) => (
                      <option key={`page-size-opt-${val}-${vIdx}`} value={val}>{val}</option>
                    ))}
                  </select>
                  <span className={cn("text-[10px] font-bold ml-2", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Hiển thị {Math.min(filteredCatalogInteractions.length, (activeCatalogPage - 1) * catalogItemsPerPage + 1)} - {Math.min(activeCatalogPage * catalogItemsPerPage, filteredCatalogInteractions.length)} / {filteredCatalogInteractions.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar animate-fade-in">
                  <button
                    type="button"
                    disabled={activeCatalogPage === 1}
                    onClick={() => {
                      setCatalogPage(prev => Math.max(1, prev - 1));
                    }}
                    className={cn(
                      "p-1.5 lg:p-2 rounded-lg lg:rounded-xl border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                      isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-100 hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalCatalogPages }, (_, i) => i + 1).map((page, pIdx) => {
                      const shouldShow = page === 1 || page === totalCatalogPages || Math.abs(page - activeCatalogPage) <= 1;
                      const isBreak = page !== 1 && page !== totalCatalogPages && !shouldShow && (Math.abs(page - activeCatalogPage) === 2);

                      if (shouldShow) {
                        return (
                          <button
                            key={`cat-page-${page}-${pIdx}`}
                            type="button"
                            onClick={() => {
                              setCatalogPage(page);
                            }}
                            className={cn(
                              "w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl text-[10px] lg:text-sm font-black transition-all active:scale-90 flex items-center justify-center border",
                              activeCatalogPage === page
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : isDarkMode
                                  ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                  : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                            )}
                          >
                            {page}
                          </button>
                        );
                      } else if (isBreak) {
                        return <span key={`cat-break-${page}-${pIdx}`} className="text-slate-400 font-bold px-1">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={activeCatalogPage === totalCatalogPages}
                    onClick={() => {
                      setCatalogPage(prev => Math.min(totalCatalogPages, prev + 1));
                    }}
                    className={cn(
                      "p-2 rounded-xl border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                      isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-100 hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </motion.div>

      {/* Mobile Interaction Checker Drawer - Sliding in from right */}
      <AnimatePresence>
        {isMobile && showMobileCheckerDrawer && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className={cn(
              "fixed inset-0 z-50 flex flex-col transition-colors overflow-hidden",
              isDarkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
            )}
          >
            {/* Header of Mobile Drawer */}
            <div className={cn(
              "sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b shadow-sm backdrop-blur-md transition-colors",
              isDarkMode ? "bg-slate-900/95 border-slate-800 text-white" : "bg-white/95 border-slate-200 text-slate-900"
            )}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowMobileCheckerDrawer(false)}
                  className={cn(
                    "p-2 rounded-xl border transition-all active:scale-95 cursor-pointer",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                  )}
                  title="Quay lại"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">Kiểm tra tương tác</h3>
                    <p className="text-[10px] opacity-70">Phân tích tương tác đa thuốc</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMobileCheckerDrawer(false)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                )}
              >
                Đóng
              </button>
            </div>

            {/* Content of Mobile Drawer */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {renderCheckerFormAndResult(true)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    {INTERACTION_TYPES.map((type, typeIdx) => (
                      <button
                        key={`int-type-btn-${type}-${typeIdx}`}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type as any })}
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
                      <span key={`src-name-${name}-${idx}`} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center gap-2">
                        {name}
                        <button type="button" onClick={() => {
                          const newIds = [...(formData.sourceIds || [])];
                          const newNames = [...(formData.sourceNames || [])];
                          newIds.splice(idx, 1);
                          newNames.splice(idx, 1);
                          setFormData({ ...formData, sourceIds: newIds, sourceNames: newNames });
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
                            setFormData({ ...formData, targetId: '', targetName: '' });
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
                            .map((icd, idx) => (
                              <button
                                key={`${icd.id || icd.code || 'icd'}-${idx}`}
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
                      onChange={(e) => setFormData({ ...formData, targetName: e.target.value })}
                      placeholder="VD: Phụ nữ có thai, Trẻ em < 12 tuổi..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Trạng thái đặc biệt</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, contraindicated: !formData.contraindicated })}
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
                    ].map((s, sIdx) => (
                      <button
                        key={`sev-btn-${s.val}-${sIdx}`}
                        type="button"
                        onClick={() => setFormData({ ...formData, severity: s.val as any })}
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
                    onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
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
                    onChange={(e) => setFormData({ ...formData, recommendation: (e.target as HTMLTextAreaElement).value })}
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
