import React, { useState, useEffect } from "react";
import {
  X,
  Edit,
  Pill,
  ShieldAlert,
  AlertTriangle,
  Info,
  BookOpen,
  Activity,
  Clock,
  UserCheck,
  Zap,
  Star,
  ThumbsUp,
  FileText,
  RefreshCw,
  Calendar,
  Heart,
  Baby,
  Car,
  AlertCircle,
  ExternalLink,
  Briefcase,
  Lock,
  Pause,
  Sparkles,
  Sun,
  Sunset,
  Sunrise,
  Moon,
  Hash,
  Check,
  FolderTree,
  ClipboardList,
  Flame,
  Link2,
  Copy,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Drug, ICD10, Ingredient } from "../types";
import { subscribeICD10 } from "../lib/icdStore";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import {
  db,
  collection,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  query,
  orderBy,
} from "../firebase";

const isIngredientMatch = (
  ing1?: string,
  ing2?: string,
  list: Ingredient[] = [],
) => {
  if (!ing1 || !ing2) return false;
  if (ing1 === ing2) return true;
  const i1 = ing1.toLowerCase().trim();
  const i2 = ing2.toLowerCase().trim();
  if (i1 === i2 || i1.includes(i2) || i2.includes(i1)) return true;

  // Check from list
  const ai1 = list.find((ai) => ai.name && ai.name.toLowerCase() === i1);
  if (ai1) {
    if (ai1.alias && i2.includes(ai1.alias.toLowerCase())) return true;
    if (
      ai1.aliases &&
      ai1.aliases.some((alias) => alias && i2.includes(alias.toLowerCase()))
    )
      return true;
  }
  const ai2 = list.find((ai) => ai.name && ai.name.toLowerCase() === i2);
  if (ai2) {
    if (ai2.alias && i1.includes(ai2.alias.toLowerCase())) return true;
    if (
      ai2.aliases &&
      ai2.aliases.some((alias) => alias && i1.includes(alias.toLowerCase()))
    )
      return true;
  }
  return false;
};

interface DrugDetailModalProps {
  drug: Drug | null;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  userPowerPoints?: number;
  canSeeIcdSuggestions?: boolean;
  canSeeCommonIndications?: boolean;
  canSeeDosageSuggestions?: boolean;
  canSeePrecautionType?: boolean;
  canSeePrecautionSeverity?: boolean;
  canSeePregnancyTrimesters?: boolean;
  canSeeQuickSelectTags?: boolean;
  canSeeIntakeTime?: boolean;
  canSeeAgeContraindications?: boolean;
  canSeeInteractionSuggestions?: boolean;
  onEdit?: (drug: Drug) => void;
  drugGroups?: import('../types').DrugGroup[];
}

const DrugDetailModal: React.FC<DrugDetailModalProps> = ({
  drug: propDrug,
  isOpen,
  onClose,
  isDarkMode,
  userPowerPoints = 0,
  canSeeIcdSuggestions = true,
  canSeeCommonIndications = true,
  canSeeDosageSuggestions = true,
  canSeePrecautionType = true,
  canSeePrecautionSeverity = true,
  canSeePregnancyTrimesters = true,
  canSeeQuickSelectTags = true,
  canSeeIntakeTime = true,
  canSeeAgeContraindications: propCanSeeAgeContraindications,
  canSeeInteractionSuggestions = true,
  onEdit,
  drugGroups = [],
}) => {
  const canSeeAgeContraindications =
    propCanSeeAgeContraindications !== undefined
      ? propCanSeeAgeContraindications
      : userPowerPoints >= 5;
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const [activeDetailTab, setActiveDetailTab] = useState<
    | "indications"
    | "contraindications"
    | "dosage"
    | "interactions"
    | "warnings"
    | "side_effects"
    | "info"
    | "pharmacology"
  >("info");
  const [direction, setDirection] = useState(0);

  const renderIcdRules = (icdObj: any) => {
    if (!icdObj) return null;
    const rules = [
      {
        active: !!icdObj.isAppendixA2,
        label: "24",
        bgClass: "bg-indigo-500",
        desc: "Không là bệnh chính",
        iconClass: "text-indigo-400",
        isWarning: false
      },
      {
        active: !!icdObj.isAppendixA3,
        label: "25",
        bgClass: "bg-amber-500",
        desc: "Không khuyến khích là bệnh chính",
        iconClass: "text-amber-400",
        isWarning: false
      },
      {
        active: !!icdObj.isRestricted,
        label: "26",
        bgClass: "bg-rose-500",
        desc: "Mã không được sử dụng",
        iconClass: "text-rose-400",
        isWarning: true
      },
      {
        active: !!icdObj.isAppendixA4,
        label: "27",
        bgClass: "bg-blue-500",
        desc: "Chỉ dùng mã hóa nguyên nhân tử vong",
        iconClass: "text-blue-400",
        isWarning: false
      },
      {
        active: !!icdObj.isAppendixA5,
        label: "28",
        bgClass: "bg-pink-500",
        desc: "Mã bệnh ở nữ giới",
        iconClass: "text-pink-400",
        isWarning: false
      },
      {
        active: !!icdObj.isAppendixA6,
        label: "29",
        bgClass: "bg-cyan-500",
        desc: "Mã bệnh ở nam giới",
        iconClass: "text-cyan-400",
        isWarning: false
      },
      {
        active: !!icdObj.isTT26,
        label: "TT26",
        bgClass: "bg-fuchsia-500",
        desc: "Bệnh, nhóm bệnh được áp dụng kê đơn thuốc ngoại trú trên 30 ngày",
        iconClass: "text-fuchsia-400",
        isWarning: false
      }
    ];

    const activeRules = rules.filter(r => r.active);
    if (activeRules.length === 0) return null;

    return (
      <div className="flex gap-0.5 items-center">
        {activeRules.map((rule, rIdx) => (
          <div key={rIdx} className="relative group/badge inline-block">
            <span
              className={cn(
                "shrink-0 px-1 py-0.5 rounded text-white text-[7px] font-black uppercase tracking-tighter cursor-help transition-all group-hover/badge:scale-110",
                rule.bgClass
              )}
            >
              {rule.label}
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-[200px] sm:max-w-[250px] px-2.5 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all duration-200 translate-y-1 group-hover/badge:translate-y-0 z-[100] pointer-events-none border border-slate-700/50 flex items-center gap-1.5 whitespace-normal leading-normal">
              {rule.isWarning ? (
                <AlertTriangle size={10} className={rule.iconClass} />
              ) : (
                <Info size={10} className={rule.iconClass} />
              )}
              <span>{rule.desc}</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const [icdList, setIcdList] = useState<ICD10[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [adrCatalog, setAdrCatalog] = useState<any[]>([]);
  const [expandedAdr, setExpandedAdr] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [selectedInteractionIngredient, setSelectedInteractionIngredient] =
    useState<string>("all");
  const [selectedSideEffectIngredient, setSelectedSideEffectIngredient] =
    useState<string>("all");
  const [dosageDisplayMode, setDosageDisplayMode] = useState<
    "quantity" | "dosage" | "weight"
  >("quantity");

  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const [activeDrug, setActiveDrug] = useState<Drug | null>(propDrug);
  const [allDrugs, setAllDrugs] = useState<Drug[]>([]);

  useEffect(() => {
    setActiveDrug(propDrug);
  }, [propDrug]);

  const [activeCopyTag, setActiveCopyTag] = useState<{
    id: string;
    code: string;
    desc: string;
    fullName: string;
    isDouble?: boolean;
    dCode?: string;
    dDesc?: string;
    aCode?: string;
    aDesc?: string;
  } | null>(null);

  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopyText = (text: string, type: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedType(type);
          setTimeout(() => {
            setCopiedType(null);
          }, 1500);
        })
        .catch(() => {
          fallbackCopyText(text, type);
        });
    } else {
      fallbackCopyText(text, type);
    }
  };

  const fallbackCopyText = (text: string, type: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedType(type);
      setTimeout(() => {
        setCopiedType(null);
      }, 1500);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeIcd = subscribeICD10((list) => {
      setIcdList(list);
    });

    const qIngredients = query(collection(db, "ingredients"), orderBy("name"));
    const unsubscribeIngredients = onSnapshot(
      qIngredients,
      (snapshot) => {
        setIngredients(snapshot.docs.map((doc) => doc.data() as Ingredient));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "ingredients");
      },
    );

    const unsubscribeAdrCatalog = onSnapshot(
      collection(db, "adr_catalog"),
      (snapshot) => {
        setAdrCatalog(snapshot.docs.map((doc) => doc.data()));
      },
      (error) => {
        console.warn("Could not load adr_catalog from Firestore inside DrugDetailModal:", error.message);
      },
    );

    const qDrugs = query(collection(db, "drugs"), orderBy("name"));
    const unsubscribeDrugs = onSnapshot(
      qDrugs,
      (snapshot) => {
        setAllDrugs(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Drug))
        );
      },
      (error) => {
        console.warn("Could not load drugs inside DrugDetailModal:", error);
      }
    );

    return () => {
      unsubscribeIcd();
      unsubscribeIngredients();
      unsubscribeAdrCatalog();
      unsubscribeDrugs();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset tab to 'info' when modal opens or drug changes
  useEffect(() => {
    if (isOpen) {
      setActiveDetailTab("info");
      setSelectedInteractionIngredient("all");
      setSelectedSideEffectIngredient("all");
      setShowPdfPreview(false);
      setIsFullScreen(false);
    }
  }, [isOpen, propDrug]);

  // Use ref for onClose to avoid effect re-runs when parent re-renders
  const onCloseRef = React.useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle mobile back button
  useEffect(() => {
    if (!isOpen) return;

    const modalHash = "#drug-detail";

    // Only push if we're not already on this hash (prevents double push)
    if (window.location.hash !== modalHash) {
      window.history.pushState({ modal: "drug-detail" }, "", modalHash);
    }

    const handlePopState = () => {
      // If the hash is no longer #drug-detail, it means back was pressed
      if (window.location.hash !== modalHash) {
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Clean up hash if closed via X button or Esc instead of back button
      // We use a small check to ensure we only go back if the modal is actually closing
      if (!isOpen && window.location.hash === modalHash) {
        // This part is tricky because isOpen is from closure.
        // But if this effect is cleaning up because isOpen changed to false, it works.
      }
    };
  }, [isOpen]);

  // Separate cleanup effect for the hash when closing
  useEffect(() => {
    if (!isOpen && window.location.hash === "#drug-detail") {
      window.history.back();
    }
  }, [isOpen]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const drugMatchesCode = (d: Drug, targetCode: string): boolean => {
    if (!targetCode || !d) return false;
    const tc = targetCode.trim().toUpperCase();
    const anyD = d as any;

    if (anyD.indications && Array.isArray(anyD.indications)) {
      for (const ind of anyD.indications) {
        if (ind.icd10s && Array.isArray(ind.icd10s)) {
          for (const str of ind.icd10s) {
            if (typeof str === "string") {
              const codePart = str.split(" - ")[0].trim().toUpperCase();
              if (codePart === tc) return true;
            }
          }
        }
        if (ind.doubleIcd10s && Array.isArray(ind.doubleIcd10s)) {
          for (const pair of ind.doubleIcd10s) {
            const dCodePart = (pair.dagger || "").split(" - ")[0].trim().toUpperCase();
            const aCodePart = (pair.asterisk || "").split(" - ")[0].trim().toUpperCase();
            if (dCodePart === tc || aCodePart === tc) return true;
          }
        }
      }
    }

    if (anyD.icd10List && Array.isArray(anyD.icd10List)) {
      for (const item of anyD.icd10List) {
        const codePart = typeof item === "string"
          ? item.split(" - ")[0].trim().toUpperCase()
          : item.code?.toUpperCase();
        if (codePart && codePart === tc) return true;
      }
    }

    if (anyD.icd10Pairs && Array.isArray(anyD.icd10Pairs)) {
      for (const pair of anyD.icd10Pairs) {
        const dCodePart = (pair.dagger || "").split(" - ")[0].trim().toUpperCase();
        const aCodePart = (pair.asterisk || "").split(" - ")[0].trim().toUpperCase();
        if (dCodePart === tc || aCodePart === tc) return true;
      }
    }

    if (anyD.icd10 && typeof anyD.icd10 === "string") {
      if (anyD.icd10.toUpperCase().includes(tc)) return true;
    }

    if (anyD.dosageAndAdministration && Array.isArray(anyD.dosageAndAdministration)) {
      for (const item of anyD.dosageAndAdministration) {
        if (item.icd10s && Array.isArray(item.icd10s)) {
          for (const str of item.icd10s) {
            if (typeof str === "string") {
              const codePart = str.split(" - ")[0].trim().toUpperCase();
              if (codePart === tc) return true;
            }
          }
        }
        if (item.icd10 && typeof item.icd10 === "string") {
          if (item.icd10.toUpperCase().includes(tc)) return true;
        }
      }
    }

    return false;
  };

  const getMatchingDrugsForTag = (
    tag: {
      code: string;
      isDouble?: boolean;
      dCode?: string;
      aCode?: string;
    } | null,
    currentDrugId?: string,
    drugsList: Drug[] = []
  ): Drug[] => {
    if (!tag || !drugsList || drugsList.length === 0) return [];

    const targetCodes: string[] = [];
    if (tag.isDouble) {
      if (tag.dCode) targetCodes.push(tag.dCode.trim().toUpperCase());
      if (tag.aCode) targetCodes.push(tag.aCode.trim().toUpperCase());
    } else if (tag.code) {
      const parts = tag.code.split("+").map((s) => s.trim().toUpperCase()).filter(Boolean);
      targetCodes.push(...parts);
    }

    if (targetCodes.length === 0) return [];

    return drugsList.filter((d) => {
      if (d.id && currentDrugId && d.id === currentDrugId) return false;
      if (d.name && (activeDrug || drug)?.name && d.name.trim().toLowerCase() === (activeDrug || drug)!.name.trim().toLowerCase()) return false;

      for (const codeToCheck of targetCodes) {
        if (drugMatchesCode(d, codeToCheck)) return true;
      }
      return false;
    });
  };

  const currentDrugObj = activeDrug || propDrug;
  if (!currentDrugObj) return null;
  const drug = currentDrugObj;

  const otherDrugsWithIcd = activeCopyTag
    ? getMatchingDrugsForTag(activeCopyTag, drug.id, allDrugs)
    : [];

  const detailTabs = [
    { id: "info", label: "Thông tin", icon: <UserCheck size={14} /> },
    { id: "indications", label: "Chỉ định", icon: <ClipboardList size={14} /> },
    { id: "dosage", label: "Liều lượng", icon: <Clock size={14} /> },
    {
      id: "contraindications",
      label: "Chống chỉ định",
      icon: <ShieldAlert size={14} />,
    },
    { id: "warnings", label: "Cảnh báo", icon: <AlertTriangle size={14} /> },
    { id: "interactions", label: "Tương tác", icon: <RefreshCw size={14} /> },
    {
      id: "side_effects",
      label: isMobile ? "ADR" : "Tác dụng phụ",
      icon: <Flame size={14} />,
    },
    { id: "pharmacology", label: "Dược lý", icon: <BookOpen size={14} /> },
  ];

  const currentIndex = detailTabs.findIndex((t) => t.id === activeDetailTab);

  const paginate = (newDirection: number) => {
    const newIndex = currentIndex + newDirection;
    if (newIndex >= 0 && newIndex < detailTabs.length) {
      setDirection(newDirection);
      setActiveDetailTab(detailTabs[newIndex].id as any);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.98,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[190] flex items-center justify-center transition-all duration-300",
            isFullScreen ? "p-0" : "p-0 lg:p-8 xl:p-12"
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            className={cn(
              "relative w-full h-full flex flex-row transition-all duration-300 overflow-hidden shadow-2xl",
              isFullScreen
                ? "lg:w-full lg:max-w-none lg:h-full lg:rounded-none border-none"
                : "lg:w-[92vw] lg:max-w-7xl lg:h-[88vh] lg:rounded-2xl border-t lg:border border-white/10",
              isDarkMode
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-900",
            )}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.08,
                duration: 0.2,
                ease: "easeOut",
              }}
              className={cn(
                "h-full flex flex-col overflow-hidden shrink-0 transition-all duration-300",
                showPdfPreview
                  ? "w-full -translate-x-full lg:translate-x-0 lg:w-1/2 border-r border-slate-200 dark:border-slate-800 shadow-xl z-10"
                  : "w-full"
              )}
            >
              {/* Header / Banner Area */}
              <div
                className={cn(
                  "shrink-0 relative overflow-hidden transition-all duration-300",
                  showPdfPreview ? "p-4 sm:p-5" : "p-6 lg:p-10",
                  isDarkMode
                    ? "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50 text-slate-900",
                )}
              >
                <div className="absolute inset-x-0 bottom-0 h-px bg-slate-100/10 dark:bg-slate-800" />
                <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>

                <div className={cn("relative z-10", showPdfPreview ? "pr-24 lg:pr-32" : "pr-20 sm:pr-48 lg:pr-56")}>
                  {/* Nhóm nút chức năng - góc trên phải */}
                  <div
                    className={cn(
                      "absolute z-20 transition-all duration-300 flex flex-col sm:flex-row-reverse items-end sm:items-center gap-1.5 sm:gap-2 top-1/2 -translate-y-1/2",
                      showPdfPreview
                        ? "right-2 sm:right-4"
                        : "right-3 sm:right-5 lg:right-6"
                    )}
                  >
                    {/* Hàng nút trên: Toàn màn hình (PC) & Đóng (Esc) */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Nút Toàn màn hình (Fullscreen) dành cho PC */}
                      <button
                        type="button"
                        onClick={() => setIsFullScreen((prev) => !prev)}
                        className={cn(
                          "hidden lg:flex p-2 rounded-xl transition-all duration-200 items-center justify-center cursor-pointer shadow-sm active:scale-95 border",
                          isFullScreen
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50 border-blue-500"
                            : isDarkMode
                            ? "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700/60"
                            : "bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 border-slate-200"
                        )}
                        title={isFullScreen ? "Thu nhỏ cửa sổ" : "Toàn màn hình"}
                      >
                        {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                      </button>

                      {/* Nút Đóng modal toàn bộ */}
                      <button
                        onClick={onClose}
                        className={cn(
                          "w-9 h-9 sm:w-auto sm:h-auto p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 border",
                          isDarkMode
                            ? "bg-slate-800/80 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 border-slate-700/60"
                            : "bg-white/90 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border-slate-200"
                        )}
                        title="Đóng toàn bộ cửa sổ (Esc)"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Hàng nút dưới: Nút Xem tờ HDSD (PDF) */}
                    {drug.pdfUrl && !showPdfPreview && (
                      <button
                        type="button"
                        onClick={() => setShowPdfPreview(true)}
                        className={cn(
                          "w-9 h-9 sm:w-auto sm:h-auto px-0 sm:px-3 py-0 sm:py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 border",
                          isDarkMode
                            ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border-rose-500/30"
                            : "bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
                        )}
                        title="Xem tờ hướng dẫn (PDF)"
                      >
                        <FileText size={16} />
                        <span className="hidden sm:inline text-[11px] font-bold">Xem PDF</span>
                      </button>
                    )}
                  </div>

                  <div className={cn("flex items-center transition-all duration-300", showPdfPreview ? "gap-3" : "gap-4 lg:gap-6")}>
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          "relative p-1 shadow-2xl border overflow-hidden flex items-center justify-center transition-all duration-300",
                          showPdfPreview
                            ? "w-10 h-10 rounded-xl"
                            : "w-16 h-16 lg:w-24 lg:h-24 rounded-[20px] lg:rounded-[28px]",
                          isDarkMode
                            ? "bg-white/10 border-white/20"
                            : "bg-white border-slate-100",
                        )}
                      >
                        {drug.avatarUrl ? (
                          <img
                            src={drug.avatarUrl}
                            alt={drug.name}
                            className={cn(
                              "w-full h-full object-cover transition-all duration-300",
                              showPdfPreview ? "rounded-lg" : "rounded-[18px] lg:rounded-[24px]"
                            )}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Pill size={showPdfPreview ? 20 : 32} className="text-blue-500" />
                        )}
                      </div>
                      {drug.isNew ? (
                        <span className="absolute -top-1 -right-1 z-10 bg-emerald-500 text-white rounded-full text-[8.5px] font-black px-1.5 py-0.5 shadow-md flex items-center justify-center border border-white dark:border-slate-800 lg:hidden leading-none scale-90 origin-top-right">
                          Mới
                        </span>
                      ) : drug.isUpdated ? (
                        <span className={cn(
                          "absolute -top-1 -right-1 z-10 text-white rounded-full text-[8.5px] font-black px-1.5 py-0.5 shadow-md flex items-center justify-center border border-white dark:border-slate-800 lg:hidden leading-none scale-90 origin-top-right",
                          drug.isUpdated === "updating" ? "bg-amber-500" : "bg-indigo-500"
                        )}>
                          {drug.isUpdated === "updating" ? "Đang CN" : "Mới CN"}
                        </span>
                      ) : null}
                      {drug.isRx && (
                        <span className={cn(
                          "absolute -bottom-1 -right-1 z-10 bg-rose-500 text-white font-black px-1.5 py-0.5 shadow-md flex items-center justify-center border border-white dark:border-slate-800 leading-none",
                          showPdfPreview ? "rounded-md text-[8px]" : "rounded-lg text-[9px] lg:text-[10px]"
                        )}>
                          Rx
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 lg:gap-3 mb-0.5 flex-wrap">
                        <h3 className={cn("font-black tracking-tight leading-tight truncate", showPdfPreview ? "text-[16px]" : "text-xl lg:text-4xl")}>
                          {drug.name}
                        </h3>
                        {!showPdfPreview && drug.isNew && (
                          <span className="shrink-0 hidden lg:flex px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-black border border-emerald-500/30 items-center gap-1">
                            <Sparkles size={10} />
                            THUỐC MỚI
                          </span>
                        )}
                        {!showPdfPreview && drug.isUpdated && (
                          <span className={cn(
                            "shrink-0 hidden lg:flex px-2 py-0.5 rounded-lg text-[10px] font-black border items-center gap-1",
                            drug.isUpdated === "updating"
                              ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                              : "bg-indigo-500/20 text-indigo-500 border-indigo-500/30"
                          )}>
                            <Sparkles size={10} />
                            {drug.isUpdated === "updating" ? "ĐANG CẬP NHẬT" : "MỚI CẬP NHẬT"}
                          </span>
                        )}
                        {!showPdfPreview && drug.isClosed && (
                          <span
                            className={cn(
                              "shrink-0 px-3 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5",
                              isDarkMode
                                ? "bg-slate-800 text-slate-400 border-slate-700"
                                : "bg-slate-100/80 text-slate-500 border-slate-200 shadow-sm",
                            )}
                          >
                            <AlertCircle size={12} className="shrink-0" />
                            ĐANG ẨN
                          </span>
                        )}
                        {!showPdfPreview && drug.status === "suspended" && (
                          <span
                            className={cn(
                              "shrink-0 px-3 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5",
                              isDarkMode
                                ? "bg-amber-900/20 text-amber-400 border-amber-900/30"
                                : "bg-amber-50 text-amber-600 border-amber-100 shadow-sm",
                            )}
                          >
                            <Pause size={12} className="shrink-0" />
                            TẠM NGƯNG
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          "font-bold uppercase tracking-widest opacity-70 truncate",
                          showPdfPreview ? "text-[10px] mb-0" : "text-[9px] lg:text-[11px] mb-3",
                          isDarkMode ? "text-blue-300" : "text-blue-600",
                        )}
                      >
                        {(drug.activeIngredients || [])
                          .map((ing) => `${ing.name} ${ing.amount}${ing.unit}`)
                          .join(" + ")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div
                className={cn(
                  "px-0 lg:px-10 pt-1 border-b backdrop-blur-md transition-colors shrink-0",
                  isDarkMode
                    ? "bg-slate-900/90 border-slate-800"
                    : "bg-white border-slate-100 shadow-xs",
                )}
              >
                <div className="flex justify-between lg:justify-start lg:gap-4 overflow-x-auto custom-scrollbar -mb-[1px]">
                  {detailTabs.map((tab) => {
                    const isActive = activeDetailTab === tab.id;
                    const tabIndex = detailTabs.findIndex(
                      (t) => t.id === tab.id,
                    );
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setDirection(tabIndex > currentIndex ? 1 : -1);
                          setActiveDetailTab(tab.id as any);
                        }}
                        className={cn(
                          "flex flex-1 lg:flex-none flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 py-3 px-1 text-[10px] sm:text-[11px] font-black transition-all whitespace-nowrap border-b-2 focus:outline-none",
                          isActive
                            ? isDarkMode
                              ? "border-blue-500 text-blue-400 font-extrabold hover:text-blue-400"
                              : "border-blue-600 text-blue-600 font-extrabold hover:text-blue-600"
                            : isDarkMode
                              ? "border-transparent text-slate-400 hover:text-blue-400"
                              : "border-transparent text-slate-500 hover:text-blue-600",
                        )}
                      >
                        <span className="shrink-0">{tab.icon}</span>
                        {/* Chỉ hiện label khi tab đang active; trên desktop luôn hiện */}
                        <span
                          className={cn(
                            isActive ? "inline" : "hidden md:inline",
                          )}
                        >
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={cn(
                  "flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar",
                  isDarkMode
                    ? "bg-slate-900 font-bold"
                    : "bg-slate-50/30 font-bold",
                )}
              >
                <AnimatePresence
                  initial={false}
                  custom={direction}
                  mode="popLayout"
                >
                  <motion.div
                    key={activeDetailTab}
                    custom={direction}
                    variants={slideVariants as any}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                      opacity: { duration: 0.2 },
                    }}
                    drag={isMobile && !activeCopyTag ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={
                      isMobile && !activeCopyTag
                        ? {
                            left: currentIndex === detailTabs.length - 1 ? 0 : 1,
                            right: currentIndex === 0 ? 0 : 1,
                          }
                        : 0
                    }
                    onDragEnd={(e, { offset, velocity }) => {
                      if (!isMobile || activeCopyTag) return;
                      const swipe =
                        Math.abs(offset.x) > 50 || Math.abs(velocity.x) > 500;
                      if (swipe) {
                        if (offset.x < 0) {
                          paginate(1);
                        } else {
                          paginate(-1);
                        }
                      }
                    }}
                    className="min-h-full py-4 lg:py-10 touch-pan-y"
                  >
                    <div className="px-0 lg:px-10">
                    {/* Indications Tab */}
                    {activeDetailTab === "indications" && (
                      <div className="space-y-6 relative">
                        {activeCopyTag && (
                          <>
                            {/* Desktop click-outside backdrop */}
                            <div 
                              className="fixed inset-0 z-[190] bg-transparent cursor-default hidden sm:block" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCopyTag(null);
                              }} 
                            />

                            {/* Mobile Bottom Sheet Backdrop */}
                            <div 
                              className="fixed inset-0 z-[290] bg-slate-950/60 backdrop-blur-xs block sm:hidden animate-in fade-in duration-150"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCopyTag(null);
                              }}
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                              onTouchEnd={(e) => e.stopPropagation()}
                            />

                            {/* Mobile Bottom Sheet Container */}
                            <div 
                              className={cn(
                                "fixed inset-x-0 bottom-0 z-[300] block sm:hidden rounded-t-[28px] border-t p-5 shadow-2xl flex flex-col gap-3.5 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto",
                                isDarkMode
                                  ? "bg-slate-900 border-slate-800 text-white shadow-black/80"
                                  : "bg-white border-slate-200 text-slate-800 shadow-slate-900/20"
                              )}
                              onClick={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                              onTouchEnd={(e) => e.stopPropagation()}
                            >
                              {/* Drag handle bar */}
                              <div className={cn("w-12 h-1.5 rounded-full mx-auto -mt-1 mb-0.5 shrink-0", isDarkMode ? "bg-slate-700" : "bg-slate-300")} />

                              {/* Header */}
                              <div className={cn(
                                "flex items-center justify-between border-b pb-3 shrink-0",
                                isDarkMode ? "border-slate-800" : "border-slate-100"
                              )}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={cn(
                                    "p-2 rounded-xl shrink-0",
                                    activeCopyTag.isDouble
                                      ? "bg-amber-500/10 text-amber-500"
                                      : "bg-indigo-500/10 text-indigo-500"
                                  )}>
                                    {activeCopyTag.isDouble ? <Link2 size={16} /> : <Copy size={16} />}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                                      {activeCopyTag.isDouble ? "Sao chép ICD-10 kép" : "Sao chép ICD-10"}
                                    </h4>
                                    <div className={cn(
                                      "font-mono text-xs font-extrabold truncate mt-0.5",
                                      activeCopyTag.isDouble
                                        ? (isDarkMode ? "text-amber-400" : "text-amber-600")
                                        : (isDarkMode ? "text-indigo-400" : "text-indigo-600")
                                    )}>
                                      {activeCopyTag.code}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveCopyTag(null)}
                                  className={cn(
                                    "p-2 rounded-xl transition-colors cursor-pointer shrink-0 ml-2",
                                    isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <X size={18} />
                                </button>
                              </div>

                              {/* Description / Pair info */}
                              {activeCopyTag.isDouble ? (
                                <div className={cn(
                                  "p-3 rounded-2xl border text-xs space-y-1.5 shrink-0",
                                  isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-amber-50/50 border-amber-200/60"
                                )}>
                                  {activeCopyTag.dCode && (
                                    <div className="flex items-start gap-1.5">
                                      <span className={cn("font-mono font-extrabold shrink-0", isDarkMode ? "text-amber-400" : "text-amber-600")}>† {activeCopyTag.dCode}:</span>
                                      <span className={cn("font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>{activeCopyTag.dDesc || "Mã chính"}</span>
                                    </div>
                                  )}
                                  {activeCopyTag.aCode && (
                                    <div className="flex items-start gap-1.5">
                                      <span className={cn("font-mono font-extrabold shrink-0", isDarkMode ? "text-indigo-400" : "text-indigo-600")}>* {activeCopyTag.aCode}:</span>
                                      <span className={cn("font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>{activeCopyTag.aDesc || "Mã biểu hiện"}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                activeCopyTag.desc ? (
                                  <div className={cn(
                                    "text-xs font-medium px-1 line-clamp-2 leading-relaxed shrink-0",
                                    isDarkMode ? "text-slate-300" : "text-slate-600"
                                  )}>
                                    {activeCopyTag.desc}
                                  </div>
                                ) : null
                              )}

                              {/* Copy Actions */}
                              <div className="flex flex-col gap-2 shrink-0">
                                <button
                                  onClick={() => handleCopyText(activeCopyTag.code, "code")}
                                  className={cn(
                                    "flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer border",
                                    isDarkMode
                                      ? "bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800"
                                      : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    <Copy size={14} className="text-indigo-500 shrink-0" />
                                    <span>Sao chép Mã</span>
                                  </span>
                                  {copiedType === "code" ? (
                                    <span className="text-emerald-500 text-xs font-extrabold flex items-center gap-1 shrink-0">
                                      <Check size={14} />
                                      Đã chép!
                                    </span>
                                  ) : (
                                    <span className="font-mono text-xs font-bold text-slate-400 shrink-0">{activeCopyTag.code}</span>
                                  )}
                                </button>

                                {activeCopyTag.desc && (
                                  <button
                                    onClick={() => handleCopyText(activeCopyTag.desc, "desc")}
                                    className={cn(
                                      "flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer border",
                                      isDarkMode
                                        ? "bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800"
                                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                                    )}
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      <Copy size={14} className="text-emerald-500 shrink-0" />
                                      <span>Sao chép Tên</span>
                                    </span>
                                    {copiedType === "desc" ? (
                                      <span className="text-emerald-500 text-xs font-extrabold flex items-center gap-1 shrink-0">
                                        <Check size={14} />
                                        Đã chép!
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-slate-400 truncate max-w-[160px]">{activeCopyTag.desc}</span>
                                    )}
                                  </button>
                                )}

                                <button
                                  onClick={() => handleCopyText(activeCopyTag.fullName, "fullName")}
                                  className={cn(
                                    "flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer border",
                                    isDarkMode
                                      ? "bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800"
                                      : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    <Copy size={14} className="text-rose-500 shrink-0" />
                                    <span>Sao chép Tên + Mã</span>
                                  </span>
                                  {copiedType === "fullName" ? (
                                    <span className="text-emerald-500 text-xs font-extrabold flex items-center gap-1 shrink-0">
                                      <Check size={14} />
                                      Đã chép!
                                    </span>
                                  ) : (
                                    <Copy size={14} className="text-slate-400 shrink-0" />
                                  )}
                                </button>
                              </div>

                              {/* Section: Thuốc khác cùng ICD-10 */}
                              <div className={cn(
                                "pt-3 mt-1 border-t flex flex-col gap-2 shrink-0",
                                isDarkMode ? "border-slate-800" : "border-slate-100"
                              )}>
                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider px-1">
                                  <span className={cn("flex items-center gap-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                    <Pill size={14} className="text-emerald-500 shrink-0" />
                                    Thuốc khác cùng ICD-10
                                  </span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-bold border",
                                    isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                                  )}>
                                    {otherDrugsWithIcd.length}
                                  </span>
                                </div>

                                {otherDrugsWithIcd.length === 0 ? (
                                  <div className={cn(
                                    "text-xs font-medium italic px-2 py-2.5 rounded-xl text-center",
                                    isDarkMode ? "bg-slate-800/40 text-slate-500" : "bg-slate-50 text-slate-400"
                                  )}>
                                    Không có thuốc nào khác cùng mã
                                  </div>
                                ) : (
                                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                    {otherDrugsWithIcd.map((otherDrug, odIdx) => (
                                      <button
                                        key={`${otherDrug.id || otherDrug.name}-${odIdx}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveCopyTag(null);
                                          setActiveDrug(otherDrug);
                                        }}
                                        className={cn(
                                          "w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 group/drug-item cursor-pointer",
                                          isDarkMode
                                            ? "bg-slate-800/40 border-slate-800 hover:bg-emerald-950/40 hover:border-emerald-800/50"
                                            : "bg-slate-50/80 border-slate-200/80 hover:bg-emerald-50 hover:border-emerald-200"
                                        )}
                                      >
                                        <div className="min-w-0">
                                          <div className={cn(
                                            "text-xs font-bold truncate",
                                            isDarkMode ? "text-slate-200 group-hover/drug-item:text-emerald-400" : "text-slate-800 group-hover/drug-item:text-emerald-600"
                                          )}>
                                            {otherDrug.name}
                                          </div>
                                          {otherDrug.activeIngredients && otherDrug.activeIngredients.length > 0 && (
                                            <div className={cn(
                                              "text-[10px] truncate mt-0.5",
                                              isDarkMode ? "text-slate-400" : "text-slate-500"
                                            )}>
                                              {otherDrug.activeIngredients.map((ai) => ai.name).join(", ")}
                                            </div>
                                          )}
                                        </div>
                                        <ExternalLink size={13} className="text-slate-400 group-hover/drug-item:text-emerald-500 shrink-0" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        {drug.mechanismOfAction && (
                          <div
                            className={cn(
                              "p-6 rounded-3xl border flex items-start gap-4",
                              isDarkMode
                                ? "bg-violet-900/10 border-violet-900/20 shadow-xl"
                                : "bg-violet-50 border-violet-100 shadow-sm",
                            )}
                          >
                            <Zap
                              className="text-violet-500 shrink-0 mt-1"
                              size={20}
                            />
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">
                                {drug.mechanismOfActionLabel || "Cơ chế tác dụng"}
                              </h4>
                              <div className={cn(
                                "text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium",
                                isDarkMode ? "text-slate-300" : "text-slate-650"
                              )}>
                                {drug.mechanismOfAction}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          {(drug.indications || []).map((item, i) => {
                            const isNormal = !item.isNotRecommended && !item.isRecommended && !(item.isPrimary && canSeeCommonIndications);
                            const headerBg = item.isNotRecommended
                              ? isDarkMode ? "bg-rose-950/20" : "bg-rose-50/70"
                              : item.isRecommended
                                ? isDarkMode ? "bg-emerald-950/20" : "bg-emerald-50/70"
                                : (item.isPrimary && canSeeCommonIndications)
                                  ? isDarkMode ? "bg-amber-950/20" : "bg-amber-50/70"
                                  : isDarkMode ? "bg-slate-900/40" : "bg-slate-50/80";

                            const isCardCopyActive = activeCopyTag?.id.startsWith(`single-${i}-`) || activeCopyTag?.id.startsWith(`double-${i}-`);

                            return (
                              <div
                                key={i}
                                className={cn(
                                  "rounded-[24px] border transition-all relative",
                                  isCardCopyActive ? "z-[210]" : "z-10",
                                  isDarkMode
                                    ? "bg-slate-800 border-slate-700"
                                    : "bg-white border-slate-200 shadow-sm",
                                )}
                              >
                                {/* Header section with background color and border-b */}
                                <div className={cn(
                                  "px-5 py-3.5 border-b rounded-t-[23px] flex items-center justify-between gap-3",
                                  headerBg,
                                  isDarkMode ? "border-slate-700" : "border-slate-200"
                                )}>
                                  <div className="flex items-center gap-2.5">
                                    {item.isPrimary && canSeeCommonIndications ? (
                                      <Star
                                        size={14}
                                        fill="currentColor"
                                        className="text-amber-500 shrink-0"
                                      />
                                    ) : item.isRecommended ? (
                                      <ThumbsUp
                                        size={14}
                                        fill="currentColor"
                                        className="text-emerald-500 shrink-0"
                                      />
                                    ) : item.isNotRecommended ? (
                                      <AlertTriangle
                                        size={14}
                                        fill="currentColor"
                                        className="text-rose-500 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-2 h-2 rounded-full shadow-sm shrink-0 bg-blue-500" />
                                    )}

                                    {item.title ? (
                                      isNormal ? (
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                          {item.title}
                                        </h5>
                                      ) : (
                                        <div className="relative group/ind-title inline-block cursor-help">
                                          <h5 className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            item.isNotRecommended
                                              ? "text-rose-500"
                                              : item.isRecommended
                                                ? "text-emerald-500"
                                                : "text-amber-500"
                                          )}>
                                            {item.title}
                                          </h5>
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[200px] px-2.5 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[9px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/ind-title:opacity-100 group-hover/ind-title:visible transition-all duration-300 -translate-y-1 group-hover/ind-title:translate-y-0 z-[150] pointer-events-none border border-slate-700/50 flex items-center gap-1.5 leading-normal">
                                            <Info size={10} className="text-blue-400 shrink-0" />
                                            <span>
                                              {item.isNotRecommended
                                                ? "Mã không khuyến khích sử dụng"
                                                : item.isRecommended
                                                  ? "Mã khuyến khích dùng"
                                                  : "Chỉ định chính phổ biến của thuốc"}
                                            </span>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95" />
                                          </div>
                                        </div>
                                      )
                                    ) : (
                                      <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isDarkMode ? "text-slate-400" : "text-slate-500"
                                      )}>
                                        Chỉ định
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {item.isRecommended && (
                                      <div className="relative group/ind-rec inline-block cursor-help">
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 text-[8px] font-black uppercase tracking-widest">
                                          <ThumbsUp size={8} className="fill-current" />
                                          Khuyến khích chọn
                                        </span>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-2.5 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[9px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/ind-rec:opacity-100 group-hover/ind-rec:visible transition-all duration-300 translate-y-1 group-hover/ind-rec:translate-y-0 z-[150] pointer-events-none border border-slate-700/50 flex items-center gap-1.5 leading-normal">
                                          <ThumbsUp size={10} className="text-emerald-400 shrink-0 fill-emerald-400" />
                                          <span>Mã khuyến khích dùng</span>
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                        </div>
                                      </div>
                                    )}
                                    {item.isNotRecommended && (
                                      <div className="relative group/ind-notrec inline-block cursor-help">
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-500 text-[8px] font-black uppercase tracking-widest">
                                          <AlertTriangle size={8} className="fill-current" />
                                          Không khuyến khích chọn
                                        </span>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-2.5 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[9px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/ind-notrec:opacity-100 group-hover/ind-notrec:visible transition-all duration-300 translate-y-1 group-hover/ind-notrec:translate-y-0 z-[150] pointer-events-none border border-slate-700/50 flex items-center gap-1.5 leading-normal">
                                          <AlertTriangle size={10} className="text-rose-400 shrink-0 fill-rose-400" />
                                          <span>Mã không khuyến khích sử dụng</span>
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="p-5 space-y-4">
                                  <div className={cn(
                                    "text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium",
                                    isDarkMode ? "text-slate-300" : "text-slate-600"
                                  )}>
                                    {item.content}
                                  </div>

                                  {canSeeIcdSuggestions && (
                                    ((item.icd10s && item.icd10s.length > 0) || (item.doubleIcd10s && item.doubleIcd10s.length > 0)) && (
                                      <div className="mt-4 flex flex-wrap gap-2">
                                        {item.icd10s &&
                                          item.icd10s.length > 0 &&
                                          [...item.icd10s]
                                            .sort((a, b) =>
                                              a.localeCompare(b, "vi"),
                                            )
                                            .map((fullName, idx) => {
                                              const parts = fullName.split(" - ");
                                              const code = parts[0];
                                              const icdObj = icdList.find(
                                                (icd) => icd.code === code,
                                              );
                                              const desc =
                                                parts.slice(1).join(" - ") ||
                                                icdObj?.description;
                                              const isDefault =
                                                (
                                                  item.defaultIcd10s || []
                                                ).includes(fullName) ||
                                                item.defaultIcd10 === fullName;
                                              const isAlternative =
                                                (
                                                  item.betterAlternativeIcd10s || []
                                                ).includes(fullName);
                                              const isNotRecommended =
                                                (
                                                  item.notRecommendedIcd10s || []
                                                ).includes(fullName);
                                              const isCopyActive = activeCopyTag?.id === `single-${i}-${idx}`;
                                              return (
                                                <div
                                                  key={idx}
                                                  className={cn(
                                                    "relative group/icd-tag inline-block cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform select-none",
                                                    isCopyActive ? "z-[200]" : "z-10"
                                                  )}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const tagId = `single-${i}-${idx}`;
                                                    if (activeCopyTag?.id === tagId) {
                                                      setActiveCopyTag(null);
                                                    } else {
                                                      setActiveCopyTag({
                                                        id: tagId,
                                                        code,
                                                        desc: desc || "",
                                                        fullName,
                                                      });
                                                    }
                                                  }}
                                                >
                                                  <div
                                                    className={cn(
                                                      "px-2.5 py-1.5 rounded-lg text-[10px] font-black border flex items-center gap-2 transition-all",
                                                      isDefault
                                                        ? isDarkMode
                                                          ? "bg-emerald-950/20 border-emerald-500 text-emerald-400 shadow-sm"
                                                          : "bg-emerald-50/50 border-emerald-500 text-emerald-750 shadow-xs"
                                                        : isAlternative
                                                          ? isDarkMode
                                                            ? "bg-amber-950/20 border-amber-500 text-amber-400 shadow-sm"
                                                            : "bg-amber-50/50 border-amber-500 text-amber-750 shadow-xs"
                                                          : isNotRecommended
                                                            ? isDarkMode
                                                              ? "bg-rose-950/20 border-rose-500 text-rose-400 shadow-sm"
                                                              : "bg-rose-50/50 border-rose-500 text-rose-750 shadow-xs"
                                                            : isDarkMode
                                                              ? "bg-slate-900/50 border-slate-700"
                                                              : "bg-slate-100 border-slate-200",
                                                    )}
                                                  >
                                                    <span
                                                      className={
                                                        isDefault
                                                          ? isDarkMode
                                                            ? "text-emerald-400 font-extrabold"
                                                            : "text-emerald-600 font-extrabold"
                                                          : isAlternative
                                                            ? isDarkMode
                                                              ? "text-amber-400 font-extrabold"
                                                              : "text-amber-600 font-extrabold"
                                                            : isNotRecommended
                                                              ? isDarkMode
                                                                ? "text-rose-400 font-extrabold"
                                                                : "text-rose-650 font-extrabold"
                                                              : "text-blue-500"
                                                      }
                                                    >
                                                      {code}
                                                    </span>
                                                    {desc && (
                                                      <span
                                                        className={cn(
                                                          "font-bold",
                                                          isDefault
                                                            ? isDarkMode
                                                              ? "text-slate-300"
                                                              : "text-slate-700"
                                                            : isAlternative
                                                              ? isDarkMode
                                                                ? "text-slate-300"
                                                                : "text-slate-700"
                                                              : isNotRecommended
                                                                ? isDarkMode
                                                                  ? "text-slate-300"
                                                                  : "text-slate-700"
                                                                : "opacity-50",
                                                        )}
                                                      >
                                                        {desc}
                                                      </span>
                                                    )}
                                                    {isDefault && (
                                                      <ThumbsUp
                                                        size={10}
                                                        fill="currentColor"
                                                        className="text-emerald-500 shrink-0"
                                                      />
                                                    )}
                                                    {isAlternative && (
                                                      <AlertCircle
                                                        size={10}
                                                        className="text-amber-500 shrink-0 animate-pulse"
                                                      />
                                                    )}
                                                    {isNotRecommended && (
                                                      <AlertTriangle
                                                        size={10}
                                                        className="text-rose-500 shrink-0 animate-pulse"
                                                      />
                                                    )}
                                                  </div>
                                                  {/* Tooltip for ICD-10 tag */}
                                                  <div className={cn(
                                                    "hidden sm:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[240px] px-2.5 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[9px] font-bold rounded-lg shadow-xl z-[150] border border-slate-700/50 items-center gap-1.5 leading-normal transition-all duration-300 translate-y-1",
                                                    activeCopyTag
                                                      ? "opacity-0 invisible pointer-events-none"
                                                      : "opacity-0 invisible pointer-events-none group-hover/icd-tag:opacity-100 group-hover/icd-tag:visible group-hover/icd-tag:translate-y-0"
                                                  )}>
                                                    {isDefault ? (
                                                      <ThumbsUp size={10} className="text-emerald-400 shrink-0 fill-emerald-400" />
                                                    ) : isAlternative ? (
                                                      <AlertCircle size={10} className="text-amber-400 shrink-0" />
                                                    ) : isNotRecommended ? (
                                                      <AlertTriangle size={10} className="text-rose-400 shrink-0 fill-rose-400" />
                                                    ) : (
                                                      <Info size={10} className="text-blue-400 shrink-0" />
                                                    )}
                                                    <span>
                                                      {isDefault
                                                        ? "Mã khuyến khích dùng"
                                                        : isAlternative
                                                          ? "Khuyến khích chọn mã khác tốt hơn mã này"
                                                          : isNotRecommended
                                                            ? "Mã không khuyến khích sử dụng"
                                                            : "Gợi ý ICD-10 liên quan đến chỉ định này"}
                                                    </span>
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                                  </div>
                                                  {icdObj && renderIcdRules(icdObj)}

                                                  {/* 3 Copy buttons popup + Other drugs list (Desktop only) */}
                                                  {isCopyActive && (
                                                    <div
                                                      className={cn(
                                                        "hidden sm:flex sm:flex-col absolute sm:bottom-auto sm:top-full sm:left-1/2 sm:-translate-x-1/2 mt-2 z-[220] border rounded-2xl shadow-2xl p-3 gap-2 sm:min-w-[240px] sm:max-w-[320px] animate-in fade-in sm:slide-in-from-top-2 duration-150 cursor-default",
                                                        isDarkMode
                                                          ? "bg-slate-900 border-slate-800 text-white shadow-black/50"
                                                          : "bg-white border-slate-200 text-slate-800 shadow-slate-300/40"
                                                      )}
                                                      onClick={(e) => e.stopPropagation()}
                                                    >
                                                      <div className={cn(
                                                        "flex items-center justify-between text-[9px] font-black uppercase tracking-widest px-1 border-b pb-1.5",
                                                        isDarkMode ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-100"
                                                      )}>
                                                        <div className="flex items-center gap-2">
                                                          <span>Sao chép ICD-10</span>
                                                          <span className="font-mono text-[10px] text-blue-500 font-extrabold">{code}</span>
                                                        </div>
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveCopyTag(null);
                                                          }}
                                                          className={cn(
                                                            "p-0.5 rounded-md transition-colors cursor-pointer",
                                                            isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                                                          )}
                                                        >
                                                          <X size={14} />
                                                        </button>
                                                      </div>
                                                      
                                                      <div className="flex flex-col gap-1">
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyText(code, "code");
                                                          }}
                                                          className={cn(
                                                            "flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer",
                                                            isDarkMode ? "text-slate-300 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-100"
                                                          )}
                                                        >
                                                          <span>Sao chép Mã</span>
                                                          {copiedType === "code" ? (
                                                            <span className="text-emerald-500 text-[9px] font-extrabold shrink-0">Đã chép!</span>
                                                          ) : (
                                                            <Copy size={11} className="text-slate-400 shrink-0" />
                                                          )}
                                                        </button>

                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyText(desc || "", "desc");
                                                          }}
                                                          className={cn(
                                                            "flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer",
                                                            isDarkMode ? "text-slate-300 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-100"
                                                          )}
                                                        >
                                                          <span>Sao chép Tên</span>
                                                          {copiedType === "desc" ? (
                                                            <span className="text-emerald-500 text-[9px] font-extrabold shrink-0">Đã chép!</span>
                                                          ) : (
                                                            <Copy size={11} className="text-slate-400 shrink-0" />
                                                          )}
                                                        </button>

                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyText(fullName, "fullName");
                                                          }}
                                                          className={cn(
                                                            "flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer",
                                                            isDarkMode ? "text-slate-300 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-100"
                                                          )}
                                                        >
                                                          <span>Sao chép Tên + Mã</span>
                                                          {copiedType === "fullName" ? (
                                                            <span className="text-emerald-500 text-[9px] font-extrabold shrink-0">Đã chép!</span>
                                                          ) : (
                                                            <Copy size={11} className="text-slate-400 shrink-0" />
                                                          )}
                                                        </button>
                                                      </div>

                                                      {/* Section: Thuốc khác cùng ICD-10 */}
                                                      <div className={cn(
                                                        "pt-2 border-t flex flex-col gap-1.5",
                                                        isDarkMode ? "border-slate-800" : "border-slate-100"
                                                      )}>
                                                        <div className={cn(
                                                          "flex items-center justify-between text-[9px] font-black uppercase tracking-wider px-1",
                                                          isDarkMode ? "text-slate-400" : "text-slate-500"
                                                        )}>
                                                          <span className="flex items-center gap-1">
                                                            <Pill size={11} className="text-emerald-500" />
                                                            Thuốc khác cùng ICD-10
                                                          </span>
                                                          <span className={cn(
                                                            "px-1.5 py-0.2 rounded-full text-[9px] font-bold",
                                                            isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                                                          )}>
                                                            {otherDrugsWithIcd.length}
                                                          </span>
                                                        </div>

                                                        {otherDrugsWithIcd.length === 0 ? (
                                                          <div className={cn(
                                                            "text-[10px] font-medium italic px-1 py-1",
                                                            isDarkMode ? "text-slate-500" : "text-slate-400"
                                                          )}>
                                                            Không có thuốc nào khác cùng mã
                                                          </div>
                                                        ) : (
                                                          <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                                                            {otherDrugsWithIcd.map((otherDrug, odIdx) => (
                                                              <button
                                                                key={`${otherDrug.id || otherDrug.name}-${odIdx}`}
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setActiveCopyTag(null);
                                                                  setActiveDrug(otherDrug);
                                                                }}
                                                                className={cn(
                                                                  "w-full text-left p-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 group/drug-item cursor-pointer",
                                                                  isDarkMode
                                                                    ? "hover:bg-emerald-950/40 border-transparent hover:border-emerald-800/50"
                                                                    : "hover:bg-emerald-50 border-transparent hover:border-emerald-200"
                                                                )}
                                                              >
                                                                <div className="min-w-0">
                                                                  <div className={cn(
                                                                    "text-[11px] font-bold truncate group-hover/drug-item:text-emerald-600 dark:group-hover/drug-item:text-emerald-400",
                                                                    isDarkMode ? "text-slate-200" : "text-slate-800"
                                                                  )}>
                                                                    {otherDrug.name}
                                                                  </div>
                                                                  {otherDrug.activeIngredients && otherDrug.activeIngredients.length > 0 && (
                                                                    <div className={cn(
                                                                      "text-[9px] truncate",
                                                                      isDarkMode ? "text-slate-500" : "text-slate-400"
                                                                    )}>
                                                                      {otherDrug.activeIngredients.map((ai) => ai.name).join(", ")}
                                                                    </div>
                                                                  )}
                                                                </div>
                                                                <ExternalLink size={11} className="text-slate-400 group-hover/drug-item:text-emerald-500 shrink-0" />
                                                              </button>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>

                                                      {/* Pointer triangle facing up (desktop only) */}
                                                      <div className={cn(
                                                        "hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent",
                                                        isDarkMode ? "border-b-slate-900" : "border-b-white"
                                                      )} />
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}

                                        {item.doubleIcd10s &&
                                          item.doubleIcd10s.map((pair, pIdx) => {
                                            const dParts = (pair.dagger || "").split(" - ");
                                            const dCode = dParts[0];
                                            const dDesc = dParts.slice(1).join(" - ");

                                            const aParts = (pair.asterisk || "").split(" - ");
                                            const aCode = aParts[0];
                                            const aDesc = aParts.slice(1).join(" - ");

                                            const isDoubleCopyActive = activeCopyTag?.id === `double-${i}-${pIdx}`;

                                            return (
                                              <div
                                                key={`double-${pIdx}`}
                                                className={cn(
                                                  "relative inline-flex items-center group/double-tag cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none max-w-full",
                                                  isDoubleCopyActive ? "z-[200]" : "z-10"
                                                )}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const tagId = `double-${i}-${pIdx}`;
                                                  if (activeCopyTag?.id === tagId) {
                                                    setActiveCopyTag(null);
                                                  } else {
                                                    setActiveCopyTag({
                                                      id: tagId,
                                                      code: `${dCode} + ${aCode}`,
                                                      desc: `${dDesc} + ${aDesc}`,
                                                      fullName: `${dCode} - ${dDesc} + ${aCode} - ${aDesc}`,
                                                      isDouble: true,
                                                      dCode,
                                                      dDesc,
                                                      aCode,
                                                      aDesc,
                                                    });
                                                  }
                                                }}
                                              >
                                                {/* Dagger Badge */}
                                                <div
                                                  className={cn(
                                                    "px-2.5 py-1.5 rounded-l-lg rounded-r-none text-[10px] font-black border border-r-0 flex items-center gap-1.5 transition-all shadow-sm select-none",
                                                    isDarkMode
                                                      ? "bg-amber-950/20 border-amber-500/50 text-amber-400 hover:bg-amber-950/30"
                                                      : "bg-amber-50/50 border-amber-500/50 text-amber-700 hover:bg-amber-50"
                                                  )}
                                                >
                                                  <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">{dCode}</span>
                                                  {dDesc && (
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 ml-1">
                                                      {dDesc}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Chain / Link icon at the boundary */}
                                                <div className={cn(
                                                  "z-10 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 -mx-2.5 transition-colors shadow-xs pointer-events-none",
                                                  isDarkMode
                                                    ? "bg-slate-900 border-slate-700 text-slate-400"
                                                    : "bg-white border-slate-200 text-slate-500"
                                                )}>
                                                  <Link2 size={11} className="shrink-0" />
                                                </div>

                                                {/* Asterisk Badge */}
                                                <div
                                                  className={cn(
                                                    "px-2.5 py-1.5 rounded-r-lg rounded-l-none text-[10px] font-black border border-l-0 flex items-center gap-1.5 transition-all shadow-sm select-none",
                                                    isDarkMode
                                                      ? "bg-indigo-950/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-950/30"
                                                      : "bg-indigo-50/50 border-indigo-500/50 text-indigo-750 hover:bg-indigo-50"
                                                  )}
                                                >
                                                  <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{aCode}</span>
                                                  {aDesc && (
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 ml-1">
                                                      {aDesc}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Tooltip for Double ICD-10 tag */}
                                                <div className={cn(
                                                  "hidden sm:flex sm:flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[280px] px-3 py-2 bg-slate-900/95 backdrop-blur-md text-white text-[9px] font-bold rounded-lg shadow-xl z-[150] border border-slate-700/50 gap-1 leading-normal transition-all duration-300 translate-y-1",
                                                  activeCopyTag
                                                    ? "opacity-0 invisible pointer-events-none"
                                                    : "opacity-0 invisible pointer-events-none group-hover/double-tag:opacity-100 group-hover/double-tag:visible group-hover/double-tag:translate-y-0"
                                                )}>
                                                  <div className="flex items-center gap-1 text-amber-400 font-black border-b border-slate-800 pb-1 mb-1">
                                                    <Link2 size={10} />
                                                    <span>Cặp mã gợi ý ICD-10 kép</span>
                                                  </div>
                                                  <div className="flex flex-col gap-1">
                                                    <div className="flex items-start gap-1">
                                                      <span className="text-amber-400 shrink-0 font-mono font-extrabold">† {dCode}:</span>
                                                      <span className="text-slate-300 font-medium">{dDesc || "Không có mô tả"}</span>
                                                    </div>
                                                    <div className="flex items-start gap-1">
                                                      <span className="text-indigo-400 shrink-0 font-mono font-extrabold">* {aCode}:</span>
                                                      <span className="text-slate-300 font-medium">{aDesc || "Không có mô tả"}</span>
                                                    </div>
                                                  </div>
                                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                                </div>

                                                {/* 3 Copy buttons popup for double tags + Other drugs list (Desktop only) */}
                                                {isDoubleCopyActive && (
                                                  <div
                                                    className={cn(
                                                      "hidden sm:flex sm:flex-col absolute sm:bottom-auto sm:top-full sm:left-1/2 sm:-translate-x-1/2 mt-2 z-[220] border rounded-2xl shadow-2xl p-3 gap-2 sm:min-w-[240px] sm:max-w-[340px] animate-in fade-in sm:slide-in-from-top-2 duration-150 cursor-default",
                                                      isDarkMode
                                                        ? "bg-slate-900 border-slate-800 text-white shadow-black/50"
                                                        : "bg-white border-slate-200 text-slate-800 shadow-slate-300/40"
                                                    )}
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <div className={cn(
                                                      "flex items-center justify-between text-[9px] font-black uppercase tracking-widest px-1 border-b pb-1.5",
                                                      isDarkMode ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-100"
                                                    )}>
                                                      <div className="flex items-center gap-2">
                                                        <span>Sao chép ICD-10 kép</span>
                                                        <span className="font-mono text-[10px] text-amber-500 font-extrabold">{dCode} + {aCode}</span>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setActiveCopyTag(null);
                                                        }}
                                                        className={cn(
                                                          "p-0.5 rounded-md transition-colors cursor-pointer",
                                                          isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                                                        )}
                                                      >
                                                        <X size={14} />
                                                      </button>
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-1">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleCopyText(`${dCode} + ${aCode}`, "code");
                                                        }}
                                                        className={cn(
                                                          "flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer",
                                                          isDarkMode ? "text-slate-300 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-100"
                                                        )}
                                                      >
                                                        <span>Sao chép Mã</span>
                                                        {copiedType === "code" ? (
                                                          <span className="text-emerald-500 text-[9px] font-extrabold shrink-0">Đã chép!</span>
                                                        ) : (
                                                          <Copy size={11} className="text-slate-400 shrink-0" />
                                                        )}
                                                      </button>

                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleCopyText(`${dDesc} + ${aDesc}`, "desc");
                                                        }}
                                                        className={cn(
                                                          "flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer",
                                                          isDarkMode ? "text-slate-300 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-100"
                                                        )}
                                                      >
                                                        <span>Sao chép Tên</span>
                                                        {copiedType === "desc" ? (
                                                          <span className="text-emerald-500 text-[9px] font-extrabold shrink-0">Đã chép!</span>
                                                        ) : (
                                                          <Copy size={11} className="text-slate-400 shrink-0" />
                                                        )}
                                                      </button>

                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleCopyText(`${dCode} - ${dDesc} + ${aCode} - ${aDesc}`, "fullName");
                                                        }}
                                                        className={cn(
                                                          "flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer",
                                                          isDarkMode ? "text-slate-300 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-100"
                                                        )}
                                                      >
                                                        <span>Sao chép Tên + Mã</span>
                                                        {copiedType === "fullName" ? (
                                                          <span className="text-emerald-500 text-[9px] font-extrabold shrink-0">Đã chép!</span>
                                                        ) : (
                                                          <Copy size={11} className="text-slate-400 shrink-0" />
                                                        )}
                                                      </button>
                                                    </div>

                                                    {/* Section: Thuốc khác cùng ICD-10 */}
                                                    <div className={cn(
                                                      "pt-2 border-t flex flex-col gap-1.5",
                                                      isDarkMode ? "border-slate-800" : "border-slate-100"
                                                    )}>
                                                      <div className={cn(
                                                        "flex items-center justify-between text-[9px] font-black uppercase tracking-wider px-1",
                                                        isDarkMode ? "text-slate-400" : "text-slate-500"
                                                      )}>
                                                        <span className="flex items-center gap-1">
                                                          <Pill size={11} className="text-emerald-500" />
                                                          Thuốc khác cùng ICD-10
                                                        </span>
                                                        <span className={cn(
                                                          "px-1.5 py-0.2 rounded-full text-[9px] font-bold",
                                                          isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                                                        )}>
                                                          {otherDrugsWithIcd.length}
                                                        </span>
                                                      </div>

                                                      {otherDrugsWithIcd.length === 0 ? (
                                                        <div className={cn(
                                                          "text-[10px] font-medium italic px-1 py-1",
                                                          isDarkMode ? "text-slate-500" : "text-slate-400"
                                                        )}>
                                                          Không có thuốc nào khác cùng mã
                                                        </div>
                                                      ) : (
                                                        <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                                                          {otherDrugsWithIcd.map((otherDrug, odIdx) => (
                                                            <button
                                                              key={`${otherDrug.id || otherDrug.name}-${odIdx}`}
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveCopyTag(null);
                                                                setActiveDrug(otherDrug);
                                                              }}
                                                              className={cn(
                                                                "w-full text-left p-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 group/drug-item cursor-pointer",
                                                                isDarkMode
                                                                  ? "hover:bg-emerald-950/40 border-transparent hover:border-emerald-800/50"
                                                                  : "hover:bg-emerald-50 border-transparent hover:border-emerald-200"
                                                              )}
                                                            >
                                                              <div className="min-w-0">
                                                                <div className={cn(
                                                                  "text-[11px] font-bold truncate group-hover/drug-item:text-emerald-600 dark:group-hover/drug-item:text-emerald-400",
                                                                  isDarkMode ? "text-slate-200" : "text-slate-800"
                                                                )}>
                                                                  {otherDrug.name}
                                                                </div>
                                                                {otherDrug.activeIngredients && otherDrug.activeIngredients.length > 0 && (
                                                                  <div className={cn(
                                                                    "text-[9px] truncate",
                                                                    isDarkMode ? "text-slate-500" : "text-slate-400"
                                                                  )}>
                                                                    {otherDrug.activeIngredients.map((ai) => ai.name).join(", ")}
                                                                  </div>
                                                                )}
                                                              </div>
                                                              <ExternalLink size={11} className="text-slate-400 group-hover/drug-item:text-emerald-500 shrink-0" />
                                                            </button>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>

                                                    {/* Pointer triangle facing up (desktop only) */}
                                                    <div className={cn(
                                                      "hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent",
                                                      isDarkMode ? "border-b-slate-900" : "border-b-white"
                                                    )} />
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {(drug.indications || []).length === 0 &&
                            !drug.mechanismOfAction && (
                              <div className="text-center py-20 opacity-40">
                                <Info size={48} className="mx-auto mb-4" />
                                <p className="font-black uppercase tracking-tighter">
                                  Thuốc này chưa cập nhật Chỉ định.
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Contraindications Tab */}
                    {activeDetailTab === "contraindications" && (
                      <div className="space-y-6">
                        {drug.contraindications && drug.contraindications.length > 0 && (
                          <div
                            className={cn(
                              "p-6 rounded-3xl border shadow-sm",
                              isDarkMode
                                ? "bg-rose-900/10 border-rose-900/20"
                                : "bg-rose-50/20 border-rose-100",
                            )}
                          >
                            <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600 mb-4">
                              <ShieldAlert size={16} /> Chống chỉ định
                            </h5>
                            <div className="divide-y divide-rose-100/30 dark:divide-rose-950/20">
                              {drug.contraindications.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="py-3 flex items-start gap-4 first:pt-0 last:pb-0"
                                >
                                  <div
                                    className={cn(
                                      "p-1.5 rounded-xl shrink-0 mt-0.5",
                                      isDarkMode
                                        ? "bg-rose-950/40 text-rose-400"
                                        : "bg-rose-50 text-rose-600",
                                    )}
                                  >
                                    <ShieldAlert size={14} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                      {/* Phân loại Badge */}
                                      {item.type && (
                                        <span
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                            isDarkMode
                                              ? "bg-rose-950/30 border-rose-900/30 text-rose-400"
                                              : "bg-rose-50 border-rose-100 text-rose-700",
                                          )}
                                        >
                                          {item.type === "Other"
                                            ? "Khác"
                                            : item.type === "Drug"
                                              ? "Thuốc"
                                              : item.type === "Weight"
                                                ? "Cân nặng"
                                                : item.type === "Age"
                                                  ? "Tuổi"
                                                  : item.type === "ICD-10"
                                                    ? "ICD-10"
                                                    : item.type || "Chung"}
                                        </span>
                                      )}

                                      {/* Mức độ nghiêm trọng Badge nếu có */}
                                      {item.severity && (
                                        <span
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                            item.severity === "Chống chỉ định"
                                              ? isDarkMode
                                                ? "bg-red-950/30 border-red-900/30 text-red-400"
                                                : "bg-red-50 border-red-100 text-red-700"
                                              : item.severity === "Phối hợp nguy hiểm"
                                                  ? isDarkMode
                                                    ? "bg-rose-950/30 border-rose-900/30 text-rose-400"
                                                    : "bg-rose-50 border-rose-100 text-rose-700"
                                              : item.severity === "Cần cân nhắc lợi, hại"
                                                ? isDarkMode
                                                  ? "bg-orange-950/30 border-orange-900/30 text-orange-400"
                                                  : "bg-orange-50 border-orange-100 text-orange-700"
                                                : item.severity === "Cần theo dõi người bệnh"
                                                  ? isDarkMode
                                                    ? "bg-purple-950/30 border-purple-900/30 text-purple-400"
                                                    : "bg-purple-50 border-purple-100 text-purple-700"
                                                  : isDarkMode
                                                    ? "bg-blue-950/30 border-blue-900/30 text-blue-400"
                                                    : "bg-blue-50 border-blue-100 text-blue-700",
                                          )}
                                        >
                                          {item.severity}
                                        </span>
                                      )}
                                    </div>

                                    {item.title && (
                                      <h5 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-1">
                                        {item.title}
                                      </h5>
                                    )}
                                    <p
                                      className={cn(
                                        "text-xs sm:text-[13px] leading-relaxed font-semibold",
                                        isDarkMode
                                          ? "text-slate-200"
                                          : "text-slate-800",
                                      )}
                                    >
                                      {item.content}
                                    </p>

                                    {/* Gợi ý mốc tuổi & mốc sinh */}
                                    {(() => {
                                      const cfg = item.ageConfig as any;
                                      if (item.type !== "Age" || !cfg) return null;
                                      const valBefore = typeof cfg.valueBefore === "number" ? cfg.valueBefore : null;
                                      const valAfter = typeof cfg.value === "number" ? cfg.value : null;
                                      if (valBefore === null && valAfter === null) return null;

                                      const calcDate = (val: number) => {
                                        const d = new Date();
                                        if (cfg.unit === "months") d.setMonth(d.getMonth() - val);
                                        else d.setFullYear(d.getFullYear() - val);
                                        return d.toLocaleDateString("vi-VN");
                                      };

                                      const dateBefore = valBefore !== null ? calcDate(valBefore) : null;
                                      const dateAfter = valAfter !== null ? calcDate(valAfter) : null;

                                      const display = [dateAfter, dateBefore].filter(Boolean).join(" – ");

                                      return display && canSeeAgeContraindications ? (
                                        <div className="mt-2">
                                          <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold",
                                            isDarkMode
                                              ? "bg-slate-800 border-slate-700 text-slate-300"
                                              : "bg-white border-slate-200 text-slate-600 shadow-xs",
                                          )}>
                                            <Calendar size={11} className="shrink-0 text-rose-400" />
                                            <span>Mốc sinh: {display}</span>
                                          </div>
                                        </div>
                                      ) : null;
                                    })()}

                                    {/* Gợi ý ICD-10 */}
                                    {canSeeIcdSuggestions &&
                                      item.icd10s &&
                                      item.icd10s.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {[...item.icd10s]
                                            .sort((a, b) => a.localeCompare(b, "vi"))
                                            .map((fullName, idx) => {
                                              const parts = fullName.split(" - ");
                                              const code = parts[0];
                                              const icdObj = icdList.find(
                                                (icd) => icd.code === code,
                                              );
                                              const desc =
                                                parts.slice(1).join(" - ") ||
                                                icdObj?.description;
                                              return (
                                                <div
                                                  key={idx}
                                                  className="flex items-center gap-1"
                                                >
                                                  <div
                                                    className={cn(
                                                      "px-2 py-1 rounded-lg text-[10px] font-black border transition-all flex items-center gap-2",
                                                      isDarkMode
                                                        ? "bg-rose-900/20 border-rose-900/30 text-rose-400"
                                                        : "bg-rose-50 border-rose-100 text-rose-600",
                                                    )}
                                                  >
                                                    <span>{code}</span>
                                                    {desc && (
                                                      <span className="opacity-60 font-bold">
                                                        {desc}
                                                      </span>
                                                    )}
                                                  </div>
                                                  {icdObj && renderIcdRules(icdObj)}
                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}

                                    {/* Gợi ý Thuốc */}
                                    {item.drugs && item.drugs.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {item.drugs.map((drugName: string, idx: number) => {
                                          const isCypSpecial = drugName === "CYP3A4";
                                          return (
                                            <div
                                              key={idx}
                                              className={cn(
                                                "px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 shadow-xs",
                                                isCypSpecial
                                                  ? isDarkMode
                                                    ? "bg-amber-900/25 border-amber-900/40 text-amber-400"
                                                    : "bg-amber-50 border-amber-100 text-amber-700"
                                                  : isDarkMode
                                                    ? "bg-rose-900/25 border-rose-900/40 text-rose-400"
                                                    : "bg-rose-50 border-rose-100 text-rose-700",
                                              )}
                                            >
                                              <span>
                                                {isCypSpecial ? "⭐" : "💊"}
                                              </span>
                                              <span>{drugName}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(drug.contraindications || []).length === 0 && (
                          <div className="text-center py-20 opacity-40">
                            <ShieldAlert size={48} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-tighter">
                              Thuốc này không có Chống chỉ định.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dosage Tab */}
                    {activeDetailTab === "dosage" && (
                      <div className="space-y-6">
                        {drug.generalAdministration && (
                          <div
                            className={cn(
                              "p-8 rounded-[32px] border relative overflow-hidden",
                              isDarkMode
                                ? "bg-amber-900/10 border-amber-900/20"
                                : "bg-amber-50/20 border-amber-100 shadow-sm",
                            )}
                          >
                            <Clock
                              className="absolute right-6 top-6 text-amber-500/10"
                              size={80}
                            />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
                              Sử dụng chung
                            </h4>
                            <div className={cn(
                              "text-xs sm:text-sm leading-relaxed relative z-10 font-medium whitespace-pre-line",
                              isDarkMode ? "text-slate-300" : "text-slate-650"
                            )}>
                              {drug.generalAdministration}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(drug.dosageAndAdministration || []).map(
                            (item, idx) => {
                              const prevItem = idx > 0 ? (drug.dosageAndAdministration || [])[idx - 1] : null;
                              const prevGroup = prevItem ? (prevItem.groupTitle || "").trim() : null;
                              const currentGroup = (item.groupTitle || "").trim();
                              const isNewGroup = idx === 0 || currentGroup !== prevGroup;

                              return (
                                <React.Fragment key={idx}>
                                  {isNewGroup && currentGroup ? (
                                    <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-5 mb-1.5 first:mt-2">
                                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full shrink-0"></div>
                                      <h4 className={cn(
                                        "text-xs font-black uppercase tracking-widest",
                                        isDarkMode ? "text-emerald-400" : "text-emerald-600"
                                      )}>
                                        {currentGroup}
                                      </h4>
                                    </div>
                                  ) : null}
                                  <div
                                    className={cn(
                                      "rounded-[24px] border flex flex-col justify-between overflow-hidden",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700"
                                        : "bg-white border-slate-100 shadow-sm",
                                    )}
                                  >


                                <div className="p-6 flex flex-col flex-1">
                                  {/* Tiêu đề Liều lượng / Đối tượng cụ thể (text tự điền) */}
                                  {item.category &&
                                    item.category.trim() !== "" && (
                                      <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-1.5 h-5 bg-emerald-500 rounded-full shrink-0"></div>
                                        <h5 className="font-black text-sm tracking-tight">
                                          {item.category}
                                        </h5>
                                      </div>
                                    )}

                                  {/* ── Độ tuổi và Cân nặng sử dụng ── */}
                                  {canSeeDosageSuggestions &&
                                    ((item.ageMin !== undefined &&
                                      item.ageMin !== null) ||
                                      item.ageMax !== undefined ||
                                      (item.weightMin !== undefined &&
                                        item.weightMin !== null) ||
                                      item.weightMax !== undefined ||
                                      (item.crclMin !== undefined &&
                                        item.crclMin !== null) ||
                                      item.crclMax !== undefined) && (
                                      <div className="flex items-center gap-3 flex-wrap mb-3">
                                        {/* Age block */}
                                        {((item.ageMin !== undefined &&
                                          item.ageMin !== null) ||
                                          item.ageMax !== undefined) && (
                                          <div className="flex items-center gap-2">
                                            <div
                                              className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black",
                                                isDarkMode
                                                  ? "bg-blue-900/30 border-blue-800/50 text-blue-300"
                                                  : "bg-blue-50 border-blue-200 text-blue-700",
                                              )}
                                            >
                                              <Baby
                                                size={12}
                                                className="text-blue-500"
                                              />
                                              <span className="opacity-60 uppercase font-bold">
                                                Từ
                                              </span>
                                              <span>
                                                {item.ageMin ?? 0} tuổi
                                              </span>
                                            </div>

                                            <svg
                                              className="text-blue-400 shrink-0"
                                              width="12"
                                              height="8"
                                              viewBox="0 0 16 10"
                                              fill="none"
                                            >
                                              <path
                                                d="M1 5h14M10 1l5 4-5 4"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>

                                            {item.ageMax !== null &&
                                            item.ageMax !== undefined ? (
                                              <div
                                                className={cn(
                                                  "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black",
                                                  isDarkMode
                                                    ? "bg-indigo-900/30 border-indigo-800/50 text-indigo-300"
                                                    : "bg-indigo-50 border-indigo-200 text-indigo-700",
                                                )}
                                              >
                                                <span className="opacity-60 uppercase font-bold">
                                                  Đến
                                                </span>
                                                <span>{item.ageMax} tuổi</span>
                                              </div>
                                            ) : (
                                              <div
                                                className={cn(
                                                  "px-2 py-1 rounded-lg border text-[10px] font-black italic",
                                                  isDarkMode
                                                    ? "bg-slate-800 border-slate-700 text-slate-400"
                                                    : "bg-slate-100 border-slate-200 text-slate-500",
                                                )}
                                              >
                                                Trở lên
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Separator if both exist */}
                                        {((item.ageMin !== undefined &&
                                          item.ageMin !== null) ||
                                          item.ageMax !== undefined) &&
                                          ((item.weightMin !== undefined &&
                                            item.weightMin !== null) ||
                                            item.weightMax !== undefined) && (
                                            <div
                                              className={cn(
                                                "w-px h-5 mx-1",
                                                isDarkMode
                                                  ? "bg-slate-700"
                                                  : "bg-slate-200",
                                              )}
                                            />
                                          )}

                                        {/* Weight block */}
                                        {((item.weightMin !== undefined &&
                                          item.weightMin !== null) ||
                                          item.weightMax !== undefined) && (
                                          <div className="flex items-center gap-2">
                                            <div
                                              className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black",
                                                isDarkMode
                                                  ? "bg-emerald-900/30 border-emerald-800/50 text-emerald-300"
                                                  : "bg-emerald-50 border-emerald-200 text-emerald-700",
                                              )}
                                            >
                                              <span className="opacity-60 uppercase font-bold">
                                                Từ
                                              </span>
                                              <span>
                                                {item.weightMin ?? 0} kg
                                              </span>
                                            </div>

                                            <svg
                                              className="text-emerald-400 shrink-0"
                                              width="12"
                                              height="8"
                                              viewBox="0 0 16 10"
                                              fill="none"
                                            >
                                              <path
                                                d="M1 5h14M10 1l5 4-5 4"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>

                                            {item.weightMax !== null &&
                                            item.weightMax !== undefined ? (
                                              <div
                                                className={cn(
                                                  "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black",
                                                  isDarkMode
                                                    ? "bg-teal-900/30 border-teal-800/50 text-teal-300"
                                                    : "bg-teal-50 border-teal-200 text-teal-700",
                                                )}
                                              >
                                                <span className="opacity-60 uppercase font-bold">
                                                  Đến
                                                </span>
                                                <span>{item.weightMax} kg</span>
                                              </div>
                                            ) : (
                                              <div
                                                className={cn(
                                                  "px-2 py-1 rounded-lg border text-[10px] font-black italic",
                                                  isDarkMode
                                                    ? "bg-slate-800 border-slate-700 text-slate-400"
                                                    : "bg-slate-100 border-slate-200 text-slate-500",
                                                )}
                                              >
                                                Trở lên
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Separator if Weight/Age exists and CrCl exists */}
                                        {(((item.ageMin !== undefined &&
                                          item.ageMin !== null) ||
                                          item.ageMax !== undefined ||
                                          (item.weightMin !== undefined &&
                                            item.weightMin !== null) ||
                                          item.weightMax !== undefined)) &&
                                          ((item.crclMin !== undefined &&
                                            item.crclMin !== null) ||
                                            item.crclMax !== undefined) && (
                                            <div
                                              className={cn(
                                                "w-px h-5 mx-1",
                                                isDarkMode
                                                  ? "bg-slate-700"
                                                  : "bg-slate-200",
                                              )}
                                            />
                                          )}

                                        {/* CrCl block */}
                                        {((item.crclMin !== undefined &&
                                          item.crclMin !== null) ||
                                          item.crclMax !== undefined) && (
                                          <div className="flex items-center gap-2">
                                            <div
                                              className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black",
                                                isDarkMode
                                                  ? "bg-purple-900/30 border-purple-800/50 text-purple-300"
                                                  : "bg-purple-50 border-purple-200 text-purple-700",
                                              )}
                                            >
                                              <Activity
                                                size={12}
                                                className="text-purple-500 animate-pulse"
                                              />
                                              <span className="opacity-60 uppercase font-bold">
                                                CrCl từ
                                              </span>
                                              <span>
                                                {item.crclMin ?? 0} mL/min
                                              </span>
                                            </div>

                                            <svg
                                              className="text-purple-400 shrink-0"
                                              width="12"
                                              height="8"
                                              viewBox="0 0 16 10"
                                              fill="none"
                                            >
                                              <path
                                                d="M1 5h14M10 1l5 4-5 4"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>

                                            {item.crclMax !== null &&
                                            item.crclMax !== undefined ? (
                                              <div
                                                className={cn(
                                                  "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black",
                                                  isDarkMode
                                                    ? "bg-fuchsia-900/30 border-fuchsia-800/50 text-fuchsia-300"
                                                    : "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700",
                                                )}
                                              >
                                                <span className="opacity-60 uppercase font-bold">
                                                  Đến
                                                </span>
                                                <span>{item.crclMax} mL/min</span>
                                              </div>
                                            ) : (
                                              <div
                                                className={cn(
                                                  "px-2 py-1 rounded-lg border text-[10px] font-black italic",
                                                  isDarkMode
                                                    ? "bg-slate-800 border-slate-700 text-slate-400"
                                                    : "bg-slate-100 border-slate-200 text-slate-500",
                                                )}
                                              >
                                                Không giới hạn
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                  <div className={cn(
                                    "text-xs sm:text-sm leading-relaxed font-medium whitespace-pre-line mb-4",
                                    isDarkMode ? "text-slate-300" : "text-slate-600"
                                  )}>
                                    {item.content}
                                  </div>

                                  {/* Đối tượng/Phân loại và Thời điểm uống thuốc ngang hàng */}
                                  {(() => {
                                    const filteredGroups = item.patientGroups || [];

                                    const hasPatientGroups = filteredGroups.length > 0 && canSeeDosageSuggestions;
                                    const hasAdminTime = (item as any).administrationTime && canSeeIntakeTime;

                                    if (!hasPatientGroups && !hasAdminTime) return null;

                                    return (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                        {/* Left Side: Đối tượng / Phân loại (Chọn nhãn dán) */}
                                        {hasPatientGroups ? (
                                          <div>
                                            <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider block mb-1">
                                              Đối tượng / Phân loại:
                                            </span>
                                            <div
                                              className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-bold flex flex-wrap items-center gap-1.5 min-h-[38px]",
                                                isDarkMode
                                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                                  : "bg-emerald-50 border border-emerald-100 text-emerald-800",
                                              )}
                                            >
                                              {filteredGroups.map(
                                                (group: string, gIdx: number) => (
                                                  <span
                                                    key={gIdx}
                                                    className={cn(
                                                      "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border leading-none",
                                                      isDarkMode
                                                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/30"
                                                        : "bg-emerald-100/70 text-emerald-700 border-emerald-200/50",
                                                    )}
                                                  >
                                                    {group}
                                                  </span>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="hidden sm:block"></div>
                                        )}

                                        {/* Right Side: Thời điểm uống thuốc */}
                                        {hasAdminTime ? (
                                          <div>
                                            <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider block mb-1">
                                              Thời điểm uống thuốc:
                                            </span>
                                            <div
                                              className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[38px]",
                                                isDarkMode
                                                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                                  : "bg-blue-50 border border-blue-100 text-blue-800",
                                              )}
                                            >
                                              <Clock
                                                size={13}
                                                className="text-blue-500 shrink-0"
                                              />
                                              <span>{(item as any).administrationTime}</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="hidden sm:block"></div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Cử dùng trong ngày / Liệu trình */}
                                  {canSeeDosageSuggestions &&
                                    (() => {
                                      const currentSchedules: any[] =
                                        item.schedules &&
                                        item.schedules.length > 0
                                          ? item.schedules
                                          : item.morning ||
                                              item.noon ||
                                              item.afternoon ||
                                              item.night ||
                                              item.periodStart ||
                                              item.periodEnd
                                            ? [
                                                {
                                                  periodStart: item.periodStart,
                                                  periodEnd: item.periodEnd,
                                                  morning: item.morning,
                                                  noon: item.noon,
                                                  afternoon: item.afternoon,
                                                  night: item.night,
                                                },
                                              ]
                                            : [];

                                      const hasAnyQuantity =
                                        currentSchedules.some(
                                          (s: any) =>
                                            (s.morning !== undefined &&
                                              s.morning !== null &&
                                              String(s.morning).trim() !==
                                                "") ||
                                            (s.noon !== undefined &&
                                              s.noon !== null &&
                                              String(s.noon).trim() !== "") ||
                                            (s.afternoon !== undefined &&
                                              s.afternoon !== null &&
                                              String(s.afternoon).trim() !==
                                                "") ||
                                            (s.night !== undefined &&
                                              s.night !== null &&
                                              String(s.night).trim() !== "") ||
                                            (s.totalDay !== undefined &&
                                              s.totalDay !== null &&
                                              String(s.totalDay).trim() !== ""),
                                        );

                                      const hasAnyDosage =
                                        currentSchedules.some(
                                          (s: any) =>
                                            (s.dosageMorning !== undefined &&
                                              s.dosageMorning !== null &&
                                              String(s.dosageMorning).trim() !==
                                                "") ||
                                            (s.dosageNoon !== undefined &&
                                              s.dosageNoon !== null &&
                                              String(s.dosageNoon).trim() !==
                                                "") ||
                                            (s.dosageAfternoon !== undefined &&
                                              s.dosageAfternoon !== null &&
                                              String(
                                                s.dosageAfternoon,
                                              ).trim() !== "") ||
                                            (s.dosageNight !== undefined &&
                                              s.dosageNight !== null &&
                                              String(s.dosageNight).trim() !==
                                                "") ||
                                            (s.dosageTotalDay !== undefined &&
                                              s.dosageTotalDay !== null &&
                                              String(
                                                s.dosageTotalDay,
                                              ).trim() !== ""),
                                        );

                                      const hasAnyWeight =
                                        currentSchedules.some(
                                          (s: any) =>
                                            (s.weightMorning !== undefined &&
                                              s.weightMorning !== null &&
                                              String(s.weightMorning).trim() !==
                                                "") ||
                                            (s.weightNoon !== undefined &&
                                              s.weightNoon !== null &&
                                              String(s.weightNoon).trim() !==
                                                "") ||
                                             (s.weightAfternoon !== undefined &&
                                               s.weightAfternoon !== null &&
                                               String(
                                                 s.weightAfternoon,
                                               ).trim() !== "") ||
                                            (s.weightNight !== undefined &&
                                              s.weightNight !== null &&
                                              String(s.weightNight).trim() !==
                                                "") ||
                                            (s.weightTotalDay !== undefined &&
                                              s.weightTotalDay !== null &&
                                              String(
                                                s.weightTotalDay,
                                              ).trim() !== ""),
                                        );

                                      if (!hasAnyQuantity && !hasAnyDosage && !hasAnyWeight)
                                        return null;

                                      const availableModes: ("quantity" | "dosage" | "weight")[] = [];
                                      if (hasAnyQuantity) availableModes.push("quantity");
                                      if (hasAnyDosage) availableModes.push("dosage");
                                      if (hasAnyWeight) availableModes.push("weight");

                                      const showDisplayTabs = availableModes.length > 1;
                                      let localDisplayMode: "quantity" | "dosage" | "weight" = "quantity";
                                      if (showDisplayTabs) {
                                        if (availableModes.includes(dosageDisplayMode)) {
                                          localDisplayMode = dosageDisplayMode;
                                        } else {
                                          localDisplayMode = availableModes[0];
                                        }
                                      } else {
                                        localDisplayMode = availableModes[0];
                                      }

                                      const formatMergedValue = (
                                        qVal?: string,
                                        dVal?: string,
                                        wVal?: string,
                                        qUnit?: string,
                                        dUnit?: string,
                                        wUnit?: string,
                                        weightDoseType?: string,
                                      ) => {
                                        if (localDisplayMode === "quantity") {
                                          if (!qVal) return "";
                                          return (
                                            qVal + (qUnit ? ` ${qUnit}` : "")
                                          );
                                        } else if (localDisplayMode === "dosage") {
                                          if (!dVal) return "";
                                          return (
                                            dVal + (dUnit ? ` ${dUnit}` : "")
                                          );
                                        } else {
                                          if (!wVal) return "";
                                          const base = wVal + (wUnit ? " " + wUnit : "");
                                          return weightDoseType === "per_day" ? `${base}/kg/ngày` : `${base}/kg/lần`;
                                        }
                                      };

                                      const firstSchedule =
                                        (currentSchedules[0] || {}) as any;
                                      const rawQtyUnit = (
                                        firstSchedule.quantityUnit || ""
                                      ).trim();
                                      const rawDsgUnit = (
                                        firstSchedule.dosageUnit || ""
                                      ).trim();
                                      const rawWgtUnit = (
                                        firstSchedule.weightUnit || ""
                                      ).trim();

                                      const qUnitLabel = rawQtyUnit
                                        ? `Số lượng (${rawQtyUnit})`
                                        : "Số lượng / Liều dùng";
                                      const dUnitLabel = rawDsgUnit
                                        ? `Hàm lượng (${rawDsgUnit})`
                                        : "Hàm lượng hoạt chất";
                                      const wUnitLabel = rawWgtUnit
                                        ? `Theo Số kg (${rawWgtUnit})`
                                        : "Theo Số kg";

                                      return (
                                        <div
                                          className={cn(
                                            "mt-2 pt-4 border-t",
                                            isDarkMode
                                              ? "border-slate-700/60"
                                              : "border-slate-100",
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 border-b border-dashed pb-3",
                                              isDarkMode
                                                ? "border-slate-800"
                                                : "border-slate-100",
                                            )}
                                          >
                                            <div className="text-[10px] font-black uppercase text-emerald-500 tracking-widest px-0.5">
                                              Liệu trình & Cử dùng:
                                            </div>
                                            {showDisplayTabs && (
                                              <div
                                                className={cn(
                                                  "flex items-center p-0.5 rounded-lg gap-1",
                                                  isDarkMode
                                                    ? "bg-slate-800"
                                                    : "bg-slate-100",
                                                )}
                                              >
                                                {hasAnyQuantity && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setDosageDisplayMode(
                                                        "quantity",
                                                      )
                                                    }
                                                    className={cn(
                                                      "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider",
                                                      localDisplayMode ===
                                                        "quantity"
                                                        ? isDarkMode
                                                          ? "bg-slate-700 text-emerald-400 font-extrabold shadow-sm"
                                                          : "bg-white text-emerald-700 font-extrabold shadow-sm"
                                                        : isDarkMode
                                                          ? "text-slate-400 hover:text-slate-200"
                                                          : "text-slate-500 hover:text-slate-700",
                                                    )}
                                                  >
                                                    {qUnitLabel}
                                                  </button>
                                                )}
                                                {hasAnyDosage && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setDosageDisplayMode(
                                                        "dosage",
                                                      )
                                                    }
                                                    className={cn(
                                                      "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider",
                                                      localDisplayMode ===
                                                        "dosage"
                                                        ? isDarkMode
                                                          ? "bg-slate-700 text-emerald-400 font-extrabold shadow-sm"
                                                          : "bg-white text-emerald-700 font-extrabold shadow-sm"
                                                        : isDarkMode
                                                          ? "text-slate-400 hover:text-slate-200"
                                                          : "text-slate-500 hover:text-slate-700",
                                                    )}
                                                  >
                                                    {dUnitLabel}
                                                  </button>
                                                )}
                                                {hasAnyWeight && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setDosageDisplayMode(
                                                        "weight",
                                                      )
                                                    }
                                                    className={cn(
                                                      "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider",
                                                      localDisplayMode ===
                                                        "weight"
                                                        ? isDarkMode
                                                          ? "bg-slate-700 text-emerald-400 font-extrabold shadow-sm"
                                                          : "bg-white text-emerald-700 font-extrabold shadow-sm"
                                                        : isDarkMode
                                                          ? "text-slate-400 hover:text-slate-200"
                                                          : "text-slate-500 hover:text-slate-700",
                                                    )}
                                                  >
                                                    {wUnitLabel}
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          <div className="space-y-3">
                                            {currentSchedules.map(
                                              (schedule, sIdx) => (
                                                <div
                                                  key={sIdx}
                                                  className={cn(
                                                    "p-3 rounded-xl border relative",
                                                    isDarkMode
                                                      ? "bg-slate-900/40 border-slate-800"
                                                      : "bg-slate-50 border-slate-200",
                                                  )}
                                                >
                                                  <div className="flex items-center justify-between mb-2.5">
                                                    {schedule.name ||
                                                    currentSchedules.length >
                                                      1 ? (
                                                      <div
                                                        className={cn(
                                                          "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                                                          isDarkMode
                                                            ? "bg-emerald-900/30 text-emerald-400"
                                                            : "bg-emerald-100 text-emerald-700",
                                                        )}
                                                      >
                                                        {schedule.name ||
                                                          `Liệu trình ${sIdx + 1}`}
                                                      </div>
                                                    ) : (
                                                      <div></div>
                                                    )}

                                                    {(schedule.periodStart ||
                                                      schedule.periodEnd) && (
                                                      <div className="flex items-center gap-1.5 justify-end">
                                                        <Calendar
                                                          size={13}
                                                          className={cn(
                                                            "shrink-0",
                                                            isDarkMode
                                                              ? "text-blue-400"
                                                              : "text-blue-600",
                                                          )}
                                                        />
                                                        <div className="text-[11px] font-bold">
                                                          {schedule.periodStart && (
                                                            <span
                                                              className={
                                                                isDarkMode
                                                                  ? "text-slate-300"
                                                                  : "text-slate-700"
                                                              }
                                                            >
                                                              Từ{" "}
                                                              <span
                                                                className={
                                                                  isDarkMode
                                                                    ? "text-blue-400"
                                                                    : "text-blue-600"
                                                                }
                                                              >
                                                                {
                                                                  schedule.periodStart
                                                                }
                                                              </span>
                                                            </span>
                                                          )}
                                                          {schedule.periodStart &&
                                                            schedule.periodEnd && (
                                                              <span className="mx-1.5 text-slate-500">
                                                                —
                                                              </span>
                                                            )}
                                                          {schedule.periodEnd && (
                                                            <span
                                                              className={
                                                                isDarkMode
                                                                  ? "text-slate-300"
                                                                  : "text-slate-700"
                                                              }
                                                            >
                                                              Đến{" "}
                                                              <span
                                                                className={
                                                                  isDarkMode
                                                                    ? "text-blue-400"
                                                                    : "text-blue-600"
                                                                }
                                                              >
                                                                {
                                                                  schedule.periodEnd
                                                                }
                                                              </span>
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>

                                                  <div className="grid grid-cols-5 gap-1.5 mt-1">
                                                    {[
                                                      {
                                                        label: "Sáng",
                                                        value:
                                                          formatMergedValue(schedule.morning, schedule.dosageMorning, schedule.weightMorning, schedule.quantityUnit, schedule.dosageUnit, schedule.weightUnit, schedule.weightDoseType),
                                                        icon: (
                                                          <Sunrise
                                                            size={11}
                                                            className="text-sky-500 shrink-0"
                                                          />
                                                        ),
                                                        bgColor: isDarkMode
                                                          ? "bg-sky-500/10 text-sky-300"
                                                          : "bg-sky-50 text-sky-700",
                                                      },
                                                      {
                                                        label: "Trưa",
                                                        value:
                                                          formatMergedValue(schedule.noon, schedule.dosageNoon, schedule.weightNoon, schedule.quantityUnit, schedule.dosageUnit, schedule.weightUnit, schedule.weightDoseType),
                                                        icon: (
                                                          <Sun
                                                            size={11}
                                                            className="text-amber-500 shrink-0"
                                                          />
                                                        ),
                                                        bgColor: isDarkMode
                                                          ? "bg-amber-500/10 text-amber-300"
                                                          : "bg-amber-50 text-amber-700",
                                                      },
                                                      {
                                                        label: "Chiều",
                                                        value:
                                                          formatMergedValue(schedule.afternoon, schedule.dosageAfternoon, schedule.weightAfternoon, schedule.quantityUnit, schedule.dosageUnit, schedule.weightUnit, schedule.weightDoseType),
                                                        icon: (
                                                          <Sunset
                                                            size={11}
                                                            className="text-orange-500 shrink-0"
                                                          />
                                                        ),
                                                        bgColor: isDarkMode
                                                          ? "bg-orange-500/10 text-orange-300"
                                                          : "bg-orange-50 text-orange-700",
                                                      },
                                                      {
                                                        label: "Tối",
                                                        value:
                                                          formatMergedValue(schedule.night, schedule.dosageNight, schedule.weightNight, schedule.quantityUnit, schedule.dosageUnit, schedule.weightUnit, schedule.weightDoseType),
                                                        icon: (
                                                          <Moon
                                                            size={11}
                                                            className="text-indigo-500 shrink-0"
                                                          />
                                                        ),
                                                        bgColor: isDarkMode
                                                          ? "bg-indigo-500/10 text-indigo-300"
                                                          : "bg-indigo-50 text-indigo-700",
                                                      },
                                                      {
                                                        label: "Tổng",
                                                        value:
                                                          formatMergedValue(schedule.totalDay, schedule.dosageTotalDay, schedule.weightTotalDay, schedule.quantityUnit, schedule.dosageUnit, schedule.weightUnit, schedule.weightDoseType),
                                                        icon: (
                                                          <Hash
                                                            size={11}
                                                            className="text-emerald-500 shrink-0"
                                                          />
                                                        ),
                                                        bgColor: isDarkMode
                                                          ? "bg-emerald-500/10 text-emerald-300"
                                                          : "bg-emerald-50 text-emerald-700",
                                                      },
                                                    ].map((c, cIdx) => (
                                                      <div
                                                        key={cIdx}
                                                        className={cn(
                                                          "p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all",
                                                          c.value
                                                            ? c.bgColor +
                                                                " border-transparent font-bold scale-100 shadow-sm"
                                                            : isDarkMode
                                                              ? "opacity-25 border-slate-700 text-slate-550"
                                                              : "opacity-30 border-slate-200 text-slate-400",
                                                        )}
                                                      >
                                                        <div className="flex items-center gap-1 mb-1">
                                                          {c.icon}
                                                          <span className="text-[8px] font-black uppercase tracking-wider">
                                                            {c.label}
                                                          </span>
                                                        </div>
                                                        <span className="text-xs font-mono max-w-full leading-tight">
                                                          {c.value || "—"}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                  {schedule.quantityMaxDose && localDisplayMode === "quantity" && (
                                                    <div className={cn(
                                                      "mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-dashed",
                                                      isDarkMode
                                                        ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                                    )}>
                                                      <span className="font-bold text-rose-500">⚠️ Liều tối đa:</span>
                                                      <span>{schedule.quantityMaxDose}{schedule.quantityUnit ? ` ${schedule.quantityUnit}` : ""}/ngày</span>
                                                    </div>
                                                  )}

                                                  {schedule.dosageMaxDose && localDisplayMode === "dosage" && (
                                                    <div className={cn(
                                                      "mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-dashed",
                                                      isDarkMode
                                                        ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                                    )}>
                                                      <span className="font-bold text-rose-500">⚠️ Liều tối đa:</span>
                                                      <span>{schedule.dosageMaxDose}{schedule.dosageUnit ? ` ${schedule.dosageUnit}` : ""}/ngày</span>
                                                    </div>
                                                  )}

                                                  {schedule.weightMaxDose && localDisplayMode === "weight" && (
                                                    <div className={cn(
                                                      "mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-dashed",
                                                      isDarkMode
                                                        ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                                    )}>
                                                      <span className="font-bold text-rose-500">⚠️ Liều tối đa:</span>
                                                      <span>{schedule.weightMaxDose}{schedule.weightUnit ? ` ${schedule.weightUnit}` : ""}/ngày</span>
                                                    </div>
                                                  )}

                                                  {schedule.intervalValue && schedule.intervalUnit && (
                                                    <div className={cn(
                                                      "mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border",
                                                      isDarkMode
                                                        ? "bg-blue-950/40 text-blue-300 border-blue-905/50"
                                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                                    )}>
                                                      <span className="shrink-0 font-black text-[10px] uppercase tracking-wider">⏱️ Khoảng cách:</span>
                                                      <span>Uống cách nhau <strong>{schedule.intervalValue}</strong> {schedule.intervalUnit}</span>
                                                    </div>
                                                  )}

                                                  {(() => {
                                                    const quantityVal = schedule.dosePerTime;
                                                    const dosageVal = schedule.dosageDosePerTime;
                                                    const weightVal = schedule.weightDosePerTime;

                                                    let activeVal = "";
                                                    let currentUnit = "";

                                                    if (localDisplayMode === "quantity" && quantityVal) {
                                                      activeVal = quantityVal;
                                                      currentUnit = schedule.quantityUnit || "viên";
                                                    } else if (localDisplayMode === "dosage" && dosageVal) {
                                                      activeVal = dosageVal;
                                                      currentUnit = schedule.dosageUnit || "mg";
                                                    } else if (localDisplayMode === "weight" && weightVal) {
                                                      activeVal = weightVal;
                                                      currentUnit = schedule.weightUnit || "mg/kg";
                                                    } else {
                                                      if (quantityVal) {
                                                        activeVal = quantityVal;
                                                        currentUnit = schedule.quantityUnit || "viên";
                                                      } else if (dosageVal) {
                                                        activeVal = dosageVal;
                                                        currentUnit = schedule.dosageUnit || "mg";
                                                      } else if (weightVal) {
                                                        activeVal = weightVal;
                                                        currentUnit = schedule.weightUnit || "mg/kg";
                                                      }
                                                    }

                                                    let activeDoseWithUnit = activeVal ? activeVal.trim() : "";
                                                    if (activeDoseWithUnit && currentUnit) {
                                                      if (!activeDoseWithUnit.toLowerCase().includes(currentUnit.toLowerCase())) {
                                                        activeDoseWithUnit = `${activeDoseWithUnit} ${currentUnit}`;
                                                      }
                                                    }

                                                    if (!schedule.timesPerDay && !activeDoseWithUnit) return null;

                                                    return (
                                                      <div className={cn(
                                                        "mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border",
                                                        isDarkMode
                                                          ? "bg-indigo-950/40 text-indigo-300 border-indigo-900/50"
                                                          : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                                      )}>
                                                        <span className="shrink-0 font-black text-[10px] uppercase tracking-wider">🔁 Tần suất:</span>
                                                        <span>
                                                          {schedule.timesPerDay ? (
                                                            <>
                                                              Uống <strong>{schedule.timesPerDay}</strong> lần/ngày
                                                              {activeDoseWithUnit && (
                                                                <>, mỗi lần <strong>{activeDoseWithUnit}</strong></>
                                                              )}
                                                            </>
                                                          ) : (
                                                            <>Mỗi lần <strong>{activeDoseWithUnit}</strong></>
                                                          )}
                                                        </span>
                                                      </div>
                                                    );
                                                  })()}

                                                  {schedule.note && (
                                                    <div className={cn(
                                                      "mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-start gap-1.5 border border-dashed",
                                                      isDarkMode
                                                        ? "bg-slate-800/80 text-slate-300 border-slate-700/60"
                                                        : "bg-slate-100/50 text-slate-600 border-slate-200"
                                                    )}>
                                                      <span className={cn("font-bold shrink-0", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>📌 Ghi chú:</span>
                                                      <span className="italic">{schedule.note}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        },
                      )}
                        </div>

                        {drug.dosage && (
                          <div
                            className={cn(
                              "mt-6 p-5 sm:p-6 rounded-[24px] border",
                              isDarkMode
                                ? "bg-emerald-900/10 border-emerald-900/30"
                                : "bg-emerald-50/50 border-emerald-100",
                            )}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <FileText
                                size={16}
                                className={cn(
                                  isDarkMode
                                    ? "text-emerald-400"
                                    : "text-emerald-600",
                                )}
                              />
                              <h4
                                className={cn(
                                  "text-xs font-black uppercase tracking-widest",
                                  isDarkMode
                                    ? "text-emerald-400"
                                    : "text-emerald-700",
                                )}
                              >
                                Ghi chú chung
                              </h4>
                            </div>
                            <p
                              className={cn(
                                "text-sm leading-relaxed whitespace-pre-wrap",
                                isDarkMode
                                  ? "text-slate-300"
                                  : "text-slate-700",
                              )}
                            >
                              {drug.dosage}
                            </p>
                          </div>
                        )}

                        {(drug.dosageAndAdministration || []).length === 0 &&
                          !drug.generalAdministration &&
                          !drug.dosage && (
                            <div className="text-center py-20 opacity-40">
                              <Clock size={48} className="mx-auto mb-4" />
                              <p className="font-black uppercase tracking-tighter">
                                Thuốc này chưa cập nhật Liều lượng.
                              </p>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Side Effects Tab */}
                    {activeDetailTab === "side_effects" &&
                      (() => {
                        interface EnrichedADR {
                          name: string;
                          catalogItem?: any;
                          groupName: string;
                          ingredient?: string;
                        }

                        interface GroupedByCat {
                          category: string;
                          adrs: EnrichedADR[];
                        }

                        interface FrequencyGroup {
                          frequency: string;
                          categories: GroupedByCat[];
                        }

                        const hasSideEffects =
                          drug &&
                          ((Array.isArray(drug.sideEffects) &&
                            drug.sideEffects.length > 0) ||
                           (typeof drug.sideEffectsNote === "string" &&
                             drug.sideEffectsNote.trim() !== "") ||
                           (drug.activeIngredients || []).some(
                             (ai: any) =>
                               ai &&
                               ai.sideEffectsNote &&
                               ai.sideEffectsNote.trim() !== "",
                           ));
                        if (!hasSideEffects) {
                          return (
                            <div className="text-center py-20 opacity-40">
                              <AlertCircle size={48} className="mx-auto mb-4" />
                              <p className="font-black uppercase tracking-tighter">
                                Thuốc này chưa cập nhật Tác dụng phụ.
                              </p>
                            </div>
                          );
                        }

                        const selfActiveIngs = (drug?.activeIngredients || [])
                          .map((ai) => ai.name)
                          .filter(Boolean);

                        const isByIngredient =
                          drug?.sideEffectsType === "by_ingredient" ||
                          (!drug?.sideEffectsType && selfActiveIngs.length > 1);

                        // Normalize and enrich side effects: map string to object, and if by_ingredient is enabled with active ingredients,
                        // map unassigned side effects to the first active ingredient so they display on that ingredient's tab
                        const normalizedSideEffects = (drug.sideEffects || []).map((se: any) => {
                          const item = typeof se === "string" ? { frequency: "Chung", content: se } : se;
                          if (
                            isByIngredient &&
                            selfActiveIngs.length > 0 &&
                            item &&
                            typeof item === "object" &&
                            !item.ingredient
                          ) {
                            return { ...item, ingredient: selfActiveIngs[0] };
                          }
                          return item;
                        });

                        const activeIngredientsWithInfo = selfActiveIngs.filter(
                          (ingName) => {
                            const count = normalizedSideEffects.filter(
                              (item) =>
                                typeof item === "object" &&
                                item &&
                                isIngredientMatch(
                                  (item as any).ingredient,
                                  ingName,
                                  ingredients,
                                ),
                            ).length;
                            const activeIng = (
                              drug.activeIngredients || []
                            ).find(
                              (ai: any) =>
                                ai &&
                                ai.name &&
                                ai.name.toLowerCase() === ingName.toLowerCase(),
                            );
                            const hasNote = !!(
                              activeIng &&
                              activeIng.sideEffectsNote &&
                              activeIng.sideEffectsNote.trim() !== ""
                            );
                            return count > 0 || hasNote;
                          },
                        );

                        const hasUnassigned = normalizedSideEffects.some(
                          (item) =>
                            typeof item === "object" &&
                            item &&
                            !(item as any).ingredient,
                        );

                        const totalVisibleTabs =
                          activeIngredientsWithInfo.length +
                          (hasUnassigned ? 1 : 0);

                        const currentSelectedIngredient = selectedSideEffectIngredient;

                        const knownFrequencies = [
                          "Rất thường gặp (ADR ≥ 1/10)",
                          "Thường gặp (1/100 ≤ ADR < 1/10)",
                          "Ít gặp (1/1.000 ≤ ADR < 1/100)",
                          "Hiếm gặp (1/10.000 ≤ ADR < 1/1.000)",
                          "Rất hiếm gặp (ADR < 1/10.000)",
                          "Chưa rõ tần suất",
                        ];

                        const rawGroups: { [freq: string]: EnrichedADR[] } = {};

                        const filteredSideEffects = normalizedSideEffects.filter((se) => {
                          if (
                            !isByIngredient ||
                            currentSelectedIngredient === "all"
                          )
                            return true;

                          let itemIngredient = "";
                          if (se && typeof se === "object") {
                            itemIngredient = se.ingredient || "";
                          }

                          if (currentSelectedIngredient === "unassigned") {
                            return !itemIngredient;
                          }

                          return isIngredientMatch(
                            itemIngredient,
                            currentSelectedIngredient,
                            ingredients,
                          );
                        });

                        filteredSideEffects.forEach((se: any) => {
                          let freq = "Chưa rõ tần suất";
                          let text = "";
                          const itemIngredient =
                            se && typeof se === "object"
                              ? se.ingredient
                              : undefined;

                          if (typeof se === "string") {
                            text = se;
                          } else if (se && typeof se === "object") {
                            freq = se.frequency || "Chưa rõ tần suất";
                            text = se.content || "";
                          }

                          const names = text
                            .split(",")
                            .map((n: string) => n.trim())
                            .filter(Boolean);
                          names.forEach((name) => {
                            const catalogItem = adrCatalog.find((cat) => {
                              const mainName = (cat.reactionName || "").trim().toLowerCase();
                              const altNameSingle = (cat.alternativeName || "").trim().toLowerCase();
                              const altNamesList = (cat.alternativeNames || []).map((alt: string) => (alt || "").trim().toLowerCase());
                              
                              return (
                                mainName === name.toLowerCase() ||
                                (altNameSingle && altNameSingle === name.toLowerCase()) ||
                                altNamesList.includes(name.toLowerCase())
                              );
                            });
                            const groupName =
                              catalogItem?.category || "Chưa phân loại";

                            const enriched: EnrichedADR = {
                              name,
                              catalogItem,
                              groupName,
                              ingredient: itemIngredient,
                            };

                            if (!rawGroups[freq]) {
                              rawGroups[freq] = [];
                            }
                            rawGroups[freq].push(enriched);
                          });
                        });

                        const freqGroups: FrequencyGroup[] = [];

                        const processFreq = (
                          freq: string,
                          adrs: EnrichedADR[],
                        ) => {
                          const catMap: { [cat: string]: EnrichedADR[] } = {};
                          adrs.forEach((adr) => {
                            if (!catMap[adr.groupName]) {
                              catMap[adr.groupName] = [];
                            }
                            catMap[adr.groupName].push(adr);
                          });

                          const categories: GroupedByCat[] = Object.keys(catMap)
                            .map((catName) => ({
                              category: catName,
                              adrs: catMap[catName],
                            }))
                            .sort((a, b) => {
                              if (a.category === "Chưa phân loại") return 1;
                              if (b.category === "Chưa phân loại") return -1;
                              return a.category.localeCompare(b.category);
                            });

                          return {
                            frequency: freq,
                            categories,
                          };
                        };

                        knownFrequencies.forEach((freq) => {
                          if (rawGroups[freq] && rawGroups[freq].length > 0) {
                            freqGroups.push(processFreq(freq, rawGroups[freq]));
                            delete rawGroups[freq];
                          }
                        });

                        Object.keys(rawGroups).forEach((freq) => {
                          if (rawGroups[freq] && rawGroups[freq].length > 0) {
                            freqGroups.push(processFreq(freq, rawGroups[freq]));
                          }
                        });

                        const getFrequencyBadgeStyle = (freq: string) => {
                          const low = freq.toLowerCase();
                          if (low.includes("rất thường gặp")) {
                            return isDarkMode
                              ? "bg-rose-950/40 text-rose-400 border border-rose-800/50"
                              : "bg-rose-50 text-rose-700 border border-rose-100";
                          }
                          if (low.includes("thường gặp")) {
                            return isDarkMode
                              ? "bg-orange-950/40 text-orange-400 border border-orange-800/50"
                              : "bg-orange-50 text-orange-700 border border-orange-100";
                          }
                          if (low.includes("ít gặp")) {
                            return isDarkMode
                              ? "bg-amber-950/40 text-amber-400 border border-amber-800/50"
                              : "bg-amber-50 text-amber-700 border border-amber-100";
                          }
                          if (low.includes("hiếm gặp")) {
                            return isDarkMode
                              ? "bg-sky-950/40 text-sky-400 border border-sky-850/50"
                              : "bg-sky-50 text-sky-700 border border-sky-100";
                          }
                          if (low.includes("rất hiếm gặp")) {
                            return isDarkMode
                              ? "bg-indigo-950/40 text-indigo-400 border border-indigo-900/50"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-100";
                          }
                          return isDarkMode
                            ? "bg-slate-800 text-slate-400 border border-slate-700"
                            : "bg-slate-100 text-slate-600 border border-slate-200";
                        };

                        return (
                          <div className="space-y-6">
                            {/* Active Ingredient Tab Strip for Side Effects */}
                            {isByIngredient && selfActiveIngs.length > 1 && (
                              <div
                                className={cn(
                                  "flex flex-wrap gap-2 pb-4 border-b border-dashed",
                                  isDarkMode
                                    ? "border-slate-800"
                                    : "border-slate-200",
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedSideEffectIngredient("all")
                                  }
                                  className={cn(
                                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border shadow-sm",
                                    currentSelectedIngredient === "all"
                                      ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                                      : isDarkMode
                                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-750 hover:text-slate-200"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 hover:text-slate-900",
                                  )}
                                >
                                  Tất cả ({normalizedSideEffects.length})
                                </button>
                                {selfActiveIngs.map((ingName, ingIdx) => {
                                  const count = normalizedSideEffects.filter(
                                    (item: any) =>
                                      typeof item === "object" &&
                                      item &&
                                      isIngredientMatch(
                                        item.ingredient,
                                        ingName,
                                        ingredients,
                                      ),
                                  ).length;

                                  const activeIng = (
                                    drug.activeIngredients || []
                                  ).find(
                                    (ai: any) =>
                                      ai &&
                                      ai.name &&
                                      ai.name.toLowerCase() === ingName.toLowerCase(),
                                  );
                                  const hasNote = !!(
                                    activeIng &&
                                    activeIng.sideEffectsNote &&
                                    activeIng.sideEffectsNote.trim() !== ""
                                  );

                                  if (count === 0 && !hasNote) return null;

                                  return (
                                    <button
                                      key={`${ingName}-${ingIdx}`}
                                      type="button"
                                      onClick={() =>
                                        setSelectedSideEffectIngredient(ingName)
                                      }
                                      className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border shadow-sm",
                                        currentSelectedIngredient === ingName
                                          ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                                          : isDarkMode
                                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-750 hover:text-slate-200"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 hover:text-slate-900",
                                      )}
                                    >
                                      <Pill
                                        size={12}
                                        className={
                                          currentSelectedIngredient === ingName
                                            ? "text-white"
                                            : "text-amber-500"
                                        }
                                      />
                                      {ingName} ({count})
                                    </button>
                                  );
                                })}

                                {hasUnassigned && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedSideEffectIngredient("unassigned")
                                    }
                                    className={cn(
                                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border shadow-sm",
                                      currentSelectedIngredient === "unassigned"
                                        ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                                        : isDarkMode
                                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-750 hover:text-slate-200"
                                          : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 hover:text-slate-900",
                                    )}
                                  >
                                    Chưa phân loại ({
                                      normalizedSideEffects.filter(
                                        (item: any) =>
                                          typeof item === "object" &&
                                          item &&
                                          !item.ingredient,
                                      ).length
                                    })
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Render general drug-level side effects note */}
                            {drug.sideEffectsNote && drug.sideEffectsNote.trim() !== "" && (currentSelectedIngredient === "all" || !isByIngredient) && (
                              <div className="space-y-3 mb-5">
                                <div
                                  className={cn(
                                    "p-4 rounded-2xl border transition-colors flex flex-col gap-1.5",
                                    isDarkMode
                                      ? "bg-amber-950/15 border-amber-900/40 text-amber-300"
                                      : "bg-amber-50/40 border-amber-150 text-amber-800",
                                  )}
                                >
                                  <div className={cn(
                                    "text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-medium",
                                    isDarkMode ? "text-slate-300" : "text-slate-600"
                                  )}>
                                    {drug.sideEffectsNote}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Render per-active ingredient side effects notes */}
                            {(() => {
                              const activeIngNotes = (
                                drug.activeIngredients || []
                              ).filter(
                                (ai: any) =>
                                  ai &&
                                  ai.sideEffectsNote &&
                                  ai.sideEffectsNote.trim() !== "" &&
                                  (currentSelectedIngredient === "all" ||
                                    ai.name.toLowerCase() ===
                                      currentSelectedIngredient.toLowerCase()),
                              );
                              if (activeIngNotes.length === 0) return null;

                              return (
                                <div className="space-y-3 mb-5">
                                  {activeIngNotes.map(
                                    (ai: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className={cn(
                                          "p-4 rounded-2xl border transition-colors flex flex-col gap-1.5",
                                          isDarkMode
                                            ? "bg-amber-950/15 border-amber-900/40 text-amber-355"
                                            : "bg-amber-50/40 border-amber-150 text-amber-800",
                                        )}
                                      >
                                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm uppercase tracking-wide">
                                          <Pill
                                            size={14}
                                            className="text-amber-500 shrink-0"
                                          />
                                          Ghi chú tác dụng phụ của {ai.name}
                                        </div>
                                        <div className={cn(
                                          "text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-medium",
                                          isDarkMode ? "text-slate-300" : "text-slate-600"
                                        )}>
                                          {ai.sideEffectsNote}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              );
                            })()}

                            <div className="space-y-6">
                              {freqGroups.length === 0 ? (
                                <div
                                  className={cn(
                                    "p-12 text-center rounded-3xl border border-dashed flex flex-col items-center justify-center gap-3",
                                    isDarkMode
                                      ? "bg-slate-900/40 border-slate-850 text-slate-400"
                                      : "bg-slate-50/50 border-slate-200 text-slate-500",
                                  )}
                                >
                                  <AlertCircle
                                    size={40}
                                    className="text-amber-500 opacity-60"
                                  />
                                  <div className="space-y-1">
                                    <p className="font-bold text-sm">
                                      Không có nội dung Tác dụng phụ
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      Chưa có dữ liệu tác dụng phụ của thuốc này ở thời điểm hiện tại.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                freqGroups.map((fg, fgIdx) => (
                                  <div
                                    key={fgIdx}
                                    className={cn(
                                      "p-5 rounded-3xl border space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200",
                                      isDarkMode
                                        ? "bg-slate-900/25 border-slate-800/80"
                                        : "bg-white border-slate-200/50",
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-6 rounded-full bg-amber-500 shrink-0" />
                                      <span
                                        className={cn(
                                          "px-3 py-1.5 rounded-xl text-xs font-black shadow-sm tracking-wide uppercase",
                                          getFrequencyBadgeStyle(fg.frequency),
                                        )}
                                      >
                                        {fg.frequency}
                                      </span>
                                    </div>

                                    <div className="space-y-4 pl-1">
                                      {fg.categories.map((cat, catIdx) => (
                                        <div key={catIdx} className="space-y-2">
                                          <h5
                                            className={cn(
                                              "text-xs font-black tracking-wider uppercase flex items-center gap-2",
                                              isDarkMode
                                                ? "text-slate-300"
                                                : "text-slate-700",
                                            )}
                                          >
                                            <Activity
                                              size={12}
                                              className="text-amber-500/80"
                                            />
                                            {cat.category}
                                          </h5>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pl-3.5">
                                            {cat.adrs.map((adr, adrIdx) => (
                                              <div
                                                key={adrIdx}
                                                className={cn(
                                                  "p-3 rounded-2xl border transition-all flex flex-col items-start justify-center gap-1.5",
                                                  isDarkMode
                                                    ? "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/20"
                                                    : "bg-slate-50/50 border-slate-200/50 hover:bg-slate-100/30",
                                                )}
                                              >
                                                <div className="flex items-center gap-2 w-full">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                  <span
                                                    className={cn(
                                                      "text-xs sm:text-sm leading-tight font-medium",
                                                      isDarkMode
                                                        ? "text-slate-300"
                                                        : "text-slate-600",
                                                    )}
                                                  >
                                                    {adr.name}
                                                  </span>
                                                </div>
                                                {currentSelectedIngredient ===
                                                  "all" &&
                                                  adr.ingredient && (
                                                    <span
                                                      className={cn(
                                                        "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-sm ml-3.5",
                                                        isDarkMode
                                                          ? "bg-indigo-950/40 border-indigo-900/30 text-indigo-350"
                                                          : "bg-indigo-50 border-indigo-100 text-indigo-700",
                                                      )}
                                                    >
                                                      <Pill
                                                        size={8}
                                                        className="text-indigo-500 shrink-0"
                                                      />
                                                      {adr.ingredient}
                                                    </span>
                                                  )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {drug.adrManagement &&
                              drug.adrManagement.trim() !== "" && (
                                <div
                                  className={cn(
                                    "p-6 sm:p-8 rounded-[32px] border mt-6 space-y-3 transition-all duration-200",
                                    isDarkMode
                                      ? "bg-amber-950/5 border-amber-900/20 text-slate-300"
                                      : "bg-amber-50/10 border-slate-150 text-slate-850",
                                  )}
                                >
                                  <h4
                                    className={cn(
                                      "text-xs font-black tracking-widest uppercase flex items-center gap-2",
                                      isDarkMode
                                        ? "text-amber-400"
                                        : "text-amber-700",
                                    )}
                                  >
                                    <AlertCircle
                                      size={16}
                                      className="text-amber-500 shrink-0"
                                    />
                                    Xử trí phản ứng có hại (ADR)
                                  </h4>
                                  <p
                                    className={cn(
                                      "text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium",
                                      isDarkMode
                                        ? "text-slate-300"
                                        : "text-slate-600",
                                    )}
                                  >
                                    {drug.adrManagement}
                                  </p>
                                </div>
                              )}
                          </div>
                        );
                      })()}

                    {/* Warnings Tab */}
                    {activeDetailTab === "warnings" && (
                      <div className="space-y-6">
                        {/* ===== CẢNH BÁO (warnings) ===== */}
                        {drug.warnings && drug.warnings.length > 0 && (
                          <div
                            className={cn(
                              "p-6 rounded-3xl border shadow-sm",
                              isDarkMode
                                ? "bg-rose-900/10 border-rose-900/20"
                                : "bg-rose-50/20 border-rose-100",
                            )}
                          >
                            <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600 mb-4">
                              <AlertTriangle size={16} /> Cảnh báo
                            </h5>
                            <div className="divide-y divide-rose-100/30 dark:divide-rose-950/20">
                              {drug.warnings.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="py-3 flex items-start gap-3 first:pt-0 last:pb-0"
                                >
                                  <div
                                    className={cn(
                                      "p-1.5 rounded-xl shrink-0 mt-0.5",
                                      isDarkMode
                                        ? "bg-rose-950/40 text-rose-400"
                                        : "bg-rose-50 text-rose-600",
                                    )}
                                  >
                                    <AlertTriangle size={14} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                      {/* Phân loại Badge */}
                                      {item.type && (
                                        <span
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                            isDarkMode
                                              ? "bg-rose-950/30 border-rose-900/30 text-rose-400"
                                              : "bg-rose-50 border-rose-100 text-rose-700",
                                          )}
                                        >
                                          {item.type === "Other"
                                            ? "Khác"
                                            : item.type === "Drug"
                                              ? "Thuốc"
                                              : item.type === "Weight"
                                                ? "Cân nặng"
                                                : item.type === "Age"
                                                  ? "Tuổi"
                                                  : item.type === "ICD-10"
                                                    ? "ICD-10"
                                                    : item.type || "Khác"}
                                        </span>
                                      )}

                                      {/* Mức độ nghiêm trọng Badge */}
                                      {item.severity && (
                                        <span
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                            item.severity === "Chống chỉ định"
                                              ? isDarkMode
                                                ? "bg-red-950/30 border-red-900/30 text-red-400"
                                                : "bg-red-50 border-red-100 text-red-700"
                                              : item.severity === "Phối hợp nguy hiểm"
                                                  ? isDarkMode
                                                    ? "bg-rose-950/30 border-rose-900/30 text-rose-400"
                                                    : "bg-rose-50 border-rose-100 text-rose-700"
                                              : item.severity === "Cần cân nhắc lợi, hại"
                                                ? isDarkMode
                                                  ? "bg-orange-950/30 border-orange-900/30 text-orange-400"
                                                  : "bg-orange-50 border-orange-100 text-orange-700"
                                                : item.severity === "Cần theo dõi người bệnh"
                                                  ? isDarkMode
                                                    ? "bg-purple-950/30 border-purple-900/30 text-purple-400"
                                                    : "bg-purple-50 border-purple-100 text-purple-700"
                                                  : isDarkMode
                                                    ? "bg-blue-950/30 border-blue-900/30 text-blue-400"
                                                    : "bg-blue-50 border-blue-100 text-blue-700",
                                          )}
                                        >
                                          {item.severity}
                                        </span>
                                      )}
                                    </div>

                                    {item.title && (
                                      <h5 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-1">
                                        {item.title}
                                      </h5>
                                    )}
                                    <p
                                      className={cn(
                                        "text-xs sm:text-[13px] leading-relaxed font-semibold",
                                        isDarkMode
                                          ? "text-slate-200"
                                          : "text-slate-800",
                                      )}
                                    >
                                      {item.content}
                                    </p>

                                    {/* Gợi ý mốc tuổi & mốc sinh (chỉ có điểm quyền lực mới xem được) */}
                                    {(() => {
                                      const cfg = item.ageConfig as any;
                                      if (item.type !== "Age" || !cfg) return null;
                                      const valBefore = typeof cfg.valueBefore === "number" ? cfg.valueBefore : null;
                                      const valAfter = typeof cfg.value === "number" ? cfg.value : null;
                                      if (valBefore === null && valAfter === null) return null;

                                      const calcDate = (val: number) => {
                                        const d = new Date();
                                        if (cfg.unit === "months") d.setMonth(d.getMonth() - val);
                                        else d.setFullYear(d.getFullYear() - val);
                                        return d.toLocaleDateString("vi-VN");
                                      };

                                      const dateBefore = valBefore !== null ? calcDate(valBefore) : null;
                                      const dateAfter = valAfter !== null ? calcDate(valAfter) : null;

                                      const display = [dateAfter, dateBefore].filter(Boolean).join(" – ");

                                      return display && canSeeAgeContraindications ? (
                                        <div className="mt-2">
                                          <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold",
                                            isDarkMode
                                              ? "bg-slate-800 border-slate-700 text-slate-300"
                                              : "bg-white border-slate-200 text-slate-600 shadow-xs",
                                          )}>
                                            <Calendar size={11} className="shrink-0 text-rose-400" />
                                            <span>Mốc sinh: {display}</span>
                                          </div>
                                        </div>
                                      ) : null;
                                    })()}

                                    {/* Gợi ý ICD-10 */}
                                    {canSeeIcdSuggestions &&
                                      item.icd10s &&
                                      item.icd10s.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {[...item.icd10s]
                                            .sort((a, b) => a.localeCompare(b, "vi"))
                                            .map((fullName, idx) => {
                                              const parts = fullName.split(" - ");
                                              const code = parts[0];
                                              const icdObj = icdList.find(
                                                (icd) => icd.code === code,
                                              );
                                              const desc =
                                                parts.slice(1).join(" - ") ||
                                                icdObj?.description;
                                              return (
                                                <div
                                                  key={idx}
                                                  className="flex items-center gap-1"
                                                >
                                                  <div
                                                    className={cn(
                                                      "px-2 py-1 rounded-lg text-[10px] font-black border transition-all flex items-center gap-2",
                                                      isDarkMode
                                                        ? "bg-rose-900/20 border-rose-900/30 text-rose-400"
                                                        : "bg-rose-50 border-rose-100 text-rose-600",
                                                    )}
                                                  >
                                                    <span>{code}</span>
                                                    {desc && (
                                                      <span className="opacity-60 font-bold">
                                                        {desc}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}

                                    {/* Gợi ý Thuốc */}
                                    {item.drugs && item.drugs.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {item.drugs.map((drugName, idx) => {
                                          const isCypSpecial = drugName === "CYP3A4";
                                          return (
                                            <div
                                              key={idx}
                                              className={cn(
                                                "px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 shadow-xs",
                                                isCypSpecial
                                                  ? isDarkMode
                                                    ? "bg-amber-900/25 border-amber-900/40 text-amber-400"
                                                    : "bg-amber-50 border-amber-100 text-amber-700"
                                                  : isDarkMode
                                                    ? "bg-rose-900/25 border-rose-900/40 text-rose-400"
                                                    : "bg-rose-50 border-rose-100 text-rose-700",
                                              )}
                                            >
                                              <span>
                                                {isCypSpecial ? "⭐" : "💊"}
                                              </span>
                                              <span>{drugName}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ===== THẬN TRỌNG (precautions) ===== */}
                        <div
                          className={cn(
                            "p-6 rounded-3xl border border-amber-200/50 shadow-sm",
                            isDarkMode ? "bg-amber-900/10" : "bg-amber-50/20",
                          )}
                        >
                          <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 mb-4">
                            <ShieldAlert size={16} /> Thận trọng
                          </h5>
                          <div className="text-sm leading-relaxed">
                            {typeof drug.precautions === "string" ? (
                              <p
                                className={cn(
                                  "text-sm leading-relaxed font-medium",
                                  isDarkMode ? "text-white" : "text-black",
                                )}
                              >
                                {drug.precautions ||
                                  "Không có cảnh báo đặc biệt."}
                              </p>
                            ) : (
                              <div className="divide-y divide-amber-100/30 dark:divide-amber-950/20">
                                {drug.precautions &&
                                drug.precautions.length > 0 ? (
                                  drug.precautions.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="py-3 flex items-start gap-3 transition-colors duration-200 first:pt-0 last:pb-0"
                                    >
                                      <div
                                        className={cn(
                                          "p-1.5 rounded-xl shrink-0 mt-0.5",
                                          isDarkMode
                                            ? "bg-amber-950/40 text-amber-500"
                                            : "bg-amber-50 text-amber-600",
                                        )}
                                      >
                                        <ShieldAlert size={14} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                          {/* Phân loại Badge */}
                                          {canSeePrecautionType && (
                                            <span
                                              className={cn(
                                                "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                                isDarkMode
                                                  ? "bg-amber-950/30 border-amber-900/30 text-amber-400"
                                                  : "bg-amber-50 border-amber-100 text-amber-700",
                                              )}
                                            >
                                              {item.type === "Other"
                                                ? "Khác"
                                                : item.type === "Drug"
                                                  ? "Thuốc"
                                                  : item.type === "Weight"
                                                    ? "Cân nặng"
                                                    : item.type === "Age"
                                                      ? "Tuổi"
                                                      : item.type === "ICD-10"
                                                        ? "ICD-10"
                                                        : item.type || "Khác"}
                                            </span>
                                          )}

                                          {/* Mức độ nghiêm trọng Badge */}
                                          {canSeePrecautionSeverity &&
                                            item.severity && (
                                              <span
                                                className={cn(
                                                  "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                                   item.severity === "Chống chỉ định"
                                                     ? isDarkMode
                                                       ? "bg-red-950/30 border-red-900/30 text-red-400"
                                                       : "bg-red-50 border-red-100 text-red-700"
                                                     : item.severity === "Phối hợp nguy hiểm"
                                                       ? isDarkMode
                                                         ? "bg-rose-950/30 border-rose-900/30 text-rose-400"
                                                         : "bg-rose-50 border-rose-100 text-rose-700"
                                                    : item.severity ===
                                                        "Cần cân nhắc lợi, hại"
                                                      ? isDarkMode
                                                        ? "bg-orange-950/30 border-orange-900/30 text-orange-400"
                                                        : "bg-orange-50 border-orange-100 text-orange-700"
                                                      : item.severity ===
                                                          "Cần theo dõi người bệnh"
                                                        ? isDarkMode
                                                          ? "bg-purple-950/30 border-purple-900/30 text-purple-400"
                                                          : "bg-purple-50 border-purple-100 text-purple-700"
                                                        : isDarkMode
                                                          ? "bg-blue-950/30 border-blue-900/30 text-blue-400"
                                                          : "bg-blue-50 border-blue-100 text-blue-700",
                                                )}
                                              >
                                                {item.severity}
                                              </span>
                                            )}
                                        </div>

                                        {item.title && (
                                          <h5 className="text-xs font-black uppercase tracking-wider text-amber-600 mb-1">
                                            {item.title}
                                          </h5>
                                        )}
                                        <p
                                          className={cn(
                                            "text-xs sm:text-[13px] leading-relaxed font-semibold",
                                            isDarkMode
                                              ? "text-slate-200"
                                              : "text-slate-800",
                                          )}
                                        >
                                          {item.content}
                                        </p>

                                        {/* Gợi ý mốc tuổi & mốc sinh (chỉ có điểm quyền lực phù hợp mới xem được) */}
                                        {(() => {
                                          const cfg = item.ageConfig as any;
                                          if (item.type !== "Age" || !cfg) return null;
                                          const valBefore = typeof cfg.valueBefore === "number" ? cfg.valueBefore : null;
                                          const valAfter = typeof cfg.value === "number" ? cfg.value : null;
                                          if (valBefore === null && valAfter === null) return null;

                                          const calcDate = (val: number) => {
                                            const d = new Date();
                                            if (cfg.unit === "months") d.setMonth(d.getMonth() - val);
                                            else d.setFullYear(d.getFullYear() - val);
                                            return d.toLocaleDateString("vi-VN");
                                          };

                                          const dateBefore = valBefore !== null ? calcDate(valBefore) : null;
                                          const dateAfter = valAfter !== null ? calcDate(valAfter) : null;

                                          const display = [dateAfter, dateBefore].filter(Boolean).join(" – ");

                                          return display && canSeeAgeContraindications ? (
                                            <div className="mt-2">
                                              <div className={cn(
                                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold",
                                                isDarkMode
                                                  ? "bg-slate-800 border-slate-700 text-slate-300"
                                                  : "bg-white border-slate-200 text-slate-600 shadow-xs",
                                              )}>
                                                <Calendar size={11} className="shrink-0 text-amber-500" />
                                                <span>Mốc sinh: {display}</span>
                                              </div>
                                            </div>
                                          ) : null;
                                        })()}

                                        {/* Gợi ý ICD-10 */}
                                        {canSeeIcdSuggestions &&
                                          item.icd10s &&
                                          item.icd10s.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                              {item.icd10s.map(
                                                (fullName, tagIdx) => {
                                                  const parts =
                                                    fullName.split(" - ");
                                                  const code = parts[0];
                                                  const desc =
                                                    parts.slice(1).join(" - ");
                                                  return (
                                                    <div
                                                      key={tagIdx}
                                                      className={cn(
                                                        "px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1.5",
                                                        isDarkMode
                                                          ? "bg-amber-900/20 border-amber-900/30 text-amber-400"
                                                          : "bg-amber-50 border-amber-100 text-amber-700",
                                                      )}
                                                    >
                                                      <span>{code}</span>
                                                      {desc && (
                                                        <span className="opacity-60 font-medium">
                                                          {desc}
                                                        </span>
                                                      )}
                                                    </div>
                                                  );
                                                },
                                              )}
                                            </div>
                                          )}

                                        {item.type === "Drug" && item.drugs && item.drugs.length > 0 && (
                                           <div className="mt-3">
                                             <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1.5">
                                               Thuốc &amp; Nhóm thuốc chống chỉ định:
                                             </div>
                                             <div className="flex flex-wrap gap-2">
                                               {item.drugs.map((drugName, idx) => {
                                                 const isCypSpecial = drugName === "CYP3A4";
                                                 return (
                                                   <div
                                                     key={idx}
                                                     className={cn(
                                                       "px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 shadow-xs",
                                                       isCypSpecial
                                                         ? isDarkMode
                                                           ? "bg-amber-900/25 border-amber-900/40 text-amber-400"
                                                           : "bg-amber-50 border-amber-100 text-amber-700"
                                                         : isDarkMode
                                                           ? "bg-rose-900/25 border-rose-900/40 text-rose-400"
                                                           : "bg-rose-50 border border-rose-100 text-rose-750",
                                                     )}
                                                   >
                                                     <span>💊</span>
                                                     <span>{drugName}</span>
                                                   </div>
                                                 );
                                               })}
                                             </div>
                                           </div>
                                         )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <span className="opacity-60 italic">
                                    Không có cảnh báo đặc biệt.
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Khả năng sinh sản */}
                          <div
                            className={cn(
                              "p-5 rounded-2xl border shadow-sm",
                              isDarkMode
                                ? "bg-purple-900/10 border-purple-900/20"
                                : "bg-purple-50 border-purple-100",
                            )}
                          >
                            {(() => {
                              const storedValue = drug.fertility || "";
                              const match = storedValue.match(
                                /^([^-\n\r]+)(?:\s*-\s*(.*))?$/,
                              );
                              const status = match ? match[1].trim() : "";
                              const notes =
                                match && match[2]
                                  ? match[2].trim()
                                  : storedValue
                                    ? storedValue
                                    : "";
                              const hasValidStatus = [
                                "Có thể dùng",
                                "Cân nhắc lợi hại",
                                "Không nên dùng",
                                "Không có dữ liệu",
                              ].includes(status);
                              const canShowStatusBadge =
                                canSeeQuickSelectTags && hasValidStatus;
                              const displayStatus = canShowStatusBadge
                                ? status
                                : "";
                              const displayNotes = canShowStatusBadge
                                ? notes
                                : storedValue;

                              return (
                                <>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <Sparkles
                                        className="text-purple-500 shadow-sm shrink-0"
                                        size={18}
                                      />
                                      <h6 className="text-[10px] font-black uppercase text-purple-600 leading-none">
                                        Khả năng sinh sản
                                      </h6>
                                    </div>
                                    {displayStatus && (
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                          displayStatus === "Không nên dùng"
                                            ? isDarkMode
                                              ? "bg-rose-950/40 border-rose-900/30 text-rose-400"
                                              : "bg-rose-50 border-rose-100 text-rose-700"
                                            : displayStatus === "Có thể dùng"
                                              ? isDarkMode
                                                ? "bg-blue-950/40 border-blue-900/30 text-blue-400"
                                                : "bg-blue-50 border-blue-100 text-blue-700"
                                              : displayStatus === "Không có dữ liệu"
                                                ? isDarkMode
                                                  ? "bg-slate-800 border-slate-700 text-slate-400"
                                                  : "bg-slate-100 border-slate-200 text-slate-600"
                                                : isDarkMode
                                                  ? "bg-amber-950/40 border-amber-900/30 text-amber-400"
                                                  : "bg-amber-50 border-amber-100 text-amber-700",
                                        )}
                                      >
                                        {displayStatus}
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className={cn(
                                      "text-[11px] leading-relaxed font-medium",
                                      isDarkMode ? "text-white" : "text-black",
                                    )}
                                  >
                                    {displayNotes || "Không có thông tin."}
                                  </p>
                                </>
                              );
                            })()}
                          </div>

                          {/* Phụ nữ có thai */}
                          <div
                            className={cn(
                              "p-5 rounded-2xl border shadow-sm",
                              isDarkMode
                                ? "bg-rose-900/10 border-rose-900/20"
                                : "bg-rose-50 border-rose-100",
                            )}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Heart
                                className="text-rose-500 shadow-sm shrink-0"
                                size={18}
                              />
                              <h6 className="text-[10px] font-black uppercase text-rose-600 leading-none">
                                Phụ nữ có thai
                              </h6>
                            </div>
                            {(() => {
                              const storedValue = drug.pregnancy || "";
                              const match = storedValue.match(
                                /^3T đầu:\s*([^|]+)\s*\|\s*3T giữa:\s*([^|]+)\s*\|\s*3T cuối:\s*([^-]+)(?:\s*-\s*([\s\S]*))?$/,
                              );
                              if (match) {
                                const t1 = match[1].trim();
                                const t2 = match[2].trim();
                                const t3 = match[3].trim();
                                const notes = (match[4] || "").trim();

                                const getBadgeColor = (status: string) => {
                                  if (status === "Không nên dùng")
                                    return isDarkMode
                                      ? "bg-rose-950/40 border-rose-900/30 text-rose-400"
                                      : "bg-rose-50 border-rose-100 text-rose-700";
                                  if (status === "Có thể dùng")
                                    return isDarkMode
                                      ? "bg-blue-950/40 border-blue-900/30 text-blue-400"
                                      : "bg-blue-50 border-blue-100 text-blue-700";
                                  return isDarkMode
                                    ? "bg-amber-950/40 border-amber-900/30 text-amber-400"
                                    : "bg-amber-50 border-amber-100 text-amber-700";
                                };

                                return (
                                  <div className="space-y-3">
                                    {/* Notes */}
                                    {notes ? (
                                      <div className="space-y-2 mb-3">
                                        {notes
                                          .split("\n")
                                          .map((noteLine, idx) => {
                                            const lineTrimmed = noteLine.trim();
                                            if (!lineTrimmed) return null;
                                            return (
                                              <p
                                                key={idx}
                                                className={cn(
                                                  "text-[11px] leading-relaxed font-semibold pl-3.5 relative before:content-['•'] before:absolute before:left-1 before:text-rose-500",
                                                  isDarkMode
                                                    ? "text-slate-100"
                                                    : "text-slate-900",
                                                )}
                                              >
                                                {lineTrimmed}
                                              </p>
                                            );
                                          })}
                                      </div>
                                    ) : (
                                      !canSeePregnancyTrimesters && (
                                        <p
                                          className={cn(
                                            "text-[11px] leading-relaxed mb-3 font-medium opacity-60 italic",
                                            isDarkMode
                                              ? "text-slate-400"
                                              : "text-slate-500",
                                          )}
                                        >
                                          Cần thận trọng.
                                        </p>
                                      )
                                    )}

                                    {/* Trimester Badges */}
                                    {canSeePregnancyTrimesters && (
                                      <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                          { label: "3T đầu", val: t1 },
                                          { label: "3T giữa", val: t2 },
                                          { label: "3T cuối", val: t3 },
                                        ].map((t, i) => (
                                          <div
                                            key={i}
                                            className={cn(
                                              "px-1 py-1.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 shadow-sm transition-all duration-250",
                                              getBadgeColor(t.val),
                                            )}
                                          >
                                            <span className="text-[7.5px] font-black uppercase tracking-wider opacity-60 leading-none">
                                              {t.label}
                                            </span>
                                            <span className="text-[8.5px] font-extrabold leading-none truncate max-w-full">
                                              {t.val}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // Fallback for old simple string values
                              return (
                                <div className="space-y-2">
                                  {(storedValue || "Cần thận trọng.")
                                    .split("\n")
                                    .map((line, idx) => {
                                      const lineTrimmed = line.trim();
                                      if (!lineTrimmed) return null;
                                      return (
                                        <p
                                          key={idx}
                                          className={cn(
                                            "text-[11px] leading-relaxed font-semibold pl-3.5 relative before:content-['•'] before:absolute before:left-1 before:text-rose-500",
                                            isDarkMode
                                              ? "text-slate-100"
                                              : "text-slate-900",
                                          )}
                                        >
                                          {lineTrimmed}
                                        </p>
                                      );
                                    })}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Phụ nữ cho con bú */}
                          <div
                            className={cn(
                              "p-5 rounded-2xl border shadow-sm",
                              isDarkMode
                                ? "bg-pink-900/10 border-pink-900/20"
                                : "bg-pink-50 border-pink-100",
                            )}
                          >
                            {(() => {
                              const storedValue = drug.lactation || "";
                              const match = storedValue.match(
                                /^([^-\n\r]+)(?:\s*-\s*(.*))?$/,
                              );
                              const status = match ? match[1].trim() : "";
                              const notes =
                                match && match[2]
                                  ? match[2].trim()
                                  : storedValue
                                    ? storedValue
                                    : "";
                              const hasValidStatus = [
                                "Có thể dùng",
                                "Cân nhắc lợi hại",
                                "Không nên dùng",
                                "Không có dữ liệu",
                              ].includes(status);
                              const canShowStatusBadge =
                                canSeeQuickSelectTags && hasValidStatus;
                              const displayStatus = canShowStatusBadge
                                ? status
                                : "";
                              const displayNotes = canShowStatusBadge
                                ? notes
                                : storedValue;

                              return (
                                <>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <Baby
                                        className="text-pink-500 shadow-sm shrink-0"
                                        size={18}
                                      />
                                      <h6 className="text-[10px] font-black uppercase text-pink-600 leading-none">
                                        Phụ nữ cho con bú
                                      </h6>
                                    </div>
                                    {displayStatus && (
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                          displayStatus === "Không nên dùng"
                                            ? isDarkMode
                                              ? "bg-rose-950/40 border-rose-900/30 text-rose-400"
                                              : "bg-rose-50 border-rose-100 text-rose-700"
                                            : displayStatus === "Có thể dùng"
                                              ? isDarkMode
                                                ? "bg-blue-950/40 border-blue-900/30 text-blue-400"
                                                : "bg-blue-50 border-blue-100 text-blue-700"
                                              : displayStatus === "Không có dữ liệu"
                                                ? isDarkMode
                                                  ? "bg-slate-800 border-slate-700 text-slate-400"
                                                  : "bg-slate-100 border-slate-200 text-slate-600"
                                                : isDarkMode
                                                  ? "bg-amber-950/40 border-amber-900/30 text-amber-400"
                                                  : "bg-amber-50 border-amber-100 text-amber-700",
                                        )}
                                      >
                                        {displayStatus}
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className={cn(
                                      "text-[11px] leading-relaxed font-medium",
                                      isDarkMode ? "text-white" : "text-black",
                                    )}
                                  >
                                    {displayNotes || "Cần thận trọng."}
                                  </p>
                                </>
                              );
                            })()}
                          </div>

                          {/* Lái xe & Vận hành máy móc */}
                          <div
                            className={cn(
                              "p-5 rounded-2xl border shadow-sm",
                              isDarkMode
                                ? "bg-slate-800 border-slate-700"
                                : "bg-slate-100 border-slate-200",
                            )}
                          >
                            {(() => {
                              const storedValue = drug.driving || "";
                              const match = storedValue.match(
                                /^([^-\n\r]+)(?:\s*-\s*(.*))?$/,
                              );
                              const status = match ? match[1].trim() : "";
                              const notes =
                                match && match[2]
                                  ? match[2].trim()
                                  : storedValue
                                    ? storedValue
                                    : "";
                              const hasValidStatus = [
                                "Có thể dùng",
                                "Cân nhắc lợi hại",
                                "Không nên dùng",
                                "Không có dữ liệu",
                              ].includes(status);
                              const canShowStatusBadge =
                                canSeeQuickSelectTags && hasValidStatus;
                              const displayStatus = canShowStatusBadge
                                ? status
                                : "";
                              const displayNotes = canShowStatusBadge
                                ? notes
                                : storedValue;

                              return (
                                <>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <Car
                                        className="text-slate-500 shrink-0"
                                        size={18}
                                      />
                                      <h6 className="text-[10px] font-black uppercase text-slate-600 leading-none">
                                        Lái xe & Vận hành máy móc
                                      </h6>
                                    </div>
                                    {displayStatus && (
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border",
                                          displayStatus === "Không nên dùng"
                                            ? isDarkMode
                                              ? "bg-rose-950/40 border-rose-900/30 text-rose-400"
                                              : "bg-rose-50 border-rose-100 text-rose-700"
                                            : displayStatus === "Có thể dùng"
                                              ? isDarkMode
                                                ? "bg-blue-950/40 border-blue-900/30 text-blue-400"
                                                : "bg-blue-50 border-blue-100 text-blue-700"
                                              : displayStatus === "Không có dữ liệu"
                                                ? isDarkMode
                                                  ? "bg-slate-800 border-slate-700 text-slate-400"
                                                  : "bg-slate-100 border-slate-200 text-slate-600"
                                                : isDarkMode
                                                  ? "bg-amber-950/40 border-amber-900/30 text-amber-400"
                                                  : "bg-amber-50 border-amber-100 text-amber-700",
                                        )}
                                      >
                                        {displayStatus}
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className={cn(
                                      "text-[11px] leading-relaxed font-medium",
                                      isDarkMode ? "text-white" : "text-black",
                                    )}
                                  >
                                    {displayNotes || "Không ảnh hưởng."}
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {(drug.overdose || drug.overdoseManagement) && (
                          <div
                            className={cn(
                              "p-8 rounded-[32px] border border-rose-200/50 shadow-sm space-y-5",
                              isDarkMode ? "bg-rose-900/10" : "bg-rose-50/20",
                            )}
                          >
                            <div className="flex items-center gap-2 border-b border-rose-200/20 dark:border-rose-900/40 pb-2">
                              <AlertTriangle
                                size={18}
                                className="text-rose-600"
                              />
                              <h4 className="text-xs font-black uppercase tracking-widest text-rose-600">
                                Quá liều & Xử trí
                              </h4>
                            </div>
                            {drug.overdose && (
                              <div className="space-y-1">
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-rose-400 dark:text-rose-500">
                                  Triệu chứng & Biểu hiện
                                </h5>
                                <div className={cn(
                                  "text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium",
                                  isDarkMode ? "text-slate-300" : "text-slate-600"
                                )}>
                                  {drug.overdose}
                                </div>
                              </div>
                            )}
                            {drug.overdoseManagement && (
                              <div className="space-y-1">
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-rose-400 dark:text-rose-500">
                                  Hướng dẫn xử trí
                                </h5>
                                <div className={cn(
                                  "text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium",
                                  isDarkMode ? "text-slate-300" : "text-slate-600"
                                )}>
                                  {drug.overdoseManagement}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specific Interactions Tab */}
                    {activeDetailTab === "interactions" && (
                      <div className="space-y-6">
                        {/* Tương tác chung */}
                        {drug.interactions && (
                          <div
                            className={cn(
                              "p-6 rounded-3xl border border-blue-200/50 shadow-sm transition-colors",
                              isDarkMode ? "bg-blue-900/10" : "bg-blue-50/20",
                            )}
                          >
                            <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">
                              <RefreshCw size={16} /> Tương tác chung
                            </h5>
                            <div className={cn(
                              "text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-650"
                            )}>
                              {drug.interactions}
                            </div>
                          </div>
                        )}

                        {/* Tương kỵ */}
                        {drug.incompatibilities && (
                          <div
                            className={cn(
                              "p-6 rounded-3xl border border-rose-200/50 shadow-sm transition-colors",
                              isDarkMode ? "bg-rose-900/10" : "bg-rose-50/20",
                            )}
                          >
                            <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600 mb-3">
                              <AlertTriangle size={16} /> Tương kỵ thuốc
                            </h5>
                            <div className={cn(
                              "text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-650"
                            )}>
                              {drug.incompatibilities}
                            </div>
                          </div>
                        )}

                        {/* Tương tác cụ thể */}
                        {(() => {
                          const selfActiveIngs = (drug.activeIngredients || [])
                            .map((ing) => ing.name)
                            .filter(Boolean);
                          const hasMultipleIngredients =
                            selfActiveIngs.length > 1;
                          const filteredInteractions =
                            drug.specificInteractions || [];

                          if (
                            !drug.specificInteractions ||
                            drug.specificInteractions.length === 0
                          )
                            return null;

                          const renderInteractionItem = (
                            item: any,
                            idx: number,
                          ) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-6 rounded-3xl border flex items-start gap-4 transition-all hover:shadow-md",
                                isDarkMode
                                  ? "bg-slate-800 border-indigo-900/30"
                                  : "bg-white border-indigo-100 shadow-sm",
                              )}
                            >
                              <div
                                className={cn(
                                  "p-1.5 rounded-xl shrink-0 mt-0.5 shadow-sm",
                                  item.severity === "Chống chỉ định"
                                    ? isDarkMode
                                      ? "bg-red-950/50 text-red-400"
                                      : "bg-red-50 text-red-500"
                                    : item.severity === "Phối hợp nguy hiểm"
                                      ? isDarkMode
                                        ? "bg-rose-950/50 text-rose-400"
                                        : "bg-rose-50 text-rose-500"
                                    : item.severity === "Cần cân nhắc lợi, hại"
                                      ? isDarkMode
                                        ? "bg-orange-950/50 text-orange-400"
                                        : "bg-orange-50 text-orange-500"
                                      : (item.severity === "Cần theo dõi người bệnh" && canSeeInteractionSuggestions)
                                        ? isDarkMode
                                          ? "bg-purple-950/50 text-purple-400"
                                          : "bg-purple-50 text-purple-600"
                                        : isDarkMode
                                          ? "bg-indigo-950/50 text-indigo-400"
                                          : "bg-indigo-50 text-indigo-500",
                                )}
                              >
                                <RefreshCw size={14} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-4 mb-2.5 flex-wrap">
                                  <h5
                                    className={cn(
                                      "text-sm font-bold tracking-tight leading-snug",
                                      isDarkMode
                                        ? "text-slate-100"
                                        : "text-slate-900",
                                    )}
                                  >
                                    {item.title || ""}
                                  </h5>
                                </div>

                                <div
                                  className={cn(
                                    "text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium",
                                    isDarkMode
                                      ? "text-slate-300"
                                      : "text-slate-600",
                                  )}
                                >
                                  {item.content}
                                </div>

                                {/* Gợi ý tương tác dời xuống dưới nội dung chi tiết & Mức độ nghiêm trọng */}
                                {((item.target && item.target.trim() !== "" && canSeeInteractionSuggestions) ||
                                  (item.severity && !((!canSeeInteractionSuggestions) && (item.severity === "Cần theo dõi điều trị" || item.severity === "Cần theo dõi người bệnh")))) && (
                                  <div
                                    className={cn(
                                      "flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-dashed w-full",
                                      isDarkMode
                                        ? "border-slate-850"
                                        : "border-slate-100",
                                    )}
                                  >
                                    {item.target &&
                                    item.target.trim() !== "" &&
                                    canSeeInteractionSuggestions ? (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                            isDarkMode
                                              ? "bg-indigo-950/40 border-indigo-900/30 text-indigo-350"
                                              : "bg-indigo-50 border-indigo-100 text-indigo-700",
                                          )}
                                        >
                                          <Pill
                                            size={11}
                                            className="text-indigo-500"
                                          />
                                          {item.selfIngredient ||
                                            (selfActiveIngs.length === 1
                                              ? selfActiveIngs[0]
                                              : "Hoạt chất")}
                                        </span>

                                        <span className="text-xs font-bold px-1 text-slate-400 font-mono animate-pulse">
                                          ⇆
                                        </span>

                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                            item.partnerType === "group"
                                              ? isDarkMode
                                                ? "bg-emerald-950/40 border-emerald-900/30 text-emerald-350"
                                                : "bg-emerald-50 border-emerald-100 text-emerald-700"
                                              : isDarkMode
                                                ? "bg-purple-950/40 border-purple-900/30 text-purple-350"
                                                : "bg-purple-50 border-purple-100 text-purple-700",
                                          )}
                                        >
                                          {item.partnerType === "group" ? (
                                            <FolderTree
                                              size={11}
                                              className="text-emerald-500"
                                            />
                                          ) : (
                                            <Pill
                                              size={11}
                                              className="text-purple-500"
                                            />
                                          )}
                                          <span className="font-semibold italic text-[8.5px] lowercase tracking-normal mr-0.5 text-slate-400">
                                            tương tác:
                                          </span>
                                          {item.target}
                                        </span>
                                      </div>
                                    ) : (
                                      <div />
                                    )}

                                    {item.severity && !((!canSeeInteractionSuggestions) && (item.severity === "Cần theo dõi điều trị" || item.severity === "Cần theo dõi người bệnh")) && (
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border shrink-0 sm:ml-auto md:float-right",
                                          item.severity === "Chống chỉ định"
                                            ? isDarkMode
                                              ? "bg-red-950/30 border-red-900/30 text-red-400"
                                              : "bg-red-50 border-red-100 text-red-700"
                                            : item.severity === "Phối hợp nguy hiểm"
                                              ? isDarkMode
                                                ? "bg-rose-950/30 border-rose-900/30 text-rose-400"
                                                : "bg-rose-50 border-rose-100 text-rose-700"
                                            : item.severity ===
                                                "Cần cân nhắc lợi, hại"
                                              ? isDarkMode
                                                ? "bg-orange-950/30 border-orange-900/30 text-orange-400"
                                                : "bg-orange-50 border-orange-100 text-orange-700"
                                              : item.severity ===
                                                  "Cần theo dõi người bệnh"
                                                ? isDarkMode
                                                  ? "bg-purple-950/30 border-purple-900/30 text-purple-400"
                                                  : "bg-purple-50 border-purple-100 text-purple-700"
                                                : isDarkMode
                                                  ? "bg-blue-950/30 border-blue-900/30 text-blue-400"
                                                  : "bg-blue-50 border-blue-100 text-blue-700",
                                        )}
                                      >
                                        {item.severity}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );

                          const grouped = selfActiveIngs.map((ingName) => {
                            const items = filteredInteractions.filter((item) =>
                              isIngredientMatch(
                                item.selfIngredient,
                                ingName,
                                ingredients,
                              ),
                            );
                            return { ingName, items };
                          });

                          const unassignedItems = filteredInteractions.filter(
                            (item) => {
                              return !selfActiveIngs.some((ingName) =>
                                isIngredientMatch(
                                  item.selfIngredient,
                                  ingName,
                                  ingredients,
                                ),
                              );
                            },
                          );

                          return (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                              <h6
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest ml-1",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-400",
                                )}
                              >
                                Tương tác thuốc cụ thể
                              </h6>

                              {hasMultipleIngredients ? (
                                <div className="space-y-8">
                                  {grouped.map(({ ingName, items }, gIdx) => {
                                    if (items.length === 0) return null;
                                    return (
                                      <div key={`${ingName}-${gIdx}`} className="space-y-3">
                                        <div
                                          className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border w-fit text-xs font-bold uppercase tracking-wider shadow-sm",
                                            isDarkMode
                                              ? "bg-slate-900 border-slate-800 text-indigo-400"
                                              : "bg-indigo-50/50 border-indigo-100/50 text-indigo-700",
                                          )}
                                        >
                                          <Pill
                                            size={14}
                                            className="text-indigo-500"
                                          />
                                          Hoạt chất: {ingName} ({items.length})
                                        </div>
                                        <div className="space-y-3">
                                          {items.map((item, idx) =>
                                            renderInteractionItem(item, idx),
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {unassignedItems.length > 0 && (
                                    <div className="space-y-3">
                                      <div
                                        className={cn(
                                          "flex items-center gap-2 px-3 py-1.5 rounded-xl border w-fit text-xs font-bold uppercase tracking-wider shadow-sm",
                                          isDarkMode
                                            ? "bg-slate-900 border-slate-800 text-amber-400"
                                            : "bg-amber-50 border-amber-100 text-amber-700",
                                        )}
                                      >
                                        <AlertCircle
                                          size={14}
                                          className="text-amber-500"
                                        />
                                        Tương tác khác / Chưa phân loại (
                                        {unassignedItems.length})
                                      </div>
                                      <div className="space-y-3">
                                        {unassignedItems.map((item, idx) =>
                                          renderInteractionItem(item, idx),
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {filteredInteractions.map((item, idx) =>
                                    renderInteractionItem(item, idx),
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Fallback case if absolutely no interactions are recorded */}
                        {!drug.interactions &&
                          (!drug.specificInteractions ||
                            drug.specificInteractions.length === 0) &&
                          !drug.incompatibilities && (
                            <div className="text-center py-20 opacity-40">
                              <RefreshCw size={48} className="mx-auto mb-4" />
                              <p className="font-black uppercase tracking-tighter text-xs sm:text-sm">
                                Không có dữ liệu tương tác thuốc.
                              </p>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Pharmacology Tab */}
                    {activeDetailTab === "pharmacology" && (
                      <div className="space-y-4">
                        {(() => {
                          const hasPharmacodynamics =
                            drug.pharmacodynamics &&
                            (typeof drug.pharmacodynamics === "string"
                              ? drug.pharmacodynamics.trim() !== ""
                              : Array.isArray(drug.pharmacodynamics) &&
                                drug.pharmacodynamics.length > 0);

                          const hasPharmacokinetics =
                            drug.pharmacokinetics &&
                            (typeof drug.pharmacokinetics === "string"
                              ? drug.pharmacokinetics.trim() !== ""
                              : Array.isArray(drug.pharmacokinetics) &&
                                drug.pharmacokinetics.length > 0);

                          const drugGroupNames = (() => {
                            const ids = drug.groupIds && drug.groupIds.length > 0
                              ? drug.groupIds
                              : drug.groupId ? [drug.groupId] : [];
                            return ids
                              .map(id => drugGroups.find(g => g.id === id))
                              .filter(Boolean) as import('../types').DrugGroup[];
                          })();

                          const getGroupFullPath = (group: import('../types').DrugGroup): string => {
                            const pathList: string[] = [group.name];
                            let current = group;
                            let limit = 10;
                            while (current.parentId && limit > 0) {
                              const parent = drugGroups.find(g => g.id === current.parentId);
                              if (parent) {
                                pathList.unshift(parent.name);
                                current = parent;
                              } else {
                                break;
                              }
                              limit--;
                            }
                            return pathList.join(" > ");
                          };

                          const hasAnyData = drug.pharmacology || drug.atcCode || hasPharmacodynamics || hasPharmacokinetics || drugGroupNames.length > 0;

                          if (!hasAnyData) {
                            return (
                              <div className="text-center py-20 opacity-40">
                                <BookOpen size={48} className="mx-auto mb-4" />
                                <p className="font-black uppercase tracking-tighter text-xs sm:text-sm">
                                  Chưa cập nhật thông tin Dược lý cho thuốc này.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-4">
                              <div
                                className={cn(
                                  "p-6 rounded-3xl border",
                                  isDarkMode
                                    ? "bg-blue-500/5 border-blue-500/10 shadow-xl"
                                    : "bg-blue-50 border-blue-100 shadow-sm",
                                )}
                              >
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">
                                  <BookOpen size={16} /> Dược lý học
                                </h4>
                                {(drug.atcCode || drugGroupNames.length > 0) && (
                                  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                                    {drug.atcCode && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Mã ATC</span>
                                        <span
                                          className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider border",
                                            isDarkMode
                                              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                              : "bg-blue-100 border-blue-200 text-blue-700",
                                          )}
                                        >
                                          {drug.atcCode}
                                        </span>
                                      </div>
                                    )}
                                    {drug.atcCode && drugGroupNames.length > 0 && (
                                      <span className={cn("w-px h-4 shrink-0", isDarkMode ? "bg-slate-700" : "bg-slate-200")} />
                                    )}
                                    {drugGroupNames.length > 0 && (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Nhóm thuốc theo điều trị</span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {drugGroupNames.map((group, gIdx) => (
                                            <span
                                              key={`${group.id || 'grp'}-${gIdx}`}
                                              className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border",
                                                isDarkMode
                                                  ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                                                  : "bg-violet-50 border-violet-200 text-violet-700",
                                              )}
                                            >
                                              <FolderTree size={10} />
                                              {getGroupFullPath(group)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {drug.pharmacology && (
                                  <div className={cn(
                                    "text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium mb-4",
                                    isDarkMode ? "text-slate-300" : "text-slate-650"
                                  )}>
                                    {drug.pharmacology}
                                  </div>
                                )}

                                {(hasPharmacodynamics || hasPharmacokinetics) && (
                                  <div
                                    className={cn(
                                      "grid grid-cols-1 md:grid-cols-2 gap-4",
                                      (drug.pharmacology || drug.atcCode) ? "mt-4 pt-4 border-t" : "",
                                      isDarkMode ? "border-blue-900/30" : "border-blue-200/60",
                                    )}
                                  >
                                    {hasPharmacodynamics && (
                                      <div
                                        className={cn(
                                          "p-5 rounded-2xl border flex flex-col gap-3",
                                          isDarkMode
                                            ? "bg-slate-800/60 border-slate-700"
                                            : "bg-white border-slate-100 shadow-sm",
                                        )}
                                      >
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                          Dược lực học
                                        </h5>
                                        <div className="text-sm leading-relaxed opacity-95">
                                          {typeof drug.pharmacodynamics === "string" ? (
                                            <div className="whitespace-pre-wrap">{drug.pharmacodynamics}</div>
                                          ) : (
                                            <div className="space-y-4">
                                              {(drug.pharmacodynamics || []).map((item: any, idx: number) => (
                                                <div key={idx} className="space-y-1">
                                                  {item.category && (
                                                    <h6
                                                      className={cn(
                                                        "text-xs font-bold uppercase tracking-wider",
                                                        isDarkMode ? "text-emerald-400" : "text-emerald-700",
                                                      )}
                                                    >
                                                      {item.category}
                                                    </h6>
                                                  )}
                                                  <div
                                                    className={cn(
                                                      "text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium",
                                                      isDarkMode ? "text-slate-300" : "text-slate-650",
                                                    )}
                                                  >
                                                    {item.content}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {hasPharmacokinetics && (
                                      <div
                                        className={cn(
                                          "p-5 rounded-2xl border flex flex-col gap-3",
                                          isDarkMode
                                            ? "bg-slate-800/60 border-slate-700"
                                            : "bg-white border-slate-100 shadow-sm",
                                        )}
                                      >
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                          Dược động học
                                        </h5>
                                        <div className="text-sm leading-relaxed opacity-95">
                                          {typeof drug.pharmacokinetics === "string" ? (
                                            <div className="whitespace-pre-wrap">{drug.pharmacokinetics}</div>
                                          ) : (
                                            <div className="space-y-4">
                                              {(drug.pharmacokinetics || []).map((item: any, idx: number) => (
                                                <div key={idx} className="space-y-1">
                                                  {item.category && (
                                                    <h6
                                                      className={cn(
                                                        "text-xs font-bold uppercase tracking-wider",
                                                        isDarkMode ? "text-indigo-400" : "text-indigo-700",
                                                      )}
                                                    >
                                                      {item.category}
                                                    </h6>
                                                  )}
                                                  <div
                                                    className={cn(
                                                      "text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium",
                                                      isDarkMode ? "text-slate-300" : "text-slate-650",
                                                    )}
                                                  >
                                                    {item.content}
                                                    </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Info Tab */}
                    {activeDetailTab === "info" && (
                      <div className="space-y-4">
                        {/* Chi tiết thành phần & Tá dược */}
                        <div
                          className={cn(
                            "p-6 rounded-3xl border space-y-4",
                            isDarkMode
                              ? "bg-slate-800 border-slate-700"
                              : "bg-white border-slate-200 shadow-sm",
                          )}
                        >
                          <div className="block mb-2 w-full overflow-hidden">
                            {drug.administrationRoute && (
                              <span
                                className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ml-2",
                                  isDarkMode
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : "bg-emerald-50 border-emerald-200 text-emerald-700",
                                )}
                                style={{ float: 'right' }}
                              >
                                {drug.administrationRoute === "Uông" ? "Uống" : drug.administrationRoute}
                              </span>
                            )}
                            {drug.tabletWeight && (
                              <span
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg font-mono ml-2",
                                  isDarkMode
                                    ? "bg-slate-900/40 text-slate-300"
                                    : "bg-slate-50 text-slate-600 border border-slate-100",
                                )}
                                style={{ float: 'right' }}
                              >
                                vừa đủ {drug.tabletWeight}
                              </span>
                            )}
                            <div className="flex items-center gap-3" style={{ float: 'left' }}>
                              <Pill size={18} className="text-blue-500" />
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 font-bold">
                                Thành phần cấu tạo
                              </h4>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Hoạt chất chính
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(drug.activeIngredients || []).map(
                                  (ing, idx) => (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "px-4 py-2.5 rounded-xl border flex flex-col gap-1 text-xs sm:text-sm",
                                        isDarkMode
                                          ? "bg-slate-900/50 border-slate-700"
                                          : "bg-slate-50 border-slate-100",
                                      )}
                                    >
                                      <div className="flex items-center justify-between font-bold w-full">
                                        <span className={isDarkMode ? "text-slate-200" : "text-slate-700"}>{ing.name}</span>
                                        <span className="text-blue-500 font-mono">
                                          {ing.amount}
                                          {ing.unit}
                                        </span>
                                      </div>
                                      {ing.equivalent && (
                                        <div className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 border-t border-dashed border-slate-200 dark:border-slate-800 pt-1 w-full">
                                          <span>Tương đương:</span>
                                          <span className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
                                            {ing.equivalent}
                                            {(ing.equivalentAmount || ing.equivalentUnit) && (
                                              <span className="text-blue-500 font-mono font-bold ml-1">
                                                ({ing.equivalentAmount}
                                                {ing.equivalentUnit})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>

                            {((drug.excipientsList || []).length > 0 ||
                              drug.excipients) && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                  Tá dược
                                </p>
                                {drug.excipientsList &&
                                drug.excipientsList.length > 0 ? (
                                  <div
                                    className={cn(
                                      "px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium leading-relaxed",
                                      isDarkMode
                                        ? "bg-slate-900/50 border-slate-700 text-slate-300"
                                        : "bg-slate-50 border-slate-100 text-slate-650",
                                    )}
                                  >
                                    {drug.excipientsList.map((exc, idx) => (
                                      <React.Fragment key={idx}>
                                        {idx > 0 && <span className="text-slate-400 dark:text-slate-600">, </span>}
                                        <span className={isDarkMode ? "text-slate-200" : "text-slate-850"}>
                                          {exc.name}
                                        </span>
                                        {(exc.amount || exc.unit) && (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs ml-1">
                                            ({exc.amount || "vừa đủ"} {exc.unit})
                                          </span>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                ) : (
                                  <div
                                    className={cn(
                                      "px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line",
                                      isDarkMode
                                        ? "bg-slate-900/50 border-slate-755 text-slate-300"
                                        : "bg-slate-50 border-slate-150 text-slate-650",
                                    )}
                                  >
                                    {drug.excipients}
                                  </div>
                                )}
                              </div>
                            )}

                            {drug.detailedDosageForm && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                  Dạng bào chế chi tiết
                                </p>
                                <div
                                  className={cn(
                                    "px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line",
                                    isDarkMode
                                      ? "bg-slate-900/50 border-slate-700 text-slate-300"
                                      : "bg-slate-50 border-slate-100 text-slate-600",
                                  )}
                                >
                                  {drug.detailedDosageForm}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Thông tin công ty */}
                        <div
                          className={cn(
                            "p-6 rounded-3xl border space-y-4",
                            isDarkMode
                              ? "bg-slate-800 border-slate-700"
                              : "bg-white border-slate-200 shadow-sm",
                          )}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Briefcase size={18} className="text-blue-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                              Thông tin công ty
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                                Nhà sản xuất
                              </p>
                              <p className={cn(
                                "text-xs sm:text-sm font-medium flex items-center gap-2",
                                isDarkMode ? "text-slate-300" : "text-slate-650"
                              )}>
                                {drug.manufacturer || "Chưa cập nhật"}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                                Số đăng ký (SĐK)
                              </p>
                              <p className={cn(
                                "text-xs sm:text-sm font-medium",
                                isDarkMode ? "text-slate-300" : "text-slate-650"
                              )}>
                                {drug.registrationNumber || "Chưa cập nhật"}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                                Phiên bản tờ hướng dẫn
                              </p>
                              <p className={cn(
                                "text-xs sm:text-sm font-medium",
                                isDarkMode ? "text-slate-300" : "text-slate-650"
                              )}>
                                {drug.leafletVersion || "Chưa cập nhật"}
                              </p>
                            </div>


                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                                Dạng bào chế
                              </p>
                              <p className={cn(
                                "text-xs sm:text-sm font-medium",
                                isDarkMode ? "text-slate-300" : "text-slate-650"
                              )}>
                                {drug.dosageForm || "Chưa cập nhật"}
                              </p>
                            </div>

                            {/* Badges for WHO-GMP and TCCS */}
                            {(drug.isWHOGMP || drug.isEUGMP || drug.isTCCS) && (
                              <div className="md:col-span-2 flex flex-wrap gap-2 pt-1">
                                {drug.isWHOGMP && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 shadow-sm">
                                    <Check size={12} className="stroke-[3]" />{" "}
                                    WHO-GMP
                                  </span>
                                )}
                                {drug.isEUGMP && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-500/10 text-purple-600 border border-purple-500/25 shadow-sm">
                                    <Check size={12} className="stroke-[3]" />{" "}
                                    EU-GMP
                                  </span>
                                )}
                                {drug.isTCCS && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/25 shadow-sm">
                                    <Check size={12} className="stroke-[3]" />{" "}
                                    TCCS
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Storage & Expiry conditions */}
                            {(drug.storageCondition ||
                              drug.storageTemperature ||
                              drug.shelfLife) && (
                              <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                {drug.storageCondition && (
                                  <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                                      Bảo quản
                                    </p>
                                    <p
                                      className={cn(
                                        "text-xs sm:text-sm font-medium",
                                        isDarkMode
                                          ? "text-slate-300"
                                          : "text-slate-650",
                                      )}
                                    >
                                      {drug.storageCondition}
                                    </p>
                                  </div>
                                )}
                                {drug.storageTemperature && (
                                  <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                                      Nhiệt độ BH
                                    </p>
                                    <p
                                      className={cn(
                                        "text-xs sm:text-sm font-medium",
                                        isDarkMode
                                          ? "text-slate-300"
                                          : "text-slate-650",
                                      )}
                                    >
                                      {drug.storageTemperature}
                                      {/°\s*c|độ\s*c/i.test(
                                        String(drug.storageTemperature),
                                      )
                                        ? ""
                                        : "°C"}
                                    </p>
                                  </div>
                                )}
                                {drug.shelfLife && (
                                  <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                                      Hạn dùng
                                    </p>
                                    <p
                                      className={cn(
                                        "text-xs sm:text-sm font-medium",
                                        isDarkMode
                                          ? "text-slate-300"
                                          : "text-slate-650",
                                      )}
                                    >
                                      {drug.shelfLife}
                                      {String(drug.shelfLife)
                                        .toLowerCase()
                                        .includes("kể từ ngày sản xuất")
                                        ? ""
                                        : " kể từ ngày sản xuất"}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metadata Rows */}
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Người cập nhật */}
                          <div
                            className={cn(
                              "flex-1 p-5 rounded-2xl border flex items-center gap-4",
                              isDarkMode
                                ? "bg-slate-800 border-slate-700"
                                : "bg-white border-slate-200 shadow-sm",
                            )}
                          >
                            <div
                              className={cn(
                                "p-2.5 rounded-xl shrink-0",
                                isDarkMode ? "bg-slate-700" : "bg-slate-100",
                              )}
                            >
                              <UserCheck size={18} className="text-blue-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5 truncate">
                                Cập nhật bởi
                              </p>
                              <p className={cn(
                                "text-xs sm:text-sm font-medium truncate",
                                isDarkMode ? "text-slate-300" : "text-slate-650",
                              )}>
                                {drug.updatedBy || "Hệ thống"}
                              </p>
                            </div>
                          </div>

                          {/* Ngày cập nhật */}
                          {drug.updatedAt && (
                            <div
                              className={cn(
                                "flex-1 p-5 rounded-2xl border flex items-center gap-4",
                                isDarkMode
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200 shadow-sm",
                              )}
                            >
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl shrink-0",
                                  isDarkMode ? "bg-slate-700" : "bg-slate-100",
                                )}
                              >
                                <Clock size={18} className="text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5 truncate">
                                  Ngày cập nhật
                                </p>
                                <p
                                  className={cn(
                                    "text-xs sm:text-sm font-medium truncate",
                                    isDarkMode
                                      ? "text-blue-400"
                                      : "text-blue-600",
                                  )}
                                >
                                  {(() => {
                                    try {
                                      return new Intl.DateTimeFormat("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                        timeZone: "Asia/Ho_Chi_Minh",
                                      }).format(new Date(drug.updatedAt));
                                    } catch {
                                      return drug.updatedAt;
                                    }
                                  })()}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Ngày tạo */}
                          {drug.createdAt && (
                            <div
                              className={cn(
                                "flex-1 p-5 rounded-2xl border flex items-center gap-4",
                                isDarkMode
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200 shadow-sm",
                              )}
                            >
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl shrink-0",
                                  isDarkMode ? "bg-slate-700" : "bg-slate-100",
                                )}
                              >
                                <Calendar
                                  size={18}
                                  className="text-emerald-500"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5 truncate">
                                  Ngày tạo
                                </p>
                                <p
                                  className={cn(
                                    "text-xs sm:text-sm font-medium truncate",
                                    isDarkMode
                                      ? "text-emerald-400"
                                      : "text-emerald-600",
                                  )}
                                >
                                  {(() => {
                                    try {
                                      return new Intl.DateTimeFormat("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      }).format(new Date(drug.createdAt));
                                    } catch {
                                      return drug.createdAt;
                                    }
                                  })()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tờ hướng dẫn PDF */}
                        {drug.pdfUrl && (
                          <button
                            type="button"
                            onClick={() => setShowPdfPreview(true)}
                            className={cn(
                              "w-full text-left flex items-center gap-3 p-5 rounded-2xl border transition-all hover:scale-[1.01] active:scale-95 cursor-pointer",
                              isDarkMode
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/15"
                                : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100 shadow-sm",
                            )}
                          >
                            <div
                              className={cn(
                                "p-2.5 rounded-xl shrink-0",
                                isDarkMode ? "bg-rose-500/20" : "bg-rose-100",
                              )}
                            >
                              <FileText size={18} className="text-rose-500" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">
                                Tài liệu đính kèm
                              </p>
                              <p className="text-xs sm:text-sm font-medium">
                                Xem tờ hướng dẫn sử dụng (PDF)
                              </p>
                            </div>
                            <ExternalLink
                              size={16}
                              className="opacity-50 shrink-0"
                            />
                          </button>
                        )}
                      </div>
                    )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Giao diện xem PDF trong cùng 1 khung Modal */}
            <AnimatePresence>
              {showPdfPreview && drug?.pdfUrl && (
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 280 }}
                  className={cn(
                    "h-full flex flex-col overflow-hidden z-20 shrink-0 border-l shadow-2xl",
                    "w-full absolute inset-0 lg:relative lg:inset-auto lg:w-1/2",
                    isDarkMode
                      ? "bg-slate-900 text-white border-slate-800"
                      : "bg-white text-slate-900 border-slate-200"
                  )}
                >
                  {/* Header */}
                  <div
                    className={cn(
                      "p-4 sm:p-5 border-b flex items-center justify-between shrink-0",
                      isDarkMode
                        ? "border-slate-800 bg-slate-900/90"
                        : "border-slate-100 bg-slate-50/90"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "p-2.5 rounded-xl shrink-0",
                          isDarkMode ? "bg-rose-500/20 text-rose-400" : "bg-rose-100 text-rose-600"
                        )}
                      >
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-base truncate">
                          Tờ hướng dẫn sử dụng - {drug.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          Xem trước tài liệu PDF
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={drug.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors",
                          isDarkMode
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        )}
                        title="Mở trong tab mới"
                      >
                        <ExternalLink size={16} />
                        <span className="hidden sm:inline">Mở tab mới</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowPdfPreview(false)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer border",
                          isDarkMode
                            ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border-rose-500/30"
                            : "bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
                        )}
                        title="Đóng xem trước PDF"
                      >
                        <X size={16} />
                        <span>Đóng PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Body / PDF Viewer */}
                  <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col">
                    <iframe
                      src={drug.pdfUrl}
                      title={`Tờ hướng dẫn ${drug.name}`}
                      className="w-full h-full border-0 flex-1"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DrugDetailModal;
