import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen, Search, Filter, ShieldAlert, AlertTriangle, Pill,
  Heart, Sparkles, Check, Copy, Printer, Share2, ChevronRight,
  Bookmark, BookmarkCheck, ArrowLeft, Eye, Lock, RefreshCw,
  Info, FileText, SlidersHorizontal, X, Layers, Stethoscope,
  Activity, ShieldCheck, Zap, Plus, Edit3, Trash2, CopyPlus,
  Download, Upload, CheckCircle2, Database, AlertCircle, Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, sanitizeFirestoreData } from '../lib/utils';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from '../firebase';
import { PHARMACOPOEIA_DATA, PharmacopoeiaMonograph, PharmacopoeiaForeword, DEFAULT_PHARMACOPOEIA_FOREWORD } from '../lib/pharmacopoeiaData';
import { PharmacopoeiaEditorModal } from './PharmacopoeiaEditorModal';
import { PharmacopoeiaForewordModal } from './PharmacopoeiaForewordModal';

interface NationalPharmacopoeiaProps {
  isDarkMode?: boolean;
  userRole?: string;
  userPowerPoints?: number;
  featureSettings?: Record<string, any>;
  onNavigateToTab?: (tab: string) => void;
  subHeaderPortalId?: string;
  canManage?: boolean;
  mode?: 'view' | 'manage';
}

const CATEGORIES = [
  { id: 'all', label: 'Tất cả chuyên khảo' },
  { id: 'Kháng sinh & Chống nhiễm khuẩn', label: 'Kháng sinh' },
  { id: 'Tim mạch & Huyết áp', label: 'Tim mạch' },
  { id: 'Thần kinh & Giảm đau', label: 'Giảm đau - Hạ sốt' },
  { id: 'Tiêu hóa & Dạ dày', label: 'Tiêu hóa' },
  { id: 'Nội tiết & Chuyển hóa', label: 'Nội tiết' },
  { id: 'Hô hấp & Hen phế quản', label: 'Hô hấp' },
  { id: 'Tim mạch & Chuyển hóa', label: 'Mỡ máu & Chuyển hóa' },
];

const EDITIONS = [
  'Tất cả ấn bản',
  'Dược thư Quốc gia Việt Nam III',
  'Dược thư Quốc gia Việt Nam II',
  'Dược thư Quốc gia Việt Nam IV'
];

export const NationalPharmacopoeia: React.FC<NationalPharmacopoeiaProps> = ({
  isDarkMode = false,
  userRole = 'member',
  userPowerPoints = 0,
  featureSettings = {},
  onNavigateToTab,
  subHeaderPortalId,
  canManage = false,
  mode = 'view'
}) => {
  const isManagement = mode === 'manage' && canManage;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEdition, setSelectedEdition] = useState('Tất cả ấn bản');
  const [selectedMonograph, setSelectedMonograph] = useState<PharmacopoeiaMonograph | null>(null);
  const [firestoreMonographs, setFirestoreMonographs] = useState<PharmacopoeiaMonograph[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pharmacopoeia_deleted_ids') || '[]');
    } catch {
      return [];
    }
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pharmacopoeia_bookmarks') || '[]');
    } catch {
      return [];
    }
  });
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Management State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMonograph, setEditingMonograph] = useState<PharmacopoeiaMonograph | null>(null);
  const [deletingMonograph, setDeletingMonograph] = useState<PharmacopoeiaMonograph | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Foreword (Lời nói đầu Dược thư Quốc gia) State
  const [forewordData, setForewordData] = useState<PharmacopoeiaForeword>(DEFAULT_PHARMACOPOEIA_FOREWORD);
  const [isForewordModalOpen, setIsForewordModalOpen] = useState(false);
  const [forewordModalMode, setForewordModalMode] = useState<'view' | 'edit'>('view');

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Power Points configuration from featureSettings
  const monographMinPower = featureSettings.monographMinPower ?? 0;
  const dosageMinPower = featureSettings.dosageMinPower ?? 0;
  const pharmacologyMinPower = featureSettings.pharmacologyMinPower ?? 0;
  const interactionsMinPower = featureSettings.interactionsMinPower ?? 0;
  const exportMinPower = featureSettings.exportMinPower ?? 0;

  const isPrivileged = isManagement || ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userRole);

  const canViewMonograph = isPrivileged || userPowerPoints >= monographMinPower;
  const canViewDosage = isPrivileged || userPowerPoints >= dosageMinPower;
  const canViewPharmacology = isPrivileged || userPowerPoints >= pharmacologyMinPower;
  const canViewInteractions = isPrivileged || userPowerPoints >= interactionsMinPower;
  const canExport = isPrivileged || userPowerPoints >= exportMinPower;

  // Sync Foreword from Firestore
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'system_config', 'pharmacopoeia_foreword'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setForewordData({
            ...DEFAULT_PHARMACOPOEIA_FOREWORD,
            ...sanitizeFirestoreData(data)
          });
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore foreword sync error:', e);
    }
  }, []);

  // Sync custom monographs from Firestore
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'national_pharmacopoeia'), (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...sanitizeFirestoreData(docSnap.data())
          } as PharmacopoeiaMonograph));
          setFirestoreMonographs(list);
        } else {
          setFirestoreMonographs([]);
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore pharmacopoeia sync error:', e);
    }
  }, []);

  // Merge built-in data + Firestore data
  const allMonographs = useMemo(() => {
    const map = new Map<string, PharmacopoeiaMonograph>();
    
    // 1. Built-in template data
    PHARMACOPOEIA_DATA.forEach(item => {
      if (!deletedIds.includes(item.id)) {
        map.set(item.id, item);
      }
    });

    // 2. Firestore synced data (overrides built-in or adds new ones)
    firestoreMonographs.forEach(item => {
      if (!deletedIds.includes(item.id)) {
        map.set(item.id, item);
      }
    });

    return Array.from(map.values());
  }, [firestoreMonographs, deletedIds]);

  const toggleBookmark = (id: string) => {
    const updated = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter(item => item !== id)
      : [...bookmarkedIds, id];
    setBookmarkedIds(updated);
    try {
      localStorage.setItem('pharmacopoeia_bookmarks', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleCopyMonograph = (item: PharmacopoeiaMonograph) => {
    const text = `[DƯỢC THƯ QUỐC GIA VIỆT NAM]\nChuyên khảo: ${item.vietnameseName} (${item.internationalName})\nMã ATC: ${item.atcCode}\nNhóm dược lý: ${item.pharmacologicalGroup}\nẤn bản: ${item.edition}\n\n1. CHỈ ĐỊNH:\n${item.indications.map(i => '- ' + i).join('\n')}\n\n2. LIỀU DÙNG & CÁCH DÙNG:\nNgười lớn: ${item.dosageAndAdministration.adults}\n${item.dosageAndAdministration.children ? `Trẻ em: ${item.dosageAndAdministration.children}\n` : ''}\n3. CHỐNG CHỈ ĐỊNH:\n${item.contraindications.map(c => '- ' + c).join('\n')}\n\n4. THẬN TRỌNG:\n${item.cautions.general}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrintMonograph = () => {
    window.print();
  };

  // Management CRUD Operations
  const handleOpenCreate = () => {
    setEditingMonograph(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: PharmacopoeiaMonograph, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMonograph(item);
    setIsEditorOpen(true);
  };

  const handleCloneMonograph = async (item: PharmacopoeiaMonograph, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cloned: PharmacopoeiaMonograph = {
      ...item,
      id: 'mono_' + Date.now().toString(36),
      vietnameseName: `${item.vietnameseName} (Bản sao)`,
      internationalName: item.internationalName,
      atcCode: item.atcCode ? `${item.atcCode}_COPY` : 'CHƯA_CÓ',
      notes: `Nhân bản từ chuyên khảo ${item.vietnameseName} lúc ${new Date().toLocaleTimeString('vi-VN')}`
    };

    try {
      await setDoc(doc(db, 'national_pharmacopoeia', cloned.id), sanitizeFirestoreData(cloned));
      showToast(`Đã nhân bản chuyên khảo "${cloned.vietnameseName}" thành công!`, 'success');
      setEditingMonograph(cloned);
      setIsEditorOpen(true);
    } catch (err) {
      console.error('Clone monograph error:', err);
      showToast('Có lỗi khi nhân bản chuyên khảo.', 'error');
    }
  };

  const handleSaveMonograph = async (savedItem: PharmacopoeiaMonograph) => {
    // If was in deletedIds, restore it
    if (deletedIds.includes(savedItem.id)) {
      const updatedDeleted = deletedIds.filter(id => id !== savedItem.id);
      setDeletedIds(updatedDeleted);
      try {
        localStorage.setItem('pharmacopoeia_deleted_ids', JSON.stringify(updatedDeleted));
      } catch (e) {}
    }

    try {
      await setDoc(doc(db, 'national_pharmacopoeia', savedItem.id), sanitizeFirestoreData(savedItem));
      showToast(`Đã lưu chuyên khảo "${savedItem.vietnameseName}" thành công!`, 'success');
      // If the currently viewed detail is updated, refresh it
      if (selectedMonograph && selectedMonograph.id === savedItem.id) {
        setSelectedMonograph(savedItem);
      }
    } catch (err: any) {
      console.error('Firestore save error:', err);
      throw new Error(err?.message || 'Không thể lưu chuyên khảo lên cơ sở dữ liệu.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMonograph) return;
    const target = deletingMonograph;
    try {
      // 1. Delete from Firestore if exists
      await deleteDoc(doc(db, 'national_pharmacopoeia', target.id));
      
      // 2. Mark as deleted in local storage so built-in default item is also hidden
      const updatedDeleted = [...deletedIds, target.id];
      setDeletedIds(updatedDeleted);
      try {
        localStorage.setItem('pharmacopoeia_deleted_ids', JSON.stringify(updatedDeleted));
      } catch (e) {}

      if (selectedMonograph?.id === target.id) {
        setSelectedMonograph(null);
      }
      showToast(`Đã xóa chuyên khảo "${target.vietnameseName}" khỏi Dược thư.`, 'info');
      setDeletingMonograph(null);
    } catch (err) {
      console.error('Delete monograph error:', err);
      showToast('Có lỗi xảy ra khi xóa chuyên khảo.', 'error');
    }
  };

  // Foreword (Lời nói đầu) Handlers
  const handleOpenForeword = (mode: 'view' | 'edit' = 'view') => {
    setForewordModalMode(mode);
    setIsForewordModalOpen(true);
  };

  const handleSaveForeword = async (newForeword: PharmacopoeiaForeword) => {
    try {
      await setDoc(doc(db, 'system_config', 'pharmacopoeia_foreword'), sanitizeFirestoreData(newForeword), { merge: true });
      setForewordData(newForeword);
      showToast('Đã cập nhật và lưu Lời nói đầu Dược thư Quốc gia thành công!', 'success');
    } catch (err: any) {
      console.error('Save foreword error:', err);
      throw new Error(err?.message || 'Không thể lưu Lời nói đầu.');
    }
  };

  // Sync default monographs to Firestore Cloud
  const handleSyncDefaultsToCloud = async () => {
    if (!window.confirm('Hành động này sẽ đồng bộ toàn bộ 20+ chuyên khảo Dược thư chuẩn lên cơ sở dữ liệu Cloud (Firestore) để bạn có thể chỉnh sửa trực tiếp từng mục. Bạn có muốn tiếp tục?')) {
      return;
    }

    try {
      setIsSyncing(true);
      const batch = writeBatch(db);
      PHARMACOPOEIA_DATA.forEach(item => {
        const docRef = doc(db, 'national_pharmacopoeia', item.id);
        batch.set(docRef, sanitizeFirestoreData(item), { merge: true });
      });
      await batch.commit();

      // Reset deletedIds if any
      setDeletedIds([]);
      localStorage.removeItem('pharmacopoeia_deleted_ids');

      showToast(`Đã đồng bộ ${PHARMACOPOEIA_DATA.length} chuyên khảo chuẩn lên cơ sở dữ liệu Cloud!`, 'success');
    } catch (err) {
      console.error('Sync defaults error:', err);
      showToast('Lỗi khi đồng bộ dữ liệu mẫu lên Cloud.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allMonographs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `duoc_thu_quoc_gia_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Đã xuất ${allMonographs.length} chuyên khảo Dược thư ra file JSON.`, 'success');
    } catch (err) {
      showToast('Lỗi khi xuất dữ liệu JSON.', 'error');
    }
  };

  // Import JSON
  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!Array.isArray(parsed)) {
            throw new Error('Định dạng file không hợp lệ (cần danh sách JSON chuyên khảo).');
          }

          setIsSyncing(true);
          const batch = writeBatch(db);
          let count = 0;

          for (const item of parsed) {
            if (item.vietnameseName && item.internationalName) {
              const docId = item.id || 'mono_' + Date.now().toString(36) + '_' + count;
              const docRef = doc(db, 'national_pharmacopoeia', docId);
              batch.set(docRef, sanitizeFirestoreData({ ...item, id: docId }), { merge: true });
              count++;
            }
          }

          await batch.commit();
          showToast(`Đã nhập thành công ${count} chuyên khảo vào Dược thư!`, 'success');
        } catch (err: any) {
          console.error('Import error:', err);
          showToast(err?.message || 'Có lỗi khi đọc file JSON.', 'error');
        } finally {
          setIsSyncing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
    }
  };

  const filteredMonographs = useMemo(() => {
    return allMonographs.filter(item => {
      // In view mode, allow bookmark filter. In management mode, no bookmark filter
      if (!isManagement && onlyBookmarks && !bookmarkedIds.includes(item.id)) return false;
      if (selectedCategory !== 'all' && item.therapeuticCategory !== selectedCategory) return false;
      if (selectedEdition !== 'Tất cả ấn bản' && item.edition !== selectedEdition) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      const matchName = item.vietnameseName?.toLowerCase().includes(q);
      const matchIntl = item.internationalName?.toLowerCase().includes(q);
      const matchAtc = item.atcCode?.toLowerCase().includes(q);
      const matchGroup = item.pharmacologicalGroup?.toLowerCase().includes(q);
      const matchCategory = item.therapeuticCategory?.toLowerCase().includes(q);
      const matchIndication = item.indications?.some(ind => ind.toLowerCase().includes(q));

      return matchName || matchIntl || matchAtc || matchGroup || matchCategory || matchIndication;
    });
  }, [allMonographs, searchTerm, selectedCategory, selectedEdition, onlyBookmarks, bookmarkedIds, isManagement]);

  // Statistics
  const stats = useMemo(() => {
    const total = allMonographs.length;
    const cloudCount = firestoreMonographs.length;
    const edition3Count = allMonographs.filter(m => m.edition?.includes('III')).length;
    const edition2Count = allMonographs.filter(m => m.edition?.includes('II')).length;
    return { total, cloudCount, edition3Count, edition2Count };
  }, [allMonographs, firestoreMonographs]);

  return (
    <div className={cn("min-h-screen pb-24 transition-colors", isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50/50 text-slate-800")}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold",
              toastMessage.type === 'success'
                ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20"
                : toastMessage.type === 'error'
                ? "bg-rose-600 text-white border-rose-500 shadow-rose-600/20"
                : "bg-slate-800 text-white border-slate-700 shadow-slate-900/20"
            )}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle size={16} className="shrink-0" />
            ) : (
              <Info size={16} className="shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJson}
        accept=".json"
        className="hidden"
      />

      {/* Top Header Banner */}
      <div className={cn(
        "border-b sticky top-0 z-30 backdrop-blur-md transition-colors px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5",
        isDarkMode ? "bg-slate-900/85 border-slate-800" : "bg-white/85 border-slate-200/80 shadow-xs"
      )}>
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0",
              isManagement ? "bg-emerald-600 shadow-emerald-600/25" : "bg-teal-600 shadow-teal-600/20"
            )}>
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={cn("text-lg sm:text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                  {isManagement ? 'Quản lý Dược thư Quốc gia' : 'Dược thư Quốc gia Việt Nam'}
                </h1>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                  isManagement
                    ? (isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                    : (isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-700 border-teal-200")
                )}>
                  {isManagement ? 'Quản lý Dữ liệu' : 'Chuẩn Bộ Y Tế'}
                </span>
              </div>
              <p className={cn("text-[11px] font-medium line-clamp-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                {isManagement
                  ? 'Thêm mới, cập nhật chuyên khảo, điều chỉnh liều dùng, chỉ định & tương tác thuốc'
                  : 'Tra cứu chuyên khảo chính thống, hướng dẫn sử dụng, liều dùng & tương tác thuốc'}
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {isManagement ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Thêm chuyên khảo mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenForeword('edit')}
                  title="Điền & Chỉnh sửa Lời nói đầu Dược thư Quốc gia"
                  className={cn(
                    "p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                    isDarkMode
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-300 hover:bg-teal-500/20"
                      : "bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100"
                  )}
                >
                  <FileText size={14} className={isDarkMode ? "text-teal-400" : "text-teal-600"} />
                  <span className="hidden sm:inline">Lời nói đầu</span>
                  <Edit3 size={12} className="opacity-75" />
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  title="Xuất cơ sở dữ liệu Dược thư ra file JSON"
                  className={cn(
                    "p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Xuất JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Nhập dữ liệu từ file JSON"
                  className={cn(
                    "p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Upload size={14} />
                  <span className="hidden sm:inline">Nhập JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncDefaultsToCloud}
                  disabled={isSyncing}
                  title="Nạp toàn bộ 20+ chuyên khảo Dược thư chuẩn lên Cloud Firestore"
                  className={cn(
                    "p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50",
                    isDarkMode ? "bg-teal-500/10 border-teal-500/20 text-teal-300 hover:bg-teal-500/20" : "bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100"
                  )}
                >
                  <Database size={14} className={isSyncing ? "animate-spin text-teal-500" : ""} />
                  <span className="hidden md:inline">{isSyncing ? 'Đang nạp...' : 'Đồng bộ Dược thư mẫu'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenForeword('view')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-teal-300 hover:text-white" : "bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100"
                  )}
                  title="Xem Lời nói đầu & Hội đồng biên soạn Dược thư Quốc gia"
                >
                  <BookOpen size={13} className={isDarkMode ? "text-teal-400" : "text-teal-600"} />
                  <span>Lời nói đầu</span>
                </button>

                <div className={cn(
                  "px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold",
                  isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                )}>
                  <Zap size={14} className="text-amber-500 fill-amber-500" />
                  <span>Quyền lực: <strong className={isDarkMode ? "text-amber-400" : "text-amber-600"}>{userPowerPoints}</strong> điểm</span>
                </div>

                <button
                  onClick={() => setOnlyBookmarks(!onlyBookmarks)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                    onlyBookmarks
                      ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                      : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900")
                  )}
                >
                  <Bookmark size={13} className={onlyBookmarks ? "fill-white" : ""} />
                  <span>Đã lưu ({bookmarkedIds.length})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 space-y-6">
        {/* Foreword Featured Card / Management Quick Access */}
        <div className={cn(
          "p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
          isDarkMode
            ? "bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-slate-900/40 border-teal-800/40 text-slate-200 shadow-lg"
            : "bg-gradient-to-r from-teal-50/80 via-white to-emerald-50/50 border-teal-200 text-slate-800 shadow-xs"
        )}>
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md",
              isManagement ? "bg-emerald-600 shadow-emerald-600/20" : "bg-teal-600 shadow-teal-600/20"
            )}>
              <Quote size={20} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                  isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/30" : "bg-teal-100 text-teal-800 border-teal-200"
                )}>
                  Văn bản quy phạm chính thức
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-400">{forewordData.publisher}</span>
                {forewordData.decisionNumber && (
                  <span className="text-xs font-medium text-slate-400 hidden sm:inline">({forewordData.decisionNumber})</span>
                )}
              </div>
              <h3 className={cn("text-base font-black truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                {forewordData.title} ({forewordData.edition})
              </h3>
              <p className={cn("text-xs leading-relaxed line-clamp-2 italic", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                "{forewordData.content ? forewordData.content.slice(0, 220) : 'Lời nói đầu Dược thư Quốc gia Việt Nam'}..."
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {isManagement ? (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenForeword('view')}
                  className={cn(
                    "px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Eye size={14} />
                  <span>Xem trước</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenForeword('edit')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>Điền & Chỉnh sửa Lời nói đầu</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenForeword('view')}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <BookOpen size={14} />
                <span>Đọc toàn văn Lời nói đầu</span>
              </button>
            )}
          </div>
        </div>
        {/* Management Stats Summary Cards */}
        {isManagement && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200/80 shadow-2xs")}>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng chuyên khảo</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{stats.total}</span>
                <span className="text-xs text-emerald-500 font-bold">hoạt động</span>
              </div>
            </div>

            <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200/80 shadow-2xs")}>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cloud Firestore DB</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={cn("text-2xl font-black", isDarkMode ? "text-teal-400" : "text-teal-600")}>{stats.cloudCount}</span>
                <span className="text-[11px] text-slate-400">bản ghi tùy biến</span>
              </div>
            </div>

            <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200/80 shadow-2xs")}>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ấn bản III (Bộ Y Tế)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={cn("text-2xl font-black", isDarkMode ? "text-blue-400" : "text-blue-600")}>{stats.edition3Count}</span>
                <span className="text-[11px] text-slate-400">chuyên khảo</span>
              </div>
            </div>

            <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200/80 shadow-2xs")}>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ấn bản II & Khác</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={cn("text-2xl font-black", isDarkMode ? "text-purple-400" : "text-purple-600")}>{stats.edition2Count}</span>
                <span className="text-[11px] text-slate-400">chuyên khảo</span>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters Card */}
        <div className={cn(
          "p-4 sm:p-6 rounded-3xl border transition-all space-y-4",
          isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200/80 shadow-xs"
        )}>
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên thuốc (Paracetamol, Amoxicilin...), mã ATC (N02BE01...), hoạt chất, chỉ định..."
              className={cn(
                "w-full pl-12 pr-10 py-3.5 rounded-2xl border text-sm font-medium transition-all outline-none",
                isDarkMode
                  ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  : "bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              )}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 p-1 transition-colors", isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Categories Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Filter size={12} /> Nhóm:
            </span>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer",
                  selectedCategory === cat.id
                    ? (isManagement ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20" : "bg-teal-600 text-white shadow-sm shadow-teal-600/20")
                    : (isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Edition filter & Stats */}
          <div className={cn("flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs", isDarkMode ? "border-slate-800/60" : "border-slate-100")}>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Ấn bản:</span>
              <select
                value={selectedEdition}
                onChange={(e) => setSelectedEdition(e.target.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                {EDITIONS.map(ed => (
                  <option key={ed} value={ed}>{ed}</option>
                ))}
              </select>
            </div>

            <div className={cn("font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              Tìm thấy <strong className={cn("font-bold", isManagement ? (isDarkMode ? "text-emerald-400" : "text-emerald-600") : (isDarkMode ? "text-teal-400" : "text-teal-600"))}>{filteredMonographs.length}</strong> chuyên khảo thuốc chuẩn
            </div>
          </div>
        </div>

        {/* Access Warning if power points too low for viewing full monograph */}
        {!isManagement && !canViewMonograph && (
          <div className={cn(
            "p-4 rounded-2xl border flex items-start gap-3",
            isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
          )}>
            <ShieldAlert size={20} className="shrink-0 text-amber-500 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Yêu cầu điểm quyền lực để tra cứu toàn văn chuyên khảo</p>
              <p className="opacity-90 mt-0.5">
                Bạn cần tối thiểu <strong>{monographMinPower}</strong> điểm quyền lực để mở xem chi tiết chuyên khảo Dược thư. Hiện tại bạn có <strong>{userPowerPoints}</strong> điểm.
              </p>
            </div>
          </div>
        )}

        {/* Monograph List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredMonographs.map(item => {
            const isBookmarked = bookmarkedIds.includes(item.id);
            const isCloudSaved = firestoreMonographs.some(m => m.id === item.id);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "group relative p-5 rounded-3xl border transition-all flex flex-col justify-between cursor-pointer hover:shadow-md",
                  isDarkMode
                    ? "bg-slate-900/50 border-slate-800 hover:border-teal-500/50 hover:bg-slate-900"
                    : "bg-white border-slate-200/80 hover:border-teal-500/50 hover:shadow-teal-500/5"
                )}
                onClick={() => setSelectedMonograph(item)}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn(
                          "text-base font-black truncate transition-colors",
                          isDarkMode ? "text-white group-hover:text-teal-400" : "text-slate-900 group-hover:text-teal-600"
                        )}>
                          {item.vietnameseName}
                        </h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0",
                          isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                        )}>
                          {item.atcCode}
                        </span>
                        {isCloudSaved && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border shrink-0",
                            isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-700 border-teal-200"
                          )}>
                            Cloud
                          </span>
                        )}
                      </div>
                      <p className={cn("text-xs font-medium truncate mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        {item.internationalName}
                      </p>
                    </div>

                    {/* Right action button in header */}
                    {isManagement ? (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(item, e)}
                          className={cn(
                            "p-2 rounded-xl transition-all border",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                          )}
                          title="Chỉnh sửa chuyên khảo"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(item.id);
                        }}
                        className={cn(
                          "p-2 rounded-xl transition-all shrink-0",
                          isBookmarked
                            ? "bg-amber-500/10 text-amber-500"
                            : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")
                        )}
                        title={isBookmarked ? "Bỏ lưu" : "Lưu chuyên khảo"}
                      >
                        <Bookmark size={16} className={isBookmarked ? "fill-amber-500" : ""} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className={cn("flex items-center gap-1.5 text-xs font-bold", isDarkMode ? "text-teal-400" : "text-teal-600")}>
                      <Pill size={13} className="shrink-0" />
                      <span className="truncate">{item.pharmacologicalGroup}</span>
                    </div>

                    <p className={cn("text-xs line-clamp-2 leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                      {item.indications?.[0] || 'Chuyên khảo chuẩn Dược thư Quốc gia'}
                    </p>
                  </div>
                </div>

                {/* Card footer */}
                <div className={cn("pt-3 border-t flex items-center justify-between text-[11px]", isDarkMode ? "border-slate-800/60" : "border-slate-100")}>
                  <span className="text-slate-400 font-medium truncate max-w-[140px]">
                    {item.edition}
                  </span>

                  {isManagement ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleCloneMonograph(item, e)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1",
                          isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                        )}
                        title="Nhân bản chuyên khảo"
                      >
                        <CopyPlus size={11} />
                        <span className="hidden sm:inline">Nhân bản</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingMonograph(item);
                        }}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 text-rose-500 hover:bg-rose-500/10",
                          isDarkMode ? "border-rose-500/20" : "border-rose-200"
                        )}
                        title="Xóa chuyên khảo"
                      >
                        <Trash2 size={11} />
                        <span className="hidden sm:inline">Xóa</span>
                      </button>
                    </div>
                  ) : (
                    <div className={cn("flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform", isDarkMode ? "text-teal-400" : "text-teal-600")}>
                      <span>Xem chi tiết</span>
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredMonographs.length === 0 && (
          <div className={cn(
            "p-12 text-center rounded-3xl border border-dashed",
            isDarkMode ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-white"
          )}>
            <BookOpen size={40} className="mx-auto text-slate-400 mb-3 opacity-60" />
            <h3 className={cn("text-base font-bold mb-1", isDarkMode ? "text-white" : "text-slate-800")}>
              Không tìm thấy chuyên khảo nào phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Hãy thử tìm kiếm với từ khóa khác (ví dụ: Paracetamol, Amoxicilin, Ciprofloxacin, Metformin...) hoặc bỏ bớt bộ lọc nhóm trị liệu.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedEdition('Tất cả ấn bản');
                  setOnlyBookmarks(false);
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-teal-700 transition-all cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
              {isManagement && (
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Tạo chuyên khảo mới</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Monograph Detail Modal */}
      <AnimatePresence>
        {selectedMonograph && (
          <div 
            onClick={() => setSelectedMonograph(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={cn(
                "w-full max-w-4xl xl:max-w-5xl max-h-[92vh] flex flex-col rounded-[28px] border shadow-2xl overflow-hidden cursor-default",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
              )}
            >
              {/* Modal Header */}
              <div className={cn(
                "p-5 sm:p-6 border-b flex items-start justify-between gap-4 shrink-0",
                isDarkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-100 bg-slate-50/70"
              )}>
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/25 shrink-0 mt-0.5">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                        {selectedMonograph.vietnameseName}
                      </h2>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                        isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-700 border-teal-200"
                      )}>
                        ATC: {selectedMonograph.atcCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {selectedMonograph.internationalName} • <span className={cn("font-bold", isDarkMode ? "text-teal-400" : "text-teal-600")}>{selectedMonograph.pharmacologicalGroup}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      {selectedMonograph.edition} • Nhóm trị liệu: {selectedMonograph.therapeuticCategory}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit button directly in Detail Modal for managers */}
                  {isManagement ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenEdit(selectedMonograph);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
                    >
                      <Edit3 size={15} />
                      <span className="hidden sm:inline">Chỉnh sửa</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleBookmark(selectedMonograph.id)}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer",
                        bookmarkedIds.includes(selectedMonograph.id)
                          ? "bg-amber-500 text-white border-amber-600"
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900")
                      )}
                      title="Lưu chuyên khảo"
                    >
                      <Bookmark size={16} className={bookmarkedIds.includes(selectedMonograph.id) ? "fill-white" : ""} />
                    </button>
                  )}

                  {canExport && (
                    <>
                      <button
                        onClick={() => handleCopyMonograph(selectedMonograph)}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold",
                          copiedId === selectedMonograph.id
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900")
                        )}
                        title="Sao chép tóm tắt chuyên khảo"
                      >
                        {copiedId === selectedMonograph.id ? <Check size={16} /> : <Copy size={16} />}
                        <span className="hidden sm:inline">{copiedId === selectedMonograph.id ? 'Đã sao chép' : 'Sao chép'}</span>
                      </button>

                      <button
                        onClick={handlePrintMonograph}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all cursor-pointer",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                        )}
                        title="In chuyên khảo"
                      >
                        <Printer size={16} />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setSelectedMonograph(null)}
                    className={cn(
                      "p-2.5 rounded-xl transition-colors ml-1 cursor-pointer",
                      isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body with Sections */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
                {!canViewMonograph ? (
                  <div className="p-8 text-center space-y-3">
                    <Lock size={40} className="mx-auto text-amber-500 opacity-80" />
                    <h3 className="text-lg font-black">Nội dung yêu cầu Điểm quyền lực</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Để xem chi tiết toàn văn chuyên khảo Dược thư Quốc gia cho thuốc này, tài khoản cần đạt mức <strong>{monographMinPower}</strong> điểm quyền lực.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 1. Dạng thuốc và hàm lượng */}
                    <div className={cn(
                      "p-5 rounded-2xl border",
                      isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-teal-50/40 border-teal-100"
                    )}>
                      <h4 className={cn("text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2", isDarkMode ? "text-teal-400" : "text-teal-700")}>
                        <Pill size={15} /> Dạng thuốc & Hàm lượng chuẩn
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMonograph.dosageForms?.map((form, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-medium border",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-teal-200 text-slate-700 shadow-xs"
                            )}
                          >
                            {form}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 2. Dược lực học & Dược động học */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Activity size={15} className="text-teal-500" /> Dược lý & Cơ chế tác dụng
                        </span>
                        {!canViewPharmacology && (
                          <span className="text-[10px] text-amber-500 flex items-center gap-1 font-bold">
                            <Lock size={12} /> Yêu cầu {pharmacologyMinPower} điểm
                          </span>
                        )}
                      </h4>

                      {canViewPharmacology ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50 border-slate-200/70")}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dược lực học (Cơ chế)</p>
                            <p className={cn("text-xs leading-relaxed whitespace-pre-line", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                              {selectedMonograph.pharmacology?.mechanism}
                            </p>
                          </div>
                          <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50 border-slate-200/70")}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dược động học (ADME)</p>
                            <p className={cn("text-xs leading-relaxed whitespace-pre-line", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                              {selectedMonograph.pharmacology?.pharmacokinetics}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className={cn("p-4 rounded-2xl border text-xs text-slate-500 text-center", isDarkMode ? "border-slate-800 bg-slate-800/20" : "border-slate-200 bg-slate-50")}>
                          Cần điểm quyền lực ≥ {pharmacologyMinPower} để xem phần Dược động học & Dược lực học chi tiết.
                        </div>
                      )}
                    </div>

                    {/* 3. Chỉ định điều trị */}
                    <div className="space-y-2">
                      <h4 className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                        <Check size={15} /> Chỉ định điều trị
                      </h4>
                      <div className={cn(
                        "p-4 rounded-2xl border space-y-2",
                        isDarkMode ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50/50 border-emerald-200/60"
                      )}>
                        {selectedMonograph.indications?.map((ind, iIdx) => (
                          <div key={iIdx} className={cn("flex items-start gap-2 text-xs leading-relaxed", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                            <span className="text-emerald-500 font-bold mt-0.5">•</span>
                            <span>{ind}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. Liều lượng & Cách dùng */}
                    <div className="space-y-3">
                      <h4 className={cn("text-xs font-black uppercase tracking-wider flex items-center justify-between", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                        <span className="flex items-center gap-2">
                          <Stethoscope size={15} /> Liều lượng & Cách dùng
                        </span>
                        {!canViewDosage && (
                          <span className="text-[10px] text-amber-500 flex items-center gap-1 font-bold">
                            <Lock size={12} /> Yêu cầu {dosageMinPower} điểm
                          </span>
                        )}
                      </h4>

                      {canViewDosage ? (
                        <div className={cn(
                          "p-5 rounded-2xl border space-y-3",
                          isDarkMode ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50/50 border-blue-200/60"
                        )}>
                          {selectedMonograph.dosageAndAdministration?.general && (
                            <div>
                              <p className={cn("text-xs font-bold", isDarkMode ? "text-blue-400" : "text-blue-600")}>Cách dùng chung:</p>
                              <p className={cn("text-xs mt-0.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>{selectedMonograph.dosageAndAdministration.general}</p>
                            </div>
                          )}
                          <div>
                            <p className={cn("text-xs font-bold", isDarkMode ? "text-blue-400" : "text-blue-600")}>Liều dùng cho Người lớn:</p>
                            <p className={cn("text-xs mt-0.5 leading-relaxed whitespace-pre-line", isDarkMode ? "text-slate-300" : "text-slate-700")}>{selectedMonograph.dosageAndAdministration?.adults}</p>
                          </div>
                          {selectedMonograph.dosageAndAdministration?.children && (
                            <div>
                              <p className={cn("text-xs font-bold", isDarkMode ? "text-blue-400" : "text-blue-600")}>Liều dùng cho Trẻ em:</p>
                              <p className={cn("text-xs mt-0.5 leading-relaxed whitespace-pre-line", isDarkMode ? "text-slate-300" : "text-slate-700")}>{selectedMonograph.dosageAndAdministration.children}</p>
                            </div>
                          )}
                          {selectedMonograph.dosageAndAdministration?.specialPopulations && (
                            <div>
                              <p className={cn("text-xs font-bold", isDarkMode ? "text-blue-400" : "text-blue-600")}>Đối tượng đặc biệt (Suy gan, Suy thận, Người cao tuổi):</p>
                              <p className={cn("text-xs mt-0.5 leading-relaxed whitespace-pre-line", isDarkMode ? "text-slate-300" : "text-slate-700")}>{selectedMonograph.dosageAndAdministration.specialPopulations}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={cn("p-4 rounded-2xl border text-xs text-slate-500 text-center", isDarkMode ? "border-slate-800 bg-slate-800/20" : "border-slate-200 bg-slate-50")}>
                          Cần điểm quyền lực ≥ {dosageMinPower} để xem hướng dẫn liều dùng chi tiết.
                        </div>
                      )}
                    </div>

                    {/* 5. Chống chỉ định */}
                    <div className="space-y-2">
                      <h4 className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-rose-400" : "text-rose-600")}>
                        <AlertTriangle size={15} /> Chống chỉ định
                      </h4>
                      <div className={cn(
                        "p-4 rounded-2xl border space-y-2",
                        isDarkMode ? "bg-rose-500/5 border-rose-500/20" : "bg-rose-50/50 border-rose-200/60"
                      )}>
                        {selectedMonograph.contraindications?.map((contra, cIdx) => (
                          <div key={cIdx} className={cn("flex items-start gap-2 text-xs leading-relaxed", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                            <span className="text-rose-500 font-bold mt-0.5">✕</span>
                            <span>{contra}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 6. Thận trọng & Cảnh báo */}
                    <div className="space-y-3">
                      <h4 className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                        <ShieldCheck size={15} /> Thận trọng & Đối tượng đặc biệt
                      </h4>
                      <div className={cn(
                        "p-5 rounded-2xl border space-y-3",
                        isDarkMode ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50/50 border-amber-200/60"
                      )}>
                        <div>
                          <p className={cn("text-xs font-bold", isDarkMode ? "text-amber-400" : "text-amber-700")}>Cảnh báo chung:</p>
                          <p className={cn("text-xs mt-0.5 leading-relaxed whitespace-pre-line", isDarkMode ? "text-slate-300" : "text-slate-700")}>{selectedMonograph.cautions?.general}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-amber-100")}>
                            <p className={cn("text-[11px] font-bold", isDarkMode ? "text-amber-400" : "text-amber-600")}>Thời kỳ mang thai:</p>
                            <p className={cn("text-xs mt-0.5 leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>{selectedMonograph.cautions?.pregnancy}</p>
                          </div>
                          <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-amber-100")}>
                            <p className={cn("text-[11px] font-bold", isDarkMode ? "text-amber-400" : "text-amber-600")}>Thời kỳ cho con bú:</p>
                            <p className={cn("text-xs mt-0.5 leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>{selectedMonograph.cautions?.lactation}</p>
                          </div>
                        </div>
                        {(selectedMonograph.cautions?.hepaticImpairment || selectedMonograph.cautions?.renalImpairment || selectedMonograph.cautions?.elderly) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                            {selectedMonograph.cautions?.hepaticImpairment && (
                              <div className={cn("p-2.5 rounded-xl border text-xs", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-white border-slate-200")}>
                                <strong className="text-[10px] text-slate-400 uppercase block">Suy gan:</strong>
                                <span>{selectedMonograph.cautions.hepaticImpairment}</span>
                              </div>
                            )}
                            {selectedMonograph.cautions?.renalImpairment && (
                              <div className={cn("p-2.5 rounded-xl border text-xs", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-white border-slate-200")}>
                                <strong className="text-[10px] text-slate-400 uppercase block">Suy thận:</strong>
                                <span>{selectedMonograph.cautions.renalImpairment}</span>
                              </div>
                            )}
                            {selectedMonograph.cautions?.elderly && (
                              <div className={cn("p-2.5 rounded-xl border text-xs", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-white border-slate-200")}>
                                <strong className="text-[10px] text-slate-400 uppercase block">Người cao tuổi:</strong>
                                <span>{selectedMonograph.cautions.elderly}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 7. Tác dụng không mong muốn (ADR) */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <AlertTriangle size={15} className="text-orange-500" /> Tác dụng không mong muốn (ADR)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedMonograph.adverseReactions?.map((adrGroup, gIdx) => (
                          <div key={gIdx} className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50 border-slate-200/80")}>
                            <p className={cn("text-[11px] font-bold mb-2", isDarkMode ? "text-orange-400" : "text-orange-600")}>{adrGroup.frequency}</p>
                            <ul className={cn("space-y-1 text-xs", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                              {adrGroup.effects?.map((eff, eIdx) => (
                                <li key={eIdx} className="flex items-start gap-1.5">
                                  <span className="text-slate-400">•</span>
                                  <span>{eff}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 8. Tương tác thuốc */}
                    <div className="space-y-3">
                      <h4 className={cn("text-xs font-black uppercase tracking-wider flex items-center justify-between", isDarkMode ? "text-indigo-400" : "text-indigo-600")}>
                        <span className="flex items-center gap-2">
                          <ShieldAlert size={15} /> Tương tác thuốc & Tương kỵ
                        </span>
                        {!canViewInteractions && (
                          <span className="text-[10px] text-amber-500 flex items-center gap-1 font-bold">
                            <Lock size={12} /> Yêu cầu {interactionsMinPower} điểm
                          </span>
                        )}
                      </h4>

                      {canViewInteractions ? (
                        <div className={cn(
                          "p-4 rounded-2xl border space-y-2",
                          isDarkMode ? "bg-indigo-500/5 border-indigo-500/20" : "bg-indigo-50/50 border-indigo-200/60"
                        )}>
                          {selectedMonograph.drugInteractions?.map((inter, inIdx) => (
                            <div key={inIdx} className={cn("flex items-start gap-2 text-xs", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                              <span className="text-indigo-500 font-bold mt-0.5">⚡</span>
                              <span>{inter}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={cn("p-4 rounded-2xl border text-xs text-slate-500 text-center", isDarkMode ? "border-slate-800 bg-slate-800/20" : "border-slate-200 bg-slate-50")}>
                          Cần điểm quyền lực ≥ {interactionsMinPower} để tra cứu tương tác thuốc chi tiết.
                        </div>
                      )}
                    </div>

                    {/* 9. Quá liều & Bảo quản */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50 border-slate-200/70")}>
                        <p className={cn("text-[11px] font-bold uppercase tracking-wider mb-2", isDarkMode ? "text-rose-400" : "text-rose-600")}>Quá liều & Xử trí</p>
                        <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                          <strong>Triệu chứng:</strong> {selectedMonograph.toxicityAndOverdose?.symptoms}
                        </p>
                        <p className={cn("text-xs leading-relaxed mt-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                          <strong>Xử trí:</strong> {selectedMonograph.toxicityAndOverdose?.management}
                        </p>
                      </div>

                      <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50 border-slate-200/70")}>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Điều kiện bảo quản</p>
                        <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                          {selectedMonograph.storage}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor Modal for Adding / Editing Monograph */}
      <PharmacopoeiaEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveMonograph}
        monograph={editingMonograph}
        isDarkMode={isDarkMode}
      />

      {/* Foreword Modal for Viewing & Editing Lời nói đầu */}
      <PharmacopoeiaForewordModal
        isOpen={isForewordModalOpen}
        onClose={() => setIsForewordModalOpen(false)}
        foreword={forewordData}
        onSave={handleSaveForeword}
        canManage={isManagement}
        initialMode={forewordModalMode}
        isDarkMode={isDarkMode}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingMonograph && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
              )}
            >
              <div className="flex items-center gap-3 text-rose-500">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black">Xác nhận xóa chuyên khảo</h3>
                  <p className="text-xs text-slate-400">Hành động này không thể hoàn tác</p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-500">
                Bạn có chắc chắn muốn xóa chuyên khảo <strong>{deletingMonograph.vietnameseName}</strong> ({deletingMonograph.internationalName} - ATC: {deletingMonograph.atcCode}) khỏi hệ thống Dược thư Quốc gia không?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingMonograph(null)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer",
                    isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NationalPharmacopoeia;
