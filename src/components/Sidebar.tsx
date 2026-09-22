import React, { useState, useEffect, useRef } from 'react';
import { Search, ShieldAlert, FileText, History, LayoutDashboard, LayoutGrid, Pill, ClipboardList, Settings, Users, UserCheck, AlertTriangle, MessageSquare, MessageSquarePlus, GripVertical, X, Briefcase, Calendar, Activity, Globe, Award, ShieldCheck, GraduationCap, Lock, LogOut, Sun, Calculator, ChevronLeft, ChevronRight, ChevronDown, ListTodo, ArrowLeftCircle, Info as InfoIcon, FileSearch, FolderTree, Database, HelpCircle, LayoutTemplate, Building2, Phone, Mail, Clock, MapPin, BookOpen, Stethoscope } from 'lucide-react';
import { cn, getBustedPhotoURL, sanitizeFirestoreData } from '../lib/utils';
import { Reorder, motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, orderBy, limit, onSnapshot } from '../firebase';
import { VersionLog, SidebarNavOrderSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string, keepSidebarOpen?: boolean) => void;
  userRole: 'admin' | 'operator' | 'operator_doctor' | 'operator_pharmacist' | 'member' | 'unapproved';
  displayName: string;
  title?: string;
  department?: string;
  position?: string;
  specialty?: string;
  email?: string;
  staffAccount?: string;
  username?: string;
  zalo?: string;
  createdAt?: string;
  photoURL?: string;
  photoSyncToken?: string;
  isDarkMode?: boolean;
  allowedTabs: string[];
  isEditMode: boolean;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
  isAdminMode?: boolean;
  setIsAdminMode?: (val: boolean) => void;
  isDataMode?: boolean;
  setIsDataMode?: (val: boolean) => void;
  appName: string;
  featureStates?: Record<string, 'open' | 'closed' | 'maintenance'>;
  featureSettings?: Record<string, any>;
  uid?: string;
  isApproved?: boolean;
  drugDirectoryViewMode?: 'drugs' | 'groups' | 'ingredients' | 'ingredient_categories' | 'excipients' | 'excipient_categories' | 'companies';
  setDrugDirectoryViewMode?: (mode: 'drugs' | 'groups' | 'ingredients' | 'ingredient_categories' | 'excipients' | 'excipient_categories' | 'companies') => void;
  onOpenUserGuide?: () => void;
  sidebarNavOrder?: SidebarNavOrderSettings;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  section: 'member' | 'admin' | 'data';
  group?: 'general' | 'pharmacy' | 'admin' | 'data';
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userRole, 
  displayName, 
  title, 
  department,
  position,
  specialty,
  photoURL, 
  photoSyncToken,
  email,
  staffAccount,
  username,
  zalo,
  createdAt,
  isDarkMode, 
  allowedTabs, 
  isEditMode, 
  isOpen, 
  setIsOpen, 
  isCollapsed = false,
  setIsCollapsed,
  isAdminMode,
  setIsAdminMode,
  isDataMode,
  setIsDataMode,
  appName,
  featureStates = {},
  featureSettings = {},
  uid,
  isApproved = true,
  drugDirectoryViewMode = 'drugs',
  setDrugDirectoryViewMode,
  onOpenUserGuide,
  sidebarNavOrder
}) => {
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [liveNavOrder, setLiveNavOrder] = useState<SidebarNavOrderSettings | undefined>(sidebarNavOrder);
  const [latestVersion, setLatestVersion] = useState<VersionLog | null>(null);

  useEffect(() => {
    setLiveNavOrder(sidebarNavOrder);
  }, [sidebarNavOrder]);

  useEffect(() => {
    const handleOrderUpdate = (e: any) => {
      if (e.detail && e.detail.section && e.detail.order) {
        setLiveNavOrder(prev => ({
          ...(prev || {}),
          [e.detail.section]: e.detail.order
        }));
      }
    };
    window.addEventListener('sidebar-order-updated', handleOrderUpdate);
    return () => window.removeEventListener('sidebar-order-updated', handleOrderUpdate);
  }, []);
  const [viewedProfileUid, setViewedProfileUid] = useState<string | null>(null);
  const [isViewDirectoryExpanded, setIsViewDirectoryExpanded] = useState(activeTab === 'view_directory');
  const [isManageDirectoryExpanded, setIsManageDirectoryExpanded] = useState(activeTab === 'manage_directory');
  const sidebarRef = useRef<HTMLDivElement>(null);

  const calculateTenure = (dateStr?: string) => {
    if (!dateStr) return '1 năm 6 tháng';
    try {
      const start = new Date(dateStr);
      const now = new Date();
      if (isNaN(start.getTime())) return '1 năm 6 tháng';
      
      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();
      let days = now.getDate() - start.getDate();

      if (days < 0) {
        months -= 1;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      const parts = [];
      if (years > 0) parts.push(`${years} năm`);
      if (months > 0) parts.push(`${months} tháng`);
      if (days > 0 || parts.length === 0) parts.push(`${days} ngày`);

      return parts.join(' ');
    } catch {
      return '1 năm 6 tháng';
    }
  };

  useEffect(() => {
    if (activeTab === 'view_directory') {
      setIsViewDirectoryExpanded(true);
    }
    if (activeTab === 'manage_directory') {
      setIsManageDirectoryExpanded(true);
    }
  }, [activeTab]);

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

  useEffect(() => {
    const allPossibleItems: SidebarItem[] = [
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
      { id: 'admin_feedbacks', label: 'Góp ý/Báo cáo', icon: MessageSquarePlus, section: 'admin', group: 'admin' },
      { id: 'admin_theme', label: 'Quản lý Giao diện', icon: Sun, section: 'admin', group: 'admin' },
      { id: 'admin_slideshow', label: 'Quản lý Slide Showcase', icon: LayoutTemplate, section: 'admin', group: 'admin' },
      { id: 'admin_hr', label: 'Quản lý Nhân sự', icon: Users, section: 'admin', group: 'admin' },
      { id: 'admin_guide', label: 'Hướng dẫn/Trợ giúp', icon: HelpCircle, section: 'admin', group: 'admin' },
      
      { id: 'manage_users', label: 'Quản lý người dùng', icon: Users, section: 'admin', group: 'admin' },
      { id: 'manage_directory', label: featureSettings['manage_directory']?.customTitle || 'Quản lý thuốc', icon: Pill, section: 'data', group: 'data' },
      { id: 'manage_national_pharmacopoeia', label: featureSettings['manage_national_pharmacopoeia']?.customTitle || 'Dược thư Quốc gia', icon: BookOpen, section: 'data', group: 'data' },
      { id: 'manage_treatment_guidelines', label: featureSettings['manage_treatment_guidelines']?.customTitle || 'Hướng dẫn điều trị (BYT)', icon: Stethoscope, section: 'data', group: 'data' },
      { id: 'manage_icd10', label: featureSettings['manage_icd10']?.customTitle || 'Quản lý ICD-10', icon: ClipboardList, section: 'data', group: 'data' },
      { id: 'manage_interaction', label: featureSettings['manage_interaction']?.customTitle || 'Quản lý tương tác thuốc', icon: ShieldAlert, section: 'data', group: 'data' },
      { id: 'manage_adr', label: featureSettings['manage_adr']?.customTitle || 'Quản lý ADR', icon: AlertTriangle, section: 'data', group: 'data' },
      { id: 'manage_doc_lookup', label: featureSettings['manage_doc_lookup']?.customTitle || 'Quản lý văn bản', icon: FileText, section: 'data', group: 'data' },
    ];

    const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userRole);

    let filteredItems = allPossibleItems.filter(item => {
      const status = featureStates[item.id];
      const settings = featureSettings[item.id];
      
      // Hide if banned
      if (uid && settings?.bannedUsers?.includes(uid)) return false;
      
      // Hide if restricted role
      const allowedRoles = settings?.allowedRoles || [];
      const checkRole = isApproved ? userRole : 'unapproved';
      if (allowedRoles.length > 0 && !allowedRoles.includes(checkRole)) return false;
      
      // Hide if restricted location
      if (item.id === 'manage_interaction') {
        if (featureSettings['view_interaction']?.hiddenLocations?.includes('sidebar')) return false;
      } else if (item.id === 'manage_adr') {
        if (featureSettings['view_adr']?.hiddenLocations?.includes('sidebar')) return false;
      } else if (item.id === 'manage_doc_lookup') {
        if (featureSettings['view_doc_lookup']?.hiddenLocations?.includes('sidebar')) return false;
      } else if (item.id === 'manage_national_pharmacopoeia') {
        if (featureSettings['view_national_pharmacopoeia']?.hiddenLocations?.includes('sidebar') || featureSettings['manage_national_pharmacopoeia']?.hiddenLocations?.includes('sidebar')) return false;
      } else if (item.id === 'manage_treatment_groups' || item.id === 'manage_treatment_guidelines') {
        if (featureSettings['view_treatment_guideline']?.hiddenLocations?.includes('sidebar') || featureSettings['manage_treatment_groups']?.hiddenLocations?.includes('sidebar') || featureSettings['manage_treatment_guidelines']?.hiddenLocations?.includes('sidebar')) return false;
      } else if (settings?.hiddenLocations?.includes('sidebar')) {
        return false;
      }

      if (status === 'closed') return false;
      if (status === 'maintenance' && !isPrivileged) return false;
      
      // Strict block for unapproved users on admin/manage tabs
      if (!isApproved && (item.id.startsWith('admin_') || item.id.startsWith('manage_'))) return false;

      return allowedTabs.includes(item.id) || 
             item.id.startsWith('admin_') || 
             (userRole === 'admin' && item.id.startsWith('manage_')) ||
             (isPrivileged && (item.section === 'data' || item.group === 'data' || item.group === 'pharmacy')) ||
             (isDataMode && isApproved && (item.section === 'data' || item.group === 'data' || item.group === 'pharmacy'));
    });

    // Custom Server-side order handling
    const sortItems = (itemsList: SidebarItem[]) => {
      return [...itemsList].sort((a, b) => {
        const orderA = featureSettings[a.id]?.order ?? 999;
        const orderB = featureSettings[b.id]?.order ?? 999;
        return orderA - orderB;
      });
    };

    if (isAdminMode) {
      const adminOnly = sortItems(filteredItems.filter(item => item.section === 'admin'));
      const targetOrder = (liveNavOrder?.admin && liveNavOrder.admin.length > 0)
        ? liveNavOrder.admin
        : (() => {
            const saved = localStorage.getItem(`sidebar_order_${userRole}_admin`);
            if (saved) {
              try { return JSON.parse(saved); } catch (e) { return null; }
            }
            return null;
          })();

      if (targetOrder && Array.isArray(targetOrder)) {
        try {
          const orderIds = Array.from(new Set(targetOrder as string[]));
          const ordered = orderIds.map(id => adminOnly.find(item => item.id === id)).filter(Boolean) as SidebarItem[];
          const orderedIds = new Set(ordered.map(item => item.id));
          const missing = adminOnly.filter(item => !orderedIds.has(item.id));
          setItems([...ordered, ...missing]);
        } catch (e) { setItems(adminOnly); }
      } else { setItems(adminOnly); }
    } else if (isDataMode) {
      const dataOnly = sortItems(filteredItems.filter(item => item.section === 'data' || item.group === 'data' || item.group === 'pharmacy'));
      const targetOrder = (liveNavOrder?.data && liveNavOrder.data.length > 0)
        ? liveNavOrder.data
        : (() => {
            const saved = localStorage.getItem(`sidebar_order_${userRole}_data`);
            if (saved) {
              try { return JSON.parse(saved); } catch (e) { return null; }
            }
            return null;
          })();

      if (targetOrder && Array.isArray(targetOrder)) {
        try {
          const orderIds = Array.from(new Set(targetOrder as string[]));
          const ordered = orderIds.map(id => dataOnly.find(item => item.id === id)).filter(Boolean) as SidebarItem[];
          const orderedIds = new Set(ordered.map(item => item.id));
          const missing = dataOnly.filter(item => !orderedIds.has(item.id));
          
          let merged = [...ordered];
          missing.forEach(mItem => {
            if (mItem.id === 'manage_national_pharmacopoeia') {
              const dirIdx = merged.findIndex(i => i.id === 'manage_directory');
              if (dirIdx !== -1) {
                merged.splice(dirIdx + 1, 0, mItem);
                return;
              }
            }
            if (mItem.id === 'manage_treatment_groups' || mItem.id === 'manage_treatment_guidelines') {
              const anchorIdx = merged.findIndex(i => i.id === 'manage_national_pharmacopoeia') !== -1
                ? merged.findIndex(i => i.id === 'manage_national_pharmacopoeia')
                : merged.findIndex(i => i.id === 'manage_directory');
              if (anchorIdx !== -1) {
                merged.splice(anchorIdx + 1, 0, mItem);
                return;
              }
            }
            merged.push(mItem);
          });
          setItems(merged);
        } catch (e) { setItems(dataOnly); }
      } else { setItems(dataOnly); }
    } else {
      const generalOnly = sortItems(filteredItems.filter(item => item.section === 'member' && item.group === 'general'));
      const targetOrder = (liveNavOrder?.general && liveNavOrder.general.length > 0)
        ? liveNavOrder.general
        : (() => {
            const saved = localStorage.getItem(`sidebar_order_${userRole}_member_general`);
            if (saved) {
              try { return JSON.parse(saved); } catch (e) { return null; }
            }
            return null;
          })();

      if (targetOrder && Array.isArray(targetOrder)) {
        try {
          const orderIds = Array.from(new Set(targetOrder as string[]));
          const ordered = orderIds.map(id => generalOnly.find(item => item.id === id)).filter(Boolean) as SidebarItem[];
          const orderedIds = new Set(ordered.map(item => item.id));
          const missing = generalOnly.filter(item => !orderedIds.has(item.id));
          
          // Smart positioning for newly added tabs (e.g. view_treatment_guideline)
          let merged = [...ordered];
          missing.forEach(mItem => {
            if (mItem.id === 'view_treatment_guideline') {
              const anchorIdx = merged.findIndex(i => i.id === 'view_national_pharmacopoeia') !== -1
                ? merged.findIndex(i => i.id === 'view_national_pharmacopoeia')
                : merged.findIndex(i => i.id === 'view_directory');
              if (anchorIdx !== -1) {
                merged.splice(anchorIdx + 1, 0, mItem);
                return;
              }
            }
            merged.push(mItem);
          });
          setItems(merged);
        } catch (e) { setItems(generalOnly); }
      } else { setItems(generalOnly); }
    }
  }, [userRole, title, allowedTabs, isAdminMode, isDataMode, featureSettings, featureStates, liveNavOrder]);

  useEffect(() => {
    const handleProfileChange = (e: any) => {
      if (e.detail && e.detail.uid) {
        if (uid && e.detail.uid === uid) {
          setViewedProfileUid(null);
        } else {
          setViewedProfileUid(e.detail.uid);
        }
      } else {
        setViewedProfileUid(null);
      }
    };
    const handleResetProfile = () => {
      setViewedProfileUid(null);
    };
    window.addEventListener('social-profile-changed', handleProfileChange);
    window.addEventListener('reset-profile-view', handleResetProfile);
    return () => {
      window.removeEventListener('social-profile-changed', handleProfileChange);
      window.removeEventListener('reset-profile-view', handleResetProfile);
    };
  }, [uid]);

  useEffect(() => {
    if (activeTab !== 'view_profile') {
      setViewedProfileUid(null);
    }
  }, [activeTab]);

  const isOwnProfileActive = activeTab === 'view_profile' && (!viewedProfileUid || (!!uid && viewedProfileUid === uid));

  const handleReorder = (newOrder: SidebarItem[]) => {
    setItems(newOrder);
    const suffix = isAdminMode ? 'admin' : isDataMode ? 'data' : 'member_general';
    localStorage.setItem(`sidebar_order_${userRole}_${suffix}`, JSON.stringify(newOrder.map(i => i.id)));
  };

  const renderItem = (item: SidebarItem, idx: number, section: string = 'main') => {
    const status = featureStates[item.id];
    const isMaintenance = status === 'maintenance';
    const isClosed = status === 'closed';
    const isActive = activeTab === item.id;

    return (
      <Reorder.Item
        key={`sb-${section}-${item.id || 'item'}-${idx}`}
        value={item}
        drag={isEditMode ? "y" : false}
        layout="position"
        className={cn(
          "relative group px-1",
          isEditMode && "cursor-default"
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (isEditMode) return;
            setActiveTab(item.id, item.id === 'view_directory' || item.id === 'manage_directory');
          }}
          className={cn(
            "w-full min-h-[58px] py-1.5 px-1 rounded-lg flex flex-col items-center justify-center transition-all duration-200 overflow-hidden cursor-pointer group select-none relative text-center",
            isEditMode && "border border-dashed border-primary/30 bg-primary/5",
            isActive
              ? (isAdminMode 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-bold" 
                  : isDataMode 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold" 
                    : "bg-primary text-white shadow-md shadow-primary/25 font-bold")
              : (isDarkMode 
                  ? "text-slate-400 hover:bg-slate-800/80 hover:text-white" 
                  : isDataMode
                    ? "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                    : "text-slate-600 hover:bg-primary-light/50 hover:text-primary")
          )}
          title={item.label}
        >
          {/* Icon (trên) */}
          <div className="relative flex items-center justify-center shrink-0 mb-1">
            <item.icon
              size={19}
              className={cn(
                "transition-transform duration-200 group-hover:scale-110 shrink-0",
                isActive
                  ? "text-white"
                  : cn(
                      isDarkMode ? "text-slate-400" : "text-slate-500",
                      isAdminMode ? "group-hover:text-indigo-400" : isDataMode ? "group-hover:text-emerald-500" : "group-hover:text-primary"
                    )
              )}
            />
            {isMaintenance && !isAdminMode && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" title="Bảo trì" />
            )}
            {isClosed && !isAdminMode && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" title="Đóng" />
            )}
          </div>

          {/* Tên (dưới) */}
          <span
            className={cn(
              "text-[9.5px] leading-[11.5px] font-semibold text-center line-clamp-2 break-words max-w-[62px] tracking-tight transition-colors",
              isActive
                ? "text-white font-bold"
                : isDarkMode
                  ? "text-slate-300 group-hover:text-white"
                  : "text-slate-600 group-hover:text-slate-900"
            )}
          >
            {item.label}
          </span>

          {isEditMode && (
            <div className="absolute top-1 right-1 opacity-70 cursor-grab active:cursor-grabbing p-0.5">
              <GripVertical size={11} className={isActive ? "text-white" : "text-primary"} />
            </div>
          )}
        </button>
      </Reorder.Item>
    );
  };

  return (
    <aside 
      style={{ width: '72.3333px' }}
      className={cn(
        "h-[100dvh] max-h-[100dvh] hidden lg:flex flex-col fixed left-0 top-0 shadow-xl border-r transition-all duration-300 z-50 translate-x-0 w-[72.3333px]",
        isAdminMode 
          ? (isDarkMode ? "bg-slate-950 border-indigo-900/30 text-white" : "bg-white border-indigo-100 text-slate-900")
          : isDataMode 
            ? (isDarkMode ? "bg-slate-950 border-emerald-900/30 text-white" : "bg-white border-emerald-100 text-slate-900")
            : (isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900")
      )}
    >
      <div className={cn(
        "border-b relative p-1.5 transition-all duration-300", 
        isDarkMode ? "border-slate-800" : "border-slate-100"
      )}>
        {isAdminMode && setIsAdminMode && (
          <div className="py-2 px-1 flex justify-center">
            <button 
              type="button"
              onClick={() => {
                setIsAdminMode(false);
                setActiveTab('dashboard');
              }}
              className={cn(
                "rounded-lg border flex flex-col items-center justify-center transition-all duration-200 group/back py-1.5 px-1 w-full min-h-[54px] cursor-pointer text-center",
                isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              )}
              title="Thoát AdminCP"
            >
              <div className="p-1 bg-rose-500 text-white rounded-lg shadow-xs group-hover/back:scale-110 transition-transform shrink-0 mb-1">
                <ArrowLeftCircle size={16} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 text-center leading-tight">
                Thoát
              </span>
            </button>
          </div>
        )}

        {isDataMode && setIsDataMode && (
          <div className="py-2 px-1 flex justify-center">
            <button 
              type="button"
              onClick={() => {
                setIsDataMode(false);
                setActiveTab('dashboard');
              }}
              className={cn(
                "rounded-lg border flex flex-col items-center justify-center transition-all duration-200 group/back py-1.5 px-1 w-full min-h-[54px] cursor-pointer text-center",
                isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              )}
              title="Thoát Quản lý Dữ liệu"
            >
              <div className="p-1 bg-emerald-500 text-white rounded-lg shadow-xs group-hover/back:scale-110 transition-transform shrink-0 mb-1">
                <ArrowLeftCircle size={16} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 text-center leading-tight">
                Thoát
              </span>
            </button>
          </div>
        )}

        {/* Profile Card Header (Chỉ hiển thị khi KHÔNG ở AdminCP và KHÔNG ở DataMode) */}
        {!isAdminMode && !isDataMode && (
          <div className="py-2 px-1 flex justify-center">
            <button 
              type="button"
              onClick={() => {
                setActiveTab('view_profile');
                setViewedProfileUid(null);
                window.dispatchEvent(new CustomEvent('reset-profile-view'));
              }}
              className={cn(
                "flex flex-col items-center justify-center w-full py-1.5 px-1 rounded-lg transition-all duration-200 group/profile cursor-pointer text-center select-none",
                isOwnProfileActive
                  ? (isDarkMode ? "bg-primary/20 ring-1 ring-primary text-white" : "bg-primary/10 ring-1 ring-primary text-primary")
                  : (isDarkMode ? "hover:bg-slate-800/80 text-slate-300" : "hover:bg-slate-100 text-slate-700")
              )}
              title={`${displayName}${title ? ` • ${title}` : ''}${department ? ` • ${department}` : ''} (Nhấn để xem hồ sơ)`}
            >
              <div className="relative mb-1">
                {photoURL ? (
                  <img 
                    src={getBustedPhotoURL(photoURL, photoSyncToken)} 
                    alt={displayName} 
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover group-hover/profile:scale-105 transition-transform duration-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-2 border-white dark:border-slate-800 shadow-sm group-hover/profile:scale-105 transition-transform duration-200">
                    {displayName ? displayName.charAt(0).toUpperCase() : <Users size={18} />}
                  </div>
                )}
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 absolute bottom-0 right-0 shadow-xs ring-1 ring-emerald-400/40" />
              </div>
              <span className={cn(
                "text-[9.5px] font-bold leading-tight line-clamp-1 truncate max-w-[62px] tracking-tight",
                isOwnProfileActive
                  ? "text-primary dark:text-blue-400 font-black"
                  : isDarkMode ? "text-slate-300 group-hover/profile:text-white" : "text-slate-700 group-hover/profile:text-slate-900"
              )}>
                {displayName ? displayName.trim().split(' ').slice(-1)[0] : 'Hồ sơ'}
              </span>
            </button>
          </div>
        )}
      </div>
      
      <div 
        style={{ width: '72.3333px' }}
        className="flex-1 overflow-y-auto no-scrollbar py-2 px-1 w-[72.3333px]"
      >
        <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-1">
          {items.map((item, idx) => renderItem(item, idx, isAdminMode ? 'admin' : isDataMode ? 'data' : 'general'))}
        </Reorder.Group>
      </div>

      <div className={cn(
        "border-t p-1.5 space-y-1.5 shrink-0",
        isDarkMode ? "border-slate-800" : "border-slate-100"
      )}>
        {/* User Guide ("Hỗ trợ sử dụng") Card */}
        <div 
          id="sidebar-user-guide-card"
          onClick={onOpenUserGuide}
          className={cn(
            "rounded-lg border transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center py-1.5 px-1 w-full text-center relative overflow-hidden select-none min-h-[50px]",
            isDarkMode 
              ? "bg-slate-900/40 hover:bg-slate-900/80 border-slate-800 text-white" 
              : "bg-indigo-50/40 hover:bg-indigo-50/70 border-indigo-100/30 text-slate-900"
          )}
          title="Hỗ trợ sử dụng - Xem hướng dẫn hệ thống"
        >
          <HelpCircle size={18} className="text-primary group-hover:scale-110 transition-transform mb-0.5 shrink-0" />
          <span className="text-[9.5px] font-semibold text-slate-600 dark:text-slate-300 group-hover:text-primary leading-tight line-clamp-1 truncate max-w-[62px]">
            Hướng dẫn
          </span>
        </div>

        <button 
          type="button"
          onClick={() => {
            if (isAdminMode || activeTab.startsWith('admin_')) {
              setActiveTab('admin_version');
            } else {
              window.dispatchEvent(new CustomEvent('open-whats-new'));
            }
          }}
          className={cn(
            "rounded-lg font-bold flex flex-col items-center justify-center transition-all duration-200 overflow-hidden cursor-pointer group py-1.5 px-1 w-full text-center border min-h-[48px] select-none",
            activeTab === 'admin_version' 
              ? "bg-primary/10 text-primary border border-primary/20"
              : isDarkMode 
                ? "text-slate-400 bg-slate-900/50 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800/50" 
                : "text-slate-500 bg-white border border-slate-100 shadow-xs hover:bg-slate-50 hover:text-slate-900"
          )}
          title={
            (isAdminMode || activeTab.startsWith('admin_'))
              ? "Chỉnh sửa & quản lý thông tin phiên bản"
              : `Phiên bản ${latestVersion?.versionName || 'v1.0.0'} - Nhấn để xem Có gì mới`
          }
        >
          <History size={16} className="shrink-0 transition-transform group-hover:scale-110 text-primary mb-0.5" />
          <span className="text-[8.5px] font-mono font-black text-slate-500 dark:text-slate-400 group-hover:text-primary leading-tight tracking-tighter truncate max-w-[60px]">
            {latestVersion?.versionName ? (latestVersion.versionName.startsWith('v') ? latestVersion.versionName : `v${latestVersion.versionName}`) : 'v1.0.0'}
          </span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
