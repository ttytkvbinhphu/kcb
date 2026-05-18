import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Info, ChevronRight, ChevronLeft, Pill, Filter, ShieldAlert, Plus, Edit2, Trash2, X, Save, FileText, ExternalLink, Eye, EyeOff, Loader2, Check, Clock, RefreshCw, Heart, Baby, Car, AlertTriangle, Activity, Zap, FolderTree, Folder, Scissors, Settings, Briefcase, MoveRight, ChevronUp, ChevronDown, Star, Database, AlertCircle, Calendar, Sparkles, Hash, FileSearch, Lightbulb, Link, Pause, MoreVertical } from 'lucide-react';
import { Drug, DrugGroup, Ingredient, ManualInteraction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, setDoc, doc, deleteDoc, storage, getDoc, writeBatch, getDocs, where } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import DrugGroupManagement from './DrugGroupManagement';
import CatalogManagement from './CatalogManagement';
import ImageEditorModal from './ImageEditorModal';
import DrugDetailModal from './DrugDetailModal';

import ConfirmModal from './ConfirmModal';

interface DrugDirectoryProps {
  canManage: boolean;
  isDarkMode: boolean;
  subHeaderPortalId?: string;
  featureSettings?: any;
  userRole?: string;
  isApproved?: boolean;
  userPowerPoints?: number;
  initialSelectedDrugId?: string | null;
  initialSelectedDrugName?: string | null;
  onClearInitialDrug?: () => void;
  currentUserName?: string;
}

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

const DrugDirectory: React.FC<DrugDirectoryProps> = ({
  canManage,
  isDarkMode,
  subHeaderPortalId,
  featureSettings,
  userRole,
  isApproved = false,
  userPowerPoints = 0,
  initialSelectedDrugId,
  initialSelectedDrugName,
  onClearInitialDrug,
  currentUserName = 'Dược sĩ'
}) => {
  const isGuestUser = !userRole;
  const isPendingUser = !!userRole && !isApproved;

  // Power-point threshold helpers
  const canSeeCommonIndications = userPowerPoints >= (featureSettings?.commonIndicationsMinPower ?? 0);
  const canSeeIcdSuggestions = userPowerPoints >= (featureSettings?.icdSuggestionsMinPower ?? 0);
  const canSeeClosedDrugs = userPowerPoints >= (featureSettings?.showClosedDrugsMinPower ?? 0);
  const canSeeStatusColumn = userPowerPoints >= (featureSettings?.showStatusColumnMinPower ?? 0);
  const canSeeActionsColumn = userPowerPoints >= (featureSettings?.showActionsColumnMinPower ?? 0);

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [drugGroups, setDrugGroups] = useState<DrugGroup[]>([]);
  const [icdList, setIcdList] = useState<any[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [availableExcipients, setAvailableExcipients] = useState<any[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden' | 'suspended'>('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [dosageFormFilter, setDosageFormFilter] = useState('all');
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [groupFilter, setGroupFilter] = useState('Tất cả');
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const [groupFilterSearch, setGroupFilterSearch] = useState('');
  const groupFilterRef = useRef<HTMLDivElement>(null);
  const [isDosageFormFilterOpen, setIsDosageFormFilterOpen] = useState(false);
  const [dosageFormFilterSearch, setDosageFormFilterSearch] = useState('');
  const dosageFormFilterRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'drugs' | 'groups' | 'ingredients' | 'excipients' | 'companies'>('drugs');
  const [excipientView, setExcipientView] = useState<'excipients' | 'categories'>('excipients');
  const [ingredientView, setIngredientView] = useState<'search' | 'manage' | 'categories'>('search');
  const mainSearchRef = useRef<HTMLDivElement>(null);
  const [showStickySearch, setShowStickySearch] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickySearch(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );

    if (mainSearchRef.current) {
      observer.observe(mainSearchRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // CRITICAL: Force-clear the subheader portal node when DrugDirectory unmounts.
  // Without this, the filter buttons remain in the DOM as "zombie" nodes that
  // block pointer events on whichever module is rendered next.
  useEffect(() => {
    return () => {
      const portalNode = subHeaderPortalId
        ? document.getElementById(subHeaderPortalId)
        : null;
      if (portalNode) {
        while (portalNode.firstChild) {
          portalNode.removeChild(portalNode.firstChild);
        }
      }
      // Force a GPU repaint so any composited layers left by this module are flushed.
      document.documentElement.style.transform = 'translateZ(0)';
      requestAnimationFrame(() => {
        document.documentElement.style.transform = '';
      });
    };
  }, [subHeaderPortalId]);

  const [searchMode, setSearchMode] = useState<'all' | 'name' | 'ingredient'>('all');
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageBeforeSearchRef = useRef(1);
  const wasSearchingRef = useRef(false);
  const [ingredientPage, setIngredientPage] = useState(1);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('drug_items_per_page');
    return saved ? Number(saved) : 20;
  });

  useEffect(() => {
    localStorage.setItem('drug_items_per_page', itemsPerPage.toString());
  }, [itemsPerPage]);
  const INGREDIENTS_PER_PAGE = 48;
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [formGroupSearch, setFormGroupSearch] = useState('');
  const [excipientFormSearch, setExcipientFormSearch] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [isIngredientCategoryModalOpen, setIsIngredientCategoryModalOpen] = useState(false);
  const [isExcipientModalOpen, setIsExcipientModalOpen] = useState(false);
  const [isExcipientCategoryModalOpen, setIsExcipientCategoryModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [catalogAddTrigger, setCatalogAddTrigger] = useState(0);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'dosage' | 'warnings' | 'pharmacology' | 'company'>('company');
  const [activeSubTab, setActiveSubTab] = useState<string>('');

  useEffect(() => {
    // Reset sub-tab when main tab changes
    const defaultSubTabs: Record<string, string> = {
      general: 'info',
      dosage: 'indications',
      warnings: 'contra',
      pharmacology: 'interactions',
      company: 'settings'
    };
    setActiveSubTab(defaultSubTabs[activeTab] || '');
  }, [activeTab]);

  const SUB_TABS: Record<string, { id: string, label: string }[]> = {
    general: [
      { id: 'info', label: 'Cơ bản' },
      { id: 'composition', label: 'Thành phần' }
    ],
    pharmacology: [
      { id: 'interactions', label: 'Tương tác' },
      { id: 'properties', label: 'Dược lực/Động' }
    ],
    company: [
      { id: 'settings', label: 'Thiết lập' },
      { id: 'info', label: 'Công ty' }
    ]
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Management state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [formData, setFormData] = useState<Drug>({
    id: '',
    name: '',
    activeIngredients: [],
    atcCode: '',
    dosageForm: '',
    excipients: '',
    manufacturer: '',
    mechanismOfAction: '',
    indications: [],
    contraindications: [],
    sideEffects: [],
    groupId: '',
    groupIds: [],
    avatarUrl: '',
    pdfUrl: '',
    registrationNumber: '',
    leafletVersion: '',
    administrationRoute: '',
    generalAdministration: '',
    isClosed: false,
    isRx: false,
    status: 'active',
    stockStatus: 'available',
    expiryStatus: 'valid',
    dosageAndAdministration: [],
    precautions: '',
    pregnancy: '',
    lactation: '',
    driving: '',
    interactions: '',
    specificInteractions: [],
    pharmacodynamics: [],
    pharmacokinetics: [],
    overdose: '',
    updatedAt: '',
    updatedBy: '',
    createdAt: ''
  });

  // Local string states for comma-separated fields
  const [contraindicationsText, setContraindicationsText] = useState(''); // Keep for legacy if needed, but we'll use formData
  const [sideEffectsText, setSideEffectsText] = useState('');
  const [searchingIcdIndex, setSearchingIcdIndex] = useState<number | null>(null);
  const [searchingContraIcdIndex, setSearchingContraIcdIndex] = useState<number | null>(null);
  const [icdQuery, setIcdQuery] = useState('');
  const hasLoadedIcdRef = useRef(false);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    indications: true,
    contraindications: true,
    dosage: true,
    interactions: true,
    warnings: true,
    pharmacology: true
  });

  // Lock scroll on outer container when a drug is selected (Mobile only)
  useEffect(() => {
    if (!selectedDrug || window.innerWidth >= 1024) return;

    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      const originalOverflow = mainContainer.style.overflow;
      mainContainer.style.overflow = 'hidden';
      return () => {
        mainContainer.style.overflow = originalOverflow;
      };
    }
  }, [selectedDrug]);

  const [activeDetailTab, setActiveDetailTab] = useState<'indications' | 'contraindications' | 'dosage' | 'interactions' | 'warnings' | 'side_effects' | 'pharmacology'>('indications');

  const detailTabs = [
    { id: 'indications', label: 'Chỉ định', icon: <Info size={14} /> },
    { id: 'contraindications', label: 'Chống chỉ định', icon: <ShieldAlert size={14} /> },
    { id: 'dosage', label: 'Liều lượng', icon: <Clock size={14} /> },
    { id: 'side_effects', label: 'Tác dụng phụ', icon: <AlertCircle size={14} /> },
    { id: 'interactions', label: 'Tương tác', icon: <RefreshCw size={14} /> },
    { id: 'warnings', label: 'Cảnh báo', icon: <AlertTriangle size={14} /> },
    { id: 'pharmacology', label: 'Dược lý', icon: <Activity size={14} /> }
  ];

  const handleSwipe = (direction: number) => {
    const currentIndex = detailTabs.findIndex(t => t.id === activeDetailTab);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < detailTabs.length) {
      setActiveDetailTab(detailTabs[nextIndex].id as any);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Image Editor state
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string>('');
  const [editingImageType, setEditingImageType] = useState<'avatar'>('avatar');

  // Drug Detail Modal State
  const [detailDrug, setDetailDrug] = useState<Drug | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleShowDrugDetail = (drug: Drug) => {
    setDetailDrug(drug);
    setIsDetailModalOpen(true);
  };

  const handleImageCropConfirm = (croppedImage: string) => {
    if (editingImageType === 'avatar') {
      setFormData({ ...formData, avatarUrl: croppedImage });
    }
    setIsImageEditorOpen(false);
  };

  const openImageEditor = (url: string, type: 'avatar') => {
    if (!url) return;
    setImageToEdit(url);
    setEditingImageType(type);
    setIsImageEditorOpen(true);
  };

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string, name: string, pdfUrl?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupFilterRef.current && !groupFilterRef.current.contains(event.target as Node)) {
        setIsGroupFilterOpen(false);
      }
      if (dosageFormFilterRef.current && !dosageFormFilterRef.current.contains(event.target as Node)) {
        setIsDosageFormFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    if (!openActionMenuId) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionMenuId]);


  // Live lookup: always find the current portal node at render time.
  // This prevents stale-reference bugs where DrugDirectory holds onto a detached
  // DOM node after App.tsx destroys and recreates the portal div on tab change.
  const getPortalNode = () =>
    subHeaderPortalId ? document.getElementById(subHeaderPortalId) : null;



  useEffect(() => {
    if (initialSelectedDrugId && drugs.length > 0) {
      const drug = drugs.find(d => d.id === initialSelectedDrugId);
      if (drug) {
        const canSeeThisDrug = !drug.isClosed || (canManage && canSeeClosedDrugs);
        if (canSeeThisDrug) {
          setSelectedDrug(drug);
          setViewMode('drugs');
        }
        if (onClearInitialDrug) onClearInitialDrug();
      }
    }
  }, [initialSelectedDrugId, drugs, onClearInitialDrug, canManage, canSeeClosedDrugs]);

  useEffect(() => {
    if (initialSelectedDrugName && drugs.length > 0) {
      const nameLower = initialSelectedDrugName.toLowerCase().trim();
      const drug = drugs.find(d => (d.name || '').toLowerCase().trim() === nameLower);
      if (drug) {
        const canSeeThisDrug = !drug.isClosed || (canManage && canSeeClosedDrugs);
        if (canSeeThisDrug) {
          setSelectedDrug(drug);
          setViewMode('drugs');
        }
      } else {
        // Fallback: set search term so user sees filtered results
        setSearchTerm(initialSelectedDrugName);
      }
      if (onClearInitialDrug) onClearInitialDrug();
    }
  }, [initialSelectedDrugName, drugs, onClearInitialDrug, canManage, canSeeClosedDrugs]);

  useEffect(() => {
    const q = query(collection(db, 'drugs'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drugsData = snapshot.docs.map(doc => {
        const data = doc.data() as Drug;
        return {
          ...data,
          groupIds: data.groupIds || (data.groupId ? [data.groupId] : []),
          indications: data.indications || [],
          contraindications: data.contraindications || [],
          sideEffects: data.sideEffects || []
        };
      });
      setDrugs(drugsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching drugs:", error);
      handleFirestoreError(error, OperationType.LIST, 'drugs');
      setLoading(false);
    });

    const unsubscribeGroups = onSnapshot(query(collection(db, 'drug_groups'), orderBy('order')), (snapshot) => {
      const groups = snapshot.docs.map(doc => doc.data() as DrugGroup);
      setDrugGroups(groups);
    });

    const unsubscribeIngredients = onSnapshot(query(collection(db, 'ingredients'), orderBy('name')), (snapshot) => {
      const ingredients = snapshot.docs.map(doc => doc.data() as Ingredient);
      setAvailableIngredients(ingredients);
    });

    const unsubscribeExcipients = onSnapshot(query(collection(db, 'excipients'), orderBy('name')), (snapshot) => {
      const excipients = snapshot.docs.map(doc => doc.data());
      setAvailableExcipients(excipients);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'excipients');
    });

    const unsubscribeCompanies = onSnapshot(query(collection(db, 'companies'), orderBy('name')), (snapshot) => {
      const companies = snapshot.docs.map(doc => doc.data());
      setAvailableCompanies(companies);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'companies');
    });

    return () => {
      unsubscribe();
      unsubscribeGroups();
      unsubscribeIngredients();
      unsubscribeExcipients();
      unsubscribeCompanies();
    };
  }, []);

  useEffect(() => {
    const shouldLoadIcd = isModalOpen || searchingIcdIndex !== null || searchingContraIcdIndex !== null || !!selectedDrug;
    if (!shouldLoadIcd || hasLoadedIcdRef.current) return;

    hasLoadedIcdRef.current = true;
    const unsubscribeICD = onSnapshot(collection(db, 'icd10'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      setIcdList(list);
    });

    return () => {
      unsubscribeICD();
      hasLoadedIcdRef.current = false;
    };
  }, [isModalOpen, searchingIcdIndex, searchingContraIcdIndex, selectedDrug]);

  const [isIcdLookupOpen, setIsIcdLookupOpen] = useState(false);
  const [icdLookupTarget, setIcdLookupTarget] = useState<{ type: 'indication' | 'contraindication'; index: number } | null>(null);
  const [showIcdFilters, setShowIcdFilters] = useState(false);
  const [icdChapterFilter, setIcdChapterFilter] = useState<string>('all');
  const [icdSuggestionFilter, setIcdSuggestionFilter] = useState<'all' | 'suggested' | 'not_suggested'>('all');

  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // Default collapse all when entering groups tab
  useEffect(() => {
    if (viewMode === 'groups') {
      setExpandedGroupIds(new Set());
    }
  }, [viewMode]);

  const handleExpandAllGroups = () => {
    setExpandedGroupIds(new Set(drugGroups.map(g => g.id)));
  };

  const handleCollapseAllGroups = () => {
    setExpandedGroupIds(new Set());
  };

  const toggleGroupExpand = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const sortedDrugGroups = useMemo(() => {
    const buildTree = (parentId: string | null = null, seen = new Set<string>()): DrugGroup[] => {
      return drugGroups
        .filter(g => g.parentId === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .flatMap(g => {
          if (seen.has(g.id)) return []; // Prevent infinite recursion
          const newSeen = new Set(seen);
          newSeen.add(g.id);
          return [g, ...buildTree(g.id, newSeen)];
        });
    };
    try {
      return buildTree(null);
    } catch (e) {
      console.error("Circular dependency in drug groups:", e);
      return [];
    }
  }, [drugGroups]);

  // Calculate recursive drug counts for each group
  const groupDrugCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    const calculateCount = (groupId: string, seen = new Set<string>()): number => {
      // Return cached count if already calculated
      if (counts[groupId] !== undefined) return counts[groupId];
      if (seen.has(groupId)) return 0;

      const newSeen = new Set(seen);
      newSeen.add(groupId);

      // Count direct drugs in this group (both legacy and new array-based)
      let total = drugs.filter(d => (Array.isArray(d.groupIds) && d.groupIds.includes(groupId)) || d.groupId === groupId).length;

      // Add counts from all sub-groups
      const children = drugGroups.filter(g => g.parentId === groupId);
      children.forEach(child => {
        total += calculateCount(child.id, newSeen);
      });

      counts[groupId] = total;
      return total;
    };

    drugGroups.forEach(g => calculateCount(g.id));
    return counts;
  }, [drugs, drugGroups]);

  // Map each group to a set of all its descendant group IDs (including itself)
  const groupDescendantsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    const getDescendants = (id: string): Set<string> => {
      if (map[id]) return map[id];
      const descendants = new Set<string>([id]);
      drugGroups.filter(g => g.parentId === id).forEach(child => {
        getDescendants(child.id).forEach(dId => descendants.add(dId));
      });
      map[id] = descendants;
      return descendants;
    };

    drugGroups.forEach(g => getDescendants(g.id));
    return map;
  }, [drugGroups]);

  const uniqueIngredients = useMemo(() => {
    const ingredientsMap = new Map<string, { name: string, drugCount: number }>();
    drugs.forEach(drug => {
      (drug.activeIngredients || []).forEach(ing => {
        const name = (ing.name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        const existing = ingredientsMap.get(key);
        if (existing) {
          existing.drugCount++;
        } else {
          ingredientsMap.set(key, { name, drugCount: 1 });
        }
      });
    });
    return Array.from(ingredientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [drugs]);

  const filteredIngredients = useMemo(() => {
    return uniqueIngredients.filter(ing => ing.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [uniqueIngredients, searchTerm]);

  const totalIngredientPages = Math.ceil(filteredIngredients.length / INGREDIENTS_PER_PAGE);
  const paginatedIngredients = useMemo(() => {
    const start = (ingredientPage - 1) * INGREDIENTS_PER_PAGE;
    return filteredIngredients.slice(start, start + INGREDIENTS_PER_PAGE);
  }, [filteredIngredients, ingredientPage]);

  const selectedIngredientNames = useMemo(() => {
    if (!selectedIngredient) return new Set<string>();

    const searchName = selectedIngredient.toLowerCase();
    const baseIngredient = availableIngredients.find(ai =>
      ai.name.toLowerCase() === searchName ||
      (ai.alias && ai.alias.toLowerCase() === searchName) ||
      (ai.aliases && ai.aliases.some(a => a.toLowerCase() === searchName))
    );

    if (!baseIngredient) return new Set([searchName]);

    const names = new Set<string>();
    names.add(baseIngredient.name.toLowerCase());
    if (baseIngredient.alias) names.add(baseIngredient.alias.toLowerCase());
    if (baseIngredient.aliases) {
      baseIngredient.aliases.forEach(a => names.add(a.toLowerCase()));
    }
    return names;
  }, [selectedIngredient, availableIngredients]);

  const uniqueDosageForms = useMemo(() => {
    const forms = new Set<string>();
    drugs.forEach(d => {
      if (d.dosageForm) forms.add(d.dosageForm.trim());
    });
    return Array.from(forms).sort();
  }, [drugs]);

  const filteredDrugs = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();

    return drugs.filter(drug => {
      // Visibility logic
      // Only show closed drugs if in management mode AND have enough power points
      if (drug.isClosed && (!canManage || !canSeeClosedDrugs)) return false;

      // Status filter (only applicable in management mode, as general search hides hidden drugs anyway)
      if (canManage) {
        if (statusFilter === 'active' && (drug.isClosed || drug.status === 'suspended')) return false;
        if (statusFilter === 'hidden' && !drug.isClosed) return false;
        if (statusFilter === 'suspended' && drug.status !== 'suspended') return false;
      }

      let matchesSearch = false;
      if (searchMode === 'all') {
        matchesSearch = (drug.name || '').toLowerCase().includes(term) ||
          (drug.activeIngredients || []).some(ing =>
            String(ing.name || '').toLowerCase().includes(term) ||
            String(ing.amount || '').toLowerCase().includes(term) ||
            String(ing.unit || '').toLowerCase().includes(term)
          ) ||
          (drug.atcCode || '').toLowerCase().includes(term);
      } else if (searchMode === 'name') {
        matchesSearch = (drug.name || '').toLowerCase().includes(term);
      } else if (searchMode === 'ingredient') {
        matchesSearch = (drug.activeIngredients || []).some(ing =>
          String(ing.name || '').toLowerCase().includes(term)
        );
      }

      const matchesGroup = groupFilter === 'Tất cả' || (
        (drug.groupId && groupDescendantsMap[groupFilter]?.has(drug.groupId)) ||
        (drug.groupIds || []).some(id => groupDescendantsMap[groupFilter]?.has(id))
      );
      const matchesIngredient = selectedIngredientNames.size === 0 || (drug.activeIngredients || []).some(
        ing => selectedIngredientNames.has((ing.name || '').toLowerCase())
      );

      const matchesStock = stockFilter === 'all' ||
        (stockFilter === 'available' && (!drug.stockStatus || drug.stockStatus === 'available')) ||
        drug.stockStatus === stockFilter;

      const matchesDosageForm = dosageFormFilter === 'all' ||
        (drug.dosageForm && drug.dosageForm === dosageFormFilter);

      return matchesSearch && matchesGroup && matchesIngredient && matchesStock && matchesDosageForm;
    }).sort((a, b) => {
      // Sort "Hết hàng" (out of stock) to the bottom
      const aOut = a.stockStatus === 'out';
      const bOut = b.stockStatus === 'out';
      if (aOut && !bOut) return 1;
      if (!aOut && bOut) return -1;
      return 0;
    });
  }, [drugs, searchTerm, searchMode, groupFilter, groupDescendantsMap, selectedIngredientNames, canSeeClosedDrugs, canManage, statusFilter, stockFilter, dosageFormFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setIngredientPage(1);
  }, [groupFilter, searchMode, selectedIngredient, viewMode, itemsPerPage, stockFilter, dosageFormFilter]);

  // Handle searchTerm changes with page restoration
  useEffect(() => {
    const isSearching = (searchTerm || '').trim() !== '';

    if (isSearching) {
      if (!wasSearchingRef.current) {
        // Save current page before starting search
        pageBeforeSearchRef.current = currentPage;
      }
      setCurrentPage(1);
      setIngredientPage(1);
    } else if (wasSearchingRef.current) {
      // Restore previous page when search is cleared
      setCurrentPage(pageBeforeSearchRef.current);
    }

    wasSearchingRef.current = isSearching;
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredDrugs.length / itemsPerPage);

  // Safety: Cap currentPage within totalPages range when results change
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedDrugs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDrugs.slice(start, start + itemsPerPage);
  }, [filteredDrugs, currentPage, itemsPerPage]);

  const filteredExcipients = useMemo(() => {
    if (!excipientFormSearch) return [];
    const term = excipientFormSearch.toLowerCase();
    return availableExcipients.filter(e =>
      e.name.toLowerCase().includes(term) ||
      (e.alias && e.alias.toLowerCase().includes(term)) ||
      (e.aliases && e.aliases.some((a: string) => a.toLowerCase().includes(term)))
    ).slice(0, 10);
  }, [availableExcipients, excipientFormSearch]);

  const handleOpenModal = (drug?: Drug) => {
    setSelectedFile(null);
    setFormGroupSearch('');
    setExcipientFormSearch('');
    setActiveTab('company');
    if (drug) {
      setEditingDrug(drug);
      const groupIds = drug.groupIds || (drug.groupId ? [drug.groupId] : []);
      const initialData = {
        ...drug,
        groupIds,
        groupId: drug.groupId || '',
        avatarUrl: drug.avatarUrl || '',
        pdfUrl: drug.pdfUrl || '',
        administrationRoute: drug.administrationRoute || '',
        isRx: !!drug.isRx,
        stockStatus: drug.stockStatus || 'available',
        expiryStatus: drug.expiryStatus || 'valid',
        activeIngredients: (drug.activeIngredients || []).map((ing: any) => {
          if ('strength' in ing && !ing.amount && !ing.unit) {
            const match = String(ing.strength).match(/^([\d.,]+)\s*(.*)$/);
            return {
              name: ing.name,
              amount: match ? match[1] : ing.strength,
              unit: match ? match[2] : ''
            };
          }
          return {
            name: ing.name,
            amount: ing.amount || '',
            unit: ing.unit || ''
          };
        }),
        generalAdministration: drug.generalAdministration || '',
        atcCode: drug.atcCode || '',
        excipients: drug.excipients || '',
        indications: (drug.indications || []).map((i: any) => ({
          ...i,
          icd10s: i.icd10s || (i.icd10 ? [i.icd10] : []),
          defaultIcd10s: i.defaultIcd10s || (i.defaultIcd10 ? [i.defaultIcd10] : [])
        })),
        contraindications: (drug.contraindications || []).map((c: any) =>
          typeof c === 'string' ? { content: c, type: 'Other' } : c
        ),
        sideEffects: (drug.sideEffects || []).map((se: any) =>
          typeof se === 'string' ? { frequency: 'Chung', content: se } : se
        ),
        dosageAndAdministration: drug.dosageAndAdministration || [],
        precautions: drug.precautions || '',
        pregnancy: drug.pregnancy || '',
        lactation: drug.lactation || '',
        driving: drug.driving || '',
        interactions: drug.interactions || '',
        pharmacodynamics: Array.isArray(drug.pharmacodynamics) ? drug.pharmacodynamics : (drug.pharmacodynamics ? [{ category: 'Chung', content: drug.pharmacodynamics }] : []),
        pharmacokinetics: Array.isArray(drug.pharmacokinetics) ? drug.pharmacokinetics : (drug.pharmacokinetics ? [{ category: 'Chung', content: drug.pharmacokinetics }] : []),
        specificInteractions: drug.specificInteractions || [],
        overdose: drug.overdose || ''
      };
      setFormData(initialData);
      setSideEffectsText(Array.isArray(initialData.sideEffects) ? initialData.sideEffects.map((se: any) => typeof se === 'string' ? se : se.content).join(', ') : '');
    } else {
      setEditingDrug(null);
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        activeIngredients: [],
        atcCode: '',
        dosageForm: '',
        excipients: '',
        manufacturer: '',
        mechanismOfAction: '',
        indications: [{ content: '', icd10s: [], defaultIcd10s: [] }],
        contraindications: [{ content: '', type: 'Other' }],
        sideEffects: [],
        groupId: '',
        groupIds: [],
        avatarUrl: '',
        pdfUrl: '',
        administrationRoute: '',
        isClosed: false,
        isRx: false,
        generalAdministration: '',
        dosageAndAdministration: [],
        precautions: '',
        pregnancy: '',
        lactation: '',
        driving: '',
        interactions: '',
        pharmacodynamics: [],
        pharmacokinetics: [],
        overdose: ''
      });
      setContraindicationsText('');
      setSideEffectsText('');
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for Storage
        alert("File PDF quá lớn (tối đa 10MB).");
        return;
      }
      setSelectedFile(file);
      // Use functional update to ensure we don't lose other form data changes
      const blobUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, pdfUrl: blobUrl }));

      // If we were waiting for a file to extract, trigger it
      if (autoExtractRef.current) {
        autoExtractRef.current = false;
        // Small delay to ensure state and file are ready
        setTimeout(() => {
          handleAIExtract(file);
        }, 100);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, pdfUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    autoExtractRef.current = false;
  };

  const autoExtractRef = useRef(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Vui lòng nhập tên thuốc.");
      return;
    }
    if ((formData.activeIngredients || []).length === 0) {
      alert("Vui lòng thêm ít nhất một hoạt chất.");
      return;
    }

    // handleRemoveFile(); // Removed automatic cleanup to preserve existing PDFs

    setUploading(true);
    setUploadProgress(0);
    try {
      let finalPdfUrl = formData.pdfUrl; // Preserve existing PDF URL

      // If a new file was selected, upload it to Firebase Storage
      if (selectedFile) {
        try {
          console.log("Starting upload to Storage...", selectedFile.name);
          const storageRef = ref(storage, `drug-pdfs/${formData.id}_${selectedFile.name}`);

          // Use uploadBytes instead of uploadBytesResumable for a cleaner promise
          await uploadBytes(storageRef, selectedFile);

          // Get the download URL
          finalPdfUrl = await getDownloadURL(storageRef);
          console.log("Upload complete. URL:", finalPdfUrl);
        } catch (uploadErr) {
          console.error("Error uploading file to Storage:", uploadErr);
          if (finalPdfUrl && typeof finalPdfUrl === 'string' && finalPdfUrl.startsWith('blob:')) {
            finalPdfUrl = '';
          }
        }
      }

      console.log("Preparing drug data for save...");
      // Parse comma-separated strings into arrays
      const parseList = (text: any) => {
        if (typeof text !== 'string') return [];
        return text.split(',').map(s => s.trim()).filter(s => s !== '');
      };

      const drugData: any = {
        ...formData,
        pdfUrl: finalPdfUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserName || 'Hệ thống',
        createdAt: editingDrug ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString(),
        indications: (formData.indications || []).filter(i => i && typeof i.content === 'string' && i.content.trim() !== ''),
        contraindications: (formData.contraindications || []).filter(c => c && typeof c.content === 'string' && c.content.trim() !== ''),
        sideEffects: Array.isArray(formData.sideEffects)
          ? formData.sideEffects.filter((se: any) => {
            if (typeof se === 'string') return se.trim() !== '';
            return se && se.content && se.content.trim() !== '';
          })
          : parseList(sideEffectsText)
      };

      // Ensure no top-level 'category' field is sent to Firestore
      if ('category' in drugData) {
        delete drugData.category;
      }

      const extractIcdCodes = (indications: any[] = []) => {
        return Array.from(new Set(
          indications
            .flatMap(ind => ind?.icd10s || [])
            .map((code: string) => (code || '').trim())
            .filter((code: string) => !!code)
        ));
      };

      try {
        console.log("Saving drug document to Firestore...");
        const drugRef = doc(db, 'drugs', formData.id);
        // setDoc imported from ../firebase already calls sanitizeData
        await setDoc(drugRef, drugData);
        console.log("Drug document saved successfully.");

        // SYNC INTERACTIONS TO MANUAL_INTERACTIONS LIST
        try {
          console.log("Syncing interactions...");
          const batch = writeBatch(db);
          const syncItems: any[] = [];

          (drugData.specificInteractions || []).forEach((si: any) => {
            if (!si.target || !si.content) return;
            const targetDrugName = (si.target || '').toLowerCase().trim();
            const targetDrug = drugs.find(d => (d.name || '').toLowerCase().trim() === targetDrugName);
            if (targetDrug) {
              syncItems.push({
                type: 'Thuốc - Thuốc',
                sourceIds: [formData.id, targetDrug.id].sort(),
                sourceNames: [formData.name, targetDrug.name].sort(),
                description: si.content,
                severity: 'medium'
              });
            }
          });

          (drugData.contraindications || []).forEach((c: any) => {
            if (c.type === 'Drug' && c.content) {
              const targetContent = (c.content || '').toLowerCase().trim();
              const targetDrug = drugs.find(d => {
                const drugName = (d.name || '').toLowerCase().trim();
                return drugName === targetContent || targetContent.includes(drugName);
              });
              if (targetDrug) {
                syncItems.push({
                  type: 'Thuốc - Thuốc',
                  sourceIds: [formData.id, targetDrug.id].sort(),
                  sourceNames: [formData.name, targetDrug.name].sort(),
                  description: `Chống chỉ định: ${c.content}`,
                  severity: 'high'
                });
              }
            } else if (c.type === 'ICD-10' && c.content) {
              syncItems.push({
                type: 'Thuốc - ICD-10',
                sourceIds: [formData.id],
                sourceNames: [formData.name],
                targetName: c.content,
                description: `Chống chỉ định cho bệnh lý: ${c.content}`,
                severity: 'high'
              });
            }
          });

          const syncIdsToKeep = new Set<string>();
          syncItems.forEach(item => {
            let syncId = '';
            if (item.type === 'Thuốc - Thuốc') {
              syncId = `INT-AUTO-${item.sourceIds[0]}-${item.sourceIds[1]}`;
            } else {
              const safeContent = (item.targetName || '').toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, '-')
                .substring(0, 50);
              syncId = `INT-AUTO-${formData.id}-${safeContent}`;
            }
            syncIdsToKeep.add(syncId);

            const interactionData: ManualInteraction = {
              id: syncId,
              type: item.type,
              sourceIds: item.sourceIds,
              sourceNames: item.sourceNames,
              targetName: item.targetName || '',
              severity: item.severity,
              description: item.description,
              recommendation: 'Tham khảo hướng dẫn chuyên môn và theo dõi sát bệnh nhân.',
              updatedAt: new Date().toISOString(),
              updatedBy: currentUserName || ''
            };
            batch.set(doc(db, 'manual_interactions', syncId), interactionData);
          });

          // Cleanup stale interactions involve this drug but aren't in current list
          try {
            console.log("Cleaning up stale interactions...");
            const q = query(collection(db, 'manual_interactions'), where('sourceIds', 'array-contains', formData.id));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(docSnap => {
              if (docSnap.id.startsWith('INT-AUTO-') && !syncIdsToKeep.has(docSnap.id)) {
                batch.delete(docSnap.ref);
              }
            });
          } catch (cleanupError) {
            console.warn("Error during interaction cleanup:", cleanupError);
          }

          console.log("Committing batch updates...");
          await batch.commit();
          console.log("Batch commit complete.");
        } catch (syncError) {
          console.error("Error syncing interactions:", syncError);
        }

        setIsModalOpen(false);
        setSelectedFile(null); // Clear selected file after successful save
      } catch (firestoreError) {
        console.error("Firestore save error:", firestoreError);
        handleFirestoreError(firestoreError, OperationType.WRITE, `drugs/${formData.id}`);
      }
    } catch (error: any) {
      console.error("Error saving drug detail:", error);
      let errorMessage = "Lỗi khi lưu thông tin hoặc tải file.";

      if (error.code === 'storage/unauthorized') {
        errorMessage = "Lỗi: Không có quyền truy cập Storage. Vui lòng kiểm tra lại cấu hình Firebase Storage Rules.";
      } else if (error.code === 'storage/canceled') {
        errorMessage = "Tải lên đã bị hủy.";
      } else if (error.message) {
        // Check if it's a JSON string from handleFirestoreError
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) {
            errorMessage += " Chi tiết: " + parsed.error;
          } else {
            errorMessage += " Chi tiết: " + error.message;
          }
        } catch {
          errorMessage += " Chi tiết: " + error.message;
        }
      }

      alert(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const moveArrayItem = (fieldName: keyof Drug, index: number, direction: 'up' | 'down') => {
    const list = formData[fieldName];
    if (!Array.isArray(list)) return;

    const newList = [...list];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;

    [newList[index], newList[targetIdx]] = [newList[targetIdx], newList[index]];
    setFormData(prev => ({ ...prev, [fieldName]: newList }));
  };

  const handleAIExtract = async (fileToUse?: File) => {
    const targetFile = fileToUse || selectedFile;

    if (!targetFile) {
      autoExtractRef.current = true;
      fileInputRef.current?.click();
      return;
    }

    setExtracting(true);
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(targetFile);
      });

      const { generateGeminiContent } = await import('../lib/gemini');
      const text = await generateGeminiContent(
        "gemini-3-flash-preview",
        [
          {
            parts: [
              { text: "Bạn là một chuyên gia trích xuất dữ liệu y tế chuyên sâu. Trình bày thông tin thuốc từ tệp PDF đính kèm. QUY TẮC BẮT BUỘC:\n1. CHỉ trả về JSON thô.\n2. PHÂN LOẠI CHI TIẾT: Tách biệt rõ ràng Chỉ định, Chống chỉ định (thuốc/bệnh lý/khác), Tác dụng phụ, Dược lực học, Dược động học.\n3. TRÍCH XUẤT ICD-10: Cố gắng suy luận mã ICD-10 cho các chỉ định (ví dụ: 'Tăng huyết áp' -> 'I10').\n4. Tóm tắt súc tích nhưng không mất ý y khoa. Đảm bảo các đơn vị đo lường (mg, ml, %) chính xác.\n\nCấu trúc:\n- name, atcCode, manufacturers, dosageForm, administrationRoute, drugGroup, isRx (boolean), mechanismOfAction\n- activeIngredients: [{name, amount, unit}]\n- indications: [{content, icd10s: string[]}]\n- contraindications: [{content, type: 'Drug'|'ICD-10'|'Age'|'Weight'|'Other'}]\n- sideEffects: string[]\n- pharmacodynamics/pharmacokinetics: [{category, content}]\n- specificInteractions: [{target, content}]\n- pregnancy/lactation/driving: string\n- overdose: string" },
              { inlineData: { data: base64Data, mimeType: "application/pdf" } }
            ]
          }
        ],
        {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        }
      );

      // Basic JSON cleanup if needed
      const cleanJson = (str: string) => {
        let cleaned = str.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '');
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '');
        if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '');
        cleaned = cleaned.trim();

        try {
          return JSON.parse(cleaned);
        } catch (e) {
          console.warn("Initial JSON parse failed, attempting stack-based repair...", e);

          let fixed = cleaned;
          const stack: string[] = [];
          let inString = false;
          let escaped = false;

          for (let i = 0; i < fixed.length; i++) {
            const char = fixed[i];
            if (escaped) {
              escaped = false;
              continue;
            }
            if (char === '\\') {
              escaped = true;
              continue;
            }
            if (char === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (char === '{') stack.push('}');
              else if (char === '[') stack.push(']');
              else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                  stack.pop();
                }
              }
            }
          }

          if (inString) fixed += '"';
          while (stack.length > 0) {
            fixed += stack.pop();
          }

          try {
            return JSON.parse(fixed);
          } catch (inner) {
            console.warn("Stack-based repair failed, attempting last-resort cutoff repair...");
            const lastBrace = cleaned.lastIndexOf('}');
            const lastBracket = cleaned.lastIndexOf(']');
            const cutoff = Math.max(lastBrace, lastBracket);
            if (cutoff > 0) {
              try {
                return JSON.parse(cleaned.substring(0, cutoff + 1));
              } catch (final) {
                throw e;
              }
            }
            throw e;
          }
        }
      };

      try {
        const result = cleanJson(text);
        setExtractedData(result);
        setIsReviewModalOpen(true);
      } catch (parseError) {
        console.error("JSON Parse failed after all attempts:", parseError, "Text preview:", text.substring(0, 1000) + "...");
        alert("Dữ liệu từ AI bị lỗi định dạng. Vui lòng thử lại với file PDF khác hoặc tóm tắt hơn.");
      }
    } catch (error) {
      console.error("AI Extraction failed:", error);
      alert("Không thể trích xuất thông tin. Vui lòng kiểm tra file PDF hoặc thử lại.");
    } finally {
      setExtracting(false);
    }
  };

  const applyExtractedData = () => {
    if (extractedData) {
      // Find matching drug groups if drugGroup name was extracted
      let matchedGroupIds: string[] = Array.isArray(formData.groupIds) ? [...formData.groupIds] : [];

      const extractedGroupNameRaw = extractedData.drugGroup || extractedData.group;
      if (extractedGroupNameRaw && drugGroups.length > 0) {
        const extractedGroupNames = Array.isArray(extractedGroupNameRaw)
          ? extractedGroupNameRaw.map(name => String(name).toLowerCase())
          : [String(extractedGroupNameRaw).toLowerCase()];

        extractedGroupNames.forEach(nameToMatch => {
          const matched = drugGroups.find(g =>
            g.name.toLowerCase().includes(nameToMatch) ||
            nameToMatch.includes(g.name.toLowerCase())
          );
          if (matched && !matchedGroupIds.includes(matched.id)) {
            matchedGroupIds.push(matched.id);
          }
        });
      }

      const { drugGroup, group, manufacturers, ...restExtracted } = extractedData;

      // Clinical list parsers
      const ensureStringArray = (val: any): string[] => {
        if (Array.isArray(val)) return val.map(v => String(v));
        if (typeof val === 'string') return val.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        return [];
      };

      const ensureFormattedList = (val: any): { category: string; content: string }[] => {
        if (Array.isArray(val)) {
          return val.map(item => {
            if (typeof item === 'string') return { category: 'Chung', content: item };
            return { category: item.category || 'Chung', content: item.content || String(item) || '' };
          });
        }
        if (typeof val === 'string' && val.trim()) return [{ category: 'Chung', content: val }];
        return [];
      };

      // Helper to handle complex objects from AI for simple string fields
      const ensureString = (val: any, fallback: string = ''): string => {
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) return val.join(', ');
        if (val && typeof val === 'object') return JSON.stringify(val);
        return fallback;
      };

      const updatedData = {
        ...formData,
        ...restExtracted,
        groupIds: matchedGroupIds,
        administrationRoute: ensureString(restExtracted.administrationRoute, formData.administrationRoute),
        activeIngredients: Array.isArray(restExtracted.activeIngredients) ? restExtracted.activeIngredients : formData.activeIngredients,
        atcCode: ensureString(restExtracted.atcCode, formData.atcCode),
        excipients: ensureString(restExtracted.excipients, formData.excipients),
        indications: (Array.isArray(restExtracted.indications) ? restExtracted.indications : (formData.indications || [])).map((ind: any) =>
          typeof ind === 'string' ? { content: ind, icd10s: [] } : { ...ind, icd10s: ind.icd10s || (ind.icd10 ? [ind.icd10] : []) }
        ),
        contraindications: (Array.isArray(restExtracted.contraindications) ? restExtracted.contraindications : (formData.contraindications || [])).map((c: any) =>
          typeof c === 'string' ? { content: c, type: 'Other' } : { ...c, type: c.type || 'Other' }
        ),
        sideEffects: ensureStringArray(restExtracted.sideEffects).length > 0 ? ensureStringArray(restExtracted.sideEffects) : formData.sideEffects,
        generalAdministration: ensureString(restExtracted.generalAdministration, formData.generalAdministration),
        dosageAndAdministration: Array.isArray(restExtracted.dosageAndAdministration)
          ? restExtracted.dosageAndAdministration.map((item: any) =>
            typeof item === 'string' ? { title: 'Liều dùng', content: item } : { title: item.title || 'Liều dùng', content: item.content || '' }
          )
          : (typeof restExtracted.dosageAndAdministration === 'string' ? [{ title: 'Liều dùng', content: restExtracted.dosageAndAdministration }] : formData.dosageAndAdministration),
        precautions: ensureString(restExtracted.precautions, formData.precautions),
        driving: ensureString(restExtracted.driving, formData.driving),
        pregnancy: ensureString(restExtracted.pregnancy, formData.pregnancy),
        lactation: ensureString(restExtracted.lactation, formData.lactation),
        pharmacodynamics: ensureFormattedList(restExtracted.pharmacodynamics || formData.pharmacodynamics),
        pharmacokinetics: ensureFormattedList(restExtracted.pharmacokinetics || formData.pharmacokinetics),
        interactions: ensureString(restExtracted.interactions, formData.interactions),
        specificInteractions: Array.isArray(restExtracted.specificInteractions) ? restExtracted.specificInteractions : formData.specificInteractions,
        overdose: ensureString(restExtracted.overdose, formData.overdose),
        manufacturer: ensureString(restExtracted.manufacturer || manufacturers, formData.manufacturer),
        dosageForm: ensureString(restExtracted.dosageForm, formData.dosageForm),
        isRx: typeof restExtracted.isRx === 'boolean' ? restExtracted.isRx : formData.isRx,
        mechanismOfAction: ensureString(restExtracted.mechanismOfAction, formData.mechanismOfAction),
      };
      setFormData(updatedData);

      // Update helper text states if they exist
      if (typeof setContraindicationsText === 'function') {
        const cText = (updatedData.contraindications || [])
          .map((c: any) => typeof c === 'string' ? c : c.content)
          .join(', ');
        setContraindicationsText(cText);
      }

      if (typeof setSideEffectsText === 'function') {
        const seText = (updatedData.sideEffects || [])
          .map((se: any) => typeof se === 'string' ? se : se.content)
          .join(', ');
        setSideEffectsText(seText);
      }

      setIsReviewModalOpen(false);
      setExtractedData(null);
    }
  };

  const handleToggleClosed = async (drug: any) => {
    try {
      const drugRef = doc(db, 'drugs', drug.id);
      const updateData = { ...drug, isClosed: !drug.isClosed };
      if ('category' in updateData) delete updateData.category;
      await setDoc(drugRef, updateData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drugs/${drug.id}`);
    }
  };

  const handleToggleSuspended = async (drug: any) => {
    try {
      const drugRef = doc(db, 'drugs', drug.id);
      const newStatus = drug.status === 'suspended' ? 'active' : 'suspended';
      const updateData = { ...drug, status: newStatus };
      if ('category' in updateData) delete updateData.category;
      await setDoc(drugRef, updateData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drugs/${drug.id}`);
    }
  };

  const handleDelete = (id: string, name: string, pdfUrl?: string) => {
    setConfirmData({ id, name, pdfUrl });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmData) return;
    const { id, name, pdfUrl } = confirmData;
    try {
      // Delete PDF from storage if it exists and is a Firebase Storage URL
      if (pdfUrl && pdfUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const storageRef = ref(storage, pdfUrl);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn("Could not delete file from storage:", storageError);
        }
      }

      try {
        await deleteDoc(doc(db, 'drugs', id));

        // SYNC DELETE: Remove all manual interactions linked to this drug
        try {
          const batch = writeBatch(db);
          const q = query(collection(db, 'manual_interactions'));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach(docSnap => {
            const data = docSnap.data() as ManualInteraction;
            if (docSnap.id.startsWith('INT-AUTO-') && (data.sourceIds || []).includes(id)) {
              batch.delete(docSnap.ref);
            }
          });
          await batch.commit();
        } catch (syncError) {
          console.warn("Could not cleanup interactions after drug deletion:", syncError);
        }

        if (selectedDrug?.id === id) setSelectedDrug(null);
      } catch (firestoreError) {
        handleFirestoreError(firestoreError, OperationType.DELETE, `drugs/${id}`);
      }
    } catch (error: any) {
      console.error("Error deleting drug:", error);
      let msg = "Lỗi khi xóa thuốc.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) msg += " Chi tiết: " + parsed.error;
      } catch {
        if (error.message) msg += " Chi tiết: " + error.message;
      }
      setErrorMessage(msg);
      // Re-throw to prevent ConfirmModal from closing if we want it to stay open on error
      // Actually, ConfirmModal now catches it and console.errors it.
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const modes = [
    { id: 'drugs', label: featureSettings?.customTitle || "Tra cứu thuốc", icon: <Pill size={16} /> },
    { id: 'groups', label: "Danh mục nhóm", icon: <FolderTree size={16} /> },
    { id: 'ingredients', label: "Tra cứu hoạt chất", icon: <Activity size={16} /> },
    ...(canManage ? [
      { id: 'excipients', label: "Tá dược", icon: <Database size={16} /> },
      { id: 'companies', label: "Công ty", icon: <Briefcase size={16} /> }
    ] : [])
  ];

  const viewModeToggle = (
    <div className={cn(
      "flex p-1 rounded-2xl gap-1 border w-full lg:w-auto",
      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm"
    )}>
      {modes.map((mode) => {
        const isActive = viewMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => setViewMode(mode.id as any)}
            className={cn(
              "relative flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all transition-colors active:scale-95 whitespace-nowrap overflow-hidden",
              isActive
                ? (isDarkMode ? "text-blue-400" : "text-blue-600")
                : (isDarkMode ? "text-slate-500 hover:text-slate-400" : "text-slate-400 hover:text-slate-600")
            )}
          >
            {isActive && (
              <div
                className={cn(
                  "absolute inset-0 z-0 rounded-xl",
                  isDarkMode ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-100"
                )}
              />
            )}
            <span className="relative z-10 shrink-0">
              {isMobile && isActive && ['drugs', 'groups', 'ingredients'].includes(mode.id) ? (
                <span className="text-[11px] font-black tracking-tighter">
                  {mode.id === 'drugs' ? 'Biệt dược' : mode.id === 'groups' ? 'Nhóm thuốc' : 'Hoạt chất'}
                </span>
              ) : mode.icon}
            </span>
            <span className="relative z-10 hidden sm:inline-block">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={cn(
      "p-0 sm:p-1.5 lg:px-8 lg:pb-8 lg:pt-8 max-w-full mx-auto min-h-screen transition-colors text-slate-900 dark:text-slate-200",
      isDarkMode ? "lg:bg-slate-950/30" : "lg:bg-slate-50/50"
    )}>
      {/* Mobile Subheader Portal - live lookup prevents stale node references */}
      {(() => {
        const portalNode = getPortalNode();
        return portalNode ? createPortal(
          <div className="flex items-center justify-end w-full">
            {viewModeToggle}
          </div>,
          portalNode
        ) : null;
      })()}


      <div className="mb-2 lg:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6">
        <div className="hidden lg:block">
          <div className={cn(
            "inline-flex items-center gap-4 px-6 py-3 rounded-[32px] border-2 transition-all",
            isDarkMode
              ? "bg-blue-500/5 border-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/5"
              : "bg-blue-50 border-blue-100 text-blue-600 shadow-xl shadow-blue-500/10"
          )}>
            <div className="p-2 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
              <Pill size={32} />
            </div>
            <span className="text-[35px] font-black tracking-tighter uppercase">
              {featureSettings?.customTitle || (canManage ? "Quản lý danh mục thuốc" : "Tra cứu thuốc")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden lg:block">
            {viewModeToggle}
          </div>
        </div>
      </div>

      {viewMode !== 'groups' && viewMode !== 'excipients' && viewMode !== 'companies' && (viewMode !== 'ingredients' || ingredientView === 'search') && (
        <div
          ref={mainSearchRef}
          className={cn(
            "mb-3 p-1.5 lg:p-3 rounded-2xl lg:rounded-[32px] border transition-all shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          )}
        >
          <div className="relative flex-1 flex items-center group">
            <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder={searchMode === 'all' ? "Tìm tên thuốc, hoạt chất, mã ATC..." : searchMode === 'name' ? "Tìm theo tên thuốc..." : "Tìm theo hoạt chất..."}
              className={cn(
                "w-full pl-10 pr-28 lg:pl-12 lg:pr-32 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl focus:ring-0 transition-all text-xs lg:text-sm font-bold",
                isDarkMode ? "bg-slate-800/50 text-white placeholder:text-slate-600" : "bg-slate-50 text-slate-900 placeholder:text-slate-400"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-1.5 lg:right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              )}
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as any)}
                className={cn(
                  "text-[9px] lg:text-[10px] font-black uppercase tracking-widest py-1 lg:py-1.5 px-2 lg:px-3 rounded-lg lg:rounded-xl border-none focus:ring-0 cursor-pointer transition-all",
                  isDarkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm"
                )}
              >
                <option value="all">Tất cả</option>
                <option value="name">Tên</option>
                <option value="ingredient">Hoạt chất</option>
              </select>
            </div>
          </div>

          <div className={cn(
            "h-6 lg:h-8 w-px hidden lg:block transition-colors",
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          )}></div>

          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'drugs' && (
              <>
                {canManage && (
                  <div className="relative group">
                    <Filter className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                    <select
                      className={cn(
                        "w-full sm:w-40 pl-9 lg:pl-11 pr-8 lg:pr-10 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl appearance-none focus:ring-0 cursor-pointer text-xs lg:text-sm font-bold transition-all",
                        isDarkMode ? "bg-slate-800/50 text-slate-300" : "bg-slate-50 text-slate-600"
                      )}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="suspended">Tạm ngưng</option>
                      <option value="hidden">Đang ẩn</option>
                    </select>
                    <ChevronRight className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={14} />
                  </div>
                )}

                <div className="relative flex-1 sm:flex-none group" ref={groupFilterRef}>
                  <div
                    onClick={() => {
                      setIsGroupFilterOpen(!isGroupFilterOpen);
                      if (!isGroupFilterOpen) {
                        setGroupFilterSearch('');
                        // Scroll to element on mobile to avoid keyboard covering
                        if (window.innerWidth < 768) {
                          setTimeout(() => {
                            groupFilterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 300);
                        }
                      }
                    }}
                    className={cn(
                      "w-auto min-w-[160px] sm:min-w-[200px] pl-9 lg:pl-11 pr-8 lg:pr-10 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl flex items-center cursor-pointer transition-all h-full min-h-[40px] lg:min-h-[56px]",
                      groupFilter !== 'Tất cả'
                        ? (isDarkMode ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-blue-50 text-blue-600 ring-1 ring-blue-200")
                        : (isDarkMode ? "bg-slate-800/50 text-slate-300" : "bg-slate-50 text-slate-600")
                    )}
                  >
                    <Folder className={cn("absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 transition-colors", isGroupFilterOpen ? "text-blue-500" : "text-slate-400")} size={14} />
                    <span className="text-xs lg:text-sm font-bold truncate">
                      {groupFilter === 'Tất cả' ? 'Tất cả nhóm thuốc' : (drugGroups.find(g => g.id === groupFilter)?.name || 'Tất cả nhóm thuốc')}
                    </span>
                    <ChevronRight className={cn("absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform", isGroupFilterOpen ? "-rotate-90" : "rotate-90")} size={14} />
                  </div>

                  <AnimatePresence>
                    {isGroupFilterOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className={cn(
                          "absolute top-full left-0 mt-2 z-50 rounded-2xl shadow-2xl border overflow-hidden min-w-[280px] sm:min-w-[400px]",
                          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                        )}
                      >
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Tìm nhóm thuốc..."
                              className={cn(
                                "w-full pl-9 pr-10 py-2 bg-transparent border-none focus:ring-0 text-xs font-bold",
                                isDarkMode ? "text-white" : "text-slate-900"
                              )}
                              value={groupFilterSearch}
                              onChange={(e) => setGroupFilterSearch(e.target.value)}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setGroupFilterSearch('');
                                setIsGroupFilterOpen(false);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-rose-500"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-hide py-1">
                          <button
                            onClick={() => {
                              setGroupFilter('Tất cả');
                              setIsGroupFilterOpen(false);
                              setGroupFilterSearch('');
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap overflow-hidden text-ellipsis",
                              groupFilter === 'Tất cả'
                                ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600")
                                : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600")
                            )}
                          >
                            Tất cả nhóm thuốc
                          </button>
                          {sortedDrugGroups
                            .filter(g => !groupFilterSearch || g.name.toLowerCase().includes(groupFilterSearch.toLowerCase()))
                            .map(group => (
                              <button
                                key={group.id}
                                onClick={() => {
                                  setGroupFilter(group.id);
                                  setIsGroupFilterOpen(false);
                                  setGroupFilterSearch('');
                                }}
                                title={group.name}
                                className={cn(
                                  "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center whitespace-nowrap",
                                  groupFilter === group.id
                                    ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600")
                                    : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600")
                                )}
                              >
                                {!groupFilterSearch && <span className="flex-shrink-0">{'\u00A0'.repeat(group.level * 3)}</span>}
                                {!groupFilterSearch && group.level > 0 && <span className="text-slate-400 mr-1 flex-shrink-0">└─ </span>}
                                <span className="truncate">{group.name}</span>
                              </button>
                            ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative flex-1 sm:flex-none min-w-[140px] group" ref={dosageFormFilterRef}>
                  <div
                    onClick={() => {
                      setIsDosageFormFilterOpen(!isDosageFormFilterOpen);
                      if (!isDosageFormFilterOpen) {
                        setDosageFormFilterSearch('');
                        if (window.innerWidth < 768) {
                          setTimeout(() => {
                            dosageFormFilterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 300);
                        }
                      }
                    }}
                    className={cn(
                      "w-auto min-w-[160px] pl-9 lg:pl-11 pr-8 lg:pr-10 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl flex items-center cursor-pointer transition-all h-full min-h-[40px] lg:min-h-[56px]",
                      dosageFormFilter !== 'all'
                        ? (isDarkMode ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-blue-50 text-blue-600 ring-1 ring-blue-200")
                        : (isDarkMode ? "bg-slate-800/50 text-slate-300" : "bg-slate-50 text-slate-600")
                    )}
                  >
                    <Pill className={cn("absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 transition-colors", isDosageFormFilterOpen ? "text-blue-500" : "text-slate-400")} size={14} />
                    <span className="text-xs lg:text-sm font-bold truncate">
                      {dosageFormFilter === 'all' ? 'Tất cả bào chế' : dosageFormFilter}
                    </span>
                    <ChevronRight className={cn("absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform", isDosageFormFilterOpen ? "-rotate-90" : "rotate-90")} size={14} />
                  </div>

                  <AnimatePresence>
                    {isDosageFormFilterOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className={cn(
                          "absolute top-full left-0 mt-2 z-50 rounded-2xl shadow-2xl border overflow-hidden min-w-[220px] sm:min-w-[300px]",
                          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                        )}
                      >
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Tìm dạng bào chế..."
                              className={cn(
                                "w-full pl-9 pr-10 py-2 bg-transparent border-none focus:ring-0 text-xs font-bold",
                                isDarkMode ? "text-white" : "text-slate-900"
                              )}
                              value={dosageFormFilterSearch}
                              onChange={(e) => setDosageFormFilterSearch(e.target.value)}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDosageFormFilterSearch('');
                                setIsDosageFormFilterOpen(false);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-rose-500"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto scrollbar-hide py-1">
                          <button
                            onClick={() => {
                              setDosageFormFilter('all');
                              setIsDosageFormFilterOpen(false);
                              setDosageFormFilterSearch('');
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap",
                              dosageFormFilter === 'all'
                                ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600")
                                : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600")
                            )}
                          >
                            Tất cả bào chế
                          </button>
                          {uniqueDosageForms
                            .filter(form => !dosageFormFilterSearch || form.toLowerCase().includes(dosageFormFilterSearch.toLowerCase()))
                            .map(form => (
                              <button
                                key={form}
                                onClick={() => {
                                  setDosageFormFilter(form);
                                  setIsDosageFormFilterOpen(false);
                                  setDosageFormFilterSearch('');
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap overflow-hidden text-ellipsis",
                                  dosageFormFilter === form
                                    ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600")
                                    : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600")
                                )}
                              >
                                {form}
                              </button>
                            ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {canSeeStatusColumn && (
                  <div className="relative flex-1 sm:flex-none min-w-[140px] group">
                    <Database className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                    <select
                      className={cn(
                        "w-full pl-9 lg:pl-11 pr-8 lg:pr-10 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl appearance-none focus:ring-0 cursor-pointer text-xs lg:text-sm font-bold transition-all",
                        stockFilter !== 'all'
                          ? (isDarkMode ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-blue-50 text-blue-600 ring-1 ring-blue-200")
                          : (isDarkMode ? "bg-slate-800/50 text-slate-300" : "bg-slate-50 text-slate-600")
                      )}
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                    >
                      <option value="all">Tất cả tình trạng</option>
                      <option value="available">Còn hàng</option>
                      <option value="low">Sắp hết</option>
                      <option value="out">Hết hàng</option>
                    </select>
                    <ChevronRight className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={14} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {viewMode === 'excipients' ? (
        <div className="space-y-4 lg:space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-start gap-2 lg:gap-6">
            <div className={cn(
              "flex items-center gap-1 p-1 rounded-2xl w-full lg:w-auto",
              isDarkMode ? "bg-slate-800/80" : "bg-slate-100"
            )}>
              <button
                type="button"
                onClick={() => setExcipientView('excipients')}
                className={cn(
                  "flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                  excipientView === 'excipients'
                    ? (isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-600 shadow-sm")
                    : "text-slate-500 hover:text-slate-400"
                )}
              >
                <Database size={14} /> Danh sách tá dược
              </button>
              <button
                type="button"
                onClick={() => setExcipientView('categories')}
                className={cn(
                  "flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                  excipientView === 'categories'
                    ? (isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-600 shadow-sm")
                    : "text-slate-500 hover:text-slate-400"
                )}
              >
                <FolderTree size={14} /> Danh mục phân loại
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
            <CatalogManagement
              type={excipientView === 'excipients' ? 'excipient' : 'excipient_category'}
              isDarkMode={isDarkMode}
              onClose={() => setViewMode('drugs')}
              inline={true}
              externalTrigger={catalogAddTrigger}
            />
          </div>
        </div>
      ) : viewMode === 'ingredients' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className={cn("text-xl font-black", ingredientView === 'search' && "hidden sm:block", isDarkMode ? "text-white" : "text-slate-900")}>
              {ingredientView === 'search' ? 'Tra cứu theo hoạt chất' :
                ingredientView === 'manage' ? 'Quản lý Hoạt chất' :
                  'Phân loại Hoạt chất'}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIngredientView('search')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs",
                  ingredientView === 'search'
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                )}
              >
                <Search size={14} /> Tra cứu
              </button>

              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => setIngredientView('manage')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs",
                      ingredientView === 'manage'
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        : isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                    )}
                  >
                    <FolderTree size={14} /> Phân loại
                  </button>
                </>
              )}

              {selectedIngredient && ingredientView === 'search' && (
                <button
                  type="button"
                  onClick={() => setSelectedIngredient(null)}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {ingredientView === 'search' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedIngredients.map((ing, idx) => (
                  <motion.div
                    layout
                    key={idx}
                    onClick={() => {
                      setSelectedIngredient(ing.name);
                      setViewMode('drugs');
                    }}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-xl group",
                      selectedIngredient === ing.name
                        ? "border-primary bg-primary/5"
                        : isDarkMode ? "bg-slate-900 border-slate-800 hover:border-blue-900" : "bg-white border-slate-100 hover:border-blue-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          isDarkMode ? "bg-slate-800 group-hover:bg-blue-900/30" : "bg-blue-50 group-hover:bg-blue-100"
                        )}>
                          <Activity size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <h4 className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>{ing.name}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">{ing.drugCount} biệt dược</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {totalIngredientPages > 1 && (
                <div className={cn(
                  "mt-4 flex flex-wrap items-center justify-center gap-1.5 p-3 rounded-2xl border shadow-sm",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}>
                  <button
                    type="button"
                    disabled={ingredientPage === 1}
                    onClick={() => {
                      setIngredientPage(prev => Math.max(1, prev - 1));
                      const container = document.querySelector('.drug-list-container');
                      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                      isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-100 hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalIngredientPages }, (_, i) => i + 1).map((page) => {
                      const shouldShow = page === 1 || page === totalIngredientPages || Math.abs(page - ingredientPage) <= 1;
                      const isBreak = page !== 1 && page !== totalIngredientPages && !shouldShow && (Math.abs(page - ingredientPage) === 2);

                      if (shouldShow) {
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => {
                              setIngredientPage(page);
                              const container = document.querySelector('.drug-list-container');
                              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={cn(
                              "w-8 h-8 rounded-lg text-[10px] font-black transition-all active:scale-90 flex items-center justify-center border",
                              ingredientPage === page
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
                        return <span key={page} className="text-slate-400 font-bold px-1">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={ingredientPage === totalIngredientPages}
                    onClick={() => {
                      setIngredientPage(prev => Math.min(totalIngredientPages, prev + 1));
                      const container = document.querySelector('.drug-list-container');
                      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                      isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-100 hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
              <CatalogManagement
                type={ingredientView === 'manage' ? 'ingredient' : 'ingredient_category'}
                isDarkMode={isDarkMode}
                onClose={() => setIngredientView('search')}
                inline={true}
                externalTrigger={catalogAddTrigger}
              />
            </div>
          )}
        </div>
      ) : viewMode === 'companies' ? (
        <div className="space-y-4 lg:space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
            <CatalogManagement
              type="company"
              isDarkMode={isDarkMode}
              onClose={() => setViewMode('drugs')}
              inline={true}
              externalTrigger={catalogAddTrigger}
            />
          </div>
        </div>
      ) : viewMode === 'groups' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h3 className={cn("text-xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>Danh mục nhóm thuốc</h3>
              {!groupSearchTerm && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExpandAllGroups}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest hover:underline transition-all",
                      isDarkMode ? "text-blue-400" : "text-blue-600"
                    )}
                  >
                    Mở tất cả
                  </button>
                  <span className="text-slate-400 text-[10px]">•</span>
                  <button
                    onClick={handleCollapseAllGroups}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest hover:underline transition-all",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}
                  >
                    Đóng tất cả
                  </button>
                </div>
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Tìm nhóm thuốc..."
                className={cn(
                  "w-full pl-9 pr-10 py-2 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-medium",
                  isDarkMode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
                )}
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
              />
              {groupSearchTerm && (
                <button
                  type="button"
                  onClick={() => setGroupSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-rose-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className={cn(
            "grid gap-3 lg:gap-4",
            groupSearchTerm ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 max-w-4xl mx-auto"
          )}>
            {(groupSearchTerm
              ? drugGroups.filter(g => (g.name || '').toLowerCase().includes((groupSearchTerm || '').toLowerCase())).sort((a, b) => (a.order || 0) - (b.order || 0))
              : sortedDrugGroups.filter(g => {
                // A group is visible if it's top-level OR all its ancestors are expanded
                if (g.level === 0) return true;

                let currentParentId = g.parentId;
                while (currentParentId) {
                  if (!expandedGroupIds.has(currentParentId)) return false;
                  const parent = drugGroups.find(pg => pg.id === currentParentId);
                  currentParentId = parent?.parentId || null;
                }
                return true;
              })
            ).map((group, index, array) => {
              const drugCount = groupDrugCounts[group.id] || 0;
              const parent = drugGroups.find(pg => pg.id === group.parentId);
              const hasChildren = drugGroups.some(g => g.parentId === group.id);
              const isExpanded = expandedGroupIds.has(group.id);

              // logic to show vertical line if there are more siblings or descendants
              const hasMoreSiblings = !groupSearchTerm && array.slice(index + 1).some(g => g.parentId === group.parentId);

              return (
                <motion.div
                  key={group.id}
                  onClick={() => {
                    setGroupFilter(group.id);
                    setViewMode('drugs');
                  }}
                  className={cn(
                    "group p-3 rounded-2xl border cursor-pointer transition-all hover:shadow-xl relative",
                    isDarkMode ? "bg-slate-900 border-slate-800 hover:border-blue-900" : "bg-white border-slate-100 hover:border-blue-200",
                    !groupSearchTerm && group.level === 0 && (isDarkMode ? "bg-blue-900/5 border-blue-900/20" : "bg-blue-50/30 border-blue-100/50")
                  )}
                  style={!groupSearchTerm && group.level > 0 ? {
                    marginLeft: `${group.level * (window.innerWidth >= 1024 ? 48 : 32)}px`
                  } : {}}
                >
                  {!groupSearchTerm && group.level > 0 && (
                    <>
                      <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-px",
                        "-left-8 w-8 lg:-left-12 lg:w-12",
                        isDarkMode ? "bg-slate-700" : "bg-slate-200"
                      )} />
                      <div className={cn(
                        "absolute top-0 bottom-1/2 w-px",
                        "-left-8 lg:-left-12",
                        isDarkMode ? "bg-slate-700" : "bg-slate-200"
                      )} />
                      {hasMoreSiblings && (
                        <div className={cn(
                          "absolute top-1/2 bottom-0 w-px",
                          "-left-8 lg:-left-12",
                          isDarkMode ? "bg-slate-700" : "bg-slate-200"
                        )} />
                      )}
                    </>
                  )}

                  <div className="flex items-start justify-between mb-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm relative",
                      group.level === 0
                        ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white")
                        : isDarkMode ? "bg-slate-800 text-blue-400 group-hover:bg-blue-900/30" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                    )}>
                      <Folder size={group.level === 0 ? 20 : 16} fill={group.level === 0 ? "currentColor" : "none"} />
                      {hasChildren && !groupSearchTerm && (
                        <button
                          onClick={(e) => toggleGroupExpand(group.id, e)}
                          className={cn(
                            "absolute -right-2 -bottom-2 w-6 h-6 rounded-full border flex items-center justify-center transition-transform duration-75 z-10",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500 shadow-sm",
                            isExpanded ? "rotate-180 bg-blue-500 text-white border-blue-600" : "hover:scale-105"
                          )}
                        >
                          <ChevronDown size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-sm",
                        group.level === 0
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : group.level === 1
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {group.level === 0 ? "Nhóm lớn" : group.level === 1 ? "Nhóm con" : "Nhóm nhỏ"}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                        isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-white text-slate-500 border-slate-100"
                      )}>
                        {drugCount} thuốc
                      </span>
                    </div>
                  </div>

                  <h4 className={cn(
                    "font-black group-hover:text-blue-600 transition-colors truncate",
                    isDarkMode ? "text-white" : "text-slate-900",
                    group.level === 0 ? "text-sm lg:text-base" : "text-xs lg:text-sm"
                  )}>
                    {group.name}
                  </h4>
                </motion.div>
              );
            })}
          </div>

          {drugGroups.length === 0 && (
            <div className="text-center py-20">
              <FolderTree size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">Chưa có nhóm thuốc nào được định nghĩa</p>
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          "w-full flex flex-col gap-6 transition-all duration-500 min-h-screen"
        )}>
          {/* Quick Search in Sticky Column - Only visible when main search bar is scrolled out */}
          <AnimatePresence>
            {showStickySearch && viewMode === 'drugs' && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={cn(
                  "p-2 rounded-2xl border shadow-xl transition-all relative flex items-center group mb-1",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-slate-200/50"
                )}
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Tìm thuốc..."
                  className={cn(
                    "w-full pl-10 pr-10 py-2.5 bg-transparent border-none focus:ring-0 text-xs font-black",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-500/10 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn(
            "p-1",
            "flex flex-col gap-3"
          )}>

            {/* Top Pagination Controls */}
            {totalPages > 1 && (
              <div className={cn(
                "flex flex-wrap items-center justify-between gap-4 p-3 lg:p-4 rounded-2xl lg:rounded-3xl border shadow-sm mb-2",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md", isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500 border border-slate-100")}>
                      Trang {currentPage} / {totalPages}
                    </span>
                    <span className={cn("hidden sm:inline text-[10px] font-black uppercase tracking-widest text-slate-400")}>
                      ({filteredDrugs.length} thuốc)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", isDarkMode ? "text-slate-500" : "text-slate-400")}>Hiển thị:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className={cn(
                        "text-[10px] font-bold py-1 px-2 rounded-md border appearance-none cursor-pointer outline-none transition-all",
                        isDarkMode
                          ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 shadow-sm"
                      )}
                    >
                      {[10, 20, 30, 50, 100].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      const scrollElement = document.querySelector('.drug-list-container');
                      if (scrollElement) scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      "p-1.5 lg:p-2 rounded-lg lg:rounded-xl border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                      isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-100 hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      const scrollElement = document.querySelector('.drug-list-container');
                      if (scrollElement) scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      "p-1.5 lg:p-2 rounded-lg lg:rounded-xl border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                      isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-100 hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* List Header - Hidden on mobile */}
            {paginatedDrugs.length > 0 && (
              <div className={cn(
                "hidden md:grid grid-cols-12 gap-4 px-8 py-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                isDarkMode ? "text-slate-500" : "text-slate-400"
              )}>
                <div className={cn("pl-12 text-blue-500", !canSeeStatusColumn && !canSeeActionsColumn ? "col-span-8" : (!canSeeStatusColumn || !canSeeActionsColumn ? "col-span-6" : "col-span-4"))}>Tên thuốc & Hoạt chất</div>
                <div className="col-span-2 pl-4 text-indigo-500">Nhóm dược lý</div>
                <div className="col-span-2 pl-4 text-emerald-500">Dạng bào chế</div>
                {canSeeStatusColumn && <div className="col-span-2 pl-4 text-amber-500">Cảnh báo</div>}
                {canSeeActionsColumn && <div className="col-span-2 text-right pr-2">Thao tác</div>}
              </div>
            )}

            {selectedIngredient && (
              <div className={cn(
                "p-3 rounded-2xl border flex items-center justify-between mb-2",
                isDarkMode ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-100"
              )}>
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 truncate">Hoạt chất: {selectedIngredient}</span>
                </div>
                <button type="button" onClick={() => setSelectedIngredient(null)} className="text-blue-600 hover:text-blue-800 p-1">
                  <X size={14} />
                </button>
              </div>
            )}
            {paginatedDrugs.length > 0 ? (
              paginatedDrugs.map((drug) => (
                <motion.div
                  layout
                  key={drug.id}
                  onClick={() => handleShowDrugDetail(drug)}
                  className={cn(
                    "p-3 lg:p-4 rounded-xl lg:rounded-2xl border cursor-pointer transition-all duration-300 relative group flex items-start lg:items-center gap-3 lg:gap-4",
                    drug.isClosed && (isDarkMode ? "opacity-60 bg-slate-900/50" : "opacity-75 bg-slate-50/50"),
                    selectedDrug?.id === drug.id
                      ? cn(
                        "border-primary ring-4 ring-primary/10 z-20 shadow-lg shadow-primary/10",
                        isDarkMode ? "bg-slate-900" : "bg-white"
                      )
                      : cn(
                        "hover:border-primary/30 shadow-sm hover:shadow-md",
                        isDarkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-800/50" : "bg-white border-slate-100 hover:shadow-slate-100"
                      )
                  )}
                >
                  {selectedDrug?.id === drug.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[2px_0_8px_rgba(59,130,246,0.5)] rounded-l-xl lg:rounded-l-2xl"></div>
                  )}

                  <div className={cn(
                    "w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0 border shadow-sm relative overflow-hidden",
                    selectedDrug?.id === drug.id
                      ? "bg-primary border-primary/50 text-white shadow-primary/20"
                      : cn(
                        "text-slate-400 group-hover:text-primary",
                        isDarkMode
                          ? "bg-slate-800 border-slate-700 group-hover:bg-primary/10 group-hover:border-primary/30"
                          : "bg-slate-50 border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/10",
                        drug.isClosed && (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-600" : "bg-slate-200 border-slate-300 text-slate-400")
                      )
                  )}>
                    {drug.avatarUrl ? (
                      <img
                        src={drug.avatarUrl}
                        alt={drug.name}
                        loading="lazy"
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                          drug.isClosed && "grayscale opacity-50"
                        )}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Pill size={20} className={cn("lg:size-6 transition-transform duration-500 group-hover:rotate-12", drug.isClosed && "opacity-40")} />
                    )}
                    {drug.isClosed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px]">
                        <EyeOff size={14} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className={cn("flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-4 items-start lg:items-center", canManage && "pr-16 md:pr-0")}>
                    <div className={cn("min-w-0", !canSeeStatusColumn && !canSeeActionsColumn ? "md:col-span-8" : (!canSeeStatusColumn || !canSeeActionsColumn ? "md:col-span-6" : "md:col-span-4"))}>
                      <div className="flex items-center gap-2 mb-1 lg:mb-1.5">
                        <h3 className={cn(
                          "font-black text-xs lg:text-sm truncate",
                          isDarkMode ? "text-white group-hover:text-primary" : "text-slate-900 group-hover:text-primary"
                        )}>{drug.name}</h3>
                        {drug.isRx && (
                          <span className="shrink-0 text-[7px] lg:text-[8px] px-1 lg:px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-md font-black border border-rose-500/20">Rx</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(drug.activeIngredients || []).slice(0, 3).map((ing, idx) => (
                          <span key={idx} className={cn(
                            "text-[8px] lg:text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-colors",
                            isDarkMode ? "bg-slate-800/30 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
                          )}>
                            {ing.name} {ing.amount}{ing.unit}
                          </span>
                        ))}
                        {(drug.activeIngredients || []).length > 3 && (
                          <span className="text-[8px] text-slate-400 font-bold">...</span>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 md:pl-4">
                      {((drug.groupIds && drug.groupIds.length > 0) || drug.atcCode) ? (
                        <div className="flex flex-row flex-wrap md:flex-col gap-1 items-start">
                          {drug.groupIds && drug.groupIds.length > 0 && drugGroups.filter(g => drug.groupIds?.includes(g.id)).slice(0, 1).map((g, idx) => (
                            <span key={idx} className={cn(
                              "flex items-center gap-1 text-[8px] lg:text-[9px] font-bold px-1.5 lg:px-2 py-0.5 rounded-md border truncate max-w-[150px] lg:max-w-full",
                              isDarkMode ? "bg-indigo-900/10 border-indigo-900/20 text-indigo-400" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                            )}>
                              <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                              <span className="truncate">{g.name}</span>
                            </span>
                          ))}
                          {drug.atcCode && (
                            <span className={cn(
                              "flex items-center gap-1 text-[8px] lg:text-[9px] font-bold px-1.5 lg:px-2 py-0.5 rounded-md border truncate max-w-[100px] lg:max-w-full",
                              isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
                            )}>
                              <Activity size={8} className="shrink-0" />
                              ATC: {drug.atcCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] lg:text-[10px] text-slate-400 italic">Chưa phân nhóm</span>
                      )}
                    </div>

                    <div className="md:col-span-2 md:pl-4">
                      <div className="flex flex-row md:flex-col gap-2 md:gap-1 items-center md:items-start flex-wrap">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[8px] lg:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                          isDarkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-50 text-blue-600"
                        )}>
                          <Activity size={8} />
                          {drug.dosageForm || 'N/A'}
                        </span>
                        {(drug.administrationRoute || drug.generalAdministration) && (
                          <span className="text-[8px] font-bold text-slate-400 line-clamp-1 italic px-0.5" title={`${drug.administrationRoute || ''}${drug.generalAdministration ? ': ' + drug.generalAdministration : ''}`}>
                            {drug.administrationRoute && <span className={isDarkMode ? "text-emerald-400/80" : "text-emerald-600/80"}>{drug.administrationRoute}</span>}
                            {drug.generalAdministration && (
                              <span className="hidden lg:inline ml-1">{drug.generalAdministration}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {canSeeStatusColumn && (
                      <div className="md:col-span-2 md:pl-4">
                        <div className="flex flex-row md:flex-col gap-1 items-center md:items-start text-xs">
                          {drug.isClosed && (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                              isDarkMode ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-slate-50 text-slate-400 border-slate-200"
                            )}>
                              <EyeOff size={8} />
                              Đang ẩn
                            </span>
                          )}

                          {drug.status === 'suspended' && (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                              "bg-amber-950/30 text-amber-400 border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                              !isDarkMode && "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                              <AlertTriangle size={8} />
                              Tạm ngưng
                            </span>
                          )}

                          {drug.stockStatus && drug.stockStatus !== 'available' && (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                              drug.stockStatus === 'out'
                                ? (isDarkMode ? "bg-rose-950/30 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-600 border-rose-100")
                                : (isDarkMode ? "bg-amber-950/30 text-amber-400 border-amber-900/50" : "bg-amber-50 text-amber-600 border-amber-100")
                            )}>
                              <Database size={8} />
                              {drug.stockStatus === 'out' ? 'Hết hàng' : 'Sắp hết'}
                            </span>
                          )}

                          {drug.expiryStatus && drug.expiryStatus !== 'valid' && drug.stockStatus !== 'out' && (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                              drug.expiryStatus === 'expired'
                                ? (isDarkMode ? "bg-rose-950/30 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-600 border-rose-100")
                                : drug.expiryStatus === 'expiring'
                                  ? (isDarkMode ? "bg-amber-950/30 text-amber-400 border-amber-900/50" : "bg-amber-50 text-amber-600 border-amber-100")
                                  : (isDarkMode ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-600 border-emerald-100")
                            )}>
                              <Calendar size={8} />
                              {drug.expiryStatus === 'expired' ? 'Hết hạn' : drug.expiryStatus === 'expiring' ? 'Sắp hết hạn' : ''}
                              {drug.expiryDate ? ` (${drug.expiryDate.split('-').reverse().join('/')})` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {canSeeActionsColumn && (
                      <div className="hidden md:flex md:col-span-2 justify-end p-1">
                        <div className="flex items-center gap-2">
                          {drug.pdfUrl && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPdfViewerUrl(drug.pdfUrl!); }}
                              title="Xem file HDSD (PDF)"
                              className={cn(
                                "p-1.5 rounded-lg transition-all hover:scale-110 flex items-center justify-center",
                                isDarkMode ? "text-blue-500 hover:bg-blue-500/10 border border-blue-500/20" : "text-blue-600 hover:bg-blue-50 border border-blue-100"
                              )}
                            >
                              <FileText size={14} />
                            </button>
                          )}
                          {canManage && (
                            <div className="relative action-menu-container">
                              <button
                                type="button"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setOpenActionMenuId(openActionMenuId === drug.id ? null : drug.id); 
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all flex items-center justify-center",
                                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100",
                                  openActionMenuId === drug.id 
                                    ? (isDarkMode ? "text-primary bg-slate-800" : "text-primary bg-slate-100") 
                                    : "text-slate-400"
                                )}
                              >
                                <MoreVertical size={16} />
                              </button>

                              <AnimatePresence>
                                {openActionMenuId === drug.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className={cn(
                                      "absolute right-0 top-full mt-2 z-50 rounded-xl shadow-2xl border overflow-hidden min-w-[160px]",
                                      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                                    )}
                                  >
                                    <div className="p-1">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleClosed(drug); setOpenActionMenuId(null); }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors rounded-lg",
                                          isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600"
                                        )}
                                      >
                                        {drug.isClosed ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-amber-500" />}
                                        {drug.isClosed ? "Hiện thuốc" : "Ẩn thuốc"}
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleSuspended(drug); setOpenActionMenuId(null); }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors rounded-lg",
                                          isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600"
                                        )}
                                      >
                                        <Pause size={14} className={drug.status === 'suspended' ? "text-emerald-500" : "text-amber-500"} />
                                        {drug.status === 'suspended' ? "Kích hoạt" : "Tạm ngưng"}
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(drug); setOpenActionMenuId(null); }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors rounded-lg",
                                          isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600"
                                        )}
                                      >
                                        <Edit2 size={14} className="text-blue-500" />
                                        Chỉnh sửa
                                      </button>
                                      <div className={cn("h-px my-1", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(drug.id, drug.name, drug.pdfUrl); setOpenActionMenuId(null); }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors rounded-lg",
                                          isDarkMode ? "hover:bg-rose-900/20 text-rose-400" : "hover:bg-rose-50 text-rose-500"
                                        )}
                                      >
                                        <Trash2 size={14} />
                                        Xóa thuốc
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nút Sửa/Xóa - absolute trên mobile */}
                  {canSeeActionsColumn && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 md:hidden">
                      {drug.pdfUrl && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPdfViewerUrl(drug.pdfUrl!); }}
                          title="Xem file PDF"
                          className={cn(
                            "p-1.5 rounded-lg transition-all hover:scale-110 flex items-center justify-center border shadow-sm",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-blue-400" : "bg-white border-slate-100 text-blue-600"
                          )}
                        >
                          <FileText size={13} />
                        </button>
                      )}
                      {canManage && (
                        <div className="relative action-menu-container">
                          <button
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setOpenActionMenuId(openActionMenuId === drug.id ? null : drug.id); 
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-all flex items-center justify-center border shadow-sm",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-100 text-slate-500",
                              openActionMenuId === drug.id && "ring-2 ring-primary border-primary"
                            )}
                          >
                            <MoreVertical size={14} />
                          </button>

                          <AnimatePresence>
                            {openActionMenuId === drug.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className={cn(
                                  "absolute right-0 top-full mt-2 z-50 rounded-xl shadow-2xl border overflow-hidden min-w-[140px]",
                                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                                )}
                              >
                                <div className="p-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleClosed(drug); setOpenActionMenuId(null); }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors rounded-lg",
                                      isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600"
                                    )}
                                  >
                                    {drug.isClosed ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-amber-500" />}
                                    {drug.isClosed ? "Hiện thuốc" : "Ẩn thuốc"}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleSuspended(drug); setOpenActionMenuId(null); }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors rounded-lg",
                                      isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600"
                                    )}
                                  >
                                    <Pause size={14} className={drug.status === 'suspended' ? "text-emerald-500" : "text-amber-500"} />
                                    {drug.status === 'suspended' ? "Kích hoạt" : "Tạm ngưng"}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(drug); setOpenActionMenuId(null); }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors rounded-lg",
                                      isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600"
                                    )}
                                  >
                                    <Edit2 size={14} className="text-blue-500" />
                                    Chỉnh sửa
                                  </button>
                                  <div className={cn("h-px my-1", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(drug.id, drug.name, drug.pdfUrl); setOpenActionMenuId(null); }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors rounded-lg text-rose-500",
                                      isDarkMode ? "hover:bg-rose-900/20" : "hover:bg-rose-50"
                                    )}
                                  >
                                    <Trash2 size={14} />
                                    Xóa thuốc
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className={cn(
                "text-center py-20 rounded-3xl border shadow-sm transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                  isDarkMode ? "bg-slate-800" : "bg-white"
                )}>
                  <Search size={32} className={isDarkMode ? "text-slate-600" : "text-slate-300"} />
                </div>
                <p className={cn("font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>Không tìm thấy thuốc phù hợp</p>
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setGroupFilter('Tất cả'); setSelectedIngredient(null); }}
                  className={cn("mt-4 font-bold text-sm hover:underline", isDarkMode ? "text-blue-400" : "text-blue-600")}
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={cn(
                "mt-4 flex flex-wrap items-center justify-between gap-4 p-3 lg:p-4 rounded-2xl lg:rounded-3xl border shadow-sm",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mỗi trang:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className={cn(
                      "text-[10px] font-bold py-1 px-2 rounded-md border appearance-none cursor-pointer outline-none transition-all",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 shadow-sm"
                    )}
                  >
                    {[10, 20, 30, 50, 100].map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      const scrollElement = document.querySelector('.drug-list-container');
                      if (scrollElement) scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      "p-1.5 lg:p-2 rounded-lg lg:rounded-xl border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                      isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-100 hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show current page, first, last, and window around current
                      const shouldShow = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                      const isBreak = page !== 1 && page !== totalPages && !shouldShow && (Math.abs(page - currentPage) === 2);

                      if (shouldShow) {
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => {
                              setCurrentPage(page);
                              const scrollElement = document.querySelector('.drug-list-container');
                              if (scrollElement) scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={cn(
                              "w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl text-[10px] lg:text-sm font-black transition-all active:scale-90 flex items-center justify-center border",
                              currentPage === page
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
                        return <span key={page} className="text-slate-400 font-bold px-1">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      const scrollElement = document.querySelector('.drug-list-container');
                      if (scrollElement) scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
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

      {/* Management Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className={cn(
            "fixed inset-0 z-50 flex flex-col transition-all",
            "p-0"
          )}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className={cn(
                "relative w-full h-full shadow-2xl flex flex-col transition-colors overflow-hidden rounded-none",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
            >
              <div className={cn(
                "p-4 sm:p-6 lg:p-8 border-b flex items-center justify-between transition-colors shrink-0",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <h3 className={cn("text-sm sm:text-lg font-black tracking-tight transition-colors", isDarkMode ? "text-white" : "text-black")}>
                    {editingDrug ? 'Chỉnh sửa thuốc' : 'Thêm thuốc mới'}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    form="drug-form"
                    disabled={uploading}
                    className={cn(
                      "flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl sm:rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50",
                      uploading && "animate-pulse"
                    )}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span className="hidden sm:inline text-sm sm:text-base font-bold">Đang cập nhật...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span className="hidden sm:inline text-sm sm:text-base font-bold">
                          {editingDrug ? 'Cập nhật' : 'Lưu thuốc'}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!uploading) setIsModalOpen(false);
                    }}
                    className={cn(
                      "p-2 rounded-full transition-all active:scale-95",
                      isDarkMode
                        ? "text-slate-500 hover:bg-rose-900/20 hover:text-rose-400"
                        : "text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    )}
                  >
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              <div className={cn(
                "flex border-b px-4 sm:px-8 overflow-x-auto scrollbar-hide transition-colors shrink-0",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                {[
                  { id: 'company', label: 'T.Tin', fullLabel: 'Thông tin', icon: <Briefcase size={18} /> },
                  { id: 'general', label: 'Chung', fullLabel: 'Thông tin chung', icon: <Pill size={18} /> },
                  { id: 'dosage', label: 'Liều dùng', fullLabel: 'Chỉ định & Liều dùng', icon: <Clock size={18} /> },
                  { id: 'warnings', label: 'Cảnh báo', fullLabel: 'Thận trọng & Cảnh báo', icon: <ShieldAlert size={18} /> },
                  { id: 'pharmacology', label: 'Dược lý', fullLabel: 'Dược lý & Tương tác', icon: <Activity size={18} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 py-3 sm:py-4 px-3 sm:px-4 border-b-2 transition-all font-bold text-xs sm:text-sm whitespace-nowrap",
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : cn(
                          "border-transparent",
                          isDarkMode ? "text-slate-500 hover:text-slate-300 hover:border-slate-700" : "text-slate-400 hover:text-slate-600 hover:border-slate-200"
                        )
                    )}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.fullLabel}</span>
                  </button>
                ))}
              </div>

              <form id="drug-form" onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col">
                <div className={cn(
                  "flex-1 overflow-y-auto p-3 sm:p-8 space-y-6 sm:space-y-8 transition-colors custom-scrollbar",
                  isDarkMode ? "bg-slate-900" : "bg-white"
                )}>
                  {/* Sub Tabs Navigator */}
                  <div className={cn(
                    "flex gap-1 p-1 rounded-xl sticky top-0 z-30 transition-colors shadow-sm mb-6",
                    isDarkMode ? "bg-slate-800/80 backdrop-blur-md border border-slate-700" : "bg-slate-100/80 backdrop-blur-md border border-slate-200"
                  )}>
                    {(SUB_TABS[activeTab] || []).map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setActiveSubTab(sub.id)}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all",
                          activeSubTab === sub.id
                            ? (isDarkMode ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "bg-white text-blue-600 shadow-sm border border-blue-100")
                            : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
                        )}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'general' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'info' && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Tên thuốc <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                disabled={uploading}
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={cn(
                                  "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                )}
                              />
                            </div>
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Mã ATC
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  disabled={uploading}
                                  value={formData.atcCode || ''}
                                  onChange={(e) => setFormData({ ...formData, atcCode: e.target.value })}
                                  className={cn(
                                    "flex-1 px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                  )}
                                  placeholder="Ví dụ: N02BE01"
                                />
                                <label className={cn(
                                  "flex items-center gap-2 cursor-pointer px-4 rounded-xl border shadow-sm transition-all whitespace-nowrap",
                                  formData.isRx ? "bg-rose-500 border-rose-400 text-white" : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                                )}>
                                  <input
                                    type="checkbox"
                                    checked={formData.isRx || false}
                                    onChange={(e) => setFormData({ ...formData, isRx: e.target.checked })}
                                    className="hidden"
                                  />
                                  <AlertTriangle size={14} className={formData.isRx ? "animate-pulse" : ""} />
                                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Rx</span>
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Nhóm thuốc <span className="text-rose-500">*</span>
                              </label>

                              {/* Selected Groups Chips */}
                              {formData.groupIds && formData.groupIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {formData.groupIds.map(id => {
                                    const group = drugGroups.find(g => g.id === id);
                                    if (!group) return null;
                                    return (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        key={id}
                                        className={cn(
                                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border",
                                          isDarkMode
                                            ? "bg-blue-900/30 border-blue-800 text-blue-400"
                                            : "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                        )}
                                      >
                                        <span>{group.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFormData(prev => {
                                              const nextIds = (prev.groupIds || []).filter(gid => gid !== id);
                                              return {
                                                ...prev,
                                                groupIds: nextIds,
                                                groupId: nextIds[0] || ''
                                              };
                                            });
                                          }}
                                          className={cn(
                                            "p-0.5 rounded-full transition-colors",
                                            isDarkMode ? "hover:bg-blue-800" : "hover:bg-blue-100"
                                          )}
                                        >
                                          <X size={12} />
                                        </button>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="mb-2">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  <input
                                    type="text"
                                    placeholder="Tìm kiếm nhóm thuốc..."
                                    value={formGroupSearch}
                                    onChange={(e) => setFormGroupSearch(e.target.value)}
                                    className={cn(
                                      "w-full pl-9 pr-4 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                      isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                    )}
                                  />
                                  {formGroupSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setFormGroupSearch('')}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className={cn(
                                "border rounded-xl p-3 sm:p-4 max-h-[220px] overflow-y-auto custom-scrollbar space-y-2",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                              )}>
                                {sortedDrugGroups
                                  .filter(group =>
                                    !formGroupSearch ||
                                    (group.name || '').toLowerCase().includes((formGroupSearch || '').toLowerCase())
                                  )
                                  .map(group => {
                                    let isSelected = false;
                                    if (Array.isArray(formData.groupIds)) {
                                      isSelected = formData.groupIds.includes(group.id);
                                    } else if (formData.groupId === group.id) {
                                      isSelected = true;
                                    }
                                    return (
                                      <label
                                        key={group.id}
                                        className={cn(
                                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border",
                                          isSelected
                                            ? (isDarkMode ? "bg-blue-600/20 border-blue-500/50 text-white" : "bg-blue-50 border-blue-200 text-blue-700 font-bold")
                                            : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-100")
                                        )}
                                        style={{ marginLeft: `${(group.level || 0) * 20}px` }}
                                      >
                                        <input
                                          type="checkbox"
                                          className="sr-only"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            const targetGroupId = group.id;
                                            setFormData(prev => {
                                              let currentIds = Array.isArray(prev.groupIds)
                                                ? prev.groupIds
                                                : (prev.groupId ? [prev.groupId] : []);
                                              let nextIds = [...currentIds];
                                              if (checked) {
                                                if (!nextIds.includes(targetGroupId)) nextIds.push(targetGroupId);
                                              } else {
                                                nextIds = nextIds.filter(id => id !== targetGroupId);
                                              }
                                              return {
                                                ...prev,
                                                groupIds: nextIds,
                                                groupId: nextIds[0] || ''
                                              };
                                            });
                                          }}
                                        />
                                        <div className={cn(
                                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                          isSelected ? "bg-blue-600 border-blue-600" : (isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")
                                        )}>
                                          {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                        </div>
                                        <span className="text-xs">{group.name}</span>
                                      </label>
                                    );
                                  })}
                              </div>
                            </div>
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>Đường dùng</label>
                              <div className="flex flex-wrap gap-2">
                                {['Uống', 'Tiêm bắp (IM)', 'Tiêm tĩnh mạch (IV)', 'Truyền tĩnh mạch', 'Đặt dưới lưỡi', 'Dùng ngoài', 'Đặt âm đạo', 'Đặt trực tràng', 'Hít', 'Xịt mũi'].map(route => (
                                  <button
                                    key={route}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, administrationRoute: route })}
                                    className={cn(
                                      "text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all",
                                      formData.administrationRoute === route
                                        ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                        : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")
                                    )}
                                  >
                                    {route}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'composition' && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Thành phần hoạt chất <span className="text-rose-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = [...(formData.activeIngredients || [])];
                                  newList.push({ name: '', amount: '', unit: '' });
                                  setFormData({ ...formData, activeIngredients: newList });
                                }}
                                className={cn(
                                  "flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all",
                                  isDarkMode ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                )}
                              >
                                <Plus size={12} /> Thêm
                              </button>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              {(formData.activeIngredients || []).map((ingredient, index) => (
                                <div key={index} className={cn(
                                  "flex gap-2 sm:gap-3 items-start p-3 sm:p-4 rounded-xl border transition-colors",
                                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                                )}>
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                    <div className="sm:col-span-1">
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Hoạt chất</label>
                                      <select
                                        required
                                        value={ingredient.name}
                                        onChange={(e) => {
                                          const newList = [...(formData.activeIngredients || [])];
                                          newList[index] = { ...newList[index], name: e.target.value };
                                          setFormData({ ...formData, activeIngredients: newList });
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2.5 sm:py-3 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none",
                                          isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                        )}
                                      >
                                        <option value="">-- Chọn hoạt chất --</option>
                                        {availableIngredients.flatMap(ai => {
                                          const options = [{ id: `${ai.id}-main`, value: ai.name, label: ai.name }];
                                          if (ai.alias) {
                                            options.push({ id: `${ai.id}-alias`, value: ai.alias, label: `${ai.alias} (${ai.name})` });
                                          }
                                          if (ai.aliases && ai.aliases.length > 0) {
                                            ai.aliases.forEach((a, k) => {
                                              options.push({ id: `${ai.id}-alias-${k}`, value: a, label: `${a} (${ai.name})` });
                                            });
                                          }
                                          return options;
                                        }).map(opt => (
                                          <option key={opt.id} value={opt.value}>{opt.label}</option>
                                        ))}
                                        {/* Fallback for manually entered ingredients or those not in catalog */}
                                        {ingredient.name && !availableIngredients.some(ai =>
                                          ai.name === ingredient.name ||
                                          ai.alias === ingredient.name ||
                                          (ai.aliases && ai.aliases.includes(ingredient.name))
                                        ) && (
                                            <option value={ingredient.name}>{ingredient.name} (Không có trong danh mục)</option>
                                          )}
                                      </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:contents">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Hàm lượng</label>
                                        <input
                                          type="text"
                                          required
                                          value={ingredient.amount}
                                          onChange={(e) => {
                                            const newList = [...(formData.activeIngredients || [])];
                                            newList[index] = { ...newList[index], amount: e.target.value };
                                            setFormData({ ...formData, activeIngredients: newList });
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2.5 sm:py-3 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono",
                                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                          )}
                                          placeholder="500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Đơn vị</label>
                                        <input
                                          type="text"
                                          required
                                          value={ingredient.unit}
                                          onChange={(e) => {
                                            const newList = [...(formData.activeIngredients || [])];
                                            newList[index] = { ...newList[index], unit: e.target.value };
                                            setFormData({ ...formData, activeIngredients: newList });
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2.5 sm:py-3 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                          )}
                                          placeholder="mg"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 p-1">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('activeIngredients', index, 'up')}
                                      disabled={index === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all",
                                        index === 0 ? "opacity-30 cursor-not-allowed" : (isDarkMode ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400" : "hover:bg-slate-200 text-slate-400 hover:text-blue-600")
                                      )}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('activeIngredients', index, 'down')}
                                      disabled={index === (formData.activeIngredients || []).length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all",
                                        index === (formData.activeIngredients || []).length - 1 ? "opacity-30 cursor-not-allowed" : (isDarkMode ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400" : "hover:bg-slate-200 text-slate-400 hover:text-blue-600")
                                      )}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = (formData.activeIngredients || []).filter((_, i) => i !== index);
                                      setFormData({ ...formData, activeIngredients: newList });
                                    }}
                                    className={cn(
                                      "p-1.5 sm:p-2 mt-4 sm:mt-5 transition-colors rounded-lg",
                                      isDarkMode ? "text-rose-400 hover:bg-rose-900/20" : "text-rose-500 hover:bg-rose-50"
                                    )}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="relative">
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Tá dược
                              </label>
                              <div className="relative group/excipient">
                                <input
                                  type="text"
                                  disabled={uploading}
                                  value={formData.excipients || ''}
                                  onChange={(e) => {
                                    setFormData({ ...formData, excipients: e.target.value });
                                    setExcipientFormSearch(e.target.value.split(/[,;]\s*/).pop() || '');
                                  }}
                                  onFocus={() => {
                                    setExcipientFormSearch(formData.excipients?.split(/[,;]\s*/).pop() || '');
                                  }}
                                  className={cn(
                                    "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                  )}
                                  placeholder="Tinh bột ngô, Povidon..."
                                />

                                <AnimatePresence>
                                  {filteredExcipients.length > 0 && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className={cn(
                                        "absolute left-0 right-0 top-full mt-2 z-[100] border rounded-2xl shadow-xl overflow-hidden",
                                        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                                      )}
                                    >
                                      <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                        {filteredExcipients.map((excipient, idx) => (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                              const currentParts = (formData.excipients || '').split(/([,;]\s*)/);
                                              // Replace last part if it was the search term
                                              if (currentParts.length > 0 && excipientFormSearch && currentParts[currentParts.length - 1].toLowerCase().includes(excipientFormSearch.toLowerCase())) {
                                                currentParts[currentParts.length - 1] = excipient.name;
                                              } else {
                                                if (formData.excipients && !formData.excipients.trim().endsWith(',') && !formData.excipients.trim().endsWith(';')) {
                                                  currentParts.push(', ', excipient.name);
                                                } else {
                                                  currentParts.push(excipient.name);
                                                }
                                              }

                                              const nextValue = currentParts.join('');
                                              setFormData({ ...formData, excipients: nextValue });
                                              setExcipientFormSearch('');
                                            }}
                                            className={cn(
                                              "w-full text-left px-4 py-2.5 text-sm rounded-xl transition-all flex items-center gap-2",
                                              isDarkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-50 text-slate-600"
                                            )}
                                          >
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <div className="flex flex-col">
                                              <span className="font-medium">{excipient.name}</span>
                                              {excipient.aliases && excipient.aliases.length > 0 ? (
                                                <span className="text-[10px] text-slate-500 italic">Tên khác: {excipient.aliases.join(', ')}</span>
                                              ) : excipient.alias && (
                                                <span className="text-[10px] text-slate-500 italic">Tên khác: {excipient.alias}</span>
                                              )}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Dạng bào chế
                              </label>
                              <input
                                type="text"
                                placeholder="Viên nén, siro,..."
                                disabled={uploading}
                                value={formData.dosageForm || ''}
                                onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                                className={cn(
                                  "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'company' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                          <div className="relative group/manufacturer">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Nhà sản xuất
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsCompanyModalOpen(true)}
                                className="text-[9px] font-bold text-blue-500 hover:underline"
                              >
                                Quản lý
                              </button>
                            </div>
                            <input
                              type="text"
                              disabled={uploading}
                              list="company-list"
                              value={formData.manufacturer || ''}
                              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              )}
                              placeholder="Chọn hoặc nhập tên công ty..."
                            />
                            <datalist id="company-list">
                              {availableCompanies.map(company => (
                                <option key={company.id} value={company.name} />
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              Số đăng ký (SĐK)
                            </label>
                            <input
                              type="text"
                              disabled={uploading}
                              value={formData.registrationNumber || ''}
                              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              )}
                              placeholder="Ví dụ: VD-12345-20"
                            />
                          </div>

                          <div>
                            <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              Phiên bản tờ hướng dẫn
                            </label>
                            <input
                              type="text"
                              disabled={uploading}
                              value={formData.leafletVersion || ''}
                              onChange={(e) => setFormData({ ...formData, leafletVersion: e.target.value })}
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              )}
                              placeholder="Ví dụ: Phiên bản 02"
                            />
                          </div>

                          <div>
                            <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              Ngày cập nhật HDSD
                            </label>
                            <input
                              type="date"
                              disabled={uploading}
                              value={formData.leafletUpdateDate || ''}
                              onChange={(e) => setFormData({ ...formData, leafletUpdateDate: e.target.value })}
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              )}
                            />
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>URL Ảnh đại diện (Avatar)</label>
                              <div className="flex gap-3 sm:gap-4">
                                {formData.avatarUrl && (
                                  <div className="relative group/img">
                                    <div className={cn(
                                      "w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border shrink-0 transition-colors",
                                      isDarkMode ? "border-slate-700" : "border-slate-200"
                                    )}>
                                      <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => openImageEditor(formData.avatarUrl, 'avatar')}
                                      className="absolute inset-0 bg-blue-600/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl"
                                      title="Chỉnh sửa ảnh"
                                    >
                                      <Scissors size={12} />
                                    </button>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder="Dán URL ảnh đại diện..."
                                    value={formData.avatarUrl || ''}
                                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                                    className={cn(
                                      "w-full px-3 sm:px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm",
                                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                    )}
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>URL Ảnh bìa (Banner)</label>
                              <div className="flex gap-3 sm:gap-4">
                                {formData.bannerUrl && (
                                  <div className={cn(
                                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border shrink-0 transition-colors",
                                    isDarkMode ? "border-slate-700" : "border-slate-200"
                                  )}>
                                    <img src={formData.bannerUrl} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder="Dán URL ảnh bìa..."
                                    value={formData.bannerUrl || ''}
                                    onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                                    className={cn(
                                      "w-full px-3 sm:px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm",
                                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'settings' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                          {/* Modern PDF Upload & AI Tool */}
                          <div className={cn(
                            "md:col-span-2 group relative overflow-hidden rounded-[32px] border transition-all duration-500 mb-2",
                            isDarkMode
                              ? "bg-slate-900/40 border-slate-800 hover:border-indigo-500/50"
                              : "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xl shadow-sm shadow-indigo-100/20"
                          )}>
                            {/* Decorative background for AI mode */}
                            {extracting && (
                              <div className="absolute inset-0 overflow-hidden">
                                <motion.div
                                  animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.1, 0.2, 0.1]
                                  }}
                                  transition={{ duration: 4, repeat: Infinity }}
                                  className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full blur-[80px]"
                                />
                                <motion.div
                                  animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.05, 0.15, 0.05]
                                  }}
                                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                                  className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500 rounded-full blur-[100px]"
                                />
                              </div>
                            )}

                            <div className="relative p-6 sm:p-10">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "p-2 rounded-xl transition-colors",
                                      isDarkMode ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                                    )}>
                                      <FileText size={20} />
                                    </div>
                                    <h3 className={cn("text-lg font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                                      Tài liệu đính kèm
                                    </h3>
                                  </div>
                                  <p className={cn("text-xs font-semibold opacity-60", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                    Tải PDF hoặc dán URL để AI hỗ trợ điền dữ liệu tự động
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={uploading || extracting}
                                    onClick={() => handleAIExtract()}
                                    className={cn(
                                      "relative flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all overflow-hidden",
                                      extracting
                                        ? "bg-slate-800 text-indigo-400 cursor-wait"
                                        : isDarkMode
                                          ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
                                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 hover:shadow-indigo-200"
                                    )}
                                  >
                                    {extracting ? (
                                      <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Đang đọc dữ liệu...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={16} className={selectedFile ? "animate-pulse" : ""} />
                                        <span>{selectedFile ? 'Tiến hành trích xuất' : 'AI Trích xuất'}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-8 group/input relative">
                                  <input
                                    type="text"
                                    disabled={uploading || extracting}
                                    placeholder="Dán liên kết PDF (https://...)"
                                    value={formData.pdfUrl}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pdfUrl: e.target.value }))}
                                    className={cn(
                                      "w-full pl-12 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 focus:outline-none",
                                      isDarkMode
                                        ? "bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500"
                                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-400"
                                    )}
                                  />
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Link size={18} />
                                  </div>
                                </div>

                                <div className="md:col-span-4 flex gap-2">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    disabled={uploading || extracting}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                      "flex-1 px-4 py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                  >
                                    <Plus size={16} /> {selectedFile ? 'Đổi file' : 'Chọn file'}
                                  </button>
                                  {(formData.pdfUrl || selectedFile) && (
                                    <button
                                      type="button"
                                      disabled={uploading || extracting}
                                      onClick={handleRemoveFile}
                                      className={cn(
                                        "px-4 rounded-2xl border transition-all flex items-center justify-center",
                                        isDarkMode
                                          ? "text-rose-400 bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10"
                                          : "text-rose-500 bg-rose-50 border-rose-100 hover:bg-rose-100"
                                      )}
                                      title="Xóa tệp"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {selectedFile && (
                                <div className={cn(
                                  "mt-2 mb-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-2",
                                  isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
                                )}>
                                  <FileText size={12} className="text-primary" />
                                  <span className="truncate flex-1">Tệp đã chọn: {selectedFile.name}</span>
                                  <span className="shrink-0">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                              )}

                              {extracting && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10"
                                >
                                  <div className="flex gap-1.5">
                                    {[0, 1, 2].map(i => (
                                      <motion.div
                                        key={i}
                                        animate={{ height: [8, 20, 8] }}
                                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                                        className="w-1 bg-indigo-500 rounded-full"
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">
                                    AI đang phân tích từng trang tài liệu...
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Visibility Setting */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-[24px] border transition-all",
                            isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-100 shadow-sm"
                          )}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={cn(
                                "p-2.5 rounded-xl",
                                isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
                              )}>
                                <Eye size={20} />
                              </div>
                              <div>
                                <h4 className={cn("text-sm font-black uppercase tracking-widest", isDarkMode ? "text-slate-200" : "text-slate-700")}>Chế độ hiển thị</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Quyết định thuốc có xuất hiện trong tìm kiếm không</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isClosed: false })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  !formData.isClosed
                                    ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", !formData.isClosed ? "opacity-100" : "opacity-40")}>Hiện</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", !formData.isClosed ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isClosed: true })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.isClosed
                                    ? (isDarkMode ? "bg-rose-500/10 border-rose-500 text-rose-400" : "bg-rose-50 border-rose-500 text-rose-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-rose-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.isClosed ? "opacity-100" : "opacity-40")}>Ẩn</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", formData.isClosed ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-slate-300")} />
                              </button>
                            </div>
                          </div>

                          {/* Status Setting */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-[24px] border transition-all",
                            isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-100 shadow-sm"
                          )}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={cn(
                                "p-2.5 rounded-xl",
                                isDarkMode ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-600"
                              )}>
                                <Activity size={20} />
                              </div>
                              <div>
                                <h4 className={cn("text-sm font-black uppercase tracking-widest", isDarkMode ? "text-slate-200" : "text-slate-700")}>Tình trạng hoạt động</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Trạng thái vận hành của bản ghi thuốc</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'active' })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.status !== 'suspended'
                                    ? (isDarkMode ? "bg-blue-500/10 border-blue-500 text-blue-400" : "bg-blue-50 border-blue-500 text-blue-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-blue-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.status !== 'suspended' ? "opacity-100" : "opacity-40")}>Hoạt động</span>
                                <Check size={14} className={formData.status !== 'suspended' ? "text-blue-500" : "text-slate-300"} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'suspended' })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.status === 'suspended'
                                    ? (isDarkMode ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-amber-50 border-amber-500 text-amber-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-amber-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.status === 'suspended' ? "opacity-100" : "opacity-40")}>Tạm ngưng</span>
                                <AlertTriangle size={14} className={formData.status === 'suspended' ? "text-amber-500" : "text-slate-300"} />
                              </button>
                            </div>
                          </div>

                          {/* Stock Status Setting */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-[24px] border transition-all",
                            isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-100 shadow-sm"
                          )}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={cn(
                                "p-2.5 rounded-xl",
                                isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
                              )}>
                                <Database size={20} />
                              </div>
                              <div>
                                <h4 className={cn("text-sm font-black uppercase tracking-widest", isDarkMode ? "text-slate-200" : "text-slate-700")}>Tình trạng số lượng</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Trạng thái tồn kho của sản phẩm</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, stockStatus: 'available' })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.stockStatus === 'available' || !formData.stockStatus
                                    ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.stockStatus === 'available' || !formData.stockStatus ? "opacity-100" : "opacity-40")}>Còn hàng</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", formData.stockStatus === 'available' || !formData.stockStatus ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, stockStatus: 'low' })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.stockStatus === 'low'
                                    ? (isDarkMode ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-amber-50 border-amber-500 text-amber-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-amber-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.stockStatus === 'low' ? "opacity-100" : "opacity-40")}>Sắp hết</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", formData.stockStatus === 'low' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-slate-300")} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, stockStatus: 'out' })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.stockStatus === 'out'
                                    ? (isDarkMode ? "bg-rose-500/10 border-rose-500 text-rose-400" : "bg-rose-50 border-rose-500 text-rose-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-rose-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.stockStatus === 'out' ? "opacity-100" : "opacity-40")}>Hết hàng</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", formData.stockStatus === 'out' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-slate-300")} />
                              </button>
                            </div>
                          </div>

                          {/* Expiry Status Setting */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-[24px] border transition-all",
                            isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-100 shadow-sm"
                          )}>
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"
                                )}>
                                  <Calendar size={20} />
                                </div>
                                <div>
                                  <h4 className={cn("text-sm font-black uppercase tracking-widest", isDarkMode ? "text-slate-200" : "text-slate-700")}>Tình trạng hạn dùng</h4>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Trạng thái hạn sử dụng của thuốc</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <label className={cn(
                                  "text-[10px] font-black uppercase tracking-widest hidden sm:block",
                                  isDarkMode ? "text-slate-400" : "text-slate-500"
                                )}>
                                  Ngày hết hạn
                                </label>
                                <input
                                  type="date"
                                  value={formData.expiryDate || ''}
                                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                  className={cn(
                                    "w-36 sm:w-40 px-3 py-2 rounded-xl text-sm font-medium transition-all focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none border",
                                    isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, expiryStatus: 'valid' })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.expiryStatus === 'valid' || !formData.expiryStatus
                                    ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.expiryStatus === 'valid' || !formData.expiryStatus ? "opacity-100" : "opacity-40")}>Còn hạn</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", formData.expiryStatus === 'valid' || !formData.expiryStatus ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, expiryStatus: 'expiring' })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.expiryStatus === 'expiring'
                                    ? (isDarkMode ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-amber-50 border-amber-500 text-amber-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-amber-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.expiryStatus === 'expiring' ? "opacity-100" : "opacity-40")}>Sắp hết hạn</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", formData.expiryStatus === 'expiring' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-slate-300")} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, expiryStatus: 'expired' })}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  formData.expiryStatus === 'expired'
                                    ? (isDarkMode ? "bg-rose-500/10 border-rose-500 text-rose-400" : "bg-rose-50 border-rose-500 text-rose-700 shadow-md translate-y-[-2px]")
                                    : (isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400 hover:border-rose-300")
                                )}
                              >
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.expiryStatus === 'expired' ? "opacity-100" : "opacity-40")}>Hết hạn</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", formData.expiryStatus === 'expired' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-slate-300")} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'dosage' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'indications' && (
                        <div className="pt-2 animate-in fade-in slide-in-from-left-4 duration-300 space-y-4 sm:space-y-5">
                          {/* Cơ chế tác dụng */}
                          <div className={cn(
                            "p-4 sm:p-5 rounded-2xl border transition-colors",
                            isDarkMode ? "bg-violet-900/10 border-violet-900/30" : "bg-violet-50/50 border-violet-100"
                          )}>
                            <label className={cn(
                              "block text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2",
                              isDarkMode ? "text-violet-400" : "text-violet-700"
                            )}>
                              <Zap size={14} />
                              Cơ chế tác dụng
                            </label>
                            <AutoExpandingTextarea
                              rows={2}
                              value={formData.mechanismOfAction || ''}
                              onChange={(e) => setFormData({ ...formData, mechanismOfAction: e.target.value })}
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none text-xs sm:text-sm font-medium",
                                isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600" : "bg-white border-violet-100 placeholder-slate-400"
                              )}
                              placeholder="Mô tả cơ chế tác dụng của thuốc, ví dụ: Ức chế enzym COX-2, giảm tổng hợp prostaglandin..."
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              <div className="w-1 h-3 sm:h-4 bg-blue-600 rounded-full"></div>
                              Chỉ định & Mã ICD-10
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  indications: [...(formData.indications || []), { title: '', content: '', icd10s: [] }]
                                });
                              }}
                              className={cn(
                                "text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all flex items-center gap-1",
                                isDarkMode ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              )}
                            >
                              <Plus size={12} /> Thêm
                            </button>
                          </div>

                          <div className="space-y-2 sm:space-y-3">
                            {(formData.indications || []).map((indication, index) => (
                              <div key={index} className={cn(
                                "flex gap-2 sm:gap-3 items-start p-3 sm:p-4 rounded-2xl border group relative transition-colors",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100",
                                indication.isPrimary && (isDarkMode ? "ring-2 ring-amber-500/50 bg-amber-900/10 border-amber-900/30" : "ring-2 ring-amber-500/50 bg-amber-50 border-amber-200")
                              )}>
                                <div className="flex flex-col gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...formData.indications];
                                      newList[index] = { ...newList[index], isPrimary: !newList[index].isPrimary };
                                      setFormData({ ...formData, indications: newList });
                                    }}
                                    className={cn(
                                      "p-2 rounded-xl transition-all hover:scale-110",
                                      indication.isPrimary
                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                                        : (isDarkMode ? "bg-slate-900 text-slate-600 hover:text-amber-400" : "bg-white text-slate-300 hover:text-amber-500 shadow-sm")
                                    )}
                                    title={indication.isPrimary ? "Chỉ định thường dùng" : "Ghim làm chỉ định thường dùng"}
                                  >
                                    <Star size={18} fill={indication.isPrimary ? "currentColor" : "none"} />
                                  </button>
                                </div>
                                <div className="flex-1 space-y-2 sm:space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên chỉ định (Nhãn)</label>
                                    <input
                                      type="text"
                                      value={indication.title || ''}
                                      onChange={(e) => {
                                        const newList = [...formData.indications];
                                        newList[index] = { ...newList[index], title: e.target.value };
                                        setFormData({ ...formData, indications: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 sm:px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm font-medium",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                      )}
                                      placeholder="Ví dụ: Chỉ định chính, Chỉ định thay thế..."
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung chỉ định</label>
                                    <AutoExpandingTextarea
                                      rows={2}
                                      value={indication.content}
                                      onChange={(e) => {
                                        const newList = [...formData.indications];
                                        newList[index] = { ...newList[index], content: e.target.value };
                                        setFormData({ ...formData, indications: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-xs sm:text-sm font-medium",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                      )}
                                      placeholder="Giảm đau, hạ sốt..."
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between ml-1">
                                      <label className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                        Mã ICD-10 gợi ý
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIcdLookupTarget({ type: 'indication', index });
                                          setIsIcdLookupOpen(true);
                                        }}
                                        className={cn(
                                          "text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors",
                                          isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                                        )}
                                      >
                                        <Database size={10} />
                                        Tra cứu ICD-10
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {(indication.icd10s || []).map((code, tagIdx) => {
                                        const codeOnly = code.split(' - ')[0];
                                        const isDefault = (indication.defaultIcd10s || []).includes(code) || indication.defaultIcd10 === code;
                                        return (
                                          <div
                                            key={tagIdx}
                                            className={cn(
                                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border animate-in fade-in zoom-in duration-200 transition-all",
                                              isDefault
                                                ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200"
                                                : isDarkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-100"
                                            )}
                                          >
                                            <button
                                              type="button"
                                              title={isDefault ? "Đang là ICD-10 thường dùng" : "Chọn làm ICD-10 thường dùng"}
                                              onClick={() => {
                                                const newList = [...formData.indications];
                                                const currentDefaults = newList[index].defaultIcd10s || (newList[index].defaultIcd10 ? [newList[index].defaultIcd10] : []);
                                                let nextDefaults;
                                                if (currentDefaults.includes(code)) {
                                                  nextDefaults = currentDefaults.filter(c => c !== code);
                                                } else {
                                                  nextDefaults = [...currentDefaults, code];
                                                }
                                                newList[index] = {
                                                  ...newList[index],
                                                  defaultIcd10s: nextDefaults,
                                                  defaultIcd10: nextDefaults[0] || undefined
                                                };
                                                setFormData({ ...formData, indications: newList });
                                              }}
                                              className={cn(
                                                "transition-colors shrink-0",
                                                isDefault ? "text-white" : (isDarkMode ? "text-blue-500 hover:text-amber-400" : "text-blue-400 hover:text-amber-500")
                                              )}
                                            >
                                              <Star size={9} fill={isDefault ? "currentColor" : "none"} />
                                            </button>
                                            {codeOnly}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newList = [...formData.indications];
                                                const nextDefaults = (newList[index].defaultIcd10s || []).filter(c => c !== code);
                                                newList[index] = {
                                                  ...newList[index],
                                                  icd10s: (newList[index].icd10s || []).filter((_, i) => i !== tagIdx),
                                                  defaultIcd10s: nextDefaults,
                                                  defaultIcd10: nextDefaults[0] || undefined
                                                };
                                                setFormData({ ...formData, indications: newList });
                                              }}
                                              className={cn(
                                                "transition-colors",
                                                isDefault ? "hover:text-amber-200" : "hover:text-rose-500"
                                              )}
                                            >
                                              <X size={10} />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {(indication.icd10s || []).length > 0 && (
                                      <div className={cn(
                                        "flex items-center gap-2 px-2 py-1 rounded-lg text-[9px] font-bold",
                                        indication.defaultIcd10
                                          ? (isDarkMode ? "text-amber-400" : "text-amber-600")
                                          : (isDarkMode ? "text-slate-500" : "text-slate-400")
                                      )}>
                                        <Star size={9} fill={indication.defaultIcd10 ? "currentColor" : "none"} />
                                        {indication.defaultIcd10
                                          ? `ICD-10 thường dùng: ${indication.defaultIcd10.split(' - ')[0]}`
                                          : "Nhấn ☆ trên mã ICD-10 để chọn làm mặc định khi kê toa"}
                                      </div>
                                    )}
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                      <input
                                        type="text"
                                        value={searchingIcdIndex === index ? icdQuery : ''}
                                        onChange={(e) => {
                                          setIcdQuery(e.target.value);
                                          setSearchingIcdIndex(index);
                                        }}
                                        onFocus={() => {
                                          setSearchingIcdIndex(index);
                                          setIcdQuery('');
                                        }}
                                        onBlur={() => {
                                          setTimeout(() => setSearchingIcdIndex(null), 200);
                                        }}
                                        className={cn(
                                          "w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm font-bold",
                                          isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                        )}
                                        placeholder="Tìm và thêm mã ICD-10..."
                                      />
                                      {searchingIcdIndex === index && (
                                        <div className={cn(
                                          "absolute z-50 w-full mt-1 border rounded-xl shadow-xl max-h-60 overflow-y-auto transition-colors",
                                          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                                        )}>
                                          {icdList
                                            .filter(icd =>
                                              (icd.code || '').toLowerCase().includes((icdQuery || '').toLowerCase()) ||
                                              (icd.description || '').toLowerCase().includes((icdQuery || '').toLowerCase())
                                            )
                                            .slice(0, 50)
                                            .map(icd => (
                                              <button
                                                key={icd.code}
                                                type="button"
                                                onClick={() => {
                                                  const newList = [...formData.indications];
                                                  const codeStr = `${icd.code} - ${icd.description}`;
                                                  const currentIcds = newList[index].icd10s || [];
                                                  if (!currentIcds.includes(codeStr)) {
                                                    newList[index] = {
                                                      ...newList[index],
                                                      icd10s: [...currentIcds, codeStr]
                                                    };
                                                    setFormData({ ...formData, indications: newList });
                                                  }
                                                  setSearchingIcdIndex(null);
                                                  setIcdQuery('');
                                                }}
                                                className={cn(
                                                  "w-full text-left px-3 sm:px-4 py-2 text-[10px] sm:text-xs transition-colors border-b last:border-0",
                                                  isDarkMode ? "hover:bg-slate-700 border-slate-700" : "hover:bg-blue-50 border-slate-50"
                                                )}
                                              >
                                                <span className="font-bold text-blue-600">{icd.code}</span>
                                                <span className={cn("ml-2", isDarkMode ? "text-slate-400" : "text-slate-600")}>- {icd.description}</span>
                                              </button>
                                            ))
                                          }
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 mt-4 sm:mt-6">
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('indications', index, 'up')}
                                    disabled={index === 0}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === 0 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('indications', index, 'down')}
                                    disabled={index === formData.indications.length - 1}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === formData.indications.length - 1 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = formData.indications.filter((_, i) => i !== index);
                                    setFormData({ ...formData, indications: newList });
                                  }}
                                  className={cn(
                                    "mt-5 sm:mt-6 p-1.5 sm:p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                                    isDarkMode ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/20" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                  )}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'administration' && (
                        <div className="pt-2 sm:pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              <div className="w-1 h-3 sm:h-4 bg-blue-600 rounded-full"></div>
                              Liều lượng & Cách dùng
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.dosageAndAdministration || [];
                                setFormData({
                                  ...formData,
                                  dosageAndAdministration: [...current, { category: '', content: '' }]
                                });
                              }}
                              className={cn(
                                "text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all flex items-center gap-1",
                                isDarkMode ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              )}
                            >
                              <Plus size={12} /> Thêm
                            </button>
                          </div>
                          <div className="space-y-3 sm:space-y-4">
                            <div className={cn(
                              "p-3 sm:p-5 rounded-2xl border shadow-sm transition-colors",
                              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                            )}>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cách dùng chung (Tất cả đối tượng)</label>
                              <AutoExpandingTextarea
                                rows={1}
                                className={cn(
                                  "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                                  isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                )}
                                value={formData.generalAdministration || ''}
                                onChange={(e) => setFormData({ ...formData, generalAdministration: e.target.value })}
                                placeholder="Ví dụ: Uống sau bữa ăn 30 phút, sáng và tối..."
                              />
                            </div>

                            {(formData.dosageAndAdministration || []).map((item, index) => (
                              <div key={index} className={cn(
                                "p-3 sm:p-5 rounded-2xl border shadow-sm space-y-3 sm:space-y-4 relative group transition-colors",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                              )}>
                                <div className="flex flex-col gap-1 absolute top-3 sm:top-4 right-10 sm:right-12">
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('dosageAndAdministration', index, 'up')}
                                    disabled={index === 0}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === 0 ? "invisible" : (isDarkMode ? "text-slate-600 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('dosageAndAdministration', index, 'down')}
                                    disabled={index === (formData.dosageAndAdministration || []).length - 1}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === (formData.dosageAndAdministration || []).length - 1 ? "invisible" : (isDarkMode ? "text-slate-600 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronDown size={16} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = (formData.dosageAndAdministration || []).filter((_, i) => i !== index);
                                    setFormData({ ...formData, dosageAndAdministration: newList });
                                  }}
                                  className={cn(
                                    "absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 transition-all opacity-0 group-hover:opacity-100 rounded-lg",
                                    isDarkMode ? "text-slate-600 hover:text-red-400 hover:bg-red-900/20" : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                                  )}
                                >
                                  <Trash2 size={16} />
                                </button>
                                <div className="w-full">
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Đối tượng / Phân loại</label>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {[
                                      'Người lớn',
                                      'Trẻ em',
                                      'Trẻ em < 2 tuổi',
                                      'Trẻ em 2-12 tuổi',
                                      'Người cao tuổi',
                                      'Suy gan',
                                      'Suy thận',
                                      'Phụ nữ có thai',
                                      'Phụ nữ cho con bú'
                                    ].map(cat => (
                                      <button
                                        key={cat}
                                        type="button"
                                        onClick={() => {
                                          const newList = [...(formData.dosageAndAdministration || [])];
                                          newList[index].category = cat;
                                          setFormData({ ...formData, dosageAndAdministration: newList });
                                        }}
                                        className={cn(
                                          "text-[8px] font-black uppercase px-2 py-0.5 rounded-full transition-all border",
                                          item.category === cat
                                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                            : (isDarkMode ? "bg-slate-700 border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500/50" : "bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300")
                                        )}
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Người lớn, Trẻ em..."
                                    value={item.category || ''}
                                    onChange={(e) => {
                                      const newList = [...(formData.dosageAndAdministration || [])];
                                      newList[index].category = e.target.value;
                                      setFormData({ ...formData, dosageAndAdministration: newList });
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm transition-colors",
                                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                                    )}
                                  />
                                </div>

                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Hướng dẫn sử dụng chi tiết</label>
                                  <AutoExpandingTextarea
                                    rows={3}
                                    placeholder="Nội dung liều dùng chi tiết..."
                                    value={item.content || ''}
                                    onChange={(e) => {
                                      const newList = [...(formData.dosageAndAdministration || [])];
                                      newList[index].content = e.target.value;
                                      setFormData({ ...formData, dosageAndAdministration: newList });
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm transition-colors",
                                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-200"
                                    )}
                                  />
                                </div>

                                <div className={cn(
                                  "p-2 sm:p-3 rounded-xl border border-dashed transition-colors",
                                  isDarkMode ? "bg-slate-900/30 border-slate-800" : "bg-slate-50/50 border-slate-200"
                                )}>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Liều lượng theo cử (Sáng - Trưa - Chiều - Tối)</label>
                                  <div className="grid grid-cols-4 gap-2">
                                    {[
                                      { label: 'Sáng', key: 'morning', icon: <Zap size={12} className="text-amber-500" /> },
                                      { label: 'Trưa', key: 'noon', icon: <Star size={12} className="text-orange-500" /> },
                                      { label: 'Chiều', key: 'afternoon', icon: <Star size={12} className="text-blue-400" /> },
                                      { label: 'Tối', key: 'night', icon: <Clock size={12} className="text-indigo-500" /> }
                                    ].map((time) => (
                                      <div key={time.key}>
                                        <div className="flex items-center gap-1 mb-1 px-1">
                                          {time.icon}
                                          <span className="text-[8px] font-black uppercase text-slate-500">{time.label}</span>
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="1"
                                          value={(item as any)[time.key] || ''}
                                          onChange={(e) => {
                                            const newList = [...(formData.dosageAndAdministration || [])];
                                            (newList[index] as any)[time.key] = e.target.value;
                                            setFormData({ ...formData, dosageAndAdministration: newList });
                                          }}
                                          className={cn(
                                            "w-full px-2 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center shadow-sm",
                                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-100 text-slate-900"
                                          )}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'warnings' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'contra' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300 pt-2 text-rose-500">
                          <div className={cn(
                            "border rounded-2xl p-4 sm:p-6 transition-colors",
                            isDarkMode ? "bg-rose-900/10 border-rose-900/30" : "bg-rose-50/30 border-rose-100"
                          )}>
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-rose-400" : "text-rose-700")}>
                                <ShieldAlert size={16} className="sm:w-[18px] sm:h-[18px]" />
                                Chống chỉ định
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = [...(formData.contraindications || [])];
                                  newList.push({
                                    content: '',
                                    type: 'Other',
                                    ageConfig: { operator: '≤', value: '' }
                                  });
                                  setFormData({ ...formData, contraindications: newList });
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-white rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-sm",
                                  isDarkMode ? "bg-rose-700 hover:bg-rose-800" : "bg-rose-600 hover:bg-rose-700"
                                )}
                              >
                                <Plus size={12} />
                                Thêm
                              </button>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                              {(formData.contraindications || []).map((contra, index) => (
                                <div key={index} className={cn(
                                  "flex gap-2 sm:gap-3 items-start p-3 sm:p-4 rounded-2xl border group relative transition-colors",
                                  isDarkMode ? "bg-slate-800 border-rose-900/20" : "bg-white border-rose-50"
                                )}>
                                  <div className="flex-1 space-y-2 sm:space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                      <div className="sm:col-span-1 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phân loại</label>
                                        <select
                                          value={contra.type || 'Other'}
                                          onChange={(e) => {
                                            const newType = e.target.value as any;
                                            const newList = [...formData.contraindications];
                                            newList[index] = {
                                              ...newList[index],
                                              type: newType,
                                              ageConfig: newType === 'Age' && !newList[index].ageConfig
                                                ? { operator: '≤', value: '' }
                                                : newList[index].ageConfig
                                            };
                                            setFormData({ ...formData, contraindications: newList });
                                          }}
                                          className={cn(
                                            "w-full px-2 sm:px-3 py-2.5 sm:py-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-xs sm:text-sm font-bold",
                                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                          )}
                                        >
                                          <option value="Drug" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Thuốc</option>
                                          <option value="ICD-10" className={isDarkMode ? "bg-slate-900" : "bg-white"}>ICD-10</option>
                                          <option value="Weight" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Cân nặng</option>
                                          <option value="Age" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Tuổi</option>
                                          <option value="Other" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Khác</option>
                                        </select>
                                      </div>
                                      <div className="sm:col-span-2 space-y-4">
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between ml-1">
                                            <label className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                              Nội dung chống chỉ định
                                            </label>
                                          </div>
                                          <AutoExpandingTextarea
                                            rows={2}
                                            value={contra.content || ''}
                                            onChange={(e) => {
                                              const newList = [...formData.contraindications];
                                              newList[index] = { ...newList[index], content: e.target.value };
                                              setFormData({ ...formData, contraindications: newList });
                                            }}
                                            className={cn(
                                              "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-xs sm:text-sm font-medium",
                                              isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600" : "bg-white border-slate-200 placeholder-slate-400"
                                            )}
                                            placeholder={
                                              contra.type === 'Drug' ? "Tên thuốc tương tác ngược..." :
                                                contra.type === 'Weight' ? "Cân nặng cụ thể (VD: < 40kg)..." :
                                                  contra.type === 'Age' ? "Độ tuổi (VD: Trẻ em ≤ 12 tuổi)..." :
                                                    "Nhập nội dung chi tiết..."
                                            }
                                          />

                                          {contra.type === 'Age' && (
                                            <div className="mt-3 p-3 rounded-xl border border-dashed flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-300"
                                              style={{ borderColor: isDarkMode ? 'rgba(244, 63, 94, 0.4)' : 'rgba(225, 29, 72, 0.2)' }}>
                                              <div className="space-y-1 w-24">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">So sánh</label>
                                                <select
                                                  value={contra.ageConfig?.operator || '≤'}
                                                  onChange={(e) => {
                                                    const newList = [...formData.contraindications];
                                                    const ageVal = contra.ageConfig?.value || '';
                                                    const unit = contra.ageConfig?.unit || 'years';
                                                    const op = e.target.value;
                                                    newList[index] = {
                                                      ...newList[index],
                                                      ageConfig: { operator: op as any, value: ageVal as any, unit: unit as any },
                                                      content: ageVal !== '' ? `Tuổi ${op} ${ageVal} ${unit === 'months' ? 'tháng' : 'tuổi'}` : newList[index].content
                                                    };
                                                    setFormData({ ...formData, contraindications: newList });
                                                  }}
                                                  className={cn(
                                                    "w-full px-3 py-2.5 border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500",
                                                    isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                                  )}
                                                >
                                                  <option value="<">{'<'}</option>
                                                  <option value=">">{'>'}</option>
                                                  <option value="≤">{'≤'}</option>
                                                  <option value="≥">{'≥'}</option>
                                                </select>
                                              </div>
                                              <div className="flex gap-2 items-end">
                                                <div className="space-y-1 w-24">
                                                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Số lượng</label>
                                                  <input
                                                    type="number"
                                                    value={contra.ageConfig?.value || ''}
                                                    onChange={(e) => {
                                                      const valStr = e.target.value;
                                                      const val = valStr === '' ? '' : parseInt(valStr);
                                                      const newList = [...formData.contraindications];
                                                      const op = contra.ageConfig?.operator || '≤';
                                                      const unit = contra.ageConfig?.unit || 'years';
                                                      newList[index] = {
                                                        ...newList[index],
                                                        ageConfig: { operator: op as any, value: val as any, unit: unit as any },
                                                        content: val !== '' ? `Tuổi ${op} ${val} ${unit === 'months' ? 'tháng' : 'tuổi'}` : newList[index].content
                                                      };
                                                      setFormData({ ...formData, contraindications: newList });
                                                    }}
                                                    placeholder="VD: 12"
                                                    className={cn(
                                                      "w-full px-3 py-2.5 border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500",
                                                      isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                                    )}
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <select
                                                    value={contra.ageConfig?.unit || 'years'}
                                                    onChange={(e) => {
                                                      const unit = e.target.value as 'years' | 'months';
                                                      const newList = [...formData.contraindications];
                                                      const op = contra.ageConfig?.operator || '≤';
                                                      const val = contra.ageConfig?.value || '';
                                                      newList[index] = {
                                                        ...newList[index],
                                                        ageConfig: { operator: op as any, value: val as any, unit },
                                                        content: val !== '' ? `Tuổi ${op} ${val} ${unit === 'months' ? 'tháng' : 'tuổi'}` : newList[index].content
                                                      };
                                                      setFormData({ ...formData, contraindications: newList });
                                                    }}
                                                    className={cn(
                                                      "px-2 py-2.5 border rounded-lg text-[10px] font-black uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500",
                                                      isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                                    )}
                                                  >
                                                    <option value="years">Tuổi (Năm)</option>
                                                    <option value="months">Tháng</option>
                                                  </select>
                                                </div>
                                              </div>
                                              {typeof contra.ageConfig?.value === 'number' && (
                                                <div className="flex-1 space-y-1">
                                                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Mốc sinh (Gợi ý)</label>
                                                  <div className={cn(
                                                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-black border",
                                                    isDarkMode
                                                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                                      : "bg-rose-50 border-rose-100 text-rose-600 shadow-sm"
                                                  )}>
                                                    <Calendar size={12} className="shrink-0" />
                                                    <span>
                                                      {(() => {
                                                        const d = new Date();
                                                        if (contra.ageConfig.unit === 'months') {
                                                          d.setMonth(d.getMonth() - contra.ageConfig.value);
                                                        } else {
                                                          d.setFullYear(d.getFullYear() - contra.ageConfig.value);
                                                        }
                                                        return d.toLocaleDateString('vi-VN');
                                                      })()}
                                                    </span>
                                                    <span className="opacity-50 text-[10px] font-medium">(Nay: {new Date().toLocaleDateString('vi-VN')})</span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between ml-1">
                                            <label className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                              {contra.type === 'ICD-10' ? "Mã ICD-10 gợi ý" : ""}
                                            </label>
                                            {contra.type === 'ICD-10' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setIcdLookupTarget({ type: 'contraindication', index });
                                                  setIsIcdLookupOpen(true);
                                                }}
                                                className={cn(
                                                  "text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors",
                                                  isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                                                )}
                                              >
                                                <Database size={10} />
                                                Tra cứu ICD-10
                                              </button>
                                            )}
                                          </div>

                                          {contra.type === 'ICD-10' && (
                                            <>
                                              <div className="flex flex-wrap gap-1 mb-2">
                                                {(contra.icd10s || []).map((code, tagIdx) => (
                                                  <div
                                                    key={tagIdx}
                                                    className={cn(
                                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border animate-in fade-in zoom-in duration-200 transition-all",
                                                      isDarkMode ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-100"
                                                    )}
                                                  >
                                                    {code.split(' - ')[0]}
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const newList = [...formData.contraindications];
                                                        newList[index] = {
                                                          ...newList[index],
                                                          icd10s: (newList[index].icd10s || []).filter((_, i) => i !== tagIdx)
                                                        };
                                                        setFormData({ ...formData, contraindications: newList });
                                                      }}
                                                      className="hover:text-rose-500 transition-colors"
                                                    >
                                                      <X size={10} />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>

                                              <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                                <input
                                                  type="text"
                                                  value={searchingContraIcdIndex === index ? icdQuery : ''}
                                                  onFocus={() => {
                                                    setSearchingContraIcdIndex(index);
                                                    setIcdQuery('');
                                                  }}
                                                  onChange={(e) => {
                                                    setIcdQuery(e.target.value);
                                                    setSearchingContraIcdIndex(index);
                                                  }}
                                                  onBlur={() => {
                                                    setTimeout(() => setSearchingContraIcdIndex(null), 200);
                                                  }}
                                                  className={cn(
                                                    "w-full px-3 sm:px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-[11px] sm:text-xs font-medium pl-8 sm:pl-9",
                                                    isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600" : "bg-white border-slate-200 placeholder-slate-400"
                                                  )}
                                                  placeholder="Tìm nhanh mã ICD-10 để gán..."
                                                />
                                                {searchingContraIcdIndex === index && icdQuery && (
                                                  <div className={cn(
                                                    "absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-xl max-h-48 overflow-y-auto overflow-x-hidden",
                                                    isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                                                  )}>
                                                    {icdList
                                                      .filter(icd => (icd.code || '').toLowerCase().includes(icdQuery.toLowerCase()) || (icd.description || '').toLowerCase().includes(icdQuery.toLowerCase()))
                                                      .slice(0, 50)
                                                      .map((icd, icdIdx) => (
                                                        <button
                                                          key={icdIdx}
                                                          type="button"
                                                          onClick={() => {
                                                            const newList = [...formData.contraindications];
                                                            const currentIcd10s = newList[index].icd10s || [];
                                                            const fullCode = `${icd.code} - ${icd.description}`;
                                                            if (!currentIcd10s.includes(fullCode)) {
                                                              newList[index] = {
                                                                ...newList[index],
                                                                icd10s: [...currentIcd10s, fullCode]
                                                              };
                                                              setFormData({ ...formData, contraindications: newList });
                                                            }
                                                            setIcdQuery('');
                                                            setSearchingContraIcdIndex(null);
                                                          }}
                                                          className={cn(
                                                            "w-full text-left px-3 sm:px-4 py-2 text-[10px] sm:text-xs hover:bg-rose-500 hover:text-white transition-colors border-b last:border-b-0",
                                                            isDarkMode ? "border-slate-800" : "border-slate-100"
                                                          )}
                                                        >
                                                          <span className="font-bold">{icd.code}</span> - {icd.description}
                                                        </button>
                                                      ))}
                                                  </div>
                                                )}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 mt-5 sm:mt-6">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('contraindications', index, 'up')}
                                      disabled={index === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        index === 0 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                      )}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('contraindications', index, 'down')}
                                      disabled={index === formData.contraindications.length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        index === formData.contraindications.length - 1 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                      )}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = formData.contraindications.filter((_, i) => i !== index);
                                      setFormData({ ...formData, contraindications: newList });
                                    }}
                                    className={cn(
                                      "mt-5 sm:mt-6 p-1.5 sm:p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                                      isDarkMode ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/20" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                    )}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'adr' && (
                        <div className="pt-2 sm:pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <label className={cn("block text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2", isDarkMode ? "text-amber-400" : "text-amber-700")}>
                              <Info size={16} />
                              Tác dụng không mong muốn (ADR)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const current = (Array.isArray(formData.sideEffects) ? formData.sideEffects : []) as any[];
                                setFormData({
                                  ...formData,
                                  sideEffects: [...current, { frequency: '', content: '' }]
                                });
                              }}
                              className={cn(
                                "text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all flex items-center gap-1",
                                isDarkMode ? "bg-amber-900/30 text-amber-400 hover:bg-amber-900/50" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                              )}
                            >
                              <Plus size={12} /> Thêm nhóm
                            </button>
                          </div>

                          <div className="space-y-4">
                            {(Array.isArray(formData.sideEffects) ? (formData.sideEffects as any[]) : []).map((se, index) => (
                              <div key={index} className={cn(
                                "p-4 rounded-2xl border shadow-sm space-y-3 relative group transition-colors",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                              )}>
                                <div className="flex flex-col gap-1 absolute top-3 right-10">
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('sideEffects', index, 'up')}
                                    disabled={index === 0}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === 0 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('sideEffects', index, 'down')}
                                    disabled={index === (formData.sideEffects as any[]).length - 1}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === (formData.sideEffects as any[]).length - 1 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = [...(formData.sideEffects as any[])];
                                    newList.splice(index, 1);
                                    setFormData({ ...formData, sideEffects: newList });
                                  }}
                                  className={cn(
                                    "absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 rounded-lg",
                                    isDarkMode ? "hover:bg-rose-900/20" : "hover:bg-rose-50"
                                  )}
                                >
                                  <X size={14} />
                                </button>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="sm:col-span-1">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tần suất</label>
                                    <select
                                      value={se.frequency || ''}
                                      onChange={(e) => {
                                        const newList = [...(formData.sideEffects as any[])];
                                        newList[index] = { ...newList[index], frequency: e.target.value };
                                        setFormData({ ...formData, sideEffects: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2.5 sm:py-3.5 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold transition-colors",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200"
                                      )}
                                    >
                                      <option value="">-- Chọn tần suất --</option>
                                      <option value="Thường gặp (ADR > 1/100)">Thường gặp (&gt;1/100)</option>
                                      <option value="Ít gặp (1/1000 < ADR < 1/100)">Ít gặp (1/1000 - 1/100)</option>
                                      <option value="Hiếm gặp (ADR < 1/1000)">Hiếm gặp (&lt;1/1000)</option>
                                      <option value="Rất hiếm gặp (ADR < 1/10000)">Rất hiếm gặp</option>
                                      <option value="Chưa xác định">Chưa xác định</option>
                                    </select>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nội dung tác dụng phụ</label>
                                    <AutoExpandingTextarea
                                      rows={4}
                                      value={se.content || ''}
                                      onChange={(e) => {
                                        const newList = [...(formData.sideEffects as any[])];
                                        newList[index] = { ...newList[index], content: e.target.value };
                                        setFormData({ ...formData, sideEffects: newList });
                                      }}
                                      placeholder="Rối loạn tiêu hóa, nhức đầu..."
                                      className={cn(
                                        "w-full px-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none text-xs sm:text-sm font-medium",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200"
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(Array.isArray(formData.sideEffects) ? (formData.sideEffects as any[]) : []).length === 0 && (
                              <div className={cn(
                                "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl",
                                isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
                              )}>
                                <Info size={32} className="mb-2 opacity-20" />
                                <p className="text-sm font-medium italic">Chưa có thông tin tác dụng phụ theo nhóm. Nhấn "Thêm nhóm" để bắt đầu.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'special' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          {[
                            { label: 'Thận trọng', key: 'precautions', icon: <ShieldAlert size={14} />, color: 'amber', type: 'textarea' },
                            { label: 'Phụ nữ có thai', key: 'pregnancy', icon: <Heart size={14} />, color: 'rose', type: 'select', options: ['An toàn', 'Chưa thiết lập', 'Cân nhắc lợi ích', 'Không an toàn'] },
                            { label: 'Phụ nữ cho con bú', key: 'lactation', icon: <Baby size={14} />, color: 'pink', type: 'select', options: ['An toàn', 'Chưa thiết lập', 'Cân nhắc lợi ích', 'Không an toàn'] },
                            { label: 'Vận hành máy móc', key: 'driving', icon: <Car size={14} />, color: 'slate', type: 'select', options: ['An toàn', 'Không an toàn'] },
                            { label: 'Quá liều - Xử trí', key: 'overdose', icon: <AlertTriangle size={14} />, color: 'red', type: 'textarea' },
                          ].map((field) => (
                            <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                              <label className={cn(`block text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2`, isDarkMode ? `text-${field.color}-400` : `text-${field.color}-700`)}>
                                {field.icon}
                                {field.label}
                              </label>
                              {field.type === 'select' ? (
                                <select
                                  value={(formData as any)[field.key] || (field.options ? field.options[0] : '')}
                                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                  className={cn(
                                    `w-full px-3 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-${field.color}-500 transition-all text-xs sm:text-sm font-bold`,
                                    isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : `bg-${field.color}-50/30 border-${field.color}-100`
                                  )}
                                >
                                  {field.options?.map(opt => (
                                    <option key={opt} value={opt} className={isDarkMode ? "bg-slate-900" : "bg-white"}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <AutoExpandingTextarea
                                  rows={5}
                                  value={(formData as any)[field.key] || ''}
                                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                  className={cn(
                                    `w-full px-3 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-${field.color}-500 transition-all resize-none text-xs sm:text-sm font-medium`,
                                    isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : `bg-${field.color}-50/30 border-${field.color}-100`
                                  )}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'pharmacology' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'interactions' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                          {/* Tương tác cụ thể */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-2xl border transition-colors",
                            isDarkMode ? "bg-indigo-900/10 border-indigo-900/20" : "bg-indigo-50/30 border-indigo-100"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                                <Zap size={16} className="sm:w-[18px] sm:h-[18px]" />
                                Tương tác thuốc cụ thể
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = [...(formData.specificInteractions || [])];
                                  newList.push({ target: '', content: '' });
                                  setFormData({ ...formData, specificInteractions: newList });
                                }}
                                className={cn(
                                  "flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all",
                                  isDarkMode ? "text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50" : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                                )}
                              >
                                <Plus size={12} /> Thêm
                              </button>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              {(formData.specificInteractions || []).map((item, index) => (
                                <div key={index} className={cn(
                                  "p-3 sm:p-4 rounded-2xl border shadow-sm space-y-2 sm:space-y-3 relative group transition-colors",
                                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                                )}>
                                  <div className="flex flex-col gap-1 absolute top-3 sm:top-4 right-10 sm:right-12">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('specificInteractions', index, 'up')}
                                      disabled={index === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        index === 0 ? "invisible" : (isDarkMode ? "text-slate-600 hover:text-indigo-400 hover:bg-slate-700" : "text-slate-300 hover:text-indigo-600 hover:bg-slate-50")
                                      )}
                                    >
                                      <ChevronUp size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('specificInteractions', index, 'down')}
                                      disabled={index === (formData.specificInteractions || []).length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        index === (formData.specificInteractions || []).length - 1 ? "invisible" : (isDarkMode ? "text-slate-600 hover:text-indigo-400 hover:bg-slate-700" : "text-slate-300 hover:text-indigo-600 hover:bg-slate-50")
                                      )}
                                    >
                                      <ChevronDown size={16} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = (formData.specificInteractions || []).filter((_, i) => i !== index);
                                      setFormData({ ...formData, specificInteractions: newList });
                                    }}
                                    className={cn(
                                      "absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 transition-all opacity-0 group-hover:opacity-100 rounded-lg",
                                      isDarkMode ? "text-slate-600 hover:text-red-400 hover:bg-red-900/20" : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                                    )}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <div className="w-full">
                                    <label className={cn("block text-[9px] font-bold uppercase mb-1 transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Đối tượng tương tác</label>
                                    <input
                                      type="text"
                                      value={item.target || ''}
                                      onChange={(e) => {
                                        const newList = [...(formData.specificInteractions || [])];
                                        newList[index].target = e.target.value;
                                        setFormData({ ...formData, specificInteractions: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-colors",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                                      )}
                                      placeholder="Ví dụ: Simvastatin..."
                                    />
                                  </div>
                                  <div>
                                    <label className={cn("block text-[9px] font-bold uppercase mb-1 transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Nội dung tương tác</label>
                                    <AutoExpandingTextarea
                                      rows={4}
                                      value={item.content || ''}
                                      onChange={(e) => {
                                        const newList = [...(formData.specificInteractions || [])];
                                        newList[index].content = e.target.value;
                                        setFormData({ ...formData, specificInteractions: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200"
                                      )}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tương tác chung */}
                          <div>
                            <label className={cn("block text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                              <RefreshCw size={16} />
                              Tương tác chung
                            </label>
                            <AutoExpandingTextarea
                              rows={5}
                              value={formData.interactions || ''}
                              onChange={(e) => setFormData({ ...formData, interactions: e.target.value })}
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all resize-none font-medium",
                                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300 focus:ring-indigo-900/50" : "bg-indigo-50/30 border-indigo-100 focus:ring-indigo-500"
                              )}
                              placeholder="Nhập các tương tác thuốc chung..."
                            />
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'properties' && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                          {/* Dược lực học */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-2xl border transition-colors",
                            isDarkMode ? "bg-emerald-900/10 border-emerald-900/20" : "bg-emerald-50/30 border-emerald-100"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <label className={cn("block text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                                <Activity size={16} />
                                Dược lực học
                              </label>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, pharmacodynamics: [...(Array.isArray(formData.pharmacodynamics) ? formData.pharmacodynamics : []), { category: '', content: '' }] })}
                                className={cn(
                                  "text-[10px] font-black uppercase transition-colors flex items-center gap-1",
                                  isDarkMode ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"
                                )}
                              >
                                <Plus size={14} /> Thêm phân loại
                              </button>
                            </div>
                            <div className="space-y-3">
                              {(Array.isArray(formData.pharmacodynamics) ? formData.pharmacodynamics : []).map((item: any, idx) => (
                                <div key={idx} className={cn(
                                  "p-4 rounded-2xl border transition-all relative group shadow-sm",
                                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-emerald-50/30 border-emerald-100/50"
                                )}>
                                  <div className="flex flex-col gap-1 absolute top-2 right-8">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('pharmacodynamics', idx, 'up')}
                                      disabled={idx === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        idx === 0 ? "invisible" : (isDarkMode ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-400 hover:text-emerald-600")
                                      )}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('pharmacodynamics', idx, 'down')}
                                      disabled={idx === (formData.pharmacodynamics as any[]).length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        idx === (formData.pharmacodynamics as any[]).length - 1 ? "invisible" : (isDarkMode ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-400 hover:text-emerald-600")
                                      )}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...(formData.pharmacodynamics as any[])];
                                      newList.splice(idx, 1);
                                      setFormData({ ...formData, pharmacodynamics: newList });
                                    }}
                                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                  <input
                                    type="text"
                                    placeholder="Phân loại (Ví dụ: Cơ chế tác dụng, Tác động lâm sàng...)"
                                    value={item.category}
                                    onChange={(e) => {
                                      const newList = [...(formData.pharmacodynamics as any[])];
                                      newList[idx].category = e.target.value;
                                      setFormData({ ...formData, pharmacodynamics: newList });
                                    }}
                                    className={cn(
                                      "w-full mb-2 bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-wider focus:ring-0 placeholder:text-slate-500",
                                      isDarkMode ? "text-emerald-400" : "text-emerald-600"
                                    )}
                                  />
                                  <AutoExpandingTextarea
                                    rows={4}
                                    placeholder="Nội dung chi tiết cho phân loại này..."
                                    value={item.content}
                                    onChange={(e) => {
                                      const newList = [...(formData.pharmacodynamics as any[])];
                                      newList[idx].content = e.target.value;
                                      setFormData({ ...formData, pharmacodynamics: newList });
                                    }}
                                    className={cn(
                                      "w-full bg-transparent border-none p-0 text-xs sm:text-sm focus:ring-0 resize-none font-medium",
                                      isDarkMode ? "text-slate-300 placeholder:text-slate-700" : "text-slate-700 placeholder:text-slate-400"
                                    )}
                                  />
                                </div>
                              ))}
                              {(Array.isArray(formData.pharmacodynamics) ? formData.pharmacodynamics : []).length === 0 && (
                                <p className="text-[10px] text-slate-500 italic text-center py-2">Chưa có phân loại dược lực học nào.</p>
                              )}
                            </div>
                          </div>

                          {/* Dược động học */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-2xl border transition-colors",
                            isDarkMode ? "bg-blue-900/10 border-blue-900/20" : "bg-blue-50/30 border-blue-100"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <label className={cn("block text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                                <MoveRight size={16} />
                                Dược động học
                              </label>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, pharmacokinetics: [...(Array.isArray(formData.pharmacokinetics) ? formData.pharmacokinetics : []), { category: '', content: '' }] })}
                                className={cn(
                                  "text-[10px] font-black uppercase transition-colors flex items-center gap-1",
                                  isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                                )}
                              >
                                <Plus size={14} /> Thêm phân loại
                              </button>
                            </div>
                            <div className="space-y-3">
                              {(Array.isArray(formData.pharmacokinetics) ? formData.pharmacokinetics : []).map((item: any, idx) => (
                                <div key={idx} className={cn(
                                  "p-4 rounded-2xl border transition-all relative group shadow-sm",
                                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-blue-50/30 border-blue-100/50"
                                )}>
                                  <div className="flex flex-col gap-1 absolute top-2 right-8">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('pharmacokinetics', idx, 'up')}
                                      disabled={idx === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        idx === 0 ? "invisible" : (isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-400 hover:text-blue-600")
                                      )}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('pharmacokinetics', idx, 'down')}
                                      disabled={idx === (formData.pharmacokinetics as any[]).length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        idx === (formData.pharmacokinetics as any[]).length - 1 ? "invisible" : (isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-400 hover:text-blue-600")
                                      )}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...(formData.pharmacokinetics as any[])];
                                      newList.splice(idx, 1);
                                      setFormData({ ...formData, pharmacokinetics: newList });
                                    }}
                                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                  <input
                                    type="text"
                                    placeholder="Phân loại (Ví dụ: Hấp thu, Phân bố, Chuyển hóa, Thải trừ...)"
                                    value={item.category}
                                    onChange={(e) => {
                                      const newList = [...(formData.pharmacokinetics as any[])];
                                      newList[idx].category = e.target.value;
                                      setFormData({ ...formData, pharmacokinetics: newList });
                                    }}
                                    className={cn(
                                      "w-full mb-2 bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-wider focus:ring-0 placeholder:text-slate-500",
                                      isDarkMode ? "text-blue-400" : "text-blue-600"
                                    )}
                                  />
                                  <AutoExpandingTextarea
                                    rows={4}
                                    placeholder="Nội dung chi tiết cho phân loại này..."
                                    value={item.content}
                                    onChange={(e) => {
                                      const newList = [...(formData.pharmacokinetics as any[])];
                                      newList[idx].content = e.target.value;
                                      setFormData({ ...formData, pharmacokinetics: newList });
                                    }}
                                    className={cn(
                                      "w-full bg-transparent border-none p-0 text-xs sm:text-sm focus:ring-0 resize-none font-medium",
                                      isDarkMode ? "text-slate-300 placeholder:text-slate-700" : "text-slate-700 placeholder:text-slate-400"
                                    )}
                                  />
                                </div>
                              ))}
                              {(Array.isArray(formData.pharmacokinetics) ? formData.pharmacokinetics : []).length === 0 && (
                                <p className="text-[10px] text-slate-500 italic text-center py-2">Chưa có phân loại dược động học nào.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && extractedData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsReviewModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-6 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "border-slate-800 bg-indigo-900/10" : "border-slate-100 bg-indigo-50/50"
              )}>
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Xác nhận kết quả AI</h3>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Trích xuất từ tài liệu PDF</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className={cn("p-2 rounded-xl transition-colors", isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500")}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-8 transition-colors max-h-[calc(85vh-180px)] custom-scrollbar">
                {/* Status Hero */}
                <div className={cn(
                  "p-6 rounded-[28px] border-2 border-dashed transition-colors flex flex-col items-center text-center gap-3",
                  isDarkMode ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"
                )}>
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 animate-pulse">
                    <Check size={28} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className={cn("text-base font-black transition-colors", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>Dữ liệu sẵn sàng!</h4>
                    <p className={cn("text-xs font-semibold opacity-80", isDarkMode ? "text-slate-400" : "text-slate-600")}>AI đã phân tích và chuẩn hóa cấu trúc dữ liệu cho bạn.</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Primary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={cn("p-5 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/40 border-slate-750" : "bg-white border-slate-200 shadow-sm")}>
                      <div className="flex items-center gap-2 mb-3">
                        <Pill size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tên thuốc</span>
                      </div>
                      <p className={cn("text-base font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{extractedData.name || 'N/A'}</p>
                    </div>
                    <div className={cn("p-5 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/40 border-slate-750" : "bg-white border-slate-200 shadow-sm")}>
                      <div className="flex items-center gap-2 mb-3">
                        <Hash size={14} className="text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mã ATC</span>
                      </div>
                      <p className={cn("text-base font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{extractedData.atcCode || 'Chưa định danh'}</p>
                    </div>
                    <div className={cn("p-5 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/40 border-slate-750" : "bg-white border-slate-200 shadow-sm")}>
                      <div className="flex items-center gap-2 mb-3">
                        <Folder size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nhóm thuốc (Gợi ý)</span>
                      </div>
                      <p className={cn("text-base font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{(extractedData as any).drugGroup || 'Chưa xác định'}</p>
                    </div>
                    <div className={cn("p-5 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/40 border-slate-750" : "bg-white border-slate-200 shadow-sm")}>
                      <div className="flex items-center gap-2 mb-3">
                        <MoveRight size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đường dùng</span>
                      </div>
                      <p className={cn("text-base font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{(extractedData as any).administrationRoute || 'Chưa xác định'}</p>
                    </div>
                  </div>

                  {/* Ingredients - Detailed List */}
                  <div className={cn("p-6 rounded-[24px] border transition-colors", isDarkMode ? "bg-slate-800/20 border-slate-800" : "bg-slate-50/50 border-slate-100")}>
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <Activity size={18} className="text-emerald-500" />
                        <h5 className={cn("text-xs font-black uppercase tracking-widest", isDarkMode ? "text-slate-300" : "text-slate-700")}>Danh sách hoạt chất</h5>
                      </div>
                      <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">{(extractedData.activeIngredients || []).length} mục</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {extractedData.activeIngredients && extractedData.activeIngredients.length > 0 ? (
                        extractedData.activeIngredients.map((ing: any, i: number) => (
                          <div key={i} className={cn("flex items-center justify-between p-3 rounded-xl border transition-all", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-black">{i + 1}</span>
                              <span className="text-xs font-bold">{typeof ing === 'string' ? ing : ing.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-black text-indigo-500">{ing.amount}</span>
                              <span className="text-[10px] font-black text-slate-400">{ing.unit}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic text-center py-4">Không tìm thấy hoạt chất.</p>
                      )}
                    </div>
                  </div>

                  {/* Data Insights */}
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { icon: <Info size={18} />, label: 'Chỉ định lâm sàng', items: extractedData.indications, color: 'blue' },
                      { icon: <ShieldAlert size={18} />, label: 'Chống chỉ định & Thận trọng', items: extractedData.contraindications, color: 'rose' },
                      { icon: <Zap size={18} />, label: 'Tác dụng không mong muốn', items: extractedData.sideEffects, color: 'amber' }
                    ].map((row, idx) => (
                      <div key={idx} className={cn(
                        "p-5 rounded-[24px] border transition-all relative overflow-hidden group",
                        isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                      )}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${row.color}-500/40`} />
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-2 text-${row.color}-500`}>
                            {row.icon}
                            <span className="text-[10px] font-black uppercase tracking-widest">{row.label}</span>
                          </div>
                          <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full transition-colors", isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-500")}>
                            {row.items?.length || 0} kết quả
                          </span>
                        </div>
                        <div className={cn("text-xs leading-relaxed space-y-1.5 opacity-80", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                          {row.items && row.items.length > 0 ? (
                            row.items.slice(0, 3).map((item: any, i: number) => (
                              <p key={i} className="line-clamp-1 flex items-start gap-2">
                                <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-slate-400" />
                                {typeof item === 'string' ? item : item.content}
                              </p>
                            ))
                          ) : (
                            <p className="italic">Chưa được trích xuất chi tiết.</p>
                          )}
                          {row.items && row.items.length > 3 && (
                            <p className="text-[10px] font-bold text-indigo-500 italic mt-1">... và {row.items.length - 3} mục khác</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Footer Note */}
                  <div className={cn(
                    "p-5 rounded-[24px] flex gap-4 transition-colors items-center",
                    isDarkMode ? "bg-indigo-500/5 border border-indigo-500/10" : "bg-indigo-50 border border-indigo-100"
                  )}>
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                      <FileSearch size={22} />
                    </div>
                    <p className={cn("text-xs font-semibold leading-relaxed", isDarkMode ? "text-indigo-300" : "text-indigo-800")}>
                      Hoạt động trích xuất đã tự động phân loại tất cả thông tin như cách dùng, liều lượng theo từng đối tượng, tương tác thuốc và dược tính. Nhấn <span className="font-black underline italic">Áp dụng</span> để điền toàn bộ thông tin này vào mẫu.
                    </p>
                  </div>
                </div>
              </div>

              <div className={cn(
                "p-6 md:p-8 border-t flex gap-4 transition-colors",
                isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/30"
              )}>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm"
                  )}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={applyExtractedData}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Save size={18} /> Cập nhật biểu mẫu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pdfViewerUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-4 p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPdfViewerUrl(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "relative w-full flex flex-col transition-colors shadow-2xl overflow-hidden",
                "lg:max-w-5xl lg:h-[90vh] h-full lg:rounded-3xl rounded-none lg:border border-0",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-4 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                <div className="flex items-center gap-3">
                  <FileText className={isDarkMode ? "text-blue-400" : "text-blue-600"} size={24} />
                  <h3 className={cn("font-bold transition-colors lg:text-base text-sm truncate", isDarkMode ? "text-white" : "text-slate-900")}>Tài liệu hướng dẫn</h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={pdfViewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isDarkMode ? "text-slate-400 hover:text-blue-400 hover:bg-blue-900/30" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    )}
                    title="Mở trong tab mới"
                  >
                    <ExternalLink size={20} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPdfViewerUrl(null)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isDarkMode ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    )}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className={cn(
                "flex-1 transition-colors relative",
                isDarkMode ? "bg-slate-950" : "bg-slate-100"
              )}>
                <iframe
                  src={pdfViewerUrl}
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Message Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-full max-w-md px-4"
          >
            <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} />
                <p className="text-sm font-bold">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa thuốc"
        message={`Bạn có chắc chắn muốn xóa thuốc "${confirmData?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa thuốc"
        isDarkMode={isDarkMode}
      />

      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGroupModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-4 lg:p-6 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl text-white shadow-lg transition-all",
                    isDarkMode ? "bg-blue-600 shadow-none" : "bg-blue-600 shadow-blue-200"
                  )}>
                    <FolderTree size={24} />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Quản lý nhóm thuốc</h3>
                    <p className={cn("text-xs font-medium transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>Phân cấp nhóm thuốc tối đa 3 cấp</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isDarkMode ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  )}
                >
                  <X size={24} />
                </button>
              </div>

              <div className={cn(
                "flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar transition-colors",
                isDarkMode ? "bg-slate-950/50" : "bg-white"
              )}>
                <DrugGroupManagement
                  isDarkMode={isDarkMode}
                  onClose={() => setIsGroupModalOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isIngredientModalOpen && (
          <CatalogManagement
            type="ingredient"
            isDarkMode={isDarkMode}
            onClose={() => setIsIngredientModalOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isIngredientCategoryModalOpen && (
          <CatalogManagement
            type="ingredient_category"
            isDarkMode={isDarkMode}
            onClose={() => setIsIngredientCategoryModalOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isExcipientModalOpen && (
          <CatalogManagement
            type="excipient"
            isDarkMode={isDarkMode}
            onClose={() => setIsExcipientModalOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isExcipientCategoryModalOpen && (
          <CatalogManagement
            type="excipient_category"
            isDarkMode={isDarkMode}
            onClose={() => setIsExcipientCategoryModalOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isImageEditorOpen && (
          <ImageEditorModal
            isOpen={isImageEditorOpen}
            onClose={() => setIsImageEditorOpen(false)}
            imageSrc={imageToEdit}
            onConfirm={handleImageCropConfirm}
            aspect={editingImageType === 'avatar' ? 1 : 16 / 9}
            isDarkMode={isDarkMode}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isIcdLookupOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsIcdLookupOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border",
                isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "p-4 lg:p-6 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    isDarkMode ? "bg-blue-900/30 border-blue-800/50 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600"
                  )}>
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                      Tra cứu mã ICD-10
                    </h3>
                    <p className={cn("text-xs font-medium transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Chọn mã bệnh lý để thêm vào dữ liệu thuốc
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsIcdLookupOpen(false)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isDarkMode ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  )}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 lg:p-6 flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm theo mã hoặc tên bệnh lý..."
                      className={cn(
                        "w-full pl-12 pr-20 py-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      )}
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowIcdFilters(!showIcdFilters)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          showIcdFilters
                            ? (isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-blue-600 text-white shadow-lg")
                            : (isDarkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-400 hover:bg-slate-200")
                        )}
                      >
                        <Filter size={18} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showIcdFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2 p-2 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800">
                          {/* Suggestion Status Filter */}
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            {[
                              { id: 'all', label: 'Tất cả trạng thái' },
                              { id: 'suggested', label: 'Đã có gợi ý' },
                              { id: 'not_suggested', label: 'Chưa có gợi ý' }
                            ].map(filter => (
                              <button
                                key={filter.id}
                                onClick={() => setIcdSuggestionFilter(filter.id as any)}
                                className={cn(
                                  "whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                  icdSuggestionFilter === filter.id
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-slate-300" : "bg-white text-slate-500 hover:text-slate-700 border border-slate-200")
                                )}
                              >
                                {filter.label}
                              </button>
                            ))}
                          </div>

                          {/* Chapter Filter */}
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-200 dark:border-slate-700/50">
                            {[
                              { id: 'all', label: 'Tất cả chương' },
                              { id: 'A-B', label: 'Nhiễm khuẩn (A-B)' },
                              { id: 'C-D', label: 'Khối u (C-D)' },
                              { id: 'E-H', label: 'Nội tiết/Mắt/Tai (E-H)' },
                              { id: 'I-K', label: 'Tuần hoàn/Hô hấp/Tiêu hóa (I-K)' },
                              { id: 'L-N', label: 'Da/Cơ xương/Tiết niệu (L-N)' },
                              { id: 'O-Q', label: 'Sản/Nhi/Dị tật (O-Q)' },
                              { id: 'R-Z', label: 'Triệu chứng/Chấn thương (R-Z)' }
                            ].map(filter => (
                              <button
                                key={filter.id}
                                onClick={() => setIcdChapterFilter(filter.id)}
                                className={cn(
                                  "whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                  icdChapterFilter === filter.id
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-slate-300" : "bg-white text-slate-500 hover:text-slate-700 border border-slate-200")
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
                </div>

                <div className={cn(
                  "flex-1 overflow-y-auto rounded-2xl border custom-scrollbar",
                  isDarkMode ? "bg-slate-950/30 border-slate-800" : "bg-white border-slate-100"
                )}>
                  {icdList.filter(icd => {
                    const matchesSearch = (icd.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (icd.description || '').toLowerCase().includes(searchTerm.toLowerCase());

                    if (!matchesSearch) return false;

                    // Suggestion filter
                    if (icdSuggestionFilter !== 'all') {
                      const hasSuggestion = (icd.indications && icd.indications.length > 0) ||
                        (icd.contraindications && icd.contraindications.length > 0) ||
                        (icd.cautionIngredients && icd.cautionIngredients.length > 0);

                      if (icdSuggestionFilter === 'suggested' && !hasSuggestion) return false;
                      if (icdSuggestionFilter === 'not_suggested' && hasSuggestion) return false;
                    }

                    if (icdChapterFilter === 'all') return true;

                    const firstChar = (icd.code || '')[0]?.toUpperCase();
                    if (!firstChar) return false;

                    const filtersMap: Record<string, string[]> = {
                      'A-B': ['A', 'B'],
                      'C-D': ['C', 'D'],
                      'E-H': ['E', 'F', 'G', 'H'],
                      'I-K': ['I', 'J', 'K'],
                      'L-N': ['L', 'M', 'N'],
                      'O-Q': ['O', 'P', 'Q'],
                      'R-Z': ['R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
                    };

                    return filtersMap[icdChapterFilter]?.includes(firstChar);
                  }).length > 0 ? (
                    <div className="divide-y divide-slate-800/20">
                      {icdList
                        .filter(icd => {
                          const matchesSearch = (icd.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (icd.description || '').toLowerCase().includes(searchTerm.toLowerCase());

                          if (!matchesSearch) return false;

                          // Suggestion filter
                          if (icdSuggestionFilter !== 'all') {
                            const hasSuggestion = (icd.indications && icd.indications.length > 0) ||
                              (icd.contraindications && icd.contraindications.length > 0) ||
                              (icd.cautionIngredients && icd.cautionIngredients.length > 0);

                            if (icdSuggestionFilter === 'suggested' && !hasSuggestion) return false;
                            if (icdSuggestionFilter === 'not_suggested' && hasSuggestion) return false;
                          }

                          if (icdChapterFilter === 'all') return true;

                          const firstChar = (icd.code || '')[0]?.toUpperCase();
                          if (!firstChar) return false;

                          const filtersMap: Record<string, string[]> = {
                            'A-B': ['A', 'B'],
                            'C-D': ['C', 'D'],
                            'E-H': ['E', 'F', 'G', 'H'],
                            'I-K': ['I', 'J', 'K'],
                            'L-N': ['L', 'M', 'N'],
                            'O-Q': ['O', 'P', 'Q'],
                            'R-Z': ['R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
                          };

                          return filtersMap[icdChapterFilter]?.includes(firstChar);
                        })
                        .slice(0, 100)
                        .map((icd, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (icdLookupTarget) {
                                if (icdLookupTarget.type === 'contraindication') {
                                  const newList = [...formData.contraindications];
                                  const currentIcd10s = newList[icdLookupTarget.index].icd10s || [];
                                  const fullCode = `${icd.code} - ${icd.description}`;
                                  if (!currentIcd10s.includes(fullCode)) {
                                    newList[icdLookupTarget.index] = {
                                      ...newList[icdLookupTarget.index],
                                      icd10s: [...currentIcd10s, fullCode]
                                    };
                                    setFormData({ ...formData, contraindications: newList });
                                  }
                                } else if (icdLookupTarget.type === 'indication') {
                                  const newList = [...formData.indications];
                                  const currentIcd10s = newList[icdLookupTarget.index].icd10s || [];
                                  const fullCode = `${icd.code} - ${icd.description}`;
                                  if (!currentIcd10s.includes(fullCode)) {
                                    newList[icdLookupTarget.index] = {
                                      ...newList[icdLookupTarget.index],
                                      icd10s: [...currentIcd10s, fullCode]
                                    };
                                    setFormData({ ...formData, indications: newList });
                                  }
                                }
                              }
                              setIsIcdLookupOpen(false);
                            }}
                            className={cn(
                              "w-full text-left p-4 transition-all flex items-start gap-4 group",
                              isDarkMode ? "hover:bg-blue-900/20" : "hover:bg-blue-50"
                            )}
                          >
                            <div className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider shrink-0 transition-colors",
                              isDarkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:border-blue-400/30" : "bg-blue-50 text-blue-600 border-blue-100 group-hover:border-blue-200"
                            )}>
                              {icd.code}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-bold leading-relaxed mb-0.5", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                                {icd.description}
                              </p>
                              {icd.category && (
                                <p className="text-[10px] text-slate-500 italic">{icd.category}</p>
                              )}
                            </div>
                            <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-600"
                              )}>
                                <Plus size={14} />
                              </div>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                      <div className={cn(
                        "w-16 h-16 rounded-3xl flex items-center justify-center mb-4",
                        isDarkMode ? "bg-slate-900 text-slate-600" : "bg-slate-50 text-slate-300"
                      )}>
                        <Search size={32} />
                      </div>
                      <h4 className={cn("text-sm font-bold mb-1", isDarkMode ? "text-slate-300" : "text-slate-600")}>Không tìm thấy kết quả</h4>
                      <p className={cn("text-xs", isDarkMode ? "text-slate-500" : "text-slate-400")}>Thử tìm kiếm với từ khóa khác hoặc mã ICD-10 khác</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={cn(
                "p-4 border-t flex items-center justify-between",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                <p className="text-[10px] text-slate-500 font-medium">Tìm thấy {icdList.length} mã ICD-10 trong hệ thống</p>
                <button
                  onClick={() => setIsIcdLookupOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
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
        {isCompanyModalOpen && (
          <CatalogManagement
            type="company"
            isDarkMode={isDarkMode}
            onClose={() => setIsCompanyModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button for Adding Drug */}
      {canManage && !isGroupModalOpen && !isIngredientModalOpen && !isIngredientCategoryModalOpen && !isExcipientModalOpen && !isExcipientCategoryModalOpen && !isCompanyModalOpen && !isModalOpen && !isReviewModalOpen && (
        <button
          type="button"
          onClick={() => {
            if (viewMode === 'groups') setIsGroupModalOpen(true);
            else if (viewMode === 'ingredients') {
              if (ingredientView === 'search') setIngredientView('manage');
              setCatalogAddTrigger(prev => prev + 1);
            }
            else if (viewMode === 'excipients') {
              setCatalogAddTrigger(prev => prev + 1);
            }
            else if (viewMode === 'companies') {
              setCatalogAddTrigger(prev => prev + 1);
            }
            else handleOpenModal();
          }}
          className={cn(
            "fixed bottom-32 lg:bottom-32 right-6 lg:right-10 z-[60] w-14 lg:w-16 h-14 lg:h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group",
            "shadow-blue-500/40",
            selectedDrug && "hidden lg:flex"
          )}
          title={viewMode === 'groups' ? "Thêm nhóm mới" : viewMode === 'ingredients' ? "Thêm hoạt chất mới" : viewMode === 'excipients' ? "Thêm tá dược mới" : viewMode === 'companies' ? "Thêm công ty mới" : "Thêm thuốc mới"}
        >
          <div className="relative">
            <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
          </div>
        </button>
      )}
      <DrugDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        drug={detailDrug}
        isDarkMode={isDarkMode}
        canSeeIcdSuggestions={canSeeIcdSuggestions}
        canSeeCommonIndications={canSeeCommonIndications}
      />
    </div>
  );
};

export default DrugDirectory;
