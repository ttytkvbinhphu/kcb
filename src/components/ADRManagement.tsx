import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  User, 
  Pill, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  ChevronRight,
  X,
  Save,
  Loader2,
  Trash2,
  FileText,
  Activity,
  UserCircle,
  BookOpen,
  Library,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  db, 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { ADRReport, Drug, ADRCatalogItem } from '../types';
import ConfirmModal from './ConfirmModal';

interface ADRManagementProps {
  canManage: boolean;
  isDarkMode: boolean;
  currentUserUid: string;
  currentUserName: string;
  featureSettings?: any;
}

const ADR_CATEGORIES = [
  'Biểu hiện chung',
  'Phản ứng ngoài da',
  'Rối loạn chức năng gan',
  'Phản ứng phản vệ & Sốc phản vệ',
  'Rối loạn tiêu hóa',
  'Rối loạn hô hấp',
  'Rối loạn thần kinh cơ',
  'Rối loạn Huyết áp',
  'Rối loạn tim mạch',
  'Rối loạn tâm thần'
];

const AutoExpandingTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
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

const ADRManagement: React.FC<ADRManagementProps> = ({ 
  canManage, 
  isDarkMode, 
  currentUserUid,
  currentUserName,
  featureSettings
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'catalog'>('catalog');
  const [reports, setReports] = useState<ADRReport[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [catalogItems, setCatalogItems] = useState<ADRCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ADRReport | null>(null);
  const [editingCatalogItem, setEditingCatalogItem] = useState<ADRCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('Tất cả');
  const [filterCategory, setFilterCategory] = useState<string>('Tất cả');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string, type: 'report' | 'catalog', name?: string } | null>(null);

  // Form state for ADR Report
  const [formData, setFormData] = useState<Partial<ADRReport>>({
    patientInitials: '',
    patientAge: 0,
    patientGender: 'Nam',
    drugId: '',
    drugName: '',
    reactionDescription: '',
    severity: 'Trung bình',
    outcome: 'Đang hồi phục',
    status: 'Mới',
    notes: ''
  });

  // Form state for Catalog Item
  const [catalogFormData, setCatalogFormData] = useState<Partial<ADRCatalogItem>>({
    reactionName: '',
    description: '',
    commonDrugs: [],
    severityLevel: 'Trung bình',
    management: '',
    category: ADR_CATEGORIES[0]
  });

  useEffect(() => {
    const qReports = query(collection(db, 'adr_reports'), orderBy('reportedAt', 'desc'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ADRReport[];
      setReports(reportsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'adr_reports');
    });

    const unsubscribeDrugs = onSnapshot(collection(db, 'drugs'), (snapshot) => {
      const drugsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Drug[];
      setDrugs(drugsData);
    });

    const unsubscribeCatalog = onSnapshot(query(collection(db, 'adr_catalog'), orderBy('sortOrder', 'asc')), (snapshot) => {
      const catalogData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ADRCatalogItem[];
      
      // If items don't have sortOrder, assign them based on current index
      const sortedData = catalogData.length > 0 && catalogData[0].sortOrder === undefined
        ? catalogData.map((item, index) => ({ ...item, sortOrder: index }))
        : catalogData;

      setCatalogItems(sortedData);
    });

    return () => {
      unsubscribeReports();
      unsubscribeDrugs();
      unsubscribeCatalog();
    };
  }, []);

  const handleOpenModal = (report?: ADRReport) => {
    if (report) {
      setEditingReport(report);
      setFormData(report);
    } else {
      setEditingReport(null);
      setFormData({
        patientInitials: '',
        patientAge: 0,
        patientGender: 'Nam',
        drugId: '',
        drugName: '',
        reactionDescription: '',
        severity: 'Trung bình',
        outcome: 'Đang hồi phục',
        status: 'Mới',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenCatalogModal = (item?: ADRCatalogItem) => {
    if (item) {
      setEditingCatalogItem(item);
      setCatalogFormData(item);
    } else {
      setEditingCatalogItem(null);
      setCatalogFormData({
        reactionName: '',
        description: '',
        commonDrugs: [],
        severityLevel: 'Trung bình',
        management: '',
        category: ADR_CATEGORIES[0]
      });
    }
    setIsCatalogModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientInitials || !formData.drugId || !formData.reactionDescription) return;

    setIsSaving(true);
    try {
      const reportId = editingReport?.id || `ADR-${Date.now()}`;
      const selectedDrug = drugs.find(d => d.id === formData.drugId);
      
      const reportData: ADRReport = {
        ...(formData as ADRReport),
        id: reportId,
        drugName: selectedDrug?.name || formData.drugName || '',
        reporterName: editingReport?.reporterName || currentUserName,
        reporterUid: editingReport?.reporterUid || currentUserUid,
        reportedAt: editingReport?.reportedAt || new Date().toISOString(),
      };

      await setDoc(doc(db, 'adr_reports', reportId), reportData);
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'adr_reports');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogFormData.reactionName || !catalogFormData.category) return;

    setIsSaving(true);
    try {
      const itemId = editingCatalogItem?.id || `CAT-${Date.now()}`;
      const itemData: ADRCatalogItem = {
        ...(catalogFormData as ADRCatalogItem),
        id: itemId,
      };

      await setDoc(doc(db, 'adr_catalog', itemId), itemData);
      setIsCatalogModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'adr_catalog');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmData({ id, type: 'report' });
    setIsConfirmOpen(true);
  };

  const handleDeleteCatalog = (id: string, name: string) => {
    setConfirmData({ id, type: 'catalog', name });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmData) return;
    const { id, type } = confirmData;
    try {
      if (type === 'report') {
        await deleteDoc(doc(db, 'adr_reports', id));
      } else {
        await deleteDoc(doc(db, 'adr_catalog', id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, type === 'report' ? 'adr_reports' : 'adr_catalog');
    }
  };

  const handleReorderCatalog = async (newOrder: ADRCatalogItem[]) => {
    setCatalogItems(newOrder);
    if (!isPharmacist) return;

    try {
      // Update all items with their new sortOrder
      const updatePromises = newOrder.map((item, index) => {
        const updatedItem = { ...item, sortOrder: index };
        return setDoc(doc(db, 'adr_catalog', item.id), updatedItem);
      });
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error updating catalog order:", error);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      (report.patientInitials || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (report.drugName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (report.reactionDescription || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    
    const matchesFilter = filterStatus === 'Tất cả' || report.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const filteredCatalog = catalogItems.filter(item => {
    const matchesSearch = 
      (item.reactionName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (item.description || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (item.category || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    
    const matchesFilter = filterCategory === 'Tất cả' || item.category === filterCategory;
    
    return matchesSearch && matchesFilter;
  });

  const categories = ['Tất cả', ...ADR_CATEGORIES];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Nhẹ': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Trung bình': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Nặng': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Nghiêm trọng': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mới': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'Đang xử lý': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Đã hoàn thành': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const isPharmacist = canManage;

  return (
    <div className={cn(
      "p-1 lg:p-6 max-w-full mx-auto min-h-screen transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      <div className="mb-2 lg:mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-8">
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
            <div className={cn(
              "p-1.5 lg:p-2 bg-rose-600 rounded-lg lg:rounded-xl text-white transition-all",
              isDarkMode ? "shadow-none" : "shadow-lg shadow-rose-200"
            )}>
              <AlertTriangle size={20} />
            </div>
            <h2 className={cn(
              "text-2xl lg:text-4xl font-black tracking-tight transition-colors",
              isDarkMode ? "text-white" : "text-black"
            )}>
              {featureSettings?.customTitle || (canManage ? "Quản lý ADR" : "Tra cứu ADR")}
            </h2>
          </div>
          <p className={cn(
            "font-medium max-w-md transition-colors text-[11px] lg:text-base",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>
            {canManage 
              ? "Hệ thống tiếp nhận, quản lý và báo cáo tác dụng không mong muốn của thuốc."
              : "Theo dõi và báo cáo phản ứng có hại của thuốc để đảm bảo an toàn điều trị."
            }
          </p>
        </div>
        
        <div className={cn(
          "flex flex-col sm:flex-row gap-2 lg:gap-3 items-stretch sm:items-center p-1.5 lg:p-2 rounded-xl lg:rounded-2xl shadow-sm border transition-colors",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        )}>
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={activeSubTab === 'reports' ? "Tìm bệnh nhân, thuốc..." : "Tìm phản ứng, phân loại..."}
              className={cn(
                "w-full pl-10 pr-4 py-2 lg:py-3 border-transparent rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-xs lg:text-sm font-medium",
                isDarkMode ? "bg-slate-800/50 text-white focus:bg-slate-800" : "bg-white text-slate-900 focus:bg-white shadow-sm border-slate-100"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className={cn(
            "h-6 w-px hidden sm:block transition-colors",
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          )}></div>

          <div className="relative sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            {activeSubTab === 'reports' ? (
              <select
                className={cn(
                  "w-full pl-9 pr-8 py-2 lg:py-3 border-transparent rounded-lg lg:rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs lg:text-sm font-bold",
                  isDarkMode ? "bg-slate-800/50 text-slate-400 focus:bg-slate-800" : "bg-white text-slate-600 focus:bg-white shadow-sm border-slate-100"
                )}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="Tất cả">Tất cả trạng thái</option>
                <option value="Mới">Mới</option>
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Đã hoàn thành">Đã hoàn thành</option>
              </select>
            ) : (
              <select
                className={cn(
                  "w-full pl-9 pr-8 py-2 lg:py-3 border-transparent rounded-lg lg:rounded-xl appearance-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-xs lg:text-sm font-bold",
                  isDarkMode ? "bg-slate-800/50 text-slate-400 focus:bg-slate-800" : "bg-white text-slate-600 focus:bg-white shadow-sm border-slate-100"
                )}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'Tất cả' ? 'Tất cả phân loại' : cat}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            {activeSubTab === 'catalog' && isPharmacist && (
              <button
                onClick={() => handleOpenCatalogModal()}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-xs lg:text-sm border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Plus size={18} /> <span className="hidden xl:inline">Thêm danh mục</span>
              </button>
            )}
            <button
              onClick={() => handleOpenModal()}
              className={cn(
                "flex items-center justify-center gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-blue-600 text-white rounded-lg lg:rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap text-xs lg:text-sm",
                isDarkMode ? "shadow-none" : "shadow-lg shadow-blue-100"
              )}
            >
              <Plus size={18} /> <span className="hidden sm:inline">Báo cáo mới</span><span className="sm:hidden">Báo cáo</span>
            </button>
          </div>
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
          onClick={() => setActiveSubTab('catalog')}
          className={cn(
            "flex-1 lg:flex-none px-4 lg:px-8 py-2 lg:py-3 rounded-lg lg:rounded-xl text-[11px] lg:text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap",
            activeSubTab === 'catalog' 
              ? (isDarkMode ? "bg-slate-800 text-emerald-400 shadow-sm" : "bg-emerald-50 text-emerald-600 shadow-sm") 
              : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
          )}
        >
          <Library size={14} />
          Danh mục ADR
          <span className={cn(
            "ml-1 px-2 py-0.5 rounded-full text-[9px] lg:text-[10px]",
            activeSubTab === 'catalog' 
              ? "bg-emerald-100 text-emerald-600" 
              : (isDarkMode ? "bg-slate-900 text-slate-500" : "bg-slate-100 text-slate-500")
          )}>
            {catalogItems.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('reports')}
          className={cn(
            "flex-1 lg:flex-none px-4 lg:px-8 py-2 lg:py-3 rounded-lg lg:rounded-xl text-[11px] lg:text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap",
            activeSubTab === 'reports' 
              ? (isDarkMode ? "bg-slate-800 text-blue-400 shadow-sm" : "bg-blue-50 text-blue-600 shadow-sm") 
              : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
          )}
        >
          <FileText size={14} />
          Báo cáo ADR
          <span className={cn(
            "ml-1 px-2 py-0.5 rounded-full text-[9px] lg:text-[10px]",
            activeSubTab === 'reports' 
              ? "bg-blue-100 text-blue-600" 
              : (isDarkMode ? "bg-slate-900 text-slate-500" : "bg-slate-100 text-slate-500")
          )}>
            {reports.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold">Đang tải dữ liệu...</p>
        </div>
      ) : activeSubTab === 'reports' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "group relative p-6 rounded-[32px] border transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                  isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 hover:border-blue-100 shadow-sm"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    getStatusColor(report.status)
                  )}>
                    {report.status}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(report)}
                      className={cn(
                        "p-2 rounded-xl text-slate-400 hover:text-blue-600 transition-colors",
                        isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                      )}
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0">
                    <UserCircle size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn("font-black text-base truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                      {report.patientInitials}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {report.patientAge} tuổi • {report.patientGender}
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-xl mb-4 border transition-colors",
                  isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                )}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Pill size={12} className="text-blue-500" />
                    <span className={cn("text-xs font-black", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                      {report.drugName}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 font-medium leading-relaxed">
                    {report.reactionDescription}
                  </p>
                </div>

                <div className={cn(
                  "flex items-center justify-between pt-4 border-t transition-colors",
                  isDarkMode ? "border-slate-800" : "border-slate-100"
                )}>
                  <div className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                    getSeverityColor(report.severity)
                  )}>
                    {report.severity}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold">
                      {new Date(report.reportedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Reorder.Group 
          axis="y" 
          values={filteredCatalog} 
          onReorder={handleReorderCatalog}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredCatalog.map((item) => (
              <Reorder.Item
                key={item.id}
                value={item}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "group relative p-4 lg:p-6 rounded-2xl lg:rounded-[32px] border transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                  isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 hover:border-emerald-100 shadow-sm"
                )}
              >
                <div className="flex justify-between items-start mb-3 lg:mb-4">
                  <div className={cn(
                    "px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-wider border transition-colors",
                    isDarkMode ? "bg-emerald-900/30 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  )}>
                    {item.category}
                  </div>
                  <div className="flex items-center gap-1">
                    {isPharmacist && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-slate-600">
                        <GripVertical size={16} />
                      </div>
                    )}
                    {isPharmacist && (
                      <button 
                        onClick={() => handleOpenCatalogModal(item)}
                        className={cn(
                          "p-1.5 lg:p-2 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors",
                          isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <Activity size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn("font-black text-base truncate", isDarkMode ? "text-white" : "text-black")}>
                      {item.reactionName}
                    </h3>
                    <div className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-bold border w-fit",
                      getSeverityColor(item.severityLevel)
                    )}>
                      {item.severityLevel}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 line-clamp-3 font-medium leading-relaxed mb-4">
                  {item.description}
                </p>

                {item.commonDrugs && item.commonDrugs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.commonDrugs.slice(0, 3).map((drug, idx) => (
                      <span key={idx} className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] lg:text-[9px] font-bold border transition-colors",
                        isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {drug}
                      </span>
                    ))}
                    {item.commonDrugs.length > 3 && (
                      <span className="text-[8px] lg:text-[9px] font-bold text-slate-400">+{item.commonDrugs.length - 3}</span>
                    )}
                  </div>
                )}

                <div className={cn(
                  "pt-3 lg:pt-4 border-t flex items-center justify-between transition-colors",
                  isDarkMode ? "border-slate-800" : "border-slate-100"
                )}>
                  <button 
                    onClick={() => {
                      setFormData({
                        ...formData,
                        reactionDescription: item.description,
                        severity: item.severityLevel as any
                      });
                      setActiveSubTab('reports');
                      setIsModalOpen(true);
                    }}
                    className="text-[9px] lg:text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Sử dụng mẫu này <ExternalLink size={10} />
                  </button>
                  <div className="text-[9px] lg:text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Info size={10} /> Chi tiết
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* ADR Modal */}
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
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white transition-all",
                    isDarkMode ? "shadow-none" : "shadow-lg shadow-rose-200"
                  )}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className={cn("text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                      {editingReport ? 'Chi tiết báo cáo ADR' : 'Báo cáo ADR mới'}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Thông tin phản ứng có hại của thuốc</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "p-3 rounded-2xl transition-colors text-slate-400",
                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  )}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className={cn("p-8 transition-colors", isDarkMode ? "bg-slate-900" : "bg-white")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Patient Info */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Thông tin bệnh nhân</h4>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tên viết tắt</label>
                      <input
                        type="text"
                        required
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                        value={formData.patientInitials}
                        onChange={(e) => setFormData({...formData, patientInitials: e.target.value})}
                        placeholder="VD: N.V.A"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tuổi</label>
                        <input
                          type="number"
                          required
                          className={cn(
                            "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                            isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                          )}
                          value={formData.patientAge}
                          onChange={(e) => setFormData({...formData, patientAge: parseInt(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Giới tính</label>
                        <select
                          className={cn(
                            "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none",
                            isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                          )}
                          value={formData.patientGender}
                          onChange={(e) => setFormData({...formData, patientGender: e.target.value as any})}
                        >
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Drug Info */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Thuốc nghi ngờ</h4>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Chọn thuốc</label>
                      <select
                        required
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                        value={formData.drugId}
                        onChange={(e) => setFormData({...formData, drugId: e.target.value})}
                      >
                        <option value="">-- Chọn thuốc --</option>
                        {drugs.map(drug => (
                          <option key={drug.id} value={drug.id}>{drug.name} ({drug.activeIngredients?.[0]?.name || 'N/A'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mức độ nghiêm trọng</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Nhẹ', 'Trung bình', 'Nặng', 'Nghiêm trọng'].map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setFormData({...formData, severity: sev as any})}
                            className={cn(
                              "py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                              formData.severity === sev
                                ? cn("bg-blue-600 border-blue-600 text-white", isDarkMode ? "shadow-none" : "shadow-lg shadow-blue-200")
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200")
                            )}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Chi tiết phản ứng</h4>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mô tả phản ứng</label>
                    <AutoExpandingTextarea
                      required
                      rows={3}
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                        isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                      )}
                      value={formData.reactionDescription}
                      onChange={(e) => setFormData({...formData, reactionDescription: e.target.value})}
                      placeholder="Mô tả chi tiết các triệu chứng, thời gian xuất hiện..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kết quả</label>
                      <select
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                        value={formData.outcome}
                        onChange={(e) => setFormData({...formData, outcome: e.target.value as any})}
                      >
                        <option value="Hồi phục">Hồi phục</option>
                        <option value="Đang hồi phục">Đang hồi phục</option>
                        <option value="Có di chứng">Có di chứng</option>
                        <option value="Tử vong">Tử vong</option>
                        <option value="Không rõ">Không rõ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Trạng thái xử lý</label>
                      <select
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      >
                        <option value="Mới">Mới</option>
                        <option value="Đang xử lý">Đang xử lý</option>
                        <option value="Đã hoàn thành">Đã hoàn thành</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ghi chú thêm</label>
                    <AutoExpandingTextarea
                      rows={2}
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                        isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                      )}
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Các thông tin bổ sung khác..."
                    />
                  </div>
                </div>

                <div className={cn(
                  "flex flex-col md:flex-row gap-4 pt-6 border-t transition-colors",
                  isDarkMode ? "border-slate-800" : "border-slate-100"
                )}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-bold transition-all",
                      isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Hủy bỏ
                  </button>
                  {editingReport && canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingReport.id)}
                      className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={cn(
                      "flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                      isDarkMode ? "shadow-none" : "shadow-lg shadow-blue-200"
                    )}
                  >
                    {isSaving ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Save size={20} />
                        {editingReport ? 'Cập nhật báo cáo' : 'Gửi báo cáo'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADR Catalog Modal */}
      <AnimatePresence>
        {isCatalogModalOpen && (
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
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white transition-all",
                    isDarkMode ? "shadow-none" : "shadow-lg shadow-emerald-200"
                  )}>
                    <Library size={24} />
                  </div>
                  <div>
                    <h3 className={cn("text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                      {editingCatalogItem ? 'Chỉnh sửa danh mục' : 'Thêm danh mục ADR'}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Thông tin tham khảo phản ứng ADR</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCatalogModalOpen(false)}
                  className={cn(
                    "p-3 rounded-2xl transition-colors text-slate-400",
                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  )}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveCatalog} className={cn("p-8 transition-colors", isDarkMode ? "bg-slate-900" : "bg-white")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tên phản ứng</label>
                      <input
                        type="text"
                        required
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                        value={catalogFormData.reactionName}
                        onChange={(e) => setCatalogFormData({...catalogFormData, reactionName: e.target.value})}
                        placeholder="VD: Hội chứng Stevens-Johnson"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phân loại</label>
                      <select
                        required
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold appearance-none",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                        value={catalogFormData.category}
                        onChange={(e) => setCatalogFormData({...catalogFormData, category: e.target.value})}
                      >
                        {ADR_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mức độ thường gặp</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Nhẹ', 'Trung bình', 'Nặng', 'Nghiêm trọng'].map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setCatalogFormData({...catalogFormData, severityLevel: sev as any})}
                            className={cn(
                              "py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                              catalogFormData.severityLevel === sev
                                ? cn("bg-emerald-600 border-emerald-600 text-white", isDarkMode ? "shadow-none" : "shadow-lg shadow-emerald-200")
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-emerald-800" : "bg-white border-slate-100 text-slate-500 hover:border-emerald-200")
                            )}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mô tả chi tiết</label>
                    <AutoExpandingTextarea
                      rows={3}
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                        isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                      )}
                      value={catalogFormData.description}
                      onChange={(e) => setCatalogFormData({...catalogFormData, description: e.target.value})}
                      placeholder="Mô tả các triệu chứng lâm sàng đặc trưng..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Hướng dẫn xử trí</label>
                    <AutoExpandingTextarea
                      rows={3}
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                        isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                      )}
                      value={catalogFormData.management}
                      onChange={(e) => setCatalogFormData({...catalogFormData, management: e.target.value})}
                      placeholder="Các bước xử lý cấp cứu hoặc điều trị..."
                    />
                  </div>
                </div>

                <div className={cn(
                  "flex flex-col md:flex-row gap-4 pt-6 border-t transition-colors",
                  isDarkMode ? "border-slate-800" : "border-slate-100"
                )}>
                  <button
                    type="button"
                    onClick={() => setIsCatalogModalOpen(false)}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-bold transition-all",
                      isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Hủy bỏ
                  </button>
                  {editingCatalogItem && isPharmacist && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCatalog(editingCatalogItem.id, editingCatalogItem.reactionName)}
                      className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={cn(
                      "flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                      isDarkMode ? "shadow-none" : "shadow-lg shadow-emerald-200"
                    )}
                  >
                    {isSaving ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Save size={20} />
                        {editingCatalogItem ? 'Cập nhật danh mục' : 'Lưu danh mục'}
                      </>
                    )}
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
        title={confirmData?.type === 'report' ? 'Xác nhận xóa báo cáo' : 'Xác nhận xóa danh mục'}
        message={confirmData?.type === 'report' 
          ? 'Bạn có chắc chắn muốn xóa báo cáo ADR này? Hành động này không thể hoàn tác.' 
          : `Bạn có chắc chắn muốn xóa mục "${confirmData?.name}" khỏi danh mục ADR?`}
        confirmText="Xác nhận xóa"
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default ADRManagement;
