import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronDown, X, Loader2, Check, AlertTriangle, Filter, Eye, EyeOff, Edit, Trash2, UserCheck, UserX, Briefcase, Stethoscope, Pill, ClipboardList, Syringe, Microscope, LayoutGrid, List, Baby, Zap, History, Laptop, Wifi, ShieldCheck, LogIn, LogOut, Clock, Globe, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, setDoc, doc, deleteDoc, writeBatch, limit } from '../firebase';
import { Staff, AuthLog } from '../types';

const YinYangIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a5 5 0 0 1 0 10 5 5 0 0 0 0 10" fill="currentColor" fillOpacity="0.25" />
    <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    <circle cx="12" cy="17" r="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

interface StaffManagementProps {
  isDarkMode: boolean;
  canManage: boolean;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ isDarkMode, canManage }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableTitles, setAvailableTitles] = useState<{id: string, name: string}[]>([]);
  const [availablePositions, setAvailablePositions] = useState<{id: string, name: string}[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<{id: string, name: string}[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<{id: string, name: string}[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Staff>>({
    fullName: '',
    staffAccount: '',
    username: '',
    type: 'Bác sĩ',
    gender: 'Nam',
    dob: '',
    address: '',
    specialty: '',
    position: '',
    phone: '',
    email: '',
    certificateCode: '',
    department: '',
    role: '',
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Bác sĩ' | 'Dược sĩ' | 'Điều dưỡng' | 'Hộ sinh' | 'Y sĩ' | 'Kỹ thuật viên' | 'Không'>('All');
  const [showTitleFilter, setShowTitleFilter] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>('All');
  const [showPositionFilter, setShowPositionFilter] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [viewingStaffDetail, setViewingStaffDetail] = useState<Staff | null>(null);
  const [showAccountInDetail, setShowAccountInDetail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [pageInput, setPageInput] = useState<string>('1');
  const [mainTab, setMainTab] = useState<'staff_list' | 'access_logs'>('staff_list');
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<'all' | 'login' | 'logout'>('all');
  const [logMethodFilter, setLogMethodFilter] = useState<'all' | 'quick_account' | 'google' | 'other'>('all');
  const [logStaffFilter, setLogStaffFilter] = useState<string>('all');
  const [logCurrentPage, setLogCurrentPage] = useState<number>(1);
  const [logItemsPerPage, setLogItemsPerPage] = useState<number>(15);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('staff_view_mode');
      return saved === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('staff_view_mode', viewMode);
    } catch (e) {
      console.error(e);
    }
  }, [viewMode]);

  // Reset log page when filters change
  useEffect(() => {
    setLogCurrentPage(1);
  }, [logSearchTerm, logTypeFilter, logMethodFilter, logStaffFilter, logItemsPerPage]);

  // Reset page to 1 when search, tab, position, department, or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, selectedPosition, selectedDepartment, itemsPerPage]);

  useEffect(() => {
    const q = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaff(staffData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
      setLoading(false);
    });

    const qLogs = query(collection(db, 'auth_logs'), orderBy('timestamp', 'desc'), limit(500));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuthLog));
      setAuthLogs(logs);
    }, (error) => {
      console.warn("Auth logs snapshot error:", error);
    });

    const unsubTitles = onSnapshot(collection(db, 'config_titles'), (snapshot) => {
      setAvailableTitles(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, order: doc.data().order ?? 0 })).sort((a, b) => a.order - b.order));
    });

    const unsubPositions = onSnapshot(collection(db, 'config_positions'), (snapshot) => {
      setAvailablePositions(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubSpecialties = onSnapshot(collection(db, 'config_specialties'), (snapshot) => {
      setAvailableSpecialties(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubDepartments = onSnapshot(collection(db, 'config_departments'), (snapshot) => {
      setAvailableDepartments(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubRoles = onSnapshot(collection(db, 'config_roles'), (snapshot) => {
      setAvailableRoles(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id })));
    });

    return () => {
      unsubscribe();
      unsubLogs();
      unsubTitles();
      unsubPositions();
      unsubSpecialties();
      unsubDepartments();
      unsubRoles();
    };
  }, []);

  const handleSave = async () => {
    if (!formData.fullName || !formData.type || !formData.gender || !formData.dob) {
      alert("Vui lòng nhập đầy đủ Tên, Loại nhân sự, Giới tính và Ngày sinh");
      return;
    }

    setSaving(true);
    try {
      const staffId = isEditing && selectedStaff ? selectedStaff.id : `STF${Date.now()}`;
      const newStaff: Staff = {
        ...(formData as Staff),
        id: staffId,
        createdAt: isEditing && selectedStaff ? selectedStaff.createdAt : new Date().toISOString()
      };

      await setDoc(doc(db, 'staff', staffId), newStaff);
      setIsModalOpen(false);
      setIsEditing(false);
      setSelectedStaff(null);
      setFormData({
        fullName: '',
        staffAccount: '',
        username: '',
        type: 'Bác sĩ',
        gender: 'Nam',
        dob: '',
        address: '',
        specialty: '',
        position: '',
        phone: '',
        email: '',
        certificateCode: '',
        department: '',
        role: '',
        isActive: true
      });
    } catch (error) {
      console.error("Error saving staff:", error);
      alert("Lỗi khi lưu thông tin nhân sự");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (person: Staff) => {
    setStaffToDelete(person);
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'staff', staffToDelete.id));
      setStaffToDelete(null);
    } catch (error) {
      console.error("Error deleting staff:", error);
      handleFirestoreError(error, OperationType.DELETE, 'staff');
      alert("Lỗi khi xóa nhân sự: " + (error instanceof Error ? error.message : "Đã xảy ra lỗi."));
    } finally {
      setDeleting(false);
    }
  };

  const positionOptions = React.useMemo(() => {
    const set = new Set<string>();
    availablePositions.forEach(p => { if (p.name?.trim()) set.add(p.name.trim()); });
    staff.forEach(s => { if (s.position?.trim()) set.add(s.position.trim()); });
    return ['All', ...Array.from(set)];
  }, [availablePositions, staff]);

  const departmentOptions = React.useMemo(() => {
    const set = new Set<string>();
    availableDepartments.forEach(d => { if (d.name?.trim()) set.add(d.name.trim()); });
    staff.forEach(s => { if (s.department?.trim()) set.add(s.department.trim()); });
    return ['All', ...Array.from(set)];
  }, [availableDepartments, staff]);

  const getTabCount = (tab: 'All' | 'Bác sĩ' | 'Dược sĩ' | 'Điều dưỡng' | 'Hộ sinh' | 'Y sĩ' | 'Kỹ thuật viên' | 'Không') => {
    if (tab === 'All') return staff.length;
    return staff.filter(s => {
      if (tab === 'Kỹ thuật viên') return s.type === 'Kỹ thuật viên' || String(s.type || '').toLowerCase().includes('kỹ thuật');
      if (tab === 'Y sĩ') return s.type === 'Y sĩ' || String(s.type || '').toLowerCase().includes('y sĩ');
      if (tab === 'Hộ sinh') return s.type === 'Hộ sinh' || String(s.type || '').toLowerCase().includes('hộ sinh') || String(s.type || '').toLowerCase().includes('ho sinh');
      if (tab === 'Không') return s.type === 'Không' || !s.type || s.type === 'Chưa chọn';
      return s.type === tab;
    }).length;
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = (s.fullName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                         (s.certificateCode || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                         (s.department || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                         (s.specialty || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                         (s.position || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesTab = activeTab === 'All' || 
                       (activeTab === 'Kỹ thuật viên' ? (s.type === 'Kỹ thuật viên' || String(s.type || '').toLowerCase().includes('kỹ thuật')) :
                       activeTab === 'Y sĩ' ? (s.type === 'Y sĩ' || String(s.type || '').toLowerCase().includes('y sĩ')) :
                       activeTab === 'Hộ sinh' ? (s.type === 'Hộ sinh' || String(s.type || '').toLowerCase().includes('hộ sinh') || String(s.type || '').toLowerCase().includes('ho sinh')) :
                       activeTab === 'Không' ? (s.type === 'Không' || !s.type || s.type === 'Chưa chọn') :
                       s.type === activeTab);
    const matchesPosition = selectedPosition === 'All' || (s.position || '') === selectedPosition;
    const matchesDepartment = selectedDepartment === 'All' || (s.department || '') === selectedDepartment;

    return matchesSearch && matchesTab && matchesPosition && matchesDepartment;
  });

  const totalItems = filteredStaff.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    setPageInput(validPage.toString());
  }, [validPage]);

  const startIndex = (validPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validPage > 3) pages.push('...');
      
      const start = Math.max(2, validPage - 1);
      const end = Math.min(totalPages - 1, validPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (validPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const formatDob = (dob?: string) => {
    if (!dob || dob === '---') return '---';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return dob;
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(dob)) {
      const [year, month, day] = dob.split(/[-/]/);
      return `${day}/${month}/${year}`;
    }
    try {
      const date = new Date(dob);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      // fallback
    }
    return dob;
  };

  const formatLogTime = (isoString?: string) => {
    if (!isoString) return '---';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return isoString;
    }
  };

  const staffAuthLogs = React.useMemo(() => {
    return authLogs.filter(log => {
      return log.loginType === 'quick_account' 
        || (log.userId && log.userId.startsWith('staff_'))
        || !!log.staffAccount
        || !!log.staffId;
    });
  }, [authLogs]);

  const filteredAuthLogs = React.useMemo(() => {
    return staffAuthLogs.filter(log => {
      if (logTypeFilter !== 'all' && log.type !== logTypeFilter) return false;

      if (logStaffFilter !== 'all') {
        const matchesStaffId = log.staffId === logStaffFilter || log.userId === `staff_${logStaffFilter}` || log.userId === logStaffFilter;
        const targetStaffObj = staff.find(s => s.id === logStaffFilter);
        const matchesAcc = targetStaffObj?.staffAccount && log.staffAccount === targetStaffObj.staffAccount;
        if (!matchesStaffId && !matchesAcc) return false;
      }

      if (logSearchTerm.trim()) {
        const term = logSearchTerm.toLowerCase().trim();
        const matchesName = (log.userName || '').toLowerCase().includes(term);
        const matchesEmail = (log.userEmail || '').toLowerCase().includes(term);
        const matchesAcc = (log.staffAccount || '').toLowerCase().includes(term);
        const matchesIp = (log.ipAddress || '').toLowerCase().includes(term);
        const matchesMac = (log.macAddress || '').toLowerCase().includes(term);
        const matchesDevice = (log.device || '').toLowerCase().includes(term);
        if (!matchesName && !matchesEmail && !matchesAcc && !matchesIp && !matchesMac && !matchesDevice) {
          return false;
        }
      }

      return true;
    });
  }, [staffAuthLogs, logTypeFilter, logStaffFilter, logSearchTerm, staff]);

  const totalLogItems = filteredAuthLogs.length;
  const totalLogPages = Math.max(1, Math.ceil(totalLogItems / logItemsPerPage));
  const validLogPage = Math.min(Math.max(1, logCurrentPage), totalLogPages);
  const startLogIndex = (validLogPage - 1) * logItemsPerPage;
  const paginatedLogs = filteredAuthLogs.slice(startLogIndex, startLogIndex + logItemsPerPage);

  const getStaffIcon = (type: string, department?: string) => {
    const typeNorm = (type || '').toLowerCase();
    const deptNorm = (department || '').toLowerCase();

    // Hộ sinh / Nữ hộ sinh / Sản khoa
    if (
      typeNorm.includes('hộ sinh') || 
      typeNorm.includes('ho sinh') || 
      typeNorm.includes('nữ hộ sinh') || 
      typeNorm.includes('nu ho sinh') ||
      deptNorm.includes('phụ sản') ||
      deptNorm.includes('sản khoa')
    ) {
      return <Baby size={20} />;
    }

    // Check if type is Kỹ thuật viên (or contains Kỹ thuật viên / KTV)
    if (typeNorm.includes('kỹ thuật') || typeNorm.includes('ky thuat') || typeNorm.includes('ktv') || typeNorm.includes('technician')) {
      return <Microscope size={20} />;
    }

    // Khoa Y, dược cổ truyền và Phục hồi chức năng hoặc các khoa YHCT/PHCN
    const isTraditionalOrRehab = 
      deptNorm.includes('cổ truyền') ||
      deptNorm.includes('y, dược cổ truyền') ||
      deptNorm.includes('y dược cổ truyền') ||
      deptNorm.includes('phục hồi chức năng') ||
      deptNorm.includes('yhct') ||
      deptNorm.includes('ydct') ||
      deptNorm.includes('phcn');

    if (isTraditionalOrRehab) {
      return <YinYangIcon size={20} />;
    }

    if (type === 'Y sĩ' || typeNorm.includes('y sĩ') || typeNorm.includes('y si')) {
      if (deptNorm.includes('dược')) return <Pill size={20} />;
      if (deptNorm.includes('điều dưỡng') || deptNorm.includes('chăm sóc')) return <Syringe size={20} />;
      if (deptNorm.includes('xét nghiệm') || deptNorm.includes('cận lâm sàng')) return <ClipboardList size={20} />;
      return <Stethoscope size={20} />;
    }

    switch (type) {
      case 'Bác sĩ': return <Stethoscope size={20} />;
      case 'Dược sĩ': return <Pill size={20} />;
      case 'Điều dưỡng': return <Syringe size={20} />;
      case 'Hộ sinh': return <Baby size={20} />;
      case 'Kỹ thuật viên': return <Microscope size={20} />;
      default: return <Users size={20} />;
    }
  };

  return (
    <div className="space-y-2 lg:space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 border-slate-500/10">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl lg:text-2xl font-black tracking-tight hidden lg:block">Quản lý nhân sự</h2>
          
          {/* Main Tab Switcher */}
          <div className={cn(
            "p-1 rounded-2xl border flex items-center gap-1 shrink-0",
            isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-slate-100/80 border-slate-200/80"
          )}>
            <button
              onClick={() => setMainTab('staff_list')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                mainTab === 'staff_list'
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
              )}
            >
              <Users size={15} />
              <span>Danh sách nhân sự</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                mainTab === 'staff_list' ? "bg-white/20 text-white" : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600")
              )}>
                {staff.length}
              </span>
            </button>

            <button
              onClick={() => setMainTab('access_logs')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                mainTab === 'access_logs'
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
              )}
            >
              <History size={15} />
              <span>Lịch sử đăng nhập / đăng xuất</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                mainTab === 'access_logs' ? "bg-slate-950/20 text-slate-950" : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600")
              )}>
                {staffAuthLogs.length}
              </span>
            </button>
          </div>
        </div>
        
        {canManage && mainTab === 'staff_list' && (
          <button 
            onClick={() => {
              setIsEditing(false);
              setFormData({
                fullName: '',
                staffAccount: '',
                username: '',
                type: 'Bác sĩ',
                gender: 'Nam',
                dob: '',
                address: '',
                specialty: '',
                position: '',
                phone: '',
                email: '',
                certificateCode: '',
                department: '',
                role: '',
                isActive: true
              });
              setIsModalOpen(true);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 text-sm hover:bg-primary-hover",
              !isDarkMode && "shadow-md shadow-primary/10"
            )}
          >
            <UserPlus size={16} />
            Thêm nhân sự mới
          </button>
        )}
      </div>

      {mainTab === 'staff_list' && (
        <>
          <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, mã chứng chỉ, khoa phòng..." 
            className={cn(
              "w-full pl-10 pr-3 py-2.5 rounded-xl border-none font-bold text-sm transition-all focus:ring-2 focus:ring-primary",
              isDarkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900 shadow-sm"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Nút lọc Chức danh */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setShowTitleFilter(!showTitleFilter);
                setShowPositionFilter(false);
                setShowDepartmentFilter(false);
              }}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs",
                activeTab !== 'All'
                  ? "bg-primary text-white border-primary shadow-primary/20"
                  : isDarkMode 
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              <Filter size={15} className={activeTab !== 'All' ? "text-white" : "text-primary"} />
              <span>Chức danh: <strong className="font-extrabold">{activeTab === 'All' ? 'Tất cả' : activeTab}</strong></span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                activeTab !== 'All'
                  ? "bg-white/20 text-white"
                  : isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"
              )}>
                {getTabCount(activeTab)}
              </span>
              <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-70", showTitleFilter && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showTitleFilter && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowTitleFilter(false)} 
                  />
                  
                  {/* Dropdown Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute left-0 mt-2 w-60 rounded-2xl border shadow-xl z-40 p-1.5 backdrop-blur-md overflow-hidden",
                      isDarkMode 
                        ? "bg-slate-800/95 border-slate-700 text-white" 
                        : "bg-white/95 border-slate-200 text-slate-900"
                    )}
                  >
                    <div className={cn("px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b mb-1 flex justify-between items-center", isDarkMode ? "border-slate-700/60" : "border-slate-100")}>
                      <span>Lọc theo Chức danh</span>
                      {activeTab !== 'All' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('All');
                            setShowTitleFilter(false);
                          }}
                          className="text-primary hover:underline lowercase font-semibold normal-case text-xs"
                        >
                          Xóa lọc
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                      {(['All', 'Bác sĩ', 'Dược sĩ', 'Điều dưỡng', 'Hộ sinh', 'Y sĩ', 'Kỹ thuật viên', 'Không'] as const).map((tab) => {
                        const count = getTabCount(tab);
                        const isSelected = activeTab === tab;
                        return (
                          <button
                            key={tab}
                            onClick={() => {
                              setActiveTab(tab);
                              setShowTitleFilter(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                              isSelected
                                ? "bg-primary text-white font-black shadow-xs"
                                : isDarkMode 
                                  ? "text-slate-300 hover:bg-slate-700/70" 
                                  : "text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all",
                                isSelected ? "bg-white scale-125" : "bg-transparent"
                              )} />
                              <span>{tab === 'All' ? 'Tất cả' : tab}</span>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                              isSelected
                                ? "bg-white/20 text-white"
                                : isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
                            )}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Nút lọc Chức vụ */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setShowPositionFilter(!showPositionFilter);
                setShowTitleFilter(false);
                setShowDepartmentFilter(false);
              }}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs",
                selectedPosition !== 'All'
                  ? "bg-primary text-white border-primary shadow-primary/20"
                  : isDarkMode 
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              <Filter size={15} className={selectedPosition !== 'All' ? "text-white" : "text-primary"} />
              <span>Chức vụ: <strong className="font-extrabold">{selectedPosition === 'All' ? 'Tất cả' : selectedPosition}</strong></span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                selectedPosition !== 'All'
                  ? "bg-white/20 text-white"
                  : isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"
              )}>
                {selectedPosition === 'All' ? staff.length : staff.filter(s => (s.position || '') === selectedPosition).length}
              </span>
              <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-70", showPositionFilter && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showPositionFilter && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowPositionFilter(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute left-0 mt-2 w-64 rounded-2xl border shadow-xl z-40 p-1.5 backdrop-blur-md overflow-hidden",
                      isDarkMode 
                        ? "bg-slate-800/95 border-slate-700 text-white" 
                        : "bg-white/95 border-slate-200 text-slate-900"
                    )}
                  >
                    <div className={cn("px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b mb-1 flex justify-between items-center", isDarkMode ? "border-slate-700/60" : "border-slate-100")}>
                      <span>Lọc theo Chức vụ</span>
                      {selectedPosition !== 'All' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPosition('All');
                            setShowPositionFilter(false);
                          }}
                          className="text-primary hover:underline lowercase font-semibold normal-case text-xs"
                        >
                          Xóa lọc
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                      {positionOptions.map((pos) => {
                        const count = pos === 'All' ? staff.length : staff.filter(s => (s.position || '') === pos).length;
                        const isSelected = selectedPosition === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() => {
                              setSelectedPosition(pos);
                              setShowPositionFilter(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                              isSelected
                                ? "bg-primary text-white font-black shadow-xs"
                                : isDarkMode 
                                  ? "text-slate-300 hover:bg-slate-700/70" 
                                  : "text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all shrink-0",
                                isSelected ? "bg-white scale-125" : "bg-transparent"
                              )} />
                              <span className="truncate">{pos === 'All' ? 'Tất cả' : pos}</span>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0",
                              isSelected
                                ? "bg-white/20 text-white"
                                : isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
                            )}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Nút lọc Khoa / Phòng */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setShowDepartmentFilter(!showDepartmentFilter);
                setShowTitleFilter(false);
                setShowPositionFilter(false);
              }}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs",
                selectedDepartment !== 'All'
                  ? "bg-primary text-white border-primary shadow-primary/20"
                  : isDarkMode 
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              <Filter size={15} className={selectedDepartment !== 'All' ? "text-white" : "text-primary"} />
              <span>Khoa/Phòng: <strong className="font-extrabold">{selectedDepartment === 'All' ? 'Tất cả' : selectedDepartment}</strong></span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                selectedDepartment !== 'All'
                  ? "bg-white/20 text-white"
                  : isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"
              )}>
                {selectedDepartment === 'All' ? staff.length : staff.filter(s => (s.department || '') === selectedDepartment).length}
              </span>
              <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-70", showDepartmentFilter && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showDepartmentFilter && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowDepartmentFilter(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute left-0 mt-2 w-72 rounded-2xl border shadow-xl z-40 p-1.5 backdrop-blur-md overflow-hidden",
                      isDarkMode 
                        ? "bg-slate-800/95 border-slate-700 text-white" 
                        : "bg-white/95 border-slate-200 text-slate-900"
                    )}
                  >
                    <div className={cn("px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b mb-1 flex justify-between items-center", isDarkMode ? "border-slate-700/60" : "border-slate-100")}>
                      <span>Lọc theo Khoa / Phòng</span>
                      {selectedDepartment !== 'All' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDepartment('All');
                            setShowDepartmentFilter(false);
                          }}
                          className="text-primary hover:underline lowercase font-semibold normal-case text-xs"
                        >
                          Xóa lọc
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                      {departmentOptions.map((dept) => {
                        const count = dept === 'All' ? staff.length : staff.filter(s => (s.department || '') === dept).length;
                        const isSelected = selectedDepartment === dept;
                        return (
                          <button
                            key={dept}
                            onClick={() => {
                              setSelectedDepartment(dept);
                              setShowDepartmentFilter(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                              isSelected
                                ? "bg-primary text-white font-black shadow-xs"
                                : isDarkMode 
                                  ? "text-slate-300 hover:bg-slate-700/70" 
                                  : "text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all shrink-0",
                                isSelected ? "bg-white scale-125" : "bg-transparent"
                              )} />
                              <span className="truncate">{dept === 'All' ? 'Tất cả' : dept}</span>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0",
                              isSelected
                                ? "bg-white/20 text-white"
                                : isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
                            )}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {(activeTab !== 'All' || selectedPosition !== 'All' || selectedDepartment !== 'All') && (
            <button
              onClick={() => {
                setActiveTab('All');
                setSelectedPosition('All');
                setSelectedDepartment('All');
              }}
              className="px-3 py-2 rounded-xl border border-dashed text-xs font-bold text-slate-500 hover:text-rose-500 hover:border-rose-300 transition-all flex items-center gap-1 shrink-0"
              title="Xóa tất cả bộ lọc"
            >
              <X size={14} />
              <span>Bỏ lọc</span>
            </button>
          )}

          <div className={cn(
            "flex p-1 rounded-xl shrink-0 border border-transparent",
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          )}>
            <button
              onClick={() => setViewMode('grid')}
              title="Chế độ lưới"
              className={cn(
                "p-1.5 rounded-lg transition-all flex items-center justify-center",
                viewMode === 'grid'
                  ? (isDarkMode ? "bg-slate-700 text-primary shadow-sm" : "bg-white text-primary shadow-sm")
                  : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Chế độ danh sách"
              className={cn(
                "p-1.5 rounded-lg transition-all flex items-center justify-center",
                viewMode === 'list'
                  ? (isDarkMode ? "bg-slate-700 text-primary shadow-sm" : "bg-white text-primary shadow-sm")
                  : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-xs text-slate-500 font-bold animate-pulse">Đang tải danh sách nhân sự...</p>
        </div>
      ) : filteredStaff.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedStaff.map((person) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={person.id}
                  onClick={() => {
                    setViewingStaffDetail(person);
                    setShowAccountInDetail(false);
                  }}
                  className={cn(
                    "group relative p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer overflow-hidden",
                    person.type === 'Bác sĩ'
                      ? (isDarkMode ? "bg-gradient-to-b from-blue-950/30 via-slate-800 to-slate-800 border-blue-900/40 hover:border-blue-700/60" : "bg-gradient-to-b from-blue-50/70 via-white to-white border-blue-100 hover:border-blue-300 shadow-sm")
                      : person.type === 'Dược sĩ'
                        ? (isDarkMode ? "bg-gradient-to-b from-emerald-950/30 via-slate-800 to-slate-800 border-emerald-900/40 hover:border-emerald-700/60" : "bg-gradient-to-b from-emerald-50/70 via-white to-white border-emerald-100 hover:border-emerald-300 shadow-sm")
                        : person.type === 'Điều dưỡng'
                          ? (isDarkMode ? "bg-gradient-to-b from-rose-950/30 via-slate-800 to-slate-800 border-rose-900/40 hover:border-rose-700/60" : "bg-gradient-to-b from-rose-50/70 via-white to-white border-rose-100 hover:border-rose-300 shadow-sm")
                          : (person.type === 'Hộ sinh' || String(person.type || '').toLowerCase().includes('hộ sinh') || String(person.type || '').toLowerCase().includes('ho sinh'))
                            ? (isDarkMode ? "bg-gradient-to-b from-pink-950/30 via-slate-800 to-slate-800 border-pink-900/40 hover:border-pink-700/60" : "bg-gradient-to-b from-pink-50/70 via-white to-white border-pink-100 hover:border-pink-300 shadow-sm")
                            : String(person.type || '').toLowerCase().includes('kỹ thuật')
                              ? (isDarkMode ? "bg-gradient-to-b from-purple-950/30 via-slate-800 to-slate-800 border-purple-900/40 hover:border-purple-700/60" : "bg-gradient-to-b from-purple-50/70 via-white to-white border-purple-100 hover:border-purple-300 shadow-sm")
                              : String(person.type || '').toLowerCase().includes('y sĩ') || person.type === 'Y sĩ'
                                ? (isDarkMode ? "bg-gradient-to-b from-amber-950/30 via-slate-800 to-slate-800 border-amber-900/40 hover:border-amber-700/60" : "bg-gradient-to-b from-amber-50/70 via-white to-white border-amber-100 hover:border-amber-300 shadow-sm")
                                : (person.type === 'Không' || !person.type)
                                  ? (isDarkMode ? "bg-slate-800/80 border-slate-700/80 hover:border-slate-600" : "bg-slate-100/70 border-slate-200/80 hover:border-slate-300 shadow-xs")
                                  : (isDarkMode ? "bg-gradient-to-b from-teal-950/30 via-slate-800 to-slate-800 border-teal-900/40 hover:border-teal-700/60" : "bg-gradient-to-b from-teal-50/70 via-white to-white border-teal-100 hover:border-teal-300 shadow-sm")
                  )}
                >
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                    person.type === 'Bác sĩ'
                      ? "from-blue-500 via-indigo-500 to-cyan-500"
                      : person.type === 'Dược sĩ'
                        ? "from-emerald-500 via-teal-500 to-green-500"
                        : person.type === 'Điều dưỡng'
                          ? "from-rose-500 via-red-500 to-pink-500"
                          : (person.type === 'Hộ sinh' || String(person.type || '').toLowerCase().includes('hộ sinh') || String(person.type || '').toLowerCase().includes('ho sinh'))
                            ? "from-pink-500 via-rose-400 to-fuchsia-500"
                            : String(person.type || '').toLowerCase().includes('kỹ thuật')
                              ? "from-purple-500 via-violet-500 to-indigo-500"
                              : String(person.type || '').toLowerCase().includes('y sĩ') || person.type === 'Y sĩ'
                                ? "from-amber-500 via-orange-500 to-teal-500"
                                : (person.type === 'Không' || !person.type)
                                  ? "from-slate-400 to-slate-600"
                                  : "from-teal-500 via-cyan-500 to-sky-500"
                  )} />
                  <div className="flex items-start justify-between gap-2.5 mb-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 shrink-0",
                        person.type === 'Bác sĩ' 
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25" 
                          : person.type === 'Dược sĩ' 
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25" 
                            : person.type === 'Điều dưỡng'
                              ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/25"
                              : (person.type === 'Hộ sinh' || String(person.type || '').toLowerCase().includes('hộ sinh') || String(person.type || '').toLowerCase().includes('ho sinh'))
                                ? "bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-500/25"
                                : String(person.type || '').toLowerCase().includes('kỹ thuật')
                                  ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/25"
                                  : String(person.type || '').toLowerCase().includes('y sĩ') || person.type === 'Y sĩ'
                                    ? "bg-gradient-to-br from-amber-500 to-teal-600 shadow-amber-500/25"
                                    : (person.type === 'Không' || !person.type)
                                      ? "bg-slate-600 shadow-slate-500/25"
                                      : "bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25"
                      )}>
                        {getStaffIcon(person.type, person.department)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-base font-black tracking-tight group-hover:text-primary transition-colors truncate">
                            {person.fullName}
                          </h3>
                          {person.gender === 'Nam' ? (
                            <span className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0" title="Giới tính: Nam">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="10" cy="14" r="5"/>
                                <path d="M19 5l-5.4 5.4"/>
                                <path d="M19 5h-5"/>
                                <path d="M19 5v5"/>
                              </svg>
                            </span>
                          ) : person.gender === 'Nữ' ? (
                            <span className="p-1 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-500 flex items-center justify-center shrink-0" title="Giới tính: Nữ">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="9" r="5"/>
                                <path d="M12 14v7"/>
                                <path d="M9 18h6"/>
                              </svg>
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {person.position && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-xs inline-block",
                              isDarkMode ? "bg-amber-950/60 text-amber-300 border-amber-800/50" : "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              {person.position}
                            </span>
                          )}
                          {person.specialty && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[8px] font-bold tracking-wider border shadow-xs inline-block",
                              isDarkMode ? "bg-indigo-950/60 text-indigo-300 border-indigo-800/50" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            )}>
                              {person.specialty}
                            </span>
                          )}
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest text-white shadow-xs inline-block",
                            person.type === 'Bác sĩ' 
                              ? "bg-gradient-to-r from-blue-500 to-indigo-600" 
                              : person.type === 'Dược sĩ' 
                                ? "bg-gradient-to-r from-emerald-500 to-teal-600" 
                                : person.type === 'Điều dưỡng'
                                  ? "bg-gradient-to-r from-rose-500 to-red-600"
                                  : (person.type === 'Hộ sinh' || String(person.type || '').toLowerCase().includes('hộ sinh') || String(person.type || '').toLowerCase().includes('ho sinh'))
                                    ? "bg-gradient-to-r from-pink-500 to-rose-600"
                                    : String(person.type || '').toLowerCase().includes('kỹ thuật')
                                      ? "bg-gradient-to-r from-purple-500 to-indigo-600"
                                      : String(person.type || '').toLowerCase().includes('y sĩ') || person.type === 'Y sĩ'
                                        ? "bg-gradient-to-r from-amber-500 to-teal-600"
                                        : (person.type === 'Không' || !person.type)
                                          ? "bg-slate-500"
                                          : "bg-gradient-to-r from-teal-500 to-cyan-600"
                          )}>
                            {person.type || 'Không'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {canManage && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStaff(person);
                              setFormData(person);
                              setIsEditing(true);
                              setIsModalOpen(true);
                            }}
                            title="Chỉnh sửa thông tin nhân sự"
                            className={cn(
                              "p-1.5 rounded-lg text-slate-400 hover:text-primary transition-colors",
                              isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                            )}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(person);
                            }}
                            title="Xóa nhân sự"
                            className={cn(
                              "p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors",
                              isDarkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"
                            )}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap my-2">
                    {(person.staffAccount || person.username) && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20"
                      )}>
                        TK: {person.staffAccount || person.username}
                      </span>
                    )}
                    {person.role && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-widest text-indigo-600 bg-indigo-500/10 border border-indigo-500/20"
                      )}>
                        {availableRoles.find(r => r.id === person.role)?.name || person.role}
                      </span>
                    )}
                    {person.isActive ? (
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-emerald-500">
                        <UserCheck size={10} /> Đang làm
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-slate-400">
                        <UserX size={10} /> Đã nghỉ
                      </span>
                    )}
                  </div>

                  <div className={cn(
                    "mt-2 pt-3 border-t grid grid-cols-2 gap-x-3 gap-y-2",
                    isDarkMode ? "border-slate-700" : "border-slate-100"
                  )}>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh</p>
                      <p className="text-[11px] font-bold truncate">{formatDob(person.dob)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</p>
                      <p className="text-[11px] font-bold truncate">{person.phone || '---'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Chuyên khoa</p>
                      <p className={cn("text-[11px] font-bold break-words whitespace-normal", isDarkMode ? "text-indigo-400" : "text-indigo-600")}>{person.specialty || '---'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Khoa / Phòng</p>
                      <p className="text-[11px] font-bold break-words whitespace-normal">{person.department || '---'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mã CCHN</p>
                      <p className="text-[11px] font-bold truncate">{person.certificateCode || '---'}</p>
                    </div>
                    <div className="space-y-0.5 col-span-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ</p>
                      <p className="text-[11px] font-bold truncate">{person.address || '---'}</p>
                    </div>
                    <div className={cn(
                      "space-y-0.5 col-span-2 pt-2 mt-1 border-t flex items-center justify-between text-[10px]",
                      isDarkMode ? "border-slate-800" : "border-slate-100"
                    )}>
                      <div className="flex items-center gap-1 text-amber-500 font-bold" title="Số lần truy cập bằng Tài khoản nhanh">
                        <Zap size={12} className="fill-amber-500/20 text-amber-500 shrink-0" />
                        <span>Đăng nhập nhanh: <strong className={cn("font-black", isDarkMode ? "text-amber-400" : "text-amber-600")}>{person.quickLoginCount || 0}</strong> lượt</span>
                      </div>
                      {person.lastQuickLoginAt && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          {formatLogTime(person.lastQuickLoginAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className={cn(
              "overflow-x-auto rounded-2xl border transition-colors custom-scrollbar",
              isDarkMode ? "bg-slate-800/80 border-slate-700/80" : "bg-white border-slate-200/80 shadow-xs"
            )}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={cn(
                    "border-b font-black uppercase text-[10px] tracking-wider whitespace-nowrap",
                    isDarkMode ? "bg-slate-800/90 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                  )}>
                    <th className="py-3.5 px-4">Nhân sự</th>
                    <th className="py-3.5 px-3">Chức danh / Học vị</th>
                    <th className="py-3.5 px-3">Chức vụ</th>
                    <th className="py-3.5 px-3">Khoa / Phòng</th>
                    <th className="py-3.5 px-3">Mã CCHN</th>
                    <th className="py-3.5 px-3">TK Nhanh</th>
                    <th className="py-3.5 px-3">Liên hệ</th>
                    <th className="py-3.5 px-3 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDarkMode ? "divide-slate-700/60" : "divide-slate-100")}>
                  {paginatedStaff.map((person) => (
                    <tr
                      key={person.id}
                      onClick={() => {
                        setViewingStaffDetail(person);
                        setShowAccountInDetail(false);
                      }}
                      className={cn(
                        "group transition-colors cursor-pointer",
                        isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50/80"
                      )}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs font-bold",
                            person.type === 'Bác sĩ'
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20"
                              : person.type === 'Dược sĩ'
                                ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20"
                                : person.type === 'Điều dưỡng'
                                  ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20"
                                  : (person.type === 'Hộ sinh' || String(person.type || '').toLowerCase().includes('hộ sinh') || String(person.type || '').toLowerCase().includes('ho sinh'))
                                    ? "bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-500/20"
                                    : String(person.type || '').toLowerCase().includes('kỹ thuật')
                                      ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/20"
                                      : String(person.type || '').toLowerCase().includes('y sĩ') || person.type === 'Y sĩ'
                                        ? "bg-gradient-to-br from-amber-500 to-teal-600 shadow-amber-500/20"
                                        : (person.type === 'Không' || !person.type)
                                          ? "bg-slate-600 shadow-slate-500/20"
                                          : "bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/20"
                          )}>
                            {getStaffIcon(person.type, person.department)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("font-bold text-sm truncate group-hover:text-primary transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                                {person.fullName}
                              </span>
                              {person.gender === 'Nam' ? (
                                <span className="p-0.5 rounded bg-blue-500/10 text-blue-500 shrink-0" title="Giới tính: Nam">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="10" cy="14" r="5"/>
                                    <path d="M19 5l-5.4 5.4"/>
                                    <path d="M19 5h-5"/>
                                    <path d="M19 5v5"/>
                                  </svg>
                                </span>
                              ) : person.gender === 'Nữ' ? (
                                <span className="p-0.5 rounded bg-pink-500/10 text-pink-500 shrink-0" title="Giới tính: Nữ">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="9" r="5"/>
                                    <path d="M12 14v7"/>
                                    <path d="M9 18h6"/>
                                  </svg>
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {formatDob(person.dob)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Chức danh & Chuyên khoa */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-start gap-1 min-w-[130px]">
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap",
                            person.type === 'Bác sĩ' 
                              ? "bg-gradient-to-r from-blue-500 to-indigo-600" 
                              : person.type === 'Dược sĩ' 
                                ? "bg-gradient-to-r from-emerald-500 to-teal-600" 
                                : person.type === 'Điều dưỡng'
                                  ? "bg-gradient-to-r from-rose-500 to-red-600"
                                  : (person.type === 'Hộ sinh' || String(person.type || '').toLowerCase().includes('hộ sinh') || String(person.type || '').toLowerCase().includes('ho sinh'))
                                    ? "bg-gradient-to-r from-pink-500 to-rose-600"
                                    : String(person.type || '').toLowerCase().includes('kỹ thuật')
                                      ? "bg-gradient-to-r from-purple-500 to-indigo-600"
                                      : String(person.type || '').toLowerCase().includes('y sĩ') || person.type === 'Y sĩ'
                                        ? "bg-gradient-to-r from-amber-500 to-teal-600"
                                        : (person.type === 'Không' || !person.type)
                                          ? "bg-slate-500"
                                          : "bg-gradient-to-r from-teal-500 to-cyan-600"
                          )}>
                            {person.type || 'Không'}
                          </span>
                          {person.specialty ? (
                            <span className={cn(
                              "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-normal break-words leading-tight",
                              isDarkMode ? "bg-indigo-950/50 text-indigo-300 border-indigo-800/60" : "bg-indigo-50 text-indigo-700 border-indigo-200/80"
                            )}>
                              {person.specialty}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Position */}
                      <td className="py-3 px-3">
                        <div className={cn("font-semibold text-xs truncate max-w-[130px]", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                          {person.position || '---'}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3">
                        <div className={cn("font-semibold text-xs break-words whitespace-normal min-w-[140px]", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                          {person.department || '---'}
                        </div>
                      </td>

                      {/* Certificate Code */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={cn("font-mono font-bold text-xs", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                          {person.certificateCode || '---'}
                        </span>
                      </td>

                      {/* Quick Login Count */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start">
                          <span className={cn("font-black text-xs flex items-center gap-1", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                            <Zap size={12} className="fill-amber-500/20 text-amber-500" />
                            {person.quickLoginCount || 0} lượt
                          </span>
                          {person.lastQuickLoginAt && (
                            <span className="text-[9px] text-slate-400 font-medium">
                              {formatLogTime(person.lastQuickLoginAt)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <div className="text-xs font-medium space-y-0.5">
                          <div className={cn("font-semibold", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                            {person.phone || '---'}
                          </div>
                          {person.email && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {person.email}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {person.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <UserCheck size={10} /> Đang làm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md border border-slate-500/20">
                            <UserX size={10} /> Đã nghỉ
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedStaff(person);
                                  setFormData(person);
                                  setIsEditing(true);
                                  setIsModalOpen(true);
                                }}
                                title="Chỉnh sửa"
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors text-amber-500",
                                  isDarkMode ? "hover:bg-slate-700" : "hover:bg-amber-50"
                                )}
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(person)}
                                title="Xóa"
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors text-rose-500",
                                  isDarkMode ? "hover:bg-slate-700" : "hover:bg-rose-50"
                                )}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {/* Pagination Bar */}
        <div className={cn(
          "mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border transition-colors",
          isDarkMode ? "bg-slate-800/80 border-slate-700/80" : "bg-white border-slate-200/80 shadow-xs"
        )}>
          {/* Info & Rows Selector */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs font-semibold text-slate-500">
            <span>
              Hiển thị <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{totalItems === 0 ? 0 : startIndex + 1}</span> - <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{endIndex}</span> / <span className={cn("font-bold text-primary")}>{totalItems}</span> nhân sự
            </span>
            <div className={cn("h-4 w-px hidden sm:block", isDarkMode ? "bg-slate-700" : "bg-slate-300")} />
            <div className="flex items-center gap-1.5">
              <span>Hiển thị:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer",
                  isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                <option value={6}>6 / trang</option>
                <option value={12}>12 / trang</option>
                <option value={24}>24 / trang</option>
                <option value={48}>48 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-1.5">
            {/* Trang đầu << */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validPage === 1}
              title="Trang đầu"
              className={cn(
                "p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed border",
                isDarkMode 
                  ? "bg-slate-700/60 border-slate-600/80 text-slate-300 hover:bg-slate-700 hover:text-white" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <ChevronsLeft size={16} />
            </button>

            {/* Trang trước < */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validPage === 1}
              title="Trang trước"
              className={cn(
                "p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed border",
                isDarkMode 
                  ? "bg-slate-700/60 border-slate-600/80 text-slate-300 hover:bg-slate-700 hover:text-white" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Điền/Hiển thị trang hiện tại */}
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-colors",
              isDarkMode ? "bg-slate-700/60 border-slate-600/80 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
            )}>
              <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Trang</span>
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
                  if (e.key === 'Enter') {
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
                  "w-12 text-center py-0.5 px-1 rounded-lg font-black focus:outline-none focus:ring-2 focus:ring-primary/40 border transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  isDarkMode 
                    ? "bg-slate-800 border-slate-600 text-white" 
                    : "bg-white border-slate-300 text-slate-900 shadow-xs"
                )}
              />
              <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>/ {totalPages}</span>
            </div>

            {/* Trang sau > */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validPage === totalPages}
              title="Trang sau"
              className={cn(
                "p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed border",
                isDarkMode 
                  ? "bg-slate-700/60 border-slate-600/80 text-slate-300 hover:bg-slate-700 hover:text-white" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <ChevronRight size={16} />
            </button>

            {/* Trang cuối >> */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validPage === totalPages}
              title="Trang cuối"
              className={cn(
                "p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed border",
                isDarkMode 
                  ? "bg-slate-700/60 border-slate-600/80 text-slate-300 hover:bg-slate-700 hover:text-white" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
        </>
      ) : (
        <div className={cn(
          "flex flex-col items-center justify-center py-20 space-y-4 rounded-[40px] border-2 border-dashed",
          isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
        )}>
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center text-slate-400",
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          )}>
            <Users size={40} />
          </div>
          <div className="text-center">
            <p className={cn("text-xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>Không tìm thấy nhân sự</p>
            <p className="text-slate-500 font-medium">Thử thay đổi từ khóa tìm kiếm hoặc thêm nhân sự mới</p>
          </div>
        </div>
      )}
      </>
      )}

      {/* Main Tab 2: Lịch sử đăng nhập & đăng xuất */}
      {mainTab === 'access_logs' && (
        <div className="space-y-4">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Stat 1: Total Logins */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all flex items-center gap-3.5",
              isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/80 shadow-xs"
            )}>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <LogIn size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đăng nhập TK Nhanh</p>
                <p className={cn("text-xl font-black truncate", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                  {staffAuthLogs.filter(l => l.type === 'login').length}
                </p>
              </div>
            </div>

            {/* Stat 2: Quick Account Logouts */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all flex items-center gap-3.5",
              isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/80 shadow-xs"
            )}>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <LogOut size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đăng xuất TK Nhanh</p>
                <p className={cn("text-xl font-black truncate", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                  {staffAuthLogs.filter(l => l.type === 'logout').length}
                </p>
              </div>
            </div>

            {/* Stat 3: Unique IP/Devices */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all flex items-center gap-3.5",
              isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/80 shadow-xs"
            )}>
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center shrink-0">
                <Laptop size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Thiết bị & IP ghi nhận</p>
                <p className={cn("text-xl font-black truncate", isDarkMode ? "text-sky-400" : "text-sky-600")}>
                  {new Set(staffAuthLogs.map(l => l.ipAddress || l.macAddress || l.device).filter(Boolean)).size}
                </p>
              </div>
            </div>

            {/* Stat 4: Logins Today */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all flex items-center gap-3.5",
              isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/80 shadow-xs"
            )}>
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                <Clock size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Truy cập hôm nay</p>
                <p className={cn("text-xl font-black truncate", isDarkMode ? "text-indigo-400" : "text-indigo-600")}>
                  {staffAuthLogs.filter(l => l.type === 'login' && new Date(l.timestamp).toLocaleDateString('sv-SE') === new Date().toLocaleDateString('sv-SE')).length}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className={cn(
            "p-3.5 rounded-2xl border flex flex-col md:flex-row items-center gap-3 justify-between flex-wrap",
            isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/80 shadow-xs"
          )}>
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm theo tên nhân sự, tài khoản nhanh, IP, MAC, tên thiết bị..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-3 py-2 rounded-xl text-xs font-bold transition-all focus:ring-2 focus:ring-amber-500/40 border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                )}
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              {/* Scope Badge */}
              <span className={cn("inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-xl border", isDarkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200")}>
                <Zap size={13} className="fill-amber-500/20" /> Chỉ TK Nhanh Nhân sự
              </span>

              {/* Action Type */}
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value as any)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                )}
              >
                <option value="all">Hành động: Tất cả</option>
                <option value="login">🟢 Đăng nhập</option>
                <option value="logout">🔴 Đăng xuất</option>
              </select>

              {/* Staff Member Filter */}
              <select
                value={logStaffFilter}
                onChange={(e) => setLogStaffFilter(e.target.value)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer max-w-[180px]",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                )}
              >
                <option value="all">Nhân sự: Tất cả ({staff.length})</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} {s.staffAccount ? `(${s.staffAccount})` : ''}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {(logSearchTerm || logTypeFilter !== 'all' || logStaffFilter !== 'all') && (
                <button
                  onClick={() => {
                    setLogSearchTerm('');
                    setLogTypeFilter('all');
                    setLogStaffFilter('all');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Đặt lại bộ lọc"
                >
                  <RefreshCw size={13} />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>
          </div>

          {/* Log Table */}
          <div className={cn(
            "overflow-x-auto rounded-2xl border transition-colors custom-scrollbar",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          )}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={cn(
                  "border-b font-black uppercase text-[10px] tracking-wider whitespace-nowrap",
                  isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-3">Nhân sự / Tài khoản</th>
                  <th className="py-3.5 px-3">Hành động</th>
                  <th className="py-3.5 px-3">Phương thức</th>
                  <th className="py-3.5 px-3 font-mono">Địa chỉ IP</th>
                  <th className="py-3.5 px-3 font-mono">Địa chỉ MAC</th>
                  <th className="py-3.5 px-4">Tên thiết bị & Trình duyệt</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy lịch sử đăng nhập/đăng xuất phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map(log => {
                    const isLogin = log.type === 'login';
                    const isQuick = log.loginType === 'quick_account' || log.userId?.startsWith('staff_') || !!log.staffAccount;
                    const matchedStaff = staff.find(s => s.id === log.staffId || `staff_${s.id}` === log.userId || s.id === log.userId || (s.staffAccount && s.staffAccount === log.staffAccount));

                    return (
                      <tr key={log.id} className={cn("transition-colors", isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-50")}>
                        {/* Timestamp */}
                        <td className={cn("py-3 px-4 font-bold whitespace-nowrap", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                          {formatLogTime(log.timestamp)}
                        </td>

                        {/* Staff / User Name */}
                        <td className="py-3 px-3 min-w-[180px]">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs",
                              isQuick ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-sky-500 to-indigo-600"
                            )}>
                              {log.userName ? log.userName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className={cn("font-bold text-xs truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                                {log.userName || 'Chưa xác định'}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate font-mono">
                                {log.staffAccount || matchedStaff?.staffAccount || log.userEmail || '---'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isLogin ? (
                            <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg border", isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                              <LogIn size={12} /> Đăng nhập
                            </span>
                          ) : (
                            <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg border", isDarkMode ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-200")}>
                              <LogOut size={12} /> Đăng xuất
                            </span>
                          )}
                        </td>

                        {/* Method */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isQuick ? (
                            <span className={cn("inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border", isDarkMode ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-amber-700 bg-amber-50 border-amber-200")}>
                              <Zap size={11} className="fill-amber-500/20" /> TK Nhanh
                            </span>
                          ) : (
                            <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border", isDarkMode ? "text-sky-400 bg-sky-500/10 border-sky-500/20" : "text-sky-700 bg-sky-50 border-sky-200")}>
                              <Globe size={11} /> Google
                            </span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className={cn("py-3 px-3 font-mono text-xs font-semibold whitespace-nowrap", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                          {log.ipAddress || '---'}
                        </td>

                        {/* MAC Address */}
                        <td className={cn("py-3 px-3 font-mono text-xs font-semibold whitespace-nowrap", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                          {log.macAddress || '---'}
                        </td>

                        {/* Device */}
                        <td className={cn("py-3 px-4 font-semibold text-xs truncate max-w-[220px]", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                          {log.device || '---'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Log Pagination Bar */}
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border transition-colors",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          )}>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs font-semibold text-slate-500">
              <span>
                Hiển thị <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{totalLogItems === 0 ? 0 : startLogIndex + 1}</span> - <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{Math.min(startLogIndex + logItemsPerPage, totalLogItems)}</span> / <span className="font-bold text-amber-500">{totalLogItems}</span> bản ghi
              </span>
              <div className={cn("h-4 w-px hidden sm:block", isDarkMode ? "bg-slate-700" : "bg-slate-300")} />
              <div className="flex items-center gap-1.5">
                <span>Số dòng:</span>
                <select
                  value={logItemsPerPage}
                  onChange={(e) => {
                    setLogItemsPerPage(Number(e.target.value));
                    setLogCurrentPage(1);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  <option value={10}>10 / trang</option>
                  <option value={15}>15 / trang</option>
                  <option value={30}>30 / trang</option>
                  <option value={50}>50 / trang</option>
                  <option value={100}>100 / trang</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogCurrentPage(1)}
                disabled={validLogPage === 1}
                className={cn(
                  "p-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                )}
                title="Trang đầu"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setLogCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={validLogPage === 1}
                className={cn(
                  "p-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                )}
                title="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
              <span className={cn("text-xs font-extrabold px-3 py-1 rounded-xl border", isDarkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200")}>
                {validLogPage} / {totalLogPages}
              </span>
              <button
                onClick={() => setLogCurrentPage(prev => Math.min(totalLogPages, prev + 1))}
                disabled={validLogPage === totalLogPages}
                className={cn(
                  "p-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                )}
                title="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setLogCurrentPage(totalLogPages)}
                disabled={validLogPage === totalLogPages}
                className={cn(
                  "p-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                )}
                title="Trang cuối"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-6 border-b flex items-center justify-between",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <h3 className="text-xl font-black tracking-tight">
                  {isEditing ? "Chỉnh sửa thông tin nhân sự" : "Thêm nhân sự mới"}
                </h3>
                <button onClick={() => !saving && setIsModalOpen(false)} className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                )}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên</label>
                    <input 
                      type="text" 
                      placeholder="Nhập họ và tên nhân sự..."
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.fullName || ''}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>Tài khoản nhanh</span>
                      <span className="text-[9px] text-emerald-500 font-bold lowercase italic">(Đăng nhập nhanh không cần mật khẩu)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Nhập mã / tên tài khoản (ví dụ: bs.nam, STF102)..."
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.staffAccount || formData.username || ''}
                      onChange={(e) => setFormData({...formData, staffAccount: e.target.value, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại nhân sự (Chức danh)</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.type || 'Bác sĩ'}
                      onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    >
                      {availableTitles.length > 0 ? (
                        availableTitles.map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                      ) : (
                        <>
                          <option value="Bác sĩ">Bác sĩ</option>
                          <option value="Dược sĩ">Dược sĩ</option>
                          <option value="Điều dưỡng">Điều dưỡng</option>
                          <option value="Y sĩ">Y sĩ</option>
                          <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giới tính</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.gender || 'Nam'}
                      onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tháng năm sinh</label>
                    <input 
                      type="date" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.dob || ''}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã chứng chỉ hành nghề</label>
                    <input 
                      type="text" 
                      placeholder="Mã CCHN..."
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.certificateCode || ''}
                      onChange={(e) => setFormData({...formData, certificateCode: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyên khoa</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.specialty || ''}
                      onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                    >
                      <option value="">Chọn chuyên khoa...</option>
                      {availableSpecialties.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chức vụ</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.position || ''}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                    >
                      <option value="">Chọn chức vụ...</option>
                      {availablePositions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khoa / Phòng</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.department || ''}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                    >
                      <option value="">Chọn khoa/phòng...</option>
                      {availableDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>Vai trò hệ thống</span>
                      <span className="text-[9px] text-indigo-500 font-bold lowercase italic">(Phân quyền truy cập các chức năng)</span>
                    </label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.role || ''}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="">-- Mặc định theo Chức danh --</option>
                      {availableRoles.length > 0 ? (
                        availableRoles.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.id})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="operator_doctor">Quản trị Bác sĩ (operator_doctor)</option>
                          <option value="operator_pharmacist">Quản trị Dược sĩ (operator_pharmacist)</option>
                          <option value="operator">Điều hành viên (operator)</option>
                          <option value="admin">Quản trị hệ thống (admin)</option>
                          <option value="member">Thành viên (member)</option>
                          <option value="unapproved">Chưa duyệt (unapproved)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                    <input 
                      type="text" 
                      placeholder="Số điện thoại..."
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ</label>
                    <input 
                      type="text" 
                      placeholder="Địa chỉ..."
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.address || ''}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                    <input 
                      type="email" 
                      placeholder="Email liên hệ..."
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      className={cn(
                        "w-5 h-5 rounded-lg border-none text-primary focus:ring-0",
                        isDarkMode ? "bg-slate-800" : "bg-slate-100"
                      )}
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    />
                    <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Đang làm</label>
                  </div>
                </div>
              </div>

              <div className={cn(
                "p-6 border-t flex gap-3",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-bold transition-all",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "flex-1 py-3 bg-primary text-white rounded-2xl font-bold transition-all disabled:bg-slate-300 hover:bg-primary-hover",
                    !isDarkMode && "shadow-lg shadow-primary/20"
                  )}
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Lưu thông tin"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Warning Modal */}
      <AnimatePresence>
        {staffToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setStaffToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "relative w-full max-w-md rounded-3xl p-6 shadow-2xl border z-10 space-y-4",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-red-500">Cảnh báo xóa nhân sự</h3>
                  <p className="text-xs text-slate-500 font-medium">Hành động này không thể hoàn tác</p>
                </div>
              </div>

              <div className={cn("p-4 rounded-2xl border text-sm space-y-1", isDarkMode ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-slate-100")}>
                <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                  Bạn có chắc chắn muốn xóa nhân sự:
                </p>
                <p className={cn("font-black text-base", isDarkMode ? "text-red-400" : "text-red-600")}>
                  {staffToDelete.fullName} ({staffToDelete.type})
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Dữ liệu của nhân sự này sẽ bị xóa vĩnh viễn khỏi hệ thống danh sách nhân sự.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  disabled={deleting}
                  onClick={() => setStaffToDelete(null)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
                    isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Hủy bỏ
                </button>
                <button
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Detail View Modal */}
      <AnimatePresence>
        {viewingStaffDetail && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingStaffDetail(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border transition-colors z-10 flex flex-col max-h-[85vh]",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
              )}
            >
              {/* Top Banner Accent */}
              <div className={cn(
                "h-2.5 w-full bg-gradient-to-r",
                viewingStaffDetail.type === 'Bác sĩ'
                  ? "from-blue-500 via-indigo-500 to-cyan-500"
                  : viewingStaffDetail.type === 'Dược sĩ'
                    ? "from-emerald-500 via-teal-500 to-green-500"
                    : viewingStaffDetail.type === 'Điều dưỡng'
                      ? "from-rose-500 via-red-500 to-pink-500"
                      : String(viewingStaffDetail.type || '').toLowerCase().includes('kỹ thuật')
                        ? "from-purple-500 via-violet-500 to-indigo-500"
                        : String(viewingStaffDetail.type || '').toLowerCase().includes('y sĩ') || viewingStaffDetail.type === 'Y sĩ'
                          ? "from-amber-500 via-orange-500 to-teal-500"
                          : (viewingStaffDetail.type === 'Không' || !viewingStaffDetail.type)
                            ? "from-slate-400 to-slate-600"
                            : "from-teal-500 via-cyan-500 to-sky-500"
              )} />

              {/* Header */}
              <div className={cn(
                "p-6 border-b flex items-start justify-between gap-4 shrink-0",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0",
                    viewingStaffDetail.type === 'Bác sĩ' 
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25" 
                      : viewingStaffDetail.type === 'Dược sĩ' 
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25" 
                        : viewingStaffDetail.type === 'Điều dưỡng'
                          ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/25"
                          : String(viewingStaffDetail.type || '').toLowerCase().includes('kỹ thuật')
                            ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/25"
                            : String(viewingStaffDetail.type || '').toLowerCase().includes('y sĩ') || viewingStaffDetail.type === 'Y sĩ'
                              ? "bg-gradient-to-br from-amber-500 to-teal-600 shadow-amber-500/25"
                              : (viewingStaffDetail.type === 'Không' || !viewingStaffDetail.type)
                                ? "bg-slate-600 shadow-slate-500/25"
                                : "bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25"
                  )}>
                    {getStaffIcon(viewingStaffDetail.type, viewingStaffDetail.department)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black tracking-tight truncate">
                        {viewingStaffDetail.fullName}
                      </h3>
                      {viewingStaffDetail.gender === 'Nam' ? (
                        <span className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0" title="Giới tính: Nam">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="10" cy="14" r="5"/>
                            <path d="M19 5l-5.4 5.4"/>
                            <path d="M19 5h-5"/>
                            <path d="M19 5v5"/>
                          </svg>
                        </span>
                      ) : viewingStaffDetail.gender === 'Nữ' ? (
                        <span className="p-1 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-500 flex items-center justify-center shrink-0" title="Giới tính: Nữ">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="9" r="5"/>
                            <path d="M12 14v7"/>
                            <path d="M9 18h6"/>
                          </svg>
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {viewingStaffDetail.position && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-xs inline-block",
                          isDarkMode ? "bg-amber-950/60 text-amber-300 border-amber-800/50" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {viewingStaffDetail.position}
                        </span>
                      )}
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest text-white shadow-xs inline-block",
                        viewingStaffDetail.type === 'Bác sĩ' 
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600" 
                          : viewingStaffDetail.type === 'Dược sĩ' 
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600" 
                            : viewingStaffDetail.type === 'Điều dưỡng'
                              ? "bg-gradient-to-r from-rose-500 to-red-600"
                              : String(viewingStaffDetail.type || '').toLowerCase().includes('kỹ thuật')
                                ? "bg-gradient-to-r from-purple-500 to-indigo-600"
                                : String(viewingStaffDetail.type || '').toLowerCase().includes('y sĩ') || viewingStaffDetail.type === 'Y sĩ'
                                  ? "bg-gradient-to-r from-amber-500 to-teal-600"
                                  : (viewingStaffDetail.type === 'Không' || !viewingStaffDetail.type)
                                    ? "bg-slate-500"
                                    : "bg-gradient-to-r from-teal-500 to-cyan-600"
                      )}>
                        {viewingStaffDetail.type || 'Không'}
                      </span>
                      {viewingStaffDetail.isActive ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <UserCheck size={12} /> Đang làm
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md border border-slate-500/20">
                          <UserX size={12} /> Đã nghỉ
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setViewingStaffDetail(null)} 
                  className={cn(
                    "p-2 rounded-xl transition-colors cursor-pointer shrink-0",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body Details Grid */}
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={cn("p-3.5 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài khoản nhanh</p>
                      {(viewingStaffDetail.staffAccount || viewingStaffDetail.username) && (
                        <button
                          type="button"
                          onClick={() => setShowAccountInDetail(!showAccountInDetail)}
                          className="text-slate-400 hover:text-primary transition-colors p-1 rounded-lg cursor-pointer"
                          title={showAccountInDetail ? "Ẩn tài khoản" : "Hiện tài khoản"}
                        >
                          {showAccountInDetail ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                    <p className={cn("text-sm font-bold flex items-center gap-1", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                      {(viewingStaffDetail.staffAccount || viewingStaffDetail.username) ? (
                        showAccountInDetail ? (viewingStaffDetail.staffAccount || viewingStaffDetail.username) : '••••••••'
                      ) : '---'}
                    </p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh</p>
                    <p className="text-sm font-bold">{formatDob(viewingStaffDetail.dob)}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chức vụ</p>
                    <p className={cn("text-sm font-bold", isDarkMode ? "text-amber-400" : "text-amber-600")}>{viewingStaffDetail.position || '---'}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chức danh / Loại nhân sự</p>
                    <p className="text-sm font-bold">{viewingStaffDetail.type}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khoa / Phòng</p>
                    <p className="text-sm font-bold">{viewingStaffDetail.department || '---'}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyên khoa</p>
                    <p className="text-sm font-bold">{viewingStaffDetail.specialty || '---'}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã CCHN</p>
                    <p className="text-sm font-bold">{viewingStaffDetail.certificateCode || '---'}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</p>
                    <p className="text-sm font-bold">{viewingStaffDetail.phone || '---'}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1 md:col-span-2", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                    <p className="text-sm font-bold">{viewingStaffDetail.email || '---'}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1 md:col-span-2", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ</p>
                    <p className="text-sm font-bold">{viewingStaffDetail.address || '---'}</p>
                  </div>

                  <div className={cn("p-3.5 rounded-2xl border space-y-1 md:col-span-2", isDarkMode ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/80 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò hệ thống</p>
                    <p className={cn("text-sm font-bold", isDarkMode ? "text-indigo-400" : "text-indigo-600")}>
                      {availableRoles.find(r => r.id === viewingStaffDetail.role)?.name || viewingStaffDetail.role || 'Mặc định theo chức danh'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={cn(
                "p-4 px-6 border-t flex items-center justify-end shrink-0",
                isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"
              )}>
                {canManage && (
                  <button
                    onClick={() => {
                      const person = viewingStaffDetail;
                      setViewingStaffDetail(null);
                      setSelectedStaff(person);
                      setFormData(person);
                      setIsEditing(true);
                      setIsModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Edit size={16} />
                    Chỉnh sửa thông tin
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffManagement;
