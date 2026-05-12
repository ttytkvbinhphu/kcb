import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Trash2, Save, X, Loader2, Briefcase, GraduationCap, Award, ShieldCheck, Lock, CheckCircle2, LayoutGrid, ChevronRight, Info, Globe, Moon, Sun, Cpu, Database, Users, Activity, Eye, EyeOff, Wrench, FileText, Calendar, MessageSquare, Pill, ClipboardList, ShieldAlert, AlertTriangle, History, Search, ArrowLeft, LogIn, LogOut, Calculator, Building2, ListTodo, Edit3, UserCheck, Image as ImageIcon, Layout, MousePointer2, AlignLeft, AlignCenter, AlignRight, Columns, Maximize, LayoutTemplate, Type, Square } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, handleFirestoreError, OperationType, query, where, getDocs, orderBy, limit } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SystemSettings, UserProfile, AuthLog } from '../types';
import ThemeSettings from './ThemeSettings';
import ConfirmModal from './ConfirmModal';
import StaffManagement from './StaffManagement';

const PRESET_LAYOUTS = [
  {
    id: 'center-title',
    name: 'Tiêu đề giữa',
    icon: AlignCenter,
    elements: [
      { id: 't1', type: 'text', content: 'TIÊU ĐỀ CHÀO MỪNG', x: 50, y: 45, style: { fontSize: '48px', color: '#1e293b', fontWeight: '900', textAlign: 'center', fontFamily: 'Inter' } },
      { id: 't2', type: 'text', content: 'Mô tả ngắn gọn về tính năng hoặc thông báo quan trọng tại đây', x: 50, y: 60, style: { fontSize: '18px', color: '#64748b', fontWeight: '500', textAlign: 'center', fontFamily: 'Inter' } }
    ]
  },
  {
    id: 'split-right',
    name: 'Ảnh phải',
    icon: Columns,
    elements: [
      { id: 't1', type: 'text', content: 'TÍNH NĂNG MỚI', x: 10, y: 40, style: { fontSize: '42px', color: '#4f46e5', fontWeight: '900', textAlign: 'left', fontFamily: 'Inter' } },
      { id: 't2', type: 'text', content: 'Hệ thống đã cập nhật giao diện quản lý mới tối ưu hơn cho thiết bị di động.', x: 10, y: 55, style: { fontSize: '16px', color: '#475569', fontWeight: '500', textAlign: 'left', fontFamily: 'Inter' } },
      { id: 'i1', type: 'image', content: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000', x: 75, y: 50, w: '450px' }
    ]
  },
  {
    id: 'split-left',
    name: 'Ảnh trái',
    icon: LayoutTemplate,
    elements: [
      { id: 'i1', type: 'image', content: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000', x: 25, y: 50, w: '450px' },
      { id: 't1', type: 'text', content: 'KẾT QUẢ ĐIỀU TRỊ', x: 55, y: 40, style: { fontSize: '38px', color: '#059669', fontWeight: '900', textAlign: 'left', fontFamily: 'Inter' } },
      { id: 't2', type: 'text', content: 'Theo dõi tiến độ và lịch sử khám bệnh của bệnh nhân một cách trực quan.', x: 55, y: 55, style: { fontSize: '16px', color: '#475569', fontWeight: '500', textAlign: 'left', fontFamily: 'Inter' } }
    ]
  },
  {
    id: 'hero-overlay',
    name: 'Tràn viền',
    icon: Maximize,
    elements: [
      { id: 'i1', type: 'image', content: 'https://images.unsplash.com/photo-1576091160550-2173bdb999ef?q=80&w=1200', x: 50, y: 50, w: '1280px' },
      { id: 't1', type: 'text', content: 'CHÀO MỪNG BẠN QUAY LẠI', x: 50, y: 85, style: { fontSize: '32px', color: '#ffffff', fontWeight: '900', textAlign: 'center', fontFamily: 'Inter' } }
    ]
  }
];

// Helper to convert Google Drive links to direct image URLs
const getDirectImageUrl = (url: string) => {
  if (!url) return '';
  const driveMatch = url.match(/\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }
  return url;
};

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

import WelcomeSlider from './WelcomeSlider';

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
  { id: 'dashboard', label: 'Workspace' },
  { id: 'view_directory', label: 'Tra cứu thuốc' },
  { id: 'view_icd10', label: 'Tra cứu ICD-10' },
  { id: 'view_interaction', label: 'Tra cứu tương tác thuốc' },
  { id: 'view_adr', label: 'Tra cứu ADR' },
  { id: 'view_patients', label: 'Tra cứu bệnh nhân' },
  { id: 'view_prescription', label: 'Kê toa thử' },
  { id: 'view_todo', label: 'Việc cần làm' },
];

const ALL_FEATURES = [
  { id: 'dashboard', label: 'Workspace', icon: LayoutGrid, desc: 'Màn hình chính và thống kê' },
  { id: 'view_calendar', label: 'Lịch công tác', icon: Calendar, desc: 'Quản lý lịch trực và hội chẩn' },
  { id: 'view_notes', label: 'Ghi chú', icon: MessageSquare, desc: 'Ghi chú lâm sàng cá nhân' },
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

const SystemConfig: React.FC<SystemConfigProps> = ({ isDarkMode, systemSettings, activeCategory, setActiveCategory }) => {
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
  const [homeSubTab, setHomeSubTab] = useState<'overview' | 'features_main' | 'utilities' | 'registration' | 'notifications'>('overview');
  const [regSettings, setRegSettings] = useState<any>({
    allowNewRegistration: true,
    autoApprove: false,
    defaultRoleId: 'unapproved',
    defaultTitleId: ''
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [isSavingReg, setIsSavingReg] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);
  const [hrSubTab, setHrSubTab] = useState<'staff' | 'titles' | 'positions' | 'specialties' | 'departments' | 'roles' | 'permissions'>('staff');
  const [regSubTab, setRegSubTab] = useState<'pending' | 'settings' | 'slides'>('pending');
  const [welcomeSlides, setWelcomeSlides] = useState<any[]>([]);
  const [isSavingSlide, setIsSavingSlide] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // --- New Presentation-style Slide Editor ---
  const [newSlide, setNewSlide] = useState<any>({
    elements: [],
    bgColor: '#ffffff',
    bgImage: '',
    isActive: true,
    order: 0
  });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const addElement = (type: 'text' | 'image') => {
    const newElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 10,
      y: 10,
      w: type === 'image' ? '200px' : 'auto',
      h: 'auto',
      content: type === 'text' ? 'Nhấp để nhập văn bản...' : '',
      style: {
        fontSize: '24px',
        color: isDarkMode ? '#ffffff' : '#000000',
        fontWeight: 'normal',
        fontFamily: 'Inter',
        textAlign: 'left'
      }
    };
    setNewSlide({ ...newSlide, elements: [...newSlide.elements, newElement] });
    setSelectedElementId(newElement.id);
  };

  // Keyboard navigation for selected elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElementId) return;
      
      // Don't move if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const step = e.shiftKey ? 2.0 : 0.5;
      const element = newSlide.elements.find((el: any) => el.id === selectedElementId);
      if (!element) return;

      let { x, y } = element;
      let moved = false;

      switch (e.key) {
        case 'ArrowUp':
          y = Math.max(0, y - step);
          moved = true;
          break;
        case 'ArrowDown':
          y = Math.min(100, y + step);
          moved = true;
          break;
        case 'ArrowLeft':
          x = Math.max(0, x - step);
          moved = true;
          break;
        case 'ArrowRight':
          x = Math.max(100, x + step); // Wait, should be Math.min(100, x + step)
          x = Math.min(100, x + step);
          moved = true;
          break;
        case 'Delete':
        case 'Backspace':
          // Only delete if not in input (handled above)
          // But maybe Backspace is risky
          if (e.key === 'Delete') {
            removeElement(selectedElementId);
            moved = false;
          }
          break;
      }

      if (moved) {
        e.preventDefault(); // Prevent scrolling
        updateElement(selectedElementId, { x, y });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, newSlide.elements]);

  const updateElement = (id: string, updates: any) => {
    setNewSlide({
      ...newSlide,
      elements: newSlide.elements.map((el: any) => el.id === id ? { ...el, ...updates } : el)
    });
  };

  const removeElement = (id: string) => {
    setNewSlide({
      ...newSlide,
      elements: newSlide.elements.filter((el: any) => el.id !== id)
    });
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const saveSlide = async () => {
    if (isSavingSlide) return;

    setIsSavingSlide(true);
    console.log("Starting saveSlide process...");

    try {
      // Generate a clean title/desc from the first text element for backward compatibility or list display
      const firstText = newSlide.elements.find((el: any) => el.type === 'text')?.content || '';
      const slideId = editingSlide ? editingSlide.id : `slide_${Date.now()}`;

      const slideData = {
        id: slideId,
        elements: newSlide.elements || [],
        bgColor: newSlide.bgColor || '#ffffff',
        isActive: newSlide.isActive ?? true,
        order: Number(newSlide.order) || (welcomeSlides.length + 1),
        title: firstText.substring(0, 50) || 'Slide mới',
        description: firstText.substring(0, 100) || '',
        updatedAt: new Date().toISOString(),
        createdAt: editingSlide ? editingSlide.createdAt : new Date().toISOString()
      };

      console.log("Saving slide data:", slideData);
      await setDoc(doc(db, 'welcome_slides', slideId), slideData);

      setShowSlideForm(false);
      setEditingSlide(null);
      setSelectedElementId(null);
      setNewSlide({
        elements: [],
        bgColor: '#ffffff',
        isActive: true,
        order: welcomeSlides.length + 1
      });
      console.log("Slide saved successfully!");
    } catch (error) {
      console.error("Detailed Firestore Save Error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'welcome_slides');
    } finally {
      setIsSavingSlide(false);
    }
  };

  // --- Rendering Editor UI ---
  const selectedElement = (newSlide.elements || []).find((el: any) => el.id === selectedElementId);
  const [showPreviewSlider, setShowPreviewSlider] = useState(false);
  const [previewInitialSlide, setPreviewInitialSlide] = useState(0);

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

    const unsubPendingUsers = onSnapshot(
      query(collection(db, 'users'), where('isApproved', '==', false)),
      (snapshot) => {
        setPendingUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    );

    const unsubSlides = onSnapshot(
      query(collection(db, 'welcome_slides'), orderBy('order', 'asc')),
      (snapshot) => {
        setWelcomeSlides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'welcome_slides');
      }
    );

    return () => {
      unsubFeatures();
      unsubReg();
      unsubAnnouncements();
      unsubAuthLogs();
      unsubPendingUsers();
      unsubSlides();
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
    const updatedSettings = { ...editSettings, showWelcomeSlider: enable };
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



  const deleteSlide = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa slide này?')) return;
    try {
      await deleteDoc(doc(db, 'welcome_slides', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `welcome_slides/${id}`);
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

    const unsubSlides = onSnapshot(query(collection(db, 'welcome_slides'), orderBy('order', 'asc')), (snapshot) => {
      setWelcomeSlides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      unsubSlides();
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
    { id: 'home', label: 'Trang chủ Admin', icon: LayoutGrid, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'registration', label: 'Quản lý Đăng ký', icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'general', label: 'Cài đặt chung', icon: Globe, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { id: 'hr', label: 'Quản lý Nhân sự', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'features', label: 'Quản lý tính năng', icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'theme', label: 'Quản lý Giao diện', icon: Sun, color: 'text-pink-500', bg: 'bg-pink-500/10' },
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
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100/10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình chi tiết & Phân quyền nội bộ</label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/50 border-emerald-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Chỉ định thường dùng — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.commonIndicationsMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, commonIndicationsMinPower: parseInt(e.target.value) || 0 })}
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
                      Gợi ý ICD-10 — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.icdSuggestionsMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, icdSuggestionsMinPower: parseInt(e.target.value) || 0 })}
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
                      Cột Tình trạng — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showStatusColumnMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showStatusColumnMinPower: parseInt(e.target.value) || 0 })}
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

                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-pink-50/50 border-pink-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-pink-400" : "text-pink-700")}>
                      <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>
                      Cột Thao tác — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showActionsColumnMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showActionsColumnMinPower: parseInt(e.target.value) || 0 })}
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

                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-purple-50/50 border-purple-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-purple-400" : "text-purple-700")}>
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                      Xem thuốc đang ẩn — Điểm quyền lực tối thiểu
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settings.showClosedDrugsMinPower ?? 0}
                        onChange={(e) => updateFeatureSettings(feature.id, { ...settings, showClosedDrugsMinPower: parseInt(e.target.value) || 0 })}
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

            {feature.id === 'view_icd10' && (
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100/10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình chi tiết & Phân quyền nội bộ</label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-emerald-50/50 border-emerald-100")}>
                    <p className={cn("text-xs font-black mb-3 flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Phụ lục A2 — Điểm quyền lực tối thiểu
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
                      const allOptions = [
                        ...roles,
                        { id: 'unapproved', name: 'Đang chờ duyệt' },
                        { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                      ];
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
                      const allOptions = [
                        ...roles,
                        { id: 'unapproved', name: 'Đang chờ duyệt' },
                        { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                      ];
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
                      const allOptions = [
                        ...roles,
                        { id: 'unapproved', name: 'Đang chờ duyệt' },
                        { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                      ];
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
                      const allOptions = [
                        ...roles,
                        { id: 'unapproved', name: 'Đang chờ duyệt' },
                        { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                      ];
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
                      const allOptions = [
                        ...roles,
                        { id: 'unapproved', name: 'Đang chờ duyệt' },
                        { id: 'guest', name: 'Khách (Chưa đăng nhập)' }
                      ];
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
                const allOptions = [
                  ...roles,
                  { id: 'unapproved', name: 'Đang chờ duyệt' },
                  { id: 'guest', name: 'Khách' }
                ];
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

  return (
    <div className="space-y-6">
      <div className={cn(
        "mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6",
        activeCategory === 'registration' && "hidden sm:flex"
      )}>
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
            "font-medium transition-colors text-sm",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>
            {activeCategory === 'registration'
              ? 'Phê duyệt tài khoản và thiết lập quy tắc đăng ký thành viên mới.'
              : activeCategory === 'home'
                ? 'Tổng quan hệ thống, cấu hình tính năng và quản lý thông báo toàn viện.'
                : 'Quản lý danh mục nhân sự và phân quyền hệ thống (Quyền quản lý & Quyền làm việc).'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Content Area */}
        <div className="space-y-6">
          {activeCategory === 'hr' && (
            <div className={cn(
              "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl w-fit",
              isDarkMode ? "bg-slate-800" : "bg-slate-100"
            )}>
              {HR_SUB_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setHrSubTab(tab.id as any)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                    hrSubTab === tab.id
                      ? (isDarkMode ? "bg-slate-700 text-white shadow-none" : "bg-white text-blue-600 shadow-lg shadow-slate-200")
                      : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {activeCategory === 'home' ? (
            <div className="space-y-6">
              <div className={cn(
                "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl w-fit",
                isDarkMode ? "bg-slate-800" : "bg-slate-100"
              )}>
                {[
                  { id: 'overview', label: 'Cài đặt chung' },
                  { id: 'features_main', label: 'Tính năng' },
                  { id: 'utilities', label: 'Tiện ích' },
                  { id: 'notifications', label: 'Thông báo' }
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
                  <div className={cn(
                    "p-6 rounded-[32px] border-2 transition-all md:col-span-2",
                    isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                  )}>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <History size={18} />
                      Hoạt động đăng nhập gần đây
                    </h3>
                    <div className="space-y-4">
                      {authLogs.slice(0, 5).map((log, idx) => (
                        <div key={idx} className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border",
                          isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                              log.type === 'login' ? "bg-emerald-500" : "bg-rose-500"
                            )}>
                              {log.type === 'login' ? <LogIn size={14} /> : <LogOut size={14} />}
                            </div>
                            <div>
                              <p className={cn("text-xs font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{log.userName}</p>
                              <p className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                            log.type === 'login' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                          )}>
                            {log.type === 'login' ? 'Vào' : 'Ra'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (homeSubTab === 'features_main' || homeSubTab === 'utilities') ? (
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
                              ? ['dashboard', 'view_directory', 'view_icd10', 'view_interaction', 'view_adr', 'view_patients', 'view_prescription'].includes(feature.id)
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
                    <div className="space-y-4">
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
              ) : (
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
                          const featuresInGroup = sortedFeatures.filter(feature => (featureStates[feature.id] || 'open') === group.id);
                          return (
                            <div key={group.id} className="space-y-3">
                              <div className="flex items-center justify-between px-1">
                                <h4 className={cn("text-[11px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                  {group.label}
                                </h4>
                                <span className={cn("text-[10px] font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                                  {featuresInGroup.length} tiện ích
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
              )}
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

              {/* Lịch sử Đăng nhập/Đăng xuất */}
              <div className="pt-12 border-t border-slate-200 dark:border-slate-800 space-y-8">
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
                          <th className="px-6 py-5 border-b border-transparent">Hành động</th>
                          <th className="px-6 py-5 border-b border-transparent">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
                        {authLogs.length > 0 ? authLogs.map((log) => (
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
                            <td className="px-6 py-5">
                              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Thành công
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-xs font-bold text-slate-400 italic">
                              Chưa có dữ liệu lịch sử đăng nhập/đăng xuất
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
            <AnimatePresence mode="wait">
              {selectedFeatureForDetail ? (
                <div key="detail">
                  {renderFeatureDetailContent()}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className={cn(
                    "flex items-center gap-2 p-1.5 rounded-2xl w-fit",
                    isDarkMode ? "bg-slate-800" : "bg-slate-100"
                  )}>
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'features_main', label: 'Tính năng' },
                      { id: 'utilities', label: 'Tiện ích' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setFeatureCategoryFilter(cat.id as any)}
                        className={cn(
                          "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                          featureCategoryFilter === cat.id
                            ? (isDarkMode ? "bg-slate-700 text-white shadow-none" : "bg-white text-blue-600 shadow-lg shadow-slate-200")
                            : (isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
                        )}
                      >
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
                            return ['dashboard', 'view_directory', 'view_icd10', 'view_interaction', 'view_adr', 'view_patients', 'view_prescription'].includes(feature.id);
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
          ) : activeCategory === 'registration' ? (
            <div className="space-y-6">
              {/* Registration Sub-tabs */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {[
                  { id: 'pending', label: 'Duyệt', icon: ShieldAlert },
                  { id: 'settings', label: 'Cấu hình', icon: Settings },
                  { id: 'slides', label: 'Slide', icon: ImageIcon },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRegSubTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shrink-0",
                      regSubTab === tab.id
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : isDarkMode
                          ? "bg-slate-800 text-slate-400 hover:text-white"
                          : "bg-white text-slate-500 hover:text-slate-900 border border-slate-100"
                    )}
                  >
                    <tab.icon size={16} />
                    <span className="hidden xs:inline">{tab.label}</span>
                    <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
                    {tab.id === 'pending' && pendingUsers.length > 0 && (
                      <span className="bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
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

                        <div className={cn(
                          "flex items-center justify-between p-4 rounded-2xl transition-colors border-2 border-indigo-500/20 bg-indigo-500/5",
                        )}>
                          <div>
                            <p className={cn("text-sm font-bold", isDarkMode ? "text-indigo-300" : "text-indigo-900")}>Bật Slide Chào mừng</p>
                            <p className="text-[10px] text-slate-500 font-medium tracking-tight">Hiển thị slide giới thiệu khi người dùng đăng nhập</p>
                          </div>
                          <button
                            onClick={() => updateShowWelcomeSlider(!editSettings.showWelcomeSlider)}
                            className={cn(
                              "w-12 h-6 rounded-full p-1 transition-all relative",
                              editSettings.showWelcomeSlider ? "bg-indigo-600" : "bg-slate-400"
                            )}
                          >
                            <div className={cn("w-4 h-4 rounded-full bg-white transition-all transform", editSettings.showWelcomeSlider ? "translate-x-6" : "translate-x-0")} />
                          </button>
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

                {regSubTab === 'slides' && (
                  <motion.div
                    key="slides"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <ImageIcon size={18} /> Quản lý Slide chào mừng
                        </h3>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowPreviewSlider(true)}
                            className={cn(
                              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                              isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            <Layout size={16} /> Xem toàn bộ Slide
                          </button>
                          <button
                            onClick={() => {
                              setEditingSlide(null);
                              setNewSlide({ elements: [], bgColor: '#ffffff', isActive: true, order: welcomeSlides.length + 1 });
                              setShowSlideForm(true);
                            }}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                          >
                            <Plus size={16} /> Thêm Slide mới
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {showSlideForm && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className={cn(
                              "rounded-[24px] sm:rounded-[40px] border-4 overflow-hidden p-4 sm:p-8 shadow-2xl",
                              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                            )}
                          >
                            {/* Editor Toolbar */}
                            <div className={cn(
                              "flex flex-wrap items-center justify-between gap-4 mb-8 p-4 rounded-[2rem] border",
                              isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-100/50 border-slate-200"
                            )}>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => addElement('text')}
                                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                  <FileText size={18} /> + Văn bản
                                </button>
                                <button
                                  onClick={() => addElement('image')}
                                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                                >
                                  <ImageIcon size={18} /> + Hình ảnh
                                </button>
                              </div>

                              <div className="flex items-center gap-2 border-x border-slate-200 dark:border-slate-700 px-4">
                                <label className="text-[10px] font-black uppercase text-slate-400 mr-2">Bố cục mẫu:</label>
                                {PRESET_LAYOUTS.map((layout) => (
                                  <button
                                    key={layout.id}
                                    onClick={() => {
                                      if (confirm(`Áp dụng bố cục "${layout.name}"? Thao tác này sẽ thay thế các phần tử hiện tại.`)) {
                                        setNewSlide({ ...newSlide, elements: layout.elements.map(el => ({ ...el, id: Math.random().toString(36).substr(2, 9) })) });
                                        setSelectedElementId(null);
                                      }
                                    }}
                                    className={cn(
                                      "p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all hover:bg-indigo-500 hover:text-white",
                                      isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-100 shadow-sm"
                                    )}
                                    title={layout.name}
                                  >
                                    <layout.icon size={16} />
                                    <span className="text-[8px] font-bold uppercase tracking-tighter">{layout.name}</span>
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] font-black uppercase text-slate-500">Màu nền</label>
                                  <input
                                    type="color"
                                    value={newSlide.bgColor}
                                    onChange={(e) => setNewSlide({ ...newSlide, bgColor: e.target.value })}
                                    className={cn(
                                      "w-10 h-10 rounded-xl cursor-pointer p-1 border-2",
                                      isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200"
                                    )}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] font-black uppercase text-slate-500">Thứ tự</label>
                                  <input
                                    type="number"
                                    value={newSlide.order}
                                    onChange={(e) => setNewSlide({ ...newSlide, order: parseInt(e.target.value) || 0 })}
                                    className={cn(
                                      "w-16 px-3 py-2 rounded-xl border-2 font-bold text-sm",
                                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setShowPreview(true)}
                                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                                >
                                  <Eye size={18} /> Xem trước
                                </button>
                                <button
                                  onClick={() => {
                                    setShowSlideForm(false);
                                    setEditingSlide(null);
                                  }}
                                  className={cn(
                                    "px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all",
                                    isDarkMode ? "text-slate-400 hover:bg-slate-700/50" : "text-slate-500 hover:bg-slate-200/50"
                                  )}
                                >
                                  Hủy
                                </button>
                                <button
                                  onClick={saveSlide}
                                  disabled={isSavingSlide}
                                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-600/30"
                                >
                                  {isSavingSlide ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                  {editingSlide ? 'Cập nhật Slide' : 'Lưu Slide'}
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                              {/* Canvas Area */}
                              <div className="xl:col-span-3">
                                <div
                                  id="slide-canvas"
                                  className={cn(
                                    "relative w-full rounded-[2rem] sm:rounded-[3rem] border-4 border-dashed shadow-inner overflow-hidden",
                                    "aspect-[9/16] sm:aspect-video",
                                    isDarkMode ? "border-slate-700" : "border-slate-200"
                                  )}
                                  style={{ backgroundColor: newSlide.bgColor }}
                                  onClick={(e) => {
                                    if (e.target === e.currentTarget) setSelectedElementId(null);
                                  }}
                                >
                                  {(newSlide.elements || []).map((el: any) => (
                                    <motion.div
                                      key={el.id}
                                      drag
                                      dragMomentum={false}
                                      dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }} // Logic check: we'll use ref for better constraints if needed, but let's fix the calculation first
                                      onDragEnd={(_, info) => {
                                        const container = document.getElementById('slide-canvas');
                                        if (!container) return;
                                        const rect = container.getBoundingClientRect();

                                        // Calculate position relative to container
                                        let newX = ((info.point.x - rect.left) / rect.width) * 100;
                                        let newY = ((info.point.y - rect.top) / rect.height) * 100;

                                        // Clamp values between 0-95 to keep them visible
                                        newX = Math.max(0, Math.min(95, newX));
                                        newY = Math.max(0, Math.min(95, newY));

                                        updateElement(el.id, { x: newX, y: newY });
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setSelectedElementId(el.id);
                                      }}
                                      className={cn(
                                        "absolute cursor-move select-none p-4 rounded-xl transition-shadow",
                                        selectedElementId === el.id ? "ring-2 ring-indigo-500 shadow-2xl z-50 bg-white/10 backdrop-blur-sm" : "hover:bg-white/5"
                                      )}
                                      style={{
                                        left: `${el.x}%`,
                                        top: `${el.y}%`,
                                        width: el.type === 'image' ? el.w : 'auto',
                                        transform: el.style?.textAlign === 'center' ? 'translateX(-50%)' : el.style?.textAlign === 'right' ? 'translateX(-100%)' : 'none',
                                        touchAction: 'none',
                                        zIndex: el.type === 'text' ? 20 : 10
                                      }}
                                    >
                                      {el.type === 'text' ? (
                                        <div
                                          style={{
                                            fontSize: el.style?.fontSize || '24px',
                                            color: el.style?.color || '#000000',
                                            fontWeight: el.style?.fontWeight || 'normal',
                                            fontFamily: el.style?.fontFamily || 'Inter',
                                            textAlign: el.style?.textAlign || 'left'
                                          }}
                                          className="whitespace-pre-wrap leading-tight drop-shadow-sm pointer-events-none"
                                        >
                                          {el.content}
                                        </div>
                                      ) : (
                                        <div className="relative group/img pointer-events-none">
                                          <img
                                            src={getDirectImageUrl(el.content) || 'https://via.placeholder.com/400x300?text=Nhập+URL+ảnh+bên+phải'}
                                            className="w-full h-auto rounded-xl shadow-lg"
                                            alt=""
                                          />
                                        </div>
                                      )}
                                    </motion.div>
                                  ))}
                                </div>
                              </div>

                              {/* Properties Panel */}
                              <div className="xl:col-span-1">
                                    {/* Layers / Element List */}
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Danh sách phần tử</h4>
                                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                        {(newSlide.elements || []).length === 0 ? (
                                          <div className="py-4 text-center text-[10px] font-bold text-slate-400 italic">Chưa có phần tử nào</div>
                                        ) : (
                                          (newSlide.elements || []).map((el: any) => (
                                            <button
                                              key={el.id}
                                              onClick={() => setSelectedElementId(el.id)}
                                              className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left",
                                                selectedElementId === el.id
                                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                                  : isDarkMode
                                                    ? "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                                                    : "bg-white border-slate-100 text-slate-500 hover:border-slate-200 shadow-sm"
                                              )}
                                            >
                                              <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                                selectedElementId === el.id ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"
                                              )}>
                                                {el.type === 'text' ? <Type size={14} /> : <Square size={14} />}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-black uppercase tracking-tighter opacity-60">
                                                  {el.type === 'text' ? 'Văn bản' : 'Hình ảnh'}
                                                </p>
                                                <p className="text-xs font-bold truncate">
                                                  {el.type === 'text' ? el.content : 'Image Layer'}
                                                </p>
                                              </div>
                                            </button>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-6" />

                                    {selectedElement ? (
                                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex items-center justify-between">
                                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thiết lập phần tử</h4>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeElement(selectedElement.id);
                                        }}
                                        className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition-all"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>

                                    <div className="space-y-4">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                                          {selectedElement.type === 'text' ? 'Nội dung văn bản' : 'Link hình ảnh'}
                                        </label>
                                        {selectedElement.type === 'text' ? (
                                          <textarea
                                            value={selectedElement.content}
                                            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                            className={cn(
                                              "w-full px-4 py-3 rounded-xl border-2 font-bold text-xs min-h-[100px] resize-none focus:ring-2 focus:ring-indigo-500 transition-all",
                                              isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                                            )}
                                            placeholder="Nhập nội dung..."
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={selectedElement.content}
                                            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                            className={cn(
                                              "w-full px-4 py-3 rounded-xl border-2 font-bold text-xs focus:ring-2 focus:ring-indigo-500 transition-all",
                                              isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                                            )}
                                            placeholder="Dán link ảnh tại đây..."
                                          />
                                        )}
                                      </div>

                                      {selectedElement?.type === 'text' && (
                                        <>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Cỡ chữ</label>
                                              <input
                                                type="text"
                                                value={selectedElement?.style?.fontSize || '24px'}
                                                onChange={(e) => updateElement(selectedElement.id, { style: { ...(selectedElement.style || {}), fontSize: e.target.value } })}
                                                className={cn(
                                                  "w-full px-4 py-2 rounded-xl border-2 font-bold text-xs",
                                                  isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                                                )}
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Màu sắc</label>
                                              <input
                                                type="color"
                                                value={selectedElement?.style?.color || '#000000'}
                                                onChange={(e) => updateElement(selectedElement.id, { style: { ...(selectedElement.style || {}), color: e.target.value } })}
                                                className="w-full h-9 rounded-xl cursor-pointer"
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Căn lề văn bản</label>
                                            <div className="flex items-center gap-2">
                                              {[
                                                { id: 'left', icon: AlignLeft },
                                                { id: 'center', icon: AlignCenter },
                                                { id: 'right', icon: AlignRight }
                                              ].map((align) => (
                                                <button
                                                  key={align.id}
                                                  onClick={() => updateElement(selectedElement.id, { style: { ...(selectedElement.style || {}), textAlign: align.id } })}
                                                  className={cn(
                                                    "flex-1 py-2.5 rounded-xl border-2 flex items-center justify-center transition-all",
                                                    (selectedElement?.style?.textAlign || 'left') === align.id
                                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                                      : isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"
                                                  )}
                                                >
                                                  <align.icon size={16} />
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Font chữ</label>
                                            <select
                                              value={selectedElement?.style?.fontFamily || 'Inter'}
                                              onChange={(e) => updateElement(selectedElement.id, { style: { ...(selectedElement.style || {}), fontFamily: e.target.value } })}
                                              className={cn(
                                                "w-full px-4 py-2 rounded-xl border-2 font-bold text-xs",
                                                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                                              )}
                                            >
                                              <option value="Inter">Inter (Hiện đại)</option>
                                              <option value="Montserrat">Montserrat (Mạnh mẽ)</option>
                                              <option value="Playfair Display">Playfair (Cổ điển)</option>
                                              <option value="Roboto">Roboto (Phổ biến)</option>
                                            </select>
                                          </div>
                                        </>
                                      )}

                                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Vị trí nhanh trên Slide</label>
                                        <div className="flex items-center gap-2">
                                          {[
                                            { label: 'Trái', x: 5, icon: AlignLeft },
                                            { label: 'Giữa', x: 50, icon: AlignCenter },
                                            { label: 'Phải', x: 95, icon: AlignRight }
                                          ].map((pos) => (
                                            <button
                                              key={pos.label}
                                              onClick={() => updateElement(selectedElement.id, { x: pos.x, style: { ...(selectedElement?.style || {}), textAlign: pos.label === 'Trái' ? 'left' : pos.label === 'Giữa' ? 'center' : 'right' } })}
                                              className={cn(
                                                "flex-1 py-2.5 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                                                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400 hover:border-indigo-500" : "bg-white border-slate-200 text-slate-500 hover:border-indigo-500"
                                              )}
                                            >
                                              <pos.icon size={14} />
                                              <span className="text-[9px] font-black uppercase tracking-tighter">{pos.label}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {selectedElement.type === 'image' && (
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Chiều rộng (px)</label>
                                          <input
                                            type="text"
                                            value={selectedElement.w}
                                            onChange={(e) => updateElement(selectedElement.id, { w: e.target.value })}
                                            className={cn(
                                              "w-full px-4 py-2 rounded-xl border-2 font-bold text-xs",
                                              isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                                            )}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "flex flex-col items-center justify-center h-full p-8 border-2 border-dashed rounded-[2rem] opacity-40",
                                    isDarkMode ? "border-slate-700" : "border-slate-200"
                                  )}>
                                    <MousePointer2 size={32} className="mb-2" />
                                    <p className="text-center text-[10px] font-black uppercase tracking-widest leading-relaxed">Chọn một phần tử<br />để thiết kế</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {welcomeSlides.map((slide, idx) => (
                          <div
                            key={slide.id}
                            className={cn(
                              "group relative rounded-[2.5rem] border-2 overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1",
                              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/30"
                            )}
                          >
                            <div
                              className="relative h-48 overflow-hidden flex items-center justify-center cursor-zoom-in"
                              style={{ backgroundColor: slide.bgColor || '#f1f5f9' }}
                            >
                              <div className="scale-[0.25] pointer-events-none origin-center w-[1280px] h-[720px] relative">
                                {(slide.elements || []).map((el: any) => (
                                  <div
                                    key={el.id}
                                    className="absolute"
                                    style={{
                                      left: `${el.x}%`,
                                      top: `${el.y}%`,
                                      width: el.type === 'image' ? el.w : 'auto',
                                      fontSize: el.style?.fontSize,
                                      color: el.style?.color,
                                      fontFamily: el.style?.fontFamily,
                                      fontWeight: el.style?.fontWeight,
                                      zIndex: el.type === 'text' ? 20 : 10
                                    }}
                                  >
                                    {el.type === 'text' ? el.content : <img src={getDirectImageUrl(el.content)} className="w-full" alt="" />}
                                  </div>
                                ))}
                              </div>

                              <div
                                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewData(slide);
                                  setShowPreview(true);
                                }}
                              >
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSlide(slide);
                                      setNewSlide({
                                        elements: slide.elements || [],
                                        bgColor: slide.bgColor || '#ffffff',
                                        isActive: slide.isActive ?? true,
                                        order: slide.order ?? 0
                                      });
                                      setShowSlideForm(true);
                                    }}
                                    className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                                  >
                                    <Edit3 size={18} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Xóa slide này?')) deleteSlide(slide.id);
                                    }}
                                    className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Slide #{slide.order}</span>
                                {!slide.isActive && <span className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Đang ẩn</span>}
                              </div>
                              <h4 className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                                {slide.elements?.find((e: any) => e.type === 'text')?.content?.substring(0, 30) || 'Slide hình ảnh'}...
                              </h4>
                            </div>
                          </div>
                        ))}
                        {welcomeSlides.length === 0 && !showSlideForm && (
                          <div className="col-span-full py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                              <ImageIcon size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-bold">Chưa có slide chào mừng nào.</p>
                            <p className="text-[10px] text-slate-400">Hãy thêm slide để làm trang đăng nhập sinh động hơn.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
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

                  {activeCategory === 'roles' && (
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


      {/* Designer Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:p-12 bg-black/95 backdrop-blur-2xl"
          >
            <div className="absolute top-8 right-8 flex items-center gap-4 z-[10000]">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                {previewData ? `Xem trước Slide #${previewData.order}` : 'Chế độ thiết kế'}
              </p>
              <button 
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-2xl"
              >
                <X size={24} />
              </button>
            </div>

            <div className={cn(
              "w-full overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-all duration-500",
              "aspect-[9/16] max-h-[80vh] sm:aspect-video sm:max-w-6xl sm:rounded-[3rem] rounded-[2rem]",
              isDarkMode ? "bg-slate-900" : "bg-white"
            )}>
              <div 
                className="absolute inset-0 z-0"
                style={{ backgroundColor: (previewData || newSlide).bgColor || '#ffffff' }}
              />
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      {((previewData || newSlide).elements || []).map((el: any) => (
                        <div
                          key={el.id}
                          className="absolute"
                          style={{ 
                            left: `${el.x}%`, 
                            top: `${el.y}%`,
                            width: el.type === 'image' ? el.w : 'auto',
                            transform: el.style?.textAlign === 'center' ? 'translateX(-50%)' : el.style?.textAlign === 'right' ? 'translateX(-100%)' : 'none',
                            zIndex: el.type === 'text' ? 20 : 10
                          }}
                        >
                    {el.type === 'text' ? (
                      <div 
                        style={{ 
                          fontSize: el.style?.fontSize || '24px', 
                          color: el.style?.color || '#000000',
                          fontWeight: el.style?.fontWeight || 'normal',
                          fontFamily: el.style?.fontFamily || 'Inter',
                          textAlign: el.style?.textAlign || 'left'
                        }}
                        className="whitespace-pre-wrap leading-tight drop-shadow-2xl"
                      >
                        {el.content}
                      </div>
                    ) : (
                      <img 
                        src={getDirectImageUrl(el.content)} 
                        className="w-full h-auto rounded-[2rem] shadow-2xl"
                        alt=""
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {showPreviewSlider && (
        <WelcomeSlider
          key="preview-slider"
          onComplete={() => setShowPreviewSlider(false)}
          isDarkMode={isDarkMode}
          userName="Quản trị viên"
          slides={welcomeSlides}
          initialSlide={previewInitialSlide}
        />
      )}
    </div>
  );
};

export default SystemConfig;
