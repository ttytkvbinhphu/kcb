import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Trash2, Save, X, Loader2, Briefcase, GraduationCap, Award, ShieldCheck, Lock, CheckCircle2, LayoutGrid, ChevronRight, Info, Globe, Moon, Sun, Cpu, Database, Users, Activity, Eye, EyeOff, Wrench, FileText, Calendar, MessageSquare, Pill, ClipboardList, ShieldAlert, AlertTriangle, History, Search, ArrowLeft, LogIn, LogOut, Calculator, Building2, ListTodo, Edit3, UserCheck, Image as ImageIcon, Layout, MousePointer2, AlignLeft, AlignCenter, AlignRight, Columns, Maximize, LayoutTemplate, Type, Square, Sparkles, FileSearch, HelpCircle } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, handleFirestoreError, OperationType, query, where, getDocs, orderBy, limit } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SystemSettings, UserProfile, AuthLog, GuestLog } from '../types';
import ThemeSettings from './ThemeSettings';
import ConfirmModal from './ConfirmModal';
import StaffManagement from './StaffManagement';
import VersionManagement from './VersionManagement';

interface ConfigItem {
  id: string;
  name: string;
  order?: number;
  powerPoints?: number;
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
  uid: string;
  userRole: string;
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
  { id: 'dashboard', label: 'Workspace' },
  { id: 'view_directory', label: 'Tra cứu thuốc' },
  { id: 'view_icd10', label: 'Tra cứu ICD-10' },
  { id: 'view_interaction', label: 'Tra cứu tương tác thuốc' },
  { id: 'view_adr', label: 'Tra cứu ADR' },
  { id: 'view_patients', label: 'Tra cứu bệnh nhân' },
  { id: 'view_prescription', label: 'Kê toa thử' },
  { id: 'view_todo', label: 'Việc cần làm' },
  { id: 'view_doc_lookup', label: 'Tra cứu văn bản' },
];

const ALL_FEATURES = [
  { id: 'dashboard', label: 'Workspace', icon: LayoutGrid, desc: 'Màn hình chính và thống kê' },
  { id: 'view_calendar', label: 'Lịch công tác', icon: Calendar, desc: 'Quản lý lịch trực và hội chẩn' },
  { id: 'view_notes', label: 'Ghi chú', icon: MessageSquare, desc: 'Ghi chú lâm sàng cá nhân' },
  { id: 'view_doc_lookup', label: 'Tra cứu văn bản', icon: FileSearch, desc: 'Tóm tắt & phân tích tài liệu bằng AI' },
  { id: 'view_directory', label: 'Tra cứu thuốc', icon: Pill, desc: 'Tra cứu & Quản lý danh mục thuốc' },
  { id: 'view_icd10', label: 'Tra cứu ICD-10', icon: ClipboardList, desc: 'Mã bệnh quốc tế' },
  { id: 'view_interaction', label: 'Tương tác thuốc', icon: ShieldAlert, desc: 'Kiểm tra tương tác thuốc' },
  { id: 'view_adr', label: 'Tra cứu ADR', icon: AlertTriangle, desc: 'Phản ứng có hại của thuốc' },
  { id: 'view_patients', label: 'Tra cứu bệnh nhân', icon: Users, desc: 'Hồ sơ bệnh nhân' },
  { id: 'view_prescription', label: 'Kê toa thử', icon: FileText, desc: 'Tạo đơn thuốc mẫu' },
  { id: 'view_social', label: 'Mạng xã hội', icon: MessageSquare, desc: 'Giao lưu và chia sẻ chuyên môn' },
  { id: 'view_calculator', label: 'Máy tính', icon: Calculator, desc: 'Máy tính liều lượng & cân nặng' },
  { id: 'view_todo', label: 'Việc cần làm', icon: ListTodo, desc: 'Danh sách công việc cá nhân' },
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

const SystemConfig: React.FC<SystemConfigProps> = ({ isDarkMode, systemSettings, activeCategory, setActiveCategory, uid, userRole }) => {
  const [titles, setTitles] = useState<ConfigItem[]>([]);
  const [positions, setPositions] = useState<ConfigItem[]>([]);
  const [specialties, setSpecialties] = useState<ConfigItem[]>([]);
  const [departments, setDepartments] = useState<ConfigItem[]>([]);
  const [roles, setRoles] = useState<ConfigItem[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [titlePermissions, setTitlePermissions] = useState<TitlePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const [newItemName, setNewItemName] = useState('');
  const [permissionType, setPermissionType] = useState<'role' | 'title'>('role');

  const [editSettings, setEditSettings] = useState<SystemSettings>(systemSettings);
  
  useEffect(() => {
    setEditSettings(systemSettings);
  }, [systemSettings]);

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTermsConfirmOpen, setIsTermsConfirmOpen] = useState(false);
  const [isRegConfirmOpen, setIsRegConfirmOpen] = useState(false);
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
  const [homeSubTab, setHomeSubTab] = useState<'features_main' | 'utilities' | 'registration' | 'notifications'>('features_main');
  const [regSettings, setRegSettings] = useState<any>({
    allowNewRegistration: true,
    autoApprove: false,
    defaultRoleId: 'unapproved',
    defaultTitleId: ''
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [announcementType, setAnnouncementType] = useState<'general' | 'drug_update'>('general');
  const [selectedDrugId, setSelectedDrugId] = useState('');
  const [selectedDrugName, setSelectedDrugName] = useState('');
  const [showInWorkspace, setShowInWorkspace] = useState(true);
  const [showInHeader, setShowInHeader] = useState(true);
  const [drugsList, setDrugsList] = useState<any[]>([]);
  const [drugSearchQuery, setDrugSearchQuery] = useState('');
  const [isSavingReg, setIsSavingReg] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Announcement editing state
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<'general' | 'drug_update'>('general');
  const [editTargetRoles, setEditTargetRoles] = useState<string[]>([]);
  const [editTargetTitles, setEditTargetTitles] = useState<string[]>([]);
  const [editShowInWorkspace, setEditShowInWorkspace] = useState(true);
  const [editShowInHeader, setEditShowInHeader] = useState(true);
  const [editDrugId, setEditDrugId] = useState('');
  const [editDrugName, setEditDrugName] = useState('');
  const [editDrugSearchQuery, setEditDrugSearchQuery] = useState('');
  const [isSavingAnnouncementEdit, setIsSavingAnnouncementEdit] = useState(false);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [guestLogs, setGuestLogs] = useState<GuestLog[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);
  const [hrSubTab, setHrSubTab] = useState<'staff' | 'titles' | 'positions' | 'specialties' | 'departments' | 'roles' | 'permissions'>('staff');
  const [regSubTab, setRegSubTab] = useState<'pending' | 'settings' | 'history' | 'guest_history'>('pending');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState<'all' | 'login' | 'logout'>('all');
  const [deletingGuestLogId, setDeletingGuestLogId] = useState<string | null>(null);

  // Guide Management states
  const [guideSubTab, setGuideSubTab] = useState<'icd10'>('icd10');
  const [guideTitle, setGuideTitle] = useState('');
  const [guideTabs, setGuideTabs] = useState<Array<{ id: string; title: string; paragraphs: string[] }>>([]);
  const [newContentTabTitle, setNewContentTabTitle] = useState('');
  const [selectedContentTabIndex, setSelectedContentTabIndex] = useState<number>(0);
  const [newParagraphText, setNewParagraphText] = useState('');
  const [isSavingGuide, setIsSavingGuide] = useState(false);
  const [saveGuideSuccess, setSaveGuideSuccess] = useState(false);
  // --- Rendering Editor UI ---
  const effectiveCategory = activeCategory === 'hr' ? hrSubTab : activeCategory;

  const currentItems = effectiveCategory === 'titles' ? titles :
    effectiveCategory === 'positions' ? positions :
      effectiveCategory === 'specialties' ? specialties :
        effectiveCategory === 'departments' ? departments : roles;

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
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_config/registration');
    });

    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'announcements');
    });

    const unsubAuthLogs = onSnapshot(
      query(collection(db, 'auth_logs'), orderBy('timestamp', 'desc'), limit(50)),
      (snapshot) => {
        setAuthLogs(snapshot.docs.map(doc => doc.data() as AuthLog));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'auth_logs');
      }
    );

    const unsubGuestLogs = onSnapshot(
      query(collection(db, 'guest_logs'), orderBy('timestamp', 'desc'), limit(100)),
      (snapshot) => {
        setGuestLogs(snapshot.docs.map(doc => doc.data() as GuestLog));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'guest_logs');
      }
    );

    const unsubPendingUsers = onSnapshot(
      query(collection(db, 'users'), where('isApproved', '==', false)),
      (snapshot) => {
        setPendingUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    );

    const unsubDrugs = onSnapshot(collection(db, 'drugs'), (snapshot) => {
      setDrugsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
    }, (error) => {
      console.error("Error loading drugs inside SystemConfig:", error);
    });

    const unsubGuide = onSnapshot(doc(db, 'system_config', 'guide_icd10'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGuideTitle(data.title || '');
        setGuideTabs(data.tabs || []);
      } else {
        setGuideTitle('Hướng dẫn Tra cứu ICD-10');
        setGuideTabs([
          {
            id: 'tab-1',
            title: 'Tổng quan',
            paragraphs: [
              'Tra cứu ICD-10 là công cụ hỗ trợ tìm kiếm nhanh mã bệnh quốc tế ICD-10.',
              'Nhập mã ICD-10 hoặc tên bệnh tiếng Việt không dấu/có dấu để tìm kiếm.',
              'Bạn có thể click vào các nút triệu chứng hoặc tình trạng để lọc nhanh mã bệnh theo chương.'
            ]
          }
        ]);
      }
    }, (error) => {
      console.error("Error loading guides inside SystemConfig:", error);
    });

    return () => {
      unsubFeatures();
      unsubReg();
      unsubAnnouncements();
      unsubAuthLogs();
      unsubGuestLogs();
      unsubPendingUsers();
      unsubDrugs();
      unsubGuide();
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

  const updateShowWelcomeSlider = async (enable: boolean) => {
    const updatedSettings = { ...editSettings }; // Removing showWelcomeSlider
    setEditSettings(updatedSettings);
    try {
      await setDoc(doc(db, 'system_settings', 'main'), updatedSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system_settings/main');
    }
  };

  const approveUser = async (user: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...user,
        isApproved: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
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
        title: announcementTitle.trim() || null,
        content: newAnnouncement,
        createdAt: new Date().toISOString(),
        targetRoles: targetRoles.length > 0 ? targetRoles : null,
        targetTitles: targetTitles.length > 0 ? targetTitles : null,
        type: announcementType,
        drugId: announcementType === 'drug_update' ? selectedDrugId : null,
        drugName: announcementType === 'drug_update' ? selectedDrugName : null,
        showInWorkspace: showInWorkspace,
        showInHeader: showInHeader
      });
      setNewAnnouncement('');
      setAnnouncementTitle('');
      setTargetRoles([]);
      setTargetTitles([]);
      setAnnouncementType('general');
      setSelectedDrugId('');
      setSelectedDrugName('');
      setShowInWorkspace(true);
      setShowInHeader(true);
      setDrugSearchQuery('');
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

  const startEditingAnnouncement = (ann: any) => {
    setEditingAnnouncement(ann);
    setEditTitle(ann.title || '');
    setEditContent(ann.content || '');
    setEditType(ann.type || 'general');
    setEditTargetRoles(ann.targetRoles || []);
    setEditTargetTitles(ann.targetTitles || []);
    setEditShowInWorkspace(ann.showInWorkspace !== false);
    setEditShowInHeader(ann.showInHeader !== false);
    setEditDrugId(ann.drugId || '');
    setEditDrugName(ann.drugName || '');
    setEditDrugSearchQuery('');
  };

  const saveAnnouncementEdit = async () => {
    if (!editingAnnouncement) return;
    if (!editContent.trim()) return;
    setIsSavingAnnouncementEdit(true);
    try {
      await setDoc(doc(db, 'announcements', editingAnnouncement.id), {
        title: editTitle.trim() || null,
        content: editContent,
        type: editType,
        targetRoles: editTargetRoles.length > 0 ? editTargetRoles : null,
        targetTitles: editTargetTitles.length > 0 ? editTargetTitles : null,
        showInWorkspace: editShowInWorkspace,
        showInHeader: editShowInHeader,
        drugId: editType === 'drug_update' ? editDrugId : null,
        drugName: editType === 'drug_update' ? editDrugName : null,
        createdAt: editingAnnouncement.createdAt, // keep original timestamp
        updatedAt: new Date().toISOString()
      });
      setEditingAnnouncement(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `announcements/${editingAnnouncement.id}`);
    } finally {
      setIsSavingAnnouncementEdit(false);
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
    const unsubDepartments = onSnapshot(collection(db, 'config_departments'), (snapshot) => {
      setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConfigItem)).sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    const unsubRoles = onSnapshot(collection(db, 'config_roles'), (snapshot) => {
      setRoles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConfigItem)).sort((a, b) => (b.powerPoints ?? 0) - (a.powerPoints ?? 0)));
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
      unsubDepartments();
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
    const collectionName = `config_${effectiveCategory}`;
    const id = Date.now().toString();
    const currentList = effectiveCategory === 'titles' ? titles :
      effectiveCategory === 'positions' ? positions :
        effectiveCategory === 'specialties' ? specialties :
          effectiveCategory === 'departments' ? departments : roles;

    try {
      await setDoc(doc(db, collectionName, id), {
        name: newItemName.trim(),
        order: currentList.length,
        ...(effectiveCategory === 'roles' ? { powerPoints: 0 } : {})
      });

      if (effectiveCategory === 'roles') {
        await setDoc(doc(db, 'role_permissions', id), {
          roleId: id,
          allowedTabs: ['dashboard']
        });
      }

      setNewItemName('');
    } catch (error: any) {
      console.error("Error adding item:", error);
      alert(`Lỗi khi thêm dữ liệu vào ${collectionName}: ` + (error.message || error));
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  };


  const deleteItem = async (id: string) => {
    const collectionName = `config_${effectiveCategory}`;
    try {
      await deleteDoc(doc(db, collectionName, id));
      if (effectiveCategory === 'roles') {
        await deleteDoc(doc(db, 'role_permissions', id));
      }
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const updateItem = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    const collectionName = `config_${effectiveCategory}`;
    const item = currentItems.find(i => i.id === id);
    if (!item) return;

    const oldName = item.name;

    try {
      await setDoc(doc(db, collectionName, id), {
        ...item,
        name: newName.trim()
      });

      // Cascade update to users if it's a structural field
      const structuralFields: Record<string, keyof UserProfile> = {
        'departments': 'department',
        'titles': 'title',
        'positions': 'position',
        'specialties': 'specialty'
      };

      const userField = structuralFields[effectiveCategory];
      if (userField && oldName !== newName.trim()) {
        const usersToUpdate = allUsers.filter(u => u[userField] === oldName);
        if (usersToUpdate.length > 0) {
          const promises = usersToUpdate.map(user =>
            setDoc(doc(db, 'users', user.uid), {
              ...user,
              [userField]: newName.trim()
            })
          );
          await Promise.all(promises);
        }
      }

      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
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
        "p-4 rounded-2xl flex items-center gap-3 border transition-all",
        isDarkMode ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"
      )}>
        <div className={cn(
          "p-2 rounded-xl",
          isDarkMode ? "bg-indigo-500 text-white" : "bg-white text-indigo-600 shadow-sm"
        )}>
          <Lock size={20} />
        </div>
        <div>
          <h4 className={cn("text-sm font-black", isDarkMode ? "text-indigo-400" : "text-indigo-900")}>Quyền quản lý (Role Permissions)</h4>
          <p className={cn("text-[10px] font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Phân quyền các tính năng quản lý dành cho các nhóm vai trò đặc biệt.</p>
        </div>
      </div>

      <div className={cn(
        "overflow-x-auto rounded-3xl border transition-all",
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/20"
      )}>
        <table className="w-full border-collapse">
          <thead>
            <tr className={isDarkMode ? "bg-slate-800/50" : "bg-slate-50/50"}>
              <th className={cn("p-6 text-left text-[10px] font-black uppercase tracking-[0.2em] border-b", isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-200")}>
                Tính năng / Vai trò
              </th>
              {['admin', 'operator_doctor', 'operator_pharmacist', 'member'].map(roleId => {
                const role = roles.find(r => r.id === roleId);
                return (
                  <th key={roleId} className={cn("p-6 text-center text-[10px] font-black uppercase tracking-[0.2em] border-b", isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-200")}>
                    {role?.name || roleId}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={cn(
            "divide-y",
            isDarkMode ? "divide-slate-800" : "divide-slate-100"
          )}>
            {ROLE_TABS.map(tab => (
              <tr key={tab.id} className={cn("transition-colors", isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50/50")}>
                <td className={cn("p-6 font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                  {tab.label}
                </td>
                {['admin', 'operator_doctor', 'operator_pharmacist', 'member'].map(roleId => {
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
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const categories = [
    { id: 'general', label: 'Cài đặt chung', icon: Globe, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { id: 'registration', label: 'Đăng nhập/Đăng ký', icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'home', label: 'Công cụ', icon: LayoutGrid, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'notifications', label: 'Thông báo/Tin nhắn', icon: MessageSquare, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'hr', label: 'Quản lý Nhân sự', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'features', label: 'Quản lý tính năng', icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'theme', label: 'Quản lý Giao diện', icon: Sun, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { id: 'version', label: 'Nhật ký Phiên bản', icon: History, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'guide', label: 'Hướng dẫn/Trợ giúp', icon: HelpCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const HR_SUB_TABS = [
    { id: 'staff', label: 'Danh sách nhân sự', icon: Users },
    { id: 'titles', label: 'Chức danh', icon: Award },
    { id: 'positions', label: 'Chức vụ', icon: Briefcase },
    { id: 'specialties', label: 'Chuyên khoa', icon: GraduationCap },
    { id: 'departments', label: 'Khoa/Phòng', icon: Building2 },
    { id: 'roles', label: 'Vai trò hệ thống', icon: ShieldCheck },
    { id: 'permissions', label: 'Phân quyền làm việc', icon: Lock },
  ];

  const CATEGORY_DETAILS: Record<string, { desc: string; longDesc: string; gradient: string }> = {
    home: {
      desc: 'Trung tâm điều khiển & Thông báo',
      longDesc: 'Giám sát toàn diện trạng thái vận hành, quản trị hệ thống tính năng cốt lõi và kênh truyền thông nội bộ chuyên nghiệp.',
      gradient: 'from-indigo-600 to-blue-500'
    },
    notifications: {
      desc: 'Hệ thống thông báo & tin nhắn',
      longDesc: 'Quản lý, tạo mới và theo dõi lịch sử các thông báo nội bộ gửi tới các nhóm đối tượng nhân sự trong bệnh viện.',
      gradient: 'from-rose-600 to-orange-500'
    },
    registration: {
      desc: 'Kiểm soát truy cập & Phê duyệt',
      longDesc: 'Quản lý quy trình gia nhập hệ thống, phê duyệt thành viên mới và thiết lập trải nghiệm chào mừng chuyên nghiệp.',
      gradient: 'from-emerald-600 to-teal-500'
    },
    general: {
      desc: 'Cấu hình hệ thống cơ bản',
      longDesc: 'Thiết lập các thông số cơ bản và quản lý điều khoản sử dụng của ứng dụng.',
      gradient: 'from-cyan-600 to-sky-500'
    },
    hr: {
      desc: 'Quản trị nhân sự & Tổ chức',
      longDesc: 'Xây dựng cơ cấu tổ chức, quản lý danh sách nhân viên và thiết lập hệ thống phân quyền làm việc chuyên sâu.',
      gradient: 'from-blue-600 to-indigo-500'
    },
    features: {
      desc: 'Hệ sinh thái tính năng & Tiện ích',
      longDesc: 'Tùy chỉnh trạng thái hoạt động (Mở/Bảo trì/Đóng), phân cấp quyền truy cập và cá nhân hóa trải nghiệm người dùng.',
      gradient: 'from-orange-600 to-amber-500'
    },
    theme: {
      desc: 'Thiết kế giao diện & Trải nghiệm',
      longDesc: 'Nâng tầm trải nghiệm thị giác thông qua việc tùy biến màu sắc, chế độ hiển thị và phong cách thiết kế hiện đại.',
      gradient: 'from-pink-600 to-rose-500'
    },
    version: {
      desc: 'Lộ trình phát triển hệ thống',
      longDesc: 'Ghi nhận lịch sử hoàn thiện ứng dụng, cập nhật tính năng mới và theo dõi quá trình tiến hóa của hệ thống qua thời gian.',
      gradient: 'from-violet-600 to-purple-500'
    },
    guide: {
      desc: 'Hướng dẫn & Trợ giúp',
      longDesc: 'Cấu hình và cập nhật tài liệu hướng dẫn sử dụng, bài viết nghiệp vụ lâm sàng để hỗ trợ trực tiếp cho nhân sự.',
      gradient: 'from-amber-600 to-yellow-500'
    }
  };

  const [selectedFeatureForDetail, setSelectedFeatureForDetail] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<'all' | 'features_main' | 'utilities'>('all');

  useEffect(() => {
    if (activeCategory === 'hr' || activeCategory === 'features' || (activeCategory === 'home' && (homeSubTab === 'features_main' || homeSubTab === 'utilities'))) {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      });
      return () => unsub();
    }
  }, [activeCategory, homeSubTab]);

  useEffect(() => {
    if (activeCategory === 'features' || (activeCategory === 'home' && (homeSubTab === 'features_main' || homeSubTab === 'utilities'))) {
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

  const handleSaveGuide = async () => {
    setIsSavingGuide(true);
    setSaveGuideSuccess(false);
    try {
      await setDoc(doc(db, 'system_config', 'guide_icd10'), {
        id: 'guide_icd10',
        title: guideTitle,
        tabs: guideTabs,
        updatedAt: new Date().toISOString()
      });
      setSaveGuideSuccess(true);
      setTimeout(() => setSaveGuideSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving guide:", error);
      alert("Lỗi khi lưu bài viết hướng dẫn: " + (error.message || error));
    } finally {
      setIsSavingGuide(false);
    }
  };

  const currentCategory = categories.find(c => c.id === activeCategory) || categories[0];
  const sortedFeatures = [...ALL_FEATURES].sort((a, b) => {
    const orderA = featureSettings[a.id]?.order ?? 999;
    const orderB = featureSettings[b.id]?.order ?? 999;
    return orderA - orderB;
  });
  const featureStateGroups: Array<{ id: 'open' | 'maintenance' | 'closed'; label: string; emptyText: string }> = [
    { id: 'open', label: 'Mở', emptyText: 'Không có tiện ích nào đang mở.' },
    { id: 'maintenance', label: 'Bảo trì', emptyText: 'Không có tiện ích nào ở trạng thái bảo trì.' },
    { id: 'closed', label: 'Đóng', emptyText: 'Không có tiện ích nào đang đóng.' }
  ];
  const renderFeatureDetailContent = () => {
    const feature = ALL_FEATURES.find(f => f.id === selectedFeatureForDetail);
    if (!feature) return null;
    const settings = featureSettings[feature.id] || {};
    const bannedUsers = settings.bannedUsers || [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "rounded-[32px] border overflow-hidden transition-all",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
        )}
      >
        <div className={cn(
          "p-6 sm:p-8 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
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
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setSelectedFeatureForDetail(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors mr-1"
                >
                  <ArrowLeft size={16} />
                </button>
                <h3 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                  {settings.customTitle || feature.label}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-9">{feature.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={() => setSelectedFeatureForDetail(null)}
              className={cn(
                "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-slate-900"
              )}
            >
              Quay lại
            </button>
            <button
              onClick={() => setSelectedFeatureForDetail(null)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
            >
              Hoàn tất thay đổi
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
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
                  { id: 'utilities_box', label: 'Tiện ích', checkedWhenVisible: false }
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
              <div className="md:col-span-2 space-y-8 pt-6 border-t border-slate-100/10">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình chi tiết & Phân quyền nội bộ (Theo nhóm)</label>
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200")}>
                    4 Nhóm phân quyền
                  </span>
                </div>

                {/* Group 1: Bảng dữ liệu & Cột hiển thị */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 font-black text-[10px] uppercase tracking-wider">Nhóm 1</span>
                    <h4 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                      Bảng dữ liệu & Cột hiển thị
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-indigo-50/40 border-indigo-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                          Cột Tình trạng
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem cột Tình trạng (Mở/Khóa/Ẩn) trong bảng danh mục thuốc."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.showStatusColumnMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showStatusColumnMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-indigo-200 text-indigo-900 focus:border-indigo-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-pink-50/40 border-pink-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-pink-400" : "text-pink-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>
                          Cột Thao tác
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem cột Thao tác (các nút Chỉnh sửa, Khóa, Mở khóa) trên bảng danh mục thuốc."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.showActionsColumnMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showActionsColumnMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-pink-200 text-pink-900 focus:border-pink-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-purple-50/40 border-purple-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-purple-400" : "text-purple-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                          Xem thuốc đang ẩn / khóa
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để hệ thống hiển thị và tìm kiếm các thuốc đang bị khóa hoặc ẩn."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.showClosedDrugsMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showClosedDrugsMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-purple-200 text-purple-900 focus:border-purple-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group 2: Gợi ý lâm sàng & Hướng dẫn liều */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-black text-[10px] uppercase tracking-wider">Nhóm 2</span>
                    <h4 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                      Gợi ý lâm sàng & Hướng dẫn liều
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/40 border-emerald-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                          Chỉ định thường dùng
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để người dùng xem thông tin Chỉ định lâm sàng thường dùng trong chi tiết thuốc."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.commonIndicationsMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, commonIndicationsMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-emerald-200 text-emerald-900 focus:border-emerald-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-blue-50/40 border-blue-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                          Gợi ý ICD-10
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem danh sách gợi ý mã chẩn đoán ICD-10 tương ứng với thuốc."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.icdSuggestionsMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, icdSuggestionsMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-blue-200 text-blue-900 focus:border-blue-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-cyan-50/40 border-cyan-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-cyan-400" : "text-cyan-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>
                          Gợi ý Ghi liều
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem danh sách câu mẫu hướng dẫn ghi liều dùng nhanh."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.showDosageSuggestionsMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showDosageSuggestionsMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-cyan-200 text-cyan-900 focus:border-cyan-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-cyan-50/40 border-cyan-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-cyan-400" : "text-cyan-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>
                          Thời điểm uống thuốc
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem hướng dẫn chi tiết thời điểm sử dụng thuốc (trước/sau ăn, sáng/tối...)."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.showIntakeTimeMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showIntakeTimeMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-cyan-200 text-cyan-900 focus:border-cyan-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group 3: Cảnh báo Thận trọng & Tương tác */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-black text-[10px] uppercase tracking-wider">Nhóm 3</span>
                    <h4 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                      Cảnh báo Thận trọng & Tương tác
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-amber-50/40 border-amber-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-amber-400" : "text-amber-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                          Phân loại Thận trọng
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem phân loại mức độ cảnh báo thận trọng khi chỉ định thuốc."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.precautionTypeMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, precautionTypeMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-amber-200 text-amber-900 focus:border-amber-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-teal-50/40 border-teal-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-teal-400" : "text-teal-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
                          Mức độ nghiêm trọng
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem thang điểm đánh giá mức độ nghiêm trọng của cảnh báo."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.precautionSeverityMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, precautionSeverityMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-teal-200 text-teal-900 focus:border-teal-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-sky-50/40 border-sky-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-sky-400" : "text-sky-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                          Nhãn chọn nhanh Thận trọng
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem và chọn các nhãn tag cảnh báo nhanh cho thuốc."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.quickSelectTagsMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, quickSelectTagsMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-sky-200 text-sky-900 focus:border-sky-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-indigo-50/40 border-indigo-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                          Gợi ý & Mức độ Tương tác cụ thể
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem phân tích chi tiết mức độ nguy cơ tương tác giữa các hoạt chất."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.interactionSuggestionsMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, interactionSuggestionsMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-indigo-200 text-indigo-900 focus:border-indigo-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group 4: Chống chỉ định đặc biệt (Thai kỳ & Độ tuổi) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-black text-[10px] uppercase tracking-wider">Nhóm 4</span>
                    <h4 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                      Chống chỉ định Đặc biệt (Thai kỳ & Độ tuổi)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-rose-50/40 border-rose-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-rose-400" : "text-rose-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                          3 tháng thai kỳ (Đầu / Giữa / Cuối)
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem mức độ an toàn và cảnh báo chống chỉ định theo từng 3 tháng thai kỳ."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.pregnancyTrimestersMinPower ?? 0}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, pregnancyTrimestersMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500" : "bg-white border-rose-200 text-rose-900 focus:border-rose-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem.
                        </span>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-rose-50/40 border-rose-100")}>
                      <p className={cn("text-xs font-black mb-2 flex items-center justify-between gap-2", isDarkMode ? "text-rose-400" : "text-rose-700")}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                          Chi tiết So sánh & Mốc sinh Chống chỉ định tuổi
                        </span>
                        <span 
                          className="w-4 h-4 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black cursor-help shrink-0 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          title="Thiết lập điểm quyền lực tối thiểu để xem bảng phân tích so sánh chi tiết và mốc năm sinh quy đổi tương ứng với mốc tuổi chống chỉ định."
                        >
                          !
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={settings.ageContraindicationsMinPower ?? 5}
                          onChange={(e) => updateFeatureSettings(feature.id, { ...settings, ageContraindicationsMinPower: parseInt(e.target.value) || 0 })}
                          className={cn(
                            "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center outline-none transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-rose-400 focus:border-rose-500" : "bg-white border-rose-200 text-rose-900 focus:border-rose-500"
                          )}
                        />
                        <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          ⚡ Điểm quyền lực tối thiểu để xem chi tiết So sánh và Mốc sinh.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {feature.id === 'view_icd10' && (
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100/10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình chi tiết & Phân quyền nội bộ</label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/50 border-emerald-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Không là bệnh chính — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showAppendixA2MinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showAppendixA2MinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400" : "bg-white border-amber-200 text-amber-700"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Vai trò có điểm ≥ giá trị này mới được xem.
                      </span>
                    </div>
                  </div>

                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-blue-50/50 border-blue-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      Ghi chú — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showNotesMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showNotesMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400" : "bg-white border-amber-200 text-amber-700"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Vai trò có điểm ≥ giá trị này mới được xem.
                      </span>
                    </div>
                  </div>

                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-indigo-50/50 border-indigo-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                      Phím Tắt — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showShortcutsMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showShortcutsMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400" : "bg-white border-amber-200 text-amber-700"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Vai trò có điểm ≥ giá trị này mới được xem.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {feature.id === 'view_doc_lookup' && (
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100/10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình chi tiết & Phân quyền nội bộ</label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Internal Document Display Limit */}
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/50 border-emerald-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Hiển thị văn bản nội bộ
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showInternalDocsMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showInternalDocsMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-[#8b5cf6]" : "bg-white border-amber-200 text-[#8b5cf6]"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Điểm quyền lực tối thiểu để xem.
                      </span>
                    </div>
                  </div>

                  {/* Summary Limit */}
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-blue-50/50 border-blue-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      Tóm tắt văn bản (AI)
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showSummaryMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showSummaryMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-[#8b5cf6]" : "bg-white border-amber-200 text-[#8b5cf6]"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Điểm quyền lực tối thiểu để xem.
                      </span>
                    </div>
                  </div>

                  {/* Highlights Limit */}
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-indigo-50/50 border-indigo-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                      Điểm nhấn y văn
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showHighlightsMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showHighlightsMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-[#8b5cf6]" : "bg-white border-amber-200 text-[#8b5cf6]"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Điểm quyền lực tối thiểu để xem.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {feature.id === 'view_social' && (
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100/10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình Mạng xã hội</label>

                <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/50 border-emerald-100")}>
                  <div className="flex items-center justify-between mb-4">
                    <p className={cn("text-xs font-black flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Quyền đăng bài — Vai trò được phép
                    </p>
                    <span className="text-[9px] font-bold text-slate-500 italic">Để trống để cho phép tất cả (trừ khách)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const allOptions = Array.from(
                        new Map(
                          [
                            ...roles,
                            { id: 'unapproved', name: 'Đang chờ duyệt' },
                            { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                          ].map(o => [o.id, o])
                        ).values()
                      );
                      return allOptions.map(role => {
                        const allowedRoles: string[] = settings.postingAllowedRoles || [];
                        const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            onClick={() => {
                              let newAllowed: string[];
                              if (allowedRoles.length === 0) {
                                newAllowed = allOptions.map(o => o.id).filter(id => id !== role.id);
                              } else if (allowedRoles.includes(role.id)) {
                                newAllowed = allowedRoles.filter((r: string) => r !== role.id);
                              } else {
                                newAllowed = [...allowedRoles, role.id];
                              }
                              if (newAllowed.length === allOptions.length) newAllowed = [];
                              updateFeatureSettings(feature.id, { ...settings, postingAllowedRoles: newAllowed });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                              isAllowed
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                            )}
                          >
                            {role.name}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-indigo-50/50 border-indigo-100")}>
                  <div className="flex items-center justify-between mb-4">
                    <p className={cn("text-xs font-black flex items-center gap-2", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                      Quyền bình luận — Vai trò được phép
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const allOptions = Array.from(
                        new Map(
                          [
                            ...roles,
                            { id: 'unapproved', name: 'Đang chờ duyệt' },
                            { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                          ].map(o => [o.id, o])
                        ).values()
                      );
                      return allOptions.map(role => {
                        const allowedRoles: string[] = settings.commentingAllowedRoles || [];
                        const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            onClick={() => {
                              let newAllowed: string[];
                              if (allowedRoles.length === 0) {
                                newAllowed = allOptions.map(o => o.id).filter(id => id !== role.id);
                              } else if (allowedRoles.includes(role.id)) {
                                newAllowed = allowedRoles.filter((r: string) => r !== role.id);
                              } else {
                                newAllowed = [...allowedRoles, role.id];
                              }
                              if (newAllowed.length === allOptions.length) newAllowed = [];
                              updateFeatureSettings(feature.id, { ...settings, commentingAllowedRoles: newAllowed });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                              isAllowed
                                ? "bg-indigo-500/10 border-indigo-500 text-indigo-500"
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                            )}
                          >
                            {role.name}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-rose-50/50 border-rose-100")}>
                  <div className="flex items-center justify-between mb-4">
                    <p className={cn("text-xs font-black flex items-center gap-2", isDarkMode ? "text-rose-400" : "text-rose-700")}>
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                      Kiểm duyệt (Moderators) — Có quyền xóa bài bất kỳ
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const allOptions = Array.from(
                        new Map(
                          [
                            ...roles,
                            { id: 'unapproved', name: 'Đang chờ duyệt' },
                            { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                          ].map(o => [o.id, o])
                        ).values()
                      );
                      return allOptions.map(role => {
                        const allowedRoles: string[] = settings.moderatorRoles || [];
                        const isAllowed = allowedRoles.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            onClick={() => {
                              let newAllowed: string[];
                              if (allowedRoles.length === 0) {
                                newAllowed = allOptions.map(o => o.id).filter(id => id !== role.id);
                              } else if (allowedRoles.includes(role.id)) {
                                newAllowed = allowedRoles.filter((r: string) => r !== role.id);
                              } else {
                                newAllowed = [...allowedRoles, role.id];
                              }
                              updateFeatureSettings(feature.id, { ...settings, moderatorRoles: newAllowed });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                              isAllowed
                                ? "bg-rose-500/10 border-rose-500 text-rose-500"
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                            )}
                          >
                            {role.name}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
            {feature.id === 'view_adr' && (
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100/10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Phân quyền theo chức năng con</label>

                <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/50 border-emerald-100")}>
                  <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    Danh mục ADR — Vai trò được xem
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const allOptions = Array.from(
                        new Map(
                          [
                            ...roles,
                            { id: 'unapproved', name: 'Đang chờ duyệt' },
                            { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                          ].map(o => [o.id, o])
                        ).values()
                      );
                      return allOptions.map(role => {
                        const catalogAllowedRoles: string[] = settings.catalogAllowedRoles || [];
                        const isAllowed = catalogAllowedRoles.length === 0 || catalogAllowedRoles.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            onClick={() => {
                              let newAllowed: string[];
                              if (catalogAllowedRoles.length === 0) {
                                newAllowed = allOptions.map(o => o.id).filter(id => id !== role.id);
                              } else if (catalogAllowedRoles.includes(role.id)) {
                                newAllowed = catalogAllowedRoles.filter((r: string) => r !== role.id);
                              } else {
                                newAllowed = [...catalogAllowedRoles, role.id];
                              }
                              if (newAllowed.length === allOptions.length) newAllowed = [];
                              updateFeatureSettings(feature.id, { ...settings, catalogAllowedRoles: newAllowed });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                              isAllowed
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                            )}
                          >
                            {role.name}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-blue-50/50 border-blue-100")}>
                  <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                    Báo cáo ADR — Vai trò được xem
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const allOptions = Array.from(
                        new Map(
                          [
                            ...roles,
                            { id: 'unapproved', name: 'Đang chờ duyệt' },
                            { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                          ].map(o => [o.id, o])
                        ).values()
                      );
                      return allOptions.map(role => {
                        const reportsAllowedRoles: string[] = settings.reportsAllowedRoles || [];
                        const isAllowed = reportsAllowedRoles.length === 0 || reportsAllowedRoles.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            onClick={() => {
                              let newAllowed: string[];
                              if (reportsAllowedRoles.length === 0) {
                                newAllowed = allOptions.map(o => o.id).filter(id => id !== role.id);
                              } else if (reportsAllowedRoles.includes(role.id)) {
                                newAllowed = reportsAllowedRoles.filter((r: string) => r !== role.id);
                              } else {
                                newAllowed = [...reportsAllowedRoles, role.id];
                              }
                              if (newAllowed.length === allOptions.length) newAllowed = [];
                              updateFeatureSettings(feature.id, { ...settings, reportsAllowedRoles: newAllowed });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                              isAllowed
                                ? "bg-blue-500/10 border-blue-500 text-blue-500"
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                            )}
                          >
                            {role.name}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
            {feature.id === 'view_icd10' && (
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100/10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình Gợi ý thuốc điều trị</label>

                <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/50 border-emerald-100")}>
                  <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    Gợi ý thuốc — Điểm quyền lực tối thiểu
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      value={settings.drugSuggestionsMinPower ?? 0}
                      onChange={(e) => updateFeatureSettings(feature.id, { ...settings, drugSuggestionsMinPower: parseInt(e.target.value) || 0 })}
                      className={cn(
                        "w-28 px-4 py-2.5 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                        isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400" : "bg-white border-amber-200 text-amber-700"
                      )}
                    />
                    <span className={cn("text-[10px] font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      ⚡ Vai trò có điểm ≥ giá trị này mới được xem. Đặt 0 để cho phép tất cả (trừ khách).
                    </span>
                  </div>
                </div>
              </div>
            )}
            {feature.id === 'view_patients' && (
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100/10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình chi tiết & Phân quyền nội bộ</label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* showShortcutsMinPower */}
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-indigo-50/50 border-indigo-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                      Phím Tắt Nhanh — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showShortcutsMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showShortcutsMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-[#8b5cf6]" : "bg-white border-amber-200 text-[#8b5cf6]"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Điểm quyền lực tối thiểu để bật phím tắt nhanh của hồ sơ bệnh nhân. Đặt 0 để cho phép tất cả.
                      </span>
                    </div>
                  </div>

                  {/* groupManagementMinPower */}
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-blue-50/50 border-blue-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      Quản lý nhóm đối tượng
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.groupManagementMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, groupManagementMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-[#8b5cf6]" : "bg-white border-amber-200 text-[#8b5cf6]"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Điểm quyền lực tối thiểu để xem và sử dụng tính năng quản lý nhóm đối tượng.
                      </span>
                    </div>
                  </div>

                  {/* manualEntryMinPower */}
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/50 border-emerald-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Nhập hồ sơ thủ công
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.manualEntryMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, manualEntryMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-[#8b5cf6]" : "bg-white border-amber-200 text-[#8b5cf6]"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Điểm quyền lực tối thiểu để tự thiết lập hồ sơ bệnh nhân bằng tay.
                      </span>
                    </div>
                  </div>

                  {/* deletePatientMinPower */}
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-rose-50/50 border-rose-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-rose-400" : "text-rose-700")}>
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                      Xóa hồ sơ bệnh nhân
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.deletePatientMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, deletePatientMinPower: parseInt(e.target.value) || 0 })}
                        className={cn(
                          "w-20 px-3 py-2 rounded-xl border-2 font-black text-sm text-center focus:ring-0 focus:border-amber-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-[#8b5cf6]" : "bg-white border-amber-200 text-[#8b5cf6]"
                        )}
                      />
                      <span className={cn("text-[9px] font-bold leading-tight", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        ⚡ Điểm quyền lực tối thiểu để có nút Xóa hồ sơ.
                      </span>
                    </div>
                  </div>
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
              {(() => {
                const allOptions = [
                  ...roles,
                  { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                ];
                return allOptions.map(role => {
                  const allowedRoles = settings.allowedRoles || [];
                  const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      onClick={() => {
                        let newAllowed: string[];
                        if (allowedRoles.length === 0) {
                          newAllowed = allOptions.map(o => o.id).filter(id => id !== role.id);
                        } else if (allowedRoles.includes(role.id)) {
                          newAllowed = allowedRoles.filter((r: string) => r !== role.id);
                        } else {
                          newAllowed = [...allowedRoles, role.id];
                        }
                        if (newAllowed.length === allOptions.length) newAllowed = [];
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
                });
              })()}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quyền truy cập theo chức danh (Quyền làm việc)</label>
            <div className={cn(
              "grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-3xl border",
              isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
            )}>
              {titles.map(title => {
                const allowedTitles = settings.allowedTitles || [];
                const isAllowed = allowedTitles.length === 0 || allowedTitles.includes(title.name);
                return (
                  <button
                    key={title.id}
                    onClick={() => {
                      let newAllowed: string[];
                      if (allowedTitles.length === 0) {
                        newAllowed = titles.map(o => o.name).filter(name => name !== title.name);
                      } else if (allowedTitles.includes(title.name)) {
                        newAllowed = allowedTitles.filter((t: string) => t !== title.name);
                      } else {
                        newAllowed = [...allowedTitles, title.name];
                      }
                      if (newAllowed.length === titles.length) newAllowed = [];
                      updateFeatureSettings(feature.id, { ...settings, allowedTitles: newAllowed });
                    }}
                    className={cn(
                      "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center border-2",
                      isAllowed
                        ? "bg-blue-500/10 border-blue-500 text-blue-500"
                        : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                    )}
                  >
                    {title.name}
                  </button>
                );
              })}
            </div>
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
              "grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-3xl border",
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

        <div className="p-6 sm:p-2 border-t flex justify-end transition-colors opacity-0 pointer-events-none h-0 p-0 overflow-hidden" />
      </motion.div>
    );
  };
  const renderFeatureCard = (feature: typeof ALL_FEATURES[number]) => {
    const state = featureStates[feature.id] || 'open';
    const settings = featureSettings[feature.id] || {};

    return (
      <div
        key={feature.id}
        onClick={() => setSelectedFeatureForDetail(feature.id)}
        className={cn(
          "p-5 sm:p-7 rounded-[2rem] border-2 transition-all relative group cursor-pointer overflow-hidden",
          isDarkMode 
            ? "bg-slate-900/40 border-slate-800 hover:border-primary/50 hover:bg-slate-800/60" 
            : "bg-white border-slate-100 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5"
        )}
      >
        {/* Subtle Gradient Hover Effect */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none bg-gradient-to-br",
          details.gradient
        )} />

        <div className="flex items-center gap-4 sm:gap-5 mb-4 sm:mb-8 relative z-10">
          <div className={cn(
            "p-3 sm:p-4 rounded-2xl shrink-0 shadow-lg transition-transform group-hover:scale-110",
            isDarkMode ? "bg-slate-800 text-primary" : "bg-primary/5 text-primary"
          )}>
            <feature.icon size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn("font-black text-sm sm:text-base truncate tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
              {settings.customTitle || feature.label}
            </h4>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate uppercase tracking-widest">{feature.desc}</p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className={cn(
            "flex gap-1 sm:gap-2 p-1 rounded-xl",
            isDarkMode ? "bg-slate-900/50" : "bg-slate-100"
          )}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateFeatureState(feature.id, 'open');
              }}
              className={cn(
                "flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all",
                state === 'open' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-emerald-400"
              )}
            >
              Mở
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateFeatureState(feature.id, 'maintenance');
              }}
              className={cn(
                "flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all",
                state === 'maintenance' ? "bg-amber-500 text-white" : "text-slate-500 hover:text-amber-400"
              )}
            >
              Bảo trì
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateFeatureState(feature.id, 'closed');
              }}
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

        <div className={cn("mt-3 pt-3 border-t grid grid-cols-2 gap-4", isDarkMode ? "border-slate-800" : "border-slate-100")}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Vai trò</p>
            <div className="flex flex-wrap gap-1">
              {(() => {
                const allOptions = Array.from(
                  new Map(
                    [
                      ...roles,
                      { id: 'unapproved', name: 'Đang chờ duyệt' },
                      { id: 'guest', name: 'Khách' }
                    ].map(o => [o.id, o])
                  ).values()
                );
                const allowedRoles = settings.allowedRoles || [];
                if (allowedRoles.length === 0 || allowedRoles.length === allOptions.length) {
                  return <span className={cn("px-2 py-0.5 rounded text-[8px] font-bold border", isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600")}>Tất cả vai trò</span>;
                }
                return allOptions.filter(r => allowedRoles.includes(r.id)).map(r => (
                  <span key={r.id} className={cn("px-2 py-0.5 rounded text-[8px] font-bold border", isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600")}>
                    {r.name}
                  </span>
                ));
              })()}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Chức danh</p>
            <div className="flex flex-wrap gap-1">
              {(() => {
                const allowedTitles = settings.allowedTitles || [];
                if (allowedTitles.length === 0 || allowedTitles.length === titles.length) {
                  return <span className={cn("px-2 py-0.5 rounded text-[8px] font-bold border", isDarkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600")}>Tất cả chức danh</span>;
                }
                return titles.filter(t => allowedTitles.includes(t.name)).map(t => (
                  <span key={t.id} className={cn("px-2 py-0.5 rounded text-[8px] font-bold border", isDarkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600")}>
                    {t.name}
                  </span>
                ));
              })()}
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1">
            <Settings size={12} /> Cài đặt chi tiết
          </button>
        </div>
      </div>
    );
  };

  const details = CATEGORY_DETAILS[activeCategory] || CATEGORY_DETAILS.home;

  return (
    <>
    <div className="space-y-6">
      <div className={cn(
        "hidden lg:block relative overflow-hidden rounded-[2.5rem] p-8 lg:p-12 mb-10 transition-all",
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-2xl shadow-slate-200/50"
      )}>
        {/* Abstract Background Elements */}
        <div className={cn(
          "absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[100px] opacity-20 bg-gradient-to-br",
          details.gradient
        )} />
        <div className={cn(
          "absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-[80px] opacity-10 bg-gradient-to-tr",
          details.gradient
        )} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            {activeCategory !== 'guide' && (
              <div className="flex items-center gap-4 mb-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110",
                  "bg-gradient-to-br", details.gradient
                )}>
                  <currentCategory.icon size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className={cn(
                      "text-3xl lg:text-4xl font-black tracking-tight",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}>
                      {currentCategory.label}
                    </h2>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      isDarkMode ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500"
                    )}>
                      Admin Panel
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm font-black uppercase tracking-[0.2em] mt-1",
                    isDarkMode ? "text-indigo-400" : "text-indigo-600"
                  )}>
                    {details.desc}
                  </p>
                </div>
              </div>
            )}
            
            <p className={cn(
              "text-base lg:text-lg font-medium leading-relaxed max-w-xl",
              isDarkMode ? "text-slate-400" : "text-slate-500"
            )}>
              {details.longDesc}
            </p>
          </div>

          <div className="flex items-center gap-4 lg:self-end">
            {activeCategory === 'registration' && pendingUsers.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex items-center gap-4 shadow-xl shadow-rose-500/5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Yêu cầu chờ</p>
                  <p className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{pendingUsers.length}</p>
                </div>
              </div>
            )}
            
            {activeCategory === 'home' && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 flex items-center gap-4 shadow-xl shadow-indigo-500/5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Đang Online</p>
                  <p className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{stats.online}</p>
                </div>
              </div>
            )}

            {activeCategory === 'hr' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4 shadow-xl shadow-emerald-500/5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Tổng nhân sự</p>
                  <p className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{allUsers.length}</p>
                </div>
              </div>
            )}
            {activeCategory === 'version' && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('trigger-add-version'))}
                className={cn(
                  "group relative px-8 py-5 rounded-[28px] transition-all duration-300 cursor-pointer",
                  "bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40",
                  "hover:-translate-y-1 active:translate-y-0",
                  "flex items-center gap-3 overflow-hidden"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus size={24} className="relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                <span className="relative z-10 font-black text-sm uppercase tracking-widest">Thêm phiên bản mới</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeCategory === 'guide' && (
        <div className={cn(
          "hidden lg:flex items-center gap-4 p-5 rounded-3xl border transition-all mb-4",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/10"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105",
            "bg-gradient-to-br", details.gradient
          )}>
            <currentCategory.icon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className={cn(
                "text-2xl font-black tracking-tight",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                {currentCategory.label}
              </h2>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                isDarkMode ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500"
              )}>
                Admin Panel
              </span>
            </div>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.15em] mt-0.5",
              isDarkMode ? "text-amber-400" : "text-amber-500"
            )}>
              {details.desc}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Content Area */}
        <div className="space-y-6">
          {activeCategory === 'hr' && (
            <div className={cn(
              "flex flex-wrap items-center gap-1.5 p-1.5 rounded-3xl w-fit border backdrop-blur-md",
              isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-100/80 border-slate-200"
            )}>
              {HR_SUB_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setHrSubTab(tab.id as any)}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                    hrSubTab === tab.id
                      ? (isDarkMode ? "bg-white text-slate-900 shadow-xl" : "bg-white text-primary shadow-xl shadow-slate-200")
                      : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {activeCategory === 'home' && (
            <div className="space-y-6">
              <div className={cn(
                "flex flex-wrap items-center gap-1.5 p-1.5 rounded-3xl w-fit border backdrop-blur-md",
                isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-100/80 border-slate-200"
              )}>
                {[
                  { id: 'features_main', label: 'Tính năng chính', icon: Wrench },
                  { id: 'utilities', label: 'Tiện ích mở rộng', icon: LayoutGrid }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setHomeSubTab(tab.id as any)}
                    className={cn(
                      "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                      homeSubTab === tab.id
                        ? (isDarkMode ? "bg-white text-slate-900 shadow-xl" : "bg-white text-primary shadow-xl shadow-slate-200")
                        : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {selectedFeatureForDetail ? (
                  <div key="detail">
                    {renderFeatureDetailContent()}
                  </div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "p-4 sm:p-8 rounded-[32px] border transition-all",
                      isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                    )}
                  >
                    <div className="space-y-6">
                      {featureStateGroups.map(group => {
                        const featuresInGroup = sortedFeatures.filter(feature => {
                          const isInCorrectTab = homeSubTab === 'features_main'
                            ? ['dashboard', 'view_directory', 'view_icd10', 'view_interaction', 'view_adr', 'view_patients', 'view_prescription', 'view_doc_lookup'].includes(feature.id)
                            : ['view_calendar', 'view_notes', 'view_social', 'view_calculator', 'view_todo'].includes(feature.id);

                          return (featureStates[feature.id] || 'open') === group.id && isInCorrectTab;
                        });
                        return (
                          <div key={group.id} className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <h4 className={cn("text-[11px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                {group.label}
                              </h4>
                              <span className={cn("text-[10px] font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                                {featuresInGroup.length} {homeSubTab === 'features_main' ? 'tính năng' : 'tiện ích'}
                              </span>
                            </div>
                            {featuresInGroup.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                                {featuresInGroup.map(renderFeatureCard)}
                              </div>
                            ) : (
                              <div className={cn(
                                "rounded-2xl border px-4 py-6 text-center text-xs font-bold",
                                isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
                              )}>
                                {group.emptyText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeCategory === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={cn(
                "lg:col-span-1 p-8 rounded-[32px] border-2 transition-all h-fit",
                isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
              )}>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                  <MessageSquare size={18} /> Tạo thông báo mới
                </h3>
                <div className="space-y-4">
                  {/* Loại thông báo */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                      <LayoutTemplate size={12} /> Loại thông báo
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAnnouncementType('general');
                          setSelectedDrugId('');
                          setSelectedDrugName('');
                        }}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2",
                          announcementType === 'general'
                            ? "bg-indigo-500 text-white border-indigo-500 shadow-md"
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                        )}
                      >
                        <MessageSquare size={14} /> Thường
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAnnouncementType('drug_update');
                        }}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2",
                          announcementType === 'drug_update'
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                        )}
                      >
                        <Pill size={14} /> Cập nhật thuốc
                      </button>
                    </div>
                  </div>

                  {/* Chọn thuốc (nếu là cập nhật thuốc) */}
                  {announcementType === 'drug_update' && (
                    <div className="space-y-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                        <Search size={12} /> Chọn thuốc đã cập nhật
                      </label>
                      
                      <div className="relative">
                        <input
                          type="text"
                          value={drugSearchQuery}
                          onChange={(e) => setDrugSearchQuery(e.target.value)}
                          placeholder="Tìm thuốc theo tên..."
                          className={cn(
                            "w-full px-4 py-2.5 pl-10 rounded-xl border-2 outline-none font-medium text-xs transition-all",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-emerald-500" : "bg-white border-slate-200 text-slate-900 focus:border-emerald-500"
                          )}
                        />
                        <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      </div>

                      {/* Hiển thị thuốc đã chọn */}
                      {selectedDrugId && (
                        <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold gap-2">
                          <span className="truncate">Đã chọn: {selectedDrugName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDrugId('');
                              setSelectedDrugName('');
                            }}
                            className="p-1 hover:bg-emerald-500/20 rounded-lg shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* Danh sách kết quả tìm kiếm thuốc */}
                      {drugSearchQuery.trim() && (
                        <div className={cn(
                          "max-h-[150px] overflow-y-auto custom-scrollbar rounded-xl border divide-y text-xs font-bold",
                          isDarkMode ? "bg-slate-800 border-slate-700 divide-slate-700" : "bg-white border-slate-200 divide-slate-100"
                        )}>
                          {drugsList
                            .filter(d => d.name?.toLowerCase().includes(drugSearchQuery.toLowerCase()))
                            .slice(0, 5)
                            .map(drug => (
                              <button
                                key={drug.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDrugId(drug.id);
                                  setSelectedDrugName(drug.name);
                                  setDrugSearchQuery('');
                                  setNewAnnouncement(
                                    `Đã cập nhật thông tin mới (về liều dùng, hướng dẫn, cảnh báo tương tác, ADR...) cho thuốc **${drug.name}**. Kính mời các đồng nghiệp cập nhật thông tin để ứng dụng an toàn.`
                                  );
                                }}
                                className={cn(
                                  "w-full px-4 py-2.5 text-left hover:bg-emerald-500/5 transition-colors block text-[11px]",
                                  isDarkMode ? "text-slate-200" : "text-slate-700"
                                )}
                              >
                                {drug.name}
                              </button>
                            ))}
                          {drugsList.filter(d => d.name?.toLowerCase().includes(drugSearchQuery.toLowerCase())).length === 0 && (
                            <div className="px-4 py-3 text-slate-500 text-center text-[10px]">
                              Không tìm thấy thuốc khớp
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tiêu đề thông báo */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                      <Type size={12} /> Tiêu đề thông báo (Không bắt buộc)
                    </label>
                    <input
                      type="text"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      placeholder="Nhập tiêu đề thông báo..."
                      className={cn(
                        "w-full px-5 py-3 rounded-2xl border-2 outline-none font-semibold text-xs transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-indigo-500 shadow-inner"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                      <FileText size={12} /> Nội dung thông báo
                    </label>
                    <textarea
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="Nhập nội dung thông báo cho toàn bộ nhân viên..."
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl border-2 min-h-[150px] outline-none font-medium text-sm resize-none transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-indigo-500 shadow-inner"
                      )}
                    />
                  </div>

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

                  {/* Nơi hiển thị */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                      <Layout size={12} /> Nơi xuất hiện thông báo
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowInWorkspace(prev => !prev)}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2 relative overflow-hidden",
                          showInWorkspace
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20 font-black scale-[1.01]"
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400" : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600")
                        )}
                      >
                        <LayoutGrid size={14} />
                        Workspace
                        {showInWorkspace ? (
                          <span className="px-1.5 py-0.5 text-[8px] bg-indigo-500 text-white rounded font-extrabold uppercase tracking-wider">Bật</span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[8px] bg-slate-500/20 text-slate-400 dark:text-slate-600 rounded font-extrabold uppercase tracking-wider">Tắt</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInHeader(prev => !prev)}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2 relative overflow-hidden",
                          showInHeader
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20 font-black scale-[1.01]"
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400" : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600")
                        )}
                      >
                        <MessageSquare size={14} />
                        Hộp thông báo
                        {showInHeader ? (
                          <span className="px-1.5 py-0.5 text-[8px] bg-indigo-500 text-white rounded font-extrabold uppercase tracking-wider">Bật</span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[8px] bg-slate-500/20 text-slate-400 dark:text-slate-600 rounded font-extrabold uppercase tracking-wider">Tắt</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={addAnnouncement}
                    disabled={isSavingAnnouncement || !newAnnouncement.trim() || (announcementType === 'drug_update' && !selectedDrugId)}
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
                <div className="space-y-4">
                  {announcements.length > 0 ? (
                    announcements.map((ann) => {
                      const categoryInfo = (() => {
                        if (ann.type === 'drug_update') {
                          return {
                            label: '🟡 Cập nhật thuốc',
                            icon: Pill,
                            color: 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 border-amber-500/20'
                          };
                        }
                        const contentLower = (ann.content || '').toLowerCase();
                        const titleLower = (ann.title || '').toLowerCase();
                        if (
                          contentLower.includes('cảnh báo') || contentLower.includes('adr') || contentLower.includes('chống chỉ định') ||
                          titleLower.includes('cảnh báo') || titleLower.includes('adr') || titleLower.includes('chống chỉ định')
                        ) {
                          return {
                            label: '🔴 Cảnh báo lâm sàng',
                            icon: ShieldAlert,
                            color: 'bg-rose-500/15 text-rose-500 dark:bg-rose-500/20 border-rose-500/20'
                          };
                        }
                        if (
                          contentLower.includes('bộ y tế') || contentLower.includes('who') || contentLower.includes('tin tức') || 
                          contentLower.includes('icd-10') || contentLower.includes('hướng dẫn điều trị') ||
                          titleLower.includes('bộ y tế') || titleLower.includes('who') || titleLower.includes('y khoa')
                        ) {
                          return {
                            label: '🔵 Tin tức y học',
                            icon: FileText,
                            color: 'bg-sky-500/15 text-sky-500 dark:bg-sky-500/20 border-sky-500/20'
                          };
                        }
                        if (
                          contentLower.includes('phiên bản') || contentLower.includes('đồng bộ') || contentLower.includes('hệ thống') || 
                          contentLower.includes('sao lưu') || titleLower.includes('phiên bản') || titleLower.includes('hệ thống')
                        ) {
                          return {
                            label: '⚙️ Hệ thống',
                            icon: Settings,
                            color: 'bg-slate-500/15 text-slate-400 dark:bg-slate-500/20 border-slate-500/20'
                          };
                        }
                        return {
                          label: '🔵 Thông báo',
                          icon: MessageSquare,
                          color: 'bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 border-indigo-500/20'
                        };
                      })();

                      const Icon = categoryInfo.icon;

                      return (
                        <div key={ann.id} className={cn(
                          "p-6 rounded-3xl border-2 transition-all relative group flex flex-col gap-3",
                          isDarkMode ? "bg-slate-800/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-50 hover:border-indigo-100"
                        )}>
                          <div className="flex gap-4">
                            <div className={cn("p-2 rounded-xl shrink-0 h-fit border", categoryInfo.color)}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-1">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[8px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-0.5">
                                    {categoryInfo.label}
                                  </span>
                                  <h4 className={cn("font-extrabold text-sm leading-tight", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                                    {ann.title || (ann.type === 'drug_update' ? `Cập nhật thuốc: ${ann.drugName || 'Thuốc'}` : 'Thông báo')}
                                  </h4>
                                </div>
                                
                                <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-all">
                                  <button
                                    onClick={() => startEditingAnnouncement(ann)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
                                    title="Chỉnh sửa thông báo"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteAnnouncement(ann.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                    title="Xóa thông báo"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <p className={cn("text-xs font-semibold leading-relaxed whitespace-pre-wrap mt-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                {ann.content}
                              </p>
                              
                              <div className="mt-4 flex flex-wrap gap-1.5 items-center">
                                {/* Target Roles & Titles */}
                                {ann.targetRoles && ann.targetRoles.map((r: string, rIdx: number) => (
                                  <span key={`${r}-${rIdx}`} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-widest border border-indigo-500/10">
                                    {roles.find(role => role.id === r)?.name || r}
                                  </span>
                                ))}
                                {ann.targetTitles && ann.targetTitles.map((t: string, tIdx: number) => (
                                  <span key={`${t}-${tIdx}`} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest border border-blue-500/10">
                                    {t}
                                  </span>
                                ))}
                                {!ann.targetRoles && !ann.targetTitles && (
                                  <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[8px] font-black uppercase tracking-widest border border-slate-500/10">
                                    Tất cả người dùng
                                  </span>
                                )}

                                {/* Location */}
                                <div className="ml-auto flex items-center gap-2">
                                  {ann.showInWorkspace !== false && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-extrabold uppercase tracking-wider border border-emerald-500/10">
                                      Workspace
                                    </span>
                                  )}
                                  {ann.showInHeader !== false && (
                                    <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[8px] font-extrabold uppercase tracking-wider border border-violet-500/10">
                                      Hộp thông báo
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-dashed border-slate-500/10 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  Gửi lúc: {new Date(ann.createdAt).toLocaleString('vi-VN')}
                                </span>
                                {ann.updatedAt && (
                                  <span className="text-amber-500 flex items-center gap-1">
                                    <Edit3 size={10} />
                                    Cập nhật: {new Date(ann.updatedAt).toLocaleString('vi-VN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
          )}

          {activeCategory === 'general' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={cn(
                  "p-6 rounded-[32px] border transition-all",
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
                      <span className="font-black text-xs">v1.2.0-stable</span>
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
                  "p-6 rounded-[32px] border transition-all",
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
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-[12px]",
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
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-[12px]",
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
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-[12px]",
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
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-normal outline-none resize-none text-[12px]",
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
                  <AutoExpandingTextarea
                    rows={8}
                    className={cn(
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-normal outline-none resize-none min-h-[200px] text-[12px]",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-700" : "bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-300"
                    )}
                    placeholder="Nhập nội dung điều khoản sử dụng ứng dụng..."
                    value={editSettings.termsOfUse || ''}
                    onChange={(e) => setEditSettings({ ...editSettings, termsOfUse: (e.target as HTMLTextAreaElement).value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Ngày cập nhật điều khoản</label>
                  <input
                    type="date"
                    className={cn(
                      "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-normal outline-none text-[12px]",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                    )}
                    value={editSettings.termsUpdateDate || ''}
                    onChange={(e) => setEditSettings({ ...editSettings, termsUpdateDate: e.target.value })}
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
                      Sáng
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
                      Tối
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
                  {saveSuccess ? 'Đã lưu' : 'Lưu'}
                </button>
              </div>
            </div>
            </div>
          )}

          {activeCategory === 'guide' && (
            <div className="space-y-8">
              {/* Help & Guide Sub Tabs */}
              <div className={cn(
                "flex items-center gap-2 p-1.5 rounded-3xl w-fit border backdrop-blur-md mb-8",
                isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-100/80 border-slate-200"
              )}>
                <button
                  onClick={() => setGuideSubTab('icd10')}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all",
                    guideSubTab === 'icd10'
                      ? (isDarkMode ? "bg-slate-700 text-white shadow-lg" : "bg-white text-slate-900 shadow-lg shadow-slate-200/50")
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                  )}
                >
                  <ClipboardList size={14} />
                  Tra cứu ICD-10
                </button>
              </div>

              {guideSubTab === 'icd10' && (
                <div className={cn(
                  "p-6 sm:p-10 rounded-[2.5rem] border transition-all",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-2xl shadow-slate-200/30"
                )}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-slate-950 bg-gradient-to-br from-amber-400 to-yellow-300 shadow-lg"
                    )}>
                      <ClipboardList size={22} />
                    </div>
                    <div>
                      <h3 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                        Cấu hình bài viết Hướng dẫn Tra cứu ICD-10
                      </h3>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                        Cung cấp thông tin trợ giúp khi người dùng click xem hướng dẫn tại tính năng ICD-10
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Article Title */}
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tiêu đề bài viết</label>
                      <input
                        type="text"
                        value={guideTitle}
                        onChange={(e) => setGuideTitle(e.target.value)}
                        placeholder="Nhập tiêu đề hướng dẫn..."
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl border-2 transition-all font-bold text-base outline-none focus:ring-0",
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:border-amber-500" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-amber-500"
                        )}
                      />
                    </div>

                    {/* Manage Internal Content Tabs */}
                    <div className="space-y-4 pt-4 border-t border-dashed border-slate-100/10">
                      <div>
                        <h4 className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>Các Tab Nội Dung Bài Viết</h4>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">
                          Tạo các tab khác nhau để phân chia nội dung hướng dẫn gọn gàng và khoa học.
                        </p>
                      </div>

                      {/* Add New Tab */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newContentTabTitle}
                          onChange={(e) => setNewContentTabTitle(e.target.value)}
                          placeholder="Nhập tiêu đề tab mới (ví dụ: Chỉ dẫn chung)..."
                          className={cn(
                            "flex-1 px-4 py-3 rounded-xl border-2 transition-all font-medium text-xs outline-none focus:ring-0",
                            isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:border-amber-500" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-amber-500"
                          )}
                        />
                        <button
                          onClick={() => {
                            if (!newContentTabTitle.trim()) return;
                            const newTabId = `tab-${Date.now()}`;
                            const updated = [...guideTabs, { id: newTabId, title: newContentTabTitle.trim(), paragraphs: [] }];
                            setGuideTabs(updated);
                            setNewContentTabTitle('');
                            setSelectedContentTabIndex(updated.length - 1);
                          }}
                          className="px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Plus size={14} /> Thêm Tab mới
                        </button>
                      </div>

                      {/* Tab List buttons to select active tab */}
                      {guideTabs.length > 0 ? (
                        <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-slate-100/10 border border-slate-100/5">
                          {guideTabs.map((t, idx) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedContentTabIndex(idx)}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border",
                                selectedContentTabIndex === idx
                                  ? (isDarkMode ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-amber-50 border-amber-300 text-amber-700 shadow-sm")
                                  : (isDarkMode ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-white border-slate-150 text-slate-500 hover:text-slate-800")
                              )}
                            >
                              <span>{t.title}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = guideTabs.filter((_, i) => i !== idx);
                                  setGuideTabs(updated);
                                  if (selectedContentTabIndex >= updated.length) {
                                    setSelectedContentTabIndex(Math.max(0, updated.length - 1));
                                  }
                                }}
                                className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-slate-400 transition-colors"
                                title="Xóa Tab"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-6 text-xs font-bold text-slate-500 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl">
                          Chưa có tab nội dung nào. Vui lòng thêm một tab mới ở trên.
                        </div>
                      )}
                    </div>

                    {/* Manage Paragraphs inside the Selected Tab */}
                    {guideTabs.length > 0 && selectedContentTabIndex < guideTabs.length && (
                      <div className="space-y-4 pt-4 border-t border-dashed border-slate-100/10">
                        <div>
                          <h4 className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                            Đoạn văn trong Tab: <span className="text-amber-500">"{guideTabs[selectedContentTabIndex].title}"</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold mt-1">
                            Mỗi bài viết có nhiều đoạn văn (paragraphs). Hãy nhập nội dung chi tiết bên dưới.
                          </p>
                        </div>

                        {/* List of existing paragraphs in this tab */}
                        <div className="space-y-3">
                          {guideTabs[selectedContentTabIndex].paragraphs.map((p, pIdx) => (
                            <div key={pIdx} className="flex gap-3 items-start">
                              <span className="w-6 h-6 mt-2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black flex items-center justify-center shrink-0 text-slate-400">
                                {pIdx + 1}
                              </span>
                              <textarea
                                value={p}
                                onChange={(e) => {
                                  const updatedTabs = [...guideTabs];
                                  updatedTabs[selectedContentTabIndex].paragraphs[pIdx] = e.target.value;
                                  setGuideTabs(updatedTabs);
                                }}
                                rows={2}
                                className={cn(
                                  "flex-1 px-4 py-3 rounded-xl border-2 transition-all font-medium text-xs outline-none focus:ring-0 resize-y",
                                  isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:border-amber-500" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-amber-500"
                                )}
                              />
                              <button
                                onClick={() => {
                                  const updatedTabs = [...guideTabs];
                                  updatedTabs[selectedContentTabIndex].paragraphs = updatedTabs[selectedContentTabIndex].paragraphs.filter((_, i) => i !== pIdx);
                                  setGuideTabs(updatedTabs);
                                }}
                                className="mt-1 p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Xóa đoạn này"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add New Paragraph */}
                        <div className="space-y-2 pt-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Thêm đoạn mới</label>
                          <div className="flex gap-3 items-end">
                            <textarea
                              value={newParagraphText}
                              onChange={(e) => setNewParagraphText(e.target.value)}
                              placeholder="Nhập nội dung cho đoạn mới này..."
                              rows={3}
                              className={cn(
                                "flex-1 px-4 py-3 rounded-xl border-2 transition-all font-medium text-xs outline-none focus:ring-0 resize-y",
                                isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:border-amber-500" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-amber-500"
                              )}
                            />
                            <button
                              onClick={() => {
                                if (!newParagraphText.trim()) return;
                                const updatedTabs = [...guideTabs];
                                updatedTabs[selectedContentTabIndex].paragraphs.push(newParagraphText.trim());
                                setGuideTabs(updatedTabs);
                                setNewParagraphText('');
                              }}
                              className="px-5 py-3 bg-slate-850 hover:bg-slate-700 text-white hover:text-amber-400 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-colors self-stretch"
                            >
                              <Plus size={14} /> Thêm đoạn
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className={cn(
                      "pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 mt-8",
                      isDarkMode ? "border-slate-800" : "border-slate-100"
                    )}>
                      <div className="text-[10px] text-slate-500 font-medium">
                        * Nhớ nhấn nút lưu bên dưới để cập nhật bài viết lên cơ sở dữ liệu đám mây.
                      </div>
                      
                      <div className="flex justify-end items-center gap-4 w-full sm:w-auto">
                        <AnimatePresence>
                          {saveGuideSuccess && (
                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="flex items-center gap-2 text-emerald-500 font-bold text-sm"
                            >
                              <CheckCircle2 size={16} />
                              Đã lưu bài viết!
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <button
                          onClick={handleSaveGuide}
                          disabled={isSavingGuide}
                          className={cn(
                            "px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50",
                            saveGuideSuccess
                              ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20"
                              : "bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/20 hover:bg-amber-600"
                          )}
                        >
                          {isSavingGuide ? <Loader2 size={20} className="animate-spin" /> : (saveGuideSuccess ? <CheckCircle2 size={20} /> : <Save size={20} />)}
                          {saveGuideSuccess ? 'Đã lưu' : 'Lưu bài viết'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeCategory === 'version' && (
            <div className="-m-4 lg:-m-10">
              <VersionManagement 
                isDarkMode={isDarkMode || false} 
                userRole={userRole} 
                uid={uid} 
              />
            </div>
          )}
          
          {activeCategory === 'theme' && (
            <ThemeSettings
              isDarkMode={isDarkMode}
              editSettings={editSettings}
              setEditSettings={setEditSettings}
              onSave={handleSaveSettings}
              isSaving={isSavingSettings}
              saveSuccess={saveSuccess}
            />
          )}
          
          {activeCategory === 'features' && (
            <AnimatePresence mode="wait">
              {selectedFeatureForDetail ? (
                <div key="detail">
                  {renderFeatureDetailContent()}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className={cn(
                    "flex items-center gap-1.5 p-1.5 rounded-3xl w-fit border backdrop-blur-md mb-8",
                    isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-100/80 border-slate-200"
                  )}>
                    {[
                      { id: 'all', label: 'Tất cả mục', icon: LayoutGrid },
                      { id: 'features_main', label: 'Tính năng chính', icon: Wrench },
                      { id: 'utilities', label: 'Tiện ích mở rộng', icon: Sparkles }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setFeatureCategoryFilter(cat.id as any)}
                        className={cn(
                          "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                          featureCategoryFilter === cat.id
                            ? (isDarkMode ? "bg-white text-slate-900 shadow-xl" : "bg-white text-primary shadow-xl shadow-slate-200")
                            : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                        )}
                      >
                        <cat.icon size={14} />
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "p-4 sm:p-8 rounded-[32px] border transition-all",
                      isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                    )}
                  >
                    <div className="space-y-6">
                      {featureStateGroups.map(group => {
                        const featuresInGroup = sortedFeatures.filter(feature => {
                          const statusMatch = (featureStates[feature.id] || 'open') === group.id;
                          if (!statusMatch) return false;

                          if (featureCategoryFilter === 'features_main') {
                            return ['dashboard', 'view_directory', 'view_icd10', 'view_interaction', 'view_adr', 'view_patients', 'view_prescription', 'view_doc_lookup'].includes(feature.id);
                          }
                          if (featureCategoryFilter === 'utilities') {
                            return ['view_calendar', 'view_notes', 'view_social'].includes(feature.id);
                          }
                          return true;
                        });

                        return (
                          <div key={group.id} className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <h4 className={cn("text-[11px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                {group.label}
                              </h4>
                              <span className={cn("text-[10px] font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                                {featuresInGroup.length} mục
                              </span>
                            </div>
                            {featuresInGroup.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                                {featuresInGroup.map(renderFeatureCard)}
                              </div>
                            ) : (
                              <div className={cn(
                                "rounded-2xl border px-4 py-6 text-center text-xs font-bold",
                                isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
                              )}>
                                {group.emptyText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          )}
          
          {activeCategory === 'registration' && (
            <div className="space-y-6">
              {/* Registration Sub-tabs */}
              <div className={cn(
                "flex items-center overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl w-full sm:w-fit border backdrop-blur-md mb-8 max-w-full",
                isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-100/80 border-slate-200"
              )}>
                {[
                  { id: 'pending', label: 'Duyệt tài khoản', icon: ShieldAlert },
                  { id: 'settings', label: 'Cấu hình đăng ký', icon: Settings },
                  { id: 'history', label: 'Lịch sử', icon: History },
                  { id: 'guest_history', label: 'Lịch sử khách', icon: Globe },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRegSubTab(tab.id as any)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all shrink-0 sm:shrink",
                      regSubTab === tab.id
                        ? (isDarkMode ? "bg-white text-slate-900 shadow-xl" : "bg-white text-primary shadow-xl shadow-slate-200")
                        : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                    )}
                  >
                    <tab.icon size={14} className="sm:w-4 sm:h-4 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.id === 'pending' && pendingUsers.length > 0 && (
                      <span className="bg-rose-500 text-white w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow-lg shadow-rose-500/20 shrink-0">
                        {pendingUsers.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {regSubTab === 'pending' && (
                  <motion.div
                    key="pending"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "p-4 sm:p-8 rounded-[24px] sm:rounded-[32px] border-2 transition-all",
                      isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                    )}
                  >
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <ShieldAlert size={18} className={pendingUsers.length > 0 ? "text-amber-500" : "text-emerald-500"} />
                      Danh sách cần phê duyệt ({pendingUsers.length})
                    </h3>
                    {pendingUsers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingUsers.map(user => (
                          <div key={user.uid} className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 rounded-2xl border transition-all",
                            isDarkMode ? "bg-slate-800/50 border-slate-700 hover:border-indigo-500/50" : "bg-slate-50 border-slate-100 hover:border-indigo-200"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-black text-lg shrink-0">
                                {user.displayName?.[0] || user.email?.[0] || 'U'}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-sm font-bold truncate", isDarkMode ? "text-white" : "text-slate-900")}>{user.displayName}</p>
                                <p className="text-[10px] text-slate-500 font-medium truncate">{user.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => approveUser(user)}
                              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={16} /> Duyệt
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 size={32} className="text-emerald-500" />
                        </div>
                        <p className="text-slate-500 font-bold">Không có yêu cầu đăng ký nào đang chờ.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {regSubTab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <div className={cn(
                      "p-4 sm:p-8 rounded-[24px] sm:rounded-[32px] border-2 transition-all",
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
                            onClick={() => {
                              if (!regSettings.allowNewRegistration) {
                                setIsRegConfirmOpen(true);
                              } else {
                                updateRegSettings({ ...regSettings, allowNewRegistration: false });
                              }
                            }}
                            className={cn(
                              "w-12 h-6 rounded-full p-1 transition-all relative",
                              regSettings.allowNewRegistration ? "bg-indigo-600" : "bg-slate-400"
                            )}
                          >
                            <div className={cn("w-4 h-4 rounded-full bg-white transition-all transform", regSettings.allowNewRegistration ? "translate-x-6" : "translate-x-0")} />
                          </button>
                        </div>

                        {!regSettings.allowNewRegistration && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 ml-1 flex items-center gap-2">
                              <AlertTriangle size={12} /> Lí do tạm dừng đăng ký
                            </label>
                            <AutoExpandingTextarea
                              className={cn(
                                "w-full px-4 py-3 rounded-xl border-2 outline-none font-medium text-sm transition-all resize-none",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-rose-500" : "bg-white border-slate-100 text-slate-900 focus:border-rose-500 shadow-sm"
                              )}
                              placeholder="Nhập lí do thông báo cho người dùng (Ví dụ: Hệ thống đang bảo trì, hoặc đã đủ số lượng nhân sự...)"
                              value={regSettings.registrationDisabledReason || ''}
                              onChange={(e) => setRegSettings({ ...regSettings, registrationDisabledReason: (e.target as HTMLTextAreaElement).value })}
                              onBlur={() => updateRegSettings(regSettings)}
                            />
                            <p className="text-[9px] text-slate-400 font-bold italic ml-1">Thông báo này sẽ hiển thị thay thế nút Đăng nhập khi đăng ký bị khóa.</p>
                          </div>
                        )}

                        <div className={cn(
                          "flex items-center justify-between p-4 rounded-2xl transition-colors",
                          isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
                        )}>
                          <div>
                            <p className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Tự động phê duyệt</p>
                            <p className="text-[10px] text-slate-500 font-medium tracking-tight">Tự động duyệt khi email đã được xác thực</p>
                          </div>
                          <button
                            onClick={() => updateRegSettings({ ...regSettings, autoApprove: !regSettings.autoApprove })}
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
                            onChange={(e) => updateRegSettings({ ...regSettings, defaultRoleId: e.target.value })}
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
                            onChange={(e) => updateRegSettings({ ...regSettings, defaultTitleId: e.target.value })}
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
                      "p-4 sm:p-8 rounded-[24px] sm:rounded-[32px] border-2 transition-all flex flex-col items-center justify-center text-center",
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
                  </motion.div>
                )}

                {regSubTab === 'history' && (() => {
                  const filteredAuthLogs = authLogs.filter((log) => {
                    if (historyActionFilter !== 'all' && log.type !== historyActionFilter) {
                      return false;
                    }
                    if (historySearchQuery.trim() !== '') {
                      const q = historySearchQuery.toLowerCase();
                      return (
                        (log.userName || '').toLowerCase().includes(q) ||
                        (log.userEmail || '').toLowerCase().includes(q) ||
                        (log.ipAddress || '').toLowerCase().includes(q) ||
                        (log.macAddress || '').toLowerCase().includes(q) ||
                        (log.device || '').toLowerCase().includes(q)
                      );
                    }
                    return true;
                  });

                  return (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      {/* Lịch sử Đăng nhập/Đăng xuất */}
                      <div className={cn(
                        "p-6 sm:p-8 rounded-[32px] border transition-all space-y-8",
                        isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                      )}>
                        <div className="flex items-center justify-between px-1">
                          <div className="space-y-1">
                            <h3 className={cn("text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                              Lịch sử Đăng nhập/Đăng xuất
                            </h3>
                            <p className={cn("text-sm font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              Theo dõi hoạt động truy cập hệ thống (Tối đa 50 bản ghi gần nhất)
                            </p>
                          </div>
                          <div className={cn(
                            "p-4 rounded-2xl",
                            isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-600"
                          )}>
                            <History size={24} />
                          </div>
                        </div>

                        {/* Bộ Lọc */}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-3xl bg-slate-500/5">
                          {/* Ô tìm kiếm */}
                          <div className="relative w-full md:w-80">
                            <input
                              type="text"
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              placeholder="Tìm tên, email, IP, MAC, thiết bị..."
                              className={cn(
                                "w-full pl-10 pr-9 py-3 rounded-2xl text-[12px] font-bold outline-none transition-all border-none focus:ring-2 focus:ring-blue-500",
                                isDarkMode ? "bg-slate-800 text-white placeholder-slate-500" : "bg-slate-100 text-slate-900 placeholder-slate-400 shadow-sm"
                              )}
                            />
                            <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                            {historySearchQuery && (
                              <button
                                onClick={() => setHistorySearchQuery('')}
                                className={cn(
                                  "absolute right-3.5 top-3 text-[11px] font-black tracking-widest text-slate-400 transition-colors",
                                  isDarkMode ? "hover:text-slate-200" : "hover:text-slate-650"
                                )}
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Bộ lọc Hành động */}
                          <div className={cn(
                            "flex p-1 rounded-2xl w-full md:w-auto",
                            isDarkMode ? "bg-slate-800/80" : "bg-slate-200/40"
                          )}>
                            <button
                              type="button"
                              onClick={() => setHistoryActionFilter('all')}
                              className={cn(
                                "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all",
                                historyActionFilter === 'all'
                                  ? (isDarkMode ? "bg-slate-700 text-white" : "bg-white text-slate-950 shadow-sm")
                                  : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                              )}
                            >
                              Tất cả ({authLogs.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryActionFilter('login')}
                              className={cn(
                                "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all",
                                historyActionFilter === 'login'
                                  ? (isDarkMode ? "bg-slate-700 text-white" : "bg-white text-slate-950 shadow-sm")
                                  : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                              )}
                            >
                              Đăng nhập ({authLogs.filter(l => l.type === 'login').length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryActionFilter('logout')}
                              className={cn(
                                "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all",
                                historyActionFilter === 'logout'
                                  ? (isDarkMode ? "bg-slate-700 text-white" : "bg-white text-slate-950 shadow-sm")
                                  : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                              )}
                            >
                              Đăng xuất ({authLogs.filter(l => l.type === 'logout').length})
                            </button>
                          </div>
                        </div>

                        <div className={cn(
                          "rounded-3xl border overflow-hidden transition-all",
                          isDarkMode ? "bg-slate-900 border-slate-800 shadow-none" : "bg-white border-slate-100 shadow-xl shadow-slate-200/20"
                        )}>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                              <thead>
                                <tr className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-50 text-slate-400")}>
                                  <th className="px-6 py-5 border-b border-transparent">Thời gian</th>
                                  <th className="px-6 py-5 border-b border-transparent">Người dùng</th>
                                  <th className="px-6 py-5 border-b border-transparent">Thiết bị</th>
                                  <th className="px-6 py-5 border-b border-transparent">Địa chỉ IP / MAC</th>
                                  <th className="px-6 py-5 border-b border-transparent">Hành động</th>
                                </tr>
                              </thead>
                              <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
                                {filteredAuthLogs.length > 0 ? filteredAuthLogs.map((log) => (
                                  <tr key={log.id} className={cn("transition-colors", isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50/50")}>
                                    <td className="px-6 py-5 whitespace-nowrap text-[13px] font-bold text-slate-400">
                                      {new Date(log.timestamp).toLocaleString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                      })}
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="flex flex-col">
                                        <span className={cn("text-sm font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                                          {log.userName}
                                        </span>
                                        <span className="text-[11px] text-slate-500 font-bold tracking-tight">
                                          {log.userEmail}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="flex flex-col">
                                        <span className={cn("text-[13px] font-bold tracking-tight", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                          {log.device || 'PC / Chrome Browser'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                      <div className="flex flex-col">
                                        <span className={cn("text-[13px] font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                                          {log.ipAddress || '113.161.45.102'}
                                        </span>
                                        <span className="text-[11px] text-slate-500 font-mono font-bold">
                                          {log.macAddress || 'FC:A1:3E:0C:42:1F'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5">
                                      <span className={cn(
                                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                        log.type === 'login'
                                          ? (isDarkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                                          : (isDarkMode ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600")
                                      )}>
                                        {log.type === 'login' ? <LogIn size={12} /> : <LogOut size={12} />}
                                        {log.type === 'login' ? 'Đăng nhập' : 'Đăng xuất'}
                                      </span>
                                    </td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-xs font-bold text-slate-400 italic">
                                      Chưa có dữ liệu lịch sử đăng nhập/đăng xuất phù hợp với bộ lọc
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {regSubTab === 'guest_history' && (() => {
                  const filteredGuestLogs = guestLogs.filter((log) => {
                    if (guestSearchQuery.trim() !== '') {
                      const q = guestSearchQuery.toLowerCase();
                      return (
                        (log.ipAddress || '').toLowerCase().includes(q) ||
                        (log.macAddress || '').toLowerCase().includes(q) ||
                        (log.device || '').toLowerCase().includes(q) ||
                        (log.userAgent || '').toLowerCase().includes(q)
                      );
                    }
                    return true;
                  });

                  return (
                    <motion.div
                      key="guest_history_tab"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Filter & Action Bar */}
                      <div className={cn(
                        "p-5 rounded-[24px] sm:rounded-[32px] border transition-all flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center",
                        isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                            <Globe size={20} />
                          </div>
                          <div>
                            <h4 className={cn("text-base font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                              Lịch sử truy cập của Khách
                            </h4>
                            <p className={cn("text-xs font-semibold mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              Lưu lại thông tin thiết bị, IP, MAC và thời gian truy cập của khách vãng lai
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 shrink-0 items-stretch sm:items-center">
                          {/* Search Input */}
                          <div className="relative w-full sm:w-64">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Tìm kiếm IP, MAC, thiết bị..."
                              value={guestSearchQuery}
                              onChange={(e) => setGuestSearchQuery(e.target.value)}
                              className={cn(
                                "w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-bold transition-all border outline-none",
                                isDarkMode
                                  ? "bg-slate-950/40 border-slate-800 text-white focus:border-indigo-500"
                                  : "bg-slate-50/50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white"
                              )}
                            />
                          </div>

                          {/* Simulate Guest Log Button */}
                          <button
                            onClick={async () => {
                              try {
                                const logId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
                                const ip = '113.161.' + Math.floor(Math.random() * 254 + 1) + '.' + Math.floor(Math.random() * 254 + 1);
                                const hex = '0123456789ABCDEF';
                                const parts = ['FC', 'A1', '3E'];
                                for (let i = 0; i < 3; i++) {
                                  parts.push(hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)]);
                                }
                                const mac = parts.join(':');
                                const devices = ['iPhone 15 Pro', 'Samsung Galaxy S24 Ultra', 'Windows 11 PC (Chrome)', 'MacBook Pro (Safari)', 'iPad Pro (Chrome)'];
                                const dev = devices[Math.floor(Math.random() * devices.length)];
                                const userAgents = [
                                  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                                  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
                                ];
                                await setDoc(doc(db, 'guest_logs', logId), {
                                  id: logId,
                                  ipAddress: ip,
                                  macAddress: mac,
                                  device: dev,
                                  userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
                                  timestamp: new Date().toISOString()
                                });
                              } catch (e) {
                                console.error("Failed to create mock guest log", e);
                              }
                            }}
                            className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 text-xs font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                          >
                            <Sparkles size={14} />
                            Tạo Log Thử Nghiệm
                          </button>
                          
                          <div className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center gap-2 text-xs font-black">
                            <span className="text-slate-500">Tổng:</span>
                            <span className="text-indigo-600 dark:text-indigo-400">{filteredGuestLogs.length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Informational Alert Box */}
                      <div className={cn(
                        "p-5 rounded-[24px] border flex gap-3 text-xs font-semibold leading-relaxed transition-all",
                        isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50/70 border-amber-100 text-amber-800"
                      )}>
                        <Info size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="font-bold mb-1">💡 Cơ chế lưu và hiển thị thông tin:</p>
                          <ul className="list-disc pl-4 space-y-1 opacity-90">
                            <li>Hệ thống <strong>chỉ ghi nhận tự động</strong> lịch sử ở tab này khi có người dùng truy cập trang web ở trạng thái <strong>chưa đăng nhập (khách vãng lai)</strong>.</li>
                            <li>Vì bạn hiện đang đăng nhập với tư cách là Quản trị viên, các hoạt động của bạn được ghi nhận riêng biệt tại tab <strong>"Lịch sử"</strong>.</li>
                            <li>Để tự mình thử nghiệm tính năng ghi nhận tự động thực tế, bạn hãy <strong>đăng xuất</strong> hoặc truy cập trang web bằng một <strong>cửa sổ ẩn danh (Incognito)</strong>!</li>
                            <li>Bạn có thể bấm nút <strong>"Tạo Log Thử Nghiệm"</strong> ở phía trên để mô phỏng ngay lập tức các truy cập vãng lai từ khách để kiểm tra cấu trúc dữ liệu.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Log List Table */}
                      <div className={cn(
                        "border rounded-[24px] sm:rounded-[32px] overflow-hidden transition-all",
                        isDarkMode ? "bg-slate-900/30 border-slate-800/80" : "bg-white border-slate-100 shadow-xl shadow-slate-200/20"
                      )}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className={cn(
                                "border-b",
                                isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50/50 border-slate-100"
                              )}>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Thời gian</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Thiết bị</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Địa chỉ mạng</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">User Agent</th>
                                {userRole === 'admin' && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Thao tác</th>}
                              </tr>
                            </thead>
                            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
                              {filteredGuestLogs.length > 0 ? filteredGuestLogs.map((log) => (
                                <tr key={log.id} className={cn("transition-colors", isDarkMode ? "hover:bg-slate-800/20" : "hover:bg-slate-50/50")}>
                                  <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-slate-500">
                                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                                  </td>
                                  <td className="px-6 py-5 whitespace-nowrap">
                                    <span className={cn("text-[13px] font-bold tracking-tight", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                      {log.device || 'Thiết bị không xác định'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 whitespace-nowrap">
                                    <div className="flex flex-col">
                                      <span className={cn("text-[13px] font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                                        {log.ipAddress || '127.0.0.1'}
                                      </span>
                                      <span className="text-[11px] text-slate-500 font-mono font-bold">
                                        MAC: {log.macAddress || 'Chưa nhận'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 max-w-xs truncate">
                                    <span className="text-[11px] text-slate-400 font-mono" title={log.userAgent}>
                                      {log.userAgent || 'Không có thông tin'}
                                    </span>
                                  </td>
                                  {userRole === 'admin' && (
                                    <td className="px-6 py-5 whitespace-nowrap text-right">
                                      {deletingGuestLogId === log.id ? (
                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            onClick={async () => {
                                              try {
                                                await deleteDoc(doc(db, 'guest_logs', log.id));
                                                setDeletingGuestLogId(null);
                                              } catch (err) {
                                                console.error("Failed to delete guest log", err);
                                              }
                                            }}
                                            className="px-2 py-1 text-[11px] font-bold rounded bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                                            title="Xác nhận xóa"
                                          >
                                            Xác nhận
                                          </button>
                                          <button
                                            onClick={() => setDeletingGuestLogId(null)}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                                            title="Hủy"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setDeletingGuestLogId(log.id)}
                                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                          title="Xóa bản ghi"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={userRole === 'admin' ? 5 : 4} className="px-6 py-12 text-center text-xs font-bold text-slate-400 italic">
                                    Chưa có dữ liệu lịch sử khách phù hợp với tìm kiếm
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          )}
          
          {/* Final Fallback for HR/Staff */}
          {(activeCategory === 'hr' || activeCategory === 'staff') && (
            <div className={cn(
              "p-6 rounded-[32px] border transition-all",
              effectiveCategory === 'staff' ? "" : (isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30")
            )}>
              {effectiveCategory === 'staff' ? (
                <StaffManagement isDarkMode={!!isDarkMode} canManage={true} />
              ) : effectiveCategory !== 'permissions' ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder={`Thêm ${(HR_SUB_TABS.find(t => t.id === hrSubTab)?.label || categories.find(c => c.id === activeCategory)?.label || '').toLowerCase()} mới...`}
                        className={cn(
                          "w-full pl-5 pr-4 py-4 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-[12px]",
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

                  {effectiveCategory === 'roles' && (
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-2xl mb-2 border",
                      isDarkMode ? "bg-amber-900/10 border-amber-900/30" : "bg-amber-50 border-amber-100"
                    )}>
                      <span className="text-amber-500">⚡</span>
                      <p className={cn("text-[10px] font-bold leading-tight", isDarkMode ? "text-amber-400" : "text-amber-700")}>
                        <b>Điểm quyền lực</b> — Nhập điểm cho từng vai trò. Danh sách tự động sắp xếp từ cao đến thấp.
                      </p>
                    </div>
                  )}

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
                              "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 group transition-all gap-4",
                              isDarkMode ? "bg-slate-800/30 border-slate-800 hover:border-slate-700" : "bg-white border-slate-50 hover:border-blue-100 hover:shadow-lg hover:shadow-slate-200/50"
                            )}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                                isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-50 text-slate-400"
                              )}>
                                {index + 1}
                              </div>
                              {editingItem?.id === item.id ? (
                                <input
                                  type="text"
                                  value={editingItem.name}
                                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                  className={cn(
                                    "flex-1 px-3 py-2 rounded-xl border-2 outline-none font-bold text-sm",
                                    isDarkMode ? "bg-slate-800 border-indigo-500 text-white" : "bg-white border-indigo-500 text-slate-900"
                                  )}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') updateItem(item.id, editingItem.name);
                                    if (e.key === 'Escape') setEditingItem(null);
                                  }}
                                />
                              ) : (
                                <div className="flex flex-col min-w-0">
                                  <span className={cn("font-bold truncate", isDarkMode ? "text-white" : "text-slate-900")}>{item.name}</span>
                                  {effectiveCategory === 'departments' && (
                                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">
                                      {allUsers.filter(u => u.department === item.name).length} nhân sự
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              {editingItem?.id === item.id ? (
                                <>
                                  <button
                                    onClick={() => updateItem(item.id, editingItem.name)}
                                    className="p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                                  >
                                    <Save size={18} />
                                  </button>
                                  <button
                                    onClick={() => setEditingItem(null)}
                                    className="p-2.5 text-slate-400 hover:bg-slate-400/10 rounded-xl transition-all"
                                  >
                                    <X size={18} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {effectiveCategory === 'roles' && (
                                    <div className="flex items-center gap-1.5">
                                      <span className={cn("text-[9px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>⚡</span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={item.powerPoints ?? 0}
                                        onChange={async (e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          try {
                                            await setDoc(doc(db, 'config_roles', item.id), { ...item, powerPoints: val });
                                          } catch (err) {
                                            handleFirestoreError(err, OperationType.UPDATE, `config_roles/${item.id}`);
                                          }
                                        }}
                                        title="Điểm quyền lực"
                                        className={cn(
                                          "w-16 px-2 py-1.5 rounded-lg border text-xs font-black text-center focus:ring-2 focus:ring-amber-500 outline-none transition-all",
                                          isDarkMode ? "bg-slate-900 border-slate-700 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"
                                        )}
                                      />
                                    </div>
                                  )}
                                  <button
                                    onClick={() => setEditingItem({ id: item.id, name: item.name })}
                                    className="p-2.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Edit3 size={18} />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete({ isOpen: true, id: item.id, name: item.name })}
                                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                            </div>
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

          {(effectiveCategory === 'permissions' || effectiveCategory === 'roles') && (
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
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete?.isOpen}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteItem(confirmDelete.id)}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa "${confirmDelete?.name}" khỏi danh sách ${(categories.find(c => c.id === activeCategory)?.label || HR_SUB_TABS.find(t => t.id === hrSubTab)?.label || '').toLowerCase()} không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa mục"
        cancelText="Hủy bỏ"
        type="danger"
        isDarkMode={isDarkMode}
      />


      <ConfirmModal
        isOpen={isTermsConfirmOpen}
        onClose={() => setIsTermsConfirmOpen(false)}
        onConfirm={() => {
          setEditSettings({ ...editSettings, termsOfUse: SAMPLE_TERMS });
          setIsTermsConfirmOpen(false);
        }}
        title="Xác nhận chèn mẫu"
        message="Bạn có muốn chèn mẫu Điều khoản sử dụng chuẩn? Nội dung hiện tại sẽ bị ghi đè."
        confirmText="Đồng ý chèn"
        cancelText="Hủy bỏ"
        type="warning"
        isDarkMode={isDarkMode}
      />

      <ConfirmModal
        isOpen={isRegConfirmOpen}
        onClose={() => setIsRegConfirmOpen(false)}
        onConfirm={() => {
          updateRegSettings({ ...regSettings, allowNewRegistration: true });
          setIsRegConfirmOpen(false);
        }}
        title="Xác nhận mở đăng ký"
        message="Khi bật tính năng này, bất kỳ ai cũng có thể đăng ký tài khoản trên hệ thống. Bạn có chắc chắn muốn công khai việc đăng ký không?"
        confirmText="Bật Công khai"
        cancelText="Hủy"
        type="warning"
        isDarkMode={isDarkMode}
      />

      {/* Edit Announcement Modal */}
      <AnimatePresence>
        {editingAnnouncement && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAnnouncement(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={cn(
                "w-full max-w-2xl rounded-[32px] border-2 overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-100 text-slate-900"
              )}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-500/10 flex justify-between items-center bg-indigo-500/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Edit3 size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">Chỉnh sửa thông báo</h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Cập nhật nội dung và tùy chọn hiển thị cho thông báo này</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingAnnouncement(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                {/* Announcement Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loại thông báo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditType('general')}
                      className={cn(
                        "p-3 rounded-2xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-2",
                        editType === 'general'
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100")
                      )}
                    >
                      <MessageSquare size={14} />
                      Thông báo thường
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType('drug_update')}
                      className={cn(
                        "p-3 rounded-2xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-2",
                        editType === 'drug_update'
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100")
                      )}
                    >
                      <Pill size={14} />
                      Cập nhật thuốc mới
                    </button>
                  </div>
                </div>

                {/* Drug Selection if drug_update */}
                {editType === 'drug_update' && (
                  <div className="space-y-2 p-4 rounded-2xl border border-slate-500/10 bg-slate-500/5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chọn thuốc cập nhật</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Tìm kiếm thuốc..."
                        value={editDrugSearchQuery}
                        onChange={(e) => setEditDrugSearchQuery(e.target.value)}
                        className={cn(
                          "w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                        )}
                      />
                    </div>

                    {editDrugId && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-bold">
                        <span>Đã chọn: {editDrugName}</span>
                        <button
                          type="button"
                          onClick={() => { setEditDrugId(''); setEditDrugName(''); }}
                          className="text-rose-500 hover:bg-rose-500/10 p-1 rounded"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    )}

                    <div className="max-h-36 overflow-y-auto border border-slate-500/10 rounded-xl divide-y divide-slate-500/10 bg-slate-500/5 custom-scrollbar">
                      {drugsList
                        .filter(d => d.name?.toLowerCase().includes(editDrugSearchQuery.toLowerCase()))
                        .slice(0, 50)
                        .map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setEditDrugId(d.id);
                              setEditDrugName(d.name);
                              setEditDrugSearchQuery('');
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-indigo-500/10 transition-all flex justify-between items-center",
                              isDarkMode ? "text-slate-300" : "text-slate-700"
                            )}
                          >
                            <span>{d.name}</span>
                            <span className="text-[9px] text-slate-400 font-normal">{d.activeIngredient}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tiêu đề thông báo (Tùy chọn)</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Nhập tiêu đề hoặc để trống..."
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-100 text-slate-900 placeholder-slate-400"
                    )}
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nội dung thông báo</label>
                  <textarea
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Nhập nội dung thông báo..."
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all custom-scrollbar",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-100 text-slate-900 placeholder-slate-400"
                    )}
                  />
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đối tượng nhận thông báo (Bỏ trống = Tất cả)</label>
                  
                  {/* Roles */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold text-slate-400 block">Theo vai trò:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map(r => {
                        const isSelected = editTargetRoles.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setEditTargetRoles(editTargetRoles.filter(roleId => roleId !== r.id));
                              } else {
                                setEditTargetRoles([...editTargetRoles, r.id]);
                              }
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border",
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100")
                            )}
                          >
                            {r.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Titles */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] font-extrabold text-slate-400 block">Theo chức danh:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {titles.map(t => {
                        const isSelected = editTargetTitles.includes(t.name);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setEditTargetTitles(editTargetTitles.filter(titleName => titleName !== t.name));
                              } else {
                                setEditTargetTitles([...editTargetTitles, t.name]);
                              }
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border",
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600"
                                : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100")
                            )}
                          >
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Display Locations */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nơi hiển thị thông báo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditShowInWorkspace(prev => !prev)}
                      className={cn(
                        "p-3 rounded-2xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-2",
                        editShowInWorkspace
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400" : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600")
                      )}
                    >
                      <LayoutGrid size={14} />
                      Màn hình Workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditShowInHeader(prev => !prev)}
                      className={cn(
                        "p-3 rounded-2xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-2",
                        editShowInHeader
                          ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20"
                          : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400" : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600")
                      )}
                    >
                      <MessageSquare size={14} />
                      Hộp thông báo Header
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-slate-500/10 flex items-center justify-end gap-3 bg-slate-500/5">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl font-bold text-xs transition-all",
                    isDarkMode ? "text-slate-400 hover:text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                  )}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={saveAnnouncementEdit}
                  disabled={isSavingAnnouncementEdit || !editContent.trim() || (editType === 'drug_update' && !editDrugId)}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-extrabold text-xs rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {isSavingAnnouncementEdit ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
    </>
  );
};

export default SystemConfig;
