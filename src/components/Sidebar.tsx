import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, FileText, History, LayoutDashboard, LayoutGrid, Pill, ClipboardList, Settings, Users, AlertTriangle, MessageSquare, GripVertical, X, Briefcase, Calendar, Activity, Globe, Award, ShieldCheck, GraduationCap, Lock, LogOut, Sun } from 'lucide-react';
import { cn, getBustedPhotoURL } from '../lib/utils';
import { Reorder } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'admin' | 'operator' | 'operator_doctor' | 'operator_pharmacist' | 'member';
  displayName: string;
  title?: string;
  photoURL?: string;
  photoSyncToken?: string;
  isDarkMode?: boolean;
  allowedTabs: string[];
  isEditMode: boolean;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isAdminMode?: boolean;
  setIsAdminMode?: (val: boolean) => void;
  appName: string;
  featureStates?: Record<string, 'open' | 'closed' | 'maintenance'>;
  featureSettings?: Record<string, any>;
  uid?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  section: 'member' | 'admin';
  group?: 'general' | 'pharmacy' | 'admin';
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userRole, 
  displayName, 
  title, 
  photoURL, 
  photoSyncToken,
  isDarkMode, 
  allowedTabs, 
  isEditMode, 
  isOpen, 
  setIsOpen, 
  isAdminMode,
  setIsAdminMode,
  appName,
  featureStates = {},
  featureSettings = {},
  uid
}) => {
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [pharmacyItems, setPharmacyItems] = useState<SidebarItem[]>([]);

  useEffect(() => {
    const allPossibleItems: SidebarItem[] = [
      { id: 'dashboard', label: featureSettings['dashboard']?.customTitle || 'Tổng quan', icon: LayoutDashboard, section: 'member', group: 'general' },
      { id: 'view_calendar', label: featureSettings['view_calendar']?.customTitle || 'Lịch công tác', icon: Calendar, section: 'member', group: 'general' },
      { id: 'view_notes', label: featureSettings['view_notes']?.customTitle || 'Ghi chú', icon: MessageSquare, section: 'member', group: 'general' },
      { id: 'view_directory', label: featureSettings['view_directory']?.customTitle || 'Tra cứu thuốc', icon: Pill, section: 'member', group: 'general' },
      { id: 'view_icd10', label: featureSettings['view_icd10']?.customTitle || 'Tra cứu ICD-10', icon: ClipboardList, section: 'member', group: 'general' },
      { id: 'view_interaction', label: featureSettings['view_interaction']?.customTitle || 'Tương tác thuốc', icon: ShieldAlert, section: 'member', group: 'general' },
      { id: 'view_adr', label: featureSettings['view_adr']?.customTitle || 'Tra cứu ADR', icon: AlertTriangle, section: 'member', group: 'general' },
      { id: 'view_prescription', label: featureSettings['view_prescription']?.customTitle || 'Kê toa thử', icon: FileText, section: 'member', group: 'general' },
      { id: 'view_social', label: featureSettings['view_social']?.customTitle || 'Mạng xã hội', icon: MessageSquare, section: 'member', group: 'general' },
      
      { id: 'admin_home', label: 'Trang chủ Admin', icon: LayoutGrid, section: 'admin', group: 'admin' },
      { id: 'admin_general', label: 'Cài đặt chung', icon: Globe, section: 'admin', group: 'admin' },
      { id: 'admin_theme', label: 'Quản lý Giao diện', icon: Sun, section: 'admin', group: 'admin' },
      { id: 'admin_titles', label: 'Quản lý Chức danh', icon: Award, section: 'admin', group: 'admin' },
      { id: 'admin_positions', label: 'Quản lý Chức vụ', icon: Briefcase, section: 'admin', group: 'admin' },
      { id: 'admin_specialties', label: 'Quản lý Chuyên khoa', icon: GraduationCap, section: 'admin', group: 'admin' },
      { id: 'admin_roles', label: 'Quản lý Nhóm quyền', icon: ShieldCheck, section: 'admin', group: 'admin' },
      { id: 'admin_permissions', label: 'Phân quyền hệ thống', icon: Lock, section: 'admin', group: 'admin' },
      
      { id: 'manage_users', label: 'Quản lý người dùng', icon: Users, section: 'admin', group: 'admin' },
      { id: 'manage_staff', label: 'Quản lý nhân sự', icon: Briefcase, section: 'admin', group: 'admin' },
      { id: 'manage_directory', label: featureSettings['manage_directory']?.customTitle || 'Quản lý thuốc', icon: Pill, section: 'member', group: 'pharmacy' },
      { id: 'manage_icd10', label: featureSettings['manage_icd10']?.customTitle || 'Quản lý ICD-10', icon: ClipboardList, section: 'member', group: 'pharmacy' },
      { id: 'manage_interaction', label: featureSettings['manage_interaction']?.customTitle || 'Quản lý tương tác thuốc', icon: ShieldAlert, section: 'member', group: 'pharmacy' },
      { id: 'manage_adr', label: featureSettings['manage_adr']?.customTitle || 'Quản lý ADR', icon: AlertTriangle, section: 'member', group: 'pharmacy' },
    ];

    const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userRole);

    let filteredItems = allPossibleItems.filter(item => {
      const status = featureStates[item.id];
      const settings = featureSettings[item.id];
      
      // Hide if banned
      if (uid && settings?.bannedUsers?.includes(uid)) return false;
      
      // Hide if restricted role
      const allowedRoles = settings?.allowedRoles || [];
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) return false;
      
      // Hide if restricted location
      // manage_interaction follows view_interaction's sidebar setting (linked features)
      // manage_adr follows view_adr's sidebar setting (linked features)
      if (item.id === 'manage_interaction') {
        if (featureSettings['view_interaction']?.hiddenLocations?.includes('sidebar')) return false;
      } else if (item.id === 'manage_adr') {
        if (featureSettings['view_adr']?.hiddenLocations?.includes('sidebar')) return false;
      } else if (settings?.hiddenLocations?.includes('sidebar')) {
        return false;
      }

      if (status === 'closed') return false;
      if (status === 'maintenance' && !isPrivileged) return false;
      return allowedTabs.includes(item.id) || item.id.startsWith('admin_');
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
      const savedOrder = localStorage.getItem(`sidebar_order_${userRole}_admin`);
      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder) as string[];
          const ordered = orderIds.map(id => adminOnly.find(item => item.id === id)).filter(Boolean) as SidebarItem[];
          const missing = adminOnly.filter(item => !orderIds.includes(item.id));
          setItems([...ordered, ...missing]);
        } catch (e) { setItems(adminOnly); }
      } else { setItems(adminOnly); }
    } else {
      const generalOnly = sortItems(filteredItems.filter(item => item.section === 'member' && item.group === 'general'));
      const pharmacyOnly = sortItems(filteredItems.filter(item => item.section === 'member' && item.group === 'pharmacy'));

      // Handle general items order
      const savedGeneralOrder = localStorage.getItem(`sidebar_order_${userRole}_member_general`);
      if (savedGeneralOrder) {
        try {
          const orderIds = JSON.parse(savedGeneralOrder) as string[];
          const ordered = orderIds.map(id => generalOnly.find(item => item.id === id)).filter(Boolean) as SidebarItem[];
          const missing = generalOnly.filter(item => !orderIds.includes(item.id));
          setItems([...ordered, ...missing]);
        } catch (e) { setItems(generalOnly); }
      } else { setItems(generalOnly); }

      // Handle pharmacy items order
      const savedPharmacyOrder = localStorage.getItem(`sidebar_order_${userRole}_member_pharmacy`);
      if (savedPharmacyOrder) {
        try {
          const orderIds = JSON.parse(savedPharmacyOrder) as string[];
          const ordered = orderIds.map(id => pharmacyOnly.find(item => item.id === id)).filter(Boolean) as SidebarItem[];
          const missing = pharmacyOnly.filter(item => !orderIds.includes(item.id));
          setPharmacyItems([...ordered, ...missing]);
        } catch (e) { setPharmacyItems(pharmacyOnly); }
      } else { setPharmacyItems(pharmacyOnly); }
    }
  }, [userRole, title, allowedTabs, isAdminMode, featureSettings, featureStates]);

  const handleReorder = (newOrder: SidebarItem[]) => {
    setItems(newOrder);
    const suffix = isAdminMode ? 'admin' : 'member_general';
    localStorage.setItem(`sidebar_order_${userRole}_${suffix}`, JSON.stringify(newOrder.map(i => i.id)));
  };

  const handleReorderPharmacy = (newOrder: SidebarItem[]) => {
    setPharmacyItems(newOrder);
    localStorage.setItem(`sidebar_order_${userRole}_member_pharmacy`, JSON.stringify(newOrder.map(i => i.id)));
  };

  const renderItem = (item: SidebarItem) => {
    const status = featureStates[item.id];
    const isMaintenance = status === 'maintenance';
    const isClosed = status === 'closed';

    return (
      <Reorder.Item
        key={item.id}
        value={item}
        drag={isEditMode ? "y" : false}
        className={cn(
          "relative group",
          isEditMode && "cursor-default"
        )}
      >
        <button
          onClick={() => !isEditMode && setActiveTab(item.id)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200",
            isEditMode && "border border-dashed border-primary/30 bg-primary/5",
            activeTab === item.id 
              ? (isAdminMode ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : 
                "bg-primary text-white shadow-lg shadow-primary/20")
              : (isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-primary-light/50 hover:text-primary")
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <item.icon size={16} className={cn(
              "transition-colors shrink-0",
              activeTab === item.id ? "text-white" : cn(isDarkMode ? "text-slate-500" : "text-slate-400", 
                isAdminMode ? "group-hover:text-indigo-400" : "group-hover:text-primary")
            )} />
            <span className="font-bold text-xs truncate">{item.label}</span>
          </div>
          
          {isMaintenance && !isAdminMode && (
            <div className="px-1.5 py-0.5 rounded-md bg-amber-500 text-[8px] font-black text-white uppercase tracking-tighter">
              Bảo trì
            </div>
          )}

          {isClosed && !isAdminMode && (
            <div className="px-1.5 py-0.5 rounded-md bg-rose-500 text-[8px] font-black text-white uppercase tracking-tighter">
              Đóng
            </div>
          )}

          {isEditMode && (
            <div className="opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1">
              <GripVertical size={14} className="text-primary" />
            </div>
          )}
        </button>
      </Reorder.Item>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/60 z-40 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <div className={cn(
        "w-[260px] h-screen flex flex-col fixed left-0 top-0 shadow-xl border-r transition-all duration-300 z-50 lg:translate-x-0",
        isAdminMode 
          ? (isDarkMode ? "bg-slate-950 border-indigo-900/30 text-white" : "bg-white border-indigo-100 text-slate-900")
          : (isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"),
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn("p-3 border-b relative", isDarkMode ? "border-slate-800" : "border-slate-100")}>
          <button 
            onClick={() => setIsOpen(false)}
            className={cn(
              "lg:hidden absolute top-2 right-2 p-1.5 rounded-lg transition-colors z-10",
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
            )}
          >
            <X size={18} className="text-slate-400" />
          </button>

          {isAdminMode && setIsAdminMode && (
            <button 
              onClick={() => {
                setIsAdminMode(false);
                setActiveTab('dashboard');
              }}
              className={cn(
                "w-full p-2 rounded-lg border flex items-center gap-2 transition-all group/back mb-3",
                isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              )}
            >
              <div className="p-1.5 bg-rose-500 text-white rounded-md shadow-sm group-hover/back:scale-110 transition-transform">
                <LogOut size={12} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Thoát AdminCP</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab('view_profile')}
            className={cn(
              "w-full p-2 rounded-lg border flex items-center gap-2 transition-all group/profile mb-2",
              activeTab === 'view_profile'
                ? (isDarkMode ? "bg-primary/20 border-primary/50" : "bg-primary/5 border-primary/20")
                : (isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 shadow-sm hover:border-slate-200")
            )}
          >
            {photoURL ? (
              <img 
                src={getBustedPhotoURL(photoURL, photoSyncToken)} 
                alt={displayName} 
                className={cn("w-7 h-7 rounded-full border-2 shadow-sm transition-transform group-hover/profile:scale-110", isDarkMode ? "border-slate-800" : "border-white")}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover/profile:scale-110", isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-400 shadow-sm")}>
                <Users size={14} />
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider truncate">
                {title || (userRole === 'admin' ? 'Quản trị viên' : 'Thành viên')}
              </p>
              <p className={cn("text-[11px] font-bold truncate transition-colors", 
                activeTab === 'view_profile' ? "text-primary" : (isDarkMode ? "text-slate-200" : "text-slate-900")
              )}>
                {displayName}
              </p>
            </div>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-6 mt-2">
          <div>
            <div className="px-2 mb-2 flex items-center gap-2">
              <div className={cn(
                "h-px flex-1", 
                isAdminMode 
                  ? (isDarkMode ? "bg-indigo-900/30" : "bg-indigo-200/50") 
                  : (isDarkMode ? "bg-slate-800" : "bg-slate-200")
              )} />
              <p className={cn(
                "text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap",
                isAdminMode 
                  ? (isDarkMode ? "text-indigo-400" : "text-indigo-500") 
                  : (isDarkMode ? "text-slate-500" : "text-slate-400")
              )}>
                {isAdminMode ? "Admin Control Panel" : "Tính năng của nhân viên"}
              </p>
              <div className={cn(
                "h-px flex-1", 
                isAdminMode 
                  ? (isDarkMode ? "bg-indigo-900/30" : "bg-indigo-200/50") 
                  : (isDarkMode ? "bg-slate-800" : "bg-slate-200")
              )} />
            </div>
            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-0.5">
              {items.map(renderItem)}
            </Reorder.Group>
          </div>

          {!isAdminMode && pharmacyItems.length > 0 && (
            <div>
              <div className="px-2 mb-2 flex items-center gap-2">
                <div className={cn("h-px flex-1", isDarkMode ? "bg-slate-800" : "bg-slate-200")} />
                <p className={cn(
                  "text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>
                  - Dược - Vật tư, thiết bị y tế -
                </p>
                <div className={cn("h-px flex-1", isDarkMode ? "bg-slate-800" : "bg-slate-200")} />
              </div>
              <Reorder.Group axis="y" values={pharmacyItems} onReorder={handleReorderPharmacy} className="space-y-0.5">
                {pharmacyItems.map(renderItem)}
              </Reorder.Group>
            </div>
          )}
        </div>

        <div className={cn("p-2 border-t", isDarkMode ? "border-slate-800" : "border-slate-100")}>
          <div className={cn(
            "px-2 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-2 transition-colors",
            isDarkMode ? "text-slate-500 bg-slate-900/50" : "text-slate-400 bg-white border border-slate-100 shadow-sm"
          )}>
            <MessageSquare size={10} className="text-primary" />
            <span>Zalo: 093.262.10.28 (DS. Bảo)</span>
          </div>
        </div>

      </div>
    </>
  );
};

export default Sidebar;
