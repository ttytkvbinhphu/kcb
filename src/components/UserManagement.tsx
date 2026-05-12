import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, ShieldAlert, Trash2, Search, Mail, User as UserIcon, CheckCircle2, XCircle, Edit3, X, Save, Loader2, Phone, Briefcase, Award, Globe, GraduationCap, Eye, EyeOff } from 'lucide-react';
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
      setConfigTitles(snapshot.docs.map(doc => doc.data().name).sort());
    });
    const unsubPositions = onSnapshot(collection(db, 'config_positions'), (snapshot) => {
      setConfigPositions(snapshot.docs.map(doc => doc.data().name).sort());
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
        // If unapproving, force role back to 'unapproved'
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
      // Collections and their respective field names for owner/creator UID
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

      // Sequential deletion to avoid batch limits for heavy users
      for (const col of cascadingCollections) {
        try {
          const q = query(collection(db, col.name), where(col.field, '==', confirmUid));
          const snapshot = await getDocs(q);
          for (const d of snapshot.docs) {
            try {
              // If it's a social post, we also need to delete its interactions
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

      // Finally delete the user profile itself
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

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );
  
  const getPositionColor = (pos: string) => {
    const p = (pos || '').toLowerCase();
    if (p.includes('giám đốc')) return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
    if (p.includes('trưởng khoa') || p.includes('trưởng phòng')) return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (p.includes('phó khoa') || p.includes('phó phòng')) return isDarkMode ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-700 border-teal-200';
    if (p.includes('điều dưỡng trưởng')) return isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200';
    if (p.includes('nhân viên') || !pos) return isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-100';
    
    // Default for other positions
    return isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-100';
  };

  const unapprovedUsers = users.filter(u => !u.isApproved);

  return (
    <div className={cn(
      "p-1 lg:p-8 max-w-full mx-auto pb-24 lg:pb-12 transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      <div className="mb-2 lg:mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
        <div className="space-y-1 lg:space-y-2 hidden lg:block">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[9px] lg:text-xs font-black uppercase tracking-[0.2em] transition-all",
            isDarkMode ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
          )}>
            <Users size={12} className="lg:w-3.5 lg:h-3.5" />
            Hệ thống nhân sự
          </div>
          <p className={cn(
            "max-w-2xl text-xs lg:text-lg font-medium leading-relaxed transition-colors opacity-80",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>Điều phối quyền truy cập, phê duyệt tài khoản và quản lý thông tin chuyên môn.</p>
        </div>
        
        <div className="relative w-full lg:w-[360px] group">
          <div className={cn(
            "absolute inset-0 rounded-2xl blur-xl transition-opacity opacity-0 group-focus-within:opacity-20",
            isDarkMode ? "bg-indigo-500" : "bg-indigo-400"
          )} />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên, email..."
              className={cn(
                "w-full pl-11 pr-4 py-3 lg:py-4 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all shadow-sm outline-none font-medium text-sm",
                isDarkMode 
                  ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-600" 
                  : "bg-white border-slate-100 text-slate-900 placeholder:text-slate-400"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>


      <div className={cn(
        "rounded-[24px] lg:rounded-[32px] border transition-all overflow-hidden",
        isDarkMode 
          ? "bg-slate-900/50 border-slate-800 shadow-none" 
          : "bg-white border-slate-100 shadow-2xl shadow-slate-200/50"
      )}>
        {/* Mobile View: Card List */}
        <div className={cn(
          "lg:hidden divide-y",
          isDarkMode ? "divide-slate-800" : "divide-slate-100"
        )}>
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-xs font-bold text-slate-400">Đang tải dữ liệu...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div key={user.uid} className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden",
                    !user.photoURL && (
                      user.role === 'admin' ? "bg-gradient-to-br from-indigo-500 to-purple-600" : 
                      user.role === 'unapproved' ? "bg-gradient-to-br from-amber-500 to-rose-600" :
                      user.role === 'operator_doctor' ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                      user.role === 'operator_pharmacist' ? "bg-gradient-to-br from-teal-500 to-cyan-600" :
                      "bg-gradient-to-br from-slate-500 to-slate-600"
                    )
                  )}>
                    {user.photoURL ? (
                      <img 
                        src={getBustedPhotoURL(user.photoURL, user.photoSyncToken)} 
                        alt={user.displayName} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      user.displayName?.[0] || 'U'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className={cn("font-black text-sm truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                        {user.displayName}
                      </h4>
                      {user.title && (
                        <span className={cn(
                          "px-1.5 py-0.5 text-[8px] font-black uppercase rounded",
                          isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                        )}>
                          {user.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-medium text-slate-400 truncate">{user.email}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Mail size={8} className={user.hideEmail ? "text-rose-500" : "text-emerald-500"} />
                        <Phone size={8} className={user.hideZalo ? "text-rose-500" : "text-emerald-500"} />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleApproval(user)}
                    disabled={isMasterAdmin(user.email)}
                    className={cn(
                      "px-2 py-1 rounded-lg font-black text-[8px] uppercase tracking-wider border transition-all",
                      user.isApproved 
                        ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600") 
                        : (isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-600")
                    )}
                  >
                    {user.isApproved ? 'Đã duyệt' : 'Đang chờ duyệt'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className={cn(
                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                    isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                  )}>
                    {user.specialty || 'Không'}
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                    isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-700 border-teal-100"
                  )}>
                    {user.department || 'Chưa phân khoa'}
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                    getPositionColor(user.position || '')
                  )}>
                    {user.position || 'Nhân viên'}
                  </div>
                </div>

                <div className={cn(
                  "flex items-center justify-between pt-2 border-t",
                  isDarkMode ? "border-slate-800" : "border-slate-50"
                )}>
                  <select 
                    value={user.role || 'member'}
                    onChange={(e) => changeRole(user, e.target.value as any)}
                    disabled={isMasterAdmin(user.email)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest border transition-all outline-none",
                      user.role === 'admin' ? (isDarkMode ? "bg-indigo-900/40 border-indigo-500/30 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-700") :
                      user.role === 'unapproved' ? (isDarkMode ? "bg-amber-900/40 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700") :
                      (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")
                    )}
                  >
                    {configRoles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleHidden(user)}
                      className={cn(
                        "p-2 rounded-lg border transition-all",
                        user.isHidden
                          ? (isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-amber-50 border-amber-100 text-amber-600")
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-100 text-slate-400")
                      )}
                      title={user.isHidden ? "Hiện người dùng" : "Ẩn người dùng"}
                    >
                      {user.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => startEditing(user)}
                      className={cn(
                        "p-2 rounded-lg border transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-100 text-slate-400"
                      )}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteUser(user.uid, user.displayName || user.email)}
                      disabled={isMasterAdmin(user.email)}
                      className={cn(
                        "p-2 rounded-lg border transition-all disabled:opacity-0",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-100 text-slate-400"
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <UserIcon size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-bold text-slate-300">Không tìm thấy nhân sự</p>
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn(
                "border-b transition-colors",
                isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <th className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Thành viên</th>
                <th className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Chức danh</th>
                <th className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Chuyên môn</th>
                <th className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Khoa/Phòng</th>
                <th className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Chức vụ</th>
                <th className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Vai trò</th>
                <th className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Trạng thái</th>
                <th className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-right",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>Thao tác</th>
              </tr>
            </thead>
            <tbody className={cn(
              "divide-y transition-colors",
              isDarkMode ? "divide-slate-800" : "divide-slate-50"
            )}>
              <AnimatePresence>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                      <p className={cn("font-bold text-sm", isDarkMode ? "text-slate-500" : "text-slate-400")}>Đang đồng bộ dữ liệu...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <motion.tr 
                      key={user.uid}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "transition-all group",
                        isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 transition-all group-hover:scale-105 overflow-hidden",
                            !user.photoURL && (
                            user.role === 'admin' ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20" : 
                            user.role === 'unapproved' ? "bg-gradient-to-br from-amber-500 to-rose-600 shadow-lg shadow-amber-500/20" :
                            user.role === 'operator_doctor' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20" :
                            user.role === 'operator_pharmacist' ? "bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20" :
                            "bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg shadow-slate-500/20"
                            )
                          )}>
                            {user.photoURL ? (
                              <img 
                                src={getBustedPhotoURL(user.photoURL, user.photoSyncToken)} 
                                alt={user.displayName} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              user.displayName?.[0] || 'U'
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={cn(
                                "font-black text-sm transition-colors truncate",
                                isDarkMode ? "text-white" : "text-slate-900"
                              )}>{user.displayName}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className={cn("text-[10px] font-bold opacity-60 truncate", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                {user.email}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0 border-l pl-3 border-slate-200 dark:border-slate-800">
                                <div title={user.hideEmail ? "Email: Riêng tư" : "Email: Công khai"} className={cn(
                                  "p-1 rounded-md transition-colors",
                                  user.hideEmail ? "text-rose-500 bg-rose-500/10" : "text-emerald-500 bg-emerald-500/10"
                                )}>
                                  <Mail size={10} />
                                </div>
                                <div title={user.hideZalo ? "Zalo: Riêng tư" : "Zalo: Công khai"} className={cn(
                                  "p-1 rounded-md transition-colors",
                                  user.hideZalo ? "text-rose-500 bg-rose-500/10" : "text-emerald-500 bg-emerald-500/10"
                                )}>
                                  <Phone size={10} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                          isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-50 text-slate-500 border-slate-100"
                        )}>
                          {user.title || 'Chưa có'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                          isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        )}>
                          {user.specialty || 'Không'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                          isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-700 border-teal-100"
                        )}>
                          {user.department || 'Chưa phân khoa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                          getPositionColor(user.position || '')
                        )}>
                          {user.position || 'Nhân viên'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.role || 'member'}
                          onChange={(e) => changeRole(user, e.target.value as any)}
                          disabled={isMasterAdmin(user.email)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 focus:ring-0 transition-all cursor-pointer outline-none",
                            user.role === 'admin' 
                              ? (isDarkMode ? "bg-indigo-900/40 border-indigo-500/30 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-700") 
                              : user.role === 'unapproved'
                                ? (isDarkMode ? "bg-amber-900/40 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")
                                : (['operator', 'operator_doctor', 'operator_pharmacist'].includes(user.role || ''))
                                  ? (isDarkMode ? "bg-emerald-900/40 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700") 
                                  : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")
                          )}
                        >
                          {configRoles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleApproval(user)}
                          disabled={isMasterAdmin(user.email)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border-2",
                            user.isApproved 
                              ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100") 
                              : (isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20" : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100")
                          )}
                        >
                          {user.isApproved ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {user.isApproved ? 'Đã duyệt' : 'Đang chờ duyệt'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleHidden(user)}
                            className={cn(
                              "p-2 rounded-lg transition-all border-2",
                              user.isHidden
                                ? (isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:border-amber-500/50" : "bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100")
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/50" : "bg-white border-slate-100 text-slate-400 hover:text-amber-600 hover:border-amber-200")
                            )}
                            title={user.isHidden ? "Hiện người dùng" : "Ẩn người dùng"}
                          >
                            {user.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => startEditing(user)}
                            className={cn(
                              "p-2 rounded-lg transition-all border-2",
                              isDarkMode 
                                ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50" 
                                : "bg-white border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200"
                            )}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteUser(user.uid, user.displayName || user.email)}
                            disabled={isMasterAdmin(user.email)}
                            className={cn(
                              "p-2 rounded-lg transition-all border-2 disabled:opacity-0",
                              isDarkMode 
                                ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/50" 
                                : "bg-white border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                            )}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center">
                      <UserIcon size={32} className="mx-auto text-slate-200 mb-2" />
                      <p className={cn("font-black text-sm", isDarkMode ? "text-slate-600" : "text-slate-300")}>Không tìm thấy nhân sự</p>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

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
