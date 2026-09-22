import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  LayoutGrid, 
  FolderTree, 
  Menu, 
  Pill, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  FileText, 
  Calculator, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Bell, 
  Settings, 
  Activity, 
  FileSearch, 
  AlertTriangle, 
  ClipboardList,
  HeartPulse,
  Stethoscope,
  Globe,
  HelpCircle,
  Clock,
  ShieldAlert,
  Sliders,
  Bookmark,
  Compass,
  Database,
  Smartphone,
  BookOpen
} from 'lucide-react';
import { MobileNavButtonConfig, MobileBottomNavSettings } from '../types';

export const DEFAULT_MOBILE_NAV_BUTTONS: MobileNavButtonConfig[] = [
  {
    id: 'btn_workspace',
    label: 'Workspace',
    icon: 'LayoutDashboard',
    actionType: 'tab',
    targetTab: 'dashboard',
    isVisible: true,
    order: 1,
    highlightColor: 'primary'
  },
  {
    id: 'btn_lookup',
    label: 'Tra cứu',
    icon: 'Search',
    actionType: 'sheet_lookup',
    targetTab: 'view_directory',
    isVisible: true,
    order: 2,
    highlightColor: 'primary'
  },
  {
    id: 'btn_tools',
    label: 'Tiện ích',
    icon: 'LayoutGrid',
    actionType: 'sheet_tools',
    targetTab: 'view_calendar',
    isVisible: true,
    order: 3,
    highlightColor: 'primary'
  },
  {
    id: 'btn_pharmacy',
    label: 'Dược',
    icon: 'FolderTree',
    actionType: 'tab',
    targetTab: 'manage_directory',
    isVisible: true,
    order: 4,
    highlightColor: 'emerald',
    rolesAllowed: ['admin', 'operator', 'operator_doctor', 'operator_pharmacist']
  },
  {
    id: 'btn_menu',
    label: 'Tất cả',
    icon: 'Menu',
    actionType: 'sheet_menu',
    isVisible: true,
    order: 5,
    highlightColor: 'primary'
  }
];

export const DEFAULT_MOBILE_BOTTOM_NAV_SETTINGS: MobileBottomNavSettings = {
  enabled: true,
  navStyle: 'default',
  showLabels: 'always',
  buttons: DEFAULT_MOBILE_NAV_BUTTONS
};

export const AVAILABLE_NAV_ICONS: { key: string; label: string; icon: any }[] = [
  { key: 'LayoutDashboard', label: 'Bàn làm việc', icon: LayoutDashboard },
  { key: 'Search', label: 'Tìm kiếm / Tra cứu', icon: Search },
  { key: 'LayoutGrid', label: 'Lưới ứng dụng / Tiện ích', icon: LayoutGrid },
  { key: 'FolderTree', label: 'Cây thư mục / Dược', icon: FolderTree },
  { key: 'Menu', label: 'Menu tất cả', icon: Menu },
  { key: 'Pill', label: 'Viên thuốc', icon: Pill },
  { key: 'Calendar', label: 'Lịch công tác', icon: Calendar },
  { key: 'MessageSquare', label: 'Tin nhắn / Ghi chú', icon: MessageSquare },
  { key: 'ListTodo', label: 'Việc cần làm', icon: ListTodo },
  { key: 'FileText', label: 'Văn bản / Đơn thuốc', icon: FileText },
  { key: 'Calculator', label: 'Máy tính y khoa', icon: Calculator },
  { key: 'Sparkles', label: 'Nổi bật / AI', icon: Sparkles },
  { key: 'ShieldCheck', label: 'Bảo mật / Quản trị', icon: ShieldCheck },
  { key: 'Users', label: 'Bệnh nhân / Nhân sự', icon: Users },
  { key: 'Bell', label: 'Thông báo', icon: Bell },
  { key: 'Settings', label: 'Cài đặt', icon: Settings },
  { key: 'Activity', label: 'Nhịp tim / Lâm sàng', icon: Activity },
  { key: 'FileSearch', label: 'Tra cứu hồ sơ', icon: FileSearch },
  { key: 'AlertTriangle', label: 'Cảnh báo / ADR', icon: AlertTriangle },
  { key: 'ClipboardList', label: 'Bệnh lý ICD-10', icon: ClipboardList },
  { key: 'HeartPulse', label: 'Mạch tim', icon: HeartPulse },
  { key: 'Stethoscope', label: 'Ống nghe', icon: Stethoscope },
  { key: 'Globe', label: 'Hệ thống chung', icon: Globe },
  { key: 'HelpCircle', label: 'Trợ giúp', icon: HelpCircle },
  { key: 'Bookmark', label: 'Đánh dấu', icon: Bookmark },
  { key: 'Compass', label: 'Khám phá', icon: Compass },
  { key: 'BookOpen', label: 'Dược thư / Sách y', icon: BookOpen }
];

export const AVAILABLE_TARGET_TABS = [
  { id: 'dashboard', label: 'Workspace (Trang chủ)', group: 'Trang chính' },
  { id: 'view_directory', label: 'Tra cứu Thuốc', group: 'Tra cứu chuyên khoa' },
  { id: 'view_national_pharmacopoeia', label: 'Tra cứu Dược thư Quốc gia', group: 'Tra cứu chuyên khoa' },
  { id: 'view_treatment_guideline', label: 'Hướng dẫn điều trị (Bộ Y tế)', group: 'Tra cứu chuyên khoa' },
  { id: 'view_icd10', label: 'Tra cứu ICD-10', group: 'Tra cứu chuyên khoa' },
  { id: 'view_interaction', label: 'Tương tác thuốc', group: 'Tra cứu chuyên khoa' },
  { id: 'view_adr', label: 'Tra cứu ADR', group: 'Tra cứu chuyên khoa' },
  { id: 'view_doc_lookup', label: 'Tra cứu Văn bản', group: 'Tra cứu chuyên khoa' },
  { id: 'view_patients', label: 'Tra cứu Bệnh nhân', group: 'Tra cứu chuyên khoa' },
  
  { id: 'view_calendar', label: 'Lịch công tác', group: 'Tiện ích lâm sàng' },
  { id: 'view_notes', label: 'Ghi chú cá nhân', group: 'Tiện ích lâm sàng' },
  { id: 'view_todo', label: 'Việc cần làm (Todo)', group: 'Tiện ích lâm sàng' },
  { id: 'view_prescription', label: 'Kê toa thử lâm sàng', group: 'Tiện ích lâm sàng' },
  { id: 'view_calculator', label: 'Máy tính y khoa', group: 'Tiện ích lâm sàng' },
  { id: 'view_social', label: 'Mạng xã hội nội bộ', group: 'Tiện ích lâm sàng' },
  { id: 'view_slideshow', label: 'Slide Showcase', group: 'Tiện ích lâm sàng' },
  
  { id: 'manage_directory', label: 'Quản lý Thuốc', group: 'Quản lý Dược' },
  { id: 'manage_national_pharmacopoeia', label: 'Quản lý Dược thư', group: 'Quản lý Dược' },
  { id: 'manage_treatment_guidelines', label: 'Quản lý Hướng dẫn điều trị (BYT)', group: 'Quản lý Dược' },
  { id: 'manage_icd10', label: 'Quản lý ICD-10', group: 'Quản lý Dược' },
  { id: 'manage_interaction', label: 'Quản lý Tương tác thuốc', group: 'Quản lý Dược' },
  { id: 'manage_adr', label: 'Quản lý Báo cáo ADR', group: 'Quản lý Dược' },
  { id: 'manage_doc_lookup', label: 'Quản lý Văn bản', group: 'Quản lý Dược' },
  { id: 'manage_users', label: 'Quản lý Người dùng', group: 'Quản trị hệ thống' },
  { id: 'admin_general', label: 'Cài đặt chung', group: 'Quản trị hệ thống' },
  { id: 'admin_theme', label: 'Quản lý Giao diện', group: 'Quản trị hệ thống' }
];

export const NAV_HIGHLIGHT_COLORS = [
  { key: 'primary', label: 'Xanh dương (Chính)', bgClass: 'bg-primary', textClass: 'text-primary', activeLightBg: 'bg-primary/15', activeDarkBg: 'bg-primary/20' },
  { key: 'emerald', label: 'Xanh lục (Dược)', bgClass: 'bg-emerald-600', textClass: 'text-emerald-600 dark:text-emerald-400', activeLightBg: 'bg-emerald-500/15', activeDarkBg: 'bg-emerald-500/20' },
  { key: 'indigo', label: 'Xanh tím', bgClass: 'bg-indigo-600', textClass: 'text-indigo-600 dark:text-indigo-400', activeLightBg: 'bg-indigo-500/15', activeDarkBg: 'bg-indigo-500/20' },
  { key: 'amber', label: 'Vàng hổ phách', bgClass: 'bg-amber-600', textClass: 'text-amber-600 dark:text-amber-400', activeLightBg: 'bg-amber-500/15', activeDarkBg: 'bg-amber-500/20' },
  { key: 'rose', label: 'Đỏ hồng', bgClass: 'bg-rose-600', textClass: 'text-rose-600 dark:text-rose-400', activeLightBg: 'bg-rose-500/15', activeDarkBg: 'bg-rose-500/20' },
  { key: 'purple', label: 'Tím đậm', bgClass: 'bg-purple-600', textClass: 'text-purple-600 dark:text-purple-400', activeLightBg: 'bg-purple-500/15', activeDarkBg: 'bg-purple-500/20' },
  { key: 'cyan', label: 'Xanh ngọc lơ', bgClass: 'bg-cyan-600', textClass: 'text-cyan-600 dark:text-cyan-400', activeLightBg: 'bg-cyan-500/15', activeDarkBg: 'bg-cyan-500/20' }
];

export const getNavIconComponent = (iconName: string) => {
  const found = AVAILABLE_NAV_ICONS.find(i => i.key === iconName);
  return found ? found.icon : LayoutDashboard;
};
