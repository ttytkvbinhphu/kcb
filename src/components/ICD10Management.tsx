import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Edit2, Trash2, X, Check, Filter, ClipboardList, Info, AlertTriangle, Pill, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LayoutDashboard, Layers, HelpCircle, LayoutGrid, Network, Star, Copy, ExternalLink } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, writeBatch, updateDoc, addDoc, auth, handleFirestoreError, OperationType } from '../firebase';
import * as XLSX from 'xlsx';
import { ICD10, Drug, UserProfile } from '../types';
import { 
  useICD10, 
  subscribeICD10, 
  triggerIcd10Sync, 
  getOfflineICD10, 
  getOfflineIndexedICD10, 
  buildIndexedIcdList, 
  IndexedICD10, 
  removeAccents 
} from '../lib/icdStore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import DrugDetailModal from './DrugDetailModal';
import ICDDetailModal from './ICDDetailModal';
import { ICD10ExcelManagement } from './ICD10ExcelManagement';
import { ICD10DirectorySidebar } from './ICD10DirectorySidebar';
import { getIcdChapterId, ICD10_CHAPTERS } from '../lib/icdChapters';

// Module-level caches to avoid re-computation on tab switches
let cachedGlobalDrugList: Drug[] = [];
let cachedGlobalDrugsByIcd: Record<string, { drugName: string; drugObj: Drug; status: 'default' | 'alternative' | 'not_recommended' | 'normal'; isPrimary: boolean }[]> = {};
let hasBuiltDrugsByIcd = false;

interface ICD10ManagementProps {
  activeTab?: string;
  canManage: boolean;
  isDarkMode?: boolean;
  isActive?: boolean;
  subHeaderPortalId?: string;
  featureSettings?: any;
  featureStates?: Record<string, string>;
  userRole?: string;
  userPowerPoints?: number;
  userProfile?: UserProfile;
  onSelectDrug?: (drug: Drug) => void;
  initialSearchTerm?: string | null;
  onClearInitialSearch?: () => void;
}

const ALL_SCOPE_FILTERS = ['code_name', 'guide'] as const;
const DEFAULT_SCOPE_FILTERS = ['code_name'] as const;
const ALL_SUGGESTION_FILTERS = ['has_suggestions', 'no_suggestions'] as const;
const ALL_GUIDE_FILTERS = ['has_guide', 'no_guide'] as const;
const ALL_STATUS_FILTERS = ['valid', 'expired', 'new', 'new_name'] as const;
const ALL_CHAPTER_FILTERS = ['A-B', 'C-D', 'E-H', 'I-K', 'L-N', 'O-Q', 'R-S', 'U-Z'] as const;
const ALL_CATEGORY_FILTERS = ['normal', 'appendix_a2', 'appendix_a3', 'restricted', 'appendix_a4', 'appendix_a5', 'appendix_a6', 'tt26'] as const;

const ICD10Management: React.FC<ICD10ManagementProps> = ({ 
  activeTab,
  canManage, 
  isDarkMode, 
  isActive = true,
  subHeaderPortalId,
  featureSettings, 
  featureStates,
  userRole, 
  userPowerPoints = 0,
  userProfile,
  onSelectDrug,
  initialSearchTerm,
  onClearInitialSearch
}) => {
  const isManage = activeTab === 'manage_icd10';

  const [viewStyle, setViewStyle] = useState<'excel' | 'card'>(() => {
    if (activeTab === 'manage_icd10') return 'excel';
    return 'card';
  });

  useEffect(() => {
    if (activeTab === 'manage_icd10') {
      setViewStyle('excel');
    } else {
      setViewStyle('card');
    }
  }, [activeTab]);

  const handleToggleViewStyle = (style: 'excel' | 'card') => {
    setViewStyle(style);
    localStorage.setItem('icd10_view_style', style);
  };
  const [icdList, setIcdList] = useState<ICD10[]>(() => getOfflineICD10());
  const [drugList, setDrugList] = useState<Drug[]>(() => cachedGlobalDrugList);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [favoriteOnlyFilter, setFavoriteOnlyFilter] = useState(false);
  const [scopeFilters, setScopeFilters] = useState<string[]>([...DEFAULT_SCOPE_FILTERS]);
  const [suggestionFilters, setSuggestionFilters] = useState<string[]>([...ALL_SUGGESTION_FILTERS]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([...ALL_CATEGORY_FILTERS]);
  const [statusFilters, setStatusFilters] = useState<string[]>([...ALL_STATUS_FILTERS]);
  const [chapterFilters, setChapterFilters] = useState<string[]>([...ALL_CHAPTER_FILTERS]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [guideFilters, setGuideFilters] = useState<string[]>([...ALL_GUIDE_FILTERS]);
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchDescModalOpen, setIsBatchDescModalOpen] = useState(false);
  const [batchDescText, setBatchDescText] = useState('');
  const [batchDescStatus, setBatchDescStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [batchDescResults, setBatchDescResults] = useState<{success: number, failed: string[]}>({ success: 0, failed: [] });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [editingIcd, setEditingIcd] = useState<ICD10 | null>(null);

  // Drug Detail Modal State
  const [detailDrug, setDetailDrug] = useState<Drug | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ICD Detail Modal State
  const [selectedIcdForDetail, setSelectedIcdForDetail] = useState<ICD10 | null>(null);
  const [isIcdDetailModalOpen, setIsIcdDetailModalOpen] = useState(false);

  // Copy Code Tag Modal State
  const [activeCopyTag, setActiveCopyTag] = useState<{
    id: string;
    code: string;
    desc: string;
    fullName: string;
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

  // Help Guide Viewer State
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideData, setGuideData] = useState<{ title: string; tabs: Array<{ id: string; title: string; paragraphs: string[] }> } | null>(null);
  const [activeGuideTabIdx, setActiveGuideTabIdx] = useState(0);
  const [guideSearchTerm, setGuideSearchTerm] = useState('');
  const [guideFontSize, setGuideFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  const handleShowDrugDetail = (drug: Drug) => {
    setDetailDrug(drug);
    setIsDetailModalOpen(true);
  };

  const handleShowIcdDetail = (icd: ICD10) => {
    setSelectedIcdForDetail(icd);
    setIsIcdDetailModalOpen(true);
  };
  const [loading, setLoading] = useState(() => getOfflineICD10().length === 0);
  const [loadingPercentage, setLoadingPercentage] = useState(() => getOfflineICD10().length > 0 ? 100 : 0);
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem("icd_items_per_page");
    return saved ? Number(saved) : 20;
  });

  useEffect(() => {
    localStorage.setItem("icd_items_per_page", itemsPerPage.toString());
  }, [itemsPerPage]);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [mobileBottomNavHeight, setMobileBottomNavHeight] = useState<number>(() => {
    if (typeof window === "undefined") return 58;
    const navEl = document.getElementById("bottommobilenav") || document.querySelector("nav[aria-label='Mobile Navigation']");
    if (navEl) {
      const rect = navEl.getBoundingClientRect();
      const dist = Math.max(0, window.innerHeight - rect.top);
      if (dist > 0) return Math.round(dist);
    }
    return 58;
  });

  useEffect(() => {
    if (!isMobile) return;
    const updateHeight = () => {
      const navEl = document.getElementById("bottommobilenav") || document.querySelector("nav[aria-label='Mobile Navigation']");
      if (navEl) {
        const rect = navEl.getBoundingClientRect();
        const dist = Math.max(0, window.innerHeight - rect.top);
        if (dist > 0) {
          setMobileBottomNavHeight(Math.round(dist));
          return;
        }
      }
      setMobileBottomNavHeight(58);
    };

    updateHeight();
    const timer = setTimeout(updateHeight, 150);
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);

    let ro: ResizeObserver | null = null;
    const navEl = document.getElementById("bottommobilenav") || document.querySelector("nav[aria-label='Mobile Navigation']");
    if (navEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateHeight);
      ro.observe(navEl);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
      if (ro) ro.disconnect();
    };
  }, [isMobile]);
  const previousPageRef = useRef(1);
  const isSearchingRef = useRef(false);
  const prevFiltersRef = useRef<{
    searchTerm: string;
    favoriteOnlyFilter: boolean;
    scopeFilters: string[];
    suggestionFilters: string[];
    categoryFilters: string[];
    chapterFilters: string[];
    selectedChapterId: string;
    guideFilters: string[];
    statusFilters: string[];
  }>({ 
    searchTerm: '', 
    favoriteOnlyFilter: false,
    scopeFilters: [...DEFAULT_SCOPE_FILTERS],
    suggestionFilters: [...ALL_SUGGESTION_FILTERS],
    categoryFilters: [...ALL_CATEGORY_FILTERS],
    chapterFilters: [...ALL_CHAPTER_FILTERS],
    selectedChapterId: 'all',
    guideFilters: [...ALL_GUIDE_FILTERS],
    statusFilters: [...ALL_STATUS_FILTERS]
  });

  const favoriteCount = useMemo(() => {
    return (userProfile?.pinnedIcdCodes || []).length;
  }, [userProfile?.pinnedIcdCodes]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    const isScopeDefault = scopeFilters.length === DEFAULT_SCOPE_FILTERS.length && 
      DEFAULT_SCOPE_FILTERS.every(s => scopeFilters.includes(s));
    if (!isScopeDefault) count++;
    if (suggestionFilters.length < ALL_SUGGESTION_FILTERS.length) count++;
    if (categoryFilters.length < ALL_CATEGORY_FILTERS.length) count++;
    if (chapterFilters.length < ALL_CHAPTER_FILTERS.length) count++;
    if (selectedChapterId !== 'all') count++;
    if (guideFilters.length < ALL_GUIDE_FILTERS.length) count++;
    if (statusFilters.length < ALL_STATUS_FILTERS.length) count++;
    return count;
  }, [scopeFilters, suggestionFilters, categoryFilters, chapterFilters, selectedChapterId, guideFilters, statusFilters]);

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || 
      favoriteOnlyFilter ||
      activeFiltersCount > 0;
  }, [searchTerm, favoriteOnlyFilter, activeFiltersCount]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFavoriteOnlyFilter(false);
    setSelectedChapterId('all');
    setScopeFilters([...DEFAULT_SCOPE_FILTERS]);
    setSuggestionFilters([...ALL_SUGGESTION_FILTERS]);
    setCategoryFilters([...ALL_CATEGORY_FILTERS]);
    setChapterFilters([...ALL_CHAPTER_FILTERS]);
    setGuideFilters([...ALL_GUIDE_FILTERS]);
    setStatusFilters([...ALL_STATUS_FILTERS]);
  };

  const toggleScopeFilter = (scope: string) => {
    setScopeFilters(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope) 
        : [...prev, scope]
    );
    scrollToTop();
  };

  const toggleCategoryFilter = (category: string) => {
    setCategoryFilters(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
    scrollToTop();
  };

  const toggleSuggestionFilter = (filter: string) => {
    setSuggestionFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter) 
        : [...prev, filter]
    );
    scrollToTop();
  };

  const toggleGuideFilter = (filter: string) => {
    setGuideFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter) 
        : [...prev, filter]
    );
    scrollToTop();
  };

  const toggleStatusFilter = (filter: string) => {
    setStatusFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter) 
        : [...prev, filter]
    );
    scrollToTop();
  };

  const toggleChapterFilter = (chapter: string) => {
    setChapterFilters(prev => 
      prev.includes(chapter) 
        ? prev.filter(c => c !== chapter) 
        : [...prev, chapter]
    );
    scrollToTop();
  };

  const scrollToTop = () => {
    const scrollElement = document.querySelector('.drug-list-container') || document.querySelector('main');
    if (scrollElement) {
      scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [formData, setFormData] = useState<ICD10>({
    code: '',
    groupCode: '',
    description: '',
    notes: '',
    isAppendixA2: false,
    isNew: false,
    isExpired: false,
    oldName: '',
    chapterName: '',
    blockName: ''
  });


  // Live lookup: prevents stale-reference ghost injections after tab change.
  const getPortalTarget = () =>
    subHeaderPortalId ? document.getElementById(subHeaderPortalId) : null;

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      onClearInitialSearch?.();
    }
  }, [initialSearchTerm, onClearInitialSearch]);

  const getCleanIcdCode = (str: string) => str ? str.split(" - ")[0].trim().toUpperCase() : "";

  const getDrugStatusForIcd = (drug: Drug, targetCode: string): { status: 'default' | 'alternative' | 'not_recommended' | 'normal'; isPrimary: boolean } => {
    const cleanTarget = getCleanIcdCode(targetCode);
    if (!cleanTarget) return { status: 'normal', isPrimary: false };

    let highestStatus: 'default' | 'alternative' | 'not_recommended' | 'normal' = 'normal';
    let isPrimaryIndication = false;

    for (const ind of drug.indications || []) {
      const icd10s = ind.icd10s || [];
      const matchesTarget = icd10s.some(item => getCleanIcdCode(item) === cleanTarget);

      if (matchesTarget) {
        const isDefault =
          (ind.defaultIcd10s || []).some(x => getCleanIcdCode(x) === cleanTarget) ||
          (ind.defaultIcd10 ? getCleanIcdCode(ind.defaultIcd10) === cleanTarget : false) ||
          (ind.isRecommended ?? false);

        if (isDefault) {
          highestStatus = 'default';
          if (ind.isPrimary) {
            isPrimaryIndication = true;
          }
        } else if (highestStatus !== 'default') {
          const isAlternative = (ind.betterAlternativeIcd10s || []).some(x => getCleanIcdCode(x) === cleanTarget);
          if (isAlternative) {
            highestStatus = 'alternative';
          } else {
            const isNotRecommended = (ind.notRecommendedIcd10s || []).some(x => getCleanIcdCode(x) === cleanTarget);
            if (isNotRecommended) {
              if (highestStatus === 'normal') highestStatus = 'not_recommended';
            } else if (ind.isNotRecommended && highestStatus === 'normal') {
              highestStatus = 'not_recommended';
            }
          }
        }
      }
    }

    // Only apply isPrimary if it is a recommended/default ICD-10 code
    const isPrimary = isPrimaryIndication && highestStatus === 'default';

    return { status: highestStatus, isPrimary };
  };

  const drugsByIcd = useMemo(() => {
    if (drugList.length === 0 && Object.keys(cachedGlobalDrugsByIcd).length > 0) {
      return cachedGlobalDrugsByIcd;
    }
    if (hasBuiltDrugsByIcd && drugList === cachedGlobalDrugList) {
      return cachedGlobalDrugsByIcd;
    }

    const map: Record<string, { drugName: string; drugObj: Drug; status: 'default' | 'alternative' | 'not_recommended' | 'normal'; isPrimary: boolean }[]> = {};
    
    drugList.forEach(drug => {
      const codes = new Set<string>();
      (drug.indications || []).forEach(ind => {
        (ind.icd10s || []).forEach(icdItem => {
          if (icdItem && typeof icdItem === 'string') {
            const codeOnly = getCleanIcdCode(icdItem);
            if (codeOnly) codes.add(codeOnly);
          }
        });
      });

      codes.forEach(code => {
        if (!map[code]) map[code] = [];
        if (!map[code].some(item => item.drugName === drug.name)) {
          const { status, isPrimary } = getDrugStatusForIcd(drug, code);
          map[code].push({
            drugName: drug.name,
            drugObj: drug,
            status,
            isPrimary,
          });
        }
      });
    });

    const statusOrder: Record<string, number> = {
      default: 1,
      alternative: 2,
      normal: 3,
      not_recommended: 4,
    };

    Object.keys(map).forEach(code => {
      map[code].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) {
          return a.isPrimary ? -1 : 1;
        }
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3) || (a.drugName < b.drugName ? -1 : (a.drugName > b.drugName ? 1 : 0));
      });
    });

    cachedGlobalDrugList = drugList;
    cachedGlobalDrugsByIcd = map;
    hasBuiltDrugsByIcd = true;

    return map;
  }, [drugList]);

  const isDrugSuggestionsAllowed = useMemo(() => {
    return userPowerPoints >= (featureSettings?.drugSuggestionsMinPower ?? 0);
  }, [featureSettings, userPowerPoints]);

  const canSeeAppendixA2 = useMemo(() => {
    return userPowerPoints >= (featureSettings?.showAppendixA2MinPower ?? 0);
  }, [featureSettings, userPowerPoints]);

  const canSeeNotes = true;

  const canSeeShortcuts = useMemo(() => {
    return userPowerPoints >= (featureSettings?.showShortcutsMinPower ?? 0);
  }, [featureSettings, userPowerPoints]);

  useEffect(() => {
    const unsubscribeICD = subscribeICD10((list) => {
      setIcdList(list);
      setLoading(false);
    });

    const unsubscribeDrugs = onSnapshot(collection(db, 'drugs'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Drug);
      setDrugList(list);
    }, (error) => {
      console.error("Error fetching drugs for ICD-10:", error);
    });

    const unsubscribeGuide = onSnapshot(doc(db, 'system_config', 'guide_icd10'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGuideData({
          title: data.title || 'Hướng dẫn Tra cứu ICD-10',
          tabs: data.tabs || []
        });
      } else {
        setGuideData({
          title: 'Hướng dẫn Tra cứu ICD-10',
          tabs: [
            {
              id: 'tab-1',
              title: 'Tổng quan',
              paragraphs: [
                'Tra cứu ICD-10 là công cụ hỗ trợ tìm kiếm nhanh mã bệnh quốc tế ICD-10.',
                'Nhập mã ICD-10 hoặc tên bệnh tiếng Việt không dấu/có dấu để tìm kiếm.',
                'Bạn có thể click vào các nút triệu chứng hoặc tình trạng để lọc nhanh mã bệnh theo chương.'
              ]
            }
          ]
        });
      }
    }, (error) => {
      console.error("Error loading guides inside ICD10Management:", error);
    });

    return () => {
      unsubscribeICD();
      unsubscribeDrugs();
      unsubscribeGuide();
    };
  }, []);

  useEffect(() => {
    if (icdList.length === 0 && loading) {
      setLoadingPercentage(0);
      const interval = setInterval(() => {
        setLoadingPercentage(prev => {
          if (prev < 30) return prev + Math.floor(Math.random() * 5) + 3;
          if (prev < 70) return prev + Math.floor(Math.random() * 3) + 1;
          if (prev < 98) return prev + (Math.random() > 0.45 ? 1 : 0);
          return prev;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setLoadingPercentage(100);
    }
  }, [icdList.length, loading]);

  // Pre-index normalized search strings and properties once when icdList updates
  const indexedIcdList = useMemo<IndexedICD10[]>(() => {
    const offlineIndexed = getOfflineIndexedICD10();
    if (offlineIndexed.length > 0 && (icdList.length === 0 || icdList.length === offlineIndexed.length)) {
      return offlineIndexed;
    }
    return buildIndexedIcdList(icdList);
  }, [icdList]);

  const chapterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < indexedIcdList.length; i++) {
      const item = indexedIcdList[i];
      const chapId = getIcdChapterId(item.raw.code, item.raw.chapterName);
      if (chapId) {
        counts[chapId] = (counts[chapId] || 0) + 1;
      }
    }
    return counts;
  }, [indexedIcdList]);

  const guideCount = useMemo(() => {
    return indexedIcdList.filter(item => item.hasGuide).length;
  }, [indexedIcdList]);

  const suggestionCount = useMemo(() => {
    return indexedIcdList.filter(item => (drugsByIcd[item.cleanCode]?.length || 0) > 0).length;
  }, [indexedIcdList, drugsByIcd]);

  const filteredList = useMemo(() => {
    const trimmedQuery = (deferredSearchTerm || '').trim();
    const queryLower = trimmedQuery.toLowerCase();
    const queryNoAccents = removeAccents(trimmedQuery);

    const searchCodeName = scopeFilters.includes('code_name');
    const searchGuide = scopeFilters.includes('guide');

    // If both scopes disabled, return empty
    if (!searchCodeName && !searchGuide) return [];

    const hasCategoryFilter = categoryFilters.length < ALL_CATEGORY_FILTERS.length;
    const onlyAppendixSelected = hasCategoryFilter && categoryFilters.every(c => c !== 'normal');

    const hasStatusFilter = statusFilters.length < ALL_STATUS_FILTERS.length;
    const onlySpecialStatus = hasStatusFilter && statusFilters.every(s => s === 'new' || s === 'new_name');

    const hasChapterFilter = chapterFilters.length < ALL_CHAPTER_FILTERS.length;
    const filtersMap: Record<string, string[]> = {
      'A-B': ['A', 'B'],
      'C-D': ['C', 'D'],
      'E-H': ['E', 'F', 'G', 'H'],
      'I-K': ['I', 'J', 'K'],
      'L-N': ['L', 'M', 'N'],
      'O-Q': ['O', 'P', 'Q'],
      'R-S': ['R', 'S', 'T'],
      'U-Z': ['U', 'V', 'W', 'X', 'Y', 'Z']
    };

    const hasGuideFilter = guideFilters.length < ALL_GUIDE_FILTERS.length;
    const hasSuggestionFilter = suggestionFilters.length < ALL_SUGGESTION_FILTERS.length;

    const pinnedSet = new Set(userProfile?.pinnedIcdCodes || []);
    const workspaceSet = new Set(userProfile?.workspaceIcdCodes || []);

    const list: ICD10[] = [];

    for (let i = 0; i < indexedIcdList.length; i++) {
      const item = indexedIcdList[i];

      // 0. Favorite only filter
      if (favoriteOnlyFilter && !pinnedSet.has(item.raw.code)) {
        continue;
      }

      // 1. Scope check when no query
      if (!searchCodeName && searchGuide && !trimmedQuery) {
        if (!item.hasGuide) continue;
      }

      // 2. Keyword query filter (0 regex calls during keystroke, fast native string checks)
      if (trimmedQuery) {
        let matches = false;
        if (searchCodeName) {
          matches =
            item.codeLower.includes(queryLower) ||
            item.codeNoAccents.includes(queryNoAccents) ||
            item.searchContentLower.includes(queryLower) ||
            item.searchContentNoAccents.includes(queryNoAccents);
        }
        if (!matches && searchGuide && item.hasGuide) {
          matches =
            item.guideLower.includes(queryLower) ||
            item.guideNoAccents.includes(queryNoAccents);
        }
        if (!matches) continue;
      }

      // 3. Category filter
      if (hasCategoryFilter) {
        if (onlyAppendixSelected) {
          if (!item.categories.some(c => c !== 'normal' && categoryFilters.includes(c))) {
            continue;
          }
        } else {
          if (!item.categories.some(c => categoryFilters.includes(c))) {
            continue;
          }
        }
      }

      // 4. Status filter
      if (hasStatusFilter) {
        if (onlySpecialStatus) {
          if (!item.statuses.some(s => (s === 'new' || s === 'new_name') && statusFilters.includes(s))) {
            continue;
          }
        } else {
          if (!item.statuses.some(s => statusFilters.includes(s))) {
            continue;
          }
        }
      }

      // 5. Chapter filter from Left Sidebar (WHO Chapters I-XXII)
      if (selectedChapterId !== 'all') {
        const itemChapterId = getIcdChapterId(item.raw.code, item.raw.chapterName);
        if (itemChapterId !== selectedChapterId) {
          continue;
        }
      }

      // Legacy/Mobile 8-group chapter filter
      if (hasChapterFilter) {
        if (!item.firstChar) continue;
        const itemChapter = Object.keys(filtersMap).find(k => filtersMap[k].includes(item.firstChar));
        if (!itemChapter || !chapterFilters.includes(itemChapter)) {
          continue;
        }
      }

      // 6. Guide filter
      if (hasGuideFilter) {
        if (item.hasGuide && !guideFilters.includes('has_guide')) continue;
        if (!item.hasGuide && !guideFilters.includes('no_guide')) continue;
      }

      // 7. Suggestion filter
      if (hasSuggestionFilter) {
        const suggestions = drugsByIcd[item.cleanCode];
        const hasSuggestions = suggestions && suggestions.length > 0;
        if (hasSuggestions && !suggestionFilters.includes('has_suggestions')) continue;
        if (!hasSuggestions && !suggestionFilters.includes('no_suggestions')) continue;
      }

      // Format display item
      if (canManage) {
        list.push({ ...item.raw, isPinned: false, showOnWorkspace: false });
      } else {
        list.push({
          ...item.raw,
          isPinned: pinnedSet.has(item.raw.code),
          showOnWorkspace: workspaceSet.has(item.raw.code)
        });
      }
    }

    // Since indexedIcdList is already pre-sorted by code, items are pushed in exact ascending code order.
    // Returning directly eliminates expensive sort comparisons and prevents lag.
    return list;
  }, [indexedIcdList, deferredSearchTerm, favoriteOnlyFilter, scopeFilters, suggestionFilters, categoryFilters, chapterFilters, selectedChapterId, guideFilters, statusFilters, drugsByIcd, canManage, userProfile]);

  // Reset to page 1 when search term or filter changes, and restore previous page when cleared
  useEffect(() => {
    const prev = prevFiltersRef.current;

    const filtersChanged = 
      prev.searchTerm !== searchTerm || 
      prev.favoriteOnlyFilter !== favoriteOnlyFilter ||
      prev.scopeFilters.length !== scopeFilters.length ||
      prev.suggestionFilters.length !== suggestionFilters.length ||
      prev.categoryFilters.length !== categoryFilters.length ||
      prev.chapterFilters.length !== chapterFilters.length ||
      prev.selectedChapterId !== selectedChapterId ||
      prev.guideFilters.length !== guideFilters.length ||
      prev.statusFilters.length !== statusFilters.length ||
      scopeFilters.some(f => !prev.scopeFilters.includes(f)) ||
      suggestionFilters.some(f => !prev.suggestionFilters.includes(f)) ||
      categoryFilters.some(f => !prev.categoryFilters.includes(f)) ||
      chapterFilters.some(f => !prev.chapterFilters.includes(f)) ||
      guideFilters.some(f => !prev.guideFilters.includes(f)) ||
      statusFilters.some(f => !prev.statusFilters.includes(f));

    if (filtersChanged) {
      if (hasActiveFilters) {
        if (!isSearchingRef.current) {
          isSearchingRef.current = true;
        }
        setCurrentPage(1);
      } else {
        if (isSearchingRef.current) {
          setCurrentPage(previousPageRef.current);
          isSearchingRef.current = false;
        }
      }
      prevFiltersRef.current = { 
        searchTerm, 
        favoriteOnlyFilter,
        scopeFilters, 
        suggestionFilters, 
        categoryFilters, 
        chapterFilters, 
        selectedChapterId,
        guideFilters, 
        statusFilters 
      };
    } else if (!isSearchingRef.current) {
       previousPageRef.current = currentPage;
    }
  }, [searchTerm, favoriteOnlyFilter, scopeFilters, suggestionFilters, categoryFilters, chapterFilters, selectedChapterId, guideFilters, statusFilters, hasActiveFilters, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  // Safety: Cap currentPage within totalPages range when results change
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setPageInput(validPage.toString());
  }, [validPage]);

  const paginatedList = useMemo(() => {
    const start = (validPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, validPage, itemsPerPage]);

  const handleOpenModal = (icd?: ICD10) => {
    if (icd) {
      setEditingIcd(icd);
      const cleanCode = icd.code ? icd.code.trim().toUpperCase() : '';
      const autoGroup = cleanCode.includes('.')
        ? cleanCode.split('.')[0]
        : (cleanCode.length >= 3 ? cleanCode.slice(0, 3) : cleanCode);

      setFormData({
        ...icd,
        groupCode: icd.groupCode || autoGroup,
        chapterName: icd.chapterName || '',
        blockName: icd.blockName || ''
      });
    } else {
      setEditingIcd(null);
      setFormData({ 
        code: '', 
        groupCode: '',
        description: '', 
        notes: '', 
        guide: '',
        isAppendixA2: false,
        isRestricted: false,
        isNew: false,
        isExpired: false,
        oldName: '',
        chapterName: '',
        blockName: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.description) return;

    try {
      const docId = formData.id || formData.code;
      const cleanCode = formData.code.trim().toUpperCase();
      const autoGroup = cleanCode.includes('.')
        ? cleanCode.split('.')[0]
        : (cleanCode.length >= 3 ? cleanCode.slice(0, 3) : cleanCode);
      const cleanGroupCode = formData.groupCode
        ? formData.groupCode.trim().toUpperCase()
        : autoGroup;

      const payload: ICD10 = {
        ...formData,
        code: cleanCode,
        groupCode: cleanGroupCode
      };

      await setDoc(doc(db, 'icd10', docId), payload);
      await triggerIcd10Sync();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving ICD-10:", error);
    }
  };

  const confirmDelete = (code: string) => {
    setDeletingCode(code);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    try {
      const targetIcd = icdList.find(icd => icd.code === deletingCode);
      const docId = targetIcd?.id || deletingCode;
      await deleteDoc(doc(db, 'icd10', docId));
      await triggerIcd10Sync();
      setIsDeleteModalOpen(false);
      setDeletingCode(null);
    } catch (error) {
      console.error("Error deleting ICD-10:", error);
    }
  };

  const handleTogglePin = async (icd: ICD10) => {
    if (canManage || !userProfile || !userProfile.uid) return;
    try {
      const pinnedIcdCodes = userProfile.pinnedIcdCodes || [];
      const newPinnedIcdCodes = pinnedIcdCodes.includes(icd.code) 
        ? pinnedIcdCodes.filter(c => c !== icd.code)
        : [...pinnedIcdCodes, icd.code];
      
      const targetUid = userProfile.uid;
      await setDoc(doc(db, 'users', targetUid), {
        pinnedIcdCodes: newPinnedIcdCodes,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (typeof localStorage !== 'undefined' && localStorage.getItem('staff_login_session')) {
        try {
          const currentStaff = JSON.parse(localStorage.getItem('staff_login_session') || '{}');
          if (currentStaff.uid === targetUid) {
            currentStaff.pinnedIcdCodes = newPinnedIcdCodes;
            localStorage.setItem('staff_login_session', JSON.stringify(currentStaff));
          }
        } catch (e) {
          console.warn("Could not update staff_login_session", e);
        }
      }
    } catch (error) {
      if (userProfile?.uid) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
      }
    }
  };


  const handleToggleWorkspace = async (icd: ICD10) => {
    if (canManage || !userProfile || !userProfile.uid) return;
    try {
      const workspaceIcdCodes = userProfile.workspaceIcdCodes || [];
      const newWorkspaceIcdCodes = workspaceIcdCodes.includes(icd.code) 
        ? workspaceIcdCodes.filter(c => c !== icd.code)
        : [...workspaceIcdCodes, icd.code];
      
      const targetUid = userProfile.uid;
      await setDoc(doc(db, 'users', targetUid), {
        workspaceIcdCodes: newWorkspaceIcdCodes,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (typeof localStorage !== 'undefined' && localStorage.getItem('staff_login_session')) {
        try {
          const currentStaff = JSON.parse(localStorage.getItem('staff_login_session') || '{}');
          if (currentStaff.uid === targetUid) {
            currentStaff.workspaceIcdCodes = newWorkspaceIcdCodes;
            localStorage.setItem('staff_login_session', JSON.stringify(currentStaff));
          }
        } catch (e) {
          console.warn("Could not update staff_login_session", e);
        }
      }
    } catch (error) {
      if (userProfile?.uid) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
      }
    }
  };

  const handleToggleAppendixA2 = async (icd: ICD10) => {
    try {
      const docId = icd.id || icd.code;
      await updateDoc(doc(db, 'icd10', docId), {
        isAppendixA2: !icd.isAppendixA2
      });
      await triggerIcd10Sync();
    } catch (error) {
      console.error("Error toggling Appendix A2 status:", error);
    }
  };

  const handleToggleRestricted = async (icd: ICD10) => {
    try {
      const docId = icd.id || icd.code;
      await updateDoc(doc(db, 'icd10', docId), {
        isRestricted: !icd.isRestricted
      });
      await triggerIcd10Sync();
    } catch (error) {
      console.error("Error toggling Restricted status:", error);
    }
  };

  const handleToggleTT26 = async (icd: ICD10) => {
    try {
      const docId = icd.id || icd.code;
      await updateDoc(doc(db, 'icd10', docId), {
        isTT26: !icd.isTT26
      });
      await triggerIcd10Sync();
    } catch (error) {
      console.error("Error toggling TT26 status:", error);
    }
  };

  const handleBatchUpdateDescription = async () => {
    if (!batchDescText.trim()) return;
    setBatchDescStatus('processing');
    
    let successCount = 0;
    const failedItems: string[] = [];

    const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9.]/g, '');

    const lines = batchDescText.split('\n');
    const updates: { code: string; cleanCode: string; description: string }[] = [];

    lines.forEach(line => {
      if (!line.trim()) return;
      
      let rCode = '';
      let rDesc = '';
      
      if (line.includes(':')) {
        const index = line.indexOf(':');
        rCode = line.substring(0, index).trim();
        rDesc = line.substring(index + 1).trim();
      } else if (line.includes('|')) {
        const index = line.indexOf('|');
        rCode = line.substring(0, index).trim();
        rDesc = line.substring(index + 1).trim();
      } else {
        const words = line.trim().split(/\s+/);
        if (words.length >= 2) {
          rCode = words[0];
          rDesc = words.slice(1).join(' ');
        }
      }

      const clean = cleanCode(rCode);
      if (clean && rDesc) {
        updates.push({
          code: rCode,
          cleanCode: clean,
          description: rDesc
        });
      } else {
        failedItems.push(line);
      }
    });

    const finalIcdsToUpdate: { icd: ICD10; newDescription: string }[] = [];

    updates.forEach(update => {
      const matchedIcds = icdList.filter(icd => cleanCode(icd.code) === update.cleanCode);
      
      if (matchedIcds.length > 0) {
        matchedIcds.forEach(icd => {
          finalIcdsToUpdate.push({ icd, newDescription: update.description });
        });
      } else {
        failedItems.push(`${update.code} (Không tìm thấy mã)`);
      }
    });

    if (finalIcdsToUpdate.length === 0) {
      setBatchDescResults({ success: 0, failed: failedItems });
      setBatchDescStatus('done');
      return;
    }

    const batchSize = 100;
    for (let i = 0; i < finalIcdsToUpdate.length; i += batchSize) {
      const chunk = finalIcdsToUpdate.slice(i, i + batchSize);
      const batch = writeBatch(db);
      let batchOps = 0;

      for (const item of chunk) {
        try {
          const docId = item.icd.id || item.icd.code;
          const icdRef = doc(db, 'icd10', docId);
          batch.update(icdRef, { 
            description: item.newDescription,
            updatedAt: new Date().toISOString()
          });
          successCount++;
          batchOps++;
        } catch (err) {
          failedItems.push(`${item.icd.code} (Lỗi cập nhật)`);
        }
      }

      if (batchOps > 0) {
        await batch.commit();
      }
    }

    await triggerIcd10Sync();
    setBatchDescResults({ success: successCount, failed: failedItems });
    setBatchDescStatus('done');
  };

  const handleBatchDelete = async (codes: string[]) => {
    if (!codes || codes.length === 0) return;
    const CHUNK_SIZE = 100;
    for (let i = 0; i < codes.length; i += CHUNK_SIZE) {
      const chunk = codes.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((code) => {
        const target = icdList.find((item) => item.code === code);
        const docId = target?.id || code;
        batch.delete(doc(db, 'icd10', docId));
      });
      await batch.commit();
    }
    await triggerIcd10Sync();
  };

  const handleBatchToggleAppendixA2 = async (targetIcds: ICD10[], status: boolean) => {
    if (!targetIcds || targetIcds.length === 0) return;
    const CHUNK_SIZE = 100;
    for (let i = 0; i < targetIcds.length; i += CHUNK_SIZE) {
      const chunk = targetIcds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docId = item.id || item.code;
        batch.update(doc(db, 'icd10', docId), {
          isAppendixA2: status,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
    }
    await triggerIcd10Sync();
  };

  const handleBatchToggleTT26 = async (targetIcds: ICD10[], status: boolean) => {
    if (!targetIcds || targetIcds.length === 0) return;
    const CHUNK_SIZE = 100;
    for (let i = 0; i < targetIcds.length; i += CHUNK_SIZE) {
      const chunk = targetIcds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docId = item.id || item.code;
        batch.update(doc(db, 'icd10', docId), {
          isTT26: status,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
    }
    await triggerIcd10Sync();
  };

  const handleBatchTogglePin = async (codes: string[], isPin: boolean) => {
    if (!userProfile?.uid || !codes || codes.length === 0) return;
    const currentPinned = new Set(userProfile.pinnedIcdCodes || []);
    codes.forEach((code) => {
      if (isPin) {
        currentPinned.add(code);
      } else {
        currentPinned.delete(code);
      }
    });
    await setDoc(doc(db, 'users', userProfile.uid), {
      pinnedIcdCodes: Array.from(currentPinned),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  const handleBatchImport = async (importedIcds: Partial<ICD10>[]) => {
    if (!importedIcds || importedIcds.length === 0) return;
    const CHUNK_SIZE = 100;
    for (let i = 0; i < importedIcds.length; i += CHUNK_SIZE) {
      const chunk = importedIcds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        if (!item.code) return;
        const target = icdList.find((i) => i.code === item.code);
        const docId = target?.id || item.code;
        const cleanData: any = {
          code: item.code,
          description: item.description || target?.description || '',
          updatedAt: new Date().toISOString()
        };
        if (item.oldName !== undefined) cleanData.oldName = item.oldName;
        if (item.chapterName !== undefined) cleanData.chapterName = item.chapterName;
        if (item.blockName !== undefined) cleanData.blockName = item.blockName;
        if (item.guide !== undefined) cleanData.guide = item.guide;
        if (item.notes !== undefined) cleanData.notes = item.notes;
        if (item.isAppendixA2 !== undefined) cleanData.isAppendixA2 = item.isAppendixA2;
        if (item.isTT26 !== undefined) cleanData.isTT26 = item.isTT26;
        if (item.isRestricted !== undefined) cleanData.isRestricted = item.isRestricted;

        batch.set(doc(db, 'icd10', docId), cleanData, { merge: true });
      });
      await batch.commit();
    }
    await triggerIcd10Sync();
  };

  const handleExportICDCodes = () => {
    // Chỉ lấy cột mã ICD-10 từ danh sách đang hiển thị (filteredList)
    const dataToExport = filteredList.map(icd => ({
      'Mã ICD-10': icd.code,
      'Tên bệnh': icd.description,
      'Ghi chú': icd.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ICD-10 Codes');
    
    // Xuất file với tên có ngày hiện tại
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ICD10_Codes_${date}.xlsx`);
  };

  const handleExportGuideExcel = () => {
    const dataToExport = filteredList.map(icd => ({
      'Mã ICD-10': icd.code,
      'Hướng dẫn': icd.guide || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ICD-10 Guides');
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ICD10_Guides_${date}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin transition-colors" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-full mx-auto min-h-screen transition-colors flex flex-col lg:flex-row",
        isDarkMode
          ? "text-slate-200 lg:bg-slate-950/30"
          : "text-slate-900 lg:bg-slate-50/50"
      )}
    >
      {/* Left Sidebar for Tra cứu ICD-10 on PC */}
      <ICD10DirectorySidebar
        isDarkMode={isDarkMode}
        activeTab={activeTab}
        totalIcd={indexedIcdList.length}
        selectedChapterId={selectedChapterId}
        onSelectChapter={setSelectedChapterId}
        chapterCounts={chapterCounts}
        favoriteOnlyFilter={favoriteOnlyFilter}
        setFavoriteOnlyFilter={setFavoriteOnlyFilter}
        favoriteCount={favoriteCount}
        guideCount={guideCount}
        guideOnlyFilter={guideFilters.length === 1 && guideFilters.includes('has_guide')}
        onToggleGuideFilter={() => {
          if (guideFilters.length === 1 && guideFilters.includes('has_guide')) {
            setGuideFilters([...ALL_GUIDE_FILTERS]);
          } else {
            setGuideFilters(['has_guide']);
          }
        }}
        suggestionCount={suggestionCount}
        suggestionOnlyFilter={suggestionFilters.length === 1 && suggestionFilters.includes('has_suggestions')}
        onToggleSuggestionFilter={() => {
          if (suggestionFilters.length === 1 && suggestionFilters.includes('has_suggestions')) {
            setSuggestionFilters([...ALL_SUGGESTION_FILTERS]);
          } else {
            setSuggestionFilters(['has_suggestions']);
          }
        }}
        viewStyle={viewStyle}
        onToggleViewStyle={isManage ? handleToggleViewStyle : undefined}
        canManage={canManage && isManage}
        onOpenAddModal={isManage ? () => {
          setEditingIcd(null);
          setFormData({
            code: '',
            groupCode: '',
            description: '',
            notes: '',
            guide: '',
            isNew: false,
            oldName: '',
            isExpired: false,
            isAppendixA2: false,
            isAppendixA3: false,
            isAppendixA4: false,
            isAppendixA5: false,
            isAppendixA6: false,
            isRestricted: false,
            isTT26: false,
            chapterName: '',
            blockName: ''
          });
          setIsModalOpen(true);
        } : undefined}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 min-w-0 transition-colors p-1 sm:p-4 lg:p-6 overflow-x-hidden",
          isDarkMode ? "bg-slate-950/30" : "bg-white"
        )}
      >
        {/* Mobile Header Portal Search & Controls */}
      {(() => {
        if (isActive === false) return null;
        const portalTarget = getPortalTarget();
        return portalTarget ? createPortal(
          <div className="flex items-center justify-between w-full gap-1.5 lg:hidden">
            {!isGuideModalOpen ? (
              <>
                {/* Left: Thanh tra cứu ICD-10 */}
                <div className="relative flex-1 min-w-0 flex items-center">
                  <Search 
                    className={cn(
                      "absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
                      searchTerm ? "text-emerald-500" : "text-slate-400"
                    )} 
                    size={14} 
                  />
                  <input
                    type="text"
                    placeholder={
                      scopeFilters.includes('guide') && !scopeFilters.includes('code_name')
                        ? "Tìm H.Dẫn WHO..."
                        : scopeFilters.includes('code_name') && !scopeFilters.includes('guide')
                        ? "Tìm mã hoặc tên bệnh..."
                        : "Tìm mã, tên, H.Dẫn..."
                    }
                    className={cn(
                      "w-full pl-8 pr-7 py-1.5 text-xs bg-transparent border-0 outline-none focus:outline-none focus:ring-0 transition-all font-bold",
                      isDarkMode 
                        ? "text-white placeholder:text-slate-500" 
                        : "text-slate-900 placeholder:text-slate-400"
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Xóa tìm kiếm"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Right: 2 nút: 1. Nút lọc, 2. Nút yêu thích */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* 1. Nút lọc */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowFilters(!showFilters);
                      scrollToTop();
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all flex items-center justify-center relative cursor-pointer active:scale-95",
                      showFilters 
                        ? isDarkMode
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-50 text-emerald-600"
                        : isDarkMode
                          ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    )}
                    title="Bộ lọc nâng cao"
                  >
                    <Filter size={15} />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center bg-emerald-600 text-white text-[8.5px] min-w-3.5 h-3.5 px-0.5 rounded-full font-black border border-white dark:border-slate-900 shadow-2xs pointer-events-none z-10">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* 2. Nút yêu thích */}
                  <button
                    type="button"
                    onClick={() => setFavoriteOnlyFilter(prev => !prev)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all flex items-center justify-center relative cursor-pointer active:scale-95",
                      favoriteOnlyFilter
                        ? "text-amber-500 bg-amber-500/15"
                        : favoriteCount > 0
                          ? isDarkMode
                            ? "text-amber-400 hover:bg-amber-500/15"
                            : "text-amber-600 hover:bg-amber-50"
                          : isDarkMode
                            ? "text-slate-400 hover:text-amber-400 hover:bg-slate-800/60"
                            : "text-slate-500 hover:text-amber-600 hover:bg-slate-100"
                    )}
                    title={favoriteOnlyFilter ? "Hiển thị tất cả mã ICD-10" : "Lọc mã ICD-10 yêu thích"}
                  >
                    <Star
                      size={16}
                      className={cn(
                        favoriteOnlyFilter
                          ? "fill-amber-400 text-amber-500"
                          : favoriteCount > 0
                            ? "fill-amber-400 text-amber-500"
                            : "text-current"
                      )}
                    />
                    {favoriteCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center text-[8.5px] min-w-3.5 h-3.5 px-0.5 rounded-full font-black bg-amber-500 text-white border border-white dark:border-slate-900 leading-none shadow-2xs pointer-events-none z-10">
                        {favoriteCount > 99 ? "99+" : favoriteCount}
                      </span>
                    )}
                  </button>

                  {/* 3. Nút chuyển đổi phong cách Bảng tính Excel */}
                  {isManage && (
                    <button
                      type="button"
                      onClick={() => handleToggleViewStyle(viewStyle === 'excel' ? 'card' : 'excel')}
                      className={cn(
                        "p-1.5 rounded-lg transition-all flex items-center justify-center relative cursor-pointer active:scale-95",
                        viewStyle === 'excel'
                          ? "text-emerald-500 bg-emerald-500/15"
                          : isDarkMode
                          ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60"
                          : "text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                      )}
                      title={viewStyle === 'excel' ? "Xem dạng Thẻ" : "Xem dạng Bảng tính Excel"}
                    >
                      <FileSpreadsheet size={15} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <X size={12} />
                <span>Quay lại Tra cứu</span>
              </button>
            )}
          </div>,
          portalTarget
        ) : null;
      })()}

      {viewStyle === 'excel' ? (
        <ICD10ExcelManagement
          icdList={icdList}
          drugList={drugList}
          isDarkMode={isDarkMode}
          canManage={canManage}
          userRole={userRole}
          userProfile={userProfile}
          featureSettings={featureSettings}
          onAddIcd={() => handleOpenModal()}
          onEditIcd={(icd) => handleOpenModal(icd)}
          onViewIcdDetail={(icd) => handleShowIcdDetail(icd)}
          onDeleteIcd={(code) => confirmDelete(code)}
          onBatchDelete={handleBatchDelete}
          onBatchToggleAppendixA2={handleBatchToggleAppendixA2}
          onBatchToggleTT26={handleBatchToggleTT26}
          onBatchTogglePin={handleBatchTogglePin}
          onBatchImport={handleBatchImport}
          onOpenBatchUpdateDesc={() => setIsBatchDescModalOpen(true)}
          onSelectDrug={onSelectDrug}
          onSwitchToCardView={() => handleToggleViewStyle('card')}
          initialSearchTerm={initialSearchTerm}
          onClearInitialSearch={onClearInitialSearch}
        />
      ) : (
        <>
          <div className="w-full mb-2 lg:mb-10 space-y-6">
        {/* Guest Search Bar for Mobile (since portal subheader is missing in guest modal) */}
        {!userRole && !isGuideModalOpen && (
          <div className="lg:hidden mb-4 space-y-2 w-full">
            <div className="flex gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder={
                    scopeFilters.includes('guide') && !scopeFilters.includes('code_name')
                      ? "Tìm từ khóa trong Hướng dẫn WHO 2019..."
                      : scopeFilters.includes('code_name') && !scopeFilters.includes('guide')
                      ? "Tìm theo mã hoặc tên bệnh..."
                      : "Tìm mã, tên bệnh, Hướng dẫn WHO..."
                  }
                  className={cn(
                    "w-full pl-10 pr-10 py-3 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-xs font-bold",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" 
                      : "bg-white border-slate-200 text-slate-900 shadow-sm"
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setActiveGuideTabIdx(0);
                  setIsGuideModalOpen(!isGuideModalOpen);
                }}
                className={cn(
                  "p-3 rounded-2xl border transition-all",
                  isGuideModalOpen
                    ? "bg-amber-500 border-amber-500 text-white shadow-lg"
                    : (isDarkMode ? "bg-slate-800 border-slate-700 text-amber-500 hover:bg-slate-700" : "bg-white border-slate-200 text-amber-500 hover:bg-amber-50/50")
                )}
                title="Hướng dẫn & Trợ giúp"
              >
                <HelpCircle size={20} />
              </button>
              <button
                onClick={() => {
                  setShowFilters(!showFilters);
                  scrollToTop();
                }}
                className={cn(
                  "p-3 rounded-2xl border transition-all",
                  showFilters 
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200" 
                    : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-400")
                )}
              >
                <Filter size={20} />
              </button>
            </div>

            {/* Guest Mobile Scope Selector */}
            <div className={cn(
              "flex items-center gap-1.5 p-1 rounded-xl border transition-colors",
              isDarkMode ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-100 border-slate-200"
            )}>
              {[
                { id: 'code_name', label: 'Mã & Tên' },
                { id: 'guide', label: 'H.Dẫn WHO' }
              ].map((s, sIdx) => (
                <button
                  key={`guest-mob-scope-${s.id}-${sIdx}`}
                  type="button"
                  onClick={() => toggleScopeFilter(s.id)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center",
                    scopeFilters.includes(s.id)
                      ? (isDarkMode 
                          ? "bg-emerald-600 text-white shadow-sm font-black" 
                          : "bg-white text-emerald-700 shadow-sm border border-slate-200/50 font-black")
                      : (isDarkMode 
                          ? "text-slate-500 line-through opacity-60" 
                          : "text-slate-400 line-through opacity-60")
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Filters UI - Appears below sub-header */}
        <AnimatePresence>
          {showFilters && !isGuideModalOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden mb-4"
            >
              <div className={cn(
                "p-3 rounded-2xl border space-y-4 shadow-sm transition-all",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-emerald-50/30 border-emerald-100"
              )}>
                {/* Mobile Reset Filters Button */}
                {hasActiveFilters && (
                  <div className={cn("flex items-center justify-between pb-2 border-b border-dashed", isDarkMode ? "border-slate-800" : "border-slate-200")}>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Bộ lọc đang hoạt động</span>
                    <button
                      onClick={handleClearAllFilters}
                      title="Tắt nhanh lọc"
                      className={cn(
                        "p-1 rounded-lg text-rose-500 hover:text-rose-600 transition-colors",
                        isDarkMode ? "hover:bg-rose-950/40" : "hover:bg-rose-50"
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Search Scope Filter Mobile */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Phạm vi tìm kiếm</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 p-1 rounded-xl border transition-colors",
                    isDarkMode ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-100 border-slate-200"
                  )}>
                    {[
                      { id: 'code_name', label: 'Mã & Tên' },
                      { id: 'guide', label: 'H.Dẫn WHO' }
                    ].map((s, sIdx) => (
                      <button
                        key={`mob-filt-scope-${s.id}-${sIdx}`}
                        type="button"
                        onClick={() => toggleScopeFilter(s.id)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center",
                          scopeFilters.includes(s.id)
                            ? (isDarkMode 
                                ? "bg-emerald-600 text-white shadow-sm font-black" 
                                : "bg-white text-emerald-700 shadow-sm border border-slate-200/50 font-black")
                            : (isDarkMode 
                                ? "text-slate-500 line-through opacity-60" 
                                : "text-slate-400 line-through opacity-60")
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filters Mobile */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Phân loại danh mục</span>
                    </div>
                    <div className="flex flex-wrap gap-1 items-center justify-end">
                      {categoryFilters.includes('appendix_a2') && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 rounded",
                          isDarkMode 
                            ? "bg-indigo-950/40 text-indigo-400 border border-indigo-900/30" 
                            : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        )}>
                          24
                        </span>
                      )}
                      {categoryFilters.includes('appendix_a3') && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 rounded",
                          isDarkMode 
                            ? "bg-amber-950/40 text-amber-400 border border-amber-900/30" 
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        )}>
                          25
                        </span>
                      )}
                      {categoryFilters.includes('restricted') && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 rounded",
                          isDarkMode 
                            ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" 
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        )}>
                          26
                        </span>
                      )}
                      {categoryFilters.includes('appendix_a4') && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 rounded",
                          isDarkMode 
                            ? "bg-blue-950/40 text-blue-400 border border-blue-900/30" 
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                        )}>
                          27
                        </span>
                      )}
                      {categoryFilters.includes('appendix_a5') && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 rounded",
                          isDarkMode 
                            ? "bg-pink-950/40 text-pink-400 border border-pink-900/30" 
                            : "bg-pink-50 text-pink-600 border border-pink-100"
                        )}>
                          28
                        </span>
                      )}
                      {categoryFilters.includes('appendix_a6') && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 rounded",
                          isDarkMode 
                            ? "bg-cyan-950/40 text-cyan-400 border border-cyan-900/30" 
                            : "bg-cyan-50 text-cyan-600 border border-cyan-100"
                        )}>
                          29
                        </span>
                      )}
                      {categoryFilters.includes('tt26') && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 rounded",
                          isDarkMode 
                            ? "bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-900/30" 
                            : "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100"
                        )}>
                          TT26
                        </span>
                      )}
                    </div>
                  </div>
                    <div className="flex items-center gap-1 text-center flex-wrap">
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a2')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a2')
                            ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/20"
                            : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                        )}
                      >
                        24
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a3')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a3')
                            ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-500/20"
                            : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                        )}
                      >
                        25
                      </button>
                    )}
                    <button
                      onClick={() => toggleCategoryFilter('restricted')}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        categoryFilters.includes('restricted')
                          ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-500/20"
                          : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                      )}
                    >
                      26
                    </button>
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a4')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a4')
                            ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500/20"
                            : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                        )}
                      >
                        27
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a5')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a5')
                            ? "bg-pink-600 text-white shadow-sm ring-1 ring-pink-500/20"
                            : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                        )}
                      >
                        28
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a6')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a6')
                            ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-500/20"
                            : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                        )}
                      >
                        29
                      </button>
                    )}
                    <button
                      onClick={() => toggleCategoryFilter('tt26')}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        categoryFilters.includes('tt26')
                          ? "bg-fuchsia-600 text-white shadow-sm ring-1 ring-fuchsia-500/20"
                          : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                      )}
                    >
                      TT26
                    </button>
                  </div>
                </div>

                {isDrugSuggestionsAllowed && (
                  <div className={cn("flex flex-col gap-2 pt-2 border-t", isDarkMode ? "border-slate-800" : "border-emerald-100")}>
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Gợi ý thuốc</span>
                    </div>
                    <div className={cn(
                      "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300",
                      suggestionFilters.length < ALL_SUGGESTION_FILTERS.length
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/5 bg-emerald-500/5"
                        : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")
                    )}>
                      <button
                        onClick={() => toggleSuggestionFilter('has_suggestions')}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          suggestionFilters.includes('has_suggestions')
                            ? (isDarkMode ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-600 text-white shadow-sm")
                            : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                        )}
                      >
                        <Check size={12} />
                        Có
                      </button>
                      <button
                        onClick={() => toggleSuggestionFilter('no_suggestions')}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          suggestionFilters.includes('no_suggestions')
                            ? (isDarkMode ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-600 text-white shadow-sm")
                            : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                        )}
                      >
                        <X size={12} />
                        Chưa có
                      </button>
                    </div>
                  </div>
                )}

                {/* Guide Filter */}
                <div className={cn("flex flex-col gap-2 pt-2 border-t", isDarkMode ? "border-slate-800" : "border-emerald-100")}>
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-violet-500 rounded-full" />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Hướng dẫn của WHO 2019</span>
                  </div>
                  <div className={cn(
                    "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300",
                    guideFilters.length < ALL_GUIDE_FILTERS.length
                      ? "border-violet-500 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/5 bg-violet-500/5"
                      : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")
                  )}>
                    <button
                      onClick={() => toggleGuideFilter('has_guide')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        guideFilters.includes('has_guide')
                          ? (isDarkMode ? "bg-violet-600 text-white shadow-sm" : "bg-violet-600 text-white shadow-sm")
                          : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                      )}
                    >
                      <Check size={12} />
                      Có
                    </button>
                    <button
                      onClick={() => toggleGuideFilter('no_guide')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        guideFilters.includes('no_guide')
                          ? (isDarkMode ? "bg-violet-600 text-white shadow-sm" : "bg-violet-600 text-white shadow-sm")
                          : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                      )}
                    >
                      <X size={12} />
                      Không
                    </button>
                  </div>
                </div>

                {/* Status Filter (New, Expired, New Name) */}
                <div className={cn("flex flex-col gap-2 pt-2 border-t", isDarkMode ? "border-slate-800" : "border-emerald-100")}>
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-amber-500 rounded-full" />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Trạng thái mã</span>
                  </div>
                  <div className={cn(
                    "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300",
                    statusFilters.length < ALL_STATUS_FILTERS.length
                      ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/5 bg-amber-500/5"
                      : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")
                  )}>
                    <button
                      onClick={() => toggleStatusFilter('expired')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        statusFilters.includes('expired')
                          ? "bg-red-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                      )}
                    >
                      Hết HL
                    </button>
                    <button
                      onClick={() => toggleStatusFilter('new')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        statusFilters.includes('new')
                          ? "bg-green-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                      )}
                    >
                      Mã Mới
                    </button>
                    <button
                      onClick={() => toggleStatusFilter('new_name')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        statusFilters.includes('new_name')
                          ? "bg-purple-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                      )}
                    >
                      Tên Mới
                    </button>
                  </div>
                </div>

                {/* Chapter Filters */}
                <div className={cn(
                  "flex items-center gap-2 overflow-x-auto no-scrollbar",
                  isDrugSuggestionsAllowed ? (isDarkMode ? "pt-2 border-t border-slate-800" : "pt-2 border-t border-emerald-100") : ""
                )}>
                  {[
                    { id: 'A-B', label: 'Truyền nhiễm (A-B)' },
                    { id: 'C-D', label: 'Khối u (C-D)' },
                    { id: 'E-H', label: 'Nội tiết/Mắt/Tai (E-H)' },
                    { id: 'I-K', label: 'Tuần hoàn/Hô hấp/Tiêu hóa (I-K)' },
                    { id: 'L-N', label: 'Da/Cơ xương/Tiết niệu (L-N)' },
                    { id: 'O-Q', label: 'Sản/Nhi/Dị tật (O-Q)' },
                    { id: 'R-S', label: 'Triệu chứng (R-S)' },
                    { id: 'U-Z', label: 'Tình trạng (U-Z)' }
                  ].map((filter, fIdx) => (
                    <button
                      key={`mob-chap-filter-${filter.id}-${fIdx}`}
                      onClick={() => toggleChapterFilter(filter.id)}
                      className={cn(
                        "whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        chapterFilters.includes(filter.id)
                          ? "bg-blue-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800/60 text-slate-500 line-through opacity-60" : "bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-60")
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hidden lg:block">
          <div className="flex items-start justify-between">
            <div className={cn(
              "inline-flex flex-col px-4 py-2 rounded-2xl border transition-all max-w-2xl",
              isDarkMode 
                ? "bg-emerald-500/5 border-emerald-500/20 shadow-sm" 
                : "bg-emerald-50/60 border-emerald-100/80 shadow-xs"
            )}>
              <span className={cn("text-xs font-bold tracking-tight", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                Danh mục mã bệnh theo phân loại quốc tế bệnh tật, nguyên nhân tử vong theo ICD-10
              </span>
              <span className={cn("text-[10.5px] font-medium italic opacity-80 leading-tight mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                (Ban hành kèm theo Thông tư số 06/2026/TT-BYT ngày 02 tháng 04 năm 2026 của Bộ trưởng Bộ Y tế)
              </span>
            </div>

            {/* Category Tabs move here with extra sub-label */}
            <div className="flex flex-col items-end gap-2">
              {!isGuideModalOpen ? (
                <>
                  <div className="flex items-center gap-2">
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a2')}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a2')
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                            : (isDarkMode ? "bg-slate-900 text-slate-500 line-through opacity-60 hover:opacity-100" : "bg-white text-slate-400 border border-slate-200 line-through opacity-60 hover:opacity-100")
                        )}
                        title="24. Mã không được dùng là bệnh chính"
                      >
                        24
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a3')}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a3')
                            ? "bg-amber-600 text-white shadow-lg shadow-amber-200 dark:shadow-none"
                            : (isDarkMode ? "bg-slate-900 text-slate-500 line-through opacity-60 hover:opacity-100" : "bg-white text-slate-400 border border-slate-200 line-through opacity-60 hover:opacity-100")
                        )}
                        title="25. Mã không khuyến khích dùng là bệnh chính"
                      >
                        25
                      </button>
                    )}
                    <button
                      onClick={() => toggleCategoryFilter('restricted')}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
                        categoryFilters.includes('restricted')
                          ? "bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none"
                          : (isDarkMode ? "bg-slate-900 text-slate-500 line-through opacity-60 hover:opacity-100" : "bg-white text-slate-400 border border-slate-200 line-through opacity-60 hover:opacity-100")
                      )}
                      title="26. Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn"
                    >
                      26
                    </button>
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a4')}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a4')
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                            : (isDarkMode ? "bg-slate-900 text-slate-500 line-through opacity-60 hover:opacity-100" : "bg-white text-slate-400 border border-slate-200 line-through opacity-60 hover:opacity-100")
                        )}
                        title="27. Chỉ sử dụng mã hóa nguyên nhân tử vong"
                      >
                        27
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a5')}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a5')
                            ? "bg-pink-600 text-white shadow-lg shadow-pink-200 dark:shadow-none"
                            : (isDarkMode ? "bg-slate-900 text-slate-500 line-through opacity-60 hover:opacity-100" : "bg-white text-slate-400 border border-slate-200 line-through opacity-60 hover:opacity-100")
                        )}
                        title="28. Các mã bệnh chỉ có hoặc chủ yếu có ở nữ giới"
                      >
                        28
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a6')}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
                          categoryFilters.includes('appendix_a6')
                            ? "bg-cyan-600 text-white shadow-lg shadow-cyan-200 dark:shadow-none"
                            : (isDarkMode ? "bg-slate-900 text-slate-500 line-through opacity-60 hover:opacity-100" : "bg-white text-slate-400 border border-slate-200 line-through opacity-60 hover:opacity-100")
                        )}
                        title="29. Các mã bệnh chỉ có hoặc chủ yếu có ở nam giới"
                      >
                        29
                      </button>
                    )}
                    <button
                      onClick={() => toggleCategoryFilter('tt26')}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all",
                        categoryFilters.includes('tt26')
                          ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-200 dark:shadow-none"
                          : (isDarkMode ? "bg-slate-900 text-slate-500 line-through opacity-60 hover:opacity-100" : "bg-white text-slate-400 border border-slate-200 line-through opacity-60 hover:opacity-100")
                      )}
                      title="Bệnh, nhóm bệnh được áp dụng kê đơn thuốc ngoại trú trên 30 ngày"
                    >
                      TT26
                    </button>
                  </div>
                  <AnimatePresence>
                    {categoryFilters.length === 1 && categoryFilters[0] === 'appendix_a2' && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2",
                          isDarkMode ? "text-indigo-400" : "text-indigo-500"
                        )}
                      >
                        24. Mã không được dùng là bệnh chính
                      </motion.p>
                    )}
                    {categoryFilters.length === 1 && categoryFilters[0] === 'appendix_a3' && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2",
                          isDarkMode ? "text-amber-400" : "text-amber-500"
                        )}
                      >
                        25. MÃ KHÔNG KHUYẾN KHÍCH DÙNG LÀ BỆNH CHÍNH
                      </motion.p>
                    )}
                    {categoryFilters.length === 1 && categoryFilters[0] === 'appendix_a4' && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2",
                          isDarkMode ? "text-blue-400" : "text-blue-500"
                        )}
                      >
                        27. CHỈ SỬ DỤNG MÃ HÓA NGUYÊN NHÂN TỬ VONG
                      </motion.p>
                    )}
                    {categoryFilters.length === 1 && categoryFilters[0] === 'appendix_a5' && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2",
                          isDarkMode ? "text-pink-400" : "text-pink-500"
                        )}
                      >
                        28. CÁC MÃ BỆNH CHỈ CÓ HOẶC CHỦ YẾU CÓ Ở NỮ GIỚI
                      </motion.p>
                    )}
                    {categoryFilters.length === 1 && categoryFilters[0] === 'appendix_a6' && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2",
                          isDarkMode ? "text-cyan-400" : "text-cyan-500"
                        )}
                      >
                        29. CÁC MÃ BỆNH CHỈ CÓ HOẶC CHỦ YẾU CÓ Ở NAM GIỚI
                      </motion.p>
                    )}
                    {categoryFilters.length === 1 && categoryFilters[0] === 'restricted' && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2",
                          isDarkMode ? "text-rose-400" : "text-rose-500"
                        )}
                      >
                        26. Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn
                      </motion.p>
                    )}
                    {categoryFilters.length === 1 && categoryFilters[0] === 'tt26' && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] px-2",
                          isDarkMode ? "text-fuchsia-400" : "text-fuchsia-500"
                        )}
                      >
                        BỆNH, NHÓM BỆNH ĐƯỢC ÁP DỤNG KÊ ĐƠN THUỐC NGOẠI TRÚ TRÊN 30 NGÀY
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Guide Button */}
                  <button
                    onClick={() => {
                      setActiveGuideTabIdx(0);
                      setIsGuideModalOpen(true);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 text-xs border whitespace-nowrap shadow-sm mt-1",
                      isGuideModalOpen
                        ? "bg-amber-500 border-amber-500 text-white"
                        : (isDarkMode 
                          ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-400" 
                          : "bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-700 shadow-slate-200/50")
                    )}
                  >
                    <HelpCircle size={16} />
                    <span>Hướng dẫn & Trợ giúp</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 text-xs border whitespace-nowrap shadow-md mt-1",
                    isDarkMode
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-700"
                  )}
                >
                  <X size={16} />
                  <span>Quay lại Tra cứu</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Full-width Help Center View */}
        <AnimatePresence>
          {isGuideModalOpen && guideData && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="space-y-6 animate-in fade-in duration-300"
            >
              {/* Help Center Content Grid */}
              <div className={cn(
                "p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-[32px] border transition-all duration-300 relative shadow-lg shadow-slate-100 dark:shadow-none",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                {/* Search & Tool Utilities in Guide */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dashed border-slate-200 dark:border-slate-800 mb-6">
                  {/* Left: Input search within guide */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm nội dung trong hướng dẫn..."
                      className={cn(
                        "w-full pl-9 pr-8 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 transition-all text-xs font-semibold",
                        isDarkMode 
                          ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-850" 
                          : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500 shadow-inner"
                      )}
                      value={guideSearchTerm}
                      onChange={(e) => setGuideSearchTerm(e.target.value)}
                    />
                    {guideSearchTerm && (
                      <button
                        onClick={() => setGuideSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Right: Text Size and Copy Controls */}
                  <div className="flex items-center gap-4">
                    {/* Font Size Adjuster */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">Cỡ chữ:</span>
                      <div className={cn(
                        "flex items-center p-0.5 rounded-lg border",
                        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                      )}>
                        {[
                          { id: 'sm', label: 'A-', sizeClass: 'text-[10px]' },
                          { id: 'base', label: 'A', sizeClass: 'text-xs' },
                          { id: 'lg', label: 'A+', sizeClass: 'text-sm' }
                        ].map((btn, bIdx) => (
                          <button
                            key={`guide-font-${btn.id}-${bIdx}`}
                            onClick={() => setGuideFontSize(btn.id as any)}
                            className={cn(
                              "px-2.5 py-1 rounded font-black transition-all",
                              guideFontSize === btn.id
                                ? "bg-amber-500 text-white shadow-sm"
                                : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800")
                            )}
                          >
                            <span className={btn.sizeClass}>{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Info Badge */}
                    <div className={cn(
                      "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase border",
                      isDarkMode ? "bg-slate-950/40 border-slate-800 text-amber-400" : "bg-amber-50/50 border-amber-100 text-amber-700"
                    )}>
                      <Info size={12} />
                      <span>Thông tư 06/2026/TT-BYT</span>
                    </div>
                  </div>
                </div>

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Left Column: Vertical Topic list */}
                  <div className="lg:col-span-1 space-y-2">
                    <div className="px-2 pb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Danh mục chủ đề</span>
                    </div>
                    {/* Desktop sidebar list */}
                    <div className="hidden lg:flex flex-col gap-1.5">
                      {guideData.tabs && guideData.tabs.map((tab, idx) => (
                        <button
                          key={`guide-tab-desktop-${tab.id || 'tab'}-${idx}`}
                          onClick={() => {
                            setActiveGuideTabIdx(idx);
                            setGuideSearchTerm('');
                          }}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-xl transition-all font-bold text-xs border flex items-center justify-between group",
                            activeGuideTabIdx === idx && !guideSearchTerm
                              ? (isDarkMode 
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-sm" 
                                : "bg-amber-50/70 border-amber-100 text-amber-700 shadow-sm shadow-amber-500/5")
                              : (isDarkMode 
                                ? "bg-slate-950/20 border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-300" 
                                : "bg-slate-50/50 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700")
                          )}
                        >
                          <span className="truncate">{tab.title}</span>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors",
                            activeGuideTabIdx === idx && !guideSearchTerm ? "bg-amber-500 animate-pulse" : "bg-transparent group-hover:bg-slate-400"
                          )} />
                        </button>
                      ))}
                    </div>

                    {/* Mobile tabs bar */}
                    <div className="lg:hidden flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
                      {guideData.tabs && guideData.tabs.map((tab, idx) => (
                        <button
                          key={`guide-tab-mob-${tab.id || 'tab'}-${idx}`}
                          onClick={() => {
                            setActiveGuideTabIdx(idx);
                            setGuideSearchTerm('');
                          }}
                          className={cn(
                            "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                            activeGuideTabIdx === idx && !guideSearchTerm
                              ? (isDarkMode ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")
                              : (isDarkMode ? "bg-slate-800 border-slate-700/50 text-slate-400" : "bg-slate-50 text-slate-500 border-slate-200")
                          )}
                        >
                          {tab.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Content Card */}
                  <div className="lg:col-span-3">
                    {/* Content Section */}
                    {guideSearchTerm ? (
                      // Search Result View
                      <div className="space-y-4">
                        <div className="px-1 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Kết quả tìm kiếm cho: "{guideSearchTerm}"
                          </span>
                          <button
                            onClick={() => setGuideSearchTerm('')}
                            className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                          >
                            Xóa lọc
                          </button>
                        </div>
                        
                        {(() => {
                          const query = guideSearchTerm.toLowerCase();
                          const matches: Array<{ tabTitle: string; para: string; tabIdx: number; paraIdx: number }> = [];
                          
                          guideData.tabs.forEach((tab, tIdx) => {
                            (tab.paragraphs || []).forEach((para, pIdx) => {
                              if (para.toLowerCase().includes(query) || tab.title.toLowerCase().includes(query)) {
                                matches.push({ tabTitle: tab.title, para, tabIdx: tIdx, paraIdx: pIdx });
                              }
                            });
                          });

                          if (matches.length === 0) {
                            return (
                              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl animate-in fade-in">
                                <Search size={28} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-bold">Không tìm thấy nội dung hướng dẫn nào khớp.</p>
                                <p className="text-[10px] text-slate-400 mt-1">Hãy thử tìm từ khóa khác hoặc viết tiếng Việt không dấu.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {matches.map((match, mIdx) => (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  key={`guide-match-${match.tabIdx}-${match.paraIdx}-${mIdx}`}
                                  className={cn(
                                    "p-4 rounded-xl border text-left space-y-2 transition-all relative group/para",
                                    isDarkMode ? "bg-slate-950/30 border-slate-800 hover:bg-slate-950/50" : "bg-slate-50 border-slate-150 hover:bg-white hover:shadow-sm"
                                  )}
                                >
                                  <div className="absolute right-3 top-3 opacity-0 group-hover/para:opacity-100 transition-all">
                                    <button
                                      onClick={() => navigator.clipboard.writeText(match.para)}
                                      className={cn(
                                        "px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all border",
                                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                      )}
                                    >
                                      Copy
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest">
                                      {match.tabTitle}
                                    </span>
                                  </div>
                                  <p className={cn(
                                    "leading-relaxed whitespace-pre-line pr-8",
                                    guideFontSize === 'sm' ? "text-xs" : guideFontSize === 'lg' ? "text-base font-medium" : "text-sm",
                                    isDarkMode ? "text-slate-300" : "text-slate-700"
                                  )}>
                                    {match.para}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      // Standard Tab View
                      <div className="space-y-4">
                        <div className="px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Nội dung chi tiết - {guideData.tabs[activeGuideTabIdx]?.title}
                          </span>
                        </div>

                        {guideData.tabs[activeGuideTabIdx] ? (
                          <div className="space-y-3.5">
                            {guideData.tabs[activeGuideTabIdx].paragraphs && guideData.tabs[activeGuideTabIdx].paragraphs.map((para, pIdx) => (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: pIdx * 0.03 }}
                                key={`guide-para-${activeGuideTabIdx}-${pIdx}`}
                                className={cn(
                                  "p-4 rounded-xl border text-left transition-all relative group/para",
                                  isDarkMode 
                                    ? "bg-slate-950/40 border-slate-800/60 text-slate-300" 
                                    : "bg-white border-slate-100 text-slate-700 shadow-sm"
                                )}
                              >
                                <div className="absolute right-3 top-3 opacity-0 group-hover/para:opacity-100 transition-all">
                                  <button
                                    onClick={() => navigator.clipboard.writeText(para)}
                                    className={cn(
                                      "px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all border",
                                      isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                    )}
                                  >
                                    Copy
                                  </button>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                  <p className={cn(
                                    "leading-relaxed whitespace-pre-line pr-8",
                                    guideFontSize === 'sm' ? "text-xs" : guideFontSize === 'lg' ? "text-base font-medium" : "text-sm",
                                    isDarkMode ? "text-slate-300" : "text-slate-700"
                                  )}>
                                    {para}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                            {(!guideData.tabs[activeGuideTabIdx].paragraphs || guideData.tabs[activeGuideTabIdx].paragraphs.length === 0) && (
                              <p className="text-slate-500 italic text-center py-6 text-xs">Chưa có nội dung cho phần này.</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-500 italic text-center py-6 text-xs">Chưa có bài viết hoặc nội dung nào được tạo.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!isGuideModalOpen && canManage && isManage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setBatchDescText('');
                  setBatchDescStatus('idle');
                  setIsBatchDescModalOpen(true);
                }}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-[10px] sm:text-xs lg:text-sm border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-amber-900/20" : "bg-white border-slate-200 text-amber-600 hover:bg-amber-50"
                )}
              >
                <Edit2 size={16} />
                <span>Sửa Mô tả bệnh hàng loạt</span>
              </button>
              <button
                onClick={handleExportICDCodes}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-[10px] sm:text-xs lg:text-sm border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-blue-400 hover:bg-blue-900/20" : "bg-white border-slate-200 text-blue-600 hover:bg-blue-50"
                )}
              >
                <FileSpreadsheet size={16} />
                <span>Export ICD-10</span>
              </button>
              <button
                onClick={handleExportGuideExcel}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-[10px] sm:text-xs lg:text-sm border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-violet-400 hover:bg-violet-900/20" : "bg-white border-slate-200 text-violet-600 hover:bg-violet-50"
                )}
              >
                <FileSpreadsheet size={16} />
                <span>Export H.Dẫn</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewStyle('excel')}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-[10px] sm:text-xs lg:text-sm border",
                  isDarkMode ? "bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900/40" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                )}
                title="Chuyển sang giao diện bảng tính quản lý Excel"
              >
                <FileSpreadsheet size={16} />
                <span>Bảng tính Excel</span>
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
          </div>
        )}
        
        {!isGuideModalOpen && (
          <div className={cn(
            "w-full p-2 lg:p-3 rounded-xl lg:rounded-2xl shadow-sm border transition-all space-y-3 hidden lg:block",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          )}>
          <div className="flex flex-col gap-5 w-full">
            <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
              {/* Search Bar - Main Anchor */}
              <div className="relative flex-1 w-full flex items-center min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <input
                  type="text"
                  placeholder={
                    scopeFilters.includes('guide') && !scopeFilters.includes('code_name')
                      ? "Tìm từ khóa trong Hướng dẫn WHO 2019 (VD: sốc, nhiễm trùng, biến chứng...)"
                      : scopeFilters.includes('code_name') && !scopeFilters.includes('guide')
                      ? "Tìm theo Mã ICD-10 hoặc Tên bệnh lý (VD: A00, Tưa miệng...)"
                      : (categoryFilters.length === 1 && categoryFilters[0] === 'appendix_a2'
                          ? "Tìm trong danh sách Không là bệnh chính..." 
                          : "Tìm tất cả: Mã quốc tế, tên bệnh lý, Hướng dẫn WHO 2019...")
                  }
                  className={cn(
                    "w-full pl-12 pr-52 py-4 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium",
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800" 
                      : "bg-white border-slate-200 text-slate-900 focus:bg-white shadow-lg shadow-slate-200/50"
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className={cn(
                      "absolute right-[180px] top-1/2 -translate-y-1/2 transition-all p-1.5 rounded-xl",
                      isDarkMode ? "text-slate-500 hover:text-white hover:bg-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                    title="Xóa tìm kiếm"
                  >
                    <X size={18} />
                  </button>
                )}
                {/* Desktop Scope Selector Group */}
                <div className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 p-1 rounded-xl border shadow-xs transition-colors",
                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
                )}>
                  {[
                    { id: 'code_name', label: 'Mã & Tên' },
                    { id: 'guide', label: 'H.Dẫn WHO' }
                  ].map((s, sIdx) => (
                    <button
                      key={`desk-scope-${s.id}-${sIdx}`}
                      type="button"
                      onClick={() => toggleScopeFilter(s.id)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                        scopeFilters.includes(s.id)
                          ? (isDarkMode 
                              ? "bg-emerald-600 text-white shadow-sm font-black" 
                              : "bg-white text-emerald-700 shadow-sm border border-slate-200/60 font-black")
                          : (isDarkMode 
                              ? "text-slate-500 line-through opacity-60 hover:opacity-100" 
                              : "text-slate-400 line-through opacity-60 hover:opacity-100")
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Reset Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearAllFilters}
                  title="Tắt nhanh lọc"
                  className={cn(
                    "flex items-center justify-center p-3.5 rounded-2xl font-bold transition-all active:scale-95 border whitespace-nowrap shadow-sm shrink-0",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-rose-400 hover:text-rose-300" 
                      : "bg-white border-slate-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 shadow-slate-200/50"
                  )}
                >
                  <X size={18} />
                </button>
              )}

              {/* Desktop Favorite Toggle Button */}
              {!canManage && userRole && (
                <button
                  type="button"
                  onClick={() => setFavoriteOnlyFilter(prev => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-3.5 rounded-2xl font-bold transition-all active:scale-95 border whitespace-nowrap shadow-sm shrink-0",
                    favoriteOnlyFilter
                      ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                      : favoriteCount > 0
                        ? isDarkMode
                          ? "bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-amber-500/10"
                          : "bg-white border-slate-200 text-amber-600 hover:bg-amber-50"
                        : isDarkMode
                          ? "bg-slate-800/40 border-slate-800 text-slate-400 hover:text-amber-400"
                          : "bg-white border-slate-200 text-slate-500 hover:text-amber-600"
                  )}
                  title={favoriteOnlyFilter ? "Hiển thị tất cả mã ICD-10" : "Lọc mã ICD-10 yêu thích"}
                >
                  <Star size={16} className={favoriteOnlyFilter || favoriteCount > 0 ? "fill-amber-400 text-amber-400" : ""} />
                  <span className="text-xs font-black uppercase tracking-wider">Yêu thích</span>
                  {favoriteCount > 0 && (
                    <span className={cn(
                      "text-[10px] min-w-4 h-4 px-1 rounded-full font-black flex items-center justify-center",
                      favoriteOnlyFilter ? "bg-white text-amber-600" : "bg-amber-500 text-white"
                    )}>
                      {favoriteCount}
                    </span>
                  )}
                </button>
              )}
              
              {/* Status Filters Group */}
              {isDrugSuggestionsAllowed && (
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Gợi ý thuốc</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 p-1 rounded-xl border transition-all duration-300",
                  suggestionFilters.length < ALL_SUGGESTION_FILTERS.length
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/5"
                    : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-100")
                )}>
                  {[
                    { id: 'has_suggestions', label: 'Có', icon: Check },
                    { id: 'no_suggestions', label: 'Chưa có', icon: X }
                  ].map((stat, stIdx) => (
                    <button
                      key={`desk-sugg-filt-${stat.id}-${stIdx}`}
                      onClick={() => toggleSuggestionFilter(stat.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                        suggestionFilters.includes(stat.id)
                          ? (isDarkMode ? "bg-slate-700 text-emerald-400 shadow-md ring-1 ring-emerald-500/10" : "bg-white text-emerald-600 shadow-md ring-1 ring-emerald-500/10")
                          : (isDarkMode ? "text-slate-500 line-through opacity-60 hover:opacity-100" : "text-slate-400 line-through opacity-60 hover:opacity-100")
                      )}
                    >
                      {stat.icon && <stat.icon size={12} />}
                      {stat.label}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Guide Filters Group */}
              <div className="flex flex-col gap-2 min-w-[150px]">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-violet-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Hướng dẫn của WHO 2019</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 p-1 rounded-xl border transition-all duration-300",
                  guideFilters.length < ALL_GUIDE_FILTERS.length
                    ? "border-violet-500 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/5"
                    : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-100")
                )}>
                  {[
                    { id: 'has_guide', label: 'Có', icon: Check },
                    { id: 'no_guide', label: 'Không', icon: X }
                  ].map((stat, gIdx) => (
                    <button
                      key={`desk-guide-filt-${stat.id}-${gIdx}`}
                      onClick={() => toggleGuideFilter(stat.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                        guideFilters.includes(stat.id)
                          ? (isDarkMode ? "bg-slate-700 text-violet-400 shadow-md ring-1 ring-violet-500/10" : "bg-white text-violet-600 shadow-md ring-1 ring-violet-500/10")
                          : (isDarkMode ? "text-slate-500 line-through opacity-60 hover:opacity-100" : "text-slate-400 line-through opacity-60 hover:opacity-100")
                      )}
                    >
                      {stat.icon && <stat.icon size={12} />}
                      {stat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Code Filters Group */}
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-amber-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Trạng thái mã</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 p-1 rounded-xl border transition-all duration-300",
                  statusFilters.length < ALL_STATUS_FILTERS.length
                    ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/5"
                    : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-100")
                )}>
                  {[
                    { id: 'expired', label: 'Hết HL' },
                    { id: 'new', label: 'Mã Mới' },
                    { id: 'new_name', label: 'Tên Mới' }
                  ].map((stat, stIdx) => (
                    <button
                      key={`desk-status-filt-${stat.id}-${stIdx}`}
                      onClick={() => toggleStatusFilter(stat.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                        statusFilters.includes(stat.id)
                          ? (isDarkMode ? "bg-slate-700 text-amber-400 shadow-md ring-1 ring-amber-500/10" : "bg-white text-amber-600 shadow-md ring-1 ring-amber-500/10")
                          : (isDarkMode ? "text-slate-500 line-through opacity-60 hover:opacity-100" : "text-slate-400 line-through opacity-60 hover:opacity-100")
                      )}
                    >
                      {stat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chapter Filters - Mobile View (PC now uses Left Sidebar) */}
            <div className="lg:hidden flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-3 bg-blue-500 rounded-full" />
                <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Phân loại theo Chương ICD-10</span>
              </div>
              <div className={cn(
                "grid grid-cols-2 md:grid-cols-4 lg:flex lg:items-center gap-2 p-2 rounded-2xl border",
                isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                {[
                  { id: 'A-B', label: 'Truyền nhiễm (A-B)', color: 'bg-emerald-500' },
                  { id: 'C-D', label: 'Khối u (C-D)', color: 'bg-rose-500' },
                  { id: 'E-H', label: 'Nội tiết/Mắt (E-H)', color: 'bg-amber-500' },
                  { id: 'I-K', label: 'Hô hấp/Tiêu hóa (I-K)', color: 'bg-blue-500' },
                  { id: 'L-N', label: 'Cơ xương/Da (L-N)', color: 'bg-purple-500' },
                  { id: 'O-Q', label: 'Sản/Nhi/Dị tật (O-Q)', color: 'bg-pink-500' },
                  { id: 'R-S', label: 'Triệu chứng (R-S)', color: 'bg-slate-600' },
                  { id: 'U-Z', label: 'Tình trạng (U-Z)', color: 'bg-teal-600' }
                ].map((filter, fIdx) => (
                  <button
                    key={`desk-chap-filt-${filter.id}-${fIdx}`}
                    onClick={() => toggleChapterFilter(filter.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap group",
                      chapterFilters.includes(filter.id)
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-y-[-2px]"
                        : (isDarkMode ? "bg-slate-900/50 text-slate-500 line-through opacity-60 hover:opacity-100" : "bg-white text-slate-400 border border-slate-200 line-through opacity-60 hover:opacity-100")
                    )}
                  >
                    <div className={cn(
                      "w-4 h-1 rounded-full mb-1 transition-all",
                      chapterFilters.includes(filter.id) ? "bg-white" : filter.color
                    )} />
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {(hasActiveFilters) && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                  Kết quả: <span className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{filteredList.length}</span>
                </span>

                {selectedChapterId !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-2xs">
                    <span>
                      Chương {selectedChapterId}: {ICD10_CHAPTERS.find(c => c.id === selectedChapterId)?.shortName || selectedChapterId}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedChapterId('all')}
                      className="p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full cursor-pointer transition-colors"
                      title="Bỏ lọc chương"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleClearAllFilters}
                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} />
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {!isGuideModalOpen && (
        <>
        {/* Pagination Controls (Top) */}
        {filteredList.length > 0 && (
          <div
            className={cn(
              "w-full hidden lg:flex items-center justify-between gap-1.5 sm:gap-3 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2.5 rounded-xl sm:rounded-2xl lg:rounded-3xl border shadow-xs sm:shadow-sm mb-1.5 sm:mb-2",
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-100",
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <span
                className={cn(
                  "hidden sm:inline text-[10px] font-black uppercase tracking-widest text-slate-400",
                )}
              >
                ({filteredList.length} mã bệnh)
              </span>

              <div className="flex items-center gap-1 sm:gap-1.5 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-2.5">
                <span
                  className={cn(
                    "hidden sm:inline text-[9px] font-bold uppercase tracking-wider",
                    isDarkMode ? "text-slate-500" : "text-slate-400",
                  )}
                >
                  Hiển thị:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "text-[10px] sm:text-xs font-bold py-1 px-1.5 sm:px-2 rounded-lg border appearance-none cursor-pointer outline-none transition-all",
                    isDarkMode
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500"
                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400 shadow-2xs",
                  )}
                  title="Số lượng mã bệnh trên mỗi trang"
                >
                  {[10, 20, 30, 50, 100].map((val) => (
                    <option key={val} value={val}>
                      {val}/trang
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Trang đầu << */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={validPage === 1}
                title="Trang đầu"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Trang trước < */}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={validPage === 1}
                title="Trang trước"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Điền/Hiển thị trang hiện tại */}
              <div
                className={cn(
                  "flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg lg:rounded-xl border text-[11px] sm:text-xs font-bold transition-colors",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300"
                    : "bg-slate-50 border-slate-200 text-slate-700",
                )}
              >
                <span className={cn("hidden xs:inline text-[10px] sm:text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Trang
                </span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => {
                    setPageInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setCurrentPage(val);
                    }
                  }}
                  onBlur={() => {
                    const val = parseInt(pageInput, 10);
                    if (isNaN(val) || val < 1 || val > totalPages) {
                      setPageInput(validPage.toString());
                    } else {
                      setCurrentPage(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = parseInt(pageInput, 10);
                      if (!isNaN(val) && val >= 1 && val <= totalPages) {
                        setCurrentPage(val);
                      } else {
                        setPageInput(validPage.toString());
                      }
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className={cn(
                    "w-8 sm:w-11 text-center py-0.5 px-0.5 rounded-md sm:rounded-lg font-black focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/40 border transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px] sm:text-xs",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-300 text-slate-900 shadow-2xs",
                  )}
                />
                <span className={cn("text-[10px] sm:text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  /{totalPages}
                </span>
              </div>

              {/* Trang sau > */}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={validPage === totalPages}
                title="Trang sau"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Trang cuối >> */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={validPage === totalPages}
                title="Trang cuối"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        <div className={cn(
          "w-full rounded-2xl lg:rounded-[32px] shadow-sm transition-colors border overflow-hidden",
          isDarkMode 
            ? "bg-slate-900 border-slate-800 shadow-none" 
            : "bg-white border-slate-100 shadow-slate-200/20"
        )}>
        {/* Mobile Card View */}
        <div className={cn(
          "w-full sm:hidden divide-y",
          isDarkMode ? "divide-slate-800" : "divide-slate-100"
        )}>
          {paginatedList.length > 0 ? (
            paginatedList.map((icd, idx) => (
              <div 
                key={`${icd.id || icd.code || 'icd'}-${idx}`}
                onClick={() => handleShowIcdDetail(icd)}
                className={cn(
                  "w-full p-4 transition-colors relative cursor-pointer",
                  icd.isPinned && !canManage
                    ? (isDarkMode ? "bg-amber-950/20 border-l-4 border-l-amber-500" : "bg-amber-50/50 border-l-4 border-l-amber-500") 
                    : (isDarkMode ? "bg-slate-900/50" : "bg-white border-l-4 border-l-transparent")
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 flex flex-col items-start gap-1">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCopyTag({
                          id: icd.id || icd.code,
                          code: icd.code,
                          desc: icd.description,
                          fullName: `${icd.code} - ${icd.description}`
                        });
                      }}
                      title="Nhấn để sao chép mã"
                      className={cn(
                        "px-2.5 py-1 rounded-md font-mono font-bold text-[10px] tracking-tight border cursor-pointer hover:scale-105 active:scale-95 transition-all",
                        isDarkMode ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/30 hover:bg-emerald-900/40" : "bg-emerald-50/50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/70"
                      )}
                    >
                      {icd.code}
                    </span>
                    {(icd.groupCode || (icd.code.includes('.') ? icd.code.split('.')[0] : '')) && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 font-semibold"
                        title={`Mã nhóm: ${icd.groupCode || icd.code.split('.')[0]}`}
                      >
                        {icd.groupCode || icd.code.split('.')[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <h4 className={cn("font-bold leading-tight mt-0.5 text-[14px]", isDarkMode ? "text-white" : "text-black")}>
                      {icd.description}
                      {icd.isNew && (
                        <span className="ml-2 inline-block align-text-bottom px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest">
                          MỚI
                        </span>
                      )}
                      {!!icd.oldName && (
                        <span className="ml-2 inline-block align-text-bottom px-1.5 py-0.5 rounded bg-violet-500 text-white text-[8px] font-black uppercase tracking-widest">
                          TÊN MỚI
                        </span>
                      )}
                      {icd.isExpired && (
                        <span className="ml-2 inline-block align-text-bottom px-1.5 py-0.5 rounded bg-slate-500 text-white text-[8px] font-black uppercase tracking-widest">
                          Hết hiệu lực
                        </span>
                      )}
                      {icd.isAppendixA2 && canSeeAppendixA2 && (
                        <div className="ml-1 relative group/a2 inline-block scale-90 origin-left align-middle">
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest cursor-help transition-all group-hover/a2:bg-indigo-600">
                            24
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-white text-[9px] font-bold rounded shadow-xl opacity-0 invisible group-hover/a2:opacity-100 group-hover/a2:visible transition-all duration-200 translate-y-1 group-hover/a2:translate-y-0 z-50 pointer-events-none border border-slate-700/50">
                            Không là bệnh chính
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      )}
                      {icd.isAppendixA3 && (
                        <div className="ml-1 relative group/a3 inline-block scale-90 origin-left align-middle">
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest cursor-help transition-all group-hover/a3:bg-amber-600">
                            25
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-white text-[9px] font-bold rounded shadow-xl opacity-0 invisible group-hover/a3:opacity-100 group-hover/a3:visible transition-all duration-200 translate-y-1 group-hover/a3:translate-y-0 z-50 pointer-events-none border border-slate-700/50">
                            Không khuyến khích là bệnh chính
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      )}
                      {icd.isAppendixA4 && (
                        <div className="ml-1 relative group/a4 inline-block scale-90 origin-left align-middle">
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest cursor-help transition-all group-hover/a4:bg-blue-600">
                            27
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-white text-[9px] font-bold rounded shadow-xl opacity-0 invisible group-hover/a4:opacity-100 group-hover/a4:visible transition-all duration-200 translate-y-1 group-hover/a4:translate-y-0 z-50 pointer-events-none border border-slate-700/50">
                            Chỉ dùng mã hóa nguyên nhân tử vong
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      )}
                      {icd.isAppendixA5 && (
                        <div className="ml-1 relative group/a5 inline-block scale-90 origin-left align-middle">
                          <span className="px-1.5 py-0.5 rounded-md bg-pink-500 text-white text-[8px] font-black uppercase tracking-widest cursor-help transition-all group-hover/a5:bg-pink-600">
                            28
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-white text-[9px] font-bold rounded shadow-xl opacity-0 invisible group-hover/a5:opacity-100 group-hover/a5:visible transition-all duration-200 translate-y-1 group-hover/a5:translate-y-0 z-50 pointer-events-none border border-slate-700/50">
                            Mã bệnh ở nữ giới
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      )}
                      {icd.isAppendixA6 && (
                        <div className="ml-1 relative group/a6 inline-block scale-90 origin-left align-middle">
                          <span className="px-1.5 py-0.5 rounded-md bg-cyan-500 text-white text-[8px] font-black uppercase tracking-widest cursor-help transition-all group-hover/a6:bg-cyan-600">
                            29
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-white text-[9px] font-bold rounded shadow-xl opacity-0 invisible group-hover/a6:opacity-100 group-hover/a6:visible transition-all duration-200 translate-y-1 group-hover/a6:translate-y-0 z-50 pointer-events-none border border-slate-700/50">
                            Mã bệnh ở nam giới
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      )}
                      {icd.isRestricted && (
                        <div className="ml-1 relative group/x inline-block scale-90 origin-left align-middle">
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest cursor-help transition-all group-hover/x:bg-rose-600">
                            26
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-white text-[9px] font-bold rounded shadow-xl opacity-0 invisible group-hover/x:opacity-100 group-hover/x:visible transition-all duration-200 translate-y-1 group-hover/x:translate-y-0 z-50 pointer-events-none border border-slate-700/50">
                            Mã không được sử dụng
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      )}
                      {icd.isTT26 && (
                        <div className="ml-1 relative group/tt26 inline-block scale-90 origin-left align-middle">
                          <span className="px-1.5 py-0.5 rounded-md bg-fuchsia-500 text-white text-[8px] font-black uppercase tracking-widest cursor-help transition-all group-hover/tt26:bg-fuchsia-600">
                            TT26
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-white text-[9px] font-bold rounded shadow-xl opacity-0 invisible group-hover/tt26:opacity-100 group-hover/tt26:visible transition-all duration-200 translate-y-1 group-hover/tt26:translate-y-0 z-50 pointer-events-none border border-slate-700/50">
                            Bệnh, nhóm bệnh được áp dụng kê đơn thuốc ngoại trú trên 30 ngày
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      )}
                    </h4>
                  {icd.oldName && (
                    <span className={cn("text-[11px] italic", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Tên cũ: {icd.oldName}
                    </span>
                  )}
                  </div>
                  {canManage && (
                    <div className="shrink-0 flex gap-1 items-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(icd); }} 
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isDarkMode ? "text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/30" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          )}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); confirmDelete(icd.code); }} 
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isDarkMode ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          )}
                        >
                          <Trash2 size={16} />
                        </button>
                    </div>
                  )}
                </div>

                {icd.guide && (
                  <div className={cn(
                    "mb-3 p-2.5 rounded-xl border transition-colors",
                    isDarkMode 
                      ? "border-violet-900/30 bg-violet-950/20" 
                      : "border-violet-100 bg-violet-50/50"
                  )}>
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest mb-1 transition-colors flex items-center gap-1.5",
                      isDarkMode ? "text-violet-400" : "text-violet-700"
                    )}>
                      <Info size={12} className="shrink-0" />
                      Hướng dẫn WHO 2019
                    </p>
                    <p className={cn(
                      "text-[11px] font-medium leading-relaxed whitespace-pre-wrap transition-colors",
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    )}>
                      {icd.guide}
                    </p>
                  </div>
                )}

                {icd.notes && canSeeNotes && (
                  <div className="mb-3">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest mb-1 transition-colors",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>Ghi chú</p>
                    <p className={cn(
                      "text-[11px] font-medium leading-relaxed italic transition-colors",
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    )}>
                      {icd.notes}
                    </p>
                  </div>
                )}

                {isDrugSuggestionsAllowed && (
                  <div className="space-y-2">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>Gợi ý thuốc</p>
                    <div className="flex flex-wrap gap-1.5">
                      {drugsByIcd[(icd.code || '').trim().toUpperCase()] && drugsByIcd[(icd.code || '').trim().toUpperCase()].length > 0 ? (
                        drugsByIcd[(icd.code || '').trim().toUpperCase()].map((item, idx) => {
                          const drugName = typeof item === 'string' ? item : item.drugName;
                          const status = typeof item === 'string' ? 'normal' : item.status;
                          const isPrimary = typeof item === 'string' ? false : (item.isPrimary || false);
                          const drugObj = typeof item === 'string' ? drugList.find(d => d.name === drugName) : (item.drugObj || drugList.find(d => d.name === drugName));

                          return (
                            <button 
                              key={`mob-sugg-drug-${icd.code || 'c'}-${drugName}-${idx}`} 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (drugObj) {
                                  handleShowDrugDetail(drugObj);
                                }
                              }}
                              title={
                                (isPrimary ? "Chỉ định thường dùng (Sao vàng) • " : "") +
                                (status === 'default' ? 'Khuyến khích chọn' :
                                status === 'alternative' ? 'Chọn mã khác tốt hơn mã này' :
                                status === 'not_recommended' ? 'Mã không khuyến khích chọn' :
                                'Gợi ý thuốc')
                              }
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all active:scale-95 flex items-center gap-1",
                                isPrimary
                                  ? (isDarkMode 
                                      ? "bg-emerald-950/40 text-emerald-400 border-amber-400 hover:bg-emerald-900/60 ring-1 ring-amber-400/30" 
                                      : "bg-emerald-50 text-emerald-700 border-amber-400 hover:bg-emerald-100 hover:border-amber-500 shadow-xs ring-1 ring-amber-300/50")
                                  : status === 'default'
                                    ? (isDarkMode 
                                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60" 
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-xs")
                                    : status === 'alternative'
                                      ? (isDarkMode 
                                          ? "bg-amber-950/40 text-amber-400 border-amber-500/40 hover:bg-amber-900/60" 
                                          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300 shadow-xs")
                                      : status === 'not_recommended'
                                        ? (isDarkMode 
                                            ? "bg-rose-950/40 text-rose-400 border-rose-500/40 hover:bg-rose-900/60" 
                                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-xs")
                                        : (isDarkMode 
                                            ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" 
                                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-xs")
                              )}
                            >
                              {isPrimary ? (
                                <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                              ) : (
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  status === 'default' ? "bg-emerald-500" :
                                  status === 'alternative' ? "bg-amber-500" :
                                  status === 'not_recommended' ? "bg-rose-500" :
                                  "bg-slate-400"
                                )} />
                              )}
                              <span>{drugName}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span className={cn(
                          "text-[10px] italic transition-colors",
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        )}>Chưa có gợi ý</span>
                      )}
                    </div>
                  </div>
                )}

                {!canManage && userRole && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTogglePin(icd); }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                          icd.isPinned 
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-slate-50 border-slate-100 text-slate-500")
                        )}
                      >
                        <Star size={12} className={icd.isPinned ? "fill-amber-400 text-amber-500" : ""} />
                        {icd.isPinned ? "Đã thích" : "Yêu thích"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="w-full p-12 text-center flex flex-col items-center justify-center">
              {icdList.length === 0 ? (
                <>
                  <Loader2 size={36} className="text-emerald-500 animate-spin mb-4" />
                  <p className={cn("font-bold text-sm text-slate-400", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Đang tải và đồng bộ danh mục mã ICD-10 từ máy chủ ({loadingPercentage}%)...
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1.5 opacity-80 font-medium">
                    Hệ thống đang thiết lập cơ sở dữ liệu cho lần đầu truy cập, vui lòng đợi trong giây lát.
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm font-medium">Không tìm thấy mã ICD-10 nào.</p>
              )}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="w-full hidden sm:block overflow-x-auto custom-scrollbar -mx-px">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className={cn(
                "transition-colors border-b",
                isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <th className={cn("w-20 min-w-[80px] max-w-[80px] sm:w-24 sm:min-w-[96px] sm:max-w-[96px] px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mã bệnh</th>
                <th className={cn("min-w-[200px] px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mô tả bệnh</th>
                {canSeeAppendixA2 && <th className={cn("w-28 min-w-[110px] px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors text-center", isDarkMode ? "text-slate-500" : "text-slate-400")}>Nguyên tắc</th>}
                <th className={cn("min-w-[220px] px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors text-center", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                  <div className="flex items-center justify-center gap-1.5">
                    Hướng dẫn
                    <div className="relative group/guide-header inline-block">
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black border transition-all cursor-help",
                        isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700 group-hover/guide-header:text-emerald-400 group-hover/guide-header:border-emerald-500/50" : "bg-slate-100 text-slate-500 border-slate-200 group-hover/guide-header:text-emerald-600 group-hover/guide-header:border-emerald-200"
                      )}>
                        !
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/guide-header:opacity-100 group-hover/guide-header:visible transition-all duration-300 -translate-y-1 group-hover/guide-header:translate-y-0 z-[100] pointer-events-none border border-slate-700/50 flex items-center gap-2">
                        <Info size={12} className="text-blue-400" />
                        Hưỡng dẫn mã hóa bổ sung của WHO 2019
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95" />
                      </div>
                    </div>
                  </div>
                </th>
                {isDrugSuggestionsAllowed && (
                  <th className={cn("w-56 min-w-[224px] max-w-[224px] lg:w-64 lg:min-w-[256px] lg:max-w-[256px] px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                    <div className="flex items-center gap-1.5">
                      Gợi ý thuốc
                      <div className="relative group/drug-header inline-block">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black border transition-all cursor-help",
                          isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700 group-hover/drug-header:text-emerald-400 group-hover/drug-header:border-emerald-500/50" : "bg-slate-100 text-slate-500 border-slate-200 group-hover/drug-header:text-emerald-600 group-hover/drug-header:border-emerald-200"
                        )}>
                          ?
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max p-2.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-xl shadow-xl opacity-0 invisible group-hover/drug-header:opacity-100 group-hover/drug-header:visible transition-all duration-300 -translate-y-1 group-hover/drug-header:translate-y-0 z-[100] pointer-events-none border border-slate-700/50 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Khuyến khích chọn</div>
                          <div className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500"/> Chọn mã khác tốt hơn mã này</div>
                          <div className="flex items-center gap-1.5 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500"/> Mã không khuyến khích chọn</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95" />
                        </div>
                      </div>
                    </div>
                  </th>
                )}
                {canSeeNotes && <th className={cn("min-w-[150px] px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Ghi chú</th>}
                {!canManage && canSeeShortcuts && <th className={cn("w-24 min-w-[96px] max-w-[96px] sm:w-28 sm:min-w-[112px] sm:max-w-[112px] px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Phím tắt</th>}
                {canManage && <th className={cn("w-36 min-w-[144px] max-w-[144px] sm:w-40 sm:min-w-[160px] sm:max-w-[160px] px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest text-right transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Quản lý</th>}
              </tr>
            </thead>
            <tbody className={cn(
              "divide-y transition-colors",
              isDarkMode ? "divide-slate-800" : "divide-slate-100"
            )}>
              {paginatedList.map((icd, idx) => (
                <tr 
                  key={`${icd.id || icd.code || 'icd'}-${idx}`} 
                  onClick={() => handleShowIcdDetail(icd)}
                  className={cn(
                    "transition-colors group cursor-pointer",
                    icd.isPinned && !canManage
                      ? (isDarkMode ? "bg-amber-950/15 hover:bg-amber-950/25" : "bg-amber-50/50 hover:bg-amber-100/50") 
                      : (isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50/80")
                  )}
                >
                  <td className="w-24 sm:w-28 px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col items-start gap-1">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCopyTag({
                            id: icd.id || icd.code,
                            code: icd.code,
                            desc: icd.description,
                            fullName: `${icd.code} - ${icd.description}`
                          });
                        }}
                        title="Nhấn để sao chép mã"
                        className={cn(
                          "px-2.5 lg:px-3 py-1 rounded-md font-mono font-bold text-[10px] lg:text-xs tracking-tight transition-all border shadow-sm cursor-pointer hover:scale-105 active:scale-95 inline-block",
                          isDarkMode ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/40" : "bg-emerald-50/50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/70"
                        )}
                      >
                        {icd.code}
                      </span>
                      {(icd.groupCode || (icd.code.includes('.') ? icd.code.split('.')[0] : '')) && (
                        <span 
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 font-semibold" 
                          title={`Mã nhóm: ${icd.groupCode || icd.code.split('.')[0]}`}
                        >
                          Nhóm: {icd.groupCode || icd.code.split('.')[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <p 
                        className={cn(
                          "font-semibold leading-relaxed transition-colors text-[14px]",
                          isDarkMode ? "text-slate-200" : "text-slate-900"
                        )}
                      >
                        {icd.description}
                        {icd.isNew && (
                          <span className="ml-2 inline-block align-text-bottom px-2 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">
                            MỚI
                          </span>
                        )}
                        {!!icd.oldName && (
                          <span className="ml-2 inline-block align-text-bottom px-2 py-0.5 rounded bg-violet-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">
                            TÊN MỚI
                          </span>
                        )}
                        {icd.isExpired && (
                          <span className="ml-2 inline-block align-text-bottom px-2 py-0.5 rounded bg-slate-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">
                            Hết hiệu lực
                          </span>
                        )}
                      </p>
                      {icd.oldName && (
                        <span className={cn("text-[11px] italic", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          Tên cũ: {icd.oldName}
                        </span>
                      )}
                    </div>
                  </td>
                  {canSeeAppendixA2 && (
                    <td className="px-4 sm:px-6 lg:px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {icd.isAppendixA2 && (
                          <div className="relative group/a2 inline-block">
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center cursor-help transition-all group-hover/a2:scale-110 active:scale-95">
                              24
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/a2:opacity-100 group-hover/a2:visible transition-all duration-300 translate-y-1 group-hover/a2:translate-y-0 z-50 pointer-events-none border border-slate-700/50 flex items-center gap-2">
                              <Info size={12} className="text-indigo-400" />
                              Không là bệnh chính
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>
                        )}
                        {icd.isAppendixA3 && (
                          <div className="relative group/a3 inline-block">
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center justify-center cursor-help transition-all group-hover/a3:scale-110 active:scale-95">
                              25
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/a3:opacity-100 group-hover/a3:visible transition-all duration-300 translate-y-1 group-hover/a3:translate-y-0 z-50 pointer-events-none border border-slate-700/50 flex items-center gap-2">
                              <Info size={12} className="text-amber-400" />
                              Không khuyến khích là bệnh chính
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>
                        )}
                        {icd.isAppendixA4 && (
                          <div className="relative group/a4 inline-block">
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center cursor-help transition-all group-hover/a4:scale-110 active:scale-95">
                              27
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/a4:opacity-100 group-hover/a4:visible transition-all duration-300 translate-y-1 group-hover/a4:translate-y-0 z-50 pointer-events-none border border-slate-700/50 flex items-center gap-2">
                              <Info size={12} className="text-blue-400" />
                              Chỉ sử dụng mã hóa nguyên nhân tử vong
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>
                        )}
                        {icd.isAppendixA5 && (
                          <div className="relative group/a5 inline-block">
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-pink-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-pink-500/20 flex items-center justify-center cursor-help transition-all group-hover/a5:scale-110 active:scale-95">
                              28
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/a5:opacity-100 group-hover/a5:visible transition-all duration-300 translate-y-1 group-hover/a5:translate-y-0 z-50 pointer-events-none border border-slate-700/50 flex items-center gap-2">
                              <Info size={12} className="text-pink-400" />
                              Mã bệnh ở nữ giới
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>
                        )}
                        {icd.isAppendixA6 && (
                          <div className="relative group/a6 inline-block">
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-cyan-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 flex items-center justify-center cursor-help transition-all group-hover/a6:scale-110 active:scale-95">
                              29
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/a6:opacity-100 group-hover/a6:visible transition-all duration-300 translate-y-1 group-hover/a6:translate-y-0 z-50 pointer-events-none border border-slate-700/50 flex items-center gap-2">
                              <Info size={12} className="text-cyan-400" />
                              Mã bệnh ở nam giới
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>
                        )}
                        {icd.isRestricted && (
                          <div className="relative group/x inline-block">
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center justify-center cursor-help transition-all group-hover/x:scale-110 active:scale-95">
                              26
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/x:opacity-100 group-hover/x:visible transition-all duration-300 translate-y-1 group-hover/x:translate-y-0 z-50 pointer-events-none border border-slate-700/50 flex items-center gap-2">
                              <AlertTriangle size={12} className="text-rose-400" />
                              Mã không được sử dụng
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>
                        )}
                        {icd.isTT26 && (
                          <div className="relative group/tt26 inline-block">
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-fuchsia-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-fuchsia-500/20 flex items-center justify-center cursor-help transition-all group-hover/tt26:scale-110 active:scale-95">
                              TT26
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 invisible group-hover/tt26:opacity-100 group-hover/tt26:visible transition-all duration-300 translate-y-1 group-hover/tt26:translate-y-0 z-50 pointer-events-none border border-slate-700/50 flex items-center gap-2">
                              <Info size={12} className="text-fuchsia-400" />
                              Bệnh, nhóm bệnh được áp dụng kê đơn thuốc ngoại trú trên 30 ngày
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>
                        )}
                        {!icd.isAppendixA2 && !icd.isAppendixA3 && !icd.isAppendixA4 && !icd.isAppendixA5 && !icd.isAppendixA6 && !icd.isRestricted && !icd.isTT26 && (
                          <span className={cn("text-xs transition-colors", isDarkMode ? "text-slate-700" : "text-slate-200")}>-</span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 sm:px-6 lg:px-8 py-5 text-left min-w-[250px]">
                    <div className={cn(
                      "text-[11px] font-semibold leading-relaxed transition-colors whitespace-pre-wrap",
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    )}>
                      {icd.guide || <div className="text-center"><span className={isDarkMode ? "text-slate-700" : "text-slate-200"}>-</span></div>}
                    </div>
                  </td>
                  {isDrugSuggestionsAllowed && (
                    <td className="w-56 min-w-[224px] max-w-[224px] lg:w-64 lg:min-w-[256px] lg:max-w-[256px] px-4 sm:px-6 lg:px-8 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {drugsByIcd[(icd.code || '').trim().toUpperCase()] && drugsByIcd[(icd.code || '').trim().toUpperCase()].length > 0 ? (
                          drugsByIcd[(icd.code || '').trim().toUpperCase()].map((item, idx) => {
                            const drugName = typeof item === 'string' ? item : item.drugName;
                            const status = typeof item === 'string' ? 'normal' : item.status;
                            const isPrimary = typeof item === 'string' ? false : (item.isPrimary || false);
                            const drugObj = typeof item === 'string' ? drugList.find(d => d.name === drugName) : (item.drugObj || drugList.find(d => d.name === drugName));

                            return (
                              <button 
                                key={`desk-sugg-drug-${icd.code || 'c'}-${drugName}-${idx}`} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (drugObj) {
                                    handleShowDrugDetail(drugObj);
                                  }
                                }}
                                title={
                                  (isPrimary ? "Chỉ định thường dùng (Sao vàng) • " : "") +
                                  (status === 'default' ? 'Khuyến khích chọn' :
                                  status === 'alternative' ? 'Chọn mã khác tốt hơn mã này' :
                                  status === 'not_recommended' ? 'Mã không khuyến khích chọn' :
                                  'Gợi ý thuốc')
                                }
                                className={cn(
                                  "px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-md text-[9px] lg:text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1.5",
                                  isPrimary
                                    ? (isDarkMode 
                                        ? "bg-emerald-950/40 text-emerald-400 border-amber-400 hover:bg-emerald-900/60 ring-1 ring-amber-400/30" 
                                        : "bg-emerald-50 text-emerald-700 border-amber-400 hover:bg-emerald-100 hover:border-amber-500 shadow-xs ring-1 ring-amber-300/50")
                                    : status === 'default'
                                      ? (isDarkMode 
                                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60" 
                                          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-xs")
                                      : status === 'alternative'
                                        ? (isDarkMode 
                                            ? "bg-amber-950/40 text-amber-400 border-amber-500/40 hover:bg-amber-900/60" 
                                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300 shadow-xs")
                                        : status === 'not_recommended'
                                          ? (isDarkMode 
                                              ? "bg-rose-950/40 text-rose-400 border-rose-500/40 hover:bg-rose-900/60" 
                                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-xs")
                                          : (isDarkMode 
                                              ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" 
                                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-xs")
                                )}
                              >
                                {isPrimary ? (
                                  <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                                ) : (
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    status === 'default' ? "bg-emerald-500" :
                                    status === 'alternative' ? "bg-amber-500" :
                                    status === 'not_recommended' ? "bg-rose-500" :
                                    "bg-slate-400"
                                  )} />
                                )}
                                <span>{drugName}</span>
                              </button>
                            );
                          })
                        ) : (
                          <span className={cn(
                            "text-[10px] lg:text-xs italic transition-colors",
                            isDarkMode ? "text-slate-500" : "text-slate-400"
                          )}>Chưa có gợi ý</span>
                        )}
                      </div>
                    </td>
                  )}
                  {canSeeNotes && (
                    <td className="px-4 sm:px-6 lg:px-8 py-5">
                      <p className={cn(
                        "text-xs lg:text-sm font-medium transition-colors",
                        isDarkMode ? "text-slate-400" : "text-slate-600"
                      )}>{icd.notes || '-'}</p>
                    </td>
                  )}
                  {!canManage && canSeeShortcuts && (
                    <td className="w-24 min-w-[96px] max-w-[96px] sm:w-28 sm:min-w-[112px] sm:max-w-[112px] px-4 sm:px-6 lg:px-8 py-4">
                      <div className="flex flex-col gap-1.5 items-center justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTogglePin(icd); }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            icd.isPinned 
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                              : (isDarkMode ? "text-slate-500 hover:bg-slate-800 hover:text-amber-400" : "text-slate-400 hover:bg-slate-100 hover:text-amber-600")
                          )}
                          title={icd.isPinned ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                        >
                          <Star size={14} className={icd.isPinned ? "fill-amber-400 text-amber-500" : ""} />
                        </button>
                      </div>
                    </td>
                  )}
                  {canManage && (
                    <td className="w-36 min-w-[144px] max-w-[144px] sm:w-40 sm:min-w-[160px] sm:max-w-[160px] px-4 sm:px-6 lg:px-8 py-4 text-right">
                      <div className="flex justify-end items-center gap-1 lg:gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(icd); }}
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
                          onClick={(e) => { e.stopPropagation(); confirmDelete(icd.code); }}
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
                <tr key="empty-results-row">
                  <td colSpan={3 + (canSeeAppendixA2 ? 1 : 0) + (isDrugSuggestionsAllowed ? 1 : 0) + (canSeeNotes ? 1 : 0) + (!canManage && canSeeShortcuts ? 1 : 0) + (canManage ? 1 : 0)} className="px-8 py-20 text-center">
                    {icdList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
                        <p className={cn("font-bold text-base lg:text-lg transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          Đang tải và đồng bộ danh mục mã ICD-10 từ máy chủ ({loadingPercentage}%)...
                        </p>
                        <p className="text-xs text-slate-400 mt-1.5 opacity-80 font-medium">
                          Hệ thống đang thiết lập cơ sở dữ liệu cho lần đầu truy cập, vui lòng đợi trong giây lát.
                        </p>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI (Bottom) */}
        {filteredList.length > 0 && (
          <div
            className={cn(
              "w-full hidden lg:flex items-center justify-between gap-1.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6 lg:py-3.5 border-t transition-colors",
              isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50/50 border-slate-100"
            )}
          >
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-bold",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                Hiển thị <span className={isDarkMode ? "text-white" : "text-slate-900"}>{(validPage - 1) * itemsPerPage + 1}</span> - <span className={isDarkMode ? "text-white" : "text-slate-900"}>{Math.min(validPage * itemsPerPage, filteredList.length)}</span> / <span className={isDarkMode ? "text-white" : "text-slate-900"}>{filteredList.length}</span>
              </span>

              <div className="flex items-center gap-1 sm:gap-1.5 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-2.5">
                <span
                  className={cn(
                    "hidden sm:inline text-[9px] font-bold uppercase tracking-wider",
                    isDarkMode ? "text-slate-500" : "text-slate-400"
                  )}
                >
                  Hiển thị:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "text-[10px] sm:text-xs font-bold py-1 px-1.5 sm:px-2 rounded-lg border appearance-none cursor-pointer outline-none transition-all",
                    isDarkMode
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500"
                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400 shadow-2xs"
                  )}
                  title="Số lượng mã bệnh trên mỗi trang"
                >
                  {[10, 20, 30, 50, 100].map((val) => (
                    <option key={val} value={val}>
                      {val}/trang
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Trang đầu << */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={validPage === 1}
                title="Trang đầu"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Trang trước < */}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={validPage === 1}
                title="Trang trước"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Điền/Hiển thị trang hiện tại */}
              <div
                className={cn(
                  "flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg lg:rounded-xl border text-[11px] sm:text-xs font-bold transition-colors",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                <span className={cn("hidden xs:inline text-[10px] sm:text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Trang
                </span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => {
                    setPageInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setCurrentPage(val);
                    }
                  }}
                  onBlur={() => {
                    const val = parseInt(pageInput, 10);
                    if (isNaN(val) || val < 1 || val > totalPages) {
                      setPageInput(validPage.toString());
                    } else {
                      setCurrentPage(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = parseInt(pageInput, 10);
                      if (!isNaN(val) && val >= 1 && val <= totalPages) {
                        setCurrentPage(val);
                      } else {
                        setPageInput(validPage.toString());
                      }
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className={cn(
                    "w-8 sm:w-11 text-center py-0.5 px-0.5 rounded-md sm:rounded-lg font-black focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/40 border transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px] sm:text-xs",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-300 text-slate-900 shadow-2xs"
                  )}
                />
                <span className={cn("text-[10px] sm:text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  /{totalPages}
                </span>
              </div>

              {/* Trang sau > */}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={validPage === totalPages}
                title="Trang sau"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Trang cuối >> */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={validPage === totalPages}
                title="Trang cuối"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      {isMobile && totalPages > 1 && (
        <div className="h-16 lg:hidden shrink-0" aria-hidden="true" />
      )}
      </>
    )}
        </>
      )}

      {/* Bulk Description Update Modal */}
      <AnimatePresence>
        {isBatchDescModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (batchDescStatus !== 'processing') setIsBatchDescModalOpen(false);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col transition-colors",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
            >
              <div className={cn(
                "p-6 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 transition-colors">
                    <Edit2 size={20} />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                      Đặt tên Mô tả bệnh hàng loạt
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Cập nhật mô tả bệnh cho nhiều mã ICD-10 cùng lúc
                    </p>
                  </div>
                </div>
                <button 
                  disabled={batchDescStatus === 'processing'}
                  onClick={() => setIsBatchDescModalOpen(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors disabled:opacity-50",
                    isDarkMode ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {batchDescStatus === 'idle' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className={cn(
                        "p-4 rounded-2xl border text-xs leading-relaxed space-y-2",
                        isDarkMode ? "bg-slate-800/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-600"
                      )}>
                        <p className="font-bold text-emerald-500">Hướng dẫn định dạng nhập liệu:</p>
                        <p>Mỗi dòng tương ứng với 1 mã bệnh theo một trong các định dạng sau:</p>
                        <ul className="list-disc list-inside space-y-1 font-mono text-[11px]">
                          <li>Mã_ICD: Mô tả bệnh</li>
                          <li>Mã_ICD | Mô tả bệnh</li>
                          <li>Mã_ICD Mô tả bệnh (cách bởi dấu cách)</li>
                        </ul>
                        <p className="text-[10px] italic">Ví dụ: <br/><strong>A00: Tiêu chảy cấp do Tả</strong><br/><strong>E11.9 | Đái tháo đường không biến chứng</strong></p>
                      </div>

                      <textarea
                        rows={10}
                        value={batchDescText}
                        onChange={(e) => setBatchDescText(e.target.value)}
                        placeholder="Ví dụ:&#13;A00: Tiêu chảy cấp do Tả&#13;E11.9 | Đái tháo đường không biến chứng&#13;B20 Nhiễm trùng cơ hội do HIV"
                        className={cn(
                          "w-full px-4 py-4 border rounded-2xl focus:ring-2 transition-all font-mono text-sm",
                          "focus:ring-amber-500",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 shadow-inner"
                        )}
                      />
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={() => setIsBatchDescModalOpen(false)}
                          className={cn(
                            "w-full sm:flex-1 py-4 rounded-2xl font-bold text-sm transition-all order-2 sm:order-none",
                            isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          Hủy bỏ
                        </button>
                        <button
                          disabled={!batchDescText.trim()}
                          onClick={handleBatchUpdateDescription}
                          className={cn(
                            "w-full sm:flex-[1.5] py-4 text-white rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 bg-amber-600 hover:bg-amber-700 shadow-amber-200 order-1 sm:order-none",
                            isDarkMode && "shadow-none"
                          )}
                        >
                          Cập nhật hàng loạt
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {batchDescStatus === 'processing' && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-amber-500" size={48} />
                    <p className={cn("text-sm font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Đang xử lý đặt tên mô tả...</p>
                  </div>
                )}

                {batchDescStatus === 'done' && (
                  <div className="space-y-6">
                    <div className={cn(
                      "p-6 rounded-3xl border flex items-center gap-4",
                      isDarkMode ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"
                    )}>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                        <Check size={28} />
                      </div>
                      <div>
                        <p className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>Hoàn tất cập nhật</p>
                        <p className="text-xs font-bold text-slate-500 italic">
                          Đã cập nhật thành công Mô tả bệnh cho {batchDescResults.success} mã ICD-10.
                        </p>
                      </div>
                    </div>

                    {batchDescResults.failed.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 px-2 flex items-center gap-2">
                          <X size={12} />
                          Dòng lỗi hoặc mã không khớp ({batchDescResults.failed.length})
                        </p>
                        <div className={cn(
                          "p-4 rounded-2xl border max-h-40 overflow-y-auto no-scrollbar font-mono text-xs",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-600"
                        )}>
                          {batchDescResults.failed.join(', ')}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setIsBatchDescModalOpen(false)}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-sm transition-all",
                        isDarkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200"
                      )}
                    >
                      Xác nhận và Quay lại
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                "relative w-full h-full sm:h-auto sm:max-w-5xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col transition-colors",
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Cột trái: Nhập thông tin */}
                  <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Mã ICD-10 {editingIcd ? '(Mã con / chi tiết)' : ''}
                        </label>
                        <span className="text-[10px] font-medium text-slate-400">
                          VD: A00.0
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        disabled={!!editingIcd}
                        value={formData.code || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          const autoGroup = val.includes('.') ? val.split('.')[0] : (val.length >= 3 ? val.slice(0, 3) : val);
                          setFormData(prev => {
                            const prevAuto = prev.code.includes('.') ? prev.code.split('.')[0] : (prev.code.length >= 3 ? prev.code.slice(0, 3) : prev.code);
                            const shouldSync = !prev.groupCode || prev.groupCode === prevAuto;
                            return {
                              ...prev,
                              code: val,
                              groupCode: shouldSync ? autoGroup : prev.groupCode
                            };
                          });
                        }}
                        placeholder="VD: A00.0"
                        className={cn(
                          "w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-mono font-bold text-sm disabled:opacity-50",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Mã ICD-10 nhóm
                        </label>
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          Nhóm 3 ký tự (VD: A00)
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.groupCode || ''}
                          onChange={(e) => setFormData({ ...formData, groupCode: e.target.value.toUpperCase() })}
                          placeholder="VD: A00"
                          className={cn(
                            "w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-mono font-bold text-sm uppercase",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                        {formData.code && !formData.groupCode && (
                          <button
                            type="button"
                            onClick={() => {
                              const auto = formData.code.includes('.') ? formData.code.split('.')[0] : (formData.code.length >= 3 ? formData.code.slice(0, 3) : formData.code);
                              setFormData({ ...formData, groupCode: auto });
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 cursor-pointer"
                          >
                            Tự điền
                          </button>
                        )}
                      </div>
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

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên cũ (nếu có)</label>
                      <input
                        type="text"
                        value={formData.oldName || ''}
                        onChange={(e) => setFormData({ ...formData, oldName: e.target.value })}
                        placeholder="Nhập tên cũ của bệnh nếu có sự thay đổi..."
                        className={cn(
                          "w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên Chương</label>
                      <input
                        type="text"
                        value={formData.chapterName || ''}
                        onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
                        placeholder="Nhập tên Chương bệnh (VD: Chương I: Một số bệnh nhiễm trùng...)"
                        className={cn(
                          "w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên Khối</label>
                      <input
                        type="text"
                        value={formData.blockName || ''}
                        onChange={(e) => setFormData({ ...formData, blockName: e.target.value })}
                        placeholder="Nhập tên Khối bệnh (VD: A00-A09: Các bệnh nhiễm trùng đường ruột...)"
                        className={cn(
                          "w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ghi chú</label>
                      <textarea
                        rows={2}
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Nhập ghi chú hoặc hướng dẫn điều trị nhanh..."
                        className={cn(
                          "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-sm no-scrollbar",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hướng dẫn mã hóa (WHO 2019)</label>
                      <textarea
                        rows={2}
                        value={formData.guide || ''}
                        onChange={(e) => setFormData({ ...formData, guide: e.target.value })}
                        placeholder="Nhập hướng dẫn mã hóa bổ sung..."
                        className={cn(
                          "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm no-scrollbar",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                    </div>
                  </div>

                  {/* Cột phải: Tick nhãn dán */}
                  <div className="lg:col-span-5 space-y-4 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6 flex flex-col justify-start">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nhãn dán & Phân loại</label>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isAppendixA2: !formData.isAppendixA2 })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isAppendixA2 
                              ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-indigo-400")
                          )}
                        >
                          {formData.isAppendixA2 && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isAppendixA2: !formData.isAppendixA2 })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-indigo-600"
                          )}>
                            Không là bệnh chính
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Mã bệnh không được sử dụng làm chẩn đoán chính</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isAppendixA3: !formData.isAppendixA3 })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isAppendixA3 
                              ? "bg-amber-600 border-amber-600 shadow-lg shadow-amber-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-amber-400")
                          )}
                        >
                          {formData.isAppendixA3 && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isAppendixA3: !formData.isAppendixA3 })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-amber-600"
                          )}>
                            Mã không khuyến khích làm bệnh chính
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Mã bệnh không khuyến khích dùng làm chẩn đoán chính</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isRestricted: !formData.isRestricted })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isRestricted 
                              ? "bg-rose-600 border-rose-600 shadow-lg shadow-rose-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-rose-400")
                          )}
                        >
                          {formData.isRestricted && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isRestricted: !formData.isRestricted })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-rose-600"
                          )}>
                            Mã không được sử dụng
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Phải sử dụng mã 4 hoặc 5 ký tự cụ thể hơn</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isAppendixA4: !formData.isAppendixA4 })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isAppendixA4 
                              ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-blue-400")
                          )}
                        >
                          {formData.isAppendixA4 && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isAppendixA4: !formData.isAppendixA4 })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-blue-600"
                          )}>
                            Chỉ sử dụng mã hóa nguyên nhân tử vong
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Dành riêng cho nguyên nhân tử vong</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isAppendixA5: !formData.isAppendixA5 })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isAppendixA5 
                              ? "bg-pink-600 border-pink-600 shadow-lg shadow-pink-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-pink-400")
                          )}
                        >
                          {formData.isAppendixA5 && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isAppendixA5: !formData.isAppendixA5 })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-pink-600"
                          )}>
                            Mã bệnh ở nữ giới
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Mã bệnh chỉ có hoặc chủ yếu ở nữ giới</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isAppendixA6: !formData.isAppendixA6 })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isAppendixA6 
                              ? "bg-cyan-600 border-cyan-600 shadow-lg shadow-cyan-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-cyan-400")
                          )}
                        >
                          {formData.isAppendixA6 && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isAppendixA6: !formData.isAppendixA6 })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-cyan-600"
                          )}>
                            Mã bệnh ở nam giới
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Mã bệnh chỉ có hoặc chủ yếu ở nam giới</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isNew: !formData.isNew })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isNew 
                              ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-emerald-400")
                          )}
                        >
                          {formData.isNew && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isNew: !formData.isNew })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-emerald-500"
                          )}>
                            Mã mới
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Mã bệnh mới được bổ sung</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isExpired: !formData.isExpired })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isExpired 
                              ? "bg-slate-500 border-slate-500 shadow-lg shadow-slate-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-slate-400")
                          )}
                        >
                          {formData.isExpired && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isExpired: !formData.isExpired })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-500"
                          )}>
                            Mã hết hiệu lực
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Mã bệnh đã bị loại bỏ hoặc không còn hiệu lực</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => setFormData({ ...formData, isTT26: !formData.isTT26 })}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                            formData.isTT26 
                              ? "bg-fuchsia-600 border-fuchsia-600 shadow-lg shadow-fuchsia-200 dark:shadow-none" 
                              : (isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white shadow-sm hover:border-fuchsia-400")
                          )}
                        >
                          {formData.isTT26 && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col" onClick={() => setFormData({ ...formData, isTT26: !formData.isTT26 })}>
                          <span className={cn(
                            "text-sm font-black transition-all",
                            isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-fuchsia-600"
                          )}>
                            Kê đơn ngoại trú trên 30 ngày
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Bệnh, nhóm bệnh được áp dụng kê đơn thuốc ngoại trú trên 30 ngày</span>
                        </div>
                      </label>
                    </div>
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

      <DrugDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        drug={detailDrug} 
        isDarkMode={isDarkMode} 
      />

      <ICDDetailModal
        isOpen={isIcdDetailModalOpen}
        onClose={() => setIsIcdDetailModalOpen(false)}
        icd={selectedIcdForDetail}
        suggestions={selectedIcdForDetail ? (drugsByIcd[(selectedIcdForDetail.code || '').trim().toUpperCase()] || []) : []}
        isDarkMode={isDarkMode}
        onShowDrugDetail={(drugName) => {
          const drugObj = drugList.find(d => d.name === drugName);
          if (drugObj) {
            handleShowDrugDetail(drugObj);
          }
        }}
      />

      {/* Copy Code Modal / Bottom Sheet */}
      <AnimatePresence>
        {activeCopyTag && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCopyTag(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "relative w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border-t sm:border p-5 shadow-2xl flex flex-col gap-3.5 z-10 max-h-[85vh] overflow-y-auto custom-scrollbar",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-white shadow-black/80"
                  : "bg-white border-slate-200 text-slate-800 shadow-slate-900/20"
              )}
            >
              {/* Mobile Handle */}
              <div className={cn("w-12 h-1.5 rounded-full mx-auto -mt-1 mb-0.5 shrink-0 sm:hidden", isDarkMode ? "bg-slate-700" : "bg-slate-300")} />

              {/* Header */}
              <div className={cn(
                "flex items-center justify-between border-b pb-3 shrink-0",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                    <Copy size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                      Sao chép mã ICD-10
                    </h4>
                    <div className={cn("font-mono text-sm font-extrabold truncate mt-0.5", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
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

              {/* Description */}
              {activeCopyTag.desc && (
                <div className={cn(
                  "text-xs font-medium px-3 py-2.5 rounded-xl border leading-relaxed shrink-0",
                  isDarkMode ? "bg-slate-800/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200/80 text-slate-700"
                )}>
                  {activeCopyTag.desc}
                </div>
              )}

              {/* Copy Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
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
                    type="button"
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
                  type="button"
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

              {/* Section: Thuốc gợi ý cùng mã ICD-10 */}
              {(() => {
                const suggestions = drugsByIcd[(activeCopyTag.code || '').trim().toUpperCase()] || [];
                return (
                  <div className={cn(
                    "pt-3 mt-1 border-t flex flex-col gap-2 shrink-0",
                    isDarkMode ? "border-slate-800" : "border-slate-100"
                  )}>
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider px-1">
                      <span className={cn("flex items-center gap-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        <Pill size={14} className="text-emerald-500 shrink-0" />
                        Thuốc gợi ý ({suggestions.length})
                      </span>
                    </div>

                    {suggestions.length === 0 ? (
                      <div className={cn(
                        "text-xs font-medium italic px-2 py-2.5 rounded-xl text-center",
                        isDarkMode ? "bg-slate-800/40 text-slate-500" : "bg-slate-50 text-slate-400"
                      )}>
                        Chưa có thuốc gợi ý cho mã này
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {suggestions.map((item, odIdx) => {
                          const drugName = typeof item === 'string' ? item : item.drugName;
                          const drugObj = typeof item === 'string' ? drugList.find(d => d.name === drugName) : (item.drugObj || drugList.find(d => d.name === drugName));
                          const isPrimary = typeof item === 'string' ? false : (item.isPrimary || false);

                          return (
                            <button
                              type="button"
                              key={`${drugName}-${odIdx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCopyTag(null);
                                if (drugObj) {
                                  handleShowDrugDetail(drugObj);
                                }
                              }}
                              className={cn(
                                "w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 group/drug-item cursor-pointer",
                                isDarkMode
                                  ? "bg-slate-800/40 border-slate-800 hover:bg-emerald-950/40 hover:border-emerald-800/50"
                                  : "bg-slate-50/80 border-slate-200/80 hover:bg-emerald-50 hover:border-emerald-200"
                              )}
                            >
                              <div className="min-w-0 flex items-center gap-1.5">
                                {isPrimary && <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />}
                                <div className={cn(
                                  "text-xs font-bold truncate",
                                  isDarkMode ? "text-slate-200 group-hover/drug-item:text-emerald-400" : "text-slate-800 group-hover/drug-item:text-emerald-600"
                                )}>
                                  {drugName}
                                </div>
                              </div>
                              <ExternalLink size={13} className="text-slate-400 group-hover/drug-item:text-emerald-500 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Fixed Pagination Bar on Tra cứu ICD-10 (pinned above bottommobilenav) */}
      {typeof document !== "undefined" &&
      isActive &&
      isMobile &&
      totalPages > 1 &&
      viewStyle === "card" &&
      !isModalOpen &&
      !isDetailModalOpen &&
      !isIcdDetailModalOpen &&
      !isDeleteModalOpen &&
      !isGuideModalOpen &&
      !isBatchDescModalOpen &&
      !activeCopyTag
        ? createPortal(
            <div
              id="mobile-icd-fixed-pagination"
              data-prevent-swipe="true"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="lg:hidden fixed left-0 right-0 z-30 flex items-center justify-center px-2 py-1 pointer-events-auto transition-all duration-200"
              style={{
                bottom:
                  mobileBottomNavHeight > 0
                    ? `${mobileBottomNavHeight}px`
                    : "var(--mobile-bottom-nav-height, calc(3.5rem + env(safe-area-inset-bottom, 0px)))",
              }}
            >
              <div
                className={cn(
                  "w-full max-w-lg mx-auto flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-2xl border shadow-lg backdrop-blur-xl transition-all",
                  isDarkMode
                    ? "bg-slate-900/95 border-slate-800 text-slate-200 shadow-black/50"
                    : "bg-white/95 border-slate-200/90 text-slate-700 shadow-slate-900/10",
                )}
              >
                {/* Left: items per page select */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "hidden xs:inline text-[9px] font-bold uppercase tracking-wider",
                      isDarkMode ? "text-slate-500" : "text-slate-400",
                    )}
                  >
                    Hiển thị:
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "text-[10px] font-bold py-1 px-1.5 rounded-lg border appearance-none cursor-pointer outline-none transition-all",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500"
                        : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400 shadow-2xs",
                    )}
                    title="Số lượng mã bệnh trên mỗi trang"
                  >
                    {[10, 20, 30, 50, 100].map((val) => (
                      <option key={val} value={val}>
                        {val}/trang
                      </option>
                    ))}
                  </select>
                </div>

                {/* Right: navigation buttons & page input */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Trang đầu << */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={validPage === 1}
                    title="Trang đầu"
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Trang trước < */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={validPage === 1}
                    title="Trang trước"
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Input trang */}
                  <div
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[11px] font-bold transition-colors",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300"
                        : "bg-slate-50 border-slate-200 text-slate-700",
                    )}
                  >
                    <span className={cn("hidden xs:inline text-[10px]", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Trang
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => {
                        setPageInput(e.target.value);
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }}
                      onBlur={() => {
                        const val = parseInt(pageInput, 10);
                        if (isNaN(val) || val < 1 || val > totalPages) {
                          setPageInput(validPage.toString());
                        } else {
                          setCurrentPage(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseInt(pageInput, 10);
                          if (!isNaN(val) && val >= 1 && val <= totalPages) {
                            setCurrentPage(val);
                          } else {
                            setPageInput(validPage.toString());
                          }
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className={cn(
                        "w-8 text-center py-0.5 px-0.5 rounded font-black focus:outline-none focus:ring-1 focus:ring-emerald-500/40 border transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px]",
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900 shadow-2xs",
                      )}
                    />
                    <span className={cn("text-[10px]", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      /{totalPages}
                    </span>
                  </div>

                  {/* Trang sau > */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={validPage === totalPages}
                    title="Trang sau"
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Trang cuối >> */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validPage === totalPages}
                    title="Trang cuối"
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      </div>
    </div>
  );
};

export default ICD10Management;
