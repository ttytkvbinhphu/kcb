import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquarePlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Pill,
  Phone,
  Mail,
  Building2,
  Calendar,
  Sparkles,
  Shield,
  Trash2,
  Edit3,
  ExternalLink,
  Save,
  Check,
  RefreshCw,
  Award,
  Layers,
  ArrowRight,
  HelpCircle,
  FileText,
  User,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDateSafe } from '../lib/utils';
import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { DrugFeedback, Drug, UserProfile } from '../types';
import ConfirmModal from './ConfirmModal';
import DrugDetailModal from './DrugDetailModal';

interface DrugFeedbackManagementProps {
  isDarkMode: boolean;
  userRole?: string;
  uid?: string;
}

const SECTION_LABELS: Record<string, string> = {
  all: 'Tất cả mục',
  activeIngredients: 'Hoạt chất & Nồng độ',
  indications: 'Chỉ định điều trị',
  contraindications: 'Chống chỉ định',
  dosage: 'Liều dùng & Cách dùng',
  interactions: 'Tương tác thuốc',
  adr: 'Tác dụng không mong muốn (ADR)',
  precautions: 'Thận trọng & Cảnh báo',
  pregnancy: 'Phụ nữ có thai & Cho con bú',
  overdose: 'Quá liều & Xử trí',
  storage: 'Bảo quản & Hạn dùng',
  price: 'Giá cả & Quy cách đóng gói',
  insurance: 'Bảo hiểm y tế (BHYT)',
  general: 'Thông tin chung khác'
};

const FEEDBACK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  correction: { label: 'Đính chính thông tin', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  addition: { label: 'Bổ sung dữ liệu', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  error_report: { label: 'Báo lỗi dữ liệu', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  suggestion: { label: 'Đề xuất cải tiến', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  other: { label: 'Ý kiến khác', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' }
};

const PRIORITY_BADGES: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  urgent: { label: 'Khẩn cấp', badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-black', dotClass: 'bg-red-500 animate-ping' },
  high: { label: 'Ưu tiên cao', badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold', dotClass: 'bg-orange-500' },
  normal: { label: 'Bình thường', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium', dotClass: 'bg-blue-500' },
  low: { label: 'Thấp', badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-normal', dotClass: 'bg-slate-400' }
};

export const DrugFeedbackManagement: React.FC<DrugFeedbackManagementProps> = ({
  isDarkMode,
  userRole = 'admin',
  uid = ''
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'feedbacks' | 'settings'>('feedbacks');
  const [feedbacks, setFeedbacks] = useState<DrugFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  // Power Score Configuration State
  const [featureSettings, setFeatureSettings] = useState<Record<string, any>>({});
  const [feedbackMinPower, setFeedbackMinPower] = useState<number>(0);
  const [configRoles, setConfigRoles] = useState<Array<{ id: string; name: string; powerPoints?: number }>>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Selection & Modal States
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<string[]>([]);
  const [viewingFeedback, setViewingFeedback] = useState<DrugFeedback | null>(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteBulk, setConfirmDeleteBulk] = useState(false);

  // Drug preview modal
  const [previewDrug, setPreviewDrug] = useState<Drug | null>(null);
  const [isPreviewDrugOpen, setIsPreviewDrugOpen] = useState(false);
  const [loadingDrugPreview, setLoadingDrugPreview] = useState(false);

  // 1. Subscribe to Feedbacks
  useEffect(() => {
    setLoadingFeedbacks(true);
    const q = query(collection(db, 'drug_feedbacks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: DrugFeedback[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setFeedbacks(list);
        setLoadingFeedbacks(false);
      },
      (error) => {
        console.error('Error fetching feedbacks:', error);
        handleFirestoreError(error, OperationType.LIST, 'drug_feedbacks');
        setLoadingFeedbacks(false);
      }
    );
    return () => unsub();
  }, []);

  // 2. Subscribe to Feature Settings & Roles
  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'system_config', 'feature_settings'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setFeatureSettings(data);
          const minP = data.drugFeedbackMinPower ?? data.view_directory?.feedbackMinPower ?? 0;
          setFeedbackMinPower(minP);
        }
      },
      (error) => {
        console.error('Error loading feature settings:', error);
        handleFirestoreError(error, OperationType.GET, 'system_config/feature_settings');
      }
    );

    const unsubRoles = onSnapshot(
      collection(db, 'config_roles'),
      (snapshot) => {
        const rolesList = snapshot.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name || d.id,
          powerPoints: (d.data() as any).powerPoints ?? 0
        }));
        setConfigRoles(rolesList);
      },
      (error) => {
        console.error('Error loading roles:', error);
        handleFirestoreError(error, OperationType.LIST, 'config_roles');
      }
    );

    return () => {
      unsubSettings();
      unsubRoles();
    };
  }, []);

  // Save Power Setting
  const handleSavePowerSetting = async () => {
    setIsSavingSettings(true);
    setSaveSuccess(false);
    try {
      const updated = {
        ...featureSettings,
        drugFeedbackMinPower: Number(feedbackMinPower) || 0,
        view_directory: {
          ...(featureSettings.view_directory || {}),
          feedbackMinPower: Number(feedbackMinPower) || 0
        }
      };

      await setDoc(doc(db, 'system_config', 'feature_settings'), updated, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving power setting:', error);
      handleFirestoreError(error, OperationType.UPDATE, 'system_config/feature_settings');
      alert('Lỗi khi lưu thiết lập: ' + (error.message || error));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Update Status of a Feedback
  const handleUpdateStatus = async (feedbackId: string, newStatus: DrugFeedback['status']) => {
    try {
      await updateDoc(doc(db, 'drug_feedbacks', feedbackId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      if (viewingFeedback && viewingFeedback.id === feedbackId) {
        setViewingFeedback((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error: any) {
      console.error('Error updating feedback status:', error);
      handleFirestoreError(error, OperationType.UPDATE, `drug_feedbacks/${feedbackId}`);
    }
  };

  // Save Admin Note
  const handleSaveAdminNote = async () => {
    if (!viewingFeedback) return;
    setIsSavingNote(true);
    try {
      await updateDoc(doc(db, 'drug_feedbacks', viewingFeedback.id), {
        adminNotes: adminNoteDraft.trim(),
        updatedAt: new Date().toISOString()
      });
      setViewingFeedback((prev) => (prev ? { ...prev, adminNotes: adminNoteDraft.trim() } : null));
    } catch (error: any) {
      console.error('Error updating admin note:', error);
      handleFirestoreError(error, OperationType.UPDATE, `drug_feedbacks/${viewingFeedback.id}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Delete Feedback
  const handleDeleteFeedback = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'drug_feedbacks', id));
      if (viewingFeedback?.id === id) setViewingFeedback(null);
      setConfirmDeleteId(null);
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      handleFirestoreError(error, OperationType.DELETE, `drug_feedbacks/${id}`);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedFeedbacks.length === 0) return;
    try {
      await Promise.all(selectedFeedbacks.map((id) => deleteDoc(doc(db, 'drug_feedbacks', id))));
      setSelectedFeedbacks([]);
      setConfirmDeleteBulk(false);
    } catch (error: any) {
      console.error('Error bulk deleting feedbacks:', error);
      handleFirestoreError(error, OperationType.DELETE, 'drug_feedbacks');
    }
  };

  // Bulk Resolve
  const handleBulkResolve = async () => {
    if (selectedFeedbacks.length === 0) return;
    try {
      const now = new Date().toISOString();
      await Promise.all(
        selectedFeedbacks.map((id) =>
          updateDoc(doc(db, 'drug_feedbacks', id), {
            status: 'resolved',
            updatedAt: now
          })
        )
      );
      setSelectedFeedbacks([]);
    } catch (error: any) {
      console.error('Error bulk resolving feedbacks:', error);
      handleFirestoreError(error, OperationType.UPDATE, 'drug_feedbacks');
    }
  };

  // Open Drug Detail Preview
  const handleOpenDrugPreview = async (drugIdOrName: string, drugNameFallback?: string) => {
    setLoadingDrugPreview(true);
    try {
      // 1. Try finding by document id
      let drugDoc = await getDoc(doc(db, 'drugs', drugIdOrName));
      if (!drugDoc.exists()) {
        // Try searching in drugs collection
        const q = query(collection(db, 'drugs'));
        const snap = await getDocs(q);
        const found = snap.docs.find(
          (d) =>
            d.id === drugIdOrName ||
            (d.data() as any).name?.toLowerCase() === (drugNameFallback || drugIdOrName).toLowerCase()
        );
        if (found) {
          setPreviewDrug({ id: found.id, ...(found.data() as any) });
          setIsPreviewDrugOpen(true);
          setLoadingDrugPreview(false);
          return;
        }
      } else {
        setPreviewDrug({ id: drugDoc.id, ...(drugDoc.data() as any) });
        setIsPreviewDrugOpen(true);
        setLoadingDrugPreview(false);
        return;
      }

      // Fallback pseudo drug
      setPreviewDrug({
        id: drugIdOrName,
        name: drugNameFallback || drugIdOrName,
        activeIngredients: [],
        indications: [],
        contraindications: [],
        dosage: '',
        status: 'open'
      } as any);
      setIsPreviewDrugOpen(true);
    } catch (err) {
      console.error('Error previewing drug:', err);
    } finally {
      setLoadingDrugPreview(false);
    }
  };

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      // Status
      if (statusFilter !== 'all' && fb.status !== statusFilter) return false;
      // Type
      if (typeFilter !== 'all' && fb.feedbackType !== typeFilter) return false;
      // Priority
      if (priorityFilter !== 'all' && fb.priority !== priorityFilter) return false;
      // Section
      if (sectionFilter !== 'all' && fb.targetSection !== sectionFilter) return false;
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchName = fb.drugName?.toLowerCase().includes(term);
        const matchContent = fb.content?.toLowerCase().includes(term);
        const matchIngredients = fb.activeIngredients?.toLowerCase().includes(term);
        const matchAuthor = fb.authorName?.toLowerCase().includes(term);
        const matchDept = fb.authorDepartment?.toLowerCase().includes(term);
        const matchRef = fb.referenceSource?.toLowerCase().includes(term);
        if (!matchName && !matchContent && !matchIngredients && !matchAuthor && !matchDept && !matchRef) {
          return false;
        }
      }
      return true;
    });
  }, [feedbacks, statusFilter, typeFilter, priorityFilter, sectionFilter, searchTerm]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const pending = feedbacks.filter((f) => f.status === 'pending').length;
    const reviewed = feedbacks.filter((f) => f.status === 'reviewed').length;
    const resolved = feedbacks.filter((f) => f.status === 'resolved').length;
    const rejected = feedbacks.filter((f) => f.status === 'rejected').length;
    const urgent = feedbacks.filter((f) => f.priority === 'urgent' && f.status === 'pending').length;
    return { total, pending, reviewed, resolved, rejected, urgent };
  }, [feedbacks]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Tab Switcher */}
      <div
        className={cn(
          'p-5 sm:p-6 rounded-[28px] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5',
          isDarkMode
            ? 'bg-slate-900/60 border-slate-800/80 shadow-md'
            : 'bg-white border-slate-200/80 shadow-sm'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0',
              'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20'
            )}
          >
            <MessageSquarePlus size={24} />
          </div>
          <div>
            <h3
              className={cn(
                'text-lg font-black tracking-tight',
                isDarkMode ? 'text-white' : 'text-slate-900'
              )}
            >
              Góp ý & Báo cáo chuyên môn
            </h3>
            <p
              className={cn(
                'text-xs font-medium mt-0.5',
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              )}
            >
              Quản lý phản hồi, đính chính dữ liệu thuốc từ nhân viên y tế và thiết lập điều kiện quyền lực
            </p>
          </div>
        </div>

        {/* Subtab Navigation Pills */}
        <div
          className={cn(
            'flex items-center p-1 rounded-2xl border shrink-0',
            isDarkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-100 border-slate-200'
          )}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('feedbacks')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
              activeSubTab === 'feedbacks'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                : isDarkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <MessageSquarePlus size={14} />
            <span>Danh sách Góp ý ({feedbacks.length})</span>
            {stats.pending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
              activeSubTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                : isDarkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Sliders size={14} />
            <span>Thiết lập Điểm quyền lực</span>
          </button>
        </div>
      </div>

      {/* STATS SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <div
          className={cn(
            'p-4 rounded-2xl border transition-all flex items-center gap-3.5',
            isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Tổng góp ý</p>
            <p className={cn('text-xl font-black leading-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {stats.total}
            </p>
          </div>
        </div>

        {/* Pending */}
        <div
          className={cn(
            'p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer hover:border-amber-500/40',
            statusFilter === 'pending' ? 'ring-2 ring-amber-500/50' : '',
            isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          )}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-black tracking-wider text-amber-500">Chờ xử lý</p>
            <p className={cn('text-xl font-black leading-tight text-amber-600 dark:text-amber-400')}>
              {stats.pending}
            </p>
          </div>
        </div>

        {/* Reviewed */}
        <div
          className={cn(
            'p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer hover:border-blue-500/40',
            statusFilter === 'reviewed' ? 'ring-2 ring-blue-500/50' : '',
            isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          )}
          onClick={() => setStatusFilter(statusFilter === 'reviewed' ? 'all' : 'reviewed')}
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0 border border-cyan-500/20">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-black tracking-wider text-cyan-500">Đang xem xét</p>
            <p className={cn('text-xl font-black leading-tight text-cyan-600 dark:text-cyan-400')}>
              {stats.reviewed}
            </p>
          </div>
        </div>

        {/* Resolved */}
        <div
          className={cn(
            'p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer hover:border-emerald-500/40',
            statusFilter === 'resolved' ? 'ring-2 ring-emerald-500/50' : '',
            isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          )}
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-black tracking-wider text-emerald-500">Đã cập nhật</p>
            <p className={cn('text-xl font-black leading-tight text-emerald-600 dark:text-emerald-400')}>
              {stats.resolved}
            </p>
          </div>
        </div>

        {/* Rejected */}
        <div
          className={cn(
            'p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer hover:border-rose-500/40 col-span-2 sm:col-span-1',
            statusFilter === 'rejected' ? 'ring-2 ring-rose-500/50' : '',
            isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          )}
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <XCircle size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-black tracking-wider text-rose-500">Từ chối</p>
            <p className={cn('text-xl font-black leading-tight text-rose-600 dark:text-rose-400')}>
              {stats.rejected}
            </p>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: FEEDBACKS LIST */}
      {activeSubTab === 'feedbacks' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS BAR */}
          <div
            className={cn(
              'p-4 rounded-2xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3',
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80'
            )}
          >
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm theo tên thuốc, hoạt chất, nội dung, người gửi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border font-medium outline-none transition-all',
                  isDarkMode
                    ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white'
                )}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer',
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                )}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">⏳ Chờ xử lý ({stats.pending})</option>
                <option value="reviewed">🔍 Đang xem xét ({stats.reviewed})</option>
                <option value="resolved">✅ Đã cập nhật ({stats.resolved})</option>
                <option value="rejected">🚫 Từ chối ({stats.rejected})</option>
              </select>

              {/* Type */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer',
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                )}
              >
                <option value="all">Tất cả phân loại</option>
                <option value="correction">Đính chính thông tin</option>
                <option value="addition">Bổ sung dữ liệu</option>
                <option value="error_report">Báo lỗi dữ liệu</option>
                <option value="suggestion">Đề xuất cải tiến</option>
                <option value="other">Ý kiến khác</option>
              </select>

              {/* Priority */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer',
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                )}
              >
                <option value="all">Tất cả mức ưu tiên</option>
                <option value="urgent">🔴 Khẩn cấp</option>
                <option value="high">🟠 Ưu tiên cao</option>
                <option value="normal">🔵 Bình thường</option>
                <option value="low">⚪ Thấp</option>
              </select>

              {/* Section */}
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer max-w-[150px]',
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                )}
              >
                {Object.entries(SECTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* BULK ACTIONS TOOLBAR (if any item selected) */}
          {selectedFeedbacks.length > 0 && (
            <div
              className={cn(
                'px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200',
                isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  Đã chọn {selectedFeedbacks.length} góp ý
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkResolve}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Check size={13} />
                  <span>Đánh dấu Đã xử lý</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteBulk(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Trash2 size={13} />
                  <span>Xóa các mục đã chọn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFeedbacks([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {/* LIST / CARDS */}
          {loadingFeedbacks ? (
            <div
              className={cn(
                'p-12 rounded-3xl border text-center flex flex-col items-center justify-center gap-3',
                isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              )}
            >
              <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
              <p className="text-xs font-bold text-slate-400">Đang tải danh sách góp ý...</p>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div
              className={cn(
                'p-12 rounded-3xl border text-center flex flex-col items-center justify-center gap-3',
                isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <MessageSquarePlus size={24} />
              </div>
              <h4 className={cn('text-sm font-black', isDarkMode ? 'text-white' : 'text-slate-800')}>
                Không có góp ý nào phù hợp
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Không tìm thấy phản hồi hoặc góp ý thuốc nào theo điều kiện lọc hiện tại.
              </p>
              {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || sectionFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setPriorityFilter('all');
                    setSectionFilter('all');
                  }}
                  className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Đặt lại tất cả bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeedbacks.map((item) => {
                const isSelected = selectedFeedbacks.includes(item.id);
                const typeObj = FEEDBACK_TYPE_LABELS[item.feedbackType] || FEEDBACK_TYPE_LABELS.other;
                const priObj = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.normal;
                const secLabel = SECTION_LABELS[item.targetSection] || item.targetSection;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3.5 relative overflow-hidden',
                      isSelected
                        ? isDarkMode
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-amber-50/70 border-amber-300'
                        : isDarkMode
                        ? 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                    )}
                  >
                    {/* Top Row: Checkbox, Drug Name, Badges, Time */}
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFeedbacks((prev) => [...prev, item.id]);
                            } else {
                              setSelectedFeedbacks((prev) => prev.filter((x) => x !== item.id));
                            }
                          }}
                          className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4
                              className={cn(
                                'text-sm font-black cursor-pointer hover:underline flex items-center gap-1.5',
                                isDarkMode ? 'text-white' : 'text-slate-900'
                              )}
                              onClick={() => handleOpenDrugPreview(item.drugId, item.drugName)}
                            >
                              <Pill size={14} className="text-amber-500 shrink-0" />
                              <span className="truncate">{item.drugName}</span>
                              <ExternalLink size={12} className="text-slate-400 hover:text-amber-500 shrink-0" />
                            </h4>

                            {/* Section Badge */}
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              Mục: {secLabel}
                            </span>

                            {/* Feedback Type Badge */}
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-bold border',
                                typeObj.color
                              )}
                            >
                              {typeObj.label}
                            </span>

                            {/* Priority Badge */}
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border',
                                priObj.badgeClass
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full', priObj.dotClass)} />
                              {priObj.label}
                            </span>
                          </div>

                          {item.activeIngredients && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                              Hoạt chất: {item.activeIngredients}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Status dropdown & Quick Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Select */}
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value as any)}
                          className={cn(
                            'px-2.5 py-1 rounded-xl text-xs font-black border outline-none cursor-pointer transition-all',
                            item.status === 'pending'
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                              : item.status === 'reviewed'
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                              : item.status === 'resolved'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                          )}
                        >
                          <option value="pending">⏳ Chờ xử lý</option>
                          <option value="reviewed">🔍 Đang xem xét</option>
                          <option value="resolved">✅ Đã cập nhật</option>
                          <option value="rejected">🚫 Từ chối</option>
                        </select>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Xóa góp ý này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Content Box */}
                    <div
                      className={cn(
                        'p-3 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap',
                        isDarkMode
                          ? 'bg-slate-950/50 border-slate-800 text-slate-200'
                          : 'bg-slate-50 border-slate-200/80 text-slate-800'
                      )}
                    >
                      <p className="font-medium">{item.content}</p>

                      {item.referenceSource && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <FileText size={12} className="shrink-0 text-amber-500" />
                          <span className="font-bold">Nguồn tham khảo:</span>
                          <span className="italic">{item.referenceSource}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Note Box if exists */}
                    {item.adminNotes && (
                      <div
                        className={cn(
                          'p-2.5 rounded-xl border text-xs flex items-start gap-2',
                          isDarkMode
                            ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-200'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        )}
                      >
                        <Shield size={13} className="shrink-0 text-indigo-500 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider block text-indigo-600 dark:text-indigo-400">
                            Ghi chú xử lý của Quản trị viên:
                          </span>
                          <p className="mt-0.5">{item.adminNotes}</p>
                        </div>
                      </div>
                    )}

                    {/* Footer Row: Author Info & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                      {/* Author Details */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                          <User size={12} className="text-slate-400" />
                          <span>{item.authorName || 'Người dùng ẩn danh'}</span>
                        </div>

                        {item.authorDepartment && (
                          <div className="flex items-center gap-1">
                            <Building2 size={11} className="text-slate-400" />
                            <span>{item.authorDepartment}</span>
                          </div>
                        )}

                        {item.authorPhone && (
                          <div className="flex items-center gap-1">
                            <Phone size={11} className="text-slate-400" />
                            <span>{item.authorPhone}</span>
                          </div>
                        )}

                        {item.authorEmail && (
                          <div className="flex items-center gap-1">
                            <Mail size={11} className="text-slate-400" />
                            <span>{item.authorEmail}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar size={11} />
                          <span>{formatDateSafe(item.createdAt)}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingFeedback(item);
                            setAdminNoteDraft(item.adminNotes || '');
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border',
                            isDarkMode
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                          )}
                        >
                          <Edit3 size={12} />
                          <span>{item.adminNotes ? 'Sửa ghi chú' : 'Thêm ghi chú'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDrugPreview(item.drugId, item.drugName)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs transition-all"
                        >
                          <Pill size={12} />
                          <span>Xem thuốc</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: POWER SCORE & PERMISSION SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {/* Main Setting Box */}
          <div
            className={cn(
              'p-6 sm:p-8 rounded-3xl border transition-all',
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
            )}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Award size={24} />
              </div>
              <div>
                <h4
                  className={cn(
                    'text-base font-black tracking-tight',
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  )}
                >
                  Điều kiện Điểm quyền lực gửi Góp ý / Báo cáo
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Thiết lập số điểm quyền lực tối thiểu mà tài khoản cần có để nút <b>"Góp ý"</b> xuất hiện tại Header của{' '}
                  <b>DrugDetailModal</b>. Các tài khoản có điểm quyền lực thấp hơn mức này sẽ bị ẩn nút góp ý.
                </p>
              </div>
            </div>

            {/* Input & Presets */}
            <div className="space-y-4 max-w-2xl">
              <div>
                <label
                  className={cn(
                    'block text-xs font-black uppercase tracking-wider mb-2',
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  )}
                >
                  Điểm quyền lực tối thiểu (0 - 100)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={feedbackMinPower}
                    onChange={(e) => setFeedbackMinPower(Math.max(0, parseInt(e.target.value) || 0))}
                    className={cn(
                      'w-32 px-4 py-2.5 rounded-xl text-base font-black border outline-none text-center transition-all',
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white'
                    )}
                  />
                  <span className="text-xs font-bold text-slate-400">điểm</span>

                  <button
                    type="button"
                    onClick={handleSavePowerSetting}
                    disabled={isSavingSettings}
                    className="ml-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={14} />
                        <span>Đã lưu thành công!</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Lưu cấu hình</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 mb-2">Mức điểm gợi ý nhanh:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '0 điểm (Tất cả nhân sự)', val: 0 },
                    { label: '5 điểm (Nhân viên cơ bản)', val: 5 },
                    { label: '10 điểm (Bác sĩ / Dược sĩ)', val: 10 },
                    { label: '20 điểm (Chuyên viên cấp cao)', val: 20 },
                    { label: '50 điểm (Ban quản lý / Trưởng khoa)', val: 50 }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setFeedbackMinPower(preset.val)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                        feedbackMinPower === preset.val
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-amber-500/50'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-500/50'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Notice */}
              <div
                className={cn(
                  'p-4 rounded-2xl border flex items-start gap-3 mt-4 text-xs',
                  isDarkMode
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                )}
              >
                <HelpCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Lưu ý về cơ chế phân quyền Góp ý:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                    <li>
                      Tài khoản <b>Quản trị viên (Admin)</b> và <b>Người vận hành (Operator)</b> luôn nhìn thấy nút Góp ý.
                    </li>
                    <li>
                      Đối với các thành viên khác, hệ thống sẽ đối chiếu số điểm quyền lực của vai trò (Role Power Points) với mức điểm tối thiểu <b>({feedbackMinPower} điểm)</b>.
                    </li>
                    <li>
                      Nếu điểm nhỏ hơn {feedbackMinPower}, nút <b>"Góp ý"</b> ở Header của DrugDetailModal sẽ tự động ẩn đi hoàn toàn.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ROLES REFERENCE TABLE */}
          <div
            className={cn(
              'p-6 sm:p-8 rounded-3xl border transition-all',
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
            )}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h4
                  className={cn(
                    'text-base font-black tracking-tight',
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  )}
                >
                  Bảng đối chiếu Quyền hạn của các Vai trò hiện tại
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dựa theo mức điểm tối thiểu đang thiết lập: <b>{feedbackMinPower} điểm</b>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr
                    className={cn(
                      'border-b text-[10px] uppercase font-black tracking-wider',
                      isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                    )}
                  >
                    <th className="py-3 px-4">Vai trò (Role)</th>
                    <th className="py-3 px-4">Mã hệ thống</th>
                    <th className="py-3 px-4 text-center">Điểm quyền lực</th>
                    <th className="py-3 px-4 text-right">Trạng thái Nút Góp ý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {configRoles.map((role) => {
                    const power = role.powerPoints ?? 0;
                    const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(role.id);
                    const isAllowed = isPrivileged || power >= feedbackMinPower;

                    return (
                      <tr
                        key={role.id}
                        className={cn(
                          'transition-colors',
                          isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        )}
                      >
                        <td className="py-3 px-4 font-bold">
                          <span className={cn(isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
                            {role.name}
                          </span>
                          {isPrivileged && (
                            <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                              Đặc quyền Admin
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{role.id}</td>
                        <td className="py-3 px-4 text-center font-black">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-lg border text-[11px]',
                              power > 0
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            )}
                          >
                            {power} điểm
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isAllowed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={11} /> Hiển thị nút Góp ý
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              <XCircle size={11} /> Ẩn nút (Không đủ điểm)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL & ADMIN NOTE MODAL */}
      <AnimatePresence>
        {viewingFeedback && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingFeedback(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                'relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col',
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              )}
            >
              {/* Modal Header */}
              <div
                className={cn(
                  'p-5 border-b flex items-center justify-between shrink-0',
                  isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <MessageSquarePlus size={20} />
                  </div>
                  <div>
                    <h3 className={cn('text-sm font-black', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      Chi tiết Góp ý: {viewingFeedback.drugName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Mục: {SECTION_LABELS[viewingFeedback.targetSection] || viewingFeedback.targetSection}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingFeedback(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                {/* Drug and Feedback details */}
                <div
                  className={cn(
                    'p-4 rounded-2xl border space-y-2',
                    isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Nội dung góp ý:</span>
                    <span className="text-[11px] text-slate-400">{formatDateSafe(viewingFeedback.createdAt)}</span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">
                    {viewingFeedback.content}
                  </p>
                  {viewingFeedback.referenceSource && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                      <b>Nguồn tham khảo:</b> {viewingFeedback.referenceSource}
                    </div>
                  )}
                </div>

                {/* Author Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className={cn('p-3 rounded-xl border', isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Người gửi</span>
                    <span className="font-bold">{viewingFeedback.authorName || 'Ẩn danh'}</span>
                    {viewingFeedback.authorDepartment && (
                      <span className="text-slate-400 block text-[11px]">{viewingFeedback.authorDepartment}</span>
                    )}
                  </div>
                  <div className={cn('p-3 rounded-xl border', isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Liên hệ</span>
                    <span className="font-bold">{viewingFeedback.authorPhone || viewingFeedback.authorEmail || 'Chưa cung cấp'}</span>
                  </div>
                </div>

                {/* Status Switcher in Modal */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Trạng thái xử lý hiện tại:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'pending', label: 'Chờ xử lý', color: 'hover:border-amber-500' },
                      { id: 'reviewed', label: 'Đang xem xét', color: 'hover:border-cyan-500' },
                      { id: 'resolved', label: 'Đã cập nhật', color: 'hover:border-emerald-500' },
                      { id: 'rejected', label: 'Từ chối', color: 'hover:border-rose-500' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleUpdateStatus(viewingFeedback.id, st.id as any)}
                        className={cn(
                          'py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center',
                          viewingFeedback.status === st.id
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow-sm'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-slate-100 border-slate-200 text-slate-700',
                          st.color
                        )}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Note Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Ghi chú / Phản hồi của Quản trị viên:
                  </label>
                  <textarea
                    rows={4}
                    value={adminNoteDraft}
                    onChange={(e) => setAdminNoteDraft(e.target.value)}
                    placeholder="Nhập ghi chú phản hồi, lý do từ chối hoặc chi tiết nội dung đã cập nhật..."
                    className={cn(
                      'w-full p-3 rounded-2xl text-xs border outline-none font-medium leading-relaxed transition-all',
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white'
                    )}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className={cn(
                  'p-4 border-t flex items-center justify-between shrink-0',
                  isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleOpenDrugPreview(viewingFeedback.drugId, viewingFeedback.drugName);
                    setViewingFeedback(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5"
                >
                  <Pill size={14} />
                  <span>Xem thông tin thuốc</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingFeedback(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAdminNote}
                    disabled={isSavingNote}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {isSavingNote ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Lưu ghi chú</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODALS */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDeleteFeedback(confirmDeleteId)}
        title="Xác nhận xóa góp ý"
        message="Bạn có chắc chắn muốn xóa vĩnh viễn góp ý này khỏi hệ thống không? Hành động này không thể hoàn tác."
        confirmText="Xóa góp ý"
        cancelText="Hủy bỏ"
        type="danger"
        isDarkMode={isDarkMode}
      />

      <ConfirmModal
        isOpen={confirmDeleteBulk}
        onClose={() => setConfirmDeleteBulk(false)}
        onConfirm={handleBulkDelete}
        title="Xác nhận xóa hàng loạt"
        message={`Bạn có chắc chắn muốn xóa ${selectedFeedbacks.length} góp ý đã chọn không?`}
        confirmText="Xóa tất cả đã chọn"
        cancelText="Hủy bỏ"
        type="danger"
        isDarkMode={isDarkMode}
      />

      {/* DRUG DETAIL MODAL PREVIEW */}
      {previewDrug && (
        <DrugDetailModal
          drug={previewDrug}
          isOpen={isPreviewDrugOpen}
          onClose={() => setIsPreviewDrugOpen(false)}
          isDarkMode={isDarkMode}
          userPowerPoints={100}
          userRole={userRole}
          feedbackMinPower={feedbackMinPower}
        />
      )}
    </div>
  );
};

export default DrugFeedbackManagement;
