import React, { useState, useEffect } from 'react';
import { Pill, ShieldAlert, FileText, Users, TrendingUp, Calendar, ArrowUpRight, ClipboardList, AlertTriangle, Settings, GripVertical, Layout, RotateCcw, MessageSquare, AlertCircle, ShieldCheck, Zap, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { db, auth, collection, getDocs, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Notification } from '../types';
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
  uid
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState([
    { id: 'stat_drugs', label: 'Tổng số thuốc', value: '...', icon: Pill, color: 'bg-primary', trend: '+0%' },
    { id: 'stat_patients', label: 'Tổng số bệnh nhân', value: '...', icon: Users, color: 'bg-emerald-500', trend: '+0%' },
    { id: 'stat_prescriptions', label: 'Tổng đơn thuốc', value: '...', icon: FileText, color: 'bg-amber-500', trend: '+0%' },
    { id: 'stat_adr', label: 'Báo cáo ADR', value: '...', icon: AlertTriangle, color: 'bg-rose-500', trend: '+0%' },
    { id: 'stat_patients_new', label: 'Bệnh nhân (Import)', value: '...', icon: Users, color: 'bg-indigo-500', trend: '+0%' },
  ]);

  const allActions = [
    { id: 'view_directory', label: featureSettings['view_directory']?.customTitle || 'Tra cứu thuốc', icon: Pill, desc: 'Tra cứu thông tin thuốc, hoạt chất và tương tác', color: 'bg-blue-500' },
    { id: 'view_icd10', label: featureSettings['view_icd10']?.customTitle || 'Tra cứu ICD-10', icon: ClipboardList, desc: 'Tra cứu mã bệnh quốc tế ICD-10', color: 'bg-cyan-600' },
    { id: 'view_interaction', label: featureSettings['view_interaction']?.customTitle || 'Tương tác thuốc', icon: ShieldAlert, desc: 'Kiểm tra tương tác giữa các thuốc', color: 'bg-orange-500' },
    { id: 'view_prescription', label: featureSettings['view_prescription']?.customTitle || 'Kê toa mới', icon: FileText, desc: 'Tạo đơn thuốc cho bệnh nhân mới', color: 'bg-primary' },
    { id: 'view_calendar', label: featureSettings['view_calendar']?.customTitle || 'Lịch công tác', icon: Calendar, desc: 'Xem và quản lý lịch trực, hội chẩn', color: 'bg-blue-600' },
    { id: 'view_notes', label: featureSettings['view_notes']?.customTitle || 'Ghi chú', icon: MessageSquare, desc: 'Lưu trữ ghi chú lâm sàng cá nhân', color: 'bg-violet-600' },
    { id: 'view_adr', label: featureSettings['view_adr']?.customTitle || 'Báo cáo ADR', icon: AlertTriangle, desc: 'Báo cáo phản ứng có hại của thuốc', color: 'bg-rose-600' },
    { id: 'view_patients', label: featureSettings['view_patients']?.customTitle || 'Tra cứu bệnh nhân', icon: Users, desc: 'Tra cứu hồ sơ và quản lý dữ liệu bệnh nhân', color: 'bg-indigo-600' },
    { id: 'view_social', label: featureSettings['view_social']?.customTitle || 'Mạng xã hội', icon: MessageSquare, desc: 'Kết nối và trao đổi với đồng nghiệp', color: 'bg-pink-600' },
  ];

  const [quickActions, setQuickActions] = useState<any[]>([]);

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
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) return false;
      
      // Hide if restricted location
      if (settings?.hiddenLocations?.includes('home_grid')) return false;

      const isVisible = status !== 'closed' && (status !== 'maintenance' || isPrivileged);
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
  }, [allowedTabs, featureStates, userRole]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Load saved layout from localStorage
    const savedStatsOrder = localStorage.getItem('dashboard_stats_order');

    if (savedStatsOrder) {
      const order = JSON.parse(savedStatsOrder);
      setStats(prev => {
        const sorted = [...prev].sort((a, b) => {
          const indexA = order.indexOf(a.id);
          const indexB = order.indexOf(b.id);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        return sorted;
      });
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isApproved) return;
      try {
        const [drugsSnap, prescriptionsSnap, adrSnap, patientsSnap] = await Promise.all([
          getDocs(collection(db, 'drugs')).catch(() => null),
          getDocs(collection(db, 'prescriptions')).catch(() => null),
          getDocs(collection(db, 'adr_reports')).catch(() => null),
          getDocs(collection(db, 'patients')).catch(() => null)
        ]);
        
        const drugsCount = drugsSnap?.size || 0;
        const prescriptionsCount = prescriptionsSnap?.size || 0;
        const adrCount = adrSnap?.size || 0;
        const patientsCount = patientsSnap?.size || 0;
        
        const uniquePatients = new Set(prescriptionsSnap?.docs.map(d => d.data().patientName) || []);
        
        setStats(prev => prev.map(stat => {
          if (stat.id === 'stat_drugs') return { ...stat, value: drugsCount.toLocaleString(), trend: '+12%' };
          if (stat.id === 'stat_patients') return { ...stat, value: uniquePatients.size.toLocaleString(), trend: '+5%' };
          if (stat.id === 'stat_prescriptions') return { ...stat, value: prescriptionsCount.toLocaleString(), trend: '+18%' };
          if (stat.id === 'stat_adr') return { ...stat, value: adrCount.toLocaleString(), trend: '+2%' };
          if (stat.id === 'stat_patients_new') return { ...stat, value: patientsCount.toLocaleString(), trend: '+100%' };
          return stat;
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'stats');
      }
    };
    fetchStats();
  }, [isApproved]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndStats = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStats((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('dashboard_stats_order', JSON.stringify(newItems.map((i: any) => i.id)));
        return newItems;
      });
    }
  };

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
    localStorage.removeItem('dashboard_stats_order');
    localStorage.removeItem('dashboard_actions_order');
    window.location.reload();
  };

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
                onClick={() => auth.signOut()}
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
    
    const title = userProfile?.title || (userRole === 'admin' ? 'Quản trị viên' : (userRole === 'operator_doctor' ? 'Bác sĩ' : (userRole === 'operator_pharmacist' ? 'Dược sĩ' : 'Thành viên')));
    const name = userProfile?.displayName || auth.currentUser?.displayName || '';
    
    return `${greeting}, ${title}. ${name}`;
  };

  return (
    <div className={cn(
      "p-2 lg:p-4 max-w-full mx-auto space-y-4 lg:space-y-6 pb-24 lg:pb-12 transition-colors",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2 lg:gap-4">
        <div>
          <h2 className={cn(
            "text-lg lg:text-2xl font-black tracking-tight transition-colors",
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
        <div className="flex items-center gap-2">
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
      </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEndStats}
      >
        <SortableContext
          items={stats.map(s => s.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {stats.map((stat, i) => (
              <SortableItem key={stat.id} id={stat.id} isEditMode={isEditMode} isDarkMode={isDarkMode}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "p-3 lg:p-4 rounded-xl border transition-all group h-full",
                    isDarkMode 
                      ? "bg-slate-900 border-slate-800 shadow-none" 
                      : "bg-white border-slate-100 shadow-md shadow-slate-200/40",
                    isEditMode && "border-primary/50 ring-2 ring-primary/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className={cn("p-1.5 lg:p-2 rounded-lg text-white shadow-md", stat.color)}>
                      <stat.icon size={14} />
                    </div>
                    <div className={cn(
                      "flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[8px] lg:text-[10px] font-black",
                      stat.trend.startsWith('+') 
                        ? (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600") 
                        : (isDarkMode ? "bg-rose-900/30 text-rose-400" : "bg-rose-50 text-rose-600")
                    )}>
                      <TrendingUp size={8} className={stat.trend.startsWith('-') ? "rotate-180" : ""} />
                      {stat.trend}
                    </div>
                  </div>
                  <p className={cn(
                    "font-black text-[8px] lg:text-[9px] uppercase tracking-widest mb-0.5 transition-colors",
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  )}>{stat.label}</p>
                  <h3 className={cn(
                    "text-lg lg:text-xl font-black tracking-tight transition-colors",
                    isDarkMode ? "text-white" : "text-black"
                  )}>{stat.value}</h3>
                </motion.div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6",
        !isDarkMode && "bg-white p-3 lg:p-6 rounded-2xl border border-slate-100 shadow-md shadow-slate-200/40"
      )}>
        <h3 className={cn(
          "text-lg lg:text-xl font-bold flex items-center gap-2 transition-colors lg:col-span-3",
          isDarkMode ? "text-white" : "text-black"
        )}>
          Hành động nhanh
          <div className={cn("h-px flex-1 transition-colors", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
        </h3>
        
        <div className="lg:col-span-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndActions}
          >
            <SortableContext
              items={quickActions.map(a => a.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
                {quickActions.map((action) => (
                  <SortableItem key={action.id} id={action.id} isEditMode={isEditMode} isDarkMode={isDarkMode}>
                    <button
                      onClick={() => !isEditMode && setActiveTab(action.id)}
                      className={cn(
                        "w-full flex flex-col items-start p-3 lg:p-4 rounded-xl border transition-all text-left group h-full",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-800 shadow-none hover:bg-slate-800/50" 
                          : "bg-white border-slate-100 shadow-sm hover:shadow-md hover:shadow-primary/10",
                        isEditMode && "border-primary/50 ring-2 ring-primary/10 cursor-default"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg text-white mb-2 lg:mb-3 shadow-md group-hover:scale-110 transition-transform", action.color)}>
                        <action.icon size={16} lg:size={18} />
                      </div>
                      <h4 className={cn(
                        "text-sm lg:text-base font-bold mb-0.5 transition-colors",
                        isDarkMode ? "text-white group-hover:text-primary" : "text-slate-900 group-hover:text-primary"
                      )}>{action.label}</h4>
                      <p className={cn(
                        "text-[10px] lg:text-[11px] font-medium leading-tight transition-colors",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>{action.desc}</p>
                      {!isEditMode && (
                        <div className={cn(
                          "mt-2 lg:mt-3 flex items-center gap-1.5 font-black text-[8px] lg:text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-5px] group-hover:translate-x-0",
                          isDarkMode ? "text-primary" : "text-primary"
                        )}>
                          Bắt đầu ngay <ArrowUpRight size={10} />
                        </div>
                      )}
                    </button>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="space-y-4">
          <h3 className={cn(
            "text-lg font-bold flex items-center gap-2 transition-colors",
            isDarkMode ? "text-white" : "text-black"
          )}>
            Thông báo mới
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
            <div className={cn("h-px flex-1 transition-colors", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
          </h3>
          
          <div className="space-y-3">
            {notifications.filter(n => !n.isRead).slice(0, 3).map(notification => (
              <div 
                key={notification.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all relative group",
                  isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-100 shadow-sm"
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
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={cn("font-bold text-sm truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                        {notification.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {new Date(notification.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className={cn("text-xs leading-relaxed mb-3", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => onMarkAsRead?.(notification.id)}
                        className="text-[10px] font-black text-primary hover:underline flex items-center gap-1"
                      >
                        <ShieldCheck size={12} /> Đã đọc
                      </button>
                      {notification.link && (
                        <button 
                          onClick={() => setActiveTab(notification.link!)}
                          className="text-[10px] font-black text-indigo-500 hover:underline flex items-center gap-1"
                        >
                          <Zap size={12} /> Xem ngay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {notifications.filter(n => !n.isRead).length === 0 && (
              <div className={cn(
                "p-8 rounded-2xl border border-dashed text-center transition-colors",
                isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-slate-50/50"
              )}>
                <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 text-xs font-bold">Không có thông báo mới</p>
              </div>
            )}
          </div>

          <h3 className={cn(
            "text-lg font-bold flex items-center gap-2 transition-colors pt-4",
            isDarkMode ? "text-white" : "text-black"
          )}>
            Hỗ trợ
            <div className={cn("h-px flex-1 transition-colors", isDarkMode ? "bg-slate-800" : "bg-slate-100")} />
          </h3>
          <div className={cn(
            "rounded-2xl p-4 relative overflow-hidden transition-all duration-300",
            isDarkMode 
              ? "bg-slate-950 text-white shadow-none" 
              : "bg-white text-slate-900 border border-slate-100 shadow-md shadow-slate-200/50"
          )}>
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/10 blur-2xl rounded-full -mr-12 -mb-12"></div>
            <div className="relative z-10">
              <div className="bg-primary w-8 h-8 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-primary/20">
                <ShieldAlert size={16} className="text-white" />
              </div>
              <h4 className="text-base font-bold mb-1">Hỗ trợ kỹ thuật</h4>
              <p className={cn("text-[10px] leading-relaxed mb-4 font-medium transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Nếu gặp khó khăn, vui lòng liên hệ Zalo: <strong>093.262.10.28 (DS. Bảo)</strong>
              </p>
              <a 
                href="https://zalo.me/0932621028" 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn(
                  "w-full py-2 rounded-lg text-xs font-bold transition-all backdrop-blur-md border flex items-center justify-center gap-2",
                  isDarkMode 
                    ? "bg-white/10 hover:bg-white/20 border-white/10 text-white" 
                    : "bg-white hover:bg-slate-50 border-slate-100 text-slate-900 shadow-sm"
                )}
              >
                Liên hệ Zalo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
