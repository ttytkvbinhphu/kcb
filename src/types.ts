export interface Drug {
  id: string;
  name: string;
  activeIngredients: { name: string; amount: string; unit: string }[];
  atcCode?: string;
  dosageForm: string;
  excipients?: string;
  manufacturer: string;
  mechanismOfAction?: string; // Cơ chế tác dụng chung của thuốc
  pharmacology?: string; // Thông tin dược lý chi tiết
  indications: { title?: string; content: string; icd10s?: string[]; isPrimary?: boolean; defaultIcd10?: string; defaultIcd10s?: string[] }[];
  contraindications: { 
    content: string; 
    type?: 'Drug' | 'ICD-10' | 'Weight' | 'Age' | 'Other'; 
    icd10s?: string[];
    ageConfig?: {
      operator: '<' | '>' | '≥' | '≤' | '';
      value: number | '';
      unit?: 'years' | 'months';
    };
  }[];
  sideEffects: string[] | { frequency: string; content: string }[];
  dosage?: string; // Tóm tắt liều dùng chung
  groupId?: string; // Legacy: single group
  groupIds?: string[]; // Multiple groups support
  avatarUrl?: string;
  bannerUrl?: string;
  pdfUrl?: string;
  registrationNumber?: string;
  leafletVersion?: string;
  leafletUpdateDate?: string;
  isClosed?: boolean;
  isRx?: boolean;
  status?: 'active' | 'suspended';
  stockStatus?: 'available' | 'low' | 'out' | string;
  expiryStatus?: 'valid' | 'expiring' | 'expired' | string;
  expiryDate?: string;
  generalAdministration?: string; // Common usage instructions (e.g., before/after food)
  administrationRoute?: string; // e.g., Oral, IV, IM
  dosageAndAdministration?: { 
    category: string; 
    content: string;
    morning?: string;
    noon?: string;
    afternoon?: string;
    night?: string;
  }[];
  precautions?: string;
  pregnancy?: string;
  lactation?: string;
  driving?: string;
  interactions?: string;
  specificInteractions?: { target: string; content: string }[];
  pharmacodynamics?: string | { category: string; content: string }[];
  pharmacokinetics?: string | { category: string; content: string }[];
  overdose?: string;
  updatedAt?: string;
  updatedBy?: string;
  createdAt?: string;
}

export interface DrugGroup {
  id: string;
  name: string;
  parentId: string | null;
  level: number; // 0, 1, 2
  order: number;
  bannerUrl?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  alias?: string;
  aliases?: string[];
  description?: string;
  categoryId?: string; // Legacy: single category
  categoryIds?: string[]; // Multiple categories support
}

export interface IngredientCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Excipient {
  id: string;
  name: string;
  alias?: string;
  aliases?: string[];
  description?: string;
  categoryId?: string; // Legacy
  categoryIds?: string[]; // Multiple categories support
}

export interface PrescriptionItem {
  drugId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  note?: string;
}

export interface Prescription {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Nam' | 'Nữ';
  diagnosis: string;
  icd10Code?: string;
  items: PrescriptionItem[];
  createdAt: string;
  doctorName: string;
  doctorUid: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  title?: 'Bác sĩ' | 'Dược sĩ' | 'Điều dưỡng' | string;
  position?: 'Giám đốc' | 'Phó giám đốc' | 'Trưởng khoa' | 'Phó khoa' | 'Nhân viên' | string;
  specialty?: 'Không' | 'Tiến sĩ' | 'Thạc sĩ' | 'Chuyên khoa I' | 'Chuyên khoa II' | 'Dược lâm sàng' | string;
  department?: string;
  role: 'admin' | 'operator' | 'operator_doctor' | 'operator_pharmacist' | 'member' | 'unapproved';
  isApproved?: boolean;
  photoSyncToken?: string;
  hideEmail?: boolean;
  hiddenQuickActions?: string[];
  zalo?: string;
  hideZalo?: boolean;
  hasSeenWelcome?: boolean;
  isHidden?: boolean;
  pinnedIcdCodes?: string[];
  workspaceIcdCodes?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ICD10 {
  code: string;
  description: string;
  notes?: string;
  guide?: string;
  isNew?: boolean;
  oldName?: string;
  isExpired?: boolean;
  isPinned?: boolean;
  showOnWorkspace?: boolean;
  isAppendixA2?: boolean;
  isAppendixA3?: boolean;
  isAppendixA4?: boolean;
  isAppendixA5?: boolean;
  isAppendixA6?: boolean;
  isRestricted?: boolean;
  commonDrugs?: string[];
  pinnedBy?: string[];
  workspaceBy?: string[];
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface InteractionResult {
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  isAI?: boolean;
  contraindicated?: boolean;
}

export interface ManualInteraction {
  id: string;
  type: 'Thuốc - Thuốc' | 'Thuốc - ICD-10' | 'Thuốc - Đối tượng' | 'Tương tác phức tạp';
  sourceIds: string[]; // List of drug IDs or other identifiers involved
  sourceNames: string[];
  targetId?: string; // For ICD-10 or Object
  targetName?: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  updatedAt: string;
  updatedBy: string;
  contraindicated?: boolean;
}

export interface ADRReport {
  id: string;
  patientInitials: string;
  patientAge: number;
  patientGender: 'Nam' | 'Nữ' | 'Khác';
  drugId: string;
  drugName: string;
  reactionDescription: string;
  severity: 'Nhẹ' | 'Trung bình' | 'Nặng' | 'Nghiêm trọng';
  outcome: 'Hồi phục' | 'Đang hồi phục' | 'Có di chứng' | 'Tử vong' | 'Không rõ';
  reporterName: string;
  reporterUid: string;
  reportedAt: string;
  status: 'Mới' | 'Đang xử lý' | 'Đã hoàn thành';
  notes?: string;
}

export interface ADRCatalogItem {
  id: string;
  reactionName: string;
  description: string;
  commonDrugs: string[];
  severityLevel: 'Nhẹ' | 'Trung bình' | 'Nặng' | 'Nghiêm trọng';
  management?: string;
  category: string;
  sortOrder?: number;
}

export interface Patient {
  MA_LK: string;
  STT: string;
  MA_BN: string;
  HO_TEN: string;
  SO_CCCD: string;
  NGAY_SINH: string;
  GIOI_TINH: string;
  NHOM_MAU: string;
  MA_QUOCTICH: string;
  MA_DANTOC: string;
  MA_NGHE_NGHIEP: string;
  DIA_CHI: string;
  MATINH_CU_TRU: string;
  MAHUYEN_CU_TRU: string;
  MAXA_CU_TRU: string;
  DIEN_THOAI: string;
  MA_THE_BHYT: string;
  MA_DKBD: string;
  GT_THE_TU: string;
  GT_THE_DEN: string;
  NGAY_MIEN_CCT: string;
  LY_DO_VV: string;
  LY_DO_VNT: string;
  MA_LY_DO_VNT: string;
  CHAN_DOAN_VAO: string;
  CHAN_DOAN_RV: string;
  MA_BENH_CHINH: string;
  MA_BENH_KT: string;
  MA_BENH_YHCT: string;
  MA_PTTT_QT: string;
  MA_DOITUONG_KCB: string;
  MA_NOI_DI: string;
  MA_NOI_DEN: string;
  MA_TAI_NAN: string;
  NGAY_VAO: string;
  NGAY_VAO_NOI_TRU: string;
  NGAY_RA: string;
  GIAY_CHUYEN_TUYEN: string;
  SO_NGAY_DTRI: string;
  PP_DIEU_TRI: string;
  KET_QUA_DTRI: string;
  MA_LOAI_RV: string;
  GHI_CHU: string;
  NGAY_TTOAN: string;
  T_THUOC: string;
  T_VTYT: string;
  T_TONGCHI_BV: string;
  T_TONGCHI_BH: string;
  T_BNTT: string;
  T_BNCCT: string;
  T_BHTT: string;
  T_NGUONKHAC: string;
  T_BHTT_GDV: string;
  NAM_QT: string;
  THANG_QT: string;
  MA_LOAI_KCB: string;
  MA_KHOA: string;
  MA_CSKCB: string;
  MA_KHUVUC: string;
  CAN_NANG: string;
  CAN_NANG_CON: string;
  NAM_NAM_LIEN_TUC: string;
  NGAY_TAI_KHAM: string;
  MA_HSBA: string;
  MA_TTDV: string;
  DU_PHONG: string;
  MA_NGHE_NGHIEP_3176: string;
  SO_NGAY_DIEU_TRI_3176: string;
  NGAYGIO_VAO: string;
  NGAYGIO_VAO_NOI_TRU: string;
  NGAYGIO_RA: string;
  NGAYGIO_TTOAN: string;
  MA_BAC_SI: string;
  TEN_BAC_SI: string;
}

export interface PatientDrug {
  MA_LK: string;
  STT: string;
  MA_THUOC: string;
  MA_PP_CHEBIEN: string;
  MA_CSKCB_THUOC: string;
  MA_NHOM: string;
  TEN_THUOC: string;
  HOAT_CHAT: string;
  DON_VI_TINH: string;
  HAM_LUONG: string;
  DUONG_DUNG: string;
  DANG_BAO_CHE: string;
  LIEU_DUNG: string;
  CACH_DUNG: string;
  SO_DANG_KY: string;
  TT_THAU: string;
  PHAM_VI: string;
  TYLE_TT_BH: string;
  SO_LUONG: string;
  DON_GIA: string;
  THANH_TIEN_BV: string;
  THANH_TIEN_BH: string;
  T_NGUONKHAC_NSNN: string;
  T_NGUONKHAC_VTNN: string;
  T_NGUONKHAC_VTTN: string;
  T_NGUONKHAC_CL: string;
  T_NGUONKHAC: string;
  MUC_HUONG: string;
  T_BNTT: string;
  T_BNCCT: string;
  T_BHTT: string;
  MA_KHOA: string;
  MA_BAC_SI: string;
  MA_DICH_VU: string;
  NGAY_YL: string;
  NGAY_TH_YL: string;
  MA_PTTT: string;
  NGUON_CTRA: string;
  VET_THUONG_TP: string;
  DU_PHONG: string;
  NGAYGIO_YL: string;
  NGAYGIO_TH_YL: string;
  TEN_BAC_SI: string;
}

export interface PatientSupply {
  MA_LK: string;
  STT: string;
  MA_DICH_VU: string;
  MA_PTTT_QT: string;
  MA_VAT_TU: string;
  MA_NHOM: string;
  GOI_VTYT: string;
  TEN_VAT_TU: string;
  TEN_DICH_VU: string;
  MA_XANG_DAU: string;
  DON_VI_TINH: string;
  PHAM_VI: string;
  SO_LUONG: string;
  DON_GIA_BV: string;
  DON_GIA_BH: string;
  TT_THAU: string;
  TYLE_TT_DV: string;
  TYLE_TT_BH: string;
  THANH_TIEN_BV: string;
  THANH_TIEN_BH: string;
  T_TRANTT: string;
  MUC_HUONG: string;
  T_NGUONKHAC_NSNN: string;
  T_NGUONKHAC_VTNN: string;
  T_NGUONKHAC_VTTN: string;
  T_NGUONKHAC_CL: string;
  T_NGUONKHAC: string;
  T_BNTT: string;
  T_BNCCT: string;
  T_BHTT: string;
  MA_KHOA: string;
  MA_GIUONG: string;
  MA_BAC_SI: string;
  NGUOI_THUC_HIEN: string;
  MA_BENH: string;
  MA_BENH_YHCT: string;
  NGAY_YL: string;
  NGAY_TH_YL: string;
  NGAY_KQ: string;
  MA_PTTT: string;
  VET_THUONG_TP: string;
  PP_VO_CAM: string;
  VI_TRI_TH_DVKT: string;
  MA_MAY: string;
  MA_HIEU_SP: string;
  TAI_SU_DUNG: string;
  DU_PHONG: string;
  MA_MAY_3176: string;
  NGAYGIO_YL: string;
  NGAYGIO_TH_YL: string;
  NGAYGIO_KQ: string;
}

export interface PatientSubclinical {
  MA_LK: string;
  STT: string;
  MA_DICH_VU: string;
  MA_CHI_SO: string;
  TEN_CHI_SO: string;
  GIA_TRI: string;
  DON_VI_DO: string;
  MO_TA: string;
  KET_LUAN: string;
  NGAY_KQ: string;
  MA_BS_DOC_KQ: string;
  DU_PHONG: string;
  NGAYGIO_KQ: string;
}

export interface Staff {
  id: string;
  fullName: string;
  type: 'Bác sĩ' | 'Dược sĩ' | 'Điều dưỡng';
  gender: 'Nam' | 'Nữ';
  dob: string;
  address?: string;
  specialty?: string;
  position?: string;
  phone?: string;
  email?: string;
  certificateCode?: string; // Mã chứng chỉ hành nghề
  department?: string; // Khoa/Phòng
  isActive: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: 'meeting' | 'duty' | 'surgery' | 'other';
  location?: string;
  createdBy: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  type: 'prescription_review' | 'drug_dispensing' | 'follow_up' | 'inventory_check' | 'clinical_note' | 'insurance_approval' | 'laboratory_review' | 'other';
  dueDate?: string;
  dueTime?: string;
  category?: string;
  notes?: string;
  patientId?: string;
  department?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface Announcement {
  id: string;
  content: string;
  createdAt: string;
  authorId?: string;
  targetRoles?: string[];
  targetTitles?: string[];
}

export interface AuthLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: 'login' | 'logout';
  timestamp: string;
}

export interface RegistrationSettings {
  allowNewRegistration: boolean;
  autoApprove: boolean;
  defaultRoleId: string;
  defaultTitleId: string;
  registrationDisabledReason?: string;
}

export interface SystemSettings {
  appName: string;
  loginTitle: string;
  loginSubtitle: string;
  appDescription: string;
  defaultTheme: 'light' | 'dark';
  loginLogoUrl?: string;
  loginBgUrl?: string;
  loginBgBlur?: number;
  loginBgOpacity?: number;
  loginPrimaryColor?: string;
  loginCardGlassMode?: boolean;
  termsOfUse?: string;
  termsUpdateDate?: string;
}

export interface VersionLog {
  id: string;
  versionName: string;
  releaseDate: string;
  notes: string;
  changes: { type: 'fix' | 'feature' | 'improvement' | 'breaking'; description: string }[];
  isDraft?: boolean;
  readBy?: string[];
  createdBy: string;
  createdAt: string;
}
