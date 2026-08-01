import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldCheck, ShieldAlert, Trash2, Search, Mail, User as UserIcon, 
  CheckCircle2, XCircle, Edit3, X, Save, Loader2, Phone, Briefcase, Award, 
  Globe, GraduationCap, Eye, EyeOff, MoreVertical, ChevronRight, ChevronLeft, 
  LayoutGrid, List, UserCheck, UserX, Stethoscope, Pill, Syringe, Microscope 
} from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc, handleFirestoreError, OperationType, query, where, getDocs } from '../firebase';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getBustedPhotoURL } from '../lib/utils';
import ConfirmModal from './ConfirmModal';

interface UserManagementProps {
  isDarkMode?: boolean;
}

const ADMIN_EMAILS = ['ttytkvbinhphu@gmail.com'];

const isMasterAdmin = (email: string | undefined) => {
  return ADMIN_EMAILS.includes(email || '');
};

const UserManagement: React.FC<UserManagementProps> = ({ isDarkMode }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Chưa duyệt' | 'Bác sĩ' | 'Dược sĩ' | 'Điều dưỡng' | 'Y sĩ' | 'Kỹ thuật viên' | 'Admin'>('All');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', title: '', position: '', specialty: '', department: '', zalo: '' });
  
  const [configTitles, setConfigTitles] = useState<string[]>([]);
  const [configPositions, setConfigPositions] = useState<string[]>([]);
  const [configSpecialties, setConfigSpecialties] = useState<string[]>([]);
  const [configDepartments, setConfigDepartments] = useState<string[]>([]);
  const [configRoles, setConfigRoles] = useState<{id: string, name: string}[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmUid, setConfirmUid] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination & View Mode
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('user_view_mode');
      return saved === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('user_view_mode', viewMode);
    } catch (e) {
      console.error(e);
    }
  }, [viewMode]);

  // Reset page to 1 when search, tab, or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, itemsPerPage]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    // Fetch config data
    const unsubTitles = onSnapshot(collection(db, 'config_titles'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ name: doc.data().name, order: doc.data().order ?? 0 }));
      items.sort((a, b) => a.order - b.order);
      setConfigTitles(items.map(i => i.name));
    });
    const unsubPositions = onSnapshot(collection(db, 'config_positions'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ name: doc.data().name, order: doc.data().order ?? 0 }));
      items.sort((a, b) => a.order - b.order);
      setConfigPositions(items.map(i => i.name));
    });
    const unsubSpecialties = onSnapshot(collection(db, 'config_specialties'), (snapshot) => {
      setConfigSpecialties(snapshot.docs.map(doc => doc.data().name).sort());
    });
    const unsubDepartments = onSnapshot(collection(db, 'config_departments'), (snapshot) => {
      setConfigDepartments(snapshot.docs.map(doc => doc.data().name).sort());
    });
    const unsubRoles = onSnapshot(collection(db, 'config_roles'), (snapshot) => {
      setConfigRoles(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'main'), (doc) => {
      if (doc.exists()) {
        setSystemSettings(doc.data());
      }
    });

    return () => {
      unsubscribe();
      unsubTitles();
      unsubPositions();
      unsubSpecialties();
      unsubDepartments();
      unsubRoles();
      unsubSettings();
    };
  }, []);

  const toggleApproval = async (user: UserProfile) => {
    try {
      const newApprovedStatus = !user.isApproved;
      await setDoc(doc(db, 'users', user.uid), {
        ...user,
        isApproved: newApprovedStatus,
        role: !newApprovedStatus ? 'unapproved' : user.role
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const toggleHidden = async (user: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...user,
        isHidden: !user.isHidden
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const changeRole = async (user: UserProfile, newRole: 'admin' | 'operator' | 'operator_doctor' | 'operator_pharmacist' | 'member') => {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...user,
        role: newRole
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteUser = (uid: string, name: string) => {
    setConfirmUid(uid);
    setConfirmName(name);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmUid) return;
    setIsDeleting(true);
    try {
      const cascadingCollections = [
        { name: 'prescriptions', field: 'doctorUid' },
        { name: 'adr_reports', field: 'reporterUid' },
        { name: 'calendar_events', field: 'createdBy' },
        { name: 'notes', field: 'createdBy' },
        { name: 'todos', field: 'createdBy' },
        { name: 'social_posts', field: 'authorUid' },
        { name: 'social_likes', field: 'userId' },
        { name: 'social_comments', field: 'authorUid' },
        { name: 'notifications', field: 'userId' },
        { name: 'auth_logs', field: 'userId' }
      ];

      for (const col of cascadingCollections) {
        try {
          const q = query(collection(db, col.name), where(col.field, '==', confirmUid));
          const snapshot = await getDocs(q);
          for (const d of snapshot.docs) {
            try {
              if (col.name === 'social_posts') {
                const likesQ = query(collection(db, 'social_likes'), where('postId', '==', d.id));
                const likesSnap = await getDocs(likesQ);
                for (const ld of likesSnap.docs) {
                  await deleteDoc(doc(db, 'social_likes', ld.id)).catch(e => console.warn(`Failed to delete like ${ld.id}:`, e));
                }

                const commentsQ = query(collection(db, 'social_comments'), where('postId', '==', d.id));
                const commentsSnap = await getDocs(commentsQ);
                for (const cd of commentsSnap.docs) {
                  await deleteDoc(doc(db, 'social_comments', cd.id)).catch(e => console.warn(`Failed to delete comment ${cd.id}:`, e));
                }
              }
              await deleteDoc(doc(db, col.name, d.id));
            } catch (innerErr) {
              console.warn(`Error deleting document ${d.id} in ${col.name}:`, innerErr);
            }
          }
        } catch (outerErr) {
          console.warn(`Error processing collection ${col.name}:`, outerErr);
        }
      }

      await deleteDoc(doc(db, 'users', confirmUid));

      setIsConfirmOpen(false);
      setConfirmUid(null);
      setConfirmName('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `cascade_delete/${confirmUid}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditing = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName || '',
      title: user.title || '',
      position: user.position || '',
      specialty: user.specialty || 'Không',
      department: user.department || '',
      zalo: user.zalo || ''
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        displayName: editForm.displayName,
        title: editForm.title,
        position: editForm.position,
        specialty: editForm.specialty,
        department: editForm.department,
        zalo: editForm.zalo,
        updatedAt: new Date().toISOString()
      });
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.uid}`);
    }
  };

  const getUserTypeCategory = (user: UserProfile) => {
    if (!user.isApproved) return 'Chưa duyệt';
    const text = ((user.title || '') + ' ' + (user.specialty || '') + ' ' + (user.position || '')).toLowerCase();
    if (text.includes('bác sĩ') || user.role === 'operator_doctor') return 'Bác sĩ';
    if (text.includes('dược sĩ') || user.role === 'operator_pharmacist') return 'Dược sĩ';
    if (text.includes('điều dưỡng')) return 'Điều dưỡng';
    if (text.includes('kỹ thuật')) return 'Kỹ thuật viên';
    if (text.includes('y sĩ')) return 'Y sĩ';
    if (user.role === 'admin') return 'Admin';
    return 'Khác';
  };

  const getUserIcon = (user: UserProfile) => {
    const text = ((user.title || '') + ' ' + (user.specialty || '') + ' ' + (user.position || '')).toLowerCase();
    if (text.includes('bác sĩ') || user.role === 'operator_doctor') return <Stethoscope size={18} />;
    if (text.includes('dược sĩ') || user.role === 'operator_pharmacist') return <Pill size={18} />;
    if (text.includes('điều dưỡng')) return <Syringe size={18} />;
    if (text.includes('kỹ thuật')) return <Microscope size={18} />;
    if (text.includes('y sĩ')) return <Briefcase size={18} />;
    return <UserIcon size={18} />;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.email || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (user.displayName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (user.zalo || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (user.department || '').toLowerCase().includes((searchTerm || '').toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'All') return true;
    if (activeTab === 'Chưa duyệt') return !user.isApproved;
    const category = getUserTypeCategory(user);
    if (activeTab === 'Admin') return user.role === 'admin';
    return category === activeTab;
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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

  const getPositionColor = (pos: string) => {
    const p = (pos || '').toLowerCase();
    if (p.includes('giám đốc')) return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
    if (p.includes('trưởng khoa') || p.includes('trưởng phòng')) return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (p.includes('phó khoa') || p.includes('phó phòng')) return isDarkMode ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-700 border-teal-200';
    if (p.includes('điều dưỡng trưởng')) return isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200';
    if (p.includes('nhân viên') || !pos) return isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-100';
    return isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-100';
  };

  return (
    <div className={cn(
      "p-2 lg:p-6 max-w-full mx-auto pb-24 lg:pb-12 transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng theo tên, email, sđt..."
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20",
              isDarkMode 
                ? "bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500" 
                : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <div className={cn(
            "flex p-1 rounded-xl shrink-0",
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          )}>
            {(['All', 'Chưa duyệt', 'Bác sĩ', 'Dược sĩ', 'Điều dưỡng', 'Y sĩ', 'Kỹ thuật viên', 'Admin'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === tab 
                    ? (isDarkMode ? "bg-slate-700 text-primary shadow-sm" : "bg-white text-primary shadow-sm")
                    : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
                )}
              >
                {tab === 'All' ? 'Tất cả' : tab}
              </button>
            ))}
          </div>

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

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-slate-500 font-bold animate-pulse">Đang tải danh sách người dùng...</p>
        </div>
      ) : filteredUsers.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedUsers.map((user) => {
                const category = getUserTypeCategory(user);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={user.uid}
                    onClick={() => startEditing(user)}
                    className={cn(
                      "group relative p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer overflow-hidden",
                      category === 'Bác sĩ'
                        ? (isDarkMode ? "bg-gradient-to-b from-blue-950/30 via-slate-800 to-slate-800 border-blue-900/40 hover:border-blue-700/60" : "bg-gradient-to-b from-blue-50/70 via-white to-white border-blue-100 hover:border-blue-300 shadow-sm")
                        : category === 'Dược sĩ'
                          ? (isDarkMode ? "bg-gradient-to-b from-emerald-950/30 via-slate-800 to-slate-800 border-emerald-900/40 hover:border-emerald-700/60" : "bg-gradient-to-b from-emerald-50/70 via-white to-white border-emerald-100 hover:border-emerald-300 shadow-sm")
                          : category === 'Điều dưỡng'
                            ? (isDarkMode ? "bg-gradient-to-b from-rose-950/30 via-slate-800 to-slate-800 border-rose-900/40 hover:border-rose-700/60" : "bg-gradient-to-b from-rose-50/70 via-white to-white border-rose-100 hover:border-rose-300 shadow-sm")
                            : category === 'Kỹ thuật viên'
                              ? (isDarkMode ? "bg-gradient-to-b from-purple-950/30 via-slate-800 to-slate-800 border-purple-900/40 hover:border-purple-700/60" : "bg-gradient-to-b from-purple-50/70 via-white to-white border-purple-100 hover:border-purple-300 shadow-sm")
                              : category === 'Y sĩ'
                                ? (isDarkMode ? "bg-gradient-to-b from-amber-950/30 via-slate-800 to-slate-800 border-amber-900/40 hover:border-amber-700/60" : "bg-gradient-to-b from-amber-50/70 via-white to-white border-amber-100 hover:border-amber-300 shadow-sm")
                                : category === 'Chưa duyệt'
                                  ? (isDarkMode ? "bg-gradient-to-b from-rose-950/40 via-slate-800 to-slate-800 border-rose-900/50 hover:border-rose-700/60" : "bg-gradient-to-b from-rose-50/80 via-white to-white border-rose-200 hover:border-rose-300 shadow-sm")
                                  : category === 'Admin'
                                    ? (isDarkMode ? "bg-gradient-to-b from-indigo-950/30 via-slate-800 to-slate-800 border-indigo-900/40 hover:border-indigo-700/60" : "bg-gradient-to-b from-indigo-50/70 via-white to-white border-indigo-100 hover:border-indigo-300 shadow-sm")
                                    : (isDarkMode ? "bg-slate-800/80 border-slate-700/80 hover:border-slate-600" : "bg-slate-100/70 border-slate-200/80 hover:border-slate-300 shadow-xs")
                    )}
                  >
                    <div className={cn(
                      "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                      category === 'Bác sĩ'
                        ? "from-blue-500 via-indigo-500 to-cyan-500"
                        : category === 'Dược sĩ'
                          ? "from-emerald-500 via-teal-500 to-green-500"
                          : category === 'Điều dưỡng'
                            ? "from-rose-500 via-red-500 to-pink-500"
                            : category === 'Kỹ thuật viên'
                              ? "from-purple-500 via-violet-500 to-indigo-500"
                              : category === 'Y sĩ'
                                ? "from-amber-500 via-orange-500 to-teal-500"
                                : category === 'Chưa duyệt'
                                  ? "from-amber-500 to-rose-500"
                                  : category === 'Admin'
                                    ? "from-indigo-500 via-purple-500 to-pink-500"
                                    : "from-teal-500 via-cyan-500 to-sky-500"
                    )} />

                    <div className="flex items-start justify-between gap-2.5 mb-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 shrink-0 overflow-hidden font-bold text-sm",
                          !user.photoURL && (
                            category === 'Bác sĩ' ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25" :
                            category === 'Dược sĩ' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25" :
                            category === 'Điều dưỡng' ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/25" :
                            category === 'Kỹ thuật viên' ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/25" :
                            category === 'Y sĩ' ? "bg-gradient-to-br from-amber-500 to-teal-600 shadow-amber-500/25" :
                            category === 'Admin' ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/25" :
                            "bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/25"
                          )
                        )}>
                          {user.photoURL ? (
                            <img src={getBustedPhotoURL(user.photoURL, user.photoSyncToken)} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            getUserIcon(user)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="text-base font-black tracking-tight group-hover:text-primary transition-colors truncate">
                              {user.displayName}
                            </h3>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {user.title && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-xs inline-block",
                                isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {user.title}
                              </span>
                            )}
                            {user.position && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-xs inline-block",
                                getPositionColor(user.position)
                              )}>
                                {user.position}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => toggleHidden(user)}
                          title={user.isHidden ? "Hiện người dùng" : "Ẩn người dùng"}
                          className={cn(
                            "p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors",
                            isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                          )}
                        >
                          {user.isHidden ? <EyeOff size={16} className="text-amber-500" /> : <Eye size={16} />}
                        </button>
                        <button 
                          onClick={() => startEditing(user)}
                          title="Chỉnh sửa hồ sơ"
                          className={cn(
                            "p-1.5 rounded-lg text-slate-400 hover:text-primary transition-colors",
                            isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                          )}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteUser(user.uid, user.displayName || user.email)}
                          disabled={isMasterAdmin(user.email)}
                          title="Xóa người dùng"
                          className={cn(
                            "p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30",
                            isDarkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"
                          )}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap my-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleApproval(user)}
                        disabled={isMasterAdmin(user.email)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all flex items-center gap-1",
                          user.isApproved 
                            ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600") 
                            : (isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-600")
                        )}
                      >
                        {user.isApproved ? <UserCheck size={10} /> : <UserX size={10} />}
                        {user.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                      </button>

                      <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-widest border",
                        user.role === 'admin' 
                          ? (isDarkMode ? "bg-indigo-900/40 border-indigo-500/30 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-700") 
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")
                      )}>
                        {configRoles.find(r => r.id === user.role)?.name || user.role}
                      </span>

                      {user.isHidden && (
                        <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-500">
                          Đã ẩn
                        </span>
                      )}
                    </div>

                    <div className={cn(
                      "mt-2 pt-3 border-t grid grid-cols-2 gap-x-3 gap-y-2",
                      isDarkMode ? "border-slate-700" : "border-slate-100"
                    )}>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                        <p className="text-[11px] font-bold truncate">{user.email || '---'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Chuyên môn</p>
                        <p className="text-[11px] font-bold truncate">{user.specialty || '---'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Khoa / Phòng</p>
                        <p className="text-[11px] font-bold break-words whitespace-normal">{user.department || '---'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Zalo / SĐT</p>
                        <p className="text-[11px] font-bold truncate">{user.zalo || '---'}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
                    <th className="py-3.5 px-4">Người dùng</th>
                    <th className="py-3.5 px-3">Chức danh</th>
                    <th className="py-3.5 px-3">Chuyên môn / Chức vụ</th>
                    <th className="py-3.5 px-3">Khoa / Phòng</th>
                    <th className="py-3.5 px-3">Vai trò</th>
                    <th className="py-3.5 px-3 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDarkMode ? "divide-slate-700/60" : "divide-slate-100")}>
                  {paginatedUsers.map((user) => {
                    const category = getUserTypeCategory(user);
                    return (
                      <tr
                        key={user.uid}
                        onClick={() => startEditing(user)}
                        className={cn(
                          "group transition-colors cursor-pointer",
                          isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50/80"
                        )}
                      >
                        {/* Avatar & Name & Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs font-bold text-xs overflow-hidden",
                              !user.photoURL && (
                                category === 'Bác sĩ' ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20" :
                                category === 'Dược sĩ' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20" :
                                category === 'Điều dưỡng' ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20" :
                                category === 'Kỹ thuật viên' ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/20" :
                                category === 'Y sĩ' ? "bg-gradient-to-br from-amber-500 to-teal-600 shadow-amber-500/20" :
                                category === 'Admin' ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20" :
                                "bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/20"
                              )
                            )}>
                              {user.photoURL ? (
                                <img src={getBustedPhotoURL(user.photoURL, user.photoSyncToken)} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                getUserIcon(user)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("font-bold text-sm truncate group-hover:text-primary transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                                  {user.displayName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Chức danh */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                            isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                          )}>
                            {user.title || 'Chưa có'}
                          </span>
                        </td>

                        {/* Chuyên môn / Chức vụ */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className={cn("font-semibold text-xs truncate max-w-[150px]", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                              {user.specialty || '---'}
                            </div>
                            {user.position && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {user.position}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Khoa / Phòng */}
                        <td className="py-3 px-3">
                          <div className={cn("font-semibold text-xs break-words whitespace-normal min-w-[140px]", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                            {user.department || '---'}
                          </div>
                        </td>

                        {/* Vai trò */}
                        <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <select 
                            value={user.role || 'member'}
                            onChange={(e) => changeRole(user, e.target.value as any)}
                            disabled={isMasterAdmin(user.email)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border transition-all cursor-pointer outline-none",
                              user.role === 'admin' 
                                ? (isDarkMode ? "bg-indigo-900/40 border-indigo-500/30 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-700") 
                                : user.role === 'unapproved'
                                  ? (isDarkMode ? "bg-amber-900/40 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")
                                  : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")
                            )}
                          >
                            {configRoles.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Trạng thái (Phê duyệt status) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleApproval(user)}
                            disabled={isMasterAdmin(user.email)}
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all",
                              user.isApproved 
                                ? (isDarkMode ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-600 bg-emerald-50 border-emerald-200") 
                                : (isDarkMode ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-rose-600 bg-rose-50 border-rose-200")
                            )}
                          >
                            {user.isApproved ? <UserCheck size={10} /> : <UserX size={10} />}
                            {user.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                          </button>
                        </td>

                        {/* Thao tác (No Eye button!) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => toggleHidden(user)}
                              title={user.isHidden ? "Hiện người dùng" : "Ẩn người dùng"}
                              className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                user.isHidden
                                  ? "text-amber-500 bg-amber-500/10"
                                  : (isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500")
                              )}
                            >
                              {user.isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            <button
                              onClick={() => startEditing(user)}
                              title="Chỉnh sửa"
                              className={cn(
                                "p-1.5 rounded-lg transition-colors text-amber-500",
                                isDarkMode ? "hover:bg-slate-700" : "hover:bg-amber-50"
                              )}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => deleteUser(user.uid, user.displayName || user.email)}
                              disabled={isMasterAdmin(user.email)}
                              title="Xóa"
                              className={cn(
                                "p-1.5 rounded-lg transition-colors text-rose-500 disabled:opacity-30",
                                isDarkMode ? "hover:bg-slate-700" : "hover:bg-rose-50"
                              )}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                Hiển thị <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{totalItems === 0 ? 0 : startIndex + 1}</span> - <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{endIndex}</span> / <span className={cn("font-bold text-primary")}>{totalItems}</span> người dùng
              </span>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
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

              {getPageNumbers().map((page, idx) => (
                typeof page === 'number' ? (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center border",
                      validPage === page
                        ? "bg-primary border-primary text-white shadow-sm shadow-primary/30 scale-105"
                        : isDarkMode
                          ? "bg-slate-700/60 border-slate-600/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={idx} className="w-6 text-center text-xs text-slate-400 font-bold select-none">
                    {page}
                  </span>
                )
              ))}

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
            </div>
          </div>
        </>
      ) : (
        <div className={cn(
          "flex flex-col items-center justify-center py-20 space-y-4 rounded-[40px] border-2 border-dashed",
          isDarkMode ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-slate-50/50"
        )}>
          <UserIcon size={40} className="text-slate-300" />
          <p className="text-sm font-bold text-slate-400">Không tìm thấy người dùng phù hợp</p>
        </div>
      )}

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "w-full max-w-2xl lg:rounded-[32px] shadow-2xl overflow-hidden border transition-all flex flex-col max-h-[90vh]",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "px-6 py-5 border-b flex items-center justify-between text-white transition-colors shrink-0 relative overflow-hidden",
                editingUser.role === 'admin' ? "bg-indigo-600" : 
                ['operator_doctor', 'operator_pharmacist', 'operator'].includes(editingUser.role || '') ? "bg-emerald-600" : "bg-slate-600"
              )}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl">
                    {editForm.displayName?.[0] || editingUser.email?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Chỉnh sửa hồ sơ</h3>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest truncate max-w-[250px]">
                      {editingUser.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="relative z-10 p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className={cn("flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar", isDarkMode ? "bg-slate-900" : "bg-white")}>
                {/* Basic Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      <UserIcon size={12} /> Họ và tên
                    </label>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-3 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none text-sm shadow-sm",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={editForm.displayName || ''}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      placeholder="Nhập họ và tên..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      <Phone size={12} /> Số Zalo
                    </label>
                    <input
                      type="tel"
                      className={cn(
                        "w-full px-4 py-3 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none text-sm shadow-sm",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={editForm.zalo || ''}
                      onChange={(e) => setEditForm({ ...editForm, zalo: e.target.value })}
                      placeholder="Nhập số Zalo..."
                    />
                  </div>
                </div>

                {/* Professional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chức danh */}
                  <div className="space-y-3">
                    <label className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      <Award size={12} /> Chức danh
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {configTitles.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, title: t })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all border-2",
                            editForm.title === t 
                              ? (isDarkMode ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-indigo-50 border-indigo-600 text-indigo-600")
                              : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700" : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100")
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-2.5 border-2 rounded-xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none text-xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Hoặc nhập khác..."
                    />
                  </div>

                  {/* Chức vụ */}
                  <div className="space-y-3">
                    <label className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      <ShieldCheck size={12} /> Chức vụ
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {configPositions.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, position: p })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all border-2",
                            editForm.position === p 
                              ? (isDarkMode ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-indigo-50 border-indigo-600 text-indigo-600")
                              : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700" : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100")
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-2.5 border-2 rounded-xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none text-xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={editForm.position || ''}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      placeholder="Hoặc nhập khác..."
                    />
                  </div>

                  {/* Chuyên môn */}
                  <div className="space-y-3">
                    <label className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      <GraduationCap size={12} /> Chuyên môn
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {configSpecialties.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, specialty: s })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all border-2",
                            editForm.specialty === s 
                              ? (isDarkMode ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-600 text-emerald-600")
                              : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700" : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100")
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-2.5 border-2 rounded-xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none text-xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={editForm.specialty || ''}
                      onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                      placeholder="Hoặc nhập khác..."
                    />
                  </div>

                  {/* Khoa/Phòng */}
                  <div className="space-y-3">
                    <label className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      <Globe size={12} /> Khoa/Phòng
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {configDepartments.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, department: d })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all border-2",
                            editForm.department === d 
                              ? (isDarkMode ? "bg-teal-500/20 border-teal-500 text-teal-400" : "bg-teal-50 border-teal-600 text-teal-600")
                              : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700" : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100")
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-2.5 border-2 rounded-xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none text-xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={editForm.department || ''}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      placeholder="Hoặc nhập khác..."
                    />
                  </div>
                </div>
              </div>

              <div className={cn("p-5 border-t flex gap-3 transition-colors shrink-0", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-100")}>
                <button
                  onClick={() => setEditingUser(null)}
                  className={cn(
                    "flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-[2] py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/10 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Cập nhật hồ sơ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={cn(
        "mt-8 p-6 rounded-3xl border flex gap-4 items-start transition-colors",
        isDarkMode 
          ? "bg-indigo-900/10 border-indigo-900/30" 
          : "bg-indigo-50 border-indigo-100"
      )}>
        <ShieldCheck className={isDarkMode ? "text-indigo-400" : "text-indigo-600"} size={24} />
        <div>
          <h4 className={cn(
            "font-bold mb-1 transition-colors",
            isDarkMode ? "text-indigo-300" : "text-indigo-900"
          )}>Lưu ý bảo mật</h4>
          <p className={cn(
            "text-sm leading-relaxed transition-colors",
            isDarkMode ? "text-indigo-400" : "text-indigo-700"
          )}>
            Chỉ những người dùng được <strong>Phê duyệt</strong> mới có thể thực hiện các thao tác quan trọng trong hệ thống. 
            Quản trị viên có toàn quyền thay đổi vai trò, chức danh và xóa tài khoản khỏi cơ sở dữ liệu.
          </p>
        </div>
      </div>

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa người dùng"
        message={`Bạn có chắc chắn muốn xóa người dùng "${confirmName}" khỏi hệ thống? Tất cả dữ liệu bài đăng, ghi chú, đơn thuốc... do tài khoản này tạo ra cũng sẽ bị xóa. Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default UserManagement;
