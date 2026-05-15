import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Pill, ShieldAlert, FileText, Users, TrendingUp, Calendar, ArrowUpRight, ClipboardList, AlertTriangle, Settings, GripVertical, Layout, RotateCcw, MessageSquare, AlertCircle, ShieldCheck, Zap, Bell, Globe, Eye, EyeOff, Search, PinOff, Calculator, ListTodo, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { db, auth, collection, getDocs, handleFirestoreError, OperationType, onSnapshot, query, where, updateDoc, doc } from '../firebase';
import { UserProfile, Notification, ICD10, Drug } from '../types';
import DrugDetailModal from './DrugDetailModal';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  userRole: string;
  isApproved: boolean;
  isDarkMode?: boolean;
  allowedTabs: string[];
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  userProfile?: UserProfile;
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  featureStates?: Record<string, string>;
  featureSettings?: Record<string, any>;
  uid?: string;
  onLogout?: () => void;
  setExternalIcdSearchQuery?: (query: string | null) => void;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
  isDarkMode?: boolean;
  className?: string;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, isEditMode, isDarkMode, className }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isEditMode && "cursor-default",
        className
      )}
    >
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-lg shadow-sm border cursor-grab active:cursor-grabbing z-20 opacity-0 group-hover:opacity-100 transition-opacity",
            isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-slate-200"
          )}
        >
          <GripVertical size={14} className="text-slate-500" />
        </div>
      )}
      {children}
    </div>
  );
};

const CalculatorWidget = lazy(() => import('./Calculator'));
const TodoWidget = lazy(() => import('./TodoList'));

// Dashboard for clinical workspace
const Dashboard: React.FC<DashboardProps> = ({
  setActiveTab,
  userRole,
  isApproved,
  isDarkMode,
  allowedTabs,
  isEditMode,
  setIsEditMode,
  userProfile,
  notifications = [],
  onMarkAsRead,
  featureStates = {},
  featureSettings = {},
  uid,
  onLogout,
  setExternalIcdSearchQuery,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [quickDrugModal, setQuickDrugModal] = useState<{ drug: Drug | null; isOpen: boolean }>({
    drug: null,
    isOpen: false,
  });

  const handleOpenDrugModal = async (drugName: string) => {
    try {
      const q = query(collection(db, 'drugs'), where('name', '==', drugName));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as Drug;
        setQuickDrugModal({ drug: data, isOpen: true });
      }
    } catch (e) {
      console.error('Failed to load drug:', e);
    }
  };

  const allActions = [
    { id: 'view_directory', label: featureSettings['view_directory']?.customTitle || 'Tra cứu thuốc', icon: Pill, desc: 'Tra cứu thông tin thuốc và tương tác', color: 'bg-indigo-500', group: 'clinical' },
    { id: 'view_interaction', label: featureSettings['view_interaction']?.customTitle || 'Tương tác thuốc', icon: ShieldAlert, desc: 'Kiểm tra tương tác thuốc chuyên sâu', color: 'bg-orange-500', group: 'clinical' },
    { id: 'view_prescription', label: featureSettings['view_prescription']?.customTitle || 'Kê toa mới', icon: FileText, desc: 'Tạo đơn thuốc cho bệnh nhân', color: 'bg-primary', group: 'clinical' },
    { id: 'view_icd10', label: featureSettings['view_icd10']?.customTitle || 'Tra cứu ICD-10', icon: ClipboardList, desc: 'Tra cứu mã bệnh quốc tế', color: 'bg-cyan-600', group: 'clinical' },
    { id: 'view_patients', label: featureSettings['view_patients']?.customTitle || 'Tra cứu bệnh nhân', icon: Users, desc: 'Hồ sơ và quản lý dữ liệu bệnh nhân', color: 'bg-emerald-600', group: 'clinical' },
    { id: 'view_adr', label: featureSettings['view_adr']?.customTitle || 'Báo cáo ADR', icon: AlertTriangle, desc: 'Báo cáo phản ứng có hại', color: 'bg-rose-600', group: 'clinical' },

    { id: 'view_calendar', label: featureSettings['view_calendar']?.customTitle || 'Lịch công tác', icon: Calendar, desc: 'Quản lý lịch trực, hội chẩn', color: 'bg-blue-600', group: 'management' },
    { id: 'view_notes', label: featureSettings['view_notes']?.customTitle || 'Ghi chú', icon: MessageSquare, desc: 'Ghi chú lâm sàng cá nhân', color: 'bg-violet-600', group: 'management' },
    { id: 'view_todo', label: featureSettings['view_todo']?.customTitle || 'Việc cần làm', icon: ListTodo, desc: 'Danh sách công việc cần làm', color: 'bg-emerald-500', group: 'utility' },
    { id: 'view_social', label: featureSettings['view_social']?.customTitle || 'Workspace Social', icon: Globe, desc: 'Trao đổi chuyên môn nội bộ', color: 'bg-pink-600', group: 'social' },
    { id: 'view_calculator', label: featureSettings['view_calculator']?.customTitle || 'Máy tính', icon: Calculator, desc: 'Máy tính liều lượng & cân nặng', color: 'bg-slate-700', group: 'utility' },
  ];

  const [quickActions, setQuickActions] = useState<any[]>([]);
  const [workspaceIcds, setWorkspaceIcds] = useState<ICD10[]>([]);
  const [drugsByIcd, setDrugsByIcd] = useState<Record<string, string[]>>({});
  const [showUtilityDrawer, setShowUtilityDrawer] = useState(false);

  useEffect(() => {
    if (!isApproved) return;
    const unsubscribe = onSnapshot(collection(db, 'drugs'), (snapshot) => {
      const map: Record<string, string[]> = {};
      snapshot.docs.forEach(doc => {
        const drug = doc.data();
        const codes = new Set<string>();

        // Check indications for ICD-10 codes
        if (drug.indications && Array.isArray(drug.indications)) {
          drug.indications.forEach((ind: any) => {
            if (ind.icd10s && Array.isArray(ind.icd10s)) {
              ind.icd10s.forEach((icdItem: string) => {
                if (icdItem && typeof icdItem === 'string') {
                  const codeOnly = icdItem.split(' - ')[0].trim().toUpperCase();
                  if (codeOnly) codes.add(codeOnly);
                }
              });
            }
          });
        }

        // Keep legacy check just in case
        if (drug.icdCodes && Array.isArray(drug.icdCodes)) {
          drug.icdCodes.forEach((code: string) => {
            if (code) codes.add(code.trim().toUpperCase());
          });
        }

        codes.forEach(code => {
          if (!map[code]) map[code] = [];
          if (!map[code].includes(drug.name)) {
            map[code].push(drug.name);
          }
        });
      });
      setDrugsByIcd(map);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'drugs_mapping');
    });
    return () => unsubscribe();
  }, [isApproved]);

  useEffect(() => {
    if (!isApproved || !uid || !userProfile?.workspaceIcdCodes || userProfile.workspaceIcdCodes.length === 0) {
      setWorkspaceIcds([]);
      return;
    }

    // Fetch the actual ICD-10 details for the codes in userProfile.workspaceIcdCodes
    const q = query(
      collection(db, 'icd10'),
      where('code', 'in', userProfile.workspaceIcdCodes.slice(0, 10)) // Firestore 'in' limit is 10
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as ICD10);
      setWorkspaceIcds(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'icd10_workspace');
    });
    return () => unsubscribe();
  }, [isApproved, uid, userProfile?.workspaceIcdCodes]);

  useEffect(() => {
    const isPrivileged = ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userRole);
    const savedActionsOrder = localStorage.getItem('dashboard_actions_order');
    const order = savedActionsOrder ? JSON.parse(savedActionsOrder) : [];

    const filtered = allActions.filter(action => {
      const status = featureStates[action.id];
      const settings = featureSettings[action.id];

      // Hide if banned
      if (uid && settings?.bannedUsers?.includes(uid)) return false;

      // Hide if restricted role
      const allowedRoles = settings?.allowedRoles || [];
      const checkRole = isApproved ? userRole : 'unapproved';
      
      // Allow if no role restrictions, OR if the effective role is allowed
      const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(checkRole);
      if (!roleAllowed) return false;

      // Hide if restricted location
      if (settings?.hiddenLocations?.includes('home_grid')) return false;

      const isVisible = status !== 'closed' && (status !== 'maintenance' || isPrivileged);
      const isManageTab = action.id.startsWith('manage_');
      if (!isApproved && isManageTab) return false;
      
      return isVisible && allowedTabs.includes(action.id);
    });

    // Sort by Firestore order first, then apply local storage overrides if any
    filtered.sort((a, b) => {
      const orderA = featureSettings[a.id]?.order ?? 999;
      const orderB = featureSettings[b.id]?.order ?? 999;
      return orderA - orderB;
    });

    if (order.length > 0) {
      filtered.sort((a, b) => {
        const indexA = order.indexOf(a.id);
        const indexB = order.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    setQuickActions(filtered);
  }, [allowedTabs, featureStates, featureSettings, userRole, uid]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);



  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );



  const handleDragEndActions = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuickActions((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('dashboard_actions_order', JSON.stringify(newItems.map((i: any) => i.id)));
        return newItems;
      });
    }
  };

  const resetLayout = () => {
    localStorage.removeItem('dashboard_actions_order');
    window.location.reload();
  };

  const handleToggleActionVisibility = async (actionId: string) => {
    if (!uid) return;
    try {
      const currentHidden = userProfile?.hiddenQuickActions || [];
      const newHidden = currentHidden.includes(actionId)
        ? currentHidden.filter(id => id !== actionId)
        : [...currentHidden, actionId];

      await updateDoc(doc(db, 'users', uid), {
        hiddenQuickActions: newHidden
      });
    } catch (error) {
      console.error("Error updating action visibility:", error);
    }
  };

  const hiddenActions = userProfile?.hiddenQuickActions || [];
  const activeActions = quickActions.filter(a => !hiddenActions.includes(a.id));

  // Separate actions based on their configuration in Admin settings
  const mainActions = activeActions.filter(a => !(featureSettings[a.id]?.hiddenLocations || []).includes('home_grid'));
  const utilityWidgets = activeActions.filter(a => (featureSettings[a.id]?.hiddenLocations || []).includes('utilities_box'));

  // Filter out actions that are maintenance or closed for the customization list too
  const configurableActions = allActions.filter(action => {
    const status = featureStates[action.id];
    return status !== 'closed' && status !== 'maintenance';
  });

  const clinicalActions = mainActions.filter(a => a.group === 'clinical');
  const managementActions = mainActions.filter(a => a.group !== 'clinical');

  if (!isApproved) {
    return (
      <div className={cn(
        "min-h-[calc(100vh-80px)] flex items-center justify-center p-4 lg:p-8 transition-colors",
        isDarkMode ? "bg-slate-950" : "bg-slate-50/50"
      )}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "w-full max-w-2xl p-6 lg:p-12 rounded-[32px] lg:rounded-[48px] border shadow-2xl transition-all relative overflow-hidden",
            isDarkMode ? "bg-slate-900 border-slate-800 shadow-none" : "bg-white border-slate-100 shadow-slate-200/40"
          )}
        >
          {/* Background Decorative Elements */}
          <div className={cn(
            "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20",
            isDarkMode ? "bg-amber-500" : "bg-amber-200"
          )} />
          <div className={cn(
            "absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10",
            isDarkMode ? "bg-primary" : "bg-primary-light"
          )} />

          <div className="relative z-10 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={cn(
                "w-20 h-20 lg:w-24 lg:h-24 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-xl transition-colors",
                isDarkMode ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-100 shadow-amber-100/50"
              )}
            >
              <ShieldAlert size={40} />
            </motion.div>

            <h2 className={cn(
              "text-2xl lg:text-4xl font-black tracking-tight mb-4 transition-colors",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>Tài khoản đang chờ phê duyệt</h2>

            <p className={cn(
              "text-sm lg:text-lg font-medium max-w-lg mx-auto leading-relaxed transition-colors mb-10",
              isDarkMode ? "text-slate-400" : "text-slate-500"
            )}>
              Chào mừng <strong>{auth.currentUser?.displayName}</strong>! Tài khoản của bạn đã được đăng ký thành công.
              Vui lòng liên hệ Quản trị viên để được phê duyệt và cấp quyền truy cập.
            </p>

            <div className="grid grid-cols-1 gap-3 mb-10">
              <div className={cn(
                "px-5 py-4 rounded-2xl border flex items-center justify-between transition-colors group",
                isDarkMode ? "bg-slate-800/50 border-slate-700 hover:border-slate-600" : "bg-slate-50 border-slate-100 hover:border-slate-200"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", isDarkMode ? "bg-slate-700" : "bg-white shadow-sm")}>
                    <Users size={16} className="text-slate-400" />
                  </div>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", isDarkMode ? "text-slate-500" : "text-slate-400")}>Vai trò:</span>
                </div>
                <span className={cn("font-black text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                  {userRole === 'admin' ? 'Quản trị viên' : (userRole === 'operator_doctor' ? 'Điều hành (Bác sĩ)' : (userRole === 'operator_pharmacist' ? 'Điều hành (Dược sĩ)' : (userRole === 'operator' ? 'Điều hành' : 'Thành viên')))}
                </span>
              </div>

              <div className={cn(
                "px-5 py-4 rounded-2xl border flex items-center justify-between transition-colors group",
                isDarkMode ? "bg-slate-800/50 border-slate-700 hover:border-slate-600" : "bg-slate-50 border-slate-100 hover:border-slate-200"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", isDarkMode ? "bg-slate-700" : "bg-white shadow-sm")}>
                    <Bell size={16} className="text-slate-400" />
                  </div>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", isDarkMode ? "text-slate-500" : "text-slate-400")}>Trạng thái:</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-500 font-black text-sm">Đang chờ xử lý</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={cn(
                "p-6 rounded-3xl border flex flex-col items-center gap-4 transition-colors",
                isDarkMode ? "bg-primary/5 border-primary/10" : "bg-primary/5 border-primary/10"
              )}>
                <p className={cn("text-xs font-black uppercase tracking-[0.2em] transition-colors", isDarkMode ? "text-primary" : "text-primary")}>
                  Liên hệ phê duyệt nhanh
                </p>
                <a
                  href="https://zalo.me/0932621028"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "w-full py-4 rounded-2xl text-sm font-black transition-all shadow-xl flex items-center justify-center gap-3 group",
                    isDarkMode ? "bg-primary text-white shadow-primary/20 hover:bg-primary/90" : "bg-primary text-white shadow-primary/20 hover:bg-primary/90"
                  )}
                >
                  <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                  093.262.10.28 (DS. Bảo)
                </a>
              </div>

              <button
                onClick={onLogout || (() => auth.signOut())}
                className={cn(
                  "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2",
                  isDarkMode ? "border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-white" : "border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                )}
              >
                Đăng xuất tài khoản
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Chào buổi sáng';
    if (hour >= 11 && hour < 14) greeting = 'Chào buổi trưa';
    else if (hour >= 14 && hour < 18) greeting = 'Chào buổi chiều';
    else if (hour >= 18 || hour < 4) greeting = 'Chào buổi tối';

    const title = !isApproved ? 'Đang chờ duyệt' : (userProfile?.title || (userRole === 'admin' ? 'Quản trị viên' : (userRole === 'operator_doctor' ? 'Bác sĩ' : (userRole === 'operator_pharmacist' ? 'Dược sĩ' : 'Thành viên'))));
    const name = userProfile?.displayName || auth.currentUser?.displayName || '';

    return `${greeting}, ${title}. ${name}`;
  };

  return (
    <>
      <div className={cn(
      "p-2 lg:p-4 max-w-full mx-auto space-y-4 lg:space-y-6 pb-24 lg:pb-12 transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      <AnimatePresence>
        {showUtilityDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUtilityDrawer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "fixed top-0 right-0 h-full w-full z-[101] lg:hidden p-6 shadow-2xl flex flex-col gap-6",
                isDarkMode ? "bg-slate-900 border-l border-slate-800" : "bg-white border-l border-slate-100"
              )}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Calculator size={18} />
                  </div>
                  <h3 className={cn(
                    "text-sm font-black uppercase tracking-widest",
                    isDarkMode ? "text-white" : "text-slate-800"
                  )}>Tiện ích</h3>
                </div>
                <button
                  onClick={() => setShowUtilityDrawer(false)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide space-y-6 pb-20">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndActions}
                >
                  <SortableContext
                    items={utilityWidgets.map(w => w.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {utilityWidgets.map(widget => (
                        <SortableItem key={widget.id} id={widget.id} isEditMode={isEditMode} isDarkMode={isDarkMode}>
                          {widget.id === 'view_calculator' ? (
                            <div className={cn(
                              "rounded-[24px] overflow-hidden border transition-all",
                              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                            )}>
                              <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                                <CalculatorWidget isDarkMode={isDarkMode} inline={true} />
                              </Suspense>
                              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-center pb-4">
                                <button
                                  onClick={() => setActiveTab('view_calculator')}
                                  className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                                >Chi tiết</button>
                              </div>
                            </div>
                          ) : widget.id === 'view_todo' ? (
                            <div className={cn(
                              "rounded-[24px] overflow-hidden border transition-all",
                              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                            )}>
                              <div className="scale-[0.9] origin-top">
                                <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                                  <TodoWidget isDarkMode={isDarkMode} inline={true} />
                                </Suspense>
                              </div>
                              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-center -mt-8 pb-4 relative z-10">
                                <button
                                  onClick={() => setActiveTab('view_todo')}
                                  className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                                >Chi tiết</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveTab(widget.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                                isDarkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-750" : "bg-slate-50 border-slate-100 hover:shadow-md"
                              )}
                            >
                              <div className={cn("p-2 rounded-xl text-white shadow-md", widget.color)}>
                                <widget.icon size={16} />
                              </div>
                              <div>
                                <h4 className={cn("text-xs font-black uppercase tracking-tight truncate", isDarkMode ? "text-white" : "text-slate-900")}>{widget.label}</h4>
                              </div>
                            </button>
                          )}
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Drawer toggle tab — ChevronLeft (đóng) khi drawer ẩn, ChevronRight khi đang mở */}
      {utilityWidgets.length > 0 && (
        <button
          onClick={() => setShowUtilityDrawer(prev => !prev)}
          className={cn(
            "fixed top-1/2 -translate-y-1/2 right-0 w-7 h-16 rounded-l-2xl bg-primary text-white shadow-[-6px_0_16px_rgba(79,70,229,0.25)] lg:hidden z-[90] flex items-center justify-center transition-all active:scale-90",
            showUtilityDrawer && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft size={16} />
        </button>
      )}


      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2 lg:gap-4">
        <div>
          <h2 className={cn(
            "text-lg lg:text-4xl font-black tracking-tight transition-colors",
            isDarkMode ? "text-white" : "text-black"
          )}>
            {getGreeting()}
          </h2>
          <p className={cn(
            "mt-0.5 text-xs lg:text-sm font-medium transition-colors flex items-center gap-2",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>
            <span>Hôm nay là {format(currentTime, 'EEEE, d/M/yyyy', { locale: vi })}</span>
            <span className={cn("w-1 h-1 rounded-full", isDarkMode ? "bg-slate-700" : "bg-slate-300")} />
            <span className="font-mono font-bold text-primary">{format(currentTime, 'HH:mm:ss')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-sm",
              isCustomizing
                ? "bg-indigo-500 text-white shadow-indigo-200"
                : (isDarkMode ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-white text-slate-700 border border-slate-100")
            )}
          >
            {isCustomizing ? <Eye size={14} /> : <Settings size={14} />}
            {isCustomizing ? "Hoàn tất tùy chỉnh" : "Tùy chỉnh nút"}
          </button>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-sm",
              isEditMode
                ? "bg-primary text-white shadow-primary/20"
                : (isDarkMode ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-white text-slate-700 border border-slate-100")
            )}
          >
            <Layout size={14} className={isEditMode ? "animate-pulse" : ""} />
            {isEditMode ? "Đang chỉnh sửa" : "Chỉnh sửa giao diện"}
          </button>
          {isEditMode && (
            <button
              onClick={resetLayout}
              className={cn(
                "p-1.5 rounded-lg transition-all border",
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-100 text-slate-500 hover:text-slate-900"
              )}
              title="Khôi phục mặc định"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </header>



      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-4 gap-6",
      )}>
        <div className="lg:col-span-3 space-y-8">
          <AnimatePresence>
            {isCustomizing && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={cn(
                  "p-6 rounded-3xl border transition-all",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
                )}>
                  <h3 className={cn(
                    "text-sm font-black mb-6 uppercase tracking-[0.2em] transition-colors flex items-center gap-2",
                    isDarkMode ? "text-white" : "text-slate-800"
                  )}>
                    <Settings size={16} className="text-primary" />
                    Bật/Tắt các phím tắt nhanh
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {configurableActions.map(action => {
                      const isHidden = hiddenActions.includes(action.id);
                      return (
                        <button
                          key={action.id}
                          onClick={() => handleToggleActionVisibility(action.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group",
                            isHidden
                              ? (isDarkMode ? "bg-slate-950 border-slate-800/50 opacity-40" : "bg-slate-50 border-slate-100 opacity-40")
                              : (isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm")
                          )}
                        >
                          <div className={cn("p-2 rounded-lg text-white shrink-0", action.color)}>
                            <action.icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[10px] font-black uppercase tracking-tight truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                              {action.label}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {isHidden ? <EyeOff size={10} className="text-rose-500" /> : <Eye size={10} className="text-emerald-500" />}
                              <span className={cn("text-[8px] font-bold uppercase", isHidden ? "text-rose-500" : "text-emerald-500")}>
                                {isHidden ? "Đã ẩn" : "Đang hiện"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {clinicalActions.length > 0 && (
            <section>
              <h3 className={cn(
                "text-base lg:text-lg font-black flex items-center gap-2 transition-colors mb-4 uppercase tracking-widest",
                isDarkMode ? "text-white" : "text-slate-800"
              )}>
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                Công cụ lâm sàng
                <div className={cn("h-px flex-1 transition-colors", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndActions}
              >
                <SortableContext
                  items={clinicalActions.map(a => a.id)}
                  strategy={rectSortingStrategy}
                >
                  {/* Mobile: compact icon-grid (no borders), Desktop: card grid */}
                  <div className="grid grid-cols-4 xs:grid-cols-5 gap-2 sm:hidden">
                    {clinicalActions.map((action) => (
                      <SortableItem key={action.id} id={action.id} isEditMode={isEditMode} isDarkMode={isDarkMode}>
                        <button
                          onClick={() => !isEditMode && setActiveTab(action.id)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all group w-full",
                            isEditMode
                              ? (isDarkMode ? "bg-primary/10 ring-1 ring-primary/30 cursor-default" : "bg-primary/5 ring-1 ring-primary/20 cursor-default")
                              : (isDarkMode ? "hover:bg-slate-800/60 active:scale-95" : "hover:bg-slate-50 active:scale-95")
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-300",
                            action.color
                          )}>
                            <action.icon size={22} />
                          </div>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-tight text-center leading-tight line-clamp-2 w-full",
                            isDarkMode ? "text-slate-400 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900"
                          )}>
                            {action.label}
                          </span>
                        </button>
                      </SortableItem>
                    ))}
                  </div>

                  {/* Desktop: horizontal launcher cards */}
                  <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {clinicalActions.map((action) => (
                      <SortableItem key={action.id} id={action.id} isEditMode={isEditMode} isDarkMode={isDarkMode}>
                        <button
                          onClick={() => !isEditMode && setActiveTab(action.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-2xl border transition-all duration-200 text-left group h-[68px] overflow-hidden relative",
                            isDarkMode
                              ? "bg-slate-900 border-slate-800 hover:border-primary/40 hover:bg-slate-800/60"
                              : "bg-white border-slate-100 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5",
                            isEditMode && "ring-2 ring-primary/20 border-primary/40 cursor-default"
                          )}
                        >
                          {/* Colored left accent bar */}
                          <div className={cn(
                            "absolute left-0 top-0 w-[3px] h-full rounded-l-2xl transition-all duration-300 opacity-0 group-hover:opacity-100",
                            action.color
                          )} />

                          {/* Icon */}
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform duration-300 group-hover:scale-110",
                            action.color
                          )}>
                            <action.icon size={18} />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <h4 className={cn(
                              "text-[13px] font-black uppercase tracking-tight truncate transition-colors leading-tight",
                              isDarkMode ? "text-slate-100 group-hover:text-primary" : "text-slate-800 group-hover:text-primary"
                            )}>{action.label}</h4>
                            <p className={cn(
                              "text-[10px] font-semibold truncate mt-0.5",
                              isDarkMode ? "text-slate-500" : "text-slate-400"
                            )}>{action.desc}</p>
                          </div>

                          {/* Chevron arrow */}
                          {!isEditMode && (
                            <ChevronRight size={15} className={cn(
                              "shrink-0 transition-all duration-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
                              isDarkMode ? "text-primary" : "text-primary"
                            )} />
                          )}
                        </button>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}

          {managementActions.length > 0 && (
            <section>
              <h3 className={cn(
                "text-base lg:text-lg font-black flex items-center gap-2 transition-colors mb-4 uppercase tracking-widest",
                isDarkMode ? "text-white" : "text-slate-800"
              )}>
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                Quản lý & Chuyên môn
                <div className={cn("h-px flex-1 transition-colors", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndActions}
              >
                <SortableContext
                  items={managementActions.map(a => a.id)}
                  strategy={rectSortingStrategy}
                >
                  {/* Mobile: compact icon-grid (no borders) */}
                  <div className="grid grid-cols-4 gap-2 sm:hidden">
                    {managementActions.map((action) => (
                      <SortableItem key={action.id} id={action.id} isEditMode={isEditMode} isDarkMode={isDarkMode}>
                        <button
                          onClick={() => !isEditMode && setActiveTab(action.id)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all group w-full",
                            isEditMode
                              ? (isDarkMode ? "bg-primary/10 ring-1 ring-primary/30 cursor-default" : "bg-primary/5 ring-1 ring-primary/20 cursor-default")
                              : (isDarkMode ? "hover:bg-slate-800/60 active:scale-95" : "hover:bg-slate-50 active:scale-95")
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-300",
                            action.color
                          )}>
                            <action.icon size={22} />
                          </div>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-tight text-center leading-tight line-clamp-2 w-full",
                            isDarkMode ? "text-slate-400 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900"
                          )}>
                            {action.label}
                          </span>
                        </button>
                      </SortableItem>
                    ))}
                  </div>

                  {/* Desktop: horizontal card grid */}
                  <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {managementActions.map((action) => (
                      <SortableItem key={action.id} id={action.id} isEditMode={isEditMode} isDarkMode={isDarkMode}>
                        <button
                          onClick={() => !isEditMode && setActiveTab(action.id)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group h-full",
                            isDarkMode
                              ? "bg-slate-900 border-slate-800 hover:bg-slate-800/80"
                              : "bg-white border-slate-100 shadow-sm hover:shadow-md hover:shadow-primary/5",
                            isEditMode && "border-primary/50 ring-2 ring-primary/10 cursor-default"
                          )}
                        >
                          <div className={cn("p-3 rounded-xl text-white shadow-lg", action.color)}>
                            <action.icon size={22} />
                          </div>
                          <div>
                            <h4 className={cn(
                              "text-sm font-black mb-0.5 transition-colors uppercase tracking-tight",
                              isDarkMode ? "text-white group-hover:text-primary" : "text-slate-900 group-hover:text-primary"
                            )}>{action.label}</h4>
                            <p className={cn(
                              "text-[10px] font-bold transition-colors opacity-60",
                              isDarkMode ? "text-slate-400" : "text-slate-500"
                            )}>
                              {action.desc}
                            </p>
                          </div>
                        </button>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}

          {/* Workspace ICD-10 Section */}
          {workspaceIcds.length > 0 && (
            <section className="space-y-4">
              <h3 className={cn(
                "text-base lg:text-lg font-black flex items-center gap-2 transition-colors mb-4 uppercase tracking-widest text-[#0ea5e9]",
              )}>
                <div className="w-1.5 h-6 bg-[#0ea5e9] rounded-full" />
                ICD-10 Nhanh
                <span className="ml-auto px-2 py-0.5 rounded bg-[#0ea5e9]/10 text-[#0ea5e9] text-[10px] font-black border border-[#0ea5e9]/20">
                  {workspaceIcds.length}
                </span>
              </h3>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-left">
                      <th className="pb-2 pl-4">Mã</th>
                      <th className="pb-2">Mô tả bệnh</th>
                      <th className="pb-2">Thuốc gợi ý</th>
                      <th className="pb-2">Ghi chú</th>
                      <th className="pb-2 text-right pr-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceIcds.map((icd) => (
                      <tr
                        key={icd.code}
                        className={cn(
                          "group transition-all",
                          isDarkMode ? "bg-slate-900/50 hover:bg-slate-900" : "bg-white hover:bg-slate-50 shadow-sm"
                        )}
                      >
                        <td className="py-2 pl-4 rounded-l-xl border-y border-transparent group-hover:border-primary/20">
                          <div className={cn(
                            "w-fit px-2 py-1 rounded-lg font-mono font-black text-[10px] tracking-tight border text-center whitespace-nowrap",
                            isDarkMode ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            {icd.code}
                          </div>
                        </td>
                        <td className="py-2 border-y border-transparent group-hover:border-primary/20 min-w-[200px]">
                          <h4 className={cn("text-xs font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                            {icd.description}
                          </h4>
                        </td>
                        <td className="py-2 border-y border-transparent group-hover:border-primary/20">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const icdCode = (icd.code || '').trim().toUpperCase();
                              const drugsFromMapping = drugsByIcd[icdCode] || [];
                              const commonDrugs = icd.commonDrugs || [];

                              // Combine and remove duplicates
                              const allDrugs = Array.from(new Set([...commonDrugs, ...drugsFromMapping]));

                              if (allDrugs.length === 0) {
                                return <span className="text-[9px] font-bold text-slate-400 italic">Chưa có thuốc</span>;
                              }

                              return (
                                <>
                                  {allDrugs.map((drugName, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => handleOpenDrugModal(drugName)}
                                      className={cn(
                                        "text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase whitespace-normal break-words transition-all hover:scale-105 cursor-pointer",
                                        isDarkMode
                                          ? "bg-indigo-950/30 text-indigo-400 border-indigo-900/50 hover:bg-indigo-500 hover:text-white hover:border-indigo-500"
                                          : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                                      )}
                                      title={`Xem thông tin: ${drugName}`}
                                    >
                                      {drugName}
                                    </button>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-2 border-y border-transparent group-hover:border-primary/20">
                          <p className={cn("text-[10px] font-bold line-clamp-1 opacity-60 max-w-[150px]", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                            {icd.notes || "---"}
                          </p>
                        </td>
                        <td className="py-2 pr-4 rounded-r-xl border-y border-transparent text-right group-hover:border-primary/20">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setExternalIcdSearchQuery?.(icd.code);
                                setActiveTab('view_icd10');
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-all border",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-primary hover:bg-primary hover:text-white" : "bg-slate-50 border-slate-100 text-primary hover:bg-primary hover:text-white shadow-sm"
                              )}
                              title="Tra cứu"
                            >
                              <Search size={14} />
                            </button>
                            <button
                              onClick={() => {
                                const newWorkspaceBy = (icd.workspaceBy || []).filter(id => id !== uid);
                                updateDoc(doc(db, 'icd10', icd.code), { workspaceBy: newWorkspaceBy });
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-all border",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-rose-500 hover:bg-rose-500 hover:text-white" : "bg-slate-50 border-slate-100 text-rose-500 hover:bg-rose-500 hover:text-white shadow-sm"
                              )}
                              title="Gỡ ghim"
                            >
                              <PinOff size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Mobile Layout */}
              <div className="sm:hidden grid grid-cols-1 gap-4">
                {workspaceIcds.map((icd) => (
                  <div
                    key={icd.code}
                    className={cn(
                      "p-5 rounded-3xl border transition-all space-y-4",
                      isDarkMode
                        ? "bg-slate-900 border-slate-800 hover:border-indigo-500/30 shadow-2xl shadow-indigo-500/5"
                        : "bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:border-indigo-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 font-mono font-black text-[10px] border border-emerald-500/20",
                          )}>
                            {icd.code}
                          </div>
                          <h4 className={cn("text-[13px] font-black leading-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                            {icd.description}
                          </h4>
                        </div>
                        {icd.notes && (
                          <p className="text-[11px] text-slate-500 font-medium italic border-l-2 border-indigo-500/20 pl-2">
                            {icd.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setExternalIcdSearchQuery?.(icd.code);
                            setActiveTab('view_icd10');
                          }}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-2xl border transition-all",
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-primary"
                              : "bg-slate-50 border-slate-200 text-primary"
                          )}
                        >
                          <Search size={16} />
                        </button>
                        <button
                          onClick={() => {
                            const newWorkspaceBy = (icd.workspaceBy || []).filter(id => id !== uid);
                            updateDoc(doc(db, 'icd10', icd.code), { workspaceBy: newWorkspaceBy });
                          }}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-2xl border transition-all text-rose-500",
                            isDarkMode
                              ? "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500 hover:text-white"
                              : "bg-rose-50 border-rose-100 hover:bg-rose-500 hover:text-white"
                          )}
                        >
                          <PinOff size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#0ea5e9] mb-3">Thuốc gợi ý:</p>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const icdCode = (icd.code || '').trim().toUpperCase();
                          const drugsFromMapping = drugsByIcd[icdCode] || [];
                          const commonDrugs = icd.commonDrugs || [];
                          const allDrugs = Array.from(new Set([...commonDrugs, ...drugsFromMapping]));

                          if (allDrugs.length === 0) {
                            return <span className="text-xs font-bold text-slate-400 italic">Chưa có thuốc</span>;
                          }

                          return allDrugs.map((drugName, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleOpenDrugModal(drugName)}
                              className={cn(
                                "text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-tight transition-all active:scale-95 cursor-pointer",
                                isDarkMode
                                  ? "bg-indigo-950/30 text-indigo-400 border-indigo-900/50 active:bg-indigo-500 active:text-white active:border-indigo-500"
                                  : "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm active:bg-indigo-600 active:text-white active:border-indigo-600"
                              )}
                            >
                              {drugName}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="hidden lg:block space-y-6">
          {utilityWidgets.length > 0 && (
            <section className="space-y-4">
              <h3 className={cn(
                "text-base font-black flex items-center gap-2 transition-colors uppercase tracking-widest",
                isDarkMode ? "text-white" : "text-slate-800"
              )}>
                <Calculator size={18} className="text-primary" />
                Tiện ích
                <span className="ml-auto px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black border border-primary/20">
                  {utilityWidgets.length}
                </span>
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndActions}
              >
                <SortableContext
                  items={utilityWidgets.map(w => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {utilityWidgets.map(widget => (
                      <SortableItem key={widget.id} id={widget.id} isEditMode={isEditMode} isDarkMode={isDarkMode}>
                        {widget.id === 'view_calculator' ? (
                          <div className={cn(
                            "rounded-[32px] overflow-hidden border transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-lg"
                          )}>
                            <div>
                              <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                                <CalculatorWidget isDarkMode={isDarkMode} inline={true} />
                              </Suspense>
                            </div>
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-center pb-4 relative z-10">
                              <button
                                onClick={() => setActiveTab('view_calculator')}
                                className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                              >
                                Mở toàn màn hình
                              </button>
                            </div>
                          </div>
                        ) : widget.id === 'view_todo' ? (
                          <div className={cn(
                            "rounded-[32px] overflow-hidden border transition-all",
                            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-lg"
                          )}>
                            <div className="scale-[0.9] origin-top">
                              <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                                <TodoWidget isDarkMode={isDarkMode} inline={true} />
                              </Suspense>
                            </div>
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-center -mt-10 pb-4 relative z-10">
                              <button
                                onClick={() => setActiveTab('view_todo')}
                                className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                              >
                                Mở toàn màn hình
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => !isEditMode && setActiveTab(widget.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group h-full",
                              isDarkMode
                                ? "bg-slate-900 border-slate-800 hover:bg-slate-800"
                                : "bg-white border-slate-100 shadow-sm hover:shadow-md hover:shadow-primary/5",
                              isEditMode && "cursor-default"
                            )}
                          >
                            <div className={cn("p-2 rounded-xl text-white shadow-md", widget.color)}>
                              <widget.icon size={16} />
                            </div>
                            <div>
                              <h4 className={cn(
                                "text-xs font-black uppercase tracking-tight",
                                isDarkMode ? "text-white" : "text-slate-900"
                              )}>{widget.label}</h4>
                              <p className={cn(
                                "text-[9px] font-bold opacity-60",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )}>{widget.desc}</p>
                            </div>
                          </button>
                        )}
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}

          <section className="space-y-4">
            <h3 className={cn(
              "text-base font-black flex items-center gap-2 transition-colors uppercase tracking-widest",
              isDarkMode ? "text-white" : "text-slate-800"
            )}>
              Thông báo
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {notifications.filter(n => !n.isRead).slice(0, 3).map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all relative group shadow-sm",
                    isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "p-2 rounded-xl shrink-0 h-fit",
                      notification.type === 'info' ? "bg-blue-500/10 text-blue-500" :
                        notification.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                          notification.type === 'warning' ? "bg-amber-500/10 text-amber-500" :
                            "bg-rose-500/10 text-rose-500"
                    )}>
                      {notification.type === 'info' ? <AlertCircle size={18} /> :
                        notification.type === 'success' ? <ShieldCheck size={18} /> :
                          notification.type === 'warning' ? <AlertTriangle size={18} /> :
                            <AlertCircle size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("font-black text-xs truncate mb-1", isDarkMode ? "text-white" : "text-slate-900")}>
                        {notification.title}
                      </h4>
                      <p className={cn("text-[10px] font-bold leading-relaxed mb-3 transition-colors opacity-60", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onMarkAsRead?.(notification.id)}
                          className="text-[9px] font-black text-primary hover:underline flex items-center gap-1 uppercase tracking-widest"
                        >
                          Đã đọc
                        </button>
                        {notification.link && (
                          <button
                            onClick={() => setActiveTab(notification.link!)}
                            className="text-[9px] font-black text-indigo-500 hover:underline flex items-center gap-1 uppercase tracking-widest"
                          >
                            Mở
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.filter(n => !n.isRead).length === 0 && (
                <div className={cn(
                  "p-8 rounded-2xl border border-dashed text-center transition-colors opacity-60",
                  isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50/50"
                )}>
                  <Bell size={24} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Workspace sạch sẽ</p>
                </div>
              )}
            </div>
          </section>


          <section>
            <h3 className={cn(
              "text-base font-black flex items-center gap-2 transition-colors uppercase tracking-widest mb-4",
              isDarkMode ? "text-white" : "text-slate-800"
            )}>
              Hỗ trợ Workspace
            </h3>
            <div className={cn(
              "rounded-2xl p-5 relative overflow-hidden transition-all duration-300",
              isDarkMode
                ? "bg-slate-900 border border-slate-800 text-white"
                : "bg-white text-slate-900 border border-slate-100 shadow-md shadow-slate-200/40"
            )}>
              <div className="bg-primary/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                <Settings size={20} className="text-primary animate-spin-slow" />
              </div>
              <h4 className="text-sm font-black mb-1 uppercase tracking-tight">Cần trợ giúp?</h4>
              <p className={cn("text-[10px] font-bold leading-relaxed mb-4 transition-colors opacity-60", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Mọi thắc mắc kỹ thuật vui lòng liên hệ DS. Bảo qua Zalo.
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
                Trợ giúp Zalo
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>

      <DrugDetailModal
        drug={quickDrugModal.drug}
        isOpen={quickDrugModal.isOpen}
        onClose={() => setQuickDrugModal({ drug: null, isOpen: false })}
        isDarkMode={isDarkMode ?? false}
      />
    </>
  );
};

export default Dashboard;
