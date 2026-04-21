import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Trash2, Save, X, Loader2, Briefcase, GraduationCap, Award, ShieldCheck, Lock, CheckCircle2, LayoutGrid, ChevronRight, Info, Globe, Moon, Sun, Cpu, Database, Users, Activity, Eye, EyeOff, Wrench, FileText, Calendar, MessageSquare, Pill, ClipboardList, ShieldAlert, AlertTriangle, History, Search } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, handleFirestoreError, OperationType, query, where, getDocs } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SystemSettings, UserProfile } from '../types';
import ThemeSettings from './ThemeSettings';
import ConfirmModal from './ConfirmModal';

interface ConfigItem {
  id: string;
  name: string;
  order?: number;
}

interface RolePermission {
  roleId: string;
  allowedTabs: string[];
}

interface TitlePermission {
  titleId: string;
  allowedTabs: string[];
}

interface SystemConfigProps {
  isDarkMode?: boolean;
  systemSettings: SystemSettings;
  activeCategory: string;
  setActiveCategory: (cat: any) => void;
}

const ROLE_TABS = [
  { id: 'manage_users', label: 'Quản lý người dùng' },
  { id: 'manage_directory', label: 'Quản lý thuốc' },
  { id: 'manage_icd10', label: 'Quản lý ICD-10' },
  { id: 'manage_interaction', label: 'Quản lý tương tác thuốc' },
  { id: 'manage_adr', label: 'Quản lý ADR' },
  { id: 'manage_config', label: 'Cấu hình hệ thống' },
];

const TITLE_TABS = [
  { id: 'dashboard', label: 'Tổng quan' },
  { id: 'view_directory', label: 'Tra cứu thuốc' },
  { id: 'view_icd10', label: 'Tra cứu ICD-10' },
  { id: 'view_interaction', label: 'Tra cứu tương tác thuốc' },
  { id: 'view_adr', label: 'Tra cứu ADR' },
  { id: 'view_prescription', label: 'Kê toa thử' },
  { id: 'view_history', label: 'Lịch sử kê toa' },
];

const ALL_FEATURES = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutGrid, desc: 'Màn hình chính và thống kê' },
  { id: 'view_calendar', label: 'Lịch công tác', icon: Calendar, desc: 'Quản lý lịch trực và hội chẩn' },
  { id: 'view_notes', label: 'Ghi chú', icon: MessageSquare, desc: 'Ghi chú lâm sàng cá nhân' },
  { id: 'view_directory', label: 'Tra cứu thuốc', icon: Pill, desc: 'Tra cứu & Quản lý danh mục thuốc' },
  { id: 'view_icd10', label: 'Tra cứu ICD-10', icon: ClipboardList, desc: 'Mã bệnh quốc tế' },
  { id: 'view_interaction', label: 'Tương tác thuốc', icon: ShieldAlert, desc: 'Kiểm tra tương tác thuốc' },
  { id: 'view_adr', label: 'Tra cứu ADR', icon: AlertTriangle, desc: 'Phản ứng có hại của thuốc' },
  { id: 'view_patients', label: 'Tra cứu bệnh nhân', icon: Users, desc: 'Hồ sơ bệnh nhân' },
  { id: 'view_prescription', label: 'Kê toa thử', icon: FileText, desc: 'Tạo đơn thuốc mẫu' },
  { id: 'view_history', label: 'Lịch sử kê toa', icon: History, desc: 'Xem lại các đơn đã kê' },
  { id: 'manage_users', label: 'Quản lý người dùng', icon: Users, desc: 'Quản lý tài khoản và phê duyệt' },
  { id: 'manage_icd10', label: 'Quản lý ICD-10', icon: ClipboardList, desc: 'Chỉnh sửa danh mục bệnh' },
  { id: 'manage_interaction', label: 'Quản lý tương tác', icon: ShieldAlert, desc: 'Thiết lập quy tắc tương tác' },
  { id: 'manage_adr', label: 'Quản lý ADR', icon: AlertTriangle, desc: 'Báo cáo và thống kê ADR' },
];

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

const SAMPLE_TERMS = `# PHẦN A: QUY ĐỊNH CHUNG

## Điều 1: Phạm vi điều chỉnh
> Ứng dụng này được thiết kế dành riêng cho nhân viên y tế tại KCB Bình Phú để hỗ trợ công tác chuyên môn.

1.1. Ứng dụng cung cấp các công cụ hỗ trợ tra cứu thuốc, kiểm tra tương tác và quản lý hồ sơ bệnh nhân nội bộ.
1.2. Mọi thông tin trên ứng dụng chỉ mang tính chất tham khảo chuyên môn, không thay thế hoàn toàn quyết định lâm sàng của Bác sĩ.

## Điều 2: Đối tượng sử dụng
* Bác sĩ, Dược sĩ, Điều dưỡng đã được cấp tài khoản chính thức.
* <mark>Nhân viên thực tập hoặc khách truy cập có quyền hạn giới hạn.</mark>

---

# PHẦN B: QUYỀN VÀ TRÁCH NHIỆM

## Điều 3: Trách nhiệm người dùng
1. **Bảo mật:** Không chia sẻ mật khẩu hoặc quyền truy cập cho người không có nhiệm vụ.
2. **Dữ liệu:** Tuyệt đối không sao chép hoặc phát tán thông tin bệnh nhân dưới mọi hình thức trái quy định.

## Điều 4: Quyền lợi
* Được sử dụng toàn bộ các tính năng hỗ trợ quyết định lâm sàng (CDSS) được cấu hình cho chức danh.
* Dữ liệu thuốc và phác đồ được cập nhật liên tục từ các nguồn tin cậy.`;

const SystemConfig: React.FC<SystemConfigProps> = ({ isDarkMode, systemSettings, activeCategory, setActiveCategory }) => {
  const [titles, setTitles] = useState<ConfigItem[]>([]);
  const [positions, setPositions] = useState<ConfigItem[]>([]);
  const [specialties, setSpecialties] = useState<ConfigItem[]>([]);
  const [roles, setRoles] = useState<ConfigItem[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [titlePermissions, setTitlePermissions] = useState<TitlePermission[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newItemName, setNewItemName] = useState('');
  const [permissionType, setPermissionType] = useState<'role' | 'title'>('role');

  const [editSettings, setEditSettings] = useState<SystemSettings>(systemSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTermsConfirmOpen, setIsTermsConfirmOpen] = useState(false);
  const [stats, setStats] = useState({
    doctors: 0,
    pharmacists: 0,
    nurses: 0,
    online: 0,
    dbSize: '0 KB'
  });
  const [featureStates, setFeatureStates] = useState<Record<string, 'open' | 'closed' | 'maintenance'>>({});
  const [featureSettings, setFeatureSettings] = useState<Record<string, any>>({});
  const [isSavingFeature, setIsSavingFeature] = useState(false);
  const [homeSubTab, setHomeSubTab] = useState<'overview' | 'features' | 'registration' | 'notifications' | 'permissions'>('overview');
  const [regSettings, setRegSettings] = useState<any>({
    allowNewRegistration: true,
    autoApprove: false,
    defaultRoleId: 'member',
    defaultTitleId: ''
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [isSavingReg, setIsSavingReg] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersRef = collection(db, 'users');
        const qDoctors = query(usersRef, where('title', '==', 'Bác sĩ'));
        const qPharmacists = query(usersRef, where('title', '==', 'Dược sĩ'));
        const qNurses = query(usersRef, where('title', '==', 'Điều dưỡng'));
        
        const [sDoc, sPhar, sNur] = await Promise.all([
          getDocs(qDoctors),
          getDocs(qPharmacists),
          getDocs(qNurses)
        ]);

        setStats(prev => ({
          ...prev,
          doctors: sDoc.size,
          pharmacists: sPhar.size,
          nurses: sNur.size,
          online: Math.floor(Math.random() * 5) + 1 // Mock online count
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    };

    fetchStats();
    
    const unsubFeatures = onSnapshot(doc(db, 'system_config', 'features'), (doc) => {
      if (doc.exists()) {
        setFeatureStates(doc.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_config/features');
    });

    const unsubReg = onSnapshot(doc(db, 'system_config', 'registration'), (doc) => {
      if (doc.exists()) {
        setRegSettings(doc.data());
      }
    });

    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.createdAt - a.createdAt));
    });

    return () => {
      unsubFeatures();
      unsubReg();
      unsubAnnouncements();
    };
  }, []);

  const updateFeatureState = async (featureId: string, state: 'open' | 'closed' | 'maintenance') => {
    const newStates = { ...featureStates, [featureId]: state };
    try {
      await setDoc(doc(db, 'system_config', 'features'), newStates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system_config/features');
    }
  };

  const updateRegSettings = async (settings: any) => {
    setIsSavingReg(true);
    try {
      await setDoc(doc(db, 'system_config', 'registration'), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system_config/registration');
    } finally {
      setIsSavingReg(false);
    }
  };

  const addAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    setIsSavingAnnouncement(true);
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, 'announcements', id), {
        content: newAnnouncement,
        createdAt: new Date().toISOString(),
        targetRoles: targetRoles.length > 0 ? targetRoles : null,
        targetTitles: targetTitles.length > 0 ? targetTitles : null
      });
      setNewAnnouncement('');
      setTargetRoles([]);
      setTargetTitles([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
    }
  };

  useEffect(() => {
    // Only update if settings are actually different to avoid unnecessary re-renders
    if (JSON.stringify(editSettings) !== JSON.stringify(systemSettings)) {
      setEditSettings(systemSettings);
    }
  }, [systemSettings]);

  useEffect(() => {
    const unsubTitles = onSnapshot(collection(db, 'config_titles'), (snapshot) => {
      setTitles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConfigItem)).sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    const unsubPositions = onSnapshot(collection(db, 'config_positions'), (snapshot) => {
      setPositions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConfigItem)).sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    const unsubSpecialties = onSnapshot(collection(db, 'config_specialties'), (snapshot) => {
      setSpecialties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConfigItem)).sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    const unsubRoles = onSnapshot(collection(db, 'config_roles'), (snapshot) => {
      setRoles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConfigItem)).sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    const unsubPerms = onSnapshot(collection(db, 'role_permissions'), (snapshot) => {
      setRolePermissions(snapshot.docs.map(doc => doc.data() as RolePermission));
    });
    const unsubTitlePerms = onSnapshot(collection(db, 'title_permissions'), (snapshot) => {
      setTitlePermissions(snapshot.docs.map(doc => doc.data() as TitlePermission));
    });

    setLoading(false);
    return () => {
      unsubTitles();
      unsubPositions();
      unsubSpecialties();
      unsubRoles();
      unsubPerms();
      unsubTitlePerms();
    };
  }, []);

  const togglePermission = async (id: string, tabId: string) => {
    const isRole = permissionType === 'role';
    const currentPerm = isRole 
      ? rolePermissions.find(p => p.roleId === id)
      : titlePermissions.find(p => p.titleId === id);
    
    let newTabs: string[];
    if (currentPerm) {
      if (currentPerm.allowedTabs.includes(tabId)) {
        newTabs = currentPerm.allowedTabs.filter(t => t !== tabId);
      } else {
        newTabs = [...currentPerm.allowedTabs, tabId];
      }
    } else {
      newTabs = [tabId];
    }

    const collectionName = isRole ? 'role_permissions' : 'title_permissions';
    const docData = isRole ? { roleId: id, allowedTabs: newTabs } : { titleId: id, allowedTabs: newTabs };

    try {
      await setDoc(doc(db, collectionName, id), docData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  };

  const addItem = async () => {
    if (!newItemName.trim()) return;
    const collectionName = `config_${activeCategory}`;
    const id = Date.now().toString();
    const currentList = activeCategory === 'titles' ? titles : 
                      activeCategory === 'positions' ? positions : 
                      activeCategory === 'specialties' ? specialties : roles;
    
    try {
      await setDoc(doc(db, collectionName, id), {
        name: newItemName.trim(),
        order: currentList.length
      });
      
      // If adding a role, also create default permissions for it
      if (activeCategory === 'roles') {
        await setDoc(doc(db, 'role_permissions', id), {
          roleId: id,
          allowedTabs: ['dashboard']
        });
      }
      
      setNewItemName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  };

  const deleteItem = async (id: string) => {
    const collectionName = `config_${activeCategory}`;
    try {
      await deleteDoc(doc(db, collectionName, id));
      if (activeCategory === 'roles') {
        await deleteDoc(doc(db, 'role_permissions', id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'system_settings', 'main'), editSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system_settings/main');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const renderPermissionsTable = () => (
    <div className="space-y-8">
      <div className={cn(
        "flex items-center gap-2 p-1.5 rounded-2xl w-fit",
        isDarkMode ? "bg-slate-800" : "bg-slate-100"
      )}>
        <button
          onClick={() => setPermissionType('role')}
          className={cn(
            "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
            permissionType === 'role'
              ? (isDarkMode ? "bg-slate-700 text-white shadow-none" : "bg-white text-blue-600 shadow-lg shadow-slate-200")
              : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
          )}
        >
          Quyền quản lý
        </button>
        <button
          onClick={() => setPermissionType('title')}
          className={cn(
            "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
            permissionType === 'title'
              ? (isDarkMode ? "bg-slate-700 text-white shadow-none" : "bg-white text-blue-600 shadow-lg shadow-slate-200")
              : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
          )}
        >
          Quyền làm việc
        </button>
      </div>

      <div className={cn(
        "overflow-x-auto rounded-3xl border transition-all",
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/20"
      )}>
        <table className="w-full border-collapse">
          <thead>
            <tr className={isDarkMode ? "bg-slate-800/50" : "bg-slate-50/50"}>
              <th className={cn("p-6 text-left text-[10px] font-black uppercase tracking-[0.2em] border-b", isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-200")}>
                Tính năng / {permissionType === 'role' ? 'Vai trò' : 'Chức danh'}
              </th>
              {permissionType === 'role' ? (
                ['admin', 'operator_doctor', 'operator_pharmacist', 'member'].map(roleId => {
                  const role = roles.find(r => r.id === roleId);
                  return (
                    <th key={roleId} className={cn("p-6 text-center text-[10px] font-black uppercase tracking-[0.2em] border-b", isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-200")}>
                      {role?.name || roleId}
                    </th>
                  );
                })
              ) : (
                titles.map(item => (
                  <th key={item.id} className={cn("p-6 text-center text-[10px] font-black uppercase tracking-[0.2em] border-b", isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-200")}>
                    {item.name}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className={cn(
            "divide-y",
            isDarkMode ? "divide-slate-800" : "divide-slate-100"
          )}>
            {(permissionType === 'role' ? ROLE_TABS : TITLE_TABS).map(tab => (
              <tr key={tab.id} className={cn("transition-colors", isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50/50")}>
                <td className={cn("p-6 font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                  {tab.label}
                </td>
                {permissionType === 'role' ? (
                  ['admin', 'operator_doctor', 'operator_pharmacist', 'member'].map(roleId => {
                    const perm = rolePermissions.find(p => p.roleId === roleId);
                    const isAllowed = perm?.allowedTabs.includes(tab.id);
                    return (
                      <td key={`${roleId}-${tab.id}`} className="p-6 text-center">
                        <button
                          onClick={() => togglePermission(roleId, tab.id)}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all mx-auto border-2",
                            isAllowed 
                              ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm")
                              : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-700 hover:border-slate-700" : "bg-white border-slate-100 text-slate-200 hover:border-slate-200")
                          )}
                        >
                          {isAllowed ? <CheckCircle2 size={20} /> : <X size={20} />}
                        </button>
                      </td>
                    );
                  })
                ) : (
                  titles.map(item => {
                    const perm = titlePermissions.find(p => p.titleId === item.name);
                    const isAllowed = perm?.allowedTabs.includes(tab.id);
                    return (
                      <td key={`${item.id}-${tab.id}`} className="p-6 text-center">
                        <button
                          onClick={() => togglePermission(item.name, tab.id)}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all mx-auto border-2",
                            isAllowed 
                              ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm")
                              : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-700 hover:border-slate-700" : "bg-white border-slate-100 text-slate-200 hover:border-slate-200")
                          )}
                        >
                          {isAllowed ? <CheckCircle2 size={20} /> : <X size={20} />}
                        </button>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const categories = [
    { id: 'home', label: 'Trang chủ Admin', icon: LayoutGrid, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'overview', label: 'Tổng quan', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'general', label: 'Cài đặt chung', icon: Globe, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { id: 'titles', label: 'Chức danh', icon: Award, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'positions', label: 'Chức vụ', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'specialties', label: 'Chuyên môn', icon: GraduationCap, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'features', label: 'Quản lý tính năng', icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'theme', label: 'Quản lý Giao diện', icon: Sun, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { id: 'roles', label: 'Vai trò', icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'permissions', label: 'Phân quyền', icon: Lock, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  const [selectedFeatureForDetail, setSelectedFeatureForDetail] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    if (activeCategory === 'features' || (activeCategory === 'home' && homeSubTab === 'features')) {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      });
      return () => unsub();
    }
  }, [activeCategory, homeSubTab]);

  useEffect(() => {
    if (activeCategory === 'features' || (activeCategory === 'home' && homeSubTab === 'features')) {
      const unsub = onSnapshot(doc(db, 'system_config', 'feature_settings'), (doc) => {
        if (doc.exists()) {
          setFeatureSettings(doc.data());
        }
      });
      return () => unsub();
    }
  }, [activeCategory, homeSubTab]);

  const updateFeatureSettings = async (featureId: string, settings: any) => {
    setIsSavingFeature(true);
    try {
      await setDoc(doc(db, 'system_config', 'feature_settings'), {
        ...featureSettings,
        [featureId]: settings
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system_config/feature_settings');
    } finally {
      setIsSavingFeature(false);
    }
  };

  const currentItems = activeCategory === 'titles' ? titles : 
                      activeCategory === 'positions' ? positions : 
                      activeCategory === 'specialties' ? specialties : roles;

  const currentCategory = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2 rounded-xl shadow-lg bg-opacity-100",
              isDarkMode ? "text-white" : "text-slate-900",
              currentCategory.bg.replace('/10', '')
            )}>
              <currentCategory.icon size={24} />
            </div>
            <h2 className={cn(
              "text-2xl lg:text-3xl font-black tracking-tight transition-colors",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>{currentCategory.label}</h2>
          </div>
          <p className={cn(
            "font-medium max-w-md transition-colors text-sm",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>Quản lý danh mục nhân sự và phân quyền hệ thống (Quyền quản lý & Quyền làm việc).</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Content Area */}
        <div className="space-y-6">
          {activeCategory === 'home' ? (
            <div className="space-y-6">
              <div className={cn(
                "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl w-fit",
                isDarkMode ? "bg-slate-800" : "bg-slate-100"
              )}>
                {[
                  { id: 'overview', label: 'Cài đặt chung' },
                  { id: 'features', label: 'Tiện ích' },
                  { id: 'registration', label: 'Đăng ký' },
                  { id: 'notifications', label: 'Thông báo' },
                  { id: 'permissions', label: 'Phân quyền' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setHomeSubTab(tab.id as any)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                      homeSubTab === tab.id
                        ? (isDarkMode ? "bg-slate-700 text-white shadow-none" : "bg-white text-blue-600 shadow-lg shadow-slate-200")
                        : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {homeSubTab === 'overview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={cn(
                  "p-6 rounded-[32px] border-2 transition-all",
                  isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                )}>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Thông tin hệ thống</h3>
                  <div className="space-y-4">
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-2xl",
                      isDarkMode ? "bg-slate-800" : "bg-slate-50"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 text-white rounded-lg">
                          <Info size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">Phiên bản</span>
                      </div>
                      <input 
                        type="text" 
                        value={editSettings.appName}
                        onChange={(e) => setEditSettings({...editSettings, appName: e.target.value})}
                        className="bg-transparent text-right font-black text-xs outline-none focus:text-primary"
                      />
                    </div>
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-2xl",
                      isDarkMode ? "bg-slate-800" : "bg-slate-50"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 text-white rounded-lg">
                          <Cpu size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">Nền tảng AI</span>
                      </div>
                      <span className="font-black text-xs">Gemini 1.5 Pro</span>
                    </div>
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-2xl",
                      isDarkMode ? "bg-slate-800" : "bg-slate-50"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 text-white rounded-lg">
                          <Database size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">Cơ sở dữ liệu</span>
                      </div>
                      <span className="font-black text-xs">Google Firestore</span>
                    </div>
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-2xl",
                      isDarkMode ? "bg-slate-800" : "bg-slate-50"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500 text-white rounded-lg">
                          <Activity size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">Kích thước dữ liệu</span>
                      </div>
                      <span className="font-black text-xs">{stats.dbSize}</span>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-6 rounded-[32px] border-2 transition-all",
                  isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                )}>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Thống kê người dùng</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn(
                      "p-4 rounded-2xl border",
                      isDarkMode ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-100"
                    )}>
                      <p className="text-[10px] font-black uppercase text-blue-500 mb-1">Bác sĩ</p>
                      <p className="text-2xl font-black">{stats.doctors}</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border",
                      isDarkMode ? "bg-emerald-900/20 border-emerald-800" : "bg-emerald-50 border-emerald-100"
                    )}>
                      <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">Dược sĩ</p>
                      <p className="text-2xl font-black">{stats.pharmacists}</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border",
                      isDarkMode ? "bg-rose-900/20 border-rose-800" : "bg-rose-50 border-rose-100"
                    )}>
                      <p className="text-[10px] font-black uppercase text-rose-500 mb-1">Điều dưỡng</p>
                      <p className="text-2xl font-black">{stats.nurses}</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border",
                      isDarkMode ? "bg-amber-900/20 border-amber-800" : "bg-amber-50 border-amber-100"
                    )}>
                      <p className="text-[10px] font-black uppercase text-amber-500 mb-1">Đang Online</p>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-2xl font-black">{stats.online}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ) : homeSubTab === 'registration' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={cn(
                    "p-8 rounded-[32px] border-2 transition-all",
                    isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                  )}>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                       <Users size={18} /> Thiết lập đăng ký
                    </h3>
                    
                    <div className="space-y-6">
                      <div className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-colors",
                        isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
                      )}>
                        <div>
                          <p className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Cho phép đăng ký mới</p>
                          <p className="text-[10px] text-slate-500 font-medium tracking-tight">Người dùng có thể tự tạo tài khoản mới</p>
                        </div>
                        <button 
                          onClick={() => updateRegSettings({...regSettings, allowNewRegistration: !regSettings.allowNewRegistration})}
                          className={cn(
                            "w-12 h-6 rounded-full p-1 transition-all relative",
                            regSettings.allowNewRegistration ? "bg-indigo-600" : "bg-slate-400"
                          )}
                        >
                          <div className={cn("w-4 h-4 rounded-full bg-white transition-all transform", regSettings.allowNewRegistration ? "translate-x-6" : "translate-x-0")} />
                        </button>
                      </div>

                      <div className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-colors",
                        isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
                      )}>
                        <div>
                          <p className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Tự động phê duyệt</p>
                          <p className="text-[10px] text-slate-500 font-medium tracking-tight">Tự động duyệt khi email đã được xác thực</p>
                        </div>
                        <button 
                          onClick={() => updateRegSettings({...regSettings, autoApprove: !regSettings.autoApprove})}
                          className={cn(
                            "w-12 h-6 rounded-full p-1 transition-all relative",
                            regSettings.autoApprove ? "bg-emerald-600" : "bg-slate-400"
                          )}
                        >
                          <div className={cn("w-4 h-4 rounded-full bg-white transition-all transform", regSettings.autoApprove ? "translate-x-6" : "translate-x-0")} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Vai trò mặc định</label>
                        <select 
                          value={regSettings.defaultRoleId}
                          onChange={(e) => updateRegSettings({...regSettings, defaultRoleId: e.target.value})}
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border-2 outline-none font-bold text-sm transition-all",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-100 text-slate-900 focus:border-indigo-500 shadow-sm"
                          )}
                        >
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Chức danh mặc định</label>
                        <select 
                          value={regSettings.defaultTitleId}
                          onChange={(e) => updateRegSettings({...regSettings, defaultTitleId: e.target.value})}
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border-2 outline-none font-bold text-sm transition-all",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-100 text-slate-900 focus:border-indigo-500 shadow-sm"
                          )}
                        >
                          <option value="">Không chọn</option>
                          {titles.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "p-8 rounded-[32px] border-2 transition-all flex flex-col items-center justify-center text-center",
                    isDarkMode ? "bg-indigo-900/10 border-indigo-900/30" : "bg-indigo-50 border-indigo-100 shadow-sm"
                  )}>
                    <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center mb-6">
                      <GraduationCap size={40} className="text-indigo-600" />
                    </div>
                    <h4 className={cn("text-xl font-black mb-2", isDarkMode ? "text-indigo-300" : "text-indigo-900")}>Chính sách nhân sự</h4>
                    <p className={cn("text-sm font-medium leading-relaxed max-w-xs mx-auto", isDarkMode ? "text-indigo-400/80" : "text-indigo-700/80")}>
                      Các thiết lập này áp dụng cho toàn bộ nhân viên khi tham gia hệ thống và ảnh hưởng trực tiếp đến quy trình phê duyệt tài khoản.
                    </p>
                  </div>
                </div>
              ) : homeSubTab === 'notifications' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className={cn(
                    "lg:col-span-1 p-8 rounded-[32px] border-2 transition-all h-fit",
                    isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                  )}>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <MessageSquare size={18} /> Tạo thông báo mới
                    </h3>
                    <div className="space-y-4">
                      <textarea 
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                        placeholder="Nhập nội dung thông báo cho toàn bộ nhân viên..."
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl border-2 min-h-[150px] outline-none font-medium text-sm resize-none transition-all",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-indigo-500 shadow-inner"
                        )}
                      />

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                           <ShieldCheck size={12} /> Đối tượng theo vai trò
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['admin', 'operator_doctor', 'operator_pharmacist', 'member'].map(roleId => {
                            const role = roles.find(r => r.id === roleId);
                            const isSelected = targetRoles.includes(roleId);
                            return (
                              <button
                                key={roleId}
                                onClick={() => setTargetRoles(prev => isSelected ? prev.filter(r => r !== roleId) : [...prev, roleId])}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                                  isSelected 
                                    ? "bg-indigo-500 text-white border-indigo-500" 
                                    : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                                )}
                              >
                                {role?.name || roleId}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                           <Award size={12} /> Đối tượng theo chức danh
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {titles.map(title => {
                            const isSelected = targetTitles.includes(title.name);
                            return (
                              <button
                                key={title.id}
                                onClick={() => setTargetTitles(prev => isSelected ? prev.filter(t => t !== title.name) : [...prev, title.name])}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                                  isSelected 
                                    ? "bg-indigo-500 text-white border-indigo-500" 
                                    : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                                )}
                              >
                                {title.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button 
                        onClick={addAnnouncement}
                        disabled={isSavingAnnouncement || !newAnnouncement.trim()}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                      >
                        {isSavingAnnouncement ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Gửi thông báo
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    "lg:col-span-2 p-8 rounded-[32px] border-2 transition-all",
                    isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                  )}>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Lịch sử thông báo</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {announcements.length > 0 ? (
                        announcements.map((ann) => (
                          <div key={ann.id} className={cn(
                            "p-5 rounded-2xl border-2 group transition-all",
                            isDarkMode ? "bg-slate-800 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-50 hover:border-indigo-100"
                          )}>
                            <div className="flex justify-between items-start gap-4">
                              <p className={cn("text-xs font-semibold leading-relaxed flex-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                {ann.content}
                              </p>
                              <button 
                                onClick={() => deleteAnnouncement(ann.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {ann.targetRoles && ann.targetRoles.map((r: string) => (
                                <span key={r} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-widest">{roles.find(role => role.id === r)?.name || r}</span>
                              ))}
                              {ann.targetTitles && ann.targetTitles.map((t: string) => (
                                <span key={t} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest">{t}</span>
                              ))}
                              {!ann.targetRoles && !ann.targetTitles && (
                                <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[8px] font-black uppercase tracking-widest">Tất cả mọi người</span>
                              )}
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
                              <Calendar size={10} />
                              {new Date(ann.createdAt).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-20 text-center">
                          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                            <Info size={24} className="text-slate-400" />
                          </div>
                          <p className="text-slate-500 font-bold">Chưa có thông báo nào được gửi.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : homeSubTab === 'permissions' ? (
                renderPermissionsTable()
              ) : (
                <div className={cn(
                  "p-4 sm:p-8 rounded-[32px] border transition-all",
                  isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                )}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                    {[...ALL_FEATURES].sort((a, b) => {
                      const orderA = featureSettings[a.id]?.order ?? 999;
                      const orderB = featureSettings[b.id]?.order ?? 999;
                      return orderA - orderB;
                    }).map((feature) => {
                      const state = featureStates[feature.id] || 'open';
                      const settings = featureSettings[feature.id] || {};
                      return (
                        <div 
                          key={feature.id}
                          onClick={() => setSelectedFeatureForDetail(feature.id)}
                          className={cn(
                            "p-3 sm:p-6 rounded-3xl border-2 transition-all relative group cursor-pointer",
                            isDarkMode ? "bg-slate-800/30 border-slate-800 hover:border-primary" : "bg-white border-slate-50 hover:border-primary"
                          )}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-6">
                            <div className={cn(
                              "p-2.5 sm:p-4 rounded-2xl shrink-0",
                              isDarkMode ? "bg-slate-800 text-primary" : "bg-primary-light/30 text-primary"
                            )}>
                              <feature.icon size={20} className="sm:hidden" />
                              <feature.icon size={24} className="hidden sm:block" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={cn("font-black text-[12px] sm:text-sm truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                                {settings.customTitle || feature.label}
                              </h4>
                              <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 truncate">{feature.desc}</p>
                            </div>
                          </div>

                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex gap-1 sm:gap-2 p-1 rounded-xl bg-slate-900/50">
                              <button
                                onClick={() => updateFeatureState(feature.id, 'open')}
                                className={cn(
                                  "flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all",
                                  state === 'open' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-emerald-400"
                                )}
                              >
                                Mở
                              </button>
                              <button
                                onClick={() => updateFeatureState(feature.id, 'maintenance')}
                                className={cn(
                                  "flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all",
                                  state === 'maintenance' ? "bg-amber-500 text-white" : "text-slate-500 hover:text-amber-400"
                                )}
                              >
                                Bảo trì
                              </button>
                              <button
                                onClick={() => updateFeatureState(feature.id, 'closed')}
                                className={cn(
                                  "flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all",
                                  state === 'closed' ? "bg-rose-500 text-white" : "text-slate-500 hover:text-rose-400"
                                )}
                              >
                                Đóng
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Tiêu đề tùy chỉnh</label>
                              <input
                                type="text"
                                placeholder={feature.label}
                                value={settings.customTitle || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const newSettings = { ...settings, customTitle: e.target.value };
                                  updateFeatureSettings(feature.id, newSettings);
                                }}
                                className={cn(
                                  "w-full px-3 py-2 sm:px-4 sm:py-3 border-2 rounded-xl focus:ring-0 transition-all font-bold outline-none text-[10px] sm:text-xs",
                                  isDarkMode ? "bg-slate-900 border-slate-800 text-white focus:border-primary" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-primary"
                                )}
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1">
                              <Settings size={12} /> Cài đặt chi tiết
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            ) : activeCategory === 'overview' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.filter(c => c.id !== 'overview' && c.id !== 'home' && c.id !== 'features').map((cat) => {
                const items = cat.id === 'titles' ? titles : 
                             cat.id === 'positions' ? positions : 
                             cat.id === 'specialties' ? specialties : 
                             cat.id === 'roles' ? roles : [];
                
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={cn(
                      "p-6 rounded-[32px] border-2 transition-all cursor-pointer group",
                      isDarkMode ? "bg-slate-900/50 border-slate-800 hover:border-blue-500/50" : "bg-white border-slate-100 hover:border-blue-200 shadow-xl shadow-slate-200/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className={cn("p-4 rounded-2xl", cat.bg)}>
                        <cat.icon size={24} className={cat.color} />
                      </div>
                      <div className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                        isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"
                      )}>
                        {cat.id === 'permissions' ? 'Matrix' : cat.id === 'general' ? 'Global' : `${items.length} mục`}
                      </div>
                    </div>
                    
                    <h3 className={cn("text-xl font-black tracking-tight mb-2", isDarkMode ? "text-white" : "text-slate-900")}>
                      {cat.label}
                    </h3>
                    
                    {cat.id !== 'permissions' && cat.id !== 'general' ? (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {items.slice(0, 3).map(item => (
                          <span key={item.id} className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold",
                            isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"
                          )}>
                            {item.name}
                          </span>
                        ))}
                        {items.length > 3 && (
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold",
                            isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"
                          )}>
                            +{items.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className={cn("text-sm font-medium mb-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        {cat.id === 'permissions' 
                          ? "Quản lý ma trận phân quyền theo vai trò và chức danh."
                          : "Cấu hình tên ứng dụng, tiêu đề và mô tả hệ thống."}
                      </p>
                    )}

                    <div className={cn(
                      "flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all",
                      isDarkMode ? "text-slate-500 group-hover:text-blue-400" : "text-slate-400 group-hover:text-blue-600"
                    )}>
                      Quản lý chi tiết
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : activeCategory === 'general' ? (
            <div className={cn(
              "p-8 rounded-[32px] border transition-all space-y-8",
              isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
            )}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Tên ứng dụng</label>
                  <input
                    type="text"
                    className={cn(
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-[14px]",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                    )}
                    value={editSettings.appName}
                    onChange={(e) => setEditSettings({ ...editSettings, appName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Tiêu đề phụ (Login)</label>
                  <input
                    type="text"
                    className={cn(
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-[14px]",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                    )}
                    value={editSettings.loginSubtitle}
                    onChange={(e) => setEditSettings({ ...editSettings, loginSubtitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Tiêu đề chính (Login)</label>
                  <input
                    type="text"
                    className={cn(
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-[14px]",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                    )}
                    value={editSettings.loginTitle}
                    onChange={(e) => setEditSettings({ ...editSettings, loginTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mô tả ứng dụng</label>
                  <AutoExpandingTextarea
                    rows={4}
                    className={cn(
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none resize-none text-[14px]",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                    )}
                    value={editSettings.appDescription}
                    onChange={(e) => setEditSettings({ ...editSettings, appDescription: (e.target as HTMLTextAreaElement).value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className={cn("text-xs font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>Điều khoản sử dụng</label>
                    <button 
                      type="button"
                      onClick={() => setIsTermsConfirmOpen(true)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-500 hover:underline transition-all"
                    >
                      Sử dụng mẫu chuẩn
                    </button>
                  </div>
                  <ConfirmModal 
                    isOpen={isTermsConfirmOpen}
                    onClose={() => setIsTermsConfirmOpen(false)}
                    onConfirm={() => {
                      setEditSettings({ ...editSettings, termsOfUse: SAMPLE_TERMS });
                    }}
                    title="Xác nhận chèn mẫu"
                    message="Bạn có muốn chèn mẫu Điều khoản sử dụng chuẩn? Nội dung hiện tại sẽ bị ghi đè."
                    confirmText="Đồng ý chèn"
                    cancelText="Hủy bỏ"
                    type="warning"
                    isDarkMode={isDarkMode}
                  />
                  <AutoExpandingTextarea
                    rows={8}
                    className={cn(
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none resize-none min-h-[200px] text-[14px]",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-700" : "bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-300"
                    )}
                    placeholder="Nhập nội dung điều khoản sử dụng ứng dụng..."
                    value={editSettings.termsOfUse || ''}
                    onChange={(e) => setEditSettings({ ...editSettings, termsOfUse: (e.target as HTMLTextAreaElement).value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Giao diện mặc định (Dành cho người dùng mới)</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setEditSettings({ ...editSettings, defaultTheme: 'light' })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all font-bold",
                        editSettings.defaultTheme === 'light'
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200")
                      )}
                    >
                      <Sun size={20} />
                      Giao diện Sáng
                    </button>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, defaultTheme: 'dark' })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all font-bold",
                        editSettings.defaultTheme === 'dark'
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200")
                      )}
                    >
                      <Moon size={20} />
                      Giao diện Tối
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4">
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 text-emerald-500 font-bold text-sm"
                    >
                      <CheckCircle2 size={16} />
                      Đã lưu thành công!
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className={cn(
                    "px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50",
                    saveSuccess 
                      ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" 
                      : "bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700"
                  )}
                >
                  {isSavingSettings ? <Loader2 size={20} className="animate-spin" /> : (saveSuccess ? <CheckCircle2 size={20} /> : <Save size={20} />)}
                  {saveSuccess ? 'Đã lưu' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          ) : activeCategory === 'theme' ? (
            <ThemeSettings 
              isDarkMode={isDarkMode} 
              editSettings={editSettings} 
              setEditSettings={setEditSettings} 
              onSave={handleSaveSettings}
              isSaving={isSavingSettings}
              saveSuccess={saveSuccess}
            />
          ) : activeCategory === 'features' ? (
            <div className={cn(
              "p-4 sm:p-8 rounded-[32px] border transition-all",
              isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
            )}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                {[...ALL_FEATURES].sort((a, b) => {
                  const orderA = featureSettings[a.id]?.order ?? 999;
                  const orderB = featureSettings[b.id]?.order ?? 999;
                  return orderA - orderB;
                }).map((feature) => {
                  const state = featureStates[feature.id] || 'open';
                  const settings = featureSettings[feature.id] || {};
                  
                  return (
                    <div 
                      key={feature.id}
                      onClick={() => setSelectedFeatureForDetail(feature.id)}
                      className={cn(
                        "p-3 sm:p-6 rounded-3xl border-2 transition-all relative group cursor-pointer",
                        isDarkMode ? "bg-slate-800/30 border-slate-800 hover:border-primary" : "bg-white border-slate-50 hover:border-primary"
                      )}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-6">
                        <div className={cn(
                          "p-2.5 sm:p-4 rounded-2xl shrink-0",
                          isDarkMode ? "bg-slate-800 text-primary" : "bg-primary-light/30 text-primary"
                        )}>
                          <feature.icon size={20} className="sm:hidden" />
                          <feature.icon size={24} className="hidden sm:block" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn("font-black text-[12px] sm:text-sm truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                            {settings.customTitle || feature.label}
                          </h4>
                          <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 truncate">{feature.desc}</p>
                        </div>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex gap-1 sm:gap-2 p-1 rounded-xl bg-slate-900/50">
                          <button
                            onClick={() => updateFeatureState(feature.id, 'open')}
                            className={cn(
                              "flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all",
                              state === 'open' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-emerald-400"
                            )}
                          >
                            Mở
                          </button>
                          <button
                            onClick={() => updateFeatureState(feature.id, 'maintenance')}
                            className={cn(
                              "flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all",
                              state === 'maintenance' ? "bg-amber-500 text-white" : "text-slate-500 hover:text-amber-400"
                            )}
                          >
                            Bảo trì
                          </button>
                          <button
                            onClick={() => updateFeatureState(feature.id, 'closed')}
                            className={cn(
                              "flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all",
                              state === 'closed' ? "bg-rose-500 text-white" : "text-slate-500 hover:text-rose-400"
                            )}
                          >
                            Đóng
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Tiêu đề tùy chỉnh</label>
                          <input
                            type="text"
                            placeholder={feature.label}
                            value={settings.customTitle || ''}
                            onChange={(e) => {
                              const newSettings = { ...settings, customTitle: e.target.value };
                              updateFeatureSettings(feature.id, newSettings);
                            }}
                            className={cn(
                              "w-full px-3 py-2 sm:px-4 sm:py-3 border-2 rounded-xl focus:ring-0 transition-all font-bold outline-none text-[10px] sm:text-xs",
                              isDarkMode ? "bg-slate-900 border-slate-800 text-white focus:border-primary" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-primary"
                            )}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1">
                          <Settings size={12} /> Cài đặt chi tiết
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={cn(
              "p-6 rounded-[32px] border transition-all",
              isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
            )}>
              {activeCategory !== 'permissions' ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder={`Thêm ${(categories.find(c => c.id === activeCategory)?.label || '').toLowerCase()} mới...`}
                        className={cn(
                          "w-full pl-5 pr-4 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                        )}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                      />
                    </div>
                    <button
                      onClick={addItem}
                      className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      Thêm mới
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <AnimatePresence mode="popLayout">
                      {currentItems.length > 0 ? (
                        currentItems.map((item, index) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border-2 group transition-all",
                              isDarkMode ? "bg-slate-800/30 border-slate-800 hover:border-slate-700" : "bg-white border-slate-50 hover:border-blue-100 hover:shadow-lg hover:shadow-slate-200/50"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs",
                                isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-50 text-slate-400"
                              )}>
                                {index + 1}
                              </div>
                              <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{item.name}</span>
                            </div>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full py-12 text-center">
                          <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                            isDarkMode ? "bg-slate-800" : "bg-slate-50"
                          )}>
                            <Info size={24} className="text-slate-300" />
                          </div>
                          <p className="text-slate-500 font-bold">Chưa có dữ liệu cho mục này</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                renderPermissionsTable()
              )}
            </div>
          )}

          <div className={cn(
            "p-8 rounded-[32px] border flex gap-6 items-start transition-all",
            isDarkMode ? "bg-blue-900/10 border-blue-900/30" : "bg-blue-50 border-blue-100 shadow-sm"
          )}>
            <div className={cn(
              "p-3 rounded-2xl",
              isDarkMode ? "bg-blue-500/20" : "bg-white shadow-sm"
            )}>
              <Info className={isDarkMode ? "text-blue-400" : "text-blue-600"} size={24} />
            </div>
            <div>
              <h4 className={cn("text-lg font-black tracking-tight mb-2", isDarkMode ? "text-blue-300" : "text-blue-900")}>Hướng dẫn cơ chế phân quyền</h4>
              <p className={cn("text-sm font-medium leading-relaxed", isDarkMode ? "text-blue-400/80" : "text-blue-700/80")}>
                Hệ thống áp dụng mô hình phân quyền kết hợp để đảm bảo tính linh hoạt và bảo mật:
                <br /><span className="inline-block mt-2">• <b>Quyền quản lý (Vai trò):</b> Xác định khả năng quản trị hệ thống như quản lý người dùng, cấu hình danh mục.</span>
                <br /><span>• <b>Quyền làm việc (Chức danh):</b> Xác định các tính năng chuyên môn được phép sử dụng trong quy trình khám chữa bệnh.</span>
                <br /><span className="inline-block mt-2">Quyền hạn thực tế của một tài khoản là <b>tổng hợp (Union)</b> của cả hai loại quyền trên.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Feature Detail Modal */}
      <AnimatePresence>
        {selectedFeatureForDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFeatureForDetail(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              {(() => {
                const feature = ALL_FEATURES.find(f => f.id === selectedFeatureForDetail);
                if (!feature) return null;
                const settings = featureSettings[feature.id] || {};
                const bannedUsers = settings.bannedUsers || [];

                return (
                  <>
                    <div className={cn(
                      "p-8 border-b flex items-center justify-between transition-colors",
                      isDarkMode ? "border-slate-800" : "border-slate-100"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                          isDarkMode ? "bg-slate-800" : "bg-primary shadow-primary/20"
                        )}>
                          <feature.icon size={24} />
                        </div>
                        <div>
                          <h3 className={cn("text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                            Thiết lập: {settings.customTitle || feature.label}
                          </h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{feature.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedFeatureForDetail(null)}
                        className={cn(
                          "p-3 rounded-2xl transition-colors text-slate-400",
                          isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Thứ tự hiển thị</label>
                          <input
                            type="number"
                            value={settings.order || 0}
                            onChange={(e) => {
                              const newSettings = { ...settings, order: parseInt(e.target.value) || 0 };
                              updateFeatureSettings(feature.id, newSettings);
                            }}
                            className={cn(
                              "w-full px-5 py-4 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-black text-lg",
                              isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                            )}
                          />
                          <p className="mt-2 text-[10px] font-medium text-slate-500">Thứ tự nhỏ hơn sẽ hiển thị trước.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Vị trí hiển thị</label>
                          <div className="space-y-3">
                            {[
                              { id: 'sidebar', label: 'Thanh menu bên', checkedWhenVisible: true },
                              { id: 'home_grid', label: 'Lưới trang chủ', checkedWhenVisible: true },
                              { id: 'utilities_box', label: 'Hộp tiện ích', checkedWhenVisible: false }
                            ].map(loc => (
                              <label key={loc.id} className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={loc.checkedWhenVisible
                                      ? !(settings.hiddenLocations || []).includes(loc.id)
                                      : (settings.hiddenLocations || []).includes(loc.id)}
                                    onChange={(e) => {
                                      const hidden = settings.hiddenLocations || [];
                                      const shouldHide = loc.checkedWhenVisible ? !e.target.checked : e.target.checked;
                                      const newHidden = shouldHide
                                        ? [...hidden, loc.id].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
                                        : hidden.filter((h: string) => h !== loc.id);
                                      updateFeatureSettings(feature.id, { ...settings, hiddenLocations: newHidden });
                                    }}
                                    className="peer sr-only"
                                  />
                                  <div className={cn(
                                    "w-10 h-6 rounded-full transition-all peer-checked:bg-emerald-500",
                                    isDarkMode ? "bg-slate-800" : "bg-slate-200"
                                  )}></div>
                                  <div className={cn(
                                    "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4",
                                    isDarkMode ? "shadow-none" : "shadow-sm"
                                  )}></div>
                                </div>
                                <span className={cn("text-xs font-bold transition-colors", isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900")}>
                                  {loc.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {feature.id === 'view_directory' && (
                          <div className="md:col-span-2 space-y-4 pt-6 border-t border-slate-100/10">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Cấu hình chi tiết nội bộ</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl bg-slate-800/20 border border-slate-800 hover:border-emerald-500/50 transition-all">
                                <div className="relative flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={settings.showCommonIndications !== false}
                                    onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showCommonIndications: e.target.checked })}
                                    className="peer sr-only"
                                  />
                                  <div className={cn("w-10 h-6 rounded-full transition-all peer-checked:bg-emerald-500", isDarkMode ? "bg-slate-700" : "bg-slate-200")}></div>
                                  <div className={cn("absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4", isDarkMode ? "shadow-none" : "shadow-sm")}></div>
                                </div>
                                <div className="flex flex-col">
                                  <span className={cn("text-[11px] font-black transition-colors", isDarkMode ? "text-slate-200 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900")}>Chỉ định thường dùng</span>
                                  <span className="text-[9px] font-medium text-slate-500">Ghim & hiển thị các chỉ định quan trọng</span>
                                </div>
                              </label>

                              <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl bg-slate-800/20 border border-slate-800 hover:border-emerald-500/50 transition-all">
                                <div className="relative flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={settings.showIcdSuggestions !== false}
                                    onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showIcdSuggestions: e.target.checked })}
                                    className="peer sr-only"
                                  />
                                  <div className={cn("w-10 h-6 rounded-full transition-all peer-checked:bg-emerald-500", isDarkMode ? "bg-slate-700" : "bg-slate-200")}></div>
                                  <div className={cn("absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4", isDarkMode ? "shadow-none" : "shadow-sm")}></div>
                                </div>
                                <div className="flex flex-col">
                                  <span className={cn("text-[11px] font-black transition-colors", isDarkMode ? "text-slate-200 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900")}>Gợi ý ICD-10</span>
                                  <span className="text-[9px] font-medium text-slate-500">Hiển thị mã ICD-10 tương ứng</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quyền truy cập theo vai trò</label>
                        <div className={cn(
                          "grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-3xl border",
                          isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                        )}>
                          {roles.map(role => {
                            const allowedRoles = settings.allowedRoles || [];
                            const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(role.id);
                            return (
                              <button
                                key={role.id}
                                onClick={() => {
                                  let newAllowed: string[];
                                  if (allowedRoles.includes(role.id)) {
                                    newAllowed = allowedRoles.filter((r: string) => r !== role.id);
                                  } else {
                                    newAllowed = [...allowedRoles, role.id];
                                  }
                                  // If all roles are selected, effectively allowing everyone (empty array)
                                  if (newAllowed.length === roles.length) newAllowed = [];
                                  
                                  updateFeatureSettings(feature.id, { ...settings, allowedRoles: newAllowed });
                                }}
                                className={cn(
                                  "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center border-2",
                                  isAllowed
                                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                    : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                                )}
                              >
                                {role.name}
                              </button>
                            );
                          })}
                        </div>
                        <p className="px-2 text-[10px] font-medium text-slate-500 italic">
                          * Mặc định (nếu không chọn vai trò nào hoặc chọn tất cả) mọi vai trò đều có thể truy cập (nếu được cấp quyền tab).
                          Chọn cụ thể vai trò để giới hạn quyền truy cập chỉ cho những nhóm này.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Cấm người dùng truy cập</label>
                          <div className="relative w-48">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Tìm người dùng..."
                              value={userSearchTerm}
                              onChange={(e) => setUserSearchTerm(e.target.value)}
                              className={cn(
                                "w-full pl-9 pr-4 py-2 rounded-xl border-none text-[10px] font-bold focus:ring-1 focus:ring-primary",
                                isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                              )}
                            />
                          </div>
                        </div>

                        <div className={cn(
                          "grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-3xl border max-h-60 overflow-y-auto custom-scrollbar",
                          isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                        )}>
                          {allUsers
                            .filter(u => u.displayName.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase()))
                            .map(user => {
                              const isBanned = bannedUsers.includes(user.uid);
                              return (
                                <div 
                                  key={user.uid}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-2xl transition-all",
                                    isBanned 
                                      ? (isDarkMode ? "bg-rose-500/10 border border-rose-500/20" : "bg-rose-50 border border-rose-100")
                                      : (isDarkMode ? "bg-slate-800" : "bg-white shadow-sm")
                                  )}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                      isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                                    )}>
                                      {user.displayName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className={cn("text-xs font-black truncate", isDarkMode ? "text-white" : "text-slate-900")}>{user.displayName}</p>
                                      <p className="text-[9px] text-slate-500 truncate">{user.email}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const newBanned = isBanned
                                        ? bannedUsers.filter((id: string) => id !== user.uid)
                                        : [...bannedUsers, user.uid];
                                      updateFeatureSettings(feature.id, { ...settings, bannedUsers: newBanned });
                                    }}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap",
                                      isBanned
                                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                        : "bg-slate-200 text-slate-500 hover:bg-rose-500 hover:text-white"
                                    )}
                                  >
                                    {isBanned ? 'Gỡ cấm' : 'Cấm'}
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "p-8 border-t bg-slate-50/50 flex justify-end transition-colors",
                      isDarkMode ? "bg-slate-800/50 border-slate-800" : "border-slate-100"
                    )}>
                      <button
                        onClick={() => setSelectedFeatureForDetail(null)}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        Hoàn tất
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SystemConfig;
