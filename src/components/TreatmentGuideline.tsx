import React, { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope,
  Search,
  BookOpen,
  Filter,
  Layers,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Clock,
  Printer,
  Copy,
  ExternalLink,
  Pill,
  ShieldAlert,
  Sparkles,
  Award,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  Share2,
  Bookmark,
  BookmarkCheck,
  Check,
  Info,
  CopyPlus,
  CloudUpload,
  RefreshCw,
  LayoutGrid,
  List,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from '../firebase';
import { TreatmentGroup, TreatmentGuideline as ITreatmentGuideline, ClinicalStep, DrugRegimenItem } from '../types';
import { DEFAULT_TREATMENT_GROUPS, INITIAL_TREATMENT_GUIDELINES, MATERIAL_DESIGN_COLORS } from '../lib/treatmentSeedData';
import { TreatmentGroupManagement, renderMedicalGroupIcon } from './TreatmentGroupManagement';
import { TreatmentGuidelineEditorModal } from './TreatmentGuidelineEditorModal';
import { TreatmentGuidelineDetailModal } from './TreatmentGuidelineDetailModal';
import { cn, sanitizeFirestoreData } from '../lib/utils';

interface TreatmentGuidelineProps {
  isDarkMode: boolean;
  currentUser?: any;
  mode?: 'view' | 'manage';
  initialTab?: 'guidelines' | 'groups';
  canManage?: boolean;
  onNavigateToDrug?: (drugName: string) => void;
  onNavigateToICD10?: (code: string) => void;
  onOpenGroupManagement?: () => void;
}

export const getDecisionNumber = (g: ITreatmentGuideline): string => {
  return g.decisionNumber || g.source?.documentNumber || 'Quyết định chuyên môn Bộ Y tế';
};

export const getEffectiveYear = (g: ITreatmentGuideline): string | number => {
  return g.effectiveYear || g.source?.issueYear || '';
};

export const getSourceUrl = (g: ITreatmentGuideline): string => {
  return g.sourceUrl || g.source?.officialUrl || '';
};

export const getAllDrugsFromGuideline = (g: ITreatmentGuideline): DrugRegimenItem[] => {
  if (g.regimens && g.regimens.length > 0) {
    return g.regimens.flatMap((r) => r.drugs || []);
  }
  if (g.drugRegimens && g.drugRegimens.length > 0) {
    return g.drugRegimens as any;
  }
  return [];
};

export const TreatmentGuideline: React.FC<TreatmentGuidelineProps> = ({
  isDarkMode,
  currentUser,
  mode = 'view',
  initialTab = 'guidelines',
  canManage = false,
  onNavigateToDrug,
  onNavigateToICD10,
  onOpenGroupManagement
}) => {
  const [activeTabSection, setActiveTabSection] = useState<'guidelines' | 'groups'>(initialTab || 'guidelines');
  const [groups, setGroups] = useState<TreatmentGroup[]>(DEFAULT_TREATMENT_GROUPS);
  const [guidelines, setGuidelines] = useState<ITreatmentGuideline[]>(INITIAL_TREATMENT_GUIDELINES);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Cho phép người dùng ẩn/hiện toàn bộ danh sách phác đồ điều trị
  const [isGuidelinesListHidden, setIsGuidelinesListHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hide_treatment_guidelines_list') === 'true';
    } catch {
      return false;
    }
  });

  // Tùy chọn cho quản trị viên xem các phác đồ đã bị ẩn
  const [showHiddenGuidelines, setShowHiddenGuidelines] = useState<boolean>(true);

  const toggleGuidelinesListVisibility = () => {
    setIsGuidelinesListHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hide_treatment_guidelines_list', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTabSection(initialTab);
    }
  }, [initialTab]);

  // Detail Modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingGuideline, setViewingGuideline] = useState<ITreatmentGuideline | null>(null);

  // Management & Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingGuideline, setEditingGuideline] = useState<ITreatmentGuideline | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMessage, setSeedSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('treatment_guidelines_favs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isPrivileged = mode === 'manage' || canManage || [
    'admin',
    'operator',
    'operator_doctor',
    'operator_pharmacist',
    'superadmin'
  ].includes(currentUser?.role);

  // Subscribe to treatment_groups and treatment_guidelines in Firestore
  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, 'treatment_groups'), (snap) => {
      if (!snap.empty) {
        const loaded: TreatmentGroup[] = [];
        snap.forEach((d) => loaded.push({ id: d.id, ...(d.data() as any) }));
        loaded.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setGroups(loaded);
      } else {
        setGroups(DEFAULT_TREATMENT_GROUPS);
      }
    }, (err) => {
      console.warn("Firestore treatment_groups:", err);
      setGroups(DEFAULT_TREATMENT_GROUPS);
    });

    const unsubGuides = onSnapshot(collection(db, 'treatment_guidelines'), (snap) => {
      try {
        const firestoreMap = new Map<string, ITreatmentGuideline>();
        const deletedIds = new Set<string>();

        snap.forEach((d) => {
          const data = d.data() as any;
          if (data._deleted) {
            deletedIds.add(d.id);
          } else {
            firestoreMap.set(d.id, { id: d.id, ...data });
          }
        });

        // Merge: start with initial guidelines that are not marked deleted
        const mergedList: ITreatmentGuideline[] = [];
        const handledIds = new Set<string>();

        INITIAL_TREATMENT_GUIDELINES.forEach((initGuide) => {
          if (deletedIds.has(initGuide.id)) {
            handledIds.add(initGuide.id);
            return;
          }
          if (firestoreMap.has(initGuide.id)) {
            mergedList.push(firestoreMap.get(initGuide.id)!);
          } else {
            mergedList.push(initGuide);
          }
          handledIds.add(initGuide.id);
        });

        // Add custom created guidelines from firestore
        firestoreMap.forEach((guide, id) => {
          if (!handledIds.has(id)) {
            mergedList.push(guide);
          }
        });

        // Sort by priority (e.g. critical first) or updatedAt
        mergedList.sort((a, b) => {
          if (a.severity === 'critical' && b.severity !== 'critical') return -1;
          if (b.severity === 'critical' && a.severity !== 'critical') return 1;
          return a.title.localeCompare(b.title, 'vi');
        });

        setGuidelines(mergedList);

        // Keep active viewing guideline updated if changed in Firestore
        setViewingGuideline((prev) => {
          if (!prev) return null;
          const updated = mergedList.find((g) => g.id === prev.id);
          return updated || prev;
        });
      } catch (e) {
        console.error("Lỗi khi đồng bộ treatment_guidelines:", e);
      }
    }, (err) => {
      console.warn("Firestore treatment_guidelines error:", err);
    });

    return () => {
      unsubGroups();
      unsubGuides();
    };
  }, []);

  // Sync / Seed initial guidelines to Firestore
  const handleSyncSeedToFirestore = async () => {
    if (!isPrivileged) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      for (const guide of INITIAL_TREATMENT_GUIDELINES) {
        const docRef = doc(db, 'treatment_guidelines', guide.id);
        const cleanData = sanitizeFirestoreData(guide);
        delete (cleanData as any)._deleted;
        batch.set(docRef, cleanData, { merge: true });
      }
      await batch.commit();
      setSeedSuccessMessage("Đã đồng bộ thành công 5 phác đồ mẫu chuẩn Bộ Y tế lên cơ sở dữ liệu Cloud!");
      setTimeout(() => setSeedSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Lỗi đồng bộ phác đồ mẫu:", err);
      alert("Lỗi khi đồng bộ: " + (err?.message || "Không xác định"));
    } finally {
      setIsSeeding(false);
    }
  };

  // Open Add Modal
  const handleAddNewGuideline = () => {
    setEditingGuideline(null);
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleEditGuideline = (guide: ITreatmentGuideline) => {
    setEditingGuideline(guide);
    setIsEditorOpen(true);
  };

  // Open Duplicate
  const handleDuplicateGuideline = (guide: ITreatmentGuideline) => {
    const duplicated: ITreatmentGuideline = {
      ...JSON.parse(JSON.stringify(guide)),
      id: `tg_custom_${Date.now()}`,
      title: `${guide.title} (Bản sao)`,
      updatedAt: new Date().toISOString()
    };
    setEditingGuideline(duplicated);
    setIsEditorOpen(true);
  };

  // Save Guideline to Firestore
  const handleSaveGuideline = async (saved: ITreatmentGuideline) => {
    try {
      const sanitized = sanitizeFirestoreData(saved);
      delete (sanitized as any)._deleted;
      await setDoc(doc(db, 'treatment_guidelines', saved.id), sanitized, { merge: true });
      setIsEditorOpen(false);
      setEditingGuideline(null);
      setViewingGuideline(saved);
      setSeedSuccessMessage(`Đã lưu thành công phác đồ "${saved.title}"`);
      setTimeout(() => setSeedSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error("Lỗi khi lưu hướng dẫn điều trị:", err);
      alert("Lỗi khi lưu: " + (err?.message || "Không thể lưu dữ liệu"));
    }
  };

  // Delete Guideline (soft delete if in seed data, else hard delete)
  const handleDeleteGuideline = async (idToDelete: string) => {
    try {
      const isInitial = INITIAL_TREATMENT_GUIDELINES.some((g) => g.id === idToDelete);
      if (isInitial) {
        await setDoc(doc(db, 'treatment_guidelines', idToDelete), { _deleted: true }, { merge: true });
      } else {
        await deleteDoc(doc(db, 'treatment_guidelines', idToDelete));
      }
      setDeleteConfirmId(null);
      if (viewingGuideline?.id === idToDelete) {
        setIsDetailOpen(false);
        setViewingGuideline(null);
      }
      setSeedSuccessMessage("Đã xóa phác đồ điều trị thành công.");
      setTimeout(() => setSeedSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Lỗi khi xóa hướng dẫn điều trị:", err);
      alert("Lỗi khi xóa: " + (err?.message || "Không thể xóa"));
    }
  };

  // Ẩn / Bỏ ẩn từng phác đồ điều trị riêng lẻ
  const handleToggleGuidelineHidden = async (guideline: ITreatmentGuideline, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const nextHidden = !guideline.isHidden;
      await setDoc(
        doc(db, 'treatment_guidelines', guideline.id),
        { isHidden: nextHidden, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSeedSuccessMessage(
        nextHidden
          ? `Đã ẩn phác đồ "${guideline.title}" khỏi danh sách người dùng`
          : `Đã hiện lại phác đồ "${guideline.title}"`
      );
      setTimeout(() => setSeedSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Lỗi khi cập nhật trạng thái ẩn của phác đồ:", err);
      alert("Lỗi: " + (err?.message || "Không thể thay đổi trạng thái"));
    }
  };

  // Filtered guidelines
  const filteredGuidelines = useMemo(() => {
    return guidelines.filter((g) => {
      // Ẩn phác đồ: người dùng thông thường không thấy phác đồ đã ẩn; quản trị viên có thể bật/tắt
      if (!isPrivileged && g.isHidden) {
        return false;
      }
      if (isPrivileged && !showHiddenGuidelines && g.isHidden) {
        return false;
      }

      // Group filter
      if (selectedGroupId !== 'all' && g.groupId !== selectedGroupId) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'all') {
        const hasSeverity = g.severity === selectedSeverity || (g.severityLevels && g.severityLevels.some(sl => sl.level.toLowerCase().includes(selectedSeverity.toLowerCase())));
        if (!hasSeverity) return false;
      }
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchICD = (g.icd10Codes || []).some((code) => code.toLowerCase().includes(q));
        const matchSummary = (g.summary || '').toLowerCase().includes(q);
        const allDrugs = getAllDrugsFromGuideline(g);
        const matchDrugs = allDrugs.some(
          (dr: any) =>
            (dr.drugName || '').toLowerCase().includes(q) ||
            (dr.activeIngredient || dr.genericName || '').toLowerCase().includes(q)
        );
        const matchKeywords = (g.keywords || []).some((k) => k.toLowerCase().includes(q));

        if (!matchTitle && !matchICD && !matchSummary && !matchDrugs && !matchKeywords) {
          return false;
        }
      }
      return true;
    });
  }, [guidelines, selectedGroupId, selectedSeverity, searchQuery, isPrivileged, showHiddenGuidelines]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('treatment_guidelines_favs', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const handleOpenDetail = (guideline: ITreatmentGuideline) => {
    setViewingGuideline(guideline);
    setIsDetailOpen(true);
  };

  const handleCopySummary = (guideline: ITreatmentGuideline, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const allDrugs = getAllDrugsFromGuideline(guideline);
    const goalsSummary = guideline.treatmentGoals
      ? guideline.treatmentGoals.map((g) => `${g.metric}: ${g.targetValue}`).join('; ')
      : Array.isArray(guideline.goals)
        ? guideline.goals.join('; ')
        : 'Xem chi tiết trong phác đồ';

    const text = `[HƯỚNG DẪN ĐIỀU TRỊ BỘ Y TẾ]
${guideline.title} (${guideline.icd10Codes?.join(', ') || ''})
Quyết định: ${getDecisionNumber(guideline)}
Đích điều trị: ${goalsSummary}
Phác đồ khuyến cáo:
${allDrugs.map((dr: any, idx) => `${idx + 1}. ${dr.drugName} (${dr.activeIngredient || dr.genericName || ''}) - Liều: ${dr.dosage}, Đường: ${dr.route}. Lưu ý: ${dr.clinicalNotes || dr.notes || 'Không'}`).join('\n')}
Cảnh báo đỏ: ${guideline.redFlags?.join('; ') || 'Theo dõi sát dấu hiệu sinh tồn'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(guideline.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Control Area */}
      <div
        className={cn(
          "p-5 sm:p-7 rounded-[28px] border transition-all shadow-sm",
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Stethoscope size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                  Hướng dẫn điều trị (Bộ Y tế)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Chuẩn Quốc gia
                </span>
                {mode === 'manage' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Chế độ Quản lý
                  </span>
                )}
              </div>
              <p className={cn("text-xs sm:text-sm mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Tra cứu phác đồ điều trị, phác đồ dùng thuốc, sơ đồ xử trí lâm sàng & tiêu chuẩn chẩn đoán chính thống
              </p>
            </div>
          </div>

          {/* Action Buttons: Add Guideline, Seed */}
          <div className="flex items-center gap-2 flex-wrap">
            {isPrivileged && activeTabSection === 'guidelines' && (
              <>
                <button
                  type="button"
                  onClick={handleAddNewGuideline}
                  className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Thêm phác đồ mới</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncSeedToFirestore}
                  disabled={isSeeding}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer",
                    isDarkMode
                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  )}
                  title="Đồng bộ 5 phác đồ mẫu chuẩn Bộ Y tế lên cơ sở dữ liệu Cloud Firestore"
                >
                  <CloudUpload size={14} className={isSeeding ? "animate-spin text-blue-500" : "text-blue-500"} />
                  <span>{isSeeding ? "Đang đồng bộ..." : "Đồng bộ mẫu lên Cloud"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Unified Sub-Tabs: Phác đồ điều trị vs Nhóm điều trị */}
        <div className={cn(
          "mt-6 pt-5 border-t flex flex-wrap items-center justify-between gap-3",
          isDarkMode ? "border-slate-800" : "border-slate-100"
        )}>
          <div className={cn(
            "flex items-center gap-1.5 p-1 rounded-2xl border backdrop-blur-md",
            isDarkMode ? "bg-slate-800/60 border-slate-700/80" : "bg-slate-100/90 border-slate-200/80"
          )}>
            <button
              type="button"
              onClick={() => setActiveTabSection('guidelines')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTabSection === 'guidelines'
                  ? (isDarkMode ? "bg-white text-slate-900 shadow-md" : "bg-white text-blue-600 shadow-sm")
                  : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
              )}
            >
              <BookOpen size={15} />
              <span>Phác đồ điều trị ({guidelines.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabSection('groups')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTabSection === 'groups'
                  ? (isDarkMode ? "bg-white text-slate-900 shadow-md" : "bg-white text-blue-600 shadow-sm")
                  : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
              )}
            >
              <Layers size={15} />
              <span>Nhóm điều trị ({groups.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeTabSection === 'guidelines' && (
              <button
                type="button"
                onClick={toggleGuidelinesListVisibility}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                  isGuidelinesListHidden
                    ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-amber-500/20"
                    : isDarkMode
                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                )}
                title={isGuidelinesListHidden ? "Bấm để hiện lại danh sách phác đồ điều trị" : "Bấm để ẩn danh sách phác đồ điều trị"}
              >
                {isGuidelinesListHidden ? <Eye size={14} /> : <EyeOff size={14} className="text-amber-500" />}
                <span>{isGuidelinesListHidden ? "Hiện danh sách phác đồ" : "Ẩn danh sách phác đồ"}</span>
              </button>
            )}

            {activeTabSection === 'guidelines' ? (
              <button
                type="button"
                onClick={() => setActiveTabSection('groups')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                  isDarkMode
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                )}
              >
                <Layers size={14} className="text-emerald-500" />
                <span>Quản lý Nhóm điều trị</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTabSection('guidelines')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                  isDarkMode
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                )}
              >
                <BookOpen size={14} className="text-blue-500" />
                <span>Xem danh sách Phác đồ</span>
              </button>
            )}
          </div>
        </div>

        {/* Success / Info Message */}
        {seedSuccessMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{seedSuccessMessage}</span>
          </div>
        )}

        {/* Search Bar & Filter Controls (Only shown for Guidelines tab) */}
        {activeTabSection === 'guidelines' && (
          <>
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 lg:col-span-9 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm theo tên bệnh, mã ICD-10 (I10, E11...), tên thuốc (Adrenalin, Metformin...), hoạt chất..."
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all focus:ring-2 focus:ring-blue-500",
                    isDarkMode ? "bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                  )}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <div className="sm:col-span-4 lg:col-span-3 flex items-center gap-2">
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                >
                  <option value="all">Tất cả mức độ</option>
                  <option value="mild">Mức độ Nhẹ / Độ 1</option>
                  <option value="moderate">Mức độ Trung bình / Độ 2</option>
                  <option value="severe">Mức độ Nặng / Độ 3</option>
                  <option value="critical">Cấp cứu / Khẩn cấp</option>
                </select>
              </div>
            </div>

            {/* Group Selector Pills (Material Design Styled) */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedGroupId('all')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer",
                  selectedGroupId === 'all'
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                    : isDarkMode
                      ? "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <BookOpen size={14} />
                <span>Tất cả nhóm ({guidelines.length})</span>
              </button>

              {groups.map((grp) => {
                const isSelected = selectedGroupId === grp.id;
                const count = guidelines.filter((g) => g.groupId === grp.id).length;
                const grpColor = grp.color || '#2196F3';

                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setSelectedGroupId(grp.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer",
                      isSelected
                        ? "text-white shadow-sm"
                        : isDarkMode
                          ? "bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: grpColor, borderColor: grpColor }
                        : { borderColor: isSelected ? grpColor : undefined }
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#FFFFFF' : grpColor }}
                    />
                    {renderMedicalGroupIcon(grp.icon, 13)}
                    <span>{grp.name}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1 rounded-full",
                        isSelected ? "bg-white/20 text-white" : "bg-slate-500/10 text-slate-400"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      {activeTabSection === 'groups' ? (
        <div className={cn(
          "p-4 sm:p-7 rounded-[28px] border shadow-sm transition-all",
          isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
        )}>
          <TreatmentGroupManagement
            isDarkMode={isDarkMode}
            onSelectGroupForFilter={(groupId) => {
              setSelectedGroupId(groupId);
              setActiveTabSection('guidelines');
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
        {/* List Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-black uppercase tracking-wider", isDarkMode ? "text-slate-300" : "text-slate-800")}>
              Danh sách phác đồ điều trị
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {filteredGuidelines.length} phác đồ
            </span>
            {searchQuery && (
              <span className="text-xs text-blue-500 font-bold ml-1">
                (kết quả cho "{searchQuery}")
              </span>
            )}
            {isGuidelinesListHidden && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <EyeOff size={11} />
                <span>Đang ẩn</span>
              </span>
            )}
          </div>

          {/* Controls: Admin toggle hidden items, Hide/Show list, and View mode */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {isPrivileged && (
              <label className={cn(
                "px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors select-none",
                showHiddenGuidelines
                  ? (isDarkMode ? "bg-slate-800/80 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700")
                  : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-400")
              )}>
                <input
                  type="checkbox"
                  checked={showHiddenGuidelines}
                  onChange={(e) => setShowHiddenGuidelines(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Xem mục đã ẩn</span>
              </label>
            )}

            <button
              type="button"
              onClick={toggleGuidelinesListVisibility}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs",
                isGuidelinesListHidden
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20"
                  : isDarkMode
                    ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
              title={isGuidelinesListHidden ? "Hiện lại danh sách phác đồ" : "Ẩn danh sách phác đồ"}
            >
              {isGuidelinesListHidden ? <Eye size={14} /> : <EyeOff size={14} className="text-amber-500" />}
              <span>{isGuidelinesListHidden ? "Hiện danh sách" : "Ẩn danh sách"}</span>
            </button>

            {!isGuidelinesListHidden && (
              <div className={cn(
                "p-1 rounded-xl border flex items-center gap-1",
                isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"
              )}>
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  className={cn(
                    "p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer",
                    viewLayout === 'grid'
                      ? "bg-blue-600 text-white shadow-2xs"
                      : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Xem dạng thẻ (Grid)"
                >
                  <LayoutGrid size={15} />
                  <span className="text-[11px] font-black hidden md:inline">Lưới thẻ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewLayout('list')}
                  className={cn(
                    "p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer",
                    viewLayout === 'list'
                      ? "bg-blue-600 text-white shadow-2xs"
                      : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Xem dạng danh sách gọn (List)"
                >
                  <List size={15} />
                  <span className="text-[11px] font-black hidden md:inline">Thu gọn</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* State 1: Danh sách phác đồ đang bị ẩn hoàn toàn */}
        {isGuidelinesListHidden ? (
          <div className={cn(
            "p-8 sm:p-12 rounded-[28px] border text-center space-y-4 shadow-sm transition-all",
            isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200/90"
          )}>
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm",
              isDarkMode ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200"
            )}>
              <EyeOff size={26} />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className={cn("text-base font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                Danh sách phác đồ điều trị đang ở chế độ ẩn
              </h3>
              <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Toàn bộ danh sách {filteredGuidelines.length} phác đồ điều trị đã được tạm ẩn theo cài đặt của bạn. Bấm nút bên dưới để hiển thị lại danh sách hoặc chuyển sang quản lý nhóm.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setIsGuidelinesListHidden(false);
                  try {
                    localStorage.setItem('hide_treatment_guidelines_list', 'false');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Eye size={15} />
                <span>Hiện danh sách phác đồ ({filteredGuidelines.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabSection('groups')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold border inline-flex items-center gap-2 transition-all cursor-pointer",
                  isDarkMode
                    ? "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                )}
              >
                <Layers size={15} className="text-emerald-500" />
                <span>Chuyển sang Quản lý Nhóm điều trị</span>
              </button>
            </div>
          </div>
        ) : filteredGuidelines.length === 0 ? (
          <div
            className={cn(
              "p-12 rounded-[28px] border text-center space-y-4 shadow-sm",
              isDarkMode ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"
            )}
          >
            <div className="w-16 h-16 rounded-3xl bg-slate-500/10 flex items-center justify-center mx-auto text-slate-400">
              <FileText size={32} />
            </div>
            <div>
              <h3 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                Không tìm thấy phác đồ điều trị phù hợp
              </h3>
              <p className="text-xs max-w-md mx-auto mt-1">
                Không có phác đồ nào khớp với từ khóa "{searchQuery}" hoặc bộ lọc nhóm/mức độ hiện tại.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGroupId('all');
                setSelectedSeverity('all');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
            >
              Xóa bộ lọc & Hiển thị tất cả
            </button>
          </div>
        ) : viewLayout === 'grid' ? (
          /* CARD GRID VIEW (3 columns responsive) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGuidelines.map((guideline) => {
              const grp = groups.find((g) => g.id === guideline.groupId);
              const grpColor = grp?.color || '#2196F3';
              const isFav = favorites.includes(guideline.id);
              const allDrugs = getAllDrugsFromGuideline(guideline);
              const stepsCount = guideline.flowchartSteps?.length || 0;
              const hasRedFlags = guideline.redFlags && guideline.redFlags.length > 0;

              return (
                <div
                  key={guideline.id}
                  onClick={() => handleOpenDetail(guideline)}
                  className={cn(
                    "p-5 rounded-[24px] border transition-all duration-200 cursor-pointer relative overflow-hidden group flex flex-col justify-between hover:shadow-xl hover:-translate-y-0.5",
                    isDarkMode
                      ? "bg-slate-900/80 border-slate-800 hover:border-blue-500/60 hover:bg-slate-900"
                      : "bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-blue-500/5"
                  )}
                >
                  {/* Color top/left accent */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                    style={{ backgroundColor: grpColor }}
                  />

                  <div className="pl-1.5 space-y-3">
                    {/* Top row: Group pill, severity badge, bookmark */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase flex items-center gap-1"
                          style={{
                            backgroundColor: `${grpColor}15`,
                            color: grpColor
                          }}
                        >
                          {renderMedicalGroupIcon(grp?.icon, 11)}
                          <span>{grp?.name || 'Bộ Y tế'}</span>
                        </span>

                        {guideline.severity === 'critical' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wider">
                            Cấp cứu
                          </span>
                        )}

                        {guideline.isHidden && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
                            <EyeOff size={11} />
                            <span>Đã ẩn</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(guideline.id, e)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isFav ? "text-amber-500 bg-amber-500/10" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                          title={isFav ? "Bỏ lưu yêu thích" : "Lưu yêu thích"}
                        >
                          {isFav ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Guideline Title */}
                    <div>
                      <h3
                        className={cn(
                          "text-base font-black leading-snug group-hover:text-blue-600 transition-colors line-clamp-2",
                          isDarkMode ? "text-white" : "text-slate-900"
                        )}
                      >
                        {guideline.title}
                      </h3>
                    </div>

                    {/* Decision Number & ICD-10 */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      {getDecisionNumber(guideline) && (
                        <span className={cn(
                          "text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1",
                          isDarkMode ? "border-slate-800 bg-slate-800/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                        )}>
                          <Award size={11} className="text-amber-500" />
                          <span className="truncate max-w-[140px]">{getDecisionNumber(guideline)}</span>
                        </span>
                      )}

                      {guideline.icd10Codes?.slice(0, 3).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToICD10?.(code);
                          }}
                          className={cn(
                            "text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md border transition-colors hover:border-blue-400 hover:text-blue-500",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                          )}
                          title="Bấm để tra cứu mã ICD-10 này"
                        >
                          {code}
                        </button>
                      ))}
                    </div>

                    {/* Summary text */}
                    {guideline.summary && (
                      <p className={cn("text-xs line-clamp-2 leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        {guideline.summary}
                      </p>
                    )}

                    {/* Quick clinical facts */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1",
                        isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                      )}>
                        <Clock size={11} className="text-blue-500" />
                        <span>{stepsCount} bước xử trí</span>
                      </span>

                      <span className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1",
                        isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                      )}>
                        <Pill size={11} className="text-emerald-500" />
                        <span>{allDrugs.length} thuốc</span>
                      </span>

                      {hasRedFlags && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle size={10} />
                          <span>Cảnh báo đỏ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 pl-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(guideline);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white transition-all flex items-center gap-1.5 font-black uppercase tracking-wider"
                    >
                      <Eye size={13} />
                      <span>Xem chi tiết</span>
                      <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopySummary(guideline, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Sao chép tóm tắt"
                      >
                        {copiedId === guideline.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>

                      {isPrivileged && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleToggleGuidelineHidden(guideline, e)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              guideline.isHidden
                                ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                : "text-slate-400 hover:text-amber-500 hover:bg-amber-500/10"
                            )}
                            title={guideline.isHidden ? "Bỏ ẩn phác đồ này (hiện lại)" : "Ẩn phác đồ này"}
                          >
                            {guideline.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGuideline(guideline);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
                            title="Chỉnh sửa phác đồ này"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateGuideline(guideline);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            title="Nhân bản phác đồ này"
                          >
                            <CopyPlus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(guideline.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="Xóa phác đồ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* COMPACT LIST VIEW */
          <div className="space-y-3">
            {filteredGuidelines.map((guideline) => {
              const grp = groups.find((g) => g.id === guideline.groupId);
              const grpColor = grp?.color || '#2196F3';
              const isFav = favorites.includes(guideline.id);
              const allDrugs = getAllDrugsFromGuideline(guideline);

              return (
                <div
                  key={guideline.id}
                  onClick={() => handleOpenDetail(guideline)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all duration-150 cursor-pointer relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between gap-3 hover:shadow-md",
                    isDarkMode
                      ? "bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
                      : "bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/20"
                  )}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: grpColor }}
                  />

                  <div className="pl-2 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase"
                        style={{
                          backgroundColor: `${grpColor}20`,
                          color: grpColor
                        }}
                      >
                        {grp?.name || 'Bộ Y tế'}
                      </span>

                      {guideline.severity === 'critical' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase">
                          Cấp cứu
                        </span>
                      )}

                      {guideline.isHidden && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase flex items-center gap-1">
                          <EyeOff size={10} />
                          <span>Đã ẩn</span>
                        </span>
                      )}

                      {getDecisionNumber(guideline) && (
                        <span className="text-[11px] font-bold text-slate-400">
                          {getDecisionNumber(guideline)}
                        </span>
                      )}
                    </div>

                    <h3
                      className={cn(
                        "text-base font-black group-hover:text-blue-600 transition-colors",
                        isDarkMode ? "text-white" : "text-slate-900"
                      )}
                    >
                      {guideline.title}
                    </h3>

                    {guideline.summary && (
                      <p className={cn("text-xs line-clamp-1 text-slate-500 dark:text-slate-400")}>
                        {guideline.summary}
                      </p>
                    )}
                  </div>

                  {/* Middle ICD-10 & Regimen details */}
                  <div className="flex items-center gap-2 flex-wrap pl-2 md:pl-0">
                    {guideline.icd10Codes?.map((code) => (
                      <span
                        key={code}
                        className={cn(
                          "text-[10px] font-mono font-black px-2 py-0.5 rounded border",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                        )}
                      >
                        {code}
                      </span>
                    ))}
                    <span className="text-xs text-slate-400 font-bold px-1">
                      {allDrugs.length} thuốc
                    </span>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center pl-2 md:pl-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(guideline);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Eye size={13} />
                      <span>Xem chi tiết</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(guideline.id, e)}
                      className={cn(
                        "p-2 rounded-xl border transition-colors",
                        isFav
                          ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
                          : isDarkMode
                            ? "border-slate-800 text-slate-400 hover:text-slate-200"
                            : "border-slate-200 text-slate-500 hover:text-slate-800"
                      )}
                      title={isFav ? "Bỏ lưu yêu thích" : "Lưu yêu thích"}
                    >
                      {isFav ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    </button>

                    {isPrivileged && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleGuidelineHidden(guideline, e)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            guideline.isHidden
                              ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                              : "text-slate-400 hover:text-amber-500 hover:bg-amber-500/10"
                          )}
                          title={guideline.isHidden ? "Bỏ ẩn phác đồ này (hiện lại)" : "Ẩn phác đồ này"}
                        >
                          {guideline.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditGuideline(guideline);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
                          title="Chỉnh sửa phác đồ"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(guideline.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          title="Xóa phác đồ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Treatment Guideline Detail Modal Window */}
      <TreatmentGuidelineDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        guideline={viewingGuideline}
        guidelines={filteredGuidelines}
        onSelectGuideline={(g) => setViewingGuideline(g)}
        groups={groups}
        isDarkMode={isDarkMode}
        isPrivileged={isPrivileged}
        onEdit={(g) => handleEditGuideline(g)}
        onDuplicate={(g) => handleDuplicateGuideline(g)}
        onDelete={(id) => setDeleteConfirmId(id)}
        onNavigateToDrug={onNavigateToDrug}
        onNavigateToICD10={onNavigateToICD10}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={cn(
            "w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 animate-in fade-in zoom-in-95",
            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-black">Xác nhận xóa Hướng dẫn điều trị?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Phác đồ này sẽ bị xóa khỏi danh sách. Bạn có thể khôi phục lại bất kỳ lúc nào bằng nút "Đồng bộ mẫu lên Cloud".
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold border transition-colors",
                  isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                )}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGuideline(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Guideline Editor Modal */}
      <TreatmentGuidelineEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingGuideline(null);
        }}
        onSave={handleSaveGuideline}
        guideline={editingGuideline}
        groups={groups}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
