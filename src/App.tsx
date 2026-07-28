import React, { useState, useEffect, useRef, Suspense } from 'react';
import ConfirmModal from './components/ConfirmModal';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DrugDirectory from './components/DrugDirectory';
import InteractionChecker from './components/InteractionChecker';
import PrescriptionForm from './components/PrescriptionForm';
import ICD10Management from './components/ICD10Management';
import UserManagement from './components/UserManagement';
import Calendar from './components/Calendar';
import Notes from './components/Notes';
import CalculatorWidget from './components/Calculator';
import TodoWidget from './components/TodoList';
import DocumentLookup from './components/DocumentLookup';
import DocumentManagement from './components/DocumentManagement';
import ADRManagement from './components/ADRManagement';
import SystemConfig from './components/SystemConfig';
import SocialWall from './components/SocialWall';
import PatientManagement from './components/PatientManagement';
import StaffManagement from './components/StaffManagement';
import UpdateNotification from './components/UpdateNotification';
import DrugDetailModal from './components/DrugDetailModal';
import WelcomeSlider from './components/WelcomeSlider';

import { Pill, LogIn, ShieldCheck, FileText, ClipboardList, Users, X, LogOut, Settings, Sparkles, AlertTriangle, MessageSquare, Search, Zap, Menu, Loader2, LayoutDashboard, History, ShieldAlert, Briefcase, Calendar as CalendarIcon, Bell, Check, Trash2, CheckCheck, Info, AlertOctagon, LayoutGrid, Sun, Moon, Activity, Globe, Award, GraduationCap, Lock, EyeOff, Wrench, Palette, ChevronRight, Calculator, ListTodo, UserCheck, Phone, FileSearch, HelpCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, db, collection, getDocs, setDoc, updateDoc, doc, getDoc, onSnapshot, query, where, orderBy, deleteDoc, limit, handleFirestoreError, OperationType, signInAnonymously, serverTimestamp, increment } from './firebase';
import { UserProfile, Notification, SystemSettings, Announcement, RegistrationSettings } from './types';
import { seedInitialData } from './lib/seed';

// Session visit log tracker
let isVisitLoggedThisSession = false;
let isSigningInAnonymously = false;

// Safe wrapper for localStorage that falls back to in-memory dictionary in incognito/sandboxed frames
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return (window as any).__memStorage?.[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (!(window as any).__memStorage) {
        (window as any).__memStorage = {};
      }
      (window as any).__memStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      if ((window as any).__memStorage) {
        delete (window as any).__memStorage[key];
      }
    }
  }
};

export async function getIpAddress(): Promise<string> {
  try {
    const fetchPromise = fetch('https://api.ipify.org?format=json');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 1500)
    );
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    const data = await res.json();
    return data.ip || '127.0.0.1';
  } catch (error) {
    let storedIp = safeLocalStorage.getItem('sim_ip');
    if (!storedIp) {
      const octet3 = Math.floor(Math.random() * 254) + 1;
      const octet4 = Math.floor(Math.random() * 254) + 1;
      storedIp = `113.161.${octet3}.${octet4}`;
      safeLocalStorage.setItem('sim_ip', storedIp);
    }
    return storedIp;
  }
}

export function getMacAddress(): string {
  let mac = safeLocalStorage.getItem('sim_mac');
  if (!mac) {
    const hex = '0123456789ABCDEF';
    const parts = ['FC', 'A1', '3E'];
    for (let i = 0; i < 3; i++) {
      parts.push(hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)]);
    }
    mac = parts.join(':');
    safeLocalStorage.setItem('sim_mac', mac);
  }
  return mac;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1) os = "macOS";
  else if (ua.indexOf("X11") !== -1 || ua.indexOf("Linux") !== -1) {
    if (ua.indexOf("Android") !== -1) os = "Android";
    else os = "Linux";
  }
  else if (ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1) os = "iOS";

  let browser = "Unknown Browser";
  if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (ua.indexOf("Safari") !== -1) browser = "Safari";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Edge") !== -1) browser = "Edge";
  else if (ua.indexOf("MSIE") !== -1 || (document as any).documentMode) browser = "IE";

  return `${os} - ${browser}`;
}

const ALL_TABS = [
  { id: 'dashboard', label: 'Workspace', icon: LayoutDashboard },
  { id: 'view_calendar', label: 'Lịch công tác', icon: CalendarIcon },
  { id: 'view_notes', label: 'Ghi chú', icon: MessageSquare },
  { id: 'view_todo', label: 'Việc cần làm', icon: ListTodo },
  { id: 'view_doc_lookup', label: 'Tra cứu văn bản', icon: FileSearch },
  { id: 'view_directory', label: 'Tra cứu thuốc', icon: Pill },
  { id: 'view_icd10', label: 'Tra cứu ICD-10', icon: ClipboardList },
  { id: 'view_interaction', label: 'Tương tác thuốc', icon: ShieldAlert },
  { id: 'view_adr', label: 'Tra cứu ADR', icon: AlertTriangle },
  { id: 'view_patients', label: 'Tra cứu bệnh nhân', icon: Users },
  { id: 'view_prescription', label: 'Kê toa thử', icon: FileText },
  { id: 'view_social', label: 'Mạng xã hội', icon: MessageSquare },
  { id: 'view_calculator', label: 'Máy tính', icon: Calculator },
  { id: 'view_profile', label: 'Trang cá nhân', icon: Users },
  { id: 'manage_users', label: 'Quản lý người dùng', icon: Users },
  { id: 'manage_staff', label: 'Quản lý nhân sự', icon: Briefcase },
  { id: 'manage_directory', label: 'Quản lý thuốc', icon: Pill },
  { id: 'manage_icd10', label: 'Quản lý ICD-10', icon: ClipboardList },
  { id: 'manage_interaction', label: 'Quản lý tương tác thuốc', icon: ShieldAlert },
  { id: 'manage_adr', label: 'Quản lý ADR', icon: AlertTriangle },
  { id: 'manage_doc_lookup', label: 'Quản lý văn bản', icon: FileText },
  { id: 'manage_config', label: 'Cấu hình hệ thống', icon: Settings },
  // AdminCP Specific Tabs
  { id: 'admin_home', label: 'Công cụ', icon: LayoutDashboard },
  { id: 'admin_notifications', label: 'Thông báo/Tin nhắn', icon: MessageSquare },
  { id: 'admin_registration', label: 'Đăng nhập/Đăng ký', icon: UserCheck },
  { id: 'admin_general', label: 'Cài đặt chung', icon: Globe },
  { id: 'admin_theme', label: 'Cài đặt Giao diện', icon: Palette },
  { id: 'admin_titles', label: 'Quản lý Chức danh', icon: Award },
  { id: 'admin_positions', label: 'Quản lý Chức vụ', icon: ShieldCheck },
  { id: 'admin_specialties', label: 'Quản lý Chuyên khoa', icon: GraduationCap },
  { id: 'admin_roles', label: 'Quản lý Nhóm quyền', icon: Lock },
  { id: 'admin_hr', label: 'Quản lý Nhân sự', icon: Users },
  { id: 'admin_permissions', label: 'Phân quyền hệ thống', icon: ShieldCheck },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const saved = safeLocalStorage.getItem('activeTab');
    return saved || 'dashboard';
  });

  const [drugDirectoryViewMode, setDrugDirectoryViewMode] = useState<'drugs' | 'groups' | 'ingredients' | 'ingredient_categories' | 'excipients' | 'excipient_categories' | 'companies'>(() => {
    const saved = safeLocalStorage.getItem('drugDirectoryViewMode');
    return (saved as any) || 'drugs';
  });

  useEffect(() => {
    safeLocalStorage.setItem('drugDirectoryViewMode', drugDirectoryViewMode);
  }, [drugDirectoryViewMode]);

  useEffect(() => {
    safeLocalStorage.setItem('activeTab', activeTab);

    // Reset scroll and overflow on main container when switching tabs.
    // This fixes the bug where components (like DrugDirectory) might leave the container locked.
    if (mainScrollRef.current) {
      mainScrollRef.current.style.overflow = 'auto';
      mainScrollRef.current.scrollTo(0, 0);
    }

    // GHOST-INTERACTION FIX: Briefly disable pointer-events on the main content area
    // during tab transitions. This prevents "zombie" portal nodes left behind by the
    // outgoing module (e.g. DrugDirectory filter buttons) from receiving touch events
    // and causing the "white page + stuck controls" bug on mobile.
    if (mainScrollRef.current) {
      mainScrollRef.current.style.pointerEvents = 'none';
      const timer = setTimeout(() => {
        if (mainScrollRef.current) {
          mainScrollRef.current.style.pointerEvents = '';
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [configRoles, setConfigRoles] = useState<any[]>([]);
  const [titlePermissions, setTitlePermissions] = useState<any[]>([]);
  const [permsLoading, setPermsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showSupportContact, setShowSupportContact] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    try {
      const stored = safeLocalStorage.getItem('read_announcements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toastPopups, setToastPopups] = useState<any[]>([]);
  const isInitialNotificationsLoad = useRef(true);
  const isInitialAnnouncementsLoad = useRef(true);
  const existingNotificationIds = useRef<string[]>([]);
  const existingAnnouncementIds = useRef<string[]>([]);

  const addToastPopup = (id: string, title: string, message: string, category: string, item: any) => {
    const newToast = { id, title, message, category, item, timestamp: Date.now() };
    setToastPopups(prev => {
      if (prev.some(t => t.id === id)) return prev;
      return [...prev, newToast];
    });
    
    setTimeout(() => {
      setToastPopups(prev => prev.filter(t => t.id !== id));
    }, 8000);
  };

  const [notificationTab, setNotificationTab] = useState<'all' | 'clinical_alert' | 'data_update' | 'medical_news_personal' | 'system'>('all');
  const [notifSearchQuery, setNotifSearchQuery] = useState('');
  const [visibleNotifCount, setVisibleNotifCount] = useState(20);

  const getNotificationCategory = (item: any, isAnnouncement: boolean): 'clinical_alert' | 'data_update' | 'medical_news_personal' | 'system' => {
    if (item.category) return item.category;
    
    if (isAnnouncement) {
      if (item.type === 'drug_update') return 'data_update';
      const contentLower = (item.content || '').toLowerCase();
      const titleLower = (item.title || '').toLowerCase();
      if (
        contentLower.includes('adr') || contentLower.includes('cảnh báo') || contentLower.includes('chống chỉ định') || 
        contentLower.includes('nguy cơ') || contentLower.includes('nguy hiểm') ||
        titleLower.includes('cảnh báo') || titleLower.includes('adr') || titleLower.includes('chống chỉ định')
      ) {
        return 'clinical_alert';
      }
      if (
        contentLower.includes('bộ y tế') || contentLower.includes('who') || contentLower.includes('tin tức') || 
        contentLower.includes('icd-10') || contentLower.includes('hướng dẫn điều trị') ||
        titleLower.includes('bộ y tế') || titleLower.includes('who') || titleLower.includes('y khoa')
      ) {
        return 'medical_news_personal';
      }
      if (
        contentLower.includes('phiên bản') || contentLower.includes('đồng bộ') || contentLower.includes('hệ thống') || 
        contentLower.includes('sao lưu') || titleLower.includes('phiên bản') || titleLower.includes('hệ thống')
      ) {
        return 'system';
      }
      return 'system'; // mặc định cho các thông báo hệ thống thông thường
    } else {
      if (item.type === 'error' || item.type === 'warning') return 'clinical_alert';
      const msgLower = (item.message || '').toLowerCase();
      const titleLower = (item.title || '').toLowerCase();
      if (
        msgLower.includes('adr') || msgLower.includes('chống chỉ định') || msgLower.includes('cảnh báo lâm sàng') || 
        titleLower.includes('adr') || titleLower.includes('cảnh báo')
      ) {
        return 'clinical_alert';
      }
      if (
        msgLower.includes('cập nhật thuốc') || msgLower.includes('hướng dẫn sử dụng') || 
        titleLower.includes('cập nhật') || item.type === 'success'
      ) {
        return 'data_update';
      }
      if (
        msgLower.includes('bộ y tế') || msgLower.includes('who') || titleLower.includes('y khoa') || 
        titleLower.includes('tin tức') || titleLower.includes('trả lời') || titleLower.includes('bình luận') ||
        titleLower.includes('theo dõi')
      ) {
        return 'medical_news_personal';
      }
      if (msgLower.includes('phiên bản') || msgLower.includes('sao lưu') || msgLower.includes('đồng bộ dữ liệu')) {
        return 'system';
      }
      return 'medical_news_personal';
    }
  };

  const getUnifiedNotifications = () => {
    const list: any[] = [];
    
    // Convert announcements to unified form
    announcements.filter(a => a.showInHeader !== false).forEach(a => {
      const isRead = readAnnouncementIds.includes(a.id);
      const category = getNotificationCategory(a, true);
      list.push({
        id: a.id,
        title: a.title || (a.type === 'drug_update' ? `Cập bến/Cập nhật: ${a.drugName || 'Thuốc'}` : 'Thông báo hệ thống'),
        message: a.content,
        createdAt: a.createdAt,
        isRead,
        category,
        link: a.type === 'drug_update' ? 'drugs' : undefined,
        drugName: a.drugName,
        isAnnouncement: true
      });
    });

    // Convert personal notifications to unified form
    notifications.forEach(n => {
      const category = getNotificationCategory(n, false);
      list.push({
        id: n.id,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        isRead: n.isRead,
        category,
        link: n.link,
        isAnnouncement: false
      });
    });

    // Sort: newest first
    const sorted = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter by Tab
    let filtered = sorted;
    if (notificationTab !== 'all') {
      filtered = sorted.filter(item => item.category === notificationTab);
    }

    // Filter by search query
    if (notifSearchQuery.trim()) {
      const queryLower = notifSearchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title || '').toLowerCase().includes(queryLower) || 
        (item.message || '').toLowerCase().includes(queryLower)
      );
    }

    return filtered;
  };

  const groupNotificationsByDate = (items: any[]) => {
    const groups: { [key: string]: any[] } = {};
    
    items.forEach(item => {
      const date = new Date(item.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      let groupTitle = '';
      if (date.toDateString() === today.toDateString()) {
        groupTitle = 'Hôm nay';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupTitle = 'Hôm qua';
      } else {
        groupTitle = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      
      if (!groups[groupTitle]) {
        groups[groupTitle] = [];
      }
      groups[groupTitle].push(item);
    });
    
    return groups;
  };

  const toggleReadStatus = async (item: any) => {
    if (item.isAnnouncement) {
      setReadAnnouncementIds(prev => {
        let next;
        if (item.isRead) {
          next = prev.filter(id => id !== item.id);
        } else {
          next = Array.from(new Set([...prev, item.id]));
        }
        safeLocalStorage.setItem('read_announcements', JSON.stringify(next));
        return next;
      });
    } else {
      if (item.isRead) {
        await markAsUnread(item.id);
      } else {
        await markAsRead(item.id);
      }
    }
  };

  const isDrugRelated = (item: any, isAnnouncement: boolean) => {
    const text = (isAnnouncement 
      ? `${item.title || ''} ${item.content || ''}` 
      : `${item.title || ''} ${item.message || ''}`
    ).toLowerCase();
    
    if (isAnnouncement) {
      return item.type === 'drug_update' || !!item.drugId || !!item.drugName || 
             text.includes('thuốc') || text.includes('hoạt chất') || text.includes('biệt dược') || text.includes('drug');
    } else {
      return item.link === 'drugs' || item.link === 'drug_directory' || item.link === 'drug_groups' || 
             text.includes('thuốc') || text.includes('hoạt chất') || text.includes('biệt dược') || text.includes('drug');
    }
  };
  const [globalSelectedDrug, setGlobalSelectedDrug] = useState<any | null>(null);
  const [isGlobalDrugModalOpen, setIsGlobalDrugModalOpen] = useState(false);

  const handleOpenGlobalDrugModal = async (drugName: string) => {
    try {
      const q = query(collection(db, 'drugs'), where('name', '==', drugName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const drugData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as any;
        setGlobalSelectedDrug(drugData);
        setIsGlobalDrugModalOpen(true);
      } else {
        alert(`Không tìm thấy thông tin cho thuốc: ${drugName}`);
      }
    } catch (error) {
      console.error("Error fetching drug details in global modal:", error);
    }
  };
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileEditData, setProfileEditData] = useState({
    hideEmail: false,
    hideZalo: false,
  });

  // Sync profileEditData with userProfile for real-time consistency in Settings
  useEffect(() => {
    if (userProfile && !isProfileModalOpen) {
      setProfileEditData({
        hideEmail: userProfile.hideEmail || false,
        hideZalo: userProfile.hideZalo || false,
      });
    }
  }, [userProfile, isProfileModalOpen]);

  // Automated first-access of the day per device and user logger
  useEffect(() => {
    if (user && userProfile && userProfile.role !== 'unapproved') {
      const logDailyDeviceAccess = async () => {
        try {
          const todayStr = new Date().toLocaleDateString('sv-SE'); // Local date "YYYY-MM-DD"
          const deviceMac = getMacAddress();
          const storageKey = `daily_access_logged_${user.uid}_${deviceMac}`;
          const lastLoggedDate = safeLocalStorage.getItem(storageKey);

          if (lastLoggedDate !== todayStr) {
            const logId = Date.now().toString();
            const ip = await getIpAddress();
            const dev = getDeviceName();

            await setDoc(doc(db, 'auth_logs', logId), {
              id: logId,
              userId: user.uid,
              userEmail: user.email,
              userName: userProfile.displayName || 'Người dùng',
              type: 'login',
              timestamp: new Date().toISOString(),
              ipAddress: ip,
              macAddress: deviceMac,
              device: dev
            });

            // Mark daily log as registered in localStorage for this user-device pair
            safeLocalStorage.setItem(storageKey, todayStr);
          }
        } catch (error) {
          console.warn("Failed to automatically record daily device access:", error);
        }
      };

      logDailyDeviceAccess();
    }
  }, [user, userProfile]);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [dbSlides, setDbSlides] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'slides'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setDbSlides(list);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error("Slides listener error:", error);
      }
    });
    return unsubscribe;
  }, []);

  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isPrivacyConfirmOpen, setIsPrivacyConfirmOpen] = useState(false);
  const [privacyConfirmType, setPrivacyConfirmType] = useState<'email' | 'zalo'>('email');
  const [featureStates, setFeatureStates] = useState<Record<string, 'open' | 'closed' | 'maintenance'>>({});
  const [featureSettings, setFeatureSettings] = useState<Record<string, any>>({});
  const [isAdminMode, setIsAdminMode] = useState(() => {
    const saved = safeLocalStorage.getItem('isAdminMode');
    return saved === 'true';
  });

  const syncUserProfile = async () => {
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        const refreshedUser = auth.currentUser;
        const googlePhoto = refreshedUser.providerData[0]?.photoURL || refreshedUser.photoURL;
        const googleName = refreshedUser.providerData[0]?.displayName || refreshedUser.displayName;

        const userRef = doc(db, 'users', refreshedUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const profile = userSnap.data() as UserProfile;
          const updatedProfile = {
            ...profile,
            photoURL: googlePhoto || profile.photoURL || '',
            displayName: profile.displayName || googleName || profile.displayName,
            photoSyncToken: Date.now().toString()
          };
          await setDoc(userRef, updatedProfile);
          setUserProfile(updatedProfile);
        }
      } catch (e) {
        console.error("Manual sync failed", e);
      }
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = safeLocalStorage.getItem('isSidebarCollapsed');
    return saved === 'true';
  });
  const [externalSelectedDrugId, setExternalSelectedDrugId] = useState<string | null>(null);
  const [externalIcdSearchQuery, setExternalIcdSearchQuery] = useState<string | null>(null);
  const [externalPatientSearchQuery, setExternalPatientSearchQuery] = useState<string | null>(null);

  useEffect(() => {
    safeLocalStorage.setItem('isAdminMode', isAdminMode.toString());
  }, [isAdminMode]);

  useEffect(() => {
    safeLocalStorage.setItem('isSidebarCollapsed', isSidebarCollapsed.toString());
    // Dispatch resize event to let components (like charts) know the layout changed
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  }, [isSidebarCollapsed]);
  const [guestView, setGuestView] = useState<'none' | 'drugs' | 'icd10' | 'terms'>('none');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (guestView === 'none' || guestView === 'terms') return;

    const tabId = guestView === 'drugs' ? 'view_directory' : 'view_icd10';
    // If featureSettings has keys, it means it's loaded.
    if (Object.keys(featureSettings).length > 0) {
      const settings = featureSettings[tabId] || {};
      const status = featureStates[tabId];
      const allowedRoles = settings.allowedRoles || [];
      const isAllowed = allowedRoles.length === 0 || allowedRoles.includes('guest');

      if (status === 'closed' || status === 'maintenance' || !isAllowed) {
        setGuestView('none');
        setShowLoginPrompt(true);
      }
    }
  }, [guestView, featureSettings, featureStates]);

  useEffect(() => {
    if (showLoginPrompt) {
      const timer = setTimeout(() => setShowLoginPrompt(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showLoginPrompt]);

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    appName: 'KCB PB',
    loginTitle: 'Hệ thống Quản lý KCB',
    loginSubtitle: 'Ứng dụng hỗ trợ Khám Chữa Bệnh',
    appDescription: 'Hệ thống hỗ trợ tra cứu và gợi ý quyết định lâm sàng hiện đại dành cho nhân viên y tế tại KCB.',
    loginLogoUrl: '/icon-512.png',
    defaultTheme: 'light'
  });
  const [regSettings, setRegSettings] = useState<RegistrationSettings>({
    allowNewRegistration: true,
    autoApprove: false,
    defaultRoleId: 'unapproved',
    defaultTitleId: ''
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileAppsMenuRef = useRef<HTMLDivElement>(null);
  const desktopAppsMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchMenuRef = useRef<HTMLDivElement>(null);
  const desktopSearchMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const mobileNotificationsMenuRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  // Force browser layout reflow on tab change (fixes GPU compositing / sticky hitmap bug on mobile)
  // This programmatically replicates the user-discovered fix of resizing the browser window.
  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    // Reset scroll position
    el.scrollTop = 0;

    const reflow = () => {
      if (!mainScrollRef.current) return;
      const t = mainScrollRef.current;
      // Width jitter: forces full layout recalculation (simulates window resize)
      t.style.width = '99.9%';
      void t.offsetHeight;
      t.style.width = '';
      void t.offsetHeight;
      // Scroll jitter: forces sticky-element hitmap refresh
      t.scrollTop = 1;
      void t.offsetHeight;
      t.scrollTop = 0;
      // Notify all components a resize occurred
      window.dispatchEvent(new Event('resize'));
    };

    reflow();
    const t1 = setTimeout(reflow, 80);
    const t2 = setTimeout(reflow, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeTab]);

  // Handle mobile back button and history state
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If back button is pressed and we returned to the root (no hash), revert to dashboard
      if (activeTab !== 'dashboard' && !window.location.hash) {
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  useEffect(() => {
    const handleNavigateTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (typeof customEvent.detail === 'string' && customEvent.detail.startsWith('admin_') && !isAdminMode) {
          setIsAdminMode(true);
        }
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('navigate-tab', handleNavigateTab);
    return () => window.removeEventListener('navigate-tab', handleNavigateTab);
  }, [isAdminMode]);

  useEffect(() => {
    // When switching to a sub-page/utility, push state to history
    // Only push if we're not already on dashboard and the current hash doesn't match
    if (activeTab !== 'dashboard' && window.location.hash !== `#${activeTab}`) {
      window.history.pushState({ tab: activeTab }, '', `#${activeTab}`);
    } else if (activeTab === 'dashboard' && window.location.hash !== '' && window.location.hash !== '#drug-detail') {
      // If we returned to dashboard manually, clear the hash
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Apps Menu
      const isInsideMobileApps = mobileAppsMenuRef.current?.contains(target);
      const isInsideDesktopApps = desktopAppsMenuRef.current?.contains(target);
      if (!isInsideMobileApps && !isInsideDesktopApps) {
        setIsAppsMenuOpen(false);
      }

      // Search Menu
      const isInsideMobileSearch = mobileSearchMenuRef.current?.contains(target);
      const isInsideDesktopSearch = desktopSearchMenuRef.current?.contains(target);
      if (!isInsideMobileSearch && !isInsideDesktopSearch) {
        setIsSearchFocused(false);
      }

      // Notifications
      const isInsideDesktopNotif = notificationsMenuRef.current?.contains(target);
      const isInsideMobileNotif = mobileNotificationsMenuRef.current?.contains(target);
      if (!isInsideDesktopNotif && !isInsideMobileNotif) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchFocused(true);
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setSearchQuery('');
        setIsProfileModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [theme, setTheme] = useState(() => {
    const saved = safeLocalStorage.getItem('theme');
    return (saved as any) || 'light';
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    safeLocalStorage.setItem('theme_preference', 'true');
  };

  const isDarkMode = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    safeLocalStorage.setItem('theme', theme);
  }, [theme, isDarkMode]);

  useEffect(() => {
    if (systemSettings.appName) {
      document.title = systemSettings.appName;
    }
  }, [systemSettings.appName]);

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;
    try {
      const updatedData = {
        ...userProfile,
        ...profileEditData,
        updatedAt: new Date().toISOString()
      };

      // Clean undefined values to prevent Firestore errors
      Object.keys(updatedData).forEach(key => {
        if (updatedData[key as keyof UserProfile] === undefined) {
          delete updatedData[key as keyof UserProfile];
        }
      });

      await updateDoc(doc(db, 'users', user.uid), updatedData);
      setUserProfile(updatedData);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleSaveProfileField = async (changes: Partial<UserProfile>) => {
    if (!user || !userProfile) return;
    try {
      const updatedData = {
        ...userProfile,
        ...changes,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'users', user.uid), updatedData);
      setUserProfile(updatedData);
    } catch (error) {
      console.error("Error saving profile field:", error);
    }
  };

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data() as SystemSettings;
        setSystemSettings(settings);

        // Apply default theme only if user hasn't explicitly set one in this session's localStorage
        const hasUserPreference = safeLocalStorage.getItem('theme_preference');
        if (!hasUserPreference && settings.defaultTheme) {
          setTheme(settings.defaultTheme);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_settings/main');
    });

    const unsubReg = onSnapshot(doc(db, 'system_config', 'registration'), (snapshot) => {
      if (snapshot.exists()) {
        setRegSettings(snapshot.data() as RegistrationSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_config/registration');
    });

    const unsubFeatures = onSnapshot(doc(db, 'system_config', 'features'), (snapshot) => {
      if (snapshot.exists()) {
        setFeatureStates(snapshot.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_config/features');
    });

    const unsubFeatureSettings = onSnapshot(doc(db, 'system_config', 'feature_settings'), (snapshot) => {
      if (snapshot.exists()) {
        setFeatureSettings(snapshot.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_config/feature_settings');
    });

    if (!user) {
      setRolePermissions([]);
      setTitlePermissions([]);
      setPermsLoading(false);
      setConfigRoles([]);
      return () => {
        unsubSettings();
        unsubReg();
        unsubFeatures();
        unsubFeatureSettings();
      };
    }

    setPermsLoading(true);

    // Current user profile listener for real-time sync
    const unsubUserProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });



    // Safety timeout for permissions loading
    const permsTimeout = setTimeout(() => {
      setPermsLoading(false);
    }, 3000);

    const unsubConfigRoles = onSnapshot(collection(db, 'config_roles'), (snapshot) => {
      setConfigRoles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config_roles');
    });

    const unsubRolePerms = onSnapshot(collection(db, 'role_permissions'), (snapshot) => {
      setRolePermissions(snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'role_permissions');
    });

    const unsubTitlePerms = onSnapshot(collection(db, 'title_permissions'), (snapshot) => {
      setTitlePermissions(snapshot.docs.map(doc => doc.data()));
      setPermsLoading(false);
      clearTimeout(permsTimeout);
    }, (error) => {
      setPermsLoading(false);
      clearTimeout(permsTimeout);
      handleFirestoreError(error, OperationType.LIST, 'title_permissions');
    });

    // Notifications listener
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubNotifications = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      
      if (isInitialNotificationsLoad.current) {
        existingNotificationIds.current = items.map(x => x.id);
        isInitialNotificationsLoad.current = false;
      } else {
        const newItems = items.filter(x => !existingNotificationIds.current.includes(x.id));
        if (newItems.length > 0) {
          newItems.forEach(n => {
            const category = getNotificationCategory(n, false);
            addToastPopup(
              n.id,
              n.title || "Thông báo mới",
              n.message || "",
              category,
              { ...n, isAnnouncement: false }
            );
          });
          existingNotificationIds.current = [
            ...existingNotificationIds.current,
            ...newItems.map(x => x.id)
          ];
        }
      }

      setNotifications(items);
    }, (error) => {
      console.error("Error loading notifications:", error);
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    const qAnnouncements = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
      const allAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));

      // Filter based on user profile targets
      const filtered = allAnnouncements.filter(ann => {
        // Admins can see everything
        if (userProfile?.role === 'admin') return true;

        // If no targets defined, it's global
        const hasTargets = (ann.targetRoles && ann.targetRoles.length > 0) ||
          (ann.targetTitles && ann.targetTitles.length > 0);

        if (!hasTargets) return true;

        // Match if user role or title is in the target list
        const roleMatched = ann.targetRoles?.includes(userProfile?.role || '');
        const titleMatched = ann.targetTitles?.includes(userProfile?.title || '');

        return roleMatched || titleMatched;
      });

      if (isInitialAnnouncementsLoad.current) {
        existingAnnouncementIds.current = filtered.map(x => x.id);
        isInitialAnnouncementsLoad.current = false;
      } else {
        const newItems = filtered.filter(x => !existingAnnouncementIds.current.includes(x.id));
        if (newItems.length > 0) {
          newItems.forEach(a => {
            const category = getNotificationCategory(a, true);
            const title = a.title || (a.type === 'drug_update' ? `Cập bến/Cập nhật: ${a.drugName || 'Thuốc'}` : 'Thông báo hệ thống');
            addToastPopup(
              a.id,
              title,
              a.content || "",
              category,
              { ...a, isAnnouncement: true }
            );
          });
          existingAnnouncementIds.current = [
            ...existingAnnouncementIds.current,
            ...newItems.map(x => x.id)
          ];
        }
      }

      setAnnouncements(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    });

    return () => {
      unsubUserProfile();
      unsubConfigRoles();
      unsubRolePerms();
      unsubTitlePerms();
      unsubNotifications();
      unsubAnnouncements();
      unsubSettings();
      unsubReg();
      unsubFeatures();
      unsubFeatureSettings();
    };
  }, [user, userProfile?.role, userProfile?.title, userProfile?.uid]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: false });
    } catch (error) {
      console.error("Error marking notification as unread:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // 1. Mark all personal notifications as read
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < unread.length; i += batchSize) {
          const chunk = unread.slice(i, i + batchSize);
          await Promise.all(chunk.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true })));
        }
      }

      // 2. Mark all announcements as read
      const allAnnIds = announcements.map(a => a.id);
      setReadAnnouncementIds(prev => {
        const next = Array.from(new Set([...prev, ...allAnnIds]));
        safeLocalStorage.setItem('read_announcements', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const renderNotificationItem = (item: any, isDesktop: boolean = false, index?: number) => {
    const isClinicalAlert = item.category === 'clinical_alert';
    const isDataUpdate = item.category === 'data_update';
    const isMedicalNews = item.category === 'medical_news_personal';
    const isSystem = item.category === 'system';
    
    let IconComponent = Info;
    let iconBgColor = "bg-blue-500/10 text-blue-500";
    let borderStyle = isDarkMode ? "border-slate-800 bg-slate-900/30 text-slate-400" : "border-slate-100 bg-slate-50/30 text-slate-500";
    let categoryBadge = "";

    if (isClinicalAlert) {
      IconComponent = AlertOctagon;
      iconBgColor = "bg-rose-500/15 text-rose-500 dark:bg-rose-500/20";
      categoryBadge = "🔴 Cảnh báo lâm sàng";
      if (!item.isRead) {
        borderStyle = isDarkMode 
          ? "border-rose-500/40 bg-rose-950/20 shadow-md shadow-rose-950/20 text-slate-200" 
          : "border-rose-200 bg-rose-50/80 shadow-sm text-slate-800";
      }
    } else if (isDataUpdate) {
      IconComponent = Pill;
      iconBgColor = "bg-amber-500/15 text-amber-500 dark:bg-amber-500/20";
      categoryBadge = "🟡 Dữ liệu";
      if (!item.isRead) {
        borderStyle = isDarkMode 
          ? "border-amber-500/40 bg-amber-950/20 shadow-md shadow-amber-950/20 text-slate-200" 
          : "border-amber-200 bg-amber-50/85 shadow-sm text-slate-800";
      }
    } else if (isMedicalNews) {
      IconComponent = FileText;
      iconBgColor = "bg-sky-500/15 text-sky-500 dark:bg-sky-500/20";
      categoryBadge = "🔵 Tin tức y khoa / Cá nhân";
      if (!item.isRead) {
        borderStyle = isDarkMode 
          ? "border-sky-500/40 bg-sky-950/20 shadow-md shadow-sky-950/20 text-slate-200" 
          : "border-sky-200 bg-sky-50/85 shadow-sm text-slate-800";
      }
    } else if (isSystem) {
      IconComponent = Settings;
      iconBgColor = "bg-slate-500/15 text-slate-400 dark:bg-slate-500/20";
      categoryBadge = "⚙️ Hệ thống";
      if (!item.isRead) {
        borderStyle = isDarkMode 
          ? "border-slate-500/40 bg-slate-800/60 shadow-md text-slate-200" 
          : "border-slate-200 bg-slate-100/80 shadow-sm text-slate-800";
      }
    }

    return (
      <div
        key={`${item.id || 'notif'}-${index ?? 0}`}
        onClick={() => {
          if (!item.isRead) {
            toggleReadStatus(item);
          }
        }}
        className={cn(
          "p-2.5 rounded-xl border transition-all relative group flex flex-col gap-2",
          !item.isRead ? "cursor-pointer hover:scale-[1.01]" : "opacity-75 hover:opacity-100",
          borderStyle
        )}
      >
        <div className="flex gap-2.5">
          <div className={cn("p-1.5 rounded-lg shrink-0 h-fit", iconBgColor)}>
            <IconComponent size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <div className="flex flex-col min-w-0">
                <span className="text-[7.5px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-0.5">
                  {categoryBadge}
                </span>
                <h4 className={cn("font-bold text-[10.5px] leading-tight", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                  {item.title}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!item.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                )}
                <span className="text-[8px] text-slate-400 font-medium shrink-0">
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
            
            <div className={cn("text-[9.5px] leading-relaxed transition-colors prose prose-sm max-w-none mb-1.5", isDarkMode ? "text-slate-300 prose-invert" : "text-slate-600")}>
              {item.isAnnouncement ? (
                <ReactMarkdown>{item.message}</ReactMarkdown>
              ) : (
                <p>{item.message}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between border-t border-dashed border-slate-500/10 pt-1.5 mt-1">
              <div className="flex items-center gap-1.5">
                {item.isRead ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleReadStatus(item);
                    }}
                    className="text-[8px] font-bold text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-500 flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-500/5 hover:bg-amber-500/10 border border-slate-500/10 transition-all cursor-pointer"
                    title="Bấm để đánh dấu chưa đọc"
                  >
                    <CheckCheck size={10} className="text-emerald-500" /> Đã đọc
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleReadStatus(item);
                    }}
                    className="text-[8px] font-black text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 hover:underline flex items-center gap-0.5 cursor-pointer px-1 py-0.5 rounded transition-all"
                  >
                    <Check size={8} /> Đánh dấu đã đọc
                  </button>
                )}
                
                {item.drugName && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenGlobalDrugModal(item.drugName);
                    }}
                    className="text-[8px] font-black text-emerald-500 hover:text-emerald-600 hover:underline flex items-center gap-0.5 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    <Pill size={8} /> Chi tiết thuốc
                  </button>
                )}

                {item.link && item.link !== 'drugs' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(item.link!);
                      setIsNotificationsOpen(false);
                      if (!item.isRead) {
                        toggleReadStatus(item);
                      }
                    }}
                    className="text-[8px] font-black text-indigo-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Zap size={8} /> Xem trang
                  </button>
                )}
              </div>

              {!item.isAnnouncement && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(item.id);
                  }}
                  className="text-[8px] font-black text-rose-500 hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer px-1 py-0.5 rounded"
                >
                  <Trash2 size={8} /> Xóa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Set user immediately to trigger UI transition from Login page
      setUser(currentUser);

      // Safety timeout for auth readiness
      const authTimeout = setTimeout(() => {
        setIsAuthReady(true);
      }, 5000);

      if (currentUser) {
        try {
          // Try to reload to get latest info, but don't fail if network is flaky
          try {
            await currentUser.reload();
          } catch (reloadErr: any) {
            console.warn("User reload failed (network issue?), proceeding with current data", reloadErr);
          }

          const refreshedUser = auth.currentUser; // Get the reloaded version if available

          if (!refreshedUser) {
            setIsAuthReady(true);
            return;
          }

          const userRef = doc(db, 'users', refreshedUser.uid);

          // Try to get from cache first if possible, or just use getDoc which handles both
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            let profile = userSnap.data() as UserProfile;

            // Log visit count and last visit exactly once per app session
            if (!isVisitLoggedThisSession) {
              isVisitLoggedThisSession = true;
              try {
                await updateDoc(userRef, {
                  lastVisit: serverTimestamp(),
                  visitCount: increment(1)
                });
                profile.lastVisit = new Date().toISOString();
                profile.visitCount = (profile.visitCount || 0) + 1;
              } catch (visitErr) {
                console.warn("Failed to update visit stats for existing user:", visitErr);
              }
            }

            const isAdminEmail = refreshedUser.email === 'ttytkvbinhphu@gmail.com';

            // Force approval and admin role for the master admin
            if (isAdminEmail && (!profile.isApproved || profile.role !== 'admin')) {
              try {
                await updateDoc(userRef, {
                  isApproved: true,
                  role: 'admin' as const,
                  updatedAt: new Date().toISOString()
                });
                profile = { ...profile, isApproved: true, role: 'admin' };
              } catch (e) {
                console.warn("Admin auto-upgrade failed", e);
              }
            }

            // Sync with Google profile info if changed
            // We check providerData for potentially fresher info
            const googlePhoto = refreshedUser.providerData[0]?.photoURL || refreshedUser.photoURL;
            const googleName = refreshedUser.providerData[0]?.displayName || refreshedUser.displayName;

            const isPlaceholderName = !profile.displayName || profile.displayName === 'Quản trị viên' || profile.displayName === 'Thành viên mới';
            if (profile.photoURL !== googlePhoto || (googleName && profile.displayName !== googleName && (isPlaceholderName || !profile.displayName))) {
              const profileUpdates = {
                title: profile.title || 'Chưa cập nhật',
                position: profile.position || 'Chưa cập nhật',
                specialty: profile.specialty || 'Không',
                photoURL: googlePhoto || profile.photoURL || '',
                displayName: googleName || profile.displayName,
                photoSyncToken: Date.now().toString(),
                updatedAt: new Date().toISOString()
              };
              try {
                await updateDoc(userRef, profileUpdates);
                profile = { ...profile, ...profileUpdates };
              } catch (e) {
                console.warn("Google sync failed", e);
              }
            }

            // Migration: Convert generic operator to specialized roles
            if (profile.role === 'operator' as any) {
              let newRole: any = 'operator_doctor';
              if ((profile.title || '').toLowerCase().includes('dược')) {
                newRole = 'operator_pharmacist';
              }
              try {
                await updateDoc(userRef, {
                  role: newRole,
                  updatedAt: new Date().toISOString()
                });
                profile = { ...profile, role: newRole };
              } catch (e) {
                console.warn("Operator migration failed", e);
              }
            }

            setUserProfile(profile);
          } else {
            // New user logic
            const isAdmin = currentUser.email === 'ttytkvbinhphu@gmail.com';
            const isAnonymous = currentUser.isAnonymous;

            isVisitLoggedThisSession = true; // Mark as logged since we are initializing it now

            const freshProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || (isAnonymous ? 'Khách truy cập' : (isAdmin ? 'Quản trị viên' : 'Thành viên mới')),
              photoURL: currentUser.photoURL || '',
              role: isAdmin ? 'admin' : (isAnonymous ? 'member' : (regSettings.defaultRoleId as any || 'unapproved')),
              isApproved: isAdmin || isAnonymous || regSettings.autoApprove, // Auto-approve admin or anonymous or if setting is on
              title: isAdmin ? 'Bác sĩ' : (regSettings.defaultTitleId || 'Chưa cập nhật'),
              position: isAdmin ? 'Giám đốc' : 'Chưa cập nhật',
              specialty: 'Không',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisit: serverTimestamp(),
              visitCount: increment(1)
            };

            // Set profile locally first so UI transitions immediately
            setUserProfile(freshProfile);

            // Then persist to Firestore
            try {
              await setDoc(userRef, freshProfile);
            } catch (error) {
              console.error("Critical: Failed to persist new user profile:", error);
            }
          }

          // Seed initial data non-blockingly only for admins
          const isUserAdmin = (userSnap.exists() && (userSnap.data() as UserProfile).role === 'admin') || currentUser.email === 'ttytkvbinhphu@gmail.com';
          if (isUserAdmin) {
            seedInitialData(currentUser.uid);
          }
        } catch (error: any) {
          if (error?.code?.startsWith('auth/')) {
            console.warn("Auth-related error during profile fetch (may be network issue):", error);
          } else {
            console.error("Error fetching user profile:", error);
            // Only show handleFirestoreError if it's likely a Firestore error
            if (error?.code?.includes('permission') || error?.code?.includes('unavailable')) {
              try {
                handleFirestoreError(error, OperationType.GET, `users/${currentUser?.uid}`);
              } catch (detailedError) {
                console.error("Detailed Fetch Error:", detailedError);
              }
            }
          }
        }
      } else {
        setUserProfile(null);

        // Auto sign in anonymously when unauthenticated (if enabled in Firebase)
        const autoAnonymouslySignIn = async () => {
          if (isSigningInAnonymously) return;
          isSigningInAnonymously = true;
          try {
            await signInAnonymously(auth);
          } catch (error: any) {
            if (error?.code === 'auth/admin-restricted-operation' || error?.message?.includes('admin-restricted-operation')) {
              // Anonymous sign-in is disabled in Firebase console, operate in standard unauthenticated guest mode
            } else {
              console.warn("Failed to sign in anonymously:", error);
            }
          } finally {
            isSigningInAnonymously = false;
          }
        };
        autoAnonymouslySignIn();

        // Log guest access if unauthenticated
        const logGuestAccess = async () => {
          try {
            const todayStr = new Date().toLocaleDateString('sv-SE'); // Local date "YYYY-MM-DD"
            const storageKey = `guest_access_logged_${todayStr}`;
            const lastLoggedDate = safeLocalStorage.getItem(storageKey);

            if (!lastLoggedDate) {
              const logId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
              const ip = (await getIpAddress()) || '127.0.0.1';
              const mac = getMacAddress() || 'Chưa nhận';
              const dev = getDeviceName() || 'Thiết bị không xác định';
              const userAgent = navigator.userAgent || 'Unknown';

              await setDoc(doc(db, 'guest_logs', logId), {
                id: logId,
                ipAddress: ip,
                macAddress: mac,
                device: dev,
                userAgent: userAgent,
                timestamp: new Date().toISOString()
              });

              safeLocalStorage.setItem(storageKey, todayStr);
            }
          } catch (error) {
            console.warn("Failed to log guest access", error);
          }
        };
        logGuestAccess();
      }

      clearTimeout(authTimeout);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        // Log explicit login
        const logId = Date.now().toString();
        try {
          const ip = await getIpAddress();
          const mac = getMacAddress();
          const dev = getDeviceName();
          await setDoc(doc(db, 'auth_logs', logId), {
            id: logId,
            userId: result.user.uid,
            userEmail: result.user.email,
            userName: result.user.displayName || 'Người dùng',
            type: 'login',
            timestamp: new Date().toISOString(),
            ipAddress: ip,
            macAddress: mac,
            device: dev
          });
          // Avoid duplicate automated daily check logging for this login interaction
          const todayStr = new Date().toLocaleDateString('sv-SE');
          const storageKey = `daily_access_logged_${result.user.uid}_${mac}`;
          safeLocalStorage.setItem(storageKey, todayStr);
        } catch (logError) {
          console.warn("Failed to create auth log:", logError);
          // Don't block login if logging fails
        }
      }
    } catch (error: any) {
      const errorCode = error?.code;
      const errorMessage = error?.message || '';

      // Don't log expected cancellations or duplicate request errors
      const isCancellation =
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request' ||
        errorMessage.includes('auth/popup-closed-by-user') ||
        errorMessage.includes('auth/cancelled-popup-request');

      if (!isCancellation) {
        if (errorCode === 'auth/popup-blocked') {
          alert("Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép hiện cửa sổ bật lên (popup) trên trình duyệt của bạn và thử lại.");
          return;
        }

        console.error("Login error details:", error);
        // If it's a Firestore error, get more details
        if (errorCode?.includes('permission') || errorMessage.toLowerCase().includes('permission')) {
          try {
            handleFirestoreError(error, OperationType.WRITE, 'auth_logs');
          } catch (detailedError) {
            console.error("Detailed Permission Error:", detailedError.message);
          }
        }
        alert("Lỗi đăng nhập: " + (errorMessage || "Lỗi không xác định"));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsProfileModalOpen(false);
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    if (user) {
      // Log explicit logout
      const logId = Date.now().toString();
      try {
        const ip = await getIpAddress();
        const mac = getMacAddress();
        const dev = getDeviceName();
        await setDoc(doc(db, 'auth_logs', logId), {
          id: logId,
          userId: user.uid,
          userEmail: user.email,
          userName: userProfile?.displayName || user.displayName || 'Người dùng',
          type: 'logout',
          timestamp: new Date().toISOString(),
          ipAddress: ip,
          macAddress: mac,
          device: dev
        });
      } catch (e) {
        console.warn("Logout logging failed", e);
      }
    }
    await signOut(auth);
  };

  if (!isAuthReady) {
    return (
      <div className={cn(
        "h-[100dvh] flex items-center justify-center transition-colors",
        isDarkMode ? "bg-slate-950" : "bg-slate-50"
      )}>
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const features = [
      {
        id: 'drugs',
        icon: <Search className="text-blue-500" size={24} />,
        title: "Tra cứu thuốc",
        description: "Thông tin chi tiết về hàng ngàn loại thuốc, biệt dược và hoạt chất."
      },
      {
        id: 'icd10',
        icon: <ClipboardList className="text-emerald-500" size={24} />,
        title: "Tra cứu ICD-10",
        description: "Hệ thống mã hóa bệnh tật quốc tế đầy đủ và dễ tra cứu."
      },
      {
        id: 'interaction',
        icon: <Zap className="text-amber-500" size={24} />,
        title: "Tra cứu tương tác",
        description: "Kiểm tra tương tác thuốc-thuốc nhanh chóng và chính xác."
      },
      {
        id: 'community',
        icon: <MessageSquare className="text-indigo-500" size={24} />,
        title: "Trao đổi chuyên môn",
        description: "Kết nối và chia sẻ kinh nghiệm lâm sàng với đồng nghiệp."
      }
    ];

    return (
      <div className={cn(
        "h-[100dvh] flex items-center justify-center p-4 lg:p-12 relative overflow-hidden font-sans transition-colors",
        isDarkMode ? "bg-slate-950" : "bg-slate-50"
      )}>
        <UpdateNotification isDarkMode={isDarkMode} uid={user?.uid} />
        {/* Dynamic Background */}
        {systemSettings.loginBgUrl && (
          <div className="absolute inset-0 z-0">
            <img
              src={systemSettings.loginBgUrl || undefined}
              className="w-full h-full object-cover"
              alt="Background"
              style={{ filter: `blur(${systemSettings.loginBgBlur || 0}px)` }}
              referrerPolicy="no-referrer"
            />
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: (systemSettings.loginBgOpacity || 0) / 100 }}
            />
          </div>
        )}

        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_50%)]" />
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />

        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Side: Intro */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block space-y-10"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold">
                <Sparkles size={16} />
                <span>Nền tảng y tế thông minh</span>
              </div>
              <h2 className={cn(
                "text-6xl font-black leading-[1.1] tracking-tight",
                systemSettings.loginBgUrl ? "text-white" : (isDarkMode ? "text-white" : "text-slate-900")
              )}>
                Nâng tầm <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">Chất lượng Y tế</span>
              </h2>
              <p className={cn(
                "text-xl font-medium max-w-lg",
                systemSettings.loginBgUrl ? "text-white/80" : (isDarkMode ? "text-slate-400" : "text-slate-500")
              )}>
                {systemSettings.appDescription}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => {
                    const checkGuestAccess = (tabId: string) => {
                      const settings = featureSettings[tabId] || {};
                      const status = featureStates[tabId];
                      if (status === 'closed' || status === 'maintenance') return false;
                      const allowedRoles = settings.allowedRoles || [];
                      return allowedRoles.length === 0 || allowedRoles.includes('guest');
                    };

                    if (feature.id === 'drugs') {
                      if (checkGuestAccess('view_directory')) setGuestView('drugs');
                      else setShowLoginPrompt(true);
                    }
                    else if (feature.id === 'icd10') {
                      if (checkGuestAccess('view_icd10')) setGuestView('icd10');
                      else setShowLoginPrompt(true);
                    }
                    else setShowLoginPrompt(true);
                  }}
                  className={cn(
                    "p-6 rounded-3xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group text-left relative overflow-hidden",
                    (systemSettings.loginBgUrl || isDarkMode) ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100"
                  )}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-primary" />
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm",
                    (systemSettings.loginBgUrl || isDarkMode) ? "bg-slate-800" : "bg-slate-50"
                  )}>
                    {feature.icon}
                  </div>
                  <h3 className={cn("text-lg font-bold mb-2 group-hover:text-primary transition-colors", (systemSettings.loginBgUrl || isDarkMode) ? "text-white" : "text-slate-900")}>{feature.title}</h3>
                  <p className={cn("text-sm leading-relaxed", (systemSettings.loginBgUrl || isDarkMode) ? "text-slate-400" : "text-slate-500")}>{feature.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Right Side: Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "w-full max-w-md mx-auto rounded-[48px] p-10 lg:p-12 relative z-10 border transition-all",
              systemSettings.loginCardGlassMode
                ? "bg-white/10 backdrop-blur-xl border-white/20 shadow-none text-white"
                : (isDarkMode ? "bg-slate-900 border-slate-800 shadow-none" : "bg-white border-slate-100 shadow-2xl shadow-slate-200/50")
            )}
          >
            <div className="text-center mb-10">
              <div
                className={cn(
                  "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3",
                  isDarkMode || systemSettings.loginCardGlassMode ? "shadow-none" : "shadow-2xl shadow-primary/20"
                )}
                style={{ backgroundColor: systemSettings.loginPrimaryColor || '#3b82f6' }}
              >
                {systemSettings.loginLogoUrl ? (
                  <img src={systemSettings.loginLogoUrl || undefined} className="w-16 h-16 object-contain" alt="Logo" referrerPolicy="no-referrer" />
                ) : (
                  <img src="/icon-512.png" className="w-16 h-16 object-contain" alt="Logo" />
                )}
              </div>
              <h1 className={cn("text-4xl font-black tracking-tight mb-2 transition-colors", (isDarkMode || systemSettings.loginCardGlassMode) ? "text-white" : "text-slate-900")}>
                {systemSettings.loginTitle || systemSettings.appName}
              </h1>
              <p className={cn("font-medium text-lg transition-colors", (isDarkMode || systemSettings.loginCardGlassMode) ? "text-white/60" : "text-slate-500")}>
                {systemSettings.loginSubtitle}
              </p>
            </div>

            {/* Mobile Features (Visible only on mobile) */}
            <div className="lg:hidden grid grid-cols-2 gap-3 mb-8">
              {features.map((f, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={loginLoading}
                  onClick={() => {
                    const checkGuestAccess = (tabId: string) => {
                      const settings = featureSettings[tabId] || {};
                      const status = featureStates[tabId];
                      if (status === 'closed' || status === 'maintenance') return false;
                      const allowedRoles = settings.allowedRoles || [];
                      return allowedRoles.length === 0 || allowedRoles.includes('guest');
                    };

                    if (f.id === 'drugs') {
                      if (checkGuestAccess('view_directory')) setGuestView('drugs');
                      else setShowLoginPrompt(true);
                    }
                    else if (f.id === 'icd10') {
                      if (checkGuestAccess('view_icd10')) setGuestView('icd10');
                      else setShowLoginPrompt(true);
                    }
                    else setShowLoginPrompt(true);
                  }}
                  className={cn(
                    "p-3 rounded-2xl border flex flex-col items-center text-center transition-all active:scale-95 disabled:opacity-50",
                    (isDarkMode || systemSettings.loginCardGlassMode) ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                  )}
                >
                  <div className="mb-2">{f.icon}</div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    (isDarkMode || systemSettings.loginCardGlassMode) ? "text-slate-300" : "text-slate-700"
                  )}>{f.title}</span>
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {regSettings.allowNewRegistration ? (
                <button
                  onClick={handleLogin}
                  disabled={loginLoading}
                  className={cn(
                    "w-full py-5 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]",
                    (isDarkMode || systemSettings.loginCardGlassMode)
                      ? "bg-primary hover:bg-primary/90 shadow-none disabled:bg-slate-800"
                      : "bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 disabled:bg-slate-300"
                  )}
                >
                  {loginLoading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Đăng nhập với Google <LogIn size={20} />
                    </>
                  )}
                </button>
              ) : (
                <div className={cn(
                  "p-6 rounded-3xl border-2 border-dashed flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-500",
                  (isDarkMode || systemSettings.loginCardGlassMode) ? "bg-rose-500/5 border-rose-500/20" : "bg-rose-50 border-rose-100"
                )}>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
                    <AlertOctagon size={32} />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-black tracking-tight mb-2", (isDarkMode || systemSettings.loginCardGlassMode) ? "text-white" : "text-slate-900")}>
                      Tạm dừng đăng ký mới
                    </h3>
                    <p className={cn("text-xs font-bold leading-relaxed", (isDarkMode || systemSettings.loginCardGlassMode) ? "text-slate-400" : "text-slate-500")}>
                      {regSettings.registrationDisabledReason || "Hệ thống hiện đang tạm dừng tiếp nhận thành viên mới. Vui lòng liên hệ Quản trị viên để biết thêm chi tiết."}
                    </p>
                  </div>
                  <div className="w-full h-px bg-rose-500/10" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/60 flex items-center gap-2">
                    <ShieldCheck size={12} /> Protected by System Administrator
                  </p>
                </div>
              )}
              <div className="flex items-center gap-4 py-2">
                <div className={cn("h-px flex-1", (isDarkMode || systemSettings.loginCardGlassMode) ? "bg-white/20" : "bg-slate-100")} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bảo mật bởi Google</span>
                <div className={cn("h-px flex-1", (isDarkMode || systemSettings.loginCardGlassMode) ? "bg-white/20" : "bg-slate-100")} />
              </div>
              <p className={cn("text-center text-sm font-medium transition-colors", (isDarkMode || systemSettings.loginCardGlassMode) ? "text-white/40" : "text-slate-400")}>
                Vui lòng sử dụng tài khoản Google để truy cập hệ thống.
              </p>

              <div className="pt-4 space-y-4">
                <div className="text-center">
                  <button
                    onClick={() => setGuestView('terms')}
                    className={cn(
                      "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wide transition-colors hover:underline",
                      (isDarkMode || systemSettings.loginCardGlassMode) ? "text-white/30 hover:text-white/60" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <FileText size={12} />
                    Điều khoản sử dụng
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Login Prompt Notification */}
        <AnimatePresence>
          {showLoginPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 50, x: '-50%' }}
              className={cn(
                "fixed bottom-10 left-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border min-w-[320px]",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <p className="font-black text-sm uppercase tracking-wider mb-0.5">Yêu cầu đăng nhập</p>
                <p className={cn("text-xs font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>Vui lòng đăng nhập để sử dụng tính năng này.</p>
              </div>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDarkMode ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-50 text-slate-300"
                )}
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guest View Overlay - Drugs & ICD10 (Full Modal) */}

        {/* Guest View Overlays - Shared */}
        <AnimatePresence>
          {(guestView === 'drugs' || guestView === 'icd10') && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 lg:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setGuestView('none')}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                className={cn(
                  "relative w-full h-full lg:h-[90vh] lg:max-w-7xl rounded-none sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border transition-colors",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}
              >
                <div className={cn(
                  "px-6 py-4 border-b flex items-center justify-between sticky top-0 z-50",
                  isDarkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-100 shadow-sm"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      guestView === 'drugs' ? "bg-blue-500/10 text-blue-500" :
                        "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {guestView === 'drugs' ? <Pill size={20} /> : <ClipboardList size={20} />}
                    </div>
                    <div>
                      <h3 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                        {guestView === 'drugs' ? 'Tra cứu Thuốc' : 'Tra cứu ICD-10'}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Chế độ khách
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setGuestView('none')}
                    className={cn(
                      "p-2.5 rounded-xl transition-all hover:rotate-90",
                      isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>}>
                    {guestView === 'drugs' && (
                      <div className="h-full">
                        <DrugDirectory
                          canManage={false}
                          isDarkMode={isDarkMode}
                          featureSettings={featureSettings['view_directory']}
                          userRole={userProfile?.role}
                          userPowerPoints={userProfile?.role ? (configRoles.find(r => r.id === userProfile.role)?.powerPoints ?? 0) : 0}
                        />
                      </div>
                    )}
                    {guestView === 'icd10' && (
                      <div className="h-full p-4 lg:p-8">
                        <ICD10Management
                          canManage={false}
                          isDarkMode={isDarkMode}
                          featureSettings={featureSettings['view_icd10']}
                          userRole={userProfile?.role}
                          userPowerPoints={userProfile?.role ? (configRoles.find(r => r.id === userProfile.role)?.powerPoints ?? 0) : 0}
                        />
                      </div>
                    )}
                  </Suspense>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {guestView === 'terms' && (
            <div className="fixed inset-0 z-[180] flex justify-end pointer-events-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setGuestView('none')}
                className="absolute inset-0 bg-slate-900/40 pointer-events-auto"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 28, stiffness: 200 }}
                className={cn(
                  "relative w-full h-full sm:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl shadow-2xl overflow-hidden border-l transition-colors flex flex-col pointer-events-auto",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100",
                  "lg:rounded-l-[40px]"
                )}
              >
                <div className={cn(
                  "px-6 h-[60px] border-b flex items-center justify-between sticky top-0 z-50",
                  isDarkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-100 shadow-sm"
                )}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                        Điều khoản sử dụng
                      </h3>
                      <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                        Thông tin pháp lý
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setGuestView('none')}
                    className={cn(
                      "p-2 rounded-2xl transition-all hover:rotate-90",
                      isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-12">
                  <div className="terms-content transition-colors">
                    {systemSettings.termsOfUse ? (
                      <ReactMarkdown>{systemSettings.termsOfUse}</ReactMarkdown>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <FileText size={48} className="mb-4" />
                        <p className="font-bold">Nội dung đang được cập nhật...</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "p-6 border-t flex items-center justify-between",
                  isDarkMode ? "bg-slate-800/20 border-slate-800" : "bg-slate-50/50 border-slate-100"
                )}>
                  <p className="text-[10px] text-slate-500 font-medium">Bản cập nhật cuối: {systemSettings.termsUpdateDate ? systemSettings.termsUpdateDate.split('-').reverse().join('/') : new Date().toLocaleDateString('vi-VN')}</p>
                  <button
                    onClick={() => setGuestView('none')}
                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-[0.98]"
                  >
                    Đã hiểu
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!userProfile || permsLoading) {
    return (
      <div className={cn(
        "h-[100dvh] flex items-center justify-center transition-colors",
        isDarkMode ? "bg-slate-950" : "bg-slate-50"
      )}>
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Dynamic permission check
  const rolePerm = rolePermissions.find(p => p.roleId === userProfile.role);
  const titlePerm = titlePermissions.find(p => p.titleId === userProfile.title);
  const userPowerPoints: number = configRoles.find(r => r.id === userProfile.role)?.powerPoints ?? 0;

  const roleAllowedTabs = rolePerm?.allowedTabs || [];
  const titleAllowedTabs = titlePerm?.allowedTabs || [];

  // Combine permissions: Role (Management) + Title (Work)
  // Standard public features that should be accessible if not explicitly closed/maintenance
  const standardFeatures = [
    'view_social',
    'view_calendar',
    'view_notes',
    'view_profile',
    'view_patients',
    'view_calculator',
    'view_todo',
    'view_directory',
    'view_icd10',
    'view_interaction',
    'view_adr',
    'view_prescription',
    'view_doc_lookup'
  ];

  const userRole = userProfile.role;
  const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userRole);

  let allowedTabs = Array.from(new Set([
    ...roleAllowedTabs,
    ...titleAllowedTabs,
    ...standardFeatures
  ])).filter(tabId => {
    // Hidden features check
    const status = featureStates[tabId];
    if (status === 'closed') return false;
    if (status === 'maintenance' && !isPrivileged) return false;

    // Feature settings check (banned users)
    const settings = featureSettings[tabId] || {};
    const bannedUsers = settings.bannedUsers || [];
    if (user && bannedUsers.includes(user.uid)) return false;

    return true;
  });

  // Auto-allow admin tabs for admins
  if (userRole === 'admin') {
    const adminTabs = ALL_TABS.filter(t => t.id.startsWith('admin_')).map(t => t.id);
    allowedTabs = Array.from(new Set([...allowedTabs, ...adminTabs]));
  }

  // CRITICAL: Restrict access for unapproved users but allow specifically configured features
  if (!userProfile.isApproved) {
    const unapprovedAllowed = ALL_TABS.filter(t => {
      // Hard block management and admin features for unapproved users
      if (t.id.startsWith('manage_') || t.id.startsWith('admin_')) return false;
      
      const settings = featureSettings[t.id] || {};
      const allowedRoles = settings.allowedRoles || [];
      // Allow if explicitly allowed for 'unapproved' or 'guest', OR if no restrictions (public)
      return allowedRoles.length === 0 || allowedRoles.includes('unapproved') || allowedRoles.includes('guest');
    }).map(t => t.id);
    allowedTabs = Array.from(new Set(['dashboard', ...unapprovedAllowed]));
  }

  // Check if any utilities are active to show/hide the Header Apps Menu
  const hasUtilities = ALL_TABS.some(t => {
    const status = featureStates[t.id];
    const settings = featureSettings[t.id];
    const isBanned = settings?.bannedUsers?.includes(userProfile?.uid);
    const allowedRoles = settings?.allowedRoles || [];
    const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(userProfile?.role);
    const isVisible = status !== 'closed' && (status !== 'maintenance' || isPrivileged) && !isBanned && roleAllowed;
    const showInUtilities = (settings?.hiddenLocations || []).includes('utilities_box');
    return isVisible && allowedTabs.includes(t.id) && !t.id.startsWith('manage_') && showInUtilities;
  });

  const currentTabItem = ALL_TABS.find(t => t.id === activeTab);

  const renderContent = () => {
    if (!userProfile) return null;

    const isManagementMode = activeTab.startsWith('manage_');
    const baseTab = activeTab.replace('manage_', '').replace('view_', '');

    // Security check
    if (activeTab !== 'dashboard') {
      const settings = featureSettings[activeTab] || {};
      const isBanned = settings.bannedUsers?.includes(userProfile.uid);
      const allowedRoles = settings.allowedRoles || [];
      
      // If user is not approved, treat their role as 'unapproved' for the sake of role check
      const checkRole = userProfile.isApproved ? userProfile.role : 'unapproved';
      const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(checkRole);

      const hasAccess = (allowedTabs.includes(activeTab) || (activeTab.startsWith('admin_') && userProfile.role === 'admin')) && !isBanned && roleAllowed;
      if (!hasAccess) {
        return (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black mb-2">Truy cập bị từ chối</h3>
            <p className={cn("max-w-md mx-auto", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              {isBanned
                ? "Bạn đã bị cấm truy cập vào tính năng này. Vui lòng liên hệ quản trị viên."
                : !roleAllowed
                  ? "Vai trò của bạn không được phép sử dụng tính năng này."
                  : "Bạn không có quyền truy cập vào tính năng này. Vui lòng liên hệ quản trị viên để được cấp quyền."}
            </p>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all",
                isDarkMode ? "shadow-none" : "shadow-lg shadow-indigo-200"
              )}
            >
              Quay lại trang chủ
            </button>
          </div>
        );
      }

      // Feature Status Check
      const featureStatus = featureStates[activeTab];
      const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userProfile.role);

      if (featureStatus === 'closed') {
        return (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 bg-slate-500/10 rounded-3xl flex items-center justify-center text-slate-500 mb-6">
              <EyeOff size={40} />
            </div>
            <h3 className="text-2xl font-black mb-2">Tính năng đã đóng</h3>
            <p className={cn("max-w-md mx-auto", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              Tính năng này hiện đang tạm thời đóng cửa theo yêu cầu của quản trị viên.
            </p>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all",
                isDarkMode ? "shadow-none" : "shadow-lg shadow-indigo-200"
              )}
            >
              Quay lại trang chủ
            </button>
          </div>
        );
      }

      if (featureStatus === 'maintenance' && !isPrivileged) {
        const maintenanceMsg = featureSettings[activeTab]?.maintenanceMsg || 'Tính năng này hiện đang được bảo trì để nâng cấp. Vui lòng quay lại sau.';
        return (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mb-6">
              <Wrench size={40} />
            </div>
            <h3 className="text-2xl font-black mb-2">Đang bảo trì</h3>
            <p className={cn("max-w-md mx-auto", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              {maintenanceMsg}
            </p>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all",
                isDarkMode ? "shadow-none" : "shadow-lg shadow-indigo-200"
              )}
            >
              Quay lại trang chủ
            </button>
          </div>
        );
      }
    }

    if (activeTab.startsWith('admin_')) {
      return (
        <SystemConfig
          isDarkMode={isDarkMode}
          systemSettings={systemSettings}
          activeCategory={activeTab.replace('admin_', '') as any}
          setActiveCategory={(cat) => setActiveTab(`admin_${cat}`)}
          uid={user?.uid || ''}
          userRole={userProfile.role}
        />
      );
    }

    switch (baseTab) {
      case 'dashboard':
        return <Dashboard
          setActiveTab={setActiveTab}
          userRole={userProfile.role}
          isApproved={userProfile.isApproved}
          isDarkMode={isDarkMode}
          allowedTabs={allowedTabs}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          userProfile={userProfile}
          notifications={notifications}
          announcements={announcements}
          onMarkAsRead={markAsRead}
          featureStates={featureStates}
          featureSettings={featureSettings}
          uid={user?.uid || ''}
          onLogout={handleLogout}
          setExternalIcdSearchQuery={setExternalIcdSearchQuery}
          setExternalPatientSearchQuery={setExternalPatientSearchQuery}
        />;
      case 'calendar':
        return <Calendar isDarkMode={isDarkMode} />;
      case 'notes':
        return <Notes isDarkMode={isDarkMode} subHeaderPortalId="mobile-subheader-portal" />;
      case 'directory':
      case 'view_directory':
        return <DrugDirectory
          canManage={isManagementMode}
          isDarkMode={isDarkMode}
          subHeaderPortalId="mobile-subheader-portal"
          featureSettings={featureSettings[activeTab]}
          userRole={userProfile.role}
          isApproved={userProfile.isApproved}
          userPowerPoints={userPowerPoints}
          initialSelectedDrugId={externalSelectedDrugId}
          onClearInitialDrug={() => {
            setExternalSelectedDrugId(null);
          }}
          currentUserName={userProfile.displayName}
          externalViewMode={drugDirectoryViewMode}
          onExternalViewModeChange={setDrugDirectoryViewMode}
        />;
      case 'interaction':
      case 'view_interaction':
        return <InteractionChecker
          canManage={isManagementMode}
          isDarkMode={isDarkMode}
          currentUserUid={userProfile.uid}
          currentUserName={userProfile.displayName}
          featureSettings={featureSettings[activeTab]}
        />;
      case 'prescription':
      case 'view_prescription':
        return <PrescriptionForm
          userProfile={userProfile}
          isDarkMode={isDarkMode}
          featureSettings={featureSettings['view_icd10']}
          userPowerPoints={userPowerPoints}
        />;
      case 'icd10':
      case 'view_icd10':
        return <ICD10Management
          canManage={isManagementMode}
          isDarkMode={isDarkMode}
          featureSettings={featureSettings['view_icd10']}
          featureStates={featureStates}
          userRole={userProfile.role}
          userPowerPoints={userPowerPoints}
          userProfile={userProfile}
          onSelectDrug={(drug) => {
            setExternalSelectedDrugId(drug.id);
            setActiveTab('view_directory');
          }}
          initialSearchTerm={externalIcdSearchQuery}
          onClearInitialSearch={() => setExternalIcdSearchQuery(null)}
        />;
      case 'users':
        return <UserManagement isDarkMode={isDarkMode} />;
      case 'config':
      case 'manage_config':
        return (
          <SystemConfig
            isDarkMode={isDarkMode}
            systemSettings={systemSettings}
            activeCategory="home"
            setActiveCategory={(cat) => setActiveTab(`admin_${cat}`)}
            uid={user?.uid || ''}
            userRole={userProfile.role}
          />
        );
      case 'adr':
      case 'view_adr':
        return <ADRManagement
          canManage={isManagementMode}
          isDarkMode={isDarkMode}
          currentUserUid={userProfile.uid}
          currentUserName={userProfile.displayName}
          featureSettings={featureSettings[activeTab]}
          userRole={userProfile.role}
        />;
      case 'patients':
      case 'view_patients':
        const patientSettings = featureSettings['view_patients'] || {};
        const configUserPowerPoints = userProfile ? (configRoles.find(r => r.id === userProfile.role)?.powerPoints ?? 0) : 0;
        
        // Use custom power levels if defined under the feature settings
        const hasDeletePower = configUserPowerPoints >= (patientSettings.deletePatientMinPower ?? 0);
        const hasGroupPower = configUserPowerPoints >= (patientSettings.groupManagementMinPower ?? 0);
        const hasManualPower = configUserPowerPoints >= (patientSettings.manualEntryMinPower ?? 0);
        const hasShortcutsPower = configUserPowerPoints >= (patientSettings.showShortcutsMinPower ?? 0);

        const canManagePatients = isManagementMode || ['admin', 'operator', 'operator_doctor'].includes(userProfile?.role);

        return (
          <PatientManagement 
            isDarkMode={isDarkMode} 
            userProfile={userProfile}
            featureSettings={patientSettings}
            userPowerPoints={configUserPowerPoints}
            canManage={canManagePatients}
            hasDeletePower={isManagementMode || hasDeletePower}
            hasGroupPower={isManagementMode || hasGroupPower}
            hasManualPower={isManagementMode || hasManualPower}
            hasShortcutsPower={isManagementMode || hasShortcutsPower}
            initialSearchTerm={externalPatientSearchQuery}
            onClearInitialSearch={() => setExternalPatientSearchQuery(null)}
          />
        );
      case 'staff':
        return <StaffManagement isDarkMode={isDarkMode} canManage={isManagementMode} />;
      case 'social':
      case 'view_social':
        return <SocialWall
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          isDarkMode={isDarkMode}
          onBack={() => setActiveTab('dashboard')}
          initialTab="feed"
          featureSettings={featureSettings['view_social']}
          subHeaderPortalId="mobile-subheader-portal"
          onSyncProfile={syncUserProfile}
        />;
      case 'calculator':
      case 'view_calculator':
        return (
          <div className="flex flex-col items-center justify-center py-4 lg:py-12 px-4">
            <CalculatorWidget isDarkMode={isDarkMode} onClose={() => setActiveTab('dashboard')} />
          </div>
        );
      case 'todo':
      case 'view_todo':
        return <TodoWidget isDarkMode={isDarkMode} onClose={() => setActiveTab('dashboard')} />;
      case 'doc_lookup':
      case 'view_doc_lookup':
        if (activeTab === 'manage_doc_lookup') {
          return <DocumentManagement
            isDarkMode={isDarkMode}
            currentUserUid={userProfile.uid}
            currentUserName={userProfile.displayName || userProfile.email || 'Bác sĩ'}
            onNavigateToTab={setActiveTab}
          />;
        }
        return <DocumentLookup
          isDarkMode={isDarkMode}
          currentUserUid={userProfile.uid}
          currentUserName={userProfile.displayName || userProfile.email || 'Bác sĩ'}
          userRole={userProfile.role}
          onNavigateToTab={setActiveTab}
          featureSettings={featureSettings['view_doc_lookup']}
          userPowerPoints={userPowerPoints}
        />;
      case 'manage_doc_lookup':
        return <DocumentManagement
          isDarkMode={isDarkMode}
          currentUserUid={userProfile.uid}
          currentUserName={userProfile.displayName || userProfile.email || 'Bác sĩ'}
          onNavigateToTab={setActiveTab}
        />;
      case 'profile':
      case 'view_profile':
        return <SocialWall
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          isDarkMode={isDarkMode}
          onBack={() => setActiveTab('dashboard')}
          initialTab="profile"
          featureSettings={featureSettings['view_social']}
          subHeaderPortalId="mobile-subheader-portal"
          onSyncProfile={syncUserProfile}
        />;
      case 'history':
        return (
          <div className="p-12 text-center">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors",
              isDarkMode ? "bg-slate-800" : "bg-slate-100"
            )}>
              <FileText size={32} className={isDarkMode ? "text-slate-500" : "text-slate-400"} />
            </div>
            <h3 className={cn("text-2xl font-bold mb-2 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Lịch sử kê toa</h3>
            <p className={cn("max-w-md mx-auto transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>Tính năng này đang được phát triển. Bạn sẽ sớm có thể xem lại tất cả các đơn thuốc đã kê.</p>
          </div>
        );
      default:
        return <Dashboard
          setActiveTab={setActiveTab}
          userRole={userProfile.role}
          isApproved={userProfile.isApproved || false}
          isDarkMode={isDarkMode}
          allowedTabs={allowedTabs}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          featureStates={featureStates}
          featureSettings={featureSettings}
          userProfile={userProfile}
          uid={user?.uid}
          notifications={notifications}
          announcements={announcements}
          onMarkAsRead={markAsRead}
          onLogout={handleLogout}
        />;
    }
  };

  // Sidebar allowed tabs should be the full IDs
  const sidebarAllowedTabs = allowedTabs;

  return (
    <>
      <UpdateNotification isDarkMode={isDarkMode} uid={user?.uid} />
      {isUserGuideOpen && (
        <WelcomeSlider 
          slides={dbSlides}
          onComplete={() => setIsUserGuideOpen(false)}
          isDarkMode={isDarkMode}
          userName={userProfile?.displayName || 'Người dùng'}
        />
      )}
      <div className={cn(
        "h-[100dvh] max-h-[100dvh] font-sans transition-colors duration-300 flex overflow-hidden",
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
      )}>
        <Suspense fallback={<div className="h-[100dvh] flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary" /></div>}>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab, keepSidebarOpen) => {
              setActiveTab(tab);
              if (!keepSidebarOpen) {
                setIsSidebarOpen(false);
              }
              // Force browser repaint after sidebar closes (fixes GPU compositing issue on mobile)
              setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
            }}
            userRole={userProfile.role}
            displayName={userProfile.displayName}
            title={userProfile.title}
            photoURL={userProfile.photoURL}
            photoSyncToken={userProfile.photoSyncToken}
            isDarkMode={isDarkMode}
            allowedTabs={sidebarAllowedTabs}
            isEditMode={isEditMode}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            isAdminMode={isAdminMode}
            setIsAdminMode={setIsAdminMode}
            appName={systemSettings.appName}
            featureStates={featureStates}
            featureSettings={featureSettings}
            uid={user?.uid || ''}
            isApproved={userProfile.isApproved}
            drugDirectoryViewMode={drugDirectoryViewMode}
            setDrugDirectoryViewMode={setDrugDirectoryViewMode}
            onOpenUserGuide={() => setIsUserGuideOpen(true)}
          />

          <main 
            ref={(el) => { mainScrollRef.current = el; }} 
            className={cn(
              "flex-1 h-full overflow-y-auto overflow-x-hidden relative custom-scrollbar transition-all duration-300 drug-list-container",
              isSidebarCollapsed ? "lg:ml-[80px]" : "lg:ml-[260px]"
            )}
            style={{ touchAction: 'pan-y' }}
          >
            {/* Mobile Header */}
            <div className={cn(
              "lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md",
              isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-white/80 border-slate-100"
            )}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className={cn("p-2 rounded-xl transition-colors", isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500")}
                >
                  <Menu size={20} />
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity active:scale-95"
                >
                  <img src="/icon-512.png" alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                  <h1 className={cn("font-black text-sm tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                    {systemSettings.appName}
                  </h1>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative" ref={mobileSearchMenuRef}>
                  <button
                    onClick={() => setIsSearchFocused(!isSearchFocused)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isSearchFocused
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-primary")
                    )}
                  >
                    <Search size={18} />
                  </button>

                  <AnimatePresence>
                    {isSearchFocused && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                          "fixed inset-x-4 top-16 z-[110] p-4 rounded-2xl border shadow-2xl",
                          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                        )}
                      >
                        <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Tìm kiếm tính năng..."
                            className={cn(
                              "w-full pl-10 pr-10 py-3 rounded-xl border-none font-bold text-sm focus:ring-2 focus:ring-primary transition-all",
                              isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                            )}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-1">
                          {(() => {
                            const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userProfile?.role || '');
                            const filtered = ALL_TABS.filter(item => {
                              const status = featureStates[item.id];
                              const isVisible = status !== 'closed' && (status !== 'maintenance' || isPrivileged);
                              return isVisible &&
                                allowedTabs.includes(item.id) &&
                                (item.label || '').toLowerCase().includes((searchQuery || '').toLowerCase());
                            });

                            if (filtered.length === 0) {
                              return <p className="text-center py-8 text-slate-500 text-sm font-bold">Không tìm thấy tính năng nào</p>;
                            }

                            return filtered.map(item => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveTab(item.id);
                                  setIsSearchFocused(false);
                                  setSearchQuery('');
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                                  activeTab === item.id
                                    ? "bg-primary text-white"
                                    : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600")
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  activeTab === item.id ? "bg-white/20" : (isDarkMode ? "bg-slate-800" : "bg-white shadow-sm")
                                )}>
                                  <item.icon size={16} className={activeTab === item.id ? "text-white" : "text-primary"} />
                                </div>
                                <span className="font-bold text-sm">
                                  {featureSettings[item.id]?.customTitle || item.label}
                                </span>
                              </button>
                            ));
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile Quick Access - HIDDEN */}
                {false && (() => {
                  const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userProfile?.role || '');
                  return ALL_TABS.filter(t => {
                    const status = featureStates[t.id];
                    const settings = featureSettings[t.id];
                    const isBanned = settings?.bannedUsers?.includes(userProfile?.uid);
                    const roleAllowed = (settings?.allowedRoles || []).length === 0 || (settings?.allowedRoles || []).includes(userProfile?.role);
                    const isVisible = status !== 'closed' && (status !== 'maintenance' || isPrivileged) && !isBanned && roleAllowed;
                    return isVisible && allowedTabs.includes(t.id) && !t.id.startsWith('manage_');
                  }).map(item => (
                    <button
                      key={`mob-quick-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "p-2 rounded-xl transition-all relative font-bold text-xs truncate max-w-[80px]",
                        activeTab === item.id
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : (isDarkMode ? "bg-slate-900 border border-slate-800 text-slate-400" : "bg-white border border-slate-100 text-slate-500")
                      )}
                    >
                      <item.icon size={18} />
                    </button>
                  ));
                })()}

                {hasUtilities && (
                  <div className="relative" ref={mobileAppsMenuRef}>
                    <button
                      onClick={() => setIsAppsMenuOpen(!isAppsMenuOpen)}
                      className={cn(
                        "p-2 rounded-xl transition-all relative group",
                        isAppsMenuOpen
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-primary")
                      )}
                      title="Tiện ích"
                    >
                      <LayoutGrid size={18} />
                    </button>

                    <AnimatePresence>
                      {isAppsMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className={cn(
                            "fixed inset-x-4 top-16 z-[110] p-4 rounded-2xl border shadow-2xl",
                            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                          )}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Tiện ích</h3>
                            <button
                              onClick={() => setIsAppsMenuOpen(false)}
                              className={cn("p-1 rounded-lg", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100")}
                            >
                              <X size={16} className="text-slate-400" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-1">
                            {(() => {
                              const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userProfile?.role || '');
                              return ALL_TABS.filter(t => {
                                const status = featureStates[t.id];
                                const settings = featureSettings[t.id];
                                const isBanned = settings?.bannedUsers?.includes(userProfile?.uid);
                                const isVisible = status !== 'closed' && (status !== 'maintenance' || isPrivileged) && !isBanned;
                                const showInUtilities = (settings?.hiddenLocations || []).includes('utilities_box');
                                return isVisible && allowedTabs.includes(t.id) && !t.id.startsWith('manage_') && showInUtilities;
                              }).map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setActiveTab(item.id);
                                    setIsAppsMenuOpen(false);
                                  }}
                                  className={cn(
                                    "flex flex-col items-center gap-2 p-3 rounded-xl transition-all border",
                                    activeTab === item.id
                                      ? (isDarkMode ? "bg-primary/20 border-primary/50 text-primary" : "bg-primary/5 border-primary/20 text-primary")
                                      : (isDarkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600")
                                  )}
                                >
                                  <div className={cn(
                                    "p-2 rounded-lg shadow-sm",
                                    activeTab === item.id ? "bg-primary text-white" : (isDarkMode ? "bg-slate-700" : "bg-white")
                                  )}>
                                    <item.icon size={18} />
                                  </div>
                                  <span className="text-[10px] font-bold text-center leading-tight">
                                    {featureSettings[item.id]?.customTitle || item.label}
                                  </span>
                                </button>
                              ));
                            })()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <div className="relative" ref={mobileNotificationsMenuRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className={cn(
                      "p-2 rounded-xl transition-all relative",
                      isNotificationsOpen
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-primary")
                    )}
                  >
                    <Bell size={18} />
                    {(() => {
                      const unreadCount = notifications.filter(n => !n.isRead).length + announcements.filter(a => a.showInHeader !== false && !readAnnouncementIds.includes(a.id)).length;
                      if (unreadCount === 0) return null;
                      return (
                        <span className={cn(
                          "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black border-2 shadow-sm animate-pulse",
                          isDarkMode ? "border-slate-900" : "border-white"
                        )}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      );
                    })()}
                  </button>

                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsNotificationsOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className={cn(
                            "fixed inset-x-4 top-16 z-50 p-4 rounded-2xl border shadow-2xl flex flex-col max-h-[85vh]",
                            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <Bell className="text-primary" size={14} />
                              <h3 className={cn("font-black text-xs uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-900")}>Thông báo</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={markAllAsRead}
                                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                              >
                                <CheckCheck size={12} /> Đọc tất cả
                              </button>
                              <button
                                onClick={() => setIsNotificationsOpen(false)}
                                className={cn("p-1 rounded-lg", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100")}
                              >
                                <X size={15} className="text-slate-400" />
                              </button>
                            </div>
                          </div>

                          <div className="relative mb-2.5">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            <input
                              type="text"
                              placeholder="Tìm kiếm thông báo, hoạt chất..."
                              value={notifSearchQuery}
                              onChange={(e) => {
                                setNotifSearchQuery(e.target.value);
                                setVisibleNotifCount(20);
                              }}
                              className={cn(
                                "w-full pl-8 pr-8 py-1.5 rounded-lg border-none text-[10px] font-bold focus:ring-1 focus:ring-primary outline-none transition-all",
                                isDarkMode ? "bg-slate-800 text-white placeholder-slate-500" : "bg-slate-50 text-slate-900 placeholder-slate-400"
                              )}
                            />
                            {notifSearchQuery && (
                              <button
                                onClick={() => setNotifSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2.5 scrollbar-none scroll-smooth">
                            {[
                              { id: 'all', label: 'Tất cả', icon: Bell },
                              { id: 'clinical_alert', label: 'Cảnh báo', icon: AlertOctagon, color: 'text-rose-500' },
                              { id: 'data_update', label: 'Dữ liệu', icon: Pill, color: 'text-amber-500' },
                              { id: 'medical_news_personal', label: 'Tin tức', icon: FileText, color: 'text-sky-500' },
                              { id: 'system', label: 'Hệ thống', icon: Settings, color: 'text-slate-400' }
                            ].map(tab => (
                              <button
                                key={tab.id}
                                onClick={() => {
                                  setNotificationTab(tab.id as any);
                                  setVisibleNotifCount(20);
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black shrink-0 transition-all border cursor-pointer",
                                  notificationTab === tab.id
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : isDarkMode 
                                      ? "bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-300" 
                                      : "bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-700"
                                )}
                              >
                                <tab.icon size={9} className={notificationTab === tab.id ? "text-white" : tab.color} />
                                <span>{tab.label}</span>
                              </button>
                            ))}
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 space-y-3 max-h-[55vh]">
                            {(() => {
                              const allFiltered = getUnifiedNotifications();
                              const visibleItems = allFiltered.slice(0, visibleNotifCount);
                              
                              if (visibleItems.length === 0) {
                                return (
                                  <div className="py-8 text-center">
                                    <Bell className="mx-auto text-slate-300 mb-1.5" size={24} />
                                    <p className="text-slate-500 text-[10px] font-extrabold">Không có thông báo nào phù hợp</p>
                                  </div>
                                );
                              }

                              const grouped = groupNotificationsByDate(visibleItems);
                              
                              return (
                                <div className="space-y-3">
                                  {Object.entries(grouped).map(([groupName, items], gIdx) => (
                                    <div key={`${groupName}-${gIdx}`} className="space-y-1.5">
                                      <div className="flex items-center gap-1.5 px-0.5">
                                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                          {groupName}
                                        </span>
                                        <div className="flex-1 h-[1px] bg-slate-500/10" />
                                      </div>
                                      <div className="space-y-1.5">
                                        {items.map((item, idx) => renderNotificationItem(item, false, idx))}
                                      </div>
                                    </div>
                                  ))}

                                  {allFiltered.length > visibleNotifCount && (
                                    <button
                                      onClick={() => setVisibleNotifCount(prev => prev + 15)}
                                      className="w-full py-1.5 mt-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/20 transition-all text-center cursor-pointer"
                                    >
                                      Tải thêm thông báo...
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setShowSupportContact(false);
                  }}
                  className={cn(
                    "p-2 rounded-xl transition-all relative group",
                    isProfileModalOpen
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-primary")
                  )}
                  title="Cài đặt"
                >
                  <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            </div>

            {/* Desktop Header */}
            <div className={cn(
              "hidden lg:flex sticky top-0 z-30 items-center justify-between px-6 py-3 border-b backdrop-blur-md",
              isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-white/80 border-slate-100"
            )}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity active:scale-95 group"
                  title="Trở về Workspace"
                >
                  <img src="/icon-512.png" alt="Logo" className="w-10 h-10 object-contain transition-all" referrerPolicy="no-referrer" />
                  <span className="font-bold text-sm hidden xl:inline-block">{systemSettings.appName}</span>
                </button>
              </div>

              <div className="flex-1 max-w-md mx-8 relative group" ref={desktopSearchMenuRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Tìm kiếm tính năng (Ctrl + K)..."
                  className={cn(
                    "w-full pl-10 pr-4 py-2 rounded-xl border-none font-bold text-sm focus:ring-2 focus:ring-primary transition-all",
                    isDarkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                />

                <AnimatePresence>
                  {isSearchFocused && searchQuery && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={cn(
                        "absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl border shadow-2xl z-50",
                        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                      )}
                    >
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-1">
                        {(() => {
                          const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userProfile?.role || '');
                          const filtered = ALL_TABS.filter(item => {
                            const status = featureStates[item.id];
                            const settings = featureSettings[item.id];
                            const isBanned = settings?.bannedUsers?.includes(userProfile?.uid);
                            const allowedRoles = settings?.allowedRoles || [];
                            const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(userProfile?.role);
                            const isVisible = status !== 'closed' && (status !== 'maintenance' || isPrivileged) && !isBanned && roleAllowed;
                            return isVisible &&
                              allowedTabs.includes(item.id) &&
                              !item.id.startsWith('manage_') &&
                              (settings?.customTitle || item.label || '').toLowerCase().includes((searchQuery || '').toLowerCase());
                          }).sort((a, b) => {
                            const orderA = featureSettings[a.id]?.order ?? 999;
                            const orderB = featureSettings[b.id]?.order ?? 999;
                            return orderA - orderB;
                          });

                          if (filtered.length === 0) {
                            return <p className="text-center py-4 text-slate-500 text-xs font-bold">Không tìm thấy tính năng nào</p>;
                          }

                          return filtered.map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveTab(item.id);
                                setSearchQuery('');
                                setIsSearchFocused(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-xl transition-all group",
                                activeTab === item.id 
                                  ? "bg-primary text-white" 
                                  : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-600")
                              )}
                            >
                              <div className={cn(
                                "p-1.5 rounded-lg",
                                activeTab === item.id ? "bg-white/20" : (isDarkMode ? "bg-slate-800" : "bg-white shadow-sm")
                                )}>
                                <item.icon size={14} className={activeTab === item.id ? "text-white" : "text-primary"} />
                              </div>
                              <span className="font-bold text-xs">{item.label}</span>
                            </button>
                          ));
                    })()}
                    </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3">
              {hasUtilities && (
                <div className="relative" ref={desktopAppsMenuRef}>
                  <button 
                    onClick={() => setIsAppsMenuOpen(!isAppsMenuOpen)}
                    className={cn(
                      "p-2 rounded-xl transition-all relative group",
                      isAppsMenuOpen 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-primary")
                    )}
                    title="Tiện ích"
                  >
                    <LayoutGrid size={18} />
                  </button>

                  <AnimatePresence>
                    {isAppsMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                          "absolute right-0 top-full mt-2 w-80 z-[110] p-4 rounded-2xl border shadow-2xl",
                          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4 px-1">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tiện ích</h3>
                          <button 
                            onClick={() => setIsAppsMenuOpen(false)} 
                            className={cn("p-1 rounded-lg", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100")}
                          >
                            <X size={14} className="text-slate-400" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-1">
                          {(() => {
                            const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userProfile?.role || '');
                            return ALL_TABS.filter(t => {
                              const status = featureStates[t.id];
                              const settings = featureSettings[t.id];
                              const isBanned = settings?.bannedUsers?.includes(userProfile?.uid);
                              const allowedRoles = settings?.allowedRoles || [];
                              const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(userProfile?.role);
                              const isVisible = status !== 'closed' && (status !== 'maintenance' || isPrivileged) && !isBanned && roleAllowed;
                              const showInUtilities = (settings?.hiddenLocations || []).includes('utilities_box');
                              return isVisible && allowedTabs.includes(t.id) && !t.id.startsWith('manage_') && showInUtilities;
                            }).map(item => (
                              <button 
                                key={item.id}
                                onClick={() => {
                                  setActiveTab(item.id);
                                  setIsAppsMenuOpen(false);
                                }}
                                className={cn(
                                  "flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all border group",
                                  activeTab === item.id
                                    ? (isDarkMode ? "bg-primary/20 border-primary/50 text-primary" : "bg-primary/5 border-primary/20 text-primary")
                                    : (isDarkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600")
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-lg shadow-sm transition-transform group-hover:scale-110",
                                  activeTab === item.id ? "bg-primary text-white" : (isDarkMode ? "bg-slate-700" : "bg-white")
                                )}>
                                  <item.icon size={16} />
                                </div>
                                <span className="text-[9px] font-bold text-center leading-tight">
                                  {featureSettings[item.id]?.customTitle || item.label}
                                </span>
                              </button>
                            ));
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="relative" ref={notificationsMenuRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={cn(
                    "p-2 rounded-xl transition-all relative",
                    isNotificationsOpen 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-primary")
                  )}
                >
                  <Bell size={18} />
                  {(() => {
                    const unreadCount = notifications.filter(n => !n.isRead).length + announcements.filter(a => a.showInHeader !== false && !readAnnouncementIds.includes(a.id)).length;
                    if (unreadCount === 0) return null;
                    return (
                      <span className={cn(
                        "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black border-2 shadow-sm animate-pulse",
                        isDarkMode ? "border-slate-900" : "border-white"
                      )}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    );
                  })()}
                </button>
                
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        "absolute right-0 top-full mt-2 w-80 z-[110] p-4 rounded-2xl border shadow-2xl flex flex-col max-h-[85vh]",
                        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Bell className="text-primary" size={14} />
                          <h3 className={cn("font-black text-xs uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-900")}>Thông báo</h3>
                        </div>
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck size={12} /> Đọc tất cả
                        </button>
                      </div>

                      <div className="relative mb-2.5">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input
                          type="text"
                          placeholder="Tìm kiếm thông báo, hoạt chất..."
                          value={notifSearchQuery}
                          onChange={(e) => {
                            setNotifSearchQuery(e.target.value);
                            setVisibleNotifCount(20);
                          }}
                          className={cn(
                            "w-full pl-8 pr-8 py-1.5 rounded-lg border-none text-[10px] font-bold focus:ring-1 focus:ring-primary outline-none transition-all",
                            isDarkMode ? "bg-slate-800 text-white placeholder-slate-500" : "bg-slate-50 text-slate-900 placeholder-slate-400"
                          )}
                        />
                        {notifSearchQuery && (
                          <button
                            onClick={() => setNotifSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2.5 scrollbar-none scroll-smooth">
                        {[
                          { id: 'all', label: 'Tất cả', icon: Bell },
                          { id: 'clinical_alert', label: 'Cảnh báo', icon: AlertOctagon, color: 'text-rose-500' },
                          { id: 'data_update', label: 'Dữ liệu', icon: Pill, color: 'text-amber-500' },
                          { id: 'medical_news_personal', label: 'Tin tức', icon: FileText, color: 'text-sky-500' },
                          { id: 'system', label: 'Hệ thống', icon: Settings, color: 'text-slate-400' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setNotificationTab(tab.id as any);
                              setVisibleNotifCount(20);
                            }}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black shrink-0 transition-all border cursor-pointer",
                              notificationTab === tab.id
                                ? "bg-primary text-white border-primary shadow-sm"
                                : isDarkMode 
                                  ? "bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-300" 
                                  : "bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-700"
                            )}
                          >
                            <tab.icon size={9} className={notificationTab === tab.id ? "text-white" : tab.color} />
                            <span>{tab.label}</span>
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 space-y-3 max-h-[50vh]">
                        {(() => {
                          const allFiltered = getUnifiedNotifications();
                          const visibleItems = allFiltered.slice(0, visibleNotifCount);
                          
                          if (visibleItems.length === 0) {
                            return (
                              <div className="py-8 text-center">
                                <Bell className="mx-auto text-slate-300 mb-1.5" size={24} />
                                <p className="text-slate-500 text-[10px] font-extrabold">Không có thông báo nào phù hợp</p>
                              </div>
                            );
                          }

                          const grouped = groupNotificationsByDate(visibleItems);
                          
                          return (
                            <div className="space-y-3">
                              {Object.entries(grouped).map(([groupName, items], gIdx) => (
                                <div key={`${groupName}-${gIdx}`} className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 px-0.5">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                      {groupName}
                                    </span>
                                    <div className="flex-1 h-[1px] bg-slate-500/10" />
                                  </div>
                                  <div className="space-y-1.5">
                                    {items.map((item, idx) => renderNotificationItem(item, true, idx))}
                                  </div>
                                </div>
                              ))}

                              {allFiltered.length > visibleNotifCount && (
                                <button
                                  onClick={() => setVisibleNotifCount(prev => prev + 15)}
                                  className="w-full py-1.5 mt-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/20 transition-all text-center cursor-pointer"
                                >
                                  Tải thêm thông báo...
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
                <button 
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setShowSupportContact(false);
                  }}
                  className={cn(
                    "p-2.5 rounded-xl transition-all relative group",
                    isProfileModalOpen 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : (isDarkMode ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-primary")
                  )}
                  title="Cài đặt"
                >
                  <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            </div>

    {/* Sub Header */ }
  {
    activeTab !== 'dashboard' && (
      <div className={cn(
        "lg:hidden sticky top-[57px] z-20 flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-2 border-b transition-colors",
        isDarkMode ? "bg-slate-900/95 border-slate-800 backdrop-blur-md" : "bg-slate-50/95 border-slate-100 backdrop-blur-md"
      )}>
        <div className="flex items-center gap-2 overflow-hidden shrink-0">
          {(() => {
            const currentTab = ALL_TABS.find(t => t.id === activeTab);
            if (!currentTab) return null;
            return (
              <>
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  isDarkMode ? "bg-slate-800" : "bg-white shadow-sm"
                )}>
                  <currentTab.icon size={14} className="text-primary" />
                </div>
                <h2 className={cn(
                  "font-black text-[10px] lg:text-xs tracking-[0.1em] uppercase truncate",
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                )}>
                  {featureSettings[currentTab.id]?.customTitle || currentTab.label}
                </h2>
              </>
            );
          })()}
        </div>

        {/* Portal for mobile subheader controls */}
        {/* key={activeTab} forces React to DESTROY and RECREATE this node on every tab change.
                This immediately detaches any stale portal references from the previous module
                (e.g. DrugDirectory's filter buttons), preventing ghost interactions. */}
        <div
          key={activeTab}
          id="mobile-subheader-portal"
          className="flex-1 flex items-center justify-end gap-2 overflow-x-auto no-scrollbar"
        />
      </div>
    )
  }


  <AnimatePresence mode="wait">
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, pointerEvents: 'none' }}
      transition={{ duration: 0.15 }}
      style={{ minHeight: '100%' }}
    >

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>
            Đang tải giao diện...
          </p>
        </div>
      }>
        {renderContent()}
      </Suspense>
    </motion.div>
  </AnimatePresence>


  {/* Profile Modal */ }
  <AnimatePresence>
    {isProfileModalOpen && (
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-4 lg:p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setIsProfileModalOpen(false);
            if (guestView === 'terms') setGuestView('none');
          }}
          className={cn(
            "absolute inset-0 bg-slate-900/60 pointer-events-auto",
            guestView === 'terms' ? "" : "backdrop-blur-sm"
          )}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            x: guestView === 'terms' ? (window.innerWidth < 1440 ? '-100%' : '-560px') : 0
          }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className={cn(
            "relative w-[92%] sm:w-full sm:max-w-lg h-auto max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden border transition-colors flex flex-col pointer-events-auto",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          )}
        >
          <div 
            className="flex w-[200%] transition-transform duration-500 ease-in-out" 
            style={{ transform: showSupportContact ? 'translateX(-50%)' : 'translateX(0)' }}
          >
            {/* PANEL 1: SETTINGS */}
            <div className="w-1/2 shrink-0 flex flex-col">
              <div className={cn(
                "p-4 sm:p-6 border-b flex items-center justify-between",
                isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Settings size={20} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight">Cài đặt</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowSupportContact(true)}
                    title="Hỗ trợ liên hệ"
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Phone size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      if (guestView === 'terms') setGuestView('none');
                    }}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar max-h-[60vh]">
                {/* Account Info */}
                <div className={cn(
                  "p-4 rounded-2xl border flex items-center gap-4 transition-colors",
                  isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50 border-slate-100"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg",
                    isDarkMode ? "bg-slate-700" : "bg-primary"
                  )}>
                    <Users size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-0.5", isDarkMode ? "text-slate-500" : "text-slate-400")}>Tài khoản đang đăng nhập</p>
                    <p className={cn("text-sm font-bold truncate", isDarkMode ? "text-white" : "text-slate-900")}>{userProfile.email}</p>
                  </div>
                </div>

                {/* Personal Info Edit Section - REMOVED AS REQUESTED (ALREADY IN PROFILE PAGE) */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className={cn(
                      "block text-xs font-black uppercase tracking-widest transition-colors",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>Quyền riêng tư</label>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className={cn(
                          "flex items-center justify-between p-3 rounded-xl border border-dashed transition-colors",
                          isDarkMode ? "border-slate-800 bg-slate-800/20" : "border-slate-200 bg-slate-50/50"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isDarkMode ? "bg-slate-700" : "bg-white shadow-sm")}>
                              <ShieldCheck size={14} className="text-primary" />
                            </div>
                            <div>
                              <p className={cn("text-[11px] font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>Công khai Email</p>
                              <p className={cn("text-[9px] font-medium whitespace-nowrap", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                                {!profileEditData.hideEmail ? "Mọi người có thể thấy email của bạn" : "Email của bạn đang được ẩn"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const nextHideEmail = !profileEditData.hideEmail;
                              if (!nextHideEmail) { // Turning ON public view (hideEmail becomes false)
                                setPrivacyConfirmType('email');
                                setIsPrivacyConfirmOpen(true);
                              } else {
                                setProfileEditData(prev => ({ ...prev, hideEmail: nextHideEmail }));
                                handleSaveProfileField({ hideEmail: nextHideEmail });
                              }
                            }}
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-colors",
                              !profileEditData.hideEmail ? "bg-primary" : (isDarkMode ? "bg-slate-700" : "bg-slate-200")
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                              !profileEditData.hideEmail ? "left-6" : "left-1"
                            )} />
                          </button>
                        </div>

                        <div className={cn(
                          "flex items-center justify-between p-3 rounded-xl border border-dashed transition-colors",
                          isDarkMode ? "border-slate-800 bg-slate-800/20" : "border-slate-200 bg-slate-50/50"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isDarkMode ? "bg-slate-700" : "bg-white shadow-sm")}>
                              <MessageSquare size={14} className="text-primary" />
                            </div>
                            <div>
                              <p className={cn("text-[11px] font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>Công khai Số Zalo</p>
                              <p className={cn("text-[9px] font-medium whitespace-nowrap", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                                {!profileEditData.hideZalo ? "Mọi người có thể thấy số Zalo của bạn" : "Số Zalo của bạn đang được ẩn"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const nextHideZalo = !profileEditData.hideZalo;
                              if (!nextHideZalo) { // Turning ON public view (hideZalo becomes false)
                                setPrivacyConfirmType('zalo');
                                setIsPrivacyConfirmOpen(true);
                              } else {
                                setProfileEditData(prev => ({ ...prev, hideZalo: nextHideZalo }));
                                handleSaveProfileField({ hideZalo: nextHideZalo });
                              }
                            }}
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-colors",
                              !profileEditData.hideZalo ? "bg-primary" : (isDarkMode ? "bg-slate-700" : "bg-slate-200")
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                              !profileEditData.hideZalo ? "left-6" : "left-1"
                            )} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={cn(
                      "block text-xs font-black uppercase tracking-widest mb-3 transition-colors",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>Giao diện & Chủ đề</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'light', label: 'Sáng', icon: Sun },
                        { id: 'dark', label: 'Tối', icon: Moon },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleThemeChange(t.id)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                            theme === t.id
                              ? "border-primary bg-primary/5 text-primary"
                              : (isDarkMode
                                ? "border-transparent bg-slate-800 hover:bg-slate-700 text-slate-500"
                                : "border-transparent bg-slate-50 hover:bg-slate-100 text-slate-500")
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg text-white",
                            t.id === 'light' ? "bg-blue-500" : "bg-slate-700"
                          )}>
                            <t.icon size={18} />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {userProfile.role === 'admin' && (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setIsAdminMode(true);
                          setActiveTab('admin_general');
                          setIsProfileModalOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group",
                          isDarkMode ? "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-50/20" : "bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20">
                            <ShieldCheck size={16} />
                          </div>
                          <div className="text-left">
                            <p className={cn("text-xs font-black uppercase tracking-widest", isDarkMode ? "text-indigo-400" : "text-indigo-600")}>Quản trị hệ thống</p>
                            <p className={cn("text-xs font-bold", isDarkMode ? "text-slate-300" : "text-slate-600")}>Cấu hình tên app, logo và các thiết lập chung</p>
                          </div>
                        </div>
                        <Zap size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800/10 dark:border-slate-800/50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuestView('terms');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group",
                      isDarkMode ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800" : "bg-white border-slate-100 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
                      )}>
                        <FileText size={16} />
                      </div>
                      <span className={cn("text-xs font-black uppercase tracking-widest", isDarkMode ? "text-slate-300" : "text-slate-600")}>Điều khoản sử dụng</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              <div className={cn(
                "p-4 sm:p-6 border-t flex flex-col gap-3",
                isDarkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50/50"
              )}>
                <button
                  onClick={handleLogout}
                  className={cn(
                    "w-full py-2.5 sm:py-3 bg-rose-500 text-white rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 hover:bg-rose-600",
                    isDarkMode ? "shadow-none" : "shadow-lg shadow-rose-500/20"
                  )}
                >
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>

            {/* PANEL 2: SUPPORT */}
            <div className="w-1/2 shrink-0 flex flex-col">
              <div className={cn(
                "p-4 sm:p-6 border-b flex items-center justify-between",
                isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Phone size={20} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight">Hỗ trợ kỹ thuật</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowSupportContact(false)}
                    title="Quay lại Cài đặt"
                    className={cn(
                      "p-2 rounded-xl transition-colors text-primary flex items-center justify-center",
                      isDarkMode ? "bg-slate-800" : "bg-slate-200"
                    )}
                  >
                    <ChevronRight size={18} className="rotate-180" />
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      if (guestView === 'terms') setGuestView('none');
                    }}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar max-h-[60vh] flex-1">
                <div className={cn(
                  "p-5 rounded-2xl border relative overflow-hidden transition-all duration-300",
                  isDarkMode
                    ? "bg-slate-900/50 border-slate-800 text-white"
                    : "bg-white text-slate-900 border-slate-100 shadow-md shadow-slate-200/40"
                )}>
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/20 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                      <HelpCircle size={20} className="text-primary animate-spin-slow" />
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-[11px] font-bold leading-relaxed mb-4 transition-colors opacity-70", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                        Mọi thắc mắc hoặc yêu cầu hỗ trợ kỹ thuật liên quan đến ứng dụng, vui lòng liên hệ trực tiếp DS. Bảo qua Zalo để được giải quyết nhanh nhất.
                      </p>
                      <a
                        href="https://zalo.me/0932621028"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "w-full py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest",
                          isDarkMode
                            ? "bg-primary text-white hover:bg-primary/90"
                            : "bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20"
                        )}
                      >
                        Liên hệ qua Zalo (DS. Bảo)
                      </a>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-2xl border space-y-3",
                  isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50 border-slate-100"
                )}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thời gian làm việc</p>
                  <p className="text-xs font-bold">Thứ 2 - Chủ nhật: 8:00 - 22:00</p>
                  <p className="text-[10px] font-medium opacity-60">Hỗ trợ kỹ thuật khẩn cấp 24/7 đối với các sự cố nghiêm trọng ảnh hưởng đến hoạt động khám chữa bệnh.</p>
                </div>
              </div>

              <div className={cn(
                "p-4 sm:p-6 border-t flex flex-col gap-3",
                isDarkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50/50"
              )}>
                <button
                  onClick={() => setShowSupportContact(false)}
                  className={cn(
                    "w-full py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2",
                    isDarkMode 
                      ? "bg-slate-800 hover:bg-slate-700 text-white" 
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  )}
                >
                  Quay lại Cài đặt
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>




  {/* Guest View Overlays - Shared */ }
      <AnimatePresence>
        {(guestView === 'drugs' || guestView === 'icd10') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 lg:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGuestView('none')}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className={cn(
                "relative w-full h-full lg:h-[90vh] lg:max-w-7xl rounded-none sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "px-6 py-4 border-b flex items-center justify-between sticky top-0 z-50",
                isDarkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-100 shadow-sm"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    guestView === 'drugs' ? "bg-blue-500/10 text-blue-500" :
                    "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {guestView === 'drugs' ? <Pill size={20} /> : <ClipboardList size={20} />}
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                      {guestView === 'drugs' ? 'Tra cứu Thuốc' : 'Tra cứu ICD-10'}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Chế độ khách
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setGuestView('none')}
                  className={cn(
                    "p-2.5 rounded-xl transition-all hover:rotate-90",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {guestView === 'drugs' && (
                  <div className="h-full">
                    <DrugDirectory 
                      canManage={false} 
                      isDarkMode={isDarkMode} 
                      featureSettings={featureSettings['view_directory']}
                      userRole={userProfile?.role}
                      userPowerPoints={userPowerPoints}
                    />
                  </div>
                )}
                {guestView === 'icd10' && (
                  <div className="h-full p-4 lg:p-8">
                    <ICD10Management 
                      canManage={false} 
                      isDarkMode={isDarkMode}
                      featureSettings={featureSettings['view_icd10']}
                      userRole={userProfile?.role}
                      userPowerPoints={userPowerPoints}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {guestView === 'terms' && (
          <div className="fixed inset-0 z-[180] flex justify-end pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isProfileModalOpen ? 0 : 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGuestView('none')}
              className={cn(
                "absolute inset-0 bg-slate-900/40",
                isProfileModalOpen ? "pointer-events-none" : "pointer-events-auto"
              )}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 28, stiffness: 200 }}
              className={cn(
                "relative w-full h-full sm:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl shadow-2xl overflow-hidden border-l transition-colors flex flex-col pointer-events-auto",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100",
                "lg:rounded-l-[40px]"
              )}
            >
              <div className={cn(
                "px-6 h-[60px] border-b flex items-center justify-between sticky top-0 z-50",
                isDarkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-100 shadow-sm"
              )}>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                      Điều khoản sử dụng
                    </h3>
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      Thông tin pháp lý
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setGuestView('none')}
                  className={cn(
                    "p-2 rounded-2xl transition-all hover:rotate-90",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-12">
                <div className="terms-content transition-colors">
                  {systemSettings.termsOfUse ? (
                    <ReactMarkdown>{systemSettings.termsOfUse}</ReactMarkdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                      <FileText size={48} className="mb-4" />
                      <p className="font-bold">Nội dung đang được cập nhật...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={cn(
                "p-6 border-t flex items-center justify-between",
                isDarkMode ? "bg-slate-800/20 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <p className="text-[10px] text-slate-500 font-medium">Bản cập nhật cuối: {systemSettings.termsUpdateDate ? systemSettings.termsUpdateDate.split('-').reverse().join('/') : new Date().toLocaleDateString('vi-VN')}</p>
                <button 
                  onClick={() => setGuestView('none')}
                  className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                  Đã hiểu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          <ConfirmModal
            isOpen={isPrivacyConfirmOpen}
            onClose={() => setIsPrivacyConfirmOpen(false)}
            onConfirm={() => {
              if (privacyConfirmType === 'email') {
                setProfileEditData(prev => ({ ...prev, hideEmail: false }));
                handleSaveProfileField({ hideEmail: false });
              } else if (privacyConfirmType === 'zalo') {
                setProfileEditData(prev => ({ ...prev, hideZalo: false }));
                handleSaveProfileField({ hideZalo: false });
              }
              setIsPrivacyConfirmOpen(false);
            }}
            title="Cảnh báo quyền riêng tư"
            message={privacyConfirmType === 'email' 
              ? "Bạn có chắc chắn muốn công khai Email không? Mọi người trong hệ thống sẽ có thể nhìn thấy email liên hệ của bạn."
              : "Bạn có chắc chắn muốn công khai Số Zalo không? Mọi người trong hệ thống sẽ có thể nhìn thấy số điện thoại Zalo của bạn."
            }
            confirmText="Công khai"
            cancelText="Hủy"
            type="warning"
            isDarkMode={isDarkMode}
          />
          <ConfirmModal
            isOpen={isLogoutConfirmOpen}
            onClose={() => setIsLogoutConfirmOpen(false)}
            onConfirm={confirmLogout}
            title="Đăng xuất"
            message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không? Các thay đổi chưa lưu có thể bị mất."
            confirmText="Đăng xuất"
            cancelText="Ở lại"
            type="warning"
            isDarkMode={isDarkMode}
          />
          <DrugDetailModal
            drug={globalSelectedDrug}
            isOpen={isGlobalDrugModalOpen}
            onClose={() => setIsGlobalDrugModalOpen(false)}
            isDarkMode={isDarkMode}
            userPowerPoints={userProfile?.powerPoints || 0}
          />

          {/* Live Toast Popups Container */}
          <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            <AnimatePresence>
              {toastPopups.map((toast) => {
                const isClinicalAlert = toast.category === 'clinical_alert';
                const isDataUpdate = toast.category === 'data_update';
                const isMedicalNews = toast.category === 'medical_news_personal';
                const isSystem = toast.category === 'system';
                
                let IconComponent = Info;
                let iconBgColor = "bg-blue-500/15 text-blue-500 dark:bg-blue-500/20";
                let borderStyle = isDarkMode 
                  ? "border-slate-800 bg-slate-900/95 shadow-xl shadow-slate-950/45 text-slate-200 backdrop-blur-md" 
                  : "border-slate-100 bg-white/95 shadow-xl shadow-slate-200/45 text-slate-700 backdrop-blur-md";
                let categoryBadge = "Thông báo";
                
                if (isClinicalAlert) {
                  IconComponent = ShieldAlert;
                  iconBgColor = "bg-rose-500/15 text-rose-500 dark:bg-rose-500/20";
                  categoryBadge = "🔴 Cảnh báo lâm sàng";
                  if (isDarkMode) {
                    borderStyle = "border-rose-500/40 bg-slate-900/95 shadow-xl shadow-rose-950/20 text-slate-200 backdrop-blur-md";
                  } else {
                    borderStyle = "border-rose-100 bg-white/95 shadow-xl shadow-rose-100/30 text-slate-700 backdrop-blur-md";
                  }
                } else if (isDataUpdate) {
                  IconComponent = Pill;
                  iconBgColor = "bg-amber-500/15 text-amber-500 dark:bg-amber-500/20";
                  categoryBadge = "🟡 Dữ liệu";
                  if (isDarkMode) {
                    borderStyle = "border-amber-500/40 bg-slate-900/95 shadow-xl shadow-amber-950/20 text-slate-200 backdrop-blur-md";
                  } else {
                    borderStyle = "border-amber-100 bg-white/95 shadow-xl shadow-amber-100/30 text-slate-700 backdrop-blur-md";
                  }
                } else if (isMedicalNews) {
                  IconComponent = FileText;
                  iconBgColor = "bg-sky-500/15 text-sky-500 dark:bg-sky-500/20";
                  categoryBadge = "🔵 Tin tức y học";
                } else if (isSystem) {
                  IconComponent = Settings;
                  iconBgColor = "bg-slate-500/15 text-slate-400 dark:bg-slate-500/20";
                  categoryBadge = "⚙️ Hệ thống";
                }

                return (
                  <motion.div
                    key={toast.id}
                    layout
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.15 } }}
                    className={cn(
                      "p-4 rounded-2xl border-2 pointer-events-auto flex gap-3.5 relative overflow-hidden group",
                      borderStyle
                    )}
                  >
                    {isClinicalAlert && <div className="absolute top-0 bottom-0 left-0 w-1 bg-rose-500" />}
                    {isDataUpdate && <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />}

                    <div className={cn("p-2.5 rounded-xl shrink-0 h-fit border border-slate-500/5", iconBgColor)}>
                      <IconComponent size={16} />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex flex-col mb-1">
                        <span className="text-[8px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500">
                          {categoryBadge}
                        </span>
                        <h4 className="font-extrabold text-xs leading-tight mt-0.5 truncate text-slate-900 dark:text-white">
                          {toast.title}
                        </h4>
                      </div>
                      
                      <p className="text-[10px] font-semibold leading-relaxed line-clamp-2 text-slate-500 dark:text-slate-400">
                        {toast.message}
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReadStatus(toast.item);
                            setToastPopups(prev => prev.filter(t => t.id !== toast.id));
                          }}
                          className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer border border-indigo-500/10"
                        >
                          Đã xem
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsNotificationsOpen(true);
                            toggleReadStatus(toast.item);
                            setToastPopups(prev => prev.filter(t => t.id !== toast.id));
                          }}
                          className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 transition-all cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setToastPopups(prev => prev.filter(t => t.id !== toast.id));
                      }}
                      className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-500/5 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
      </main >
      </Suspense >
    </div >
    </>
  );
}
