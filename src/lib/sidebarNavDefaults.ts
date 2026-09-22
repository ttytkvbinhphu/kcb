import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  FileSearch, 
  Pill, 
  BookOpen, 
  Stethoscope, 
  ClipboardList, 
  ShieldAlert, 
  AlertTriangle, 
  Users, 
  FileText, 
  Calculator, 
  LayoutTemplate, 
  Globe, 
  UserCheck, 
  LayoutGrid, 
  MessageSquarePlus, 
  Sun, 
  HelpCircle,
  LucideIcon
} from 'lucide-react';

export interface SidebarItemDefinition {
  id: string;
  defaultLabel: string;
  iconName: string;
  section: 'general' | 'admin' | 'data';
  category: string;
  description: string;
  badgeColor?: string;
}

export const ALL_SIDEBAR_DEFINITIONS: Record<string, SidebarItemDefinition> = {
  // GENERAL TABS
  'dashboard': {
    id: 'dashboard',
    defaultLabel: 'Workspace',
    iconName: 'LayoutDashboard',
    section: 'general',
    category: 'Tổng quan & Công việc',
    description: 'Bàn làm việc tổng hợp, lối tắt tra cứu và thống kê',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  },
  'view_calendar': {
    id: 'view_calendar',
    defaultLabel: 'Lịch công tác',
    iconName: 'Calendar',
    section: 'general',
    category: 'Tổng quan & Công việc',
    description: 'Lịch trực, hội chẩn và công tác của đơn vị',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
  },
  'view_notes': {
    id: 'view_notes',
    defaultLabel: 'Ghi chú',
    iconName: 'MessageSquare',
    section: 'general',
    category: 'Tổng quan & Công việc',
    description: 'Sổ tay ghi chú công việc lâm sàng cá nhân',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
  },
  'view_todo': {
    id: 'view_todo',
    defaultLabel: 'Việc cần làm',
    iconName: 'ListTodo',
    section: 'general',
    category: 'Tổng quan & Công việc',
    description: 'Danh sách nhiệm vụ & phân công công việc',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
  },
  'view_doc_lookup': {
    id: 'view_doc_lookup',
    defaultLabel: 'Tra cứu văn bản',
    iconName: 'FileSearch',
    section: 'general',
    category: 'Tra cứu chuyên môn',
    description: 'Văn bản quy phạm, thông tư, quyết định y tế',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  'view_directory': {
    id: 'view_directory',
    defaultLabel: 'Tra cứu thuốc',
    iconName: 'Pill',
    section: 'general',
    category: 'Tra cứu chuyên môn',
    description: 'Danh mục biệt dược, hoạt chất, tá dược và nhà sản xuất',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  },
  'view_national_pharmacopoeia': {
    id: 'view_national_pharmacopoeia',
    defaultLabel: 'Dược thư Quốc gia',
    iconName: 'BookOpen',
    section: 'general',
    category: 'Tra cứu chuyên môn',
    description: 'Chuyên luận Dược thư Quốc gia Việt Nam',
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
  },
  'view_treatment_guideline': {
    id: 'view_treatment_guideline',
    defaultLabel: 'Hướng dẫn điều trị',
    iconName: 'Stethoscope',
    section: 'general',
    category: 'Tra cứu chuyên môn',
    description: 'Phác đồ và hướng dẫn chẩn đoán điều trị Bộ Y tế',
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  },
  'view_icd10': {
    id: 'view_icd10',
    defaultLabel: 'Tra cứu ICD-10',
    iconName: 'ClipboardList',
    section: 'general',
    category: 'Tra cứu chuyên môn',
    description: 'Mã bệnh quốc tế ICD-10 chuẩn Bộ Y tế',
    badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
  },
  'view_interaction': {
    id: 'view_interaction',
    defaultLabel: 'Tương tác thuốc',
    iconName: 'ShieldAlert',
    section: 'general',
    category: 'An toàn & Cảnh báo',
    description: 'Kiểm tra tương tác thuốc đa hoạt chất',
    badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400'
  },
  'view_adr': {
    id: 'view_adr',
    defaultLabel: 'Tra cứu ADR',
    iconName: 'AlertTriangle',
    section: 'general',
    category: 'An toàn & Cảnh báo',
    description: 'Báo cáo và tra cứu phản ứng có hại của thuốc',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  'view_patients': {
    id: 'view_patients',
    defaultLabel: 'Tra cứu bệnh nhân',
    iconName: 'Users',
    section: 'general',
    category: 'Lâm sàng & Tiện ích',
    description: 'Hồ sơ theo dõi và danh sách bệnh nhân',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  },
  'view_prescription': {
    id: 'view_prescription',
    defaultLabel: 'Kê toa thử',
    iconName: 'FileText',
    section: 'general',
    category: 'Lâm sàng & Tiện ích',
    description: 'Thử nghiệm đơn thuốc và kiểm tra tương tác',
    badgeColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
  },
  'view_social': {
    id: 'view_social',
    defaultLabel: 'Mạng xã hội',
    iconName: 'MessageSquare',
    section: 'general',
    category: 'Lâm sàng & Tiện ích',
    description: 'Diễn đàn chia sẻ ca lâm sàng nội bộ',
    badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
  },
  'view_calculator': {
    id: 'view_calculator',
    defaultLabel: 'Máy tính y khoa',
    iconName: 'Calculator',
    section: 'general',
    category: 'Lâm sàng & Tiện ích',
    description: 'Công cụ tính liều, BMI, eGFR, CrCl lâm sàng',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  },
  'view_slideshow': {
    id: 'view_slideshow',
    defaultLabel: 'Slide Showcase',
    iconName: 'LayoutTemplate',
    section: 'general',
    category: 'Lâm sàng & Tiện ích',
    description: 'Trình chiếu tài liệu đào tạo và giới thiệu',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
  },

  // ADMIN TABS
  'admin_general': {
    id: 'admin_general',
    defaultLabel: 'Cài đặt chung',
    iconName: 'Globe',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Thông tin hệ thống, tên ứng dụng và phân quyền',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
  },
  'admin_registration': {
    id: 'admin_registration',
    defaultLabel: 'Đăng nhập/Đăng ký',
    iconName: 'UserCheck',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Duyệt thành viên và cấu hình quy tắc đăng ký',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  },
  'admin_home': {
    id: 'admin_home',
    defaultLabel: 'Công cụ',
    iconName: 'LayoutGrid',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Tùy biến màn hình công cụ và lối tắt tiện ích',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
  },
  'admin_theme': {
    id: 'admin_theme',
    defaultLabel: 'Quản lý Giao diện',
    iconName: 'Sun',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Thiết kế Left Sidebar, Mobile Nav, Slide & Giao diện',
    badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
  },
  'admin_slideshow': {
    id: 'admin_slideshow',
    defaultLabel: 'Quản lý Slide Showcase',
    iconName: 'LayoutTemplate',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Quản lý danh sách slide đào tạo và truyền thông',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
  },
  'admin_notifications': {
    id: 'admin_notifications',
    defaultLabel: 'Thông báo/Tin nhắn',
    iconName: 'MessageSquare',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Gửi thông báo hệ thống và tin nhắn nhóm',
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  },
  'admin_feedbacks': {
    id: 'admin_feedbacks',
    defaultLabel: 'Góp ý/Báo cáo',
    iconName: 'MessageSquarePlus',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Tiếp nhận phản hồi người dùng và báo cáo sự cố',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  'admin_hr': {
    id: 'admin_hr',
    defaultLabel: 'Quản lý Nhân sự',
    iconName: 'Users',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Cơ cấu khoa phòng, chức danh, chức vụ nhân viên',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
  },
  'admin_guide': {
    id: 'admin_guide',
    defaultLabel: 'Hướng dẫn/Trợ giúp',
    iconName: 'HelpCircle',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Biên tập tài liệu hướng dẫn và trợ giúp sử dụng',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  'manage_users': {
    id: 'manage_users',
    defaultLabel: 'Quản lý người dùng',
    iconName: 'Users',
    section: 'admin',
    category: 'Quản trị hệ thống',
    description: 'Phân quyền vai trò và quản lý tài khoản người dùng',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  },

  // DATA TABS
  'manage_directory': {
    id: 'manage_directory',
    defaultLabel: 'Quản lý thuốc',
    iconName: 'Pill',
    section: 'data',
    category: 'Kho dữ liệu',
    description: 'Cơ sở dữ liệu danh mục thuốc, hoạt chất và biệt dược',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  },
  'manage_national_pharmacopoeia': {
    id: 'manage_national_pharmacopoeia',
    defaultLabel: 'Dược thư Quốc gia',
    iconName: 'BookOpen',
    section: 'data',
    category: 'Kho dữ liệu',
    description: 'Quản lý kho chuyên luận Dược thư Quốc gia',
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
  },
  'manage_treatment_guidelines': {
    id: 'manage_treatment_guidelines',
    defaultLabel: 'Hướng dẫn điều trị (BYT)',
    iconName: 'Stethoscope',
    section: 'data',
    category: 'Kho dữ liệu',
    description: 'Cơ sở dữ liệu phác đồ điều trị và nhóm điều trị của Bộ Y tế',
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  },
  'manage_icd10': {
    id: 'manage_icd10',
    defaultLabel: 'Quản lý ICD-10',
    iconName: 'ClipboardList',
    section: 'data',
    category: 'Kho dữ liệu',
    description: 'Cơ sở dữ liệu danh mục mã bệnh ICD-10',
    badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
  },
  'manage_interaction': {
    id: 'manage_interaction',
    defaultLabel: 'Quản lý tương tác thuốc',
    iconName: 'ShieldAlert',
    section: 'data',
    category: 'Kho dữ liệu',
    description: 'Quản lý cặp tương tác thuốc, mức độ và cơ chế',
    badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400'
  },
  'manage_adr': {
    id: 'manage_adr',
    defaultLabel: 'Quản lý ADR',
    iconName: 'AlertTriangle',
    section: 'data',
    category: 'Kho dữ liệu',
    description: 'Quản lý cơ sở dữ liệu phản ứng có hại của thuốc',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  'manage_doc_lookup': {
    id: 'manage_doc_lookup',
    defaultLabel: 'Quản lý văn bản',
    iconName: 'FileText',
    section: 'data',
    category: 'Kho dữ liệu',
    description: 'Quản lý kho văn bản quy phạm và hướng dẫn pháp lý',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  }
};

export const DEFAULT_SIDEBAR_GENERAL_ORDER: string[] = [
  'dashboard',
  'view_calendar',
  'view_notes',
  'view_todo',
  'view_doc_lookup',
  'view_directory',
  'view_national_pharmacopoeia',
  'view_treatment_guideline',
  'view_icd10',
  'view_interaction',
  'view_adr',
  'view_patients',
  'view_prescription',
  'view_social',
  'view_calculator',
  'view_slideshow'
];

export const DEFAULT_SIDEBAR_ADMIN_ORDER: string[] = [
  'admin_general',
  'admin_registration',
  'admin_home',
  'admin_theme',
  'admin_slideshow',
  'admin_notifications',
  'admin_feedbacks',
  'admin_hr',
  'admin_guide',
  'manage_users'
];

export const DEFAULT_SIDEBAR_DATA_ORDER: string[] = [
  'manage_directory',
  'manage_national_pharmacopoeia',
  'manage_treatment_guidelines',
  'manage_icd10',
  'manage_interaction',
  'manage_adr',
  'manage_doc_lookup'
];

export const getSidebarIconComponent = (iconName: string): LucideIcon => {
  switch (iconName) {
    case 'LayoutDashboard': return LayoutDashboard;
    case 'Calendar': return Calendar;
    case 'MessageSquare': return MessageSquare;
    case 'ListTodo': return ListTodo;
    case 'FileSearch': return FileSearch;
    case 'Pill': return Pill;
    case 'BookOpen': return BookOpen;
    case 'Stethoscope': return Stethoscope;
    case 'ClipboardList': return ClipboardList;
    case 'ShieldAlert': return ShieldAlert;
    case 'AlertTriangle': return AlertTriangle;
    case 'Users': return Users;
    case 'FileText': return FileText;
    case 'Calculator': return Calculator;
    case 'LayoutTemplate': return LayoutTemplate;
    case 'Globe': return Globe;
    case 'UserCheck': return UserCheck;
    case 'LayoutGrid': return LayoutGrid;
    case 'MessageSquarePlus': return MessageSquarePlus;
    case 'Sun': return Sun;
    case 'HelpCircle': return HelpCircle;
    default: return LayoutDashboard;
  }
};

export const getSidebarItemDefinition = (id: string): SidebarItemDefinition => {
  return ALL_SIDEBAR_DEFINITIONS[id] || {
    id,
    defaultLabel: id,
    iconName: 'LayoutDashboard',
    section: 'general',
    category: 'Khác',
    description: 'Mục điều hướng',
    badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
  };
};
