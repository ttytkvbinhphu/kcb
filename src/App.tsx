import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DrugDirectory from './components/DrugDirectory';
import InteractionChecker from './components/InteractionChecker';
import PrescriptionForm from './components/PrescriptionForm';
import ICD10Management from './components/ICD10Management';
import UserManagement from './components/UserManagement';
import ADRManagement from './components/ADRManagement';
import PatientManagement from './components/PatientManagement';
import StaffManagement from './components/StaffManagement';
import SystemConfig from './components/SystemConfig';
import SocialWall from './components/SocialWall';
import Calendar from './components/Calendar';
import Notes from './components/Notes';
import { Pill, LogIn, ShieldCheck, FileText, ClipboardList, Users, X, LogOut, Settings, Sparkles, AlertTriangle, MessageSquare, Search, Zap, Menu, Loader2, LayoutDashboard, History, ShieldAlert, Briefcase, Calendar as CalendarIcon, Bell, Check, Trash2, CheckCheck, Info, AlertOctagon, LayoutGrid, Sun, Moon, Activity, Globe, Award, GraduationCap, Lock, EyeOff, Wrench, Palette, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser, db, collection, getDocs, setDoc, updateDoc, doc, getDoc, onSnapshot, query, where, orderBy, deleteDoc, limit, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Notification, SystemSettings, Announcement } from './types';
import { seedInitialData } from './lib/seed';

const ALL_TABS = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'view_calendar', label: 'Lịch công tác', icon: CalendarIcon },
  { id: 'view_notes', label: 'Ghi chú', icon: MessageSquare },
  { id: 'view_directory', label: 'Tra cứu thuốc', icon: Pill },
  { id: 'view_icd10', label: 'Tra cứu ICD-10', icon: ClipboardList },
  { id: 'view_interaction', label: 'Tương tác thuốc', icon: ShieldAlert },
  { id: 'view_adr', label: 'Tra cứu ADR', icon: AlertTriangle },
  { id: 'view_patients', label: 'Tra cứu bệnh nhân', icon: Users },
  { id: 'view_prescription', label: 'Kê toa thử', icon: FileText },
  { id: 'view_social', label: 'Mạng xã hội', icon: MessageSquare },
  { id: 'view_profile', label: 'Trang cá nhân', icon: Users },
  { id: 'manage_users', label: 'Quản lý người dùng', icon: Users },
  { id: 'manage_staff', label: 'Quản lý nhân sự', icon: Briefcase },
  { id: 'manage_directory', label: 'Quản lý thuốc', icon: Pill },
  { id: 'manage_icd10', label: 'Quản lý ICD-10', icon: ClipboardList },
  { id: 'manage_interaction', label: 'Quản lý tương tác thuốc', icon: ShieldAlert },
  { id: 'manage_adr', label: 'Quản lý ADR', icon: AlertTriangle },
  { id: 'manage_config', label: 'Cấu hình hệ thống', icon: Settings },
  // AdminCP Specific Tabs
  { id: 'admin_home', label: 'Trang chủ Admin', icon: LayoutDashboard },
  { id: 'admin_general', label: 'Cài đặt chung', icon: Globe },
  { id: 'admin_theme', label: 'Cài đặt Giao diện', icon: Palette },
  { id: 'admin_titles', label: 'Quản lý Chức danh', icon: Award },
  { id: 'admin_positions', label: 'Quản lý Chức vụ', icon: ShieldCheck },
  { id: 'admin_specialties', label: 'Quản lý Chuyên khoa', icon: GraduationCap },
  { id: 'admin_roles', label: 'Quản lý Nhóm quyền', icon: Lock },
  { id: 'admin_permissions', label: 'Phân quyền hệ thống', icon: ShieldCheck },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('activeTab');
    return saved || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread' | 'read' | 'announcements'>('unread');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileEditData, setProfileEditData] = useState({
    zaloNumber: '',
    hideEmail: false,
    hideZalo: false
  });
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
  const [featureStates, setFeatureStates] = useState<Record<string, 'open' | 'closed' | 'maintenance'>>({});
  const [featureSettings, setFeatureSettings] = useState<Record<string, any>>({});
  const [isAdminMode, setIsAdminMode] = useState(() => {
    const saved = localStorage.getItem('isAdminMode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isAdminMode', isAdminMode.toString());
  }, [isAdminMode]);
  const [guestView, setGuestView] = useState<'none' | 'drugs' | 'icd10' | 'terms'>('none');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (showLoginPrompt) {
      const timer = setTimeout(() => setShowLoginPrompt(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showLoginPrompt]);

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    appName: 'KCB Bình Phú',
    loginTitle: 'Hệ thống Quản lý KCB',
    loginSubtitle: 'Phòng khám Đa khoa Bình Phú',
    appDescription: 'Hệ thống hỗ trợ quyết định lâm sàng và quản lý dược lý hiện đại dành cho nhân viên y tế tại KCB Bình Phú.',
    defaultTheme: 'light'
  });
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const mobileAppsMenuRef = useRef<HTMLDivElement>(null);
  const desktopAppsMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchMenuRef = useRef<HTMLDivElement>(null);
  const desktopSearchMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

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
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(target)) {
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
    const saved = localStorage.getItem('theme');
    return (saved as any) || 'light';
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme_preference', 'true');
  };

  const isDarkMode = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme, isDarkMode]);

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...profileEditData,
        updatedAt: new Date().toISOString()
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleSaveProfileField = async (changes: Partial<typeof profileEditData>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...changes,
        updatedAt: new Date().toISOString()
      });
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
        const hasUserPreference = localStorage.getItem('theme_preference');
        if (!hasUserPreference && settings.defaultTheme) {
          setTheme(settings.defaultTheme);
        }
      }
    }, (error) => {
      console.error("Error loading system settings:", error);
      handleFirestoreError(error, OperationType.GET, 'system_settings/main');
    });

    if (!user) {
      setRolePermissions([]);
      setTitlePermissions([]);
      setPermsLoading(false);
      setFeatureStates({});
      setFeatureSettings({});
      setConfigRoles([]);
      return () => {
        unsubSettings();
      };
    }

    setPermsLoading(true);
    
    const unsubFeatures = onSnapshot(doc(db, 'system_config', 'features'), (snapshot) => {
      if (snapshot.exists()) {
        setFeatureStates(snapshot.data() as any);
      }
    }, (error) => {
      console.error("Error loading feature states:", error);
      handleFirestoreError(error, OperationType.GET, 'system_config/features');
    });

    const unsubFeatureSettings = onSnapshot(doc(db, 'system_config', 'feature_settings'), (snapshot) => {
      if (snapshot.exists()) {
        setFeatureSettings(snapshot.data() as any);
      }
    }, (error) => {
      console.error("Error loading feature settings:", error);
      handleFirestoreError(error, OperationType.GET, 'system_config/feature_settings');
    });
    
    // Safety timeout for permissions loading
    const permsTimeout = setTimeout(() => {
      setPermsLoading(false);
    }, 3000);

    const unsubConfigRoles = onSnapshot(collection(db, 'config_roles'), (snapshot) => {
      setConfigRoles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRolePerms = onSnapshot(collection(db, 'role_permissions'), (snapshot) => {
      setRolePermissions(snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      console.error("Error loading role permissions:", error);
      handleFirestoreError(error, OperationType.LIST, 'role_permissions');
    });

    const unsubTitlePerms = onSnapshot(collection(db, 'title_permissions'), (snapshot) => {
      setTitlePermissions(snapshot.docs.map(doc => doc.data()));
      setPermsLoading(false);
      clearTimeout(permsTimeout);
    }, (error) => {
      console.error("Error loading title permissions:", error);
      setPermsLoading(false);
      clearTimeout(permsTimeout);
      handleFirestoreError(error, OperationType.LIST, 'title_permissions');
    });

    // Notifications listener
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubNotifications = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
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

      setAnnouncements(filtered);
    }, (error) => {
      console.error("Error loading announcements:", error);
    });

    return () => {
      unsubConfigRoles();
      unsubRolePerms();
      unsubTitlePerms();
      unsubNotifications();
      unsubAnnouncements();
      unsubSettings();
      unsubFeatures();
      unsubFeatureSettings();
    };
  }, [user, userProfile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length === 0) return;
      
      const batchSize = 10; // Batch for large number of notifications
      for (let i = 0; i < unread.length; i += batchSize) {
        const chunk = unread.slice(i, i + batchSize);
        await Promise.all(chunk.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true })));
      }
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

  const renderNotificationItem = (notification: Notification, isDesktop: boolean = false) => {
    return (
      <div 
        key={notification.id}
        className={cn(
          "p-2.5 rounded-xl border transition-all relative group",
          notification.isRead 
            ? (isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-100")
            : (isDarkMode ? "bg-slate-800 border-primary/30" : "bg-white border-primary/20 shadow-sm")
        )}
      >
        <div className="flex gap-2">
          <div className={cn(
            "p-1.5 rounded-lg shrink-0 h-fit",
            notification.type === 'info' ? "bg-blue-500/10 text-blue-500" :
            notification.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
            notification.type === 'warning' ? "bg-amber-500/10 text-amber-500" :
            "bg-rose-500/10 text-rose-500"
          )}>
            {notification.type === 'info' ? <Info size={14} /> :
             notification.type === 'success' ? <Check size={14} /> :
             notification.type === 'warning' ? <AlertTriangle size={14} /> :
             <AlertOctagon size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <h4 className={cn("font-bold text-[11px] truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                {notification.title}
              </h4>
              <span className="text-[8px] text-slate-400 font-medium shrink-0">
                {new Date(notification.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <p className={cn("text-[10px] leading-tight mb-1.5", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              {notification.message}
            </p>
            <div className="flex items-center gap-2">
              {!notification.isRead && (
                <button 
                  onClick={() => markAsRead(notification.id)}
                  className="text-[8px] font-black text-primary hover:underline flex items-center gap-0.5"
                >
                  <Check size={8} /> Đã đọc
                </button>
              )}
              {notification.link && (
                <button 
                  onClick={() => {
                    setActiveTab(notification.link!);
                    setIsNotificationsOpen(false);
                    markAsRead(notification.id);
                  }}
                  className="text-[8px] font-black text-indigo-500 hover:underline flex items-center gap-0.5"
                >
                  <Zap size={8} /> Xem
                </button>
              )}
              <button 
                onClick={() => deleteNotification(notification.id)}
                className="text-[8px] font-black text-rose-500 hover:underline flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={8} /> Xóa
              </button>
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
            const isAdminEmail = refreshedUser.email === 'ttytkvbinhphu@gmail.com';
            
            // Force approval and admin role for the master admin email
            if (isAdminEmail && (!profile.isApproved || profile.role !== 'admin')) {
              const updatedProfile = {
                ...profile,
                isApproved: true,
                role: 'admin' as const
              };
              try {
                await setDoc(userRef, updatedProfile);
                profile = updatedProfile;
              } catch (e) {
                console.warn("Admin auto-upgrade failed", e);
                profile = updatedProfile; // Set locally anyway
              }
            }

            // Sync with Google profile info if changed
            // We check providerData for potentially fresher info
            const googlePhoto = refreshedUser.providerData[0]?.photoURL || refreshedUser.photoURL;
            const googleName = refreshedUser.providerData[0]?.displayName || refreshedUser.displayName;

            if (profile.photoURL !== googlePhoto || (googleName && profile.displayName !== googleName && !profile.displayName)) {
              const updatedProfile = {
                ...profile,
                title: profile.title || 'Chưa cập nhật',
                position: profile.position || 'Chưa cập nhật',
                specialty: profile.specialty || 'Không',
                photoURL: googlePhoto || profile.photoURL || '',
                displayName: profile.displayName || googleName || profile.displayName,
                photoSyncToken: Date.now().toString()
              };
              try {
                await setDoc(userRef, updatedProfile);
                profile = updatedProfile;
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
              const migratedProfile = { ...profile, role: newRole };
              try {
                await setDoc(userRef, migratedProfile);
                profile = migratedProfile;
              } catch (e) {
                console.warn("Operator migration failed", e);
                profile = migratedProfile; // Set locally anyway
              }
            }
            
            setUserProfile(profile);
          } else {
            // New user logic
            const isAdmin = currentUser.email === 'ttytkvbinhphu@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email!,
              displayName: currentUser.displayName || (isAdmin ? 'Quản trị viên' : 'Thành viên mới'),
              photoURL: currentUser.photoURL || '',
              role: isAdmin ? 'admin' : 'member',
              isApproved: isAdmin, // Only auto-approve the admin
              title: isAdmin ? 'Bác sĩ' : 'Chưa cập nhật',
              position: isAdmin ? 'Giám đốc' : 'Chưa cập nhật',
              specialty: 'Không'
            };
            
            // Set profile locally first so UI transitions immediately
            setUserProfile(newProfile);

            // Then persist to Firestore
            try {
              await setDoc(userRef, newProfile);
            } catch (error) {
              console.error("Critical: Failed to persist new user profile:", error);
            }
          }
          
          // Seed initial data non-blockingly
          seedInitialData();
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
          await setDoc(doc(db, 'auth_logs', logId), {
            id: logId,
            userId: result.user.uid,
            userEmail: result.user.email,
            userName: result.user.displayName || 'Người dùng',
            type: 'login',
            timestamp: new Date().toISOString()
          });
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

  const handleLogout = async () => {
    if (user) {
      // Log explicit logout
      const logId = Date.now().toString();
      try {
        await setDoc(doc(db, 'auth_logs', logId), {
          id: logId,
          userId: user.uid,
          userEmail: user.email,
          userName: userProfile?.displayName || user.displayName || 'Người dùng',
          type: 'logout',
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Logout logging failed", e);
      }
    }
    setIsProfileModalOpen(false);
    await auth.signOut();
  };

  if (!isAuthReady) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center transition-colors",
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
        "min-h-screen flex items-center justify-center p-4 lg:p-12 relative overflow-hidden font-sans transition-colors",
        isDarkMode ? "bg-slate-950" : "bg-slate-50"
      )}>
        {/* Dynamic Background */}
        {systemSettings.loginBgUrl && (
          <div className="absolute inset-0 z-0">
             <img 
               src={systemSettings.loginBgUrl} 
               className="w-full h-full object-cover" 
               alt="Background" 
               style={{ filter: `blur(${systemSettings.loginBgBlur || 0}px)` }}
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
                    if (feature.id === 'drugs') setGuestView('drugs');
                    else if (feature.id === 'icd10') setGuestView('icd10');
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
                  <img src={systemSettings.loginLogoUrl} className="w-12 h-12 object-contain" alt="Logo" referrerPolicy="no-referrer" />
                ) : (
                  <Pill size={40} className="text-white" />
                )}
              </div>
              <h1 className={cn("text-4xl font-black tracking-tight mb-2 transition-colors", (isDarkMode || systemSettings.loginCardGlassMode) ? "text-white" : "text-slate-900")}>{systemSettings.appName}</h1>
              <p className={cn("font-medium text-lg transition-colors", (isDarkMode || systemSettings.loginCardGlassMode) ? "text-white/60" : "text-slate-500")}>{systemSettings.loginSubtitle}</p>
            </div>

            {/* Mobile Features (Visible only on mobile) */}
            <div className="lg:hidden grid grid-cols-2 gap-3 mb-8">
              {features.map((f, i) => (
                <button 
                  key={i} 
                  type="button"
                  disabled={loginLoading}
                  onClick={() => {
                    if (f.id === 'drugs') setGuestView('drugs');
                    else if (f.id === 'icd10') setGuestView('icd10');
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
        "min-h-screen flex items-center justify-center transition-colors",
        isDarkMode ? "bg-slate-950" : "bg-slate-50"
      )}>
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!userProfile || permsLoading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center transition-colors",
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
  let allowedTabs = Array.from(new Set([...roleAllowedTabs, ...titleAllowedTabs, 'view_social', 'view_calendar', 'view_notes', 'view_profile', 'view_patients']));
  
  // Auto-allow admin tabs for admins
  if (userProfile.role === 'admin') {
    const adminTabs = ALL_TABS.filter(t => t.id.startsWith('admin_')).map(t => t.id);
    allowedTabs = Array.from(new Set([...allowedTabs, ...adminTabs]));
  }

  // CRITICAL: Restrict access for unapproved users
  if (!userProfile.isApproved) {
    allowedTabs = ['dashboard'];
  }

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
      const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(userProfile.role);
      
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
          onMarkAsRead={markAsRead}
          featureStates={featureStates}
          featureSettings={featureSettings}
          uid={user?.uid || ''}
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
          userRole={userProfile.role}
          userPowerPoints={userPowerPoints}
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
        const canManagePatients = isManagementMode || ['admin', 'operator', 'operator_doctor'].includes(userProfile?.role);
        return <PatientManagement isDarkMode={isDarkMode} canManage={canManagePatients} />;
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
          onSyncProfile={async () => {
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
          }}
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
          onSyncProfile={async () => {
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
          }}
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
        />;
    }
  };

  // Sidebar allowed tabs should be the full IDs
  const sidebarAllowedTabs = allowedTabs;

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300 flex",
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
    )}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
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
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        appName={systemSettings.appName}
        featureStates={featureStates}
        featureSettings={featureSettings}
        uid={user?.uid || ''}
      />
      
      <main className="flex-1 lg:ml-[260px] h-screen overflow-y-auto overflow-x-hidden relative custom-scrollbar">
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
              <div className={cn(
                "p-1.5 rounded-lg",
                userProfile?.role === 'admin' ? "bg-indigo-600" : "bg-primary"
              )}>
                <Pill size={14} className="text-white" />
              </div>
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
            <div className="relative">
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
                {notifications.some(n => !n.isRead) && (
                  <span className={cn(
                    "absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 animate-pulse",
                    isDarkMode ? "border-slate-900" : "border-white"
                  )} />
                )}
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
                        "fixed inset-x-4 top-16 z-50 p-4 rounded-2xl border shadow-2xl flex flex-col",
                        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={cn("font-black text-sm", isDarkMode ? "text-white" : "text-slate-900")}>Thông báo</h3>
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
                            <X size={16} className="text-slate-400" />
                          </button>
                        </div>
                      </div>

                      <div className={cn(
                        "flex items-center gap-1 p-1 rounded-xl mb-4 text-[9px] font-black uppercase tracking-widest transition-colors",
                        isDarkMode ? "bg-slate-800" : "bg-slate-50"
                      )}>
                        {[
                          { id: 'unread', label: 'Mới' },
                          { id: 'read', label: 'Đã đọc' },
                          { id: 'announcements', label: 'Hệ thống' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setNotificationTab(tab.id as any)}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg transition-all",
                              notificationTab === tab.id
                                ? (isDarkMode ? "bg-slate-700 text-white shadow-sm" : "bg-white text-primary shadow-sm")
                                : "text-slate-500 hover:text-slate-400"
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      
                      <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                        {(() => {
                          if (notificationTab === 'unread') {
                            const recentAnnouncements = announcements.filter(a => (Date.now() - new Date(a.createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000);
                            const unreadNotifs = notifications.filter(n => !n.isRead);
                            
                            if (recentAnnouncements.length === 0 && unreadNotifs.length === 0) {
                              return (
                                <div className="py-8 text-center text-slate-500 font-bold text-[10px]">
                                  Không có thông báo mới
                                </div>
                              );
                            }

                            return (
                              <>
                                {recentAnnouncements.map(announcement => (
                                  <div key={`mob-ann-${announcement.id}`} className="p-3 rounded-xl border transition-all relative group bg-indigo-500/5 border-indigo-500/20 shadow-sm mb-2">
                                    <div className="flex gap-3">
                                      <div className="p-2 rounded-lg shrink-0 bg-indigo-500/10 text-indigo-500">
                                        <Sparkles size={16} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <h4 className={cn("font-bold text-xs truncate", isDarkMode ? "text-white" : "text-slate-900")}>Hệ thống</h4>
                                          <span className="text-[9px] text-slate-400 font-medium shrink-0">{new Date(announcement.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className={cn("text-[10px] leading-relaxed transition-colors prose prose-sm max-w-none", isDarkMode ? "text-slate-300 prose-invert" : "text-slate-600")}>
                                          <ReactMarkdown>{announcement.content}</ReactMarkdown>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {unreadNotifs.map(notification => renderNotificationItem(notification))}
                              </>
                            );
                          }

                          if (notificationTab === 'read') {
                            const readNotifs = notifications.filter(n => n.isRead);
                            if (readNotifs.length === 0) {
                              return <div className="py-8 text-center text-slate-500 font-bold text-[10px]">Không có thông báo đã đọc</div>;
                            }
                            return readNotifs.map(notification => renderNotificationItem(notification));
                          }

                          if (notificationTab === 'announcements') {
                            if (announcements.length === 0) {
                              return <div className="py-8 text-center text-slate-500 font-bold text-[10px]">Chưa có thông báo hệ thống</div>;
                            }
                            return announcements.map(announcement => (
                              <div key={`mob-ann-all-${announcement.id}`} className="p-3 rounded-xl border transition-all relative group bg-indigo-500/5 border-indigo-500/20 shadow-sm mb-2">
                                <div className="flex gap-3">
                                  <div className="p-2 rounded-lg shrink-0 bg-indigo-500/10 text-indigo-500">
                                    <Sparkles size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <h4 className={cn("font-bold text-xs truncate", isDarkMode ? "text-white" : "text-slate-900")}>Hệ thống</h4>
                                      <span className="text-[9px] text-slate-400 font-medium shrink-0">{new Date(announcement.createdAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className={cn("text-[10px] leading-relaxed transition-colors prose prose-sm max-w-none", isDarkMode ? "text-slate-300 prose-invert" : "text-slate-600")}>
                                      <ReactMarkdown>{announcement.content}</ReactMarkdown>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ));
                          }
                        })()}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={() => setIsProfileModalOpen(true)}
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
              title="Trở về Tổng quan"
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all",
                userProfile.role === 'admin' ? "bg-indigo-600" : "bg-primary"
              )}>
                <Pill size={16} className="text-white" />
              </div>
              <span className="font-bold text-sm">{systemSettings.appName}</span>
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

          <div className="flex items-center gap-2">
            {/* Quick Access Icons - HIDDEN */}
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
                  key={`quick-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  title={featureSettings[item.id]?.customTitle || item.label}
                  className={cn(
                    "p-2 rounded-xl transition-all relative group shadow-sm",
                    activeTab === item.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : (isDarkMode ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white" : "bg-white border border-slate-100 text-slate-500 hover:text-primary")
                  )}
                >
                  <item.icon size={18} />
                </button>
              ));
            })()}

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
                        }).sort((a, b) => {
                          const orderA = featureSettings[a.id]?.order ?? 999;
                          const orderB = featureSettings[b.id]?.order ?? 999;
                          return orderA - orderB;
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

            <div className="flex items-center gap-2 mr-2">
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
                  {notifications.some(n => !n.isRead) && (
                    <span className={cn(
                      "absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 animate-pulse",
                      isDarkMode ? "border-slate-900" : "border-white"
                    )} />
                  )}
                </button>
                
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        "absolute right-0 top-full mt-2 w-80 z-[110] p-4 rounded-2xl border shadow-2xl flex flex-col",
                        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                      )}
                    >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={cn("font-black text-sm", isDarkMode ? "text-white" : "text-slate-900")}>Thông báo</h3>
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            <CheckCheck size={12} /> Đọc tất cả
                          </button>
                        </div>

                        <div className={cn(
                          "flex items-center gap-1 p-1 rounded-xl mb-4 text-[9px] font-black uppercase tracking-widest transition-colors",
                          isDarkMode ? "bg-slate-800" : "bg-slate-50"
                        )}>
                          {[
                            { id: 'unread', label: 'Mới nhất' },
                            { id: 'read', label: 'Đã đọc' },
                            { id: 'announcements', label: 'Hệ thống' }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setNotificationTab(tab.id as any)}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg transition-all",
                                notificationTab === tab.id
                                  ? (isDarkMode ? "bg-slate-700 text-white shadow-sm" : "bg-white text-primary shadow-sm")
                                  : "text-slate-500 hover:text-slate-400"
                              )}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                        
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                          {(() => {
                            let displayList = [];
                            
                            if (notificationTab === 'unread') {
                              // New announcements (within 3 days) + Unread notifications
                              const recentAnnouncements = announcements.filter(a => (Date.now() - new Date(a.createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000);
                              const unreadNotifs = notifications.filter(n => !n.isRead);
                              
                              if (recentAnnouncements.length === 0 && unreadNotifs.length === 0) {
                                return (
                                  <div className="py-8 text-center">
                                    <Bell className="mx-auto text-slate-300 mb-2" size={24} />
                                    <p className="text-slate-500 text-[10px] font-bold">Không có thông báo mới</p>
                                  </div>
                                );
                              }

                              return (
                                <>
                                  {recentAnnouncements.map(announcement => (
                                    <div key={`ann-${announcement.id}`} className="p-2.5 rounded-xl border transition-all relative group bg-indigo-500/5 border-indigo-500/20 shadow-sm">
                                      <div className="flex gap-2">
                                        <div className="p-1.5 rounded-lg shrink-0 h-fit bg-indigo-500/10 text-indigo-500">
                                          <Sparkles size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h4 className={cn("font-bold text-[11px] truncate", isDarkMode ? "text-white" : "text-slate-900")}>Hệ thống</h4>
                                            <span className="text-[8px] text-slate-400 font-medium shrink-0">{new Date(announcement.createdAt).toLocaleDateString('vi-VN')}</span>
                                          </div>
                                          <div className={cn("text-[10px] leading-relaxed transition-colors prose prose-sm max-w-none", isDarkMode ? "text-slate-300 prose-invert" : "text-slate-600")}>
                                            <ReactMarkdown>{announcement.content}</ReactMarkdown>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {unreadNotifs.map(notification => renderNotificationItem(notification, true))}
                                </>
                              );
                            }

                            if (notificationTab === 'read') {
                              const readNotifs = notifications.filter(n => n.isRead);
                              if (readNotifs.length === 0) {
                                return (
                                  <div className="py-8 text-center">
                                    <CheckCheck className="mx-auto text-slate-300 mb-2" size={24} />
                                    <p className="text-slate-500 text-[10px] font-bold">Không có thông báo đã đọc</p>
                                  </div>
                                );
                              }
                              return readNotifs.map(notification => renderNotificationItem(notification, true));
                            }

                            if (notificationTab === 'announcements') {
                              if (announcements.length === 0) {
                                return (
                                  <div className="py-8 text-center">
                                    <Sparkles className="mx-auto text-slate-300 mb-2" size={24} />
                                    <p className="text-slate-500 text-[10px] font-bold">Chưa có thông báo hệ thống</p>
                                  </div>
                                );
                              }
                              return announcements.map(announcement => (
                                <div key={`ann-all-${announcement.id}`} className="p-2.5 rounded-xl border transition-all relative group bg-indigo-500/5 border-indigo-500/20 shadow-sm mb-2">
                                  <div className="flex gap-2">
                                    <div className="p-1.5 rounded-lg shrink-0 h-fit bg-indigo-500/10 text-indigo-500">
                                      <Sparkles size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <h4 className={cn("font-bold text-[11px] truncate", isDarkMode ? "text-white" : "text-slate-900")}>Hệ thống</h4>
                                        <span className="text-[8px] text-slate-400 font-medium shrink-0">{new Date(announcement.createdAt).toLocaleDateString('vi-VN')}</span>
                                      </div>
                                      <div className={cn("text-[10px] leading-relaxed transition-colors prose prose-sm max-w-none", isDarkMode ? "text-slate-300 prose-invert" : "text-slate-600")}>
                                        <ReactMarkdown>{announcement.content}</ReactMarkdown>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ));
                            }
                          })()}
                        </div>
                      </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <button 
              onClick={() => {
                if (userProfile) {
                  setProfileEditData({
                    zaloNumber: userProfile.zaloNumber || '',
                    hideEmail: userProfile.hideEmail || false,
                    hideZalo: userProfile.hideZalo || false
                  });
                }
                setIsProfileModalOpen(true);
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

        {/* Sub Header */}
        {activeTab !== 'dashboard' && (
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
            <div id="mobile-subheader-portal" className="flex-1 flex items-center justify-end gap-2 overflow-x-auto no-scrollbar" />
          </div>
        )}

        <div className="p-3 lg:px-6 lg:pb-6 lg:pt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Profile Modal */}
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
                  <button 
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      if (guestView === 'terms') setGuestView('none');
                    }} 
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-200"
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
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

                  {/* Personal Info Edit Section */}
                  <div className="space-y-4">
                    <label className={cn(
                      "block text-xs font-black uppercase tracking-widest transition-colors",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>Thông tin cá nhân & Quyền riêng tư</label>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>Số Zalo</p>
                        <input 
                          type="text"
                          value={profileEditData.zaloNumber}
                          onChange={(e) => setProfileEditData(prev => ({ ...prev, zaloNumber: e.target.value }))}
                          onBlur={() => handleSaveProfileField({ zaloNumber: profileEditData.zaloNumber })}
                          placeholder="Nhập số Zalo của bạn..."
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                          )}
                        />
                      </div>

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
                              setProfileEditData(prev => ({ ...prev, hideEmail: nextHideEmail }));
                              handleSaveProfileField({ hideEmail: nextHideEmail });
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
                              <MessageSquare size={14} className="text-emerald-500" />
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
                              setProfileEditData(prev => ({ ...prev, hideZalo: nextHideZalo }));
                              handleSaveProfileField({ hideZalo: nextHideZalo });
                            }}
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-colors",
                              !profileEditData.hideZalo ? "bg-emerald-500" : (isDarkMode ? "bg-slate-700" : "bg-slate-200")
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

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className={cn(
                        "block text-xs font-black uppercase tracking-widest mb-3 transition-colors",
                        isDarkMode ? "text-slate-500" : "text-slate-400"
                      )}>Giao diện & Chủ đề</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'light', label: 'Giao diện Sáng', icon: Sun },
                          { id: 'dark', label: 'Giao diện Tối', icon: Moon },
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
                            setActiveTab('manage_config');
                            setIsProfileModalOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group",
                            isDarkMode ? "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20" : "bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
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
                  "p-4 sm:p-6 border-t",
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        
      
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
</main>
    </div>
  );
}
