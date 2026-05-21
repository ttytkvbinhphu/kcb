import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Edit2, Trash2, X, Check, Filter, ClipboardList, Info, AlertTriangle, Pill, FileSpreadsheet, Loader2, ChevronsLeft, ChevronsRight, Pin, LayoutDashboard, Layers } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, writeBatch, updateDoc, addDoc, auth, handleFirestoreError, OperationType } from '../firebase';
import * as XLSX from 'xlsx';
import { ICD10, Drug, UserProfile } from '../types';
import { useICD10, subscribeICD10, triggerIcd10Sync } from '../lib/icdStore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import DrugDetailModal from './DrugDetailModal';
import ICDDetailModal from './ICDDetailModal';

interface ICD10ManagementProps {
  canManage: boolean;
  isDarkMode?: boolean;
  featureSettings?: any;
  featureStates?: Record<string, string>;
  userRole?: string;
  userPowerPoints?: number;
  userProfile?: UserProfile;
  onSelectDrug?: (drug: Drug) => void;
  initialSearchTerm?: string | null;
  onClearInitialSearch?: () => void;
}

const ICD10Management: React.FC<ICD10ManagementProps> = ({ 
  canManage, 
  isDarkMode, 
  featureSettings, 
  featureStates,
  userRole, 
  userPowerPoints = 0,
  userProfile,
  onSelectDrug,
  initialSearchTerm,
  onClearInitialSearch
}) => {
  const [icdList, setIcdList] = useState<ICD10[]>([]);
  const [drugList, setDrugList] = useState<Drug[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'has_suggestions' | 'no_suggestions'>('all');
  const [icdCategoryFilter, setIcdCategoryFilter] = useState<string>('all');
  const [icdStatusFilter, setIcdStatusFilter] = useState<'all' | 'expired' | 'new' | 'new_name'>('all');
  const [icdChapterFilter, setIcdChapterFilter] = useState<string>('all');
  const [icdGuideFilter, setIcdGuideFilter] = useState<'all' | 'has_guide' | 'no_guide'>('all');
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

  const handleShowDrugDetail = (drug: Drug) => {
    setDetailDrug(drug);
    setIsDetailModalOpen(true);
  };

  const handleShowIcdDetail = (icd: ICD10) => {
    setSelectedIcdForDetail(icd);
    setIsIcdDetailModalOpen(true);
  };
  const [loading, setLoading] = useState(true);
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const previousPageRef = useRef(1);
  const isSearchingRef = useRef(false);
  const prevFiltersRef = useRef<{
    searchTerm: string;
    filterStatus: string;
    icdCategoryFilter: string;
    icdChapterFilter: string;
    icdGuideFilter: string;
    icdStatusFilter: string;
  }>({ 
    searchTerm: '', 
    filterStatus: 'all', 
    icdCategoryFilter: 'all', 
    icdChapterFilter: 'all', 
    icdGuideFilter: 'all', 
    icdStatusFilter: 'all' 
  });

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || 
      filterStatus !== 'all' || 
      icdCategoryFilter !== 'all' || 
      icdChapterFilter !== 'all' || 
      icdGuideFilter !== 'all' || 
      icdStatusFilter !== 'all';
  }, [searchTerm, filterStatus, icdCategoryFilter, icdChapterFilter, icdGuideFilter, icdStatusFilter]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setIcdCategoryFilter('all');
    setIcdChapterFilter('all');
    setIcdGuideFilter('all');
    setIcdStatusFilter('all');
  };

  const toggleCategoryFilter = (category: string) => {
    setIcdCategoryFilter(prev => prev === category ? 'all' : category);
  };

  const [formData, setFormData] = useState<ICD10>({
    code: '',
    description: '',
    notes: '',
    isAppendixA2: false,
    isNew: false,
    isExpired: false,
    oldName: ''
  });


  // Live lookup: prevents stale-reference ghost injections after tab change.
  // App.tsx uses key={activeTab} on the portal div, destroying and recreating it
  // on each navigation. A live lookup here always finds the current node.
  const getPortalTarget = () => document.getElementById('mobile-subheader-portal');

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      onClearInitialSearch?.();
    }
  }, [initialSearchTerm, onClearInitialSearch]);

  const drugsByIcd = useMemo(() => {
    const map: Record<string, string[]> = {};
    drugList.forEach(drug => {
      const codes = new Set<string>();
      (drug.indications || []).forEach(ind => {
        (ind.icd10s || []).forEach(icdItem => {
          if (icdItem && typeof icdItem === 'string') {
            const codeOnly = icdItem.split(' - ')[0].trim().toUpperCase();
            if (codeOnly) codes.add(codeOnly);
          }
        });
      });
      codes.forEach(code => {
        if (!map[code]) map[code] = [];
        if (!map[code].includes(drug.name)) {
          map[code].push(drug.name);
        }
      });
    });
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

    return () => {
      unsubscribeICD();
      unsubscribeDrugs();
    };
  }, []);

  const filteredList = useMemo(() => {
    const list = icdList.filter(icd => {
      const matchesSearch = (icd.code || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (icd.description || '').toLowerCase().includes((searchTerm || '').toLowerCase());
      
      if (!matchesSearch) return false;

      // Category filter
      if (icdCategoryFilter !== 'all') {
        if (icdCategoryFilter === 'appendix_a2' && !icd.isAppendixA2) return false;
        if (icdCategoryFilter === 'appendix_a3' && !icd.isAppendixA3) return false;
        if (icdCategoryFilter === 'appendix_a4' && !icd.isAppendixA4) return false;
        if (icdCategoryFilter === 'appendix_a5' && !icd.isAppendixA5) return false;
        if (icdCategoryFilter === 'appendix_a6' && !icd.isAppendixA6) return false;
        if (icdCategoryFilter === 'restricted' && !icd.isRestricted) return false;
        if (icdCategoryFilter === 'tt26' && !icd.isTT26) return false;
      }

      // Status filter
      if (icdStatusFilter === 'expired' && !icd.isExpired) return false;
      if (icdStatusFilter === 'new' && !icd.isNew) return false;
      if (icdStatusFilter === 'new_name' && (!icd.oldName || icd.oldName.trim() === '')) return false;

      // Chapter filter
      if (icdChapterFilter !== 'all') {
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

        if (!filtersMap[icdChapterFilter]?.includes(firstChar)) return false;
      }

      // Guide filter
      if (icdGuideFilter === 'has_guide' && (!icd.guide || icd.guide.trim() === '')) return false;
      if (icdGuideFilter === 'no_guide' && icd.guide && icd.guide.trim() !== '') return false;

      const suggestions = drugsByIcd[(icd.code || '').trim().toUpperCase()];
      const hasSuggestions = suggestions && suggestions.length > 0;

      if (filterStatus === 'has_suggestions') return hasSuggestions;
      if (filterStatus === 'no_suggestions') return !hasSuggestions;
      
      return true;
    });

    // Final display list - in management mode, we ignore pinned status for all visual calculations
    const displayList = canManage 
      ? list.map(item => ({ ...item, isPinned: false, showOnWorkspace: false }))
      : list.map(item => ({ 
          ...item, 
          isPinned: (userProfile?.pinnedIcdCodes || []).includes(item.code),
          showOnWorkspace: (userProfile?.workspaceIcdCodes || []).includes(item.code)
        }));

    // Sort by pinned first, then by code (In management mode, isPinned is effectively false above)
    return [...displayList].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.code || '').localeCompare(b.code || '');
    });
  }, [icdList, searchTerm, filterStatus, icdChapterFilter, icdCategoryFilter, icdGuideFilter, icdStatusFilter, drugsByIcd, canManage, userProfile]);

  // Reset to page 1 when search term or filter changes, and restore previous page when cleared
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const categoryFiltersChanged = prev.icdCategoryFilter !== icdCategoryFilter;

    const filtersChanged = 
      prev.searchTerm !== searchTerm || 
      prev.filterStatus !== filterStatus || 
      categoryFiltersChanged || 
      prev.icdChapterFilter !== icdChapterFilter ||
      prev.icdGuideFilter !== icdGuideFilter ||
      prev.icdStatusFilter !== icdStatusFilter;

    const hasSearchOrFilter = searchTerm || 
      filterStatus !== 'all' || 
      icdCategoryFilter !== 'all' || 
      icdChapterFilter !== 'all' || 
      icdGuideFilter !== 'all' || 
      icdStatusFilter !== 'all';

    if (filtersChanged) {
      if (hasSearchOrFilter) {
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
      prevFiltersRef.current = { searchTerm, filterStatus, icdCategoryFilter, icdChapterFilter, icdGuideFilter, icdStatusFilter };
    } else if (!isSearchingRef.current) {
       previousPageRef.current = currentPage;
     }
  }, [searchTerm, filterStatus, icdCategoryFilter, icdChapterFilter, icdGuideFilter, icdStatusFilter, currentPage]);

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
      setFormData({ 
      code: '', 
      description: '', 
      notes: '', 
      guide: '',
      isAppendixA2: false,
      isRestricted: false,
      isNew: false,
      isExpired: false,
      oldName: ''
    });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.description) return;

    try {
      const docId = formData.id || formData.code;
      await setDoc(doc(db, 'icd10', docId), formData);
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
    if (canManage || !userProfile || !auth.currentUser) return;
    try {
      const pinnedIcdCodes = userProfile.pinnedIcdCodes || [];
      const newPinnedIcdCodes = pinnedIcdCodes.includes(icd.code) 
        ? pinnedIcdCodes.filter(c => c !== icd.code)
        : [...pinnedIcdCodes, icd.code];
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        pinnedIcdCodes: newPinnedIcdCodes,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };


  const handleToggleWorkspace = async (icd: ICD10) => {
    if (canManage || !userProfile || !auth.currentUser) return;
    try {
      const workspaceIcdCodes = userProfile.workspaceIcdCodes || [];
      const newWorkspaceIcdCodes = workspaceIcdCodes.includes(icd.code) 
        ? workspaceIcdCodes.filter(c => c !== icd.code)
        : [...workspaceIcdCodes, icd.code];
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        workspaceIcdCodes: newWorkspaceIcdCodes,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
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
    <div className={cn(
      "p-1 sm:p-4 lg:p-6 max-w-full mx-auto min-h-screen transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      {/* Mobile Sub-Header Portal Search - live lookup prevents stale node references */}
      {(() => {
        const portalTarget = getPortalTarget();
        return portalTarget ? createPortal(
          <div className="flex items-center gap-2 w-full lg:hidden pr-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Tìm ICD-10..."
                className={cn(
                  "w-full pl-8 pr-16 py-1.5 border rounded-lg focus:ring-1 focus:ring-emerald-500 transition-all text-[11px] font-bold",
                  isDarkMode 
                    ? "bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500" 
                    : "bg-white border-slate-200 text-slate-900 shadow-sm"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-1 rounded-md transition-all",
                    showFilters 
                      ? "bg-emerald-600 text-white shadow-sm" 
                      : (isDarkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-400 hover:bg-slate-100")
                  )}
                >
                  <Filter size={14} />
                </button>
              </div>
            </div>
          </div>,
          portalTarget
        ) : null;
      })()}

      <div className="mb-2 lg:mb-10 space-y-6">
        {/* Guest Search Bar for Mobile (since portal subheader is missing in guest modal) */}
        {!userRole && (
          <div className="lg:hidden mb-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm mã hoặc tên bệnh..."
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
                onClick={() => setShowFilters(!showFilters)}
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
          </div>
        )}

        {/* Mobile Filters UI - Appears below sub-header */}
        <AnimatePresence>
          {showFilters && (
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
                  <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bộ lọc đang hoạt động</span>
                    <button
                      onClick={handleClearAllFilters}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={12} />
                      Tắt nhanh lọc
                    </button>
                  </div>
                )}

                {/* Category Filters Mobile */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Phân loại danh mục</span>
                    </div>
                    <div className="flex flex-wrap gap-1 items-center justify-end">
                      {icdCategoryFilter === 'appendix_a2' && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 bg-indigo-50 dark:bg-indigo-950/40 rounded",
                          isDarkMode ? "text-indigo-400" : "text-indigo-500"
                        )}>
                          24
                        </span>
                      )}
                      {icdCategoryFilter === 'appendix_a3' && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 bg-amber-50 dark:bg-amber-950/40 rounded",
                          isDarkMode ? "text-amber-400" : "text-amber-500"
                        )}>
                          25
                        </span>
                      )}
                      {icdCategoryFilter === 'restricted' && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 bg-rose-50 dark:bg-rose-950/40 rounded",
                          isDarkMode ? "text-rose-400" : "text-rose-500"
                        )}>
                          26
                        </span>
                      )}
                      {icdCategoryFilter === 'appendix_a4' && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 bg-blue-50 dark:bg-blue-950/40 rounded",
                          isDarkMode ? "text-blue-400" : "text-blue-500"
                        )}>
                          27
                        </span>
                      )}
                      {icdCategoryFilter === 'appendix_a5' && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 bg-pink-50 dark:bg-pink-950/40 rounded",
                          isDarkMode ? "text-pink-400" : "text-pink-500"
                        )}>
                          28
                        </span>
                      )}
                      {icdCategoryFilter === 'appendix_a6' && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 bg-cyan-50 dark:bg-cyan-950/40 rounded",
                          isDarkMode ? "text-cyan-400" : "text-cyan-500"
                        )}>
                          29
                        </span>
                      )}
                      {icdCategoryFilter === 'tt26' && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-1 bg-fuchsia-50 dark:bg-fuchsia-950/40 rounded",
                          isDarkMode ? "text-fuchsia-400" : "text-fuchsia-500"
                        )}>
                          TT26
                        </span>
                      )}
                    </div>
                  </div>
                    <div className="flex items-center gap-1 text-center">
                    <button
                      onClick={() => toggleCategoryFilter('all')}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        icdCategoryFilter === 'all'
                          ? "bg-emerald-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                      )}
                    >
                      Tất cả
                    </button>
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a2')}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          icdCategoryFilter === 'appendix_a2'
                            ? "bg-indigo-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                        )}
                      >
                        24
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a3')}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          icdCategoryFilter === 'appendix_a3'
                            ? "bg-amber-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                        )}
                      >
                        25
                      </button>
                    )}
                    <button
                      onClick={() => toggleCategoryFilter('restricted')}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        icdCategoryFilter === 'restricted'
                          ? "bg-rose-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                      )}
                    >
                      26
                    </button>
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a4')}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          icdCategoryFilter === 'appendix_a4'
                            ? "bg-blue-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                        )}
                      >
                        27
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a5')}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          icdCategoryFilter === 'appendix_a5'
                            ? "bg-pink-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                        )}
                      >
                        28
                      </button>
                    )}
                    {canSeeAppendixA2 && (
                      <button
                        onClick={() => toggleCategoryFilter('appendix_a6')}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          icdCategoryFilter === 'appendix_a6'
                            ? "bg-cyan-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                        )}
                      >
                        29
                      </button>
                    )}
                    <button
                      onClick={() => toggleCategoryFilter('tt26')}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        icdCategoryFilter === 'tt26'
                          ? "bg-fuchsia-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
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
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Trạng thái gợi ý</span>
                    </div>
                    <div className={cn(
                      "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300",
                      filterStatus !== 'all'
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/5 bg-emerald-500/5"
                        : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")
                    )}>
                      <button
                        onClick={() => setFilterStatus('all')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          filterStatus === 'all'
                            ? "bg-emerald-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                        )}
                      >
                        Tất cả
                      </button>
                      <button
                        onClick={() => setFilterStatus('has_suggestions')}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          filterStatus === 'has_suggestions'
                            ? "bg-emerald-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                        )}
                      >
                        <Check size={12} />
                        Có gợi ý
                      </button>
                      <button
                        onClick={() => setFilterStatus('no_suggestions')}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          filterStatus === 'no_suggestions'
                            ? "bg-emerald-600 text-white shadow-sm"
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
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
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Hướng dẫn</span>
                  </div>
                  <div className={cn(
                    "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300",
                    icdGuideFilter !== 'all'
                      ? "border-violet-500 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/5 bg-violet-500/5"
                      : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")
                  )}>
                    <button
                      onClick={() => setIcdGuideFilter('all')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        icdGuideFilter === 'all'
                          ? "bg-violet-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                      )}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setIcdGuideFilter('has_guide')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        icdGuideFilter === 'has_guide'
                          ? "bg-violet-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                      )}
                    >
                      <Check size={12} />
                      Có H.Dẫn
                    </button>
                    <button
                      onClick={() => setIcdGuideFilter('no_guide')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        icdGuideFilter === 'no_guide'
                          ? "bg-violet-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
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
                    icdStatusFilter !== 'all'
                      ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/5 bg-amber-500/5"
                      : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")
                  )}>
                    <button
                      onClick={() => setIcdStatusFilter('all')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        icdStatusFilter === 'all'
                          ? "bg-amber-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                      )}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setIcdStatusFilter('expired')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        icdStatusFilter === 'expired'
                          ? "bg-red-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                      )}
                    >
                      Hết HL
                    </button>
                    <button
                      onClick={() => setIcdStatusFilter('new')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        icdStatusFilter === 'new'
                          ? "bg-green-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
                      )}
                    >
                      Mã Mới
                    </button>
                    <button
                      onClick={() => setIcdStatusFilter('new_name')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        icdStatusFilter === 'new_name'
                          ? "bg-purple-600 text-white shadow-sm"
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
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
                          : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")
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
              "inline-flex items-center gap-4 px-6 py-3 rounded-[32px] border-2 transition-all",
              isDarkMode 
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5" 
                : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-xl shadow-emerald-500/10"
            )}>
              <div className="p-2 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
                <ClipboardList size={32} />
              </div>
              <div className="flex flex-col">
                <span className="text-[35px] font-black tracking-tighter uppercase leading-none">
                  {featureSettings?.customTitle || (canManage ? "Quản lý ICD-10" : "Tra cứu ICD-10")}
                </span>
                <div className="mt-2 flex flex-col">
                  <span className={cn("text-[11px] font-bold tracking-tight", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    Danh mục mã bệnh theo phân loại quốc tế bệnh tật, nguyên nhân tử vong theo ICD-10
                  </span>
                  <span className={cn("text-[10px] font-medium italic opacity-80 leading-tight", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                    (Ban hành kèm theo Thông tư số 06/2026/TT-BYT ngày 02 tháng 04 năm 2026 của Bộ trưởng Bộ Y tế)
                  </span>
                </div>
              </div>
            </div>

            {/* Category Tabs move here with extra sub-label */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCategoryFilter('all')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    icdCategoryFilter === 'all'
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                      : (isDarkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")
                  )}
                >
                  Tất cả ICD-10
                </button>
                {canSeeAppendixA2 && (
                  <button
                    onClick={() => toggleCategoryFilter('appendix_a2')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      icdCategoryFilter === 'appendix_a2'
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                        : (isDarkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")
                    )}
                  >
                    24
                  </button>
                )}
                {canSeeAppendixA2 && (
                  <button
                    onClick={() => toggleCategoryFilter('appendix_a3')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      icdCategoryFilter === 'appendix_a3'
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-200 dark:shadow-none"
                        : (isDarkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")
                    )}
                  >
                    25
                  </button>
                )}
                <button
                  onClick={() => toggleCategoryFilter('restricted')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    icdCategoryFilter === 'restricted'
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none"
                      : (isDarkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")
                  )}
                >
                  26
                </button>
                {canSeeAppendixA2 && (
                  <button
                    onClick={() => toggleCategoryFilter('appendix_a4')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      icdCategoryFilter === 'appendix_a4'
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                        : (isDarkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")
                    )}
                  >
                    27
                  </button>
                )}
                {canSeeAppendixA2 && (
                  <button
                    onClick={() => toggleCategoryFilter('appendix_a5')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      icdCategoryFilter === 'appendix_a5'
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-200 dark:shadow-none"
                        : (isDarkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")
                    )}
                  >
                    28
                  </button>
                )}
                {canSeeAppendixA2 && (
                  <button
                    onClick={() => toggleCategoryFilter('appendix_a6')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      icdCategoryFilter === 'appendix_a6'
                        ? "bg-cyan-600 text-white shadow-lg shadow-cyan-200 dark:shadow-none"
                        : (isDarkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")
                    )}
                  >
                    29
                  </button>
                )}
                <button
                  onClick={() => toggleCategoryFilter('tt26')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    icdCategoryFilter === 'tt26'
                      ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-200 dark:shadow-none"
                      : (isDarkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")
                  )}
                >
                  TT26
                </button>
              </div>
              <AnimatePresence>
                {icdCategoryFilter === 'appendix_a2' && (
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
                {icdCategoryFilter === 'appendix_a3' && (
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
                {icdCategoryFilter === 'appendix_a4' && (
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
                {icdCategoryFilter === 'appendix_a5' && (
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
                {icdCategoryFilter === 'appendix_a6' && (
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
                {icdCategoryFilter === 'restricted' && (
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
                {icdCategoryFilter === 'tt26' && (
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
            </div>
          </div>
        </div>
        {canManage && (
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
        
        <div className={cn(
          "p-2 lg:p-3 rounded-xl lg:rounded-2xl shadow-sm border transition-all space-y-3 hidden lg:block",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        )}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
              {/* Search Bar - Main Anchor */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={icdCategoryFilter === 'appendix_a2' ? "Tìm trong danh sách Không là bệnh chính..." : "Tìm mã quốc tế hoặc tên bệnh lý (VD: A00, Tưa miệng...)"}
                  className={cn(
                    "w-full pl-12 pr-12 py-4 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium",
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
                      "absolute right-4 top-1/2 -translate-y-1/2 transition-all p-1.5 rounded-xl",
                      isDarkMode ? "text-slate-500 hover:text-white hover:bg-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Quick Reset Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearAllFilters}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold transition-all active:scale-95 text-xs border whitespace-nowrap shadow-sm",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-rose-400 hover:text-rose-300" 
                      : "bg-white border-slate-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 shadow-slate-200/50"
                  )}
                >
                  <X size={16} />
                  <span>Tắt nhanh lọc</span>
                </button>
              )}
              
              {/* Status Filters Group */}
              {isDrugSuggestionsAllowed && (
                <div className="flex flex-col gap-2 min-w-[280px]">
                  <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Trạng thái gợi ý</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 p-1.5 rounded-2xl border transition-all duration-300",
                  filterStatus !== 'all'
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/5"
                    : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-100")
                )}>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'has_suggestions', label: 'Có gợi ý', icon: Check },
                    { id: 'no_suggestions', label: 'Chưa có', icon: X }
                  ].map(stat => (
                    <button
                      key={stat.id}
                      onClick={() => setFilterStatus(stat.id as any)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                        filterStatus === stat.id
                          ? (isDarkMode ? "bg-slate-700 text-emerald-400 shadow-md ring-1 ring-emerald-500/10" : "bg-white text-emerald-600 shadow-md ring-1 ring-emerald-500/10")
                          : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
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
              <div className="flex flex-col gap-2 min-w-[280px]">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-violet-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Hướng dẫn</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 p-1.5 rounded-2xl border transition-all duration-300",
                  icdGuideFilter !== 'all'
                    ? "border-violet-500 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/5"
                    : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-100")
                )}>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'has_guide', label: 'Có H.Dẫn', icon: Check },
                    { id: 'no_guide', label: 'Không', icon: X }
                  ].map(stat => (
                    <button
                      key={stat.id}
                      onClick={() => setIcdGuideFilter(stat.id as any)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                        icdGuideFilter === stat.id
                          ? (isDarkMode ? "bg-slate-700 text-violet-400 shadow-md ring-1 ring-violet-500/10" : "bg-white text-violet-600 shadow-md ring-1 ring-violet-500/10")
                          : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
                      )}
                    >
                      {stat.icon && <stat.icon size={12} />}
                      {stat.label}
                    </button>
                  ))}
                </div>
              </div>



              {/* Status Code Filters Group */}
              <div className="flex flex-col gap-2 min-w-[320px]">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-amber-500 rounded-full" />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Trạng thái mã</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 p-1.5 rounded-2xl border transition-all duration-300",
                  icdStatusFilter !== 'all'
                    ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/5"
                    : (isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-100")
                )}>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'expired', label: 'Hết HL' },
                    { id: 'new', label: 'Mã Mới' },
                    { id: 'new_name', label: 'Tên Mới' }
                  ].map(stat => (
                    <button
                      key={stat.id}
                      onClick={() => setIcdStatusFilter(stat.id as any)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                        icdStatusFilter === stat.id
                          ? (isDarkMode ? "bg-slate-700 text-amber-400 shadow-md ring-1 ring-amber-500/10" : "bg-white text-amber-600 shadow-md ring-1 ring-amber-500/10")
                          : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
                      )}
                    >
                      {stat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chapter Filters - PC View Expanded */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-3 bg-blue-500 rounded-full" />
                <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Phân loại theo Chương ICD-10</span>
              </div>
              <div className={cn(
                "grid grid-cols-2 md:grid-cols-4 lg:flex lg:items-center gap-2 p-2 rounded-2xl border",
                isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                {[
                  { id: 'all', label: 'Tất cả chương', color: 'bg-slate-500' },
                  { id: 'A-B', label: 'Nhiễm khuẩn (A-B)', color: 'bg-emerald-500' },
                  { id: 'C-D', label: 'Khối u (C-D)', color: 'bg-rose-500' },
                  { id: 'E-H', label: 'Nội tiết/Mắt (E-H)', color: 'bg-amber-500' },
                  { id: 'I-K', label: 'Hô hấp/Tiêu hóa (I-K)', color: 'bg-blue-500' },
                  { id: 'L-N', label: 'Cơ xương/Da (L-N)', color: 'bg-purple-500' },
                  { id: 'O-Q', label: 'Sản/Nhi/Dị tật (O-Q)', color: 'bg-pink-500' },
                  { id: 'R-Z', label: 'Triệu chứng (R-Z)', color: 'bg-slate-600' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setIcdChapterFilter(filter.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap group",
                      icdChapterFilter === filter.id
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-y-[-2px]"
                        : (isDarkMode ? "bg-slate-900/50 text-slate-400 hover:bg-slate-900" : "bg-white text-slate-500 border border-slate-200 hover:border-blue-400")
                    )}
                  >
                    <div className={cn(
                      "w-4 h-1 rounded-full mb-1 transition-all",
                      icdChapterFilter === filter.id ? "bg-white" : filter.color
                    )} />
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {(searchTerm || filterStatus !== 'all') && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                  Kết quả: <span className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{filteredList.length}</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setIcdCategoryFilter('all');
                  setIcdChapterFilter('all');
                  setIcdGuideFilter('all');
                  setIcdStatusFilter('all');
                }}
                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                Xóa bộ lọc
              </button>
            </div>
          )}
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
            paginatedList.map((icd, idx) => (
              <div 
                key={`${icd.id || icd.code || 'icd'}-${idx}`}
                onClick={() => handleShowIcdDetail(icd)}
                className={cn(
                  "p-4 transition-colors relative cursor-pointer",
                  icd.isPinned && !canManage
                    ? (isDarkMode ? "bg-indigo-900/20 border-l-4 border-l-indigo-500" : "bg-indigo-50/50 border-l-4 border-l-indigo-500") 
                    : (isDarkMode ? "bg-slate-900/50" : "bg-white border-l-4 border-l-transparent")
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className={cn(
                    "shrink-0 px-2.5 py-1 rounded-md font-mono font-bold text-[10px] tracking-tight border",
                    isDarkMode ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/30" : "bg-emerald-50/50 text-emerald-700 border-emerald-100"
                  )}>
                    {icd.code}
                  </span>
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
                    <div className="shrink-0 flex gap-1">
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
                        drugsByIcd[(icd.code || '').trim().toUpperCase()].map((drugName, idx) => (
                          <button 
                            key={idx} 
                            onClick={(e) => {
                              e.stopPropagation();
                              const drugObj = drugList.find(d => d.name === drugName);
                              if (drugObj) {
                                handleShowDrugDetail(drugObj);
                              }
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all active:scale-95",
                              isDarkMode 
                                ? "bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700 hover:border-emerald-500/30" 
                                : "bg-slate-100 text-emerald-700 border-slate-200 hover:bg-white hover:border-emerald-300 hover:shadow-sm"
                            )}
                          >
                            {drugName}
                          </button>
                        ))
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
                        <Pin size={12} className={icd.isPinned ? "fill-amber-500" : ""} />
                        {icd.isPinned ? "Đã ghim" : "Ghim"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleWorkspace(icd); }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                          icd.showOnWorkspace 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-slate-50 border-slate-100 text-slate-500")
                        )}
                      >
                        <LayoutDashboard size={12} />
                        {icd.showOnWorkspace ? "Đang hiện" : "Workspace"}
                      </button>
                    </div>
                  </div>
                )}
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
                {canSeeAppendixA2 && <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors text-center", isDarkMode ? "text-slate-500" : "text-slate-400")}>Nguyên tắc</th>}
                <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors text-center", isDarkMode ? "text-slate-500" : "text-slate-400")}>
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
                  <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Gợi ý thuốc</th>
                )}
                {canSeeNotes && <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Ghi chú</th>}
                {!canManage && canSeeShortcuts && <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Phím tắt</th>}
                {canManage && <th className={cn("px-4 sm:px-6 lg:px-8 py-4 text-[10px] lg:text-xs font-black uppercase tracking-widest text-right transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Quản lý</th>}
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
                      ? (isDarkMode ? "bg-indigo-900/10 hover:bg-indigo-900/20" : "bg-indigo-50/40 hover:bg-indigo-50/60") 
                      : (isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50/80")
                  )}
                >
                  <td className="w-24 sm:w-32 lg:w-40 px-4 sm:px-6 lg:px-8 py-5">
                    <span className={cn(
                      "px-2.5 lg:px-3 py-1 rounded-md font-mono font-bold text-[10px] lg:text-xs tracking-tight transition-colors border shadow-sm",
                      isDarkMode ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30" : "bg-emerald-50/50 text-emerald-700 border-emerald-100"
                    )}>
                      {icd.code}
                    </span>
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
                    <td className="px-4 sm:px-6 lg:px-8 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {drugsByIcd[(icd.code || '').trim().toUpperCase()] && drugsByIcd[(icd.code || '').trim().toUpperCase()].length > 0 ? (
                          drugsByIcd[(icd.code || '').trim().toUpperCase()].map((drugName, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => {
                                const drugObj = drugList.find(d => d.name === drugName);
                                if (drugObj) {
                                  handleShowDrugDetail(drugObj);
                                }
                              }}
                              className={cn(
                                "px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-md text-[9px] lg:text-[11px] font-bold border transition-all active:scale-95",
                                isDarkMode 
                                  ? "bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700 hover:border-emerald-500/30" 
                                  : "bg-slate-100 text-emerald-700 border-slate-200 hover:bg-white hover:border-emerald-300 hover:shadow-sm"
                              )}
                            >
                              {drugName}
                            </button>
                          ))
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
                    <td className="px-4 sm:px-6 lg:px-8 py-4">
                      <div className="grid grid-cols-2 gap-1.5 w-fit">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTogglePin(icd); }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            icd.isPinned 
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                              : (isDarkMode ? "text-slate-500 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100")
                          )}
                          title={icd.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                        >
                          <Pin size={14} className={icd.isPinned ? "fill-amber-500" : ""} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleWorkspace(icd); }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            icd.showOnWorkspace 
                              ? "bg-primary/10 text-primary border border-primary/20" 
                              : (isDarkMode ? "text-slate-500 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100")
                          )}
                          title={icd.showOnWorkspace ? "Gỡ khỏi Workspace" : "Hiện trên Workspace"}
                        >
                          <LayoutDashboard size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                  {canManage && (
                    <td className="px-4 sm:px-6 lg:px-8 py-4 text-right">
                      <div className="flex justify-end gap-1 lg:gap-2">
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
                onClick={() => setCurrentPage(1)}
                className={cn(
                  "p-2 rounded-xl border transition-all disabled:opacity-30",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                title="Trang đầu"
              >
                <ChevronsLeft size={20} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
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
                onClick={() => setCurrentPage(totalPages)}
                className={cn(
                  "p-2 rounded-xl border transition-all disabled:opacity-30",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                title="Trang cuối"
              >
                <ChevronsRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

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
                  <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-6">
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

                    <div className="md:col-span-3">
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

                    <div className="md:col-span-3">
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

                    <div className="md:col-span-3">
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
    </div>
  );
};

export default ICD10Management;
