import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Pill, 
  ClipboardList, 
  ShieldAlert, 
  AlertTriangle, 
  FileSearch, 
  Users, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  FileText, 
  Calculator, 
  LayoutTemplate, 
  Menu, 
  X, 
  Globe, 
  UserCheck, 
  LayoutGrid, 
  Sun, 
  Moon, 
  HelpCircle, 
  History, 
  Briefcase, 
  FolderTree, 
  Database, 
  Activity, 
  ArrowLeftCircle, 
  Settings, 
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Bell,
  BookOpen,
  Stethoscope,
  User
} from 'lucide-react';
import { cn, getBustedPhotoURL, sanitizeFirestoreData } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, orderBy, onSnapshot } from '../firebase';
import { VersionLog, MobileBottomNavSettings, MobileNavButtonConfig } from '../types';
import { 
  DEFAULT_MOBILE_BOTTOM_NAV_SETTINGS, 
  DEFAULT_MOBILE_NAV_BUTTONS, 
  NAV_HIGHLIGHT_COLORS, 
  getNavIconComponent 
} from '../lib/mobileNavDefaults';

export interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'admin' | 'operator' | 'operator_doctor' | 'operator_pharmacist' | 'member' | 'unapproved';
  displayName: string;
  title?: string;
  photoURL?: string;
  photoSyncToken?: string;
  isDarkMode?: boolean;
  allowedTabs: string[];
  isAdminMode?: boolean;
  setIsAdminMode?: (val: boolean) => void;
  appName: string;
  featureStates?: Record<string, 'open' | 'closed' | 'maintenance'>;
  featureSettings?: Record<string, any>;
  uid?: string;
  isApproved?: boolean;
  drugDirectoryViewMode?: 'drugs' | 'groups' | 'ingredients' | 'ingredient_categories' | 'excipients' | 'excipient_categories' | 'companies';
  setDrugDirectoryViewMode?: (mode: 'drugs' | 'groups' | 'ingredients' | 'ingredient_categories' | 'excipients' | 'excipient_categories' | 'companies') => void;
  onOpenUserGuide?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  mobileBottomNavSettings?: MobileBottomNavSettings;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  section: 'member' | 'admin';
  group?: 'general' | 'pharmacy' | 'admin';
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  displayName,
  title,
  photoURL,
  photoSyncToken,
  isDarkMode,
  allowedTabs,
  isAdminMode,
  setIsAdminMode,
  appName,
  featureStates = {},
  featureSettings = {},
  uid,
  isApproved = true,
  drugDirectoryViewMode = 'drugs',
  setDrugDirectoryViewMode,
  onOpenUserGuide,
  onOpenSettings,
  onOpenProfile,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  mobileBottomNavSettings
}) => {
  const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
  const [isLookupSheetOpen, setIsLookupSheetOpen] = useState(false);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [latestVersion, setLatestVersion] = useState<VersionLog | null>(null);
  const [isViewDirectoryExpanded, setIsViewDirectoryExpanded] = useState(activeTab === 'view_directory');
  const [isManageDirectoryExpanded, setIsManageDirectoryExpanded] = useState(activeTab === 'manage_directory');

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'versions'), 
        orderBy('releaseDate', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const versions = snap.docs.map(d => ({ id: d.id, ...sanitizeFirestoreData(d.data()) } as VersionLog));
          const published = versions.find(v => !v.isDraft);
          setLatestVersion(published || versions[0] || null);
        }
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Version listener error:", error);
        }
      });

      return unsubscribe;
    } catch (e) {
      console.warn("Firestore query failed:", e);
    }
  }, []);

  const allPossibleItems: NavItem[] = [
    { id: 'dashboard', label: featureSettings['dashboard']?.customTitle || 'Workspace', icon: LayoutDashboard, section: 'member', group: 'general' },
    { id: 'view_calendar', label: featureSettings['view_calendar']?.customTitle || 'Lịch công tác', icon: Calendar, section: 'member', group: 'general' },
    { id: 'view_notes', label: featureSettings['view_notes']?.customTitle || 'Ghi chú', icon: MessageSquare, section: 'member', group: 'general' },
    { id: 'view_todo', label: featureSettings['view_todo']?.customTitle || 'Việc cần làm', icon: ListTodo, section: 'member', group: 'general' },
    { id: 'view_doc_lookup', label: featureSettings['view_doc_lookup']?.customTitle || 'Tra cứu văn bản', icon: FileSearch, section: 'member', group: 'general' },
    { id: 'view_directory', label: featureSettings['view_directory']?.customTitle || 'Tra cứu thuốc', icon: Pill, section: 'member', group: 'general' },
    { id: 'view_national_pharmacopoeia', label: featureSettings['view_national_pharmacopoeia']?.customTitle || 'Dược thư Quốc gia', icon: BookOpen, section: 'member', group: 'general' },
    { id: 'view_treatment_guideline', label: featureSettings['view_treatment_guideline']?.customTitle || 'Hướng dẫn điều trị', icon: Stethoscope, section: 'member', group: 'general' },
    { id: 'view_icd10', label: featureSettings['view_icd10']?.customTitle || 'Tra cứu ICD-10', icon: ClipboardList, section: 'member', group: 'general' },
    { id: 'view_interaction', label: featureSettings['view_interaction']?.customTitle || 'Tương tác thuốc', icon: ShieldAlert, section: 'member', group: 'general' },
    { id: 'view_adr', label: featureSettings['view_adr']?.customTitle || 'Tra cứu ADR', icon: AlertTriangle, section: 'member', group: 'general' },
    { id: 'view_patients', label: featureSettings['view_patients']?.customTitle || 'Tra cứu bệnh nhân', icon: Users, section: 'member', group: 'general' },
    { id: 'view_prescription', label: featureSettings['view_prescription']?.customTitle || 'Kê toa thử', icon: FileText, section: 'member', group: 'general' },
    { id: 'view_social', label: featureSettings['view_social']?.customTitle || 'Mạng xã hội', icon: MessageSquare, section: 'member', group: 'general' },
    { id: 'view_calculator', label: featureSettings['view_calculator']?.customTitle || 'Máy tính', icon: Calculator, section: 'member', group: 'general' },
    { id: 'view_slideshow', label: featureSettings['view_slideshow']?.customTitle || 'Slide Showcase', icon: LayoutTemplate, section: 'member', group: 'general' },
    
    { id: 'admin_general', label: 'Cài đặt chung', icon: Globe, section: 'admin', group: 'admin' },
    { id: 'admin_registration', label: 'Đăng nhập/Đăng ký', icon: UserCheck, section: 'admin', group: 'admin' },
    { id: 'admin_home', label: 'Công cụ', icon: LayoutGrid, section: 'admin', group: 'admin' },
    { id: 'admin_notifications', label: 'Thông báo/Tin nhắn', icon: MessageSquare, section: 'admin', group: 'admin' },
    { id: 'admin_theme', label: 'Quản lý Giao diện', icon: Sun, section: 'admin', group: 'admin' },
    { id: 'admin_slideshow', label: 'Quản lý Slide Showcase', icon: LayoutTemplate, section: 'admin', group: 'admin' },
    { id: 'admin_hr', label: 'Quản lý Nhân sự', icon: Users, section: 'admin', group: 'admin' },
    { id: 'admin_guide', label: 'Hướng dẫn/Trợ giúp', icon: HelpCircle, section: 'admin', group: 'admin' },
    
    { id: 'manage_users', label: 'Quản lý người dùng', icon: Users, section: 'admin', group: 'admin' },
    { id: 'manage_directory', label: featureSettings['manage_directory']?.customTitle || 'Quản lý thuốc', icon: Pill, section: 'member', group: 'pharmacy' },
    { id: 'manage_national_pharmacopoeia', label: featureSettings['manage_national_pharmacopoeia']?.customTitle || 'Quản lý Dược thư', icon: BookOpen, section: 'member', group: 'pharmacy' },
    { id: 'manage_treatment_guidelines', label: featureSettings['manage_treatment_guidelines']?.customTitle || 'Hướng dẫn điều trị (BYT)', icon: Stethoscope, section: 'member', group: 'pharmacy' },
    { id: 'manage_icd10', label: featureSettings['manage_icd10']?.customTitle || 'Quản lý ICD-10', icon: ClipboardList, section: 'member', group: 'pharmacy' },
    { id: 'manage_interaction', label: featureSettings['manage_interaction']?.customTitle || 'Quản lý tương tác thuốc', icon: ShieldAlert, section: 'member', group: 'pharmacy' },
    { id: 'manage_adr', label: featureSettings['manage_adr']?.customTitle || 'Quản lý ADR', icon: AlertTriangle, section: 'member', group: 'pharmacy' },
    { id: 'manage_doc_lookup', label: featureSettings['manage_doc_lookup']?.customTitle || 'Quản lý văn bản', icon: FileText, section: 'member', group: 'pharmacy' },
  ];

  const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userRole);

  const isItemVisible = (item: NavItem) => {
    const status = featureStates[item.id];
    const settings = featureSettings[item.id];
    
    if (uid && settings?.bannedUsers?.includes(uid)) return false;
    
    const allowedRoles = settings?.allowedRoles || [];
    const checkRole = isApproved ? userRole : 'unapproved';
    if (allowedRoles.length > 0 && !allowedRoles.includes(checkRole)) return false;
    
    if (status === 'closed') return false;
    if (status === 'maintenance' && !isPrivileged) return false;
    if (!isApproved && (item.id.startsWith('admin_') || item.id.startsWith('manage_'))) return false;

    return allowedTabs.includes(item.id) || item.id.startsWith('admin_');
  };

  const visibleItems = allPossibleItems.filter(isItemVisible);
  const generalItems = visibleItems.filter(item => item.section === 'member' && item.group === 'general');
  const pharmacyItems = visibleItems.filter(item => item.section === 'member' && item.group === 'pharmacy');
  const adminItems = visibleItems.filter(item => item.section === 'admin');

  // Lookup sub-group items
  const lookupTabs = ['view_directory', 'view_national_pharmacopoeia', 'view_treatment_guideline', 'view_icd10', 'view_interaction', 'view_adr', 'view_doc_lookup', 'view_patients'];
  const availableLookupItems = generalItems.filter(item => lookupTabs.includes(item.id));
  const isLookupActive = lookupTabs.includes(activeTab);

  // Tools sub-group items
  const toolsTabs = ['view_calendar', 'view_notes', 'view_todo', 'view_prescription', 'view_calculator', 'view_social', 'view_slideshow'];
  const availableToolsItems = generalItems.filter(item => toolsTabs.includes(item.id));
  const isToolsActive = toolsTabs.includes(activeTab);

  // Pharmacy / Management items
  const isPharmacyActive = pharmacyItems.some(item => item.id === activeTab);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsMenuSheetOpen(false);
    setIsLookupSheetOpen(false);
    setIsToolsSheetOpen(false);
  };

  const filteredSheetItems = visibleItems.filter(item => {
    if (!menuSearchQuery) return true;
    const q = menuSearchQuery.toLowerCase();
    return item.label.toLowerCase().includes(q);
  });

  const navConfig: MobileBottomNavSettings = mobileBottomNavSettings || DEFAULT_MOBILE_BOTTOM_NAV_SETTINGS;
  const isNavEnabled = navConfig.enabled !== false;
  const rawButtons: MobileNavButtonConfig[] = (navConfig.buttons && navConfig.buttons.length > 0)
    ? navConfig.buttons
    : DEFAULT_MOBILE_NAV_BUTTONS;

  const currentRole = isApproved ? userRole : 'unapproved';
  const visibleNavButtons = rawButtons
    .filter(btn => btn.isVisible)
    .filter(btn => {
      if (!btn.rolesAllowed || btn.rolesAllowed.length === 0) return true;
      return btn.rolesAllowed.includes(currentRole);
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const navStyle = navConfig.navStyle || 'default';
  const showLabels = navConfig.showLabels || 'always';

  // Determine active profile or settings state
  const isProfileActive = activeTab === 'view_profile' || activeTab === 'profile';
  const isSettingsActive = activeTab === 'settings' || activeTab === 'app_settings';

  const activeNavButtonId = useMemo(() => {
    if (isProfileActive) {
      return 'btn_profile';
    }

    if (isSettingsActive) {
      return 'btn_settings';
    }

    // 1. If a sheet drawer is currently open, highlight ONLY the button that opened it
    if (isToolsSheetOpen) {
      const btn = visibleNavButtons.find(b => b.actionType === 'sheet_tools');
      if (btn) return btn.id;
    }
    if (isLookupSheetOpen) {
      const btn = visibleNavButtons.find(b => b.actionType === 'sheet_lookup');
      if (btn) return btn.id;
    }
    if (isMenuSheetOpen) {
      const btn = visibleNavButtons.find(b => b.actionType === 'sheet_menu');
      if (btn) return btn.id;
    }

    // 2. Exact match on targetTab for tab action or button with matching targetTab
    const exactMatch = visibleNavButtons.find(b => b.targetTab && b.targetTab === activeTab);
    if (exactMatch) return exactMatch.id;

    // 3. Category match for Pharmacy / Management tabs
    if (pharmacyItems.some(item => item.id === activeTab)) {
      const pharmacyBtn = visibleNavButtons.find(b => b.targetTab === 'manage_directory' || b.id === 'btn_pharmacy');
      if (pharmacyBtn) return pharmacyBtn.id;
    }

    // 4. Admin tabs
    if (activeTab.startsWith('admin_') || isAdminMode) {
      const adminBtn = visibleNavButtons.find(b => b.actionType === 'admin');
      if (adminBtn) return adminBtn.id;
    }

    return null;
  }, [activeTab, isProfileActive, isSettingsActive, isToolsSheetOpen, isLookupSheetOpen, isMenuSheetOpen, visibleNavButtons, pharmacyItems, isAdminMode]);

  // Touch gesture handling for MobileBottomNav
  const navTouchStartXRef = React.useRef<number | null>(null);
  const navTouchStartYRef = React.useRef<number | null>(null);

  const handleNavTouchStart = (e: React.TouchEvent) => {
    navTouchStartXRef.current = e.touches[0].clientX;
    navTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleNavTouchEnd = (e: React.TouchEvent) => {
    if (navTouchStartXRef.current === null || navTouchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - navTouchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - navTouchStartYRef.current;
    navTouchStartXRef.current = null;
    navTouchStartYRef.current = null;

    // Check if horizontal swipe
    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      const lastCustomNav = visibleNavButtons[visibleNavButtons.length - 1];
      const isAtLastCustomNav = lastCustomNav && (activeNavButtonId === lastCustomNav.id || activeTab === lastCustomNav.targetTab);

      if (deltaX < -35) {
        // Swipe left (advance forward in sequence)
        if (isAtLastCustomNav) {
          if (onOpenProfile) {
            onOpenProfile();
          } else {
            handleSelectTab('view_profile');
            window.dispatchEvent(new CustomEvent('reset-profile-view'));
          }
        } else if (!isProfileActive) {
          const currentIdx = visibleNavButtons.findIndex(b => b.id === activeNavButtonId);
          if (currentIdx !== -1 && currentIdx < visibleNavButtons.length - 1) {
            const nextBtn = visibleNavButtons[currentIdx + 1];
            if (nextBtn) {
              if (nextBtn.actionType === 'sheet_lookup') setIsLookupSheetOpen(true);
              else if (nextBtn.actionType === 'sheet_tools') setIsToolsSheetOpen(true);
              else if (nextBtn.actionType === 'sheet_menu') setIsMenuSheetOpen(true);
              else if (nextBtn.targetTab) handleSelectTab(nextBtn.targetTab);
            }
          }
        }
      } else if (deltaX > 35) {
        // Swipe right (go back in sequence)
        if (isProfileActive) {
          if (lastCustomNav?.targetTab) {
            handleSelectTab(lastCustomNav.targetTab);
          } else {
            handleSelectTab('dashboard');
          }
        } else {
          const currentIdx = visibleNavButtons.findIndex(b => b.id === activeNavButtonId);
          if (currentIdx > 0) {
            const prevBtn = visibleNavButtons[currentIdx - 1];
            if (prevBtn) {
              if (prevBtn.actionType === 'sheet_lookup') setIsLookupSheetOpen(true);
              else if (prevBtn.actionType === 'sheet_tools') setIsToolsSheetOpen(true);
              else if (prevBtn.actionType === 'sheet_menu') setIsMenuSheetOpen(true);
              else if (prevBtn.targetTab) handleSelectTab(prevBtn.targetTab);
            }
          }
        }
      }
    }
  };

  useEffect(() => {
    if (!isNavEnabled) {
      document.documentElement.style.setProperty('--mobile-bottom-nav-height', '0px');
      return;
    }

    const updateNavHeight = () => {
      const navEl = document.getElementById('bottommobilenav') || document.querySelector("nav[aria-label='Mobile Navigation']");
      if (navEl) {
        const rect = navEl.getBoundingClientRect();
        const dist = Math.max(0, window.innerHeight - rect.top);
        if (dist > 0) {
          document.documentElement.style.setProperty('--mobile-bottom-nav-height', `${Math.round(dist)}px`);
          return;
        }
      }
      document.documentElement.style.setProperty('--mobile-bottom-nav-height', '58px');
    };

    updateNavHeight();
    const timer = setTimeout(updateNavHeight, 150);
    window.addEventListener('resize', updateNavHeight);
    window.addEventListener('orientationchange', updateNavHeight);

    let ro: ResizeObserver | null = null;
    const navEl = document.getElementById('bottommobilenav') || document.querySelector("nav[aria-label='Mobile Navigation']");
    if (navEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateNavHeight);
      ro.observe(navEl);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateNavHeight);
      window.removeEventListener('orientationchange', updateNavHeight);
      if (ro) ro.disconnect();
    };
  }, [isNavEnabled, navStyle, showLabels, visibleNavButtons.length]);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      {isNavEnabled && (
        <nav
          id="bottommobilenav"
          aria-label="Mobile Navigation"
          onTouchStart={handleNavTouchStart}
          onTouchEnd={handleNavTouchEnd}
          className={cn(
            "lg:hidden fixed z-40 transition-all duration-300",
            navStyle === 'floating'
              ? "bottom-1.5 left-2 right-2 max-w-lg mx-auto rounded-2xl border shadow-xl pb-0.5"
              : navStyle === 'glass'
                ? "bottom-0 left-0 right-0 border-t backdrop-blur-2xl shadow-xl pb-[max(env(safe-area-inset-bottom),0.15rem)]"
                : navStyle === 'solid'
                  ? "bottom-0 left-0 right-0 border-t shadow-xl pb-[max(env(safe-area-inset-bottom),0.15rem)]"
                  : "bottom-0 left-0 right-0 border-t backdrop-blur-xl shadow-xl pb-[max(env(safe-area-inset-bottom),0.15rem)]",
            navStyle === 'floating'
              ? (isDarkMode ? "bg-slate-900/95 border-slate-700/80 text-slate-200" : "bg-white/95 border-slate-200 text-slate-700")
              : navStyle === 'glass'
                ? (isDarkMode ? "bg-slate-950/80 border-slate-800/80 text-slate-200" : "bg-white/80 border-slate-200/80 text-slate-700")
                : navStyle === 'solid'
                  ? (isDarkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-700")
                  : (isDarkMode ? "bg-slate-950/95 border-slate-800 text-slate-200" : "bg-white/95 border-slate-200 text-slate-700")
          )}
        >
          <div className="flex items-center justify-around px-1 py-0.5 max-w-lg mx-auto">
            {visibleNavButtons.map((btn, idx) => {
              const IconComp = getNavIconComponent(btn.icon);
              const highlightObj = NAV_HIGHLIGHT_COLORS.find(c => c.key === (btn.highlightColor || 'primary')) || NAV_HIGHLIGHT_COLORS[0];
              const isBtnActive = activeNavButtonId === btn.id;

              const handleBtnClick = () => {
                if (btn.actionType === 'sheet_lookup') {
                  setIsToolsSheetOpen(false);
                  setIsMenuSheetOpen(false);
                  if (activeTab === (btn.targetTab || 'view_directory') || lookupTabs.includes(activeTab)) {
                    setIsLookupSheetOpen(prev => !prev);
                  } else {
                    handleSelectTab(btn.targetTab || 'view_directory');
                  }
                } else if (btn.actionType === 'sheet_tools') {
                  setIsLookupSheetOpen(false);
                  setIsMenuSheetOpen(false);
                  if (activeTab === (btn.targetTab || 'view_calendar') || toolsTabs.includes(activeTab)) {
                    setIsToolsSheetOpen(prev => !prev);
                  } else {
                    handleSelectTab(btn.targetTab || 'view_calendar');
                  }
                } else if (btn.actionType === 'sheet_menu') {
                  setIsLookupSheetOpen(false);
                  setIsToolsSheetOpen(false);
                  setIsMenuSheetOpen(prev => !prev);
                } else if (btn.actionType === 'admin') {
                  setIsLookupSheetOpen(false);
                  setIsToolsSheetOpen(false);
                  setIsMenuSheetOpen(false);
                  if (setIsAdminMode) {
                    setIsAdminMode(!isAdminMode);
                  }
                  handleSelectTab(btn.targetTab || 'admin_general');
                } else {
                  setIsLookupSheetOpen(false);
                  setIsToolsSheetOpen(false);
                  setIsMenuSheetOpen(false);
                  handleSelectTab(btn.targetTab || 'dashboard');
                }
              };

              const isLabelVisible = showLabels === 'always' || (showLabels === 'active_only' && isBtnActive);

              return (
                <button
                  key={`mob-btn-${btn.id}-${idx}`}
                  id={`mobile-nav-btn-${btn.id}`}
                  type="button"
                  onClick={handleBtnClick}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all relative group cursor-pointer",
                    isBtnActive
                      ? cn("font-black scale-105", highlightObj.textClass)
                      : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                  )}
                >
                  <div className={cn(
                    "p-1 rounded-lg transition-all",
                    isBtnActive
                      ? cn("shadow-sm", isDarkMode ? highlightObj.activeDarkBg : highlightObj.activeLightBg, highlightObj.textClass)
                      : (isDarkMode ? "group-hover:bg-slate-800" : "group-hover:bg-slate-100")
                  )}>
                    <IconComp size={18} strokeWidth={isBtnActive ? 2.5 : 2} />
                  </div>
                  {isLabelVisible && (
                    <span className="text-[9.5px] leading-tight tracking-tight mt-0.5 whitespace-nowrap truncate max-w-full px-0.5">
                      {btn.label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Nút Avatar Cá nhân thay thế nút Cài đặt */}
            {(() => {
              const highlightObj = NAV_HIGHLIGHT_COLORS[0]; // Primary color
              const isLabelVisible = showLabels === 'always' || (showLabels === 'active_only' && isProfileActive);

              const handleAvatarClick = () => {
                setIsLookupSheetOpen(false);
                setIsToolsSheetOpen(false);
                setIsMenuSheetOpen(false);
                if (onOpenProfile) {
                  onOpenProfile();
                } else {
                  handleSelectTab('view_profile');
                  window.dispatchEvent(new CustomEvent('reset-profile-view'));
                }
              };

              return (
                <button
                  id="mobile-bottom-nav-avatar-btn"
                  type="button"
                  onClick={handleAvatarClick}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all relative group cursor-pointer",
                    isProfileActive
                      ? cn("font-black scale-105", highlightObj.textClass)
                      : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                  )}
                  title={displayName ? `Trang cá nhân: ${displayName}` : "Cá nhân"}
                >
                  <div className={cn(
                    "p-0.5 rounded-full transition-all relative flex items-center justify-center",
                    isProfileActive
                      ? cn("ring-2 ring-primary ring-offset-1 shadow-sm", isDarkMode ? "ring-offset-slate-950" : "ring-offset-white")
                      : (isDarkMode ? "ring-1 ring-slate-700/80 group-hover:ring-slate-500" : "ring-1 ring-slate-300 group-hover:ring-slate-400")
                  )}>
                    {photoURL ? (
                      <img
                        src={getBustedPhotoURL(photoURL, photoSyncToken)}
                        alt={displayName || 'Avatar'}
                        className="w-[20px] h-[20px] rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={cn(
                        "w-[20px] h-[20px] rounded-full flex items-center justify-center font-black text-[10px] shrink-0",
                        isProfileActive
                          ? "bg-primary text-white"
                          : (isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700")
                      )}>
                        {displayName ? displayName.charAt(0).toUpperCase() : <User size={12} />}
                      </div>
                    )}
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full border border-white dark:border-slate-950 absolute -bottom-0.5 -right-0.5" />
                  </div>
                  {isLabelVisible && (
                    <span className="text-[9.5px] leading-tight tracking-tight mt-0.5 whitespace-nowrap truncate max-w-full px-0.5">
                      Cá nhân
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
        </nav>
      )}

      {/* Tra Cứu Quick Sheet Modal */}
      <AnimatePresence>
        {isLookupSheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLookupSheetOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={cn(
                "relative z-10 w-full rounded-t-[28px] border-t p-5 shadow-2xl flex flex-col max-h-[80vh]",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Handle bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4" />
              
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Search size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Danh mục Tra cứu</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Chọn tính năng tra cứu chuyên khoa</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLookupSheetOpen(false)}
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    isDarkMode 
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" 
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 overflow-y-auto custom-scrollbar p-1 mb-4">
                {availableLookupItems.map((item, idx) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={`lookup-item-${item.id}-${idx}`}
                      onClick={() => handleSelectTab(item.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98]",
                        isActive
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : isDarkMode
                            ? "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800"
                            : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-white shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl shrink-0",
                        isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      )}>
                        <ItemIcon size={18} />
                      </div>
                      <span className="text-xs font-bold truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-tabs for Drug Directory if active */}
              {activeTab === 'view_directory' && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Chế độ xem tra cứu thuốc:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'drugs', label: 'Biệt dược', icon: Pill },
                      { id: 'groups', label: 'Nhóm thuốc', icon: FolderTree },
                      { id: 'ingredients', label: 'Hoạt chất', icon: Activity }
                    ].map((sub, sIdx) => {
                      const isSubActive = drugDirectoryViewMode === sub.id;
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={`lookup-sub-${sub.id}-${sIdx}`}
                          onClick={() => {
                            if (setDrugDirectoryViewMode) {
                              setDrugDirectoryViewMode(sub.id as any);
                            }
                            setIsLookupSheetOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all",
                            isSubActive
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : isDarkMode
                                ? "bg-slate-800 border-slate-700 text-slate-300"
                                : "bg-slate-100 border-slate-200 text-slate-600"
                          )}
                        >
                          <SubIcon size={14} />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tiện Ích Quick Sheet Modal */}
      <AnimatePresence>
        {isToolsSheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsToolsSheetOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={cn(
                "relative z-10 w-full rounded-t-[28px] border-t p-5 shadow-2xl flex flex-col max-h-[80vh]",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Handle bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4" />
              
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Tiện ích & Y tế</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Công cụ làm việc và hỗ trợ lâm sàng</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsToolsSheetOpen(false)}
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    isDarkMode 
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" 
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 overflow-y-auto custom-scrollbar p-1">
                {availableToolsItems.map((item, idx) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={`tools-item-${item.id}-${idx}`}
                      onClick={() => handleSelectTab(item.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98]",
                        isActive
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : isDarkMode
                            ? "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800"
                            : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-white shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl shrink-0",
                        isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      )}>
                        <ItemIcon size={18} />
                      </div>
                      <span className="text-xs font-bold truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tất Cả Menu (Full Mobile Navigation Bottom Sheet) */}
      <AnimatePresence>
        {isMenuSheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuSheetOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className={cn(
                "relative z-10 w-full rounded-t-[32px] border-t p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden",
                isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Handle bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />

              {/* User profile card & Close */}
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSelectTab('view_profile')}
                  className={cn(
                    "flex-1 flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all",
                    activeTab === 'view_profile'
                      ? "bg-primary text-white border-primary shadow-md"
                      : isDarkMode
                        ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
                        : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                  )}
                >
                  {photoURL ? (
                    <img
                      src={getBustedPhotoURL(photoURL, photoSyncToken)}
                      alt={displayName}
                      className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 object-cover shadow-sm shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      <Users size={18} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-primary truncate">
                      {!isApproved ? 'Đang chờ duyệt' : (title || (userRole === 'admin' ? 'Quản trị viên' : 'Thành viên'))}
                    </p>
                    <p className="text-sm font-bold truncate">
                      {displayName}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMenuSheetOpen(false)}
                  className={cn(
                    "p-2.5 rounded-2xl transition-colors shrink-0",
                    isDarkMode 
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" 
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              {/* AdminCP Back / Switch Button if in Admin Mode */}
              {isAdminMode && setIsAdminMode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminMode(false);
                    handleSelectTab('dashboard');
                  }}
                  className="w-full mb-3 p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <ArrowLeftCircle size={16} />
                  <span>Thoát Admin Control Panel</span>
                </button>
              )}

              {/* Search input in Menu */}
              <div className="relative mb-3 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm tính năng, công cụ..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-9 pr-9 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                    isDarkMode ? "bg-slate-900 border border-slate-800 text-white placeholder-slate-500" : "bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400"
                  )}
                />
                {menuSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMenuSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Scrollable Items List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 pb-4">
                {menuSearchQuery ? (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1 mb-2">
                      Kết quả tìm kiếm ({filteredSheetItems.length})
                    </span>
                    {filteredSheetItems.map((item, idx) => {
                      const ItemIcon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={`sheet-item-${item.id}-${idx}`}
                          onClick={() => handleSelectTab(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border",
                            isActive
                              ? "bg-primary text-white border-primary shadow-md"
                              : isDarkMode
                                ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("p-2 rounded-xl", isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                              <ItemIcon size={16} />
                            </div>
                            <span className="text-xs font-bold truncate">{item.label}</span>
                          </div>
                          <ChevronRight size={14} className="opacity-50" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* General / Clinical Section */}
                    {generalItems.length > 0 && !isAdminMode && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 px-1 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                            Tính năng Y tế & Lâm sàng
                          </span>
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {generalItems.map((item, idx) => {
                            const ItemIcon = item.icon;
                            const isActive = activeTab === item.id;
                            const isDir = item.id === 'view_directory';
                            return (
                              <div key={`gen-item-${item.id}-${idx}`} className="flex flex-col">
                                <button
                                  onClick={() => {
                                    if (isDir) {
                                      setIsViewDirectoryExpanded(!isViewDirectoryExpanded);
                                    }
                                    handleSelectTab(item.id);
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 rounded-xl text-left transition-all border",
                                    isActive
                                      ? "bg-primary text-white border-primary shadow-md"
                                      : isDarkMode
                                        ? "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800"
                                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={cn("p-1.5 rounded-lg", isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                                      <ItemIcon size={15} />
                                    </div>
                                    <span className="text-xs font-bold truncate">{item.label}</span>
                                  </div>
                                  {isDir ? (
                                    isViewDirectoryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                                  ) : (
                                    <ChevronRight size={14} className="opacity-40" />
                                  )}
                                </button>

                                {/* Expanded sub-modes for Drug Directory */}
                                {isDir && isViewDirectoryExpanded && (
                                  <div className="pl-6 pt-1 pb-1 space-y-1 border-l-2 border-primary/20 ml-4 my-1">
                                    {[
                                      { id: 'drugs', label: 'Biệt dược', icon: Pill },
                                      { id: 'groups', label: 'Nhóm thuốc', icon: FolderTree },
                                      { id: 'ingredients', label: 'Hoạt chất', icon: Activity }
                                    ].map((subItem, sIdx) => {
                                      const SubIcon = subItem.icon;
                                      const isSubActive = activeTab === 'view_directory' && drugDirectoryViewMode === subItem.id;
                                      return (
                                        <button
                                          key={`view-dir-sub-${subItem.id}-${sIdx}`}
                                          onClick={() => {
                                            if (setDrugDirectoryViewMode) {
                                              setDrugDirectoryViewMode(subItem.id as any);
                                            }
                                            handleSelectTab('view_directory');
                                          }}
                                          className={cn(
                                            "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                            isSubActive
                                              ? "bg-primary/15 text-primary font-bold"
                                              : isDarkMode
                                                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                                                : "text-slate-600 hover:bg-slate-100"
                                          )}
                                        >
                                          <SubIcon size={13} className={isSubActive ? "text-primary" : "text-slate-400"} />
                                          <span>{subItem.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pharmacy & Supplies Section */}
                    {pharmacyItems.length > 0 && !isAdminMode && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 px-1 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                            Dược & Vật tư Y tế
                          </span>
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {pharmacyItems.map((item, idx) => {
                            const ItemIcon = item.icon;
                            const isActive = activeTab === item.id;
                            const isDir = item.id === 'manage_directory';
                            return (
                              <div key={`pharm-item-${item.id}-${idx}`} className="flex flex-col">
                                <button
                                  onClick={() => {
                                    if (isDir) {
                                      setIsManageDirectoryExpanded(!isManageDirectoryExpanded);
                                    }
                                    handleSelectTab(item.id);
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 rounded-xl text-left transition-all border",
                                    isActive
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                                      : isDarkMode
                                        ? "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800"
                                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={cn("p-1.5 rounded-lg", isActive ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-500")}>
                                      <ItemIcon size={15} />
                                    </div>
                                    <span className="text-xs font-bold truncate">{item.label}</span>
                                  </div>
                                  {isDir ? (
                                    isManageDirectoryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                                  ) : (
                                    <ChevronRight size={14} className="opacity-40" />
                                  )}
                                </button>

                                {/* Expanded sub-modes for Manage Directory */}
                                {isDir && isManageDirectoryExpanded && (
                                  <div className="pl-6 pt-1 pb-1 space-y-1 border-l-2 border-emerald-500/20 ml-4 my-1">
                                    {[
                                      { id: 'drugs', label: 'Biệt dược', icon: Pill },
                                      { id: 'groups', label: 'Nhóm thuốc', icon: FolderTree },
                                      { id: 'ingredients', label: 'Hoạt chất', icon: Activity },
                                      { id: 'excipients', label: 'Tá dược', icon: Database },
                                      { id: 'companies', label: 'Công ty', icon: Briefcase }
                                    ].map((subItem, sIdx) => {
                                      const SubIcon = subItem.icon;
                                      const isSubActive = activeTab === 'manage_directory' && drugDirectoryViewMode === subItem.id;
                                      return (
                                        <button
                                          key={`manage-dir-sub-${subItem.id}-${sIdx}`}
                                          onClick={() => {
                                            if (setDrugDirectoryViewMode) {
                                              setDrugDirectoryViewMode(subItem.id as any);
                                            }
                                            handleSelectTab('manage_directory');
                                          }}
                                          className={cn(
                                            "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                            isSubActive
                                              ? "bg-emerald-500/15 text-emerald-500 font-bold"
                                              : isDarkMode
                                                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                                                : "text-slate-600 hover:bg-slate-100"
                                          )}
                                        >
                                          <SubIcon size={13} className={isSubActive ? "text-emerald-500" : "text-slate-400"} />
                                          <span>{subItem.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Admin Control Panel Section */}
                    {isPrivileged && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 px-1 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
                            Admin Control Panel
                          </span>
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {adminItems.map((item, idx) => {
                            const ItemIcon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                              <button
                                key={`adm-item-${item.id}-${idx}`}
                                onClick={() => handleSelectTab(item.id)}
                                className={cn(
                                  "flex items-center justify-between p-2.5 rounded-xl text-left transition-all border",
                                  isActive
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                    : isDarkMode
                                      ? "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800"
                                      : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={cn("p-1.5 rounded-lg", isActive ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-500")}>
                                    <ItemIcon size={15} />
                                  </div>
                                  <span className="text-xs font-bold truncate">{item.label}</span>
                                </div>
                                <ChevronRight size={14} className="opacity-40" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bottom Quick Bar: User Guide & Version */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuSheetOpen(false);
                    if (onOpenUserGuide) onOpenUserGuide();
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all",
                    isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-indigo-50/60 border-indigo-100 text-indigo-700 hover:bg-indigo-100/60"
                  )}
                >
                  <HelpCircle size={14} className="text-primary" />
                  <span>Hướng dẫn</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuSheetOpen(false);
                    if (isAdminMode || activeTab.startsWith('admin_')) {
                      setActiveTab('admin_version');
                    } else {
                      window.dispatchEvent(new CustomEvent('open-whats-new'));
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all",
                    isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <History size={14} className="text-primary" />
                  <span className="truncate">v{latestVersion?.versionName || '1.0.0'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileBottomNav;
