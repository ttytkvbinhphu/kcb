export interface Drug {
  id: string;
  name: string;
  activeIngredients: { name: string; amount: string; unit: string; sideEffectsNote?: string; equivalent?: string; equivalentAmount?: string; equivalentUnit?: string }[];
  atcCode?: string;
  dosageForm: string;
  detailedDosageForm?: string;
  excipients?: string;
  excipientsList?: { name: string; amount: string; unit: string }[];
  tabletWeight?: string;
  manufacturer: string;
  mechanismOfAction?: string; // Cơ chế tác dụng chung của thuốc
  mechanismOfActionLabel?: string; // Tùy chỉnh tiêu đề của cơ chế tác dụng
  pharmacology?: string; // Thông tin dược lý chi tiết
  indications: { title?: string; content: string; icd10s?: string[]; doubleIcd10s?: { dagger: string; asterisk: string }[]; isPrimary?: boolean; defaultIcd10?: string; defaultIcd10s?: string[]; notRecommendedIcd10s?: string[]; betterAlternativeIcd10s?: string[]; isRecommended?: boolean; isNotRecommended?: boolean; }[];
  contraindications: { 
    content: string; 
    type?: 'Drug' | 'ICD-10' | 'Weight' | 'Age' | 'Other'; 
    icd10s?: string[];
    drugs?: string[];
    ageConfig?: {
      operator: '<' | '>' | '≥' | '≤' | '';
      value: number | '';
      unit?: 'years' | 'months';
      operatorBefore?: '<' | '>' | '≥' | '≤' | '';
      valueBefore?: number | '';
    };
  }[];
  sideEffects: string[] | { frequency: string; content: string; ingredient?: string }[];
  sideEffectsType?: 'general' | 'by_ingredient';
  adrManagement?: string;
  dosage?: string; // Tóm tắt liều dùng chung
  groupId?: string; // Legacy: single group
  groupIds?: string[]; // Multiple groups support
  interactionGroupIds?: string[]; // Interaction groups support
  avatarUrl?: string;
  bannerUrl?: string;
  pdfUrl?: string;
  registrationNumber?: string;
  lotNumber?: string;
  lots?: { lotNumber: string; expiryDate: string; quantity?: number | string; reportDate?: string }[];
  stockQuantity?: number | string;
  lastReportDate?: string;
  quantityReports?: {
    id?: string;
    lotNumber: string;
    expiryDate: string;
    quantity: number | string;
    reportDate: string;
    createdAt?: string;
  }[];
  leafletVersion?: string;
  leafletUpdateDate?: string;
  isClosed?: boolean;
  isRx?: boolean;
  isNew?: boolean;
  isUpdated?: boolean | string;
  status?: 'active' | 'suspended';
  stockStatus?: 'available' | 'low' | 'out' | string;
  expiryStatus?: 'valid' | 'expiring' | 'expired' | string;
  expiryDate?: string;
  expiryAlertMonths?: number;
  generalAdministration?: string; // Common usage instructions (e.g., before/after food)
  generalAdministrationTime?: string; // Time of intake for general usage (all subjects)
  administrationRoute?: string; // e.g., Oral, IV, IM
  dosageAndAdministration?: { 
    groupTitle?: string; // Tiêu đề nhóm đối tượng (Ví dụ: Điều trị bệnh A)
    category: string; 
    content: string;
    patientGroups?: string[];
    administrationTime?: string; // Thời điểm uống thuốc (ví dụ: Trước ăn, sau ăn)
    ageMin?: number;         // Tuổi tối thiểu cho đối tượng này
    ageMax?: number | null;  // Tuổi tối đa, null = không giới hạn trên
    weightMin?: number;      // Cân nặng tối thiểu (kg)
    weightMax?: number | null; // Cân nặng tối đa (kg)
    crclMin?: number;        // Độ thanh thải creatinine tối thiểu (ml/min)
    crclMax?: number | null;  // Độ thanh thải creatinine tối đa (ml/min)
    periodStart?: string;    // Từ ngày (Legacy)
    periodEnd?: string;      // Đến ngày (Legacy)
    morning?: string;        // Sáng (Legacy)
    noon?: string;           // Trưa (Legacy)
    afternoon?: string;      // Chiều (Legacy)
    night?: string;          // Tối (Legacy)
    totalDay?: string;       // Tổng/Ngày (Legacy)
    schedules?: {            // Mảng các lộ trình dùng thuốc
      name?: string;         // Tên lộ trình (Ví dụ: Đợt tấn công, liều duy trì,...)
      periodStart?: string;
      periodEnd?: string;
      
      // Tab 1: Số lượng
      quantityUnit?: string;
      morning?: string;
      noon?: string;
      afternoon?: string;
      night?: string;
      totalDay?: string;
      quantityMaxDose?: string;

      // Tab 2: Hàm lượng
      dosageUnit?: string;
      dosageMorning?: string;
      dosageNoon?: string;
      dosageAfternoon?: string;
      dosageNight?: string;
      dosageTotalDay?: string;
      dosageMaxDose?: string;

      // Tab 3: Số kg (Liều theo kg)
      weightUnit?: string;
      weightDoseType?: 'per_dose' | 'per_day';
      weightMorning?: string;
      weightNoon?: string;
      weightAfternoon?: string;
      weightNight?: string;
      weightTotalDay?: string;
      weightMaxDose?: string;
      note?: string; // Ghi chú thêm cho lộ trình này
      intervalValue?: string; // Số của khoảng cách uống (e.g., "4")
      intervalUnit?: string;   // Đơn vị của khoảng cách: "giờ", "ngày", "tuần" (e.g., "giờ")
      timesPerDay?: string;    // Số lần trong ngày (e.g., "3")
      dosePerTime?: string;    // Mỗi lần dùng bao nhiêu - Theo Số lượng (e.g., "1 viên", "2 ml")
      dosageDosePerTime?: string; // Mỗi lần dùng bao nhiêu - Theo Hàm lượng (e.g., "500 mg")
      weightDosePerTime?: string; // Mỗi lần dùng bao nhiêu - Theo Số kg (e.g., "10 mg/kg")
    }[];
  }[];
  precautions?: string | { 
    title?: string; 
    content: string; 
    type?: 'Drug' | 'ICD-10' | 'Weight' | 'Age' | 'Other'; 
    severity?: 'Cần theo dõi điều trị' | 'Cần theo dõi người bệnh' | 'Cần cân nhắc lợi, hại' | 'Phối hợp nguy hiểm' | 'Chống chỉ định' | '';
    icd10s?: string[];
    drugs?: string[];
    ageConfig?: {
      operator: '<' | '>' | '≥' | '≤' | '';
      value: number | '';
      unit?: 'years' | 'months';
      operatorBefore?: '<' | '>' | '≥' | '≤' | '';
      valueBefore?: number | '';
    };
  }[];
  warnings?: { 
    title?: string; 
    content: string; 
    type?: 'Drug' | 'ICD-10' | 'Weight' | 'Age' | 'Other'; 
    severity?: 'Cần theo dõi điều trị' | 'Cần theo dõi người bệnh' | 'Cần cân nhắc lợi, hại' | 'Phối hợp nguy hiểm' | 'Chống chỉ định' | '';
    icd10s?: string[];
    drugs?: string[];
    ageConfig?: {
      operator: '<' | '>' | '≥' | '≤' | '';
      value: number | '';
      unit?: 'years' | 'months';
      operatorBefore?: '<' | '>' | '≥' | '≤' | '';
      valueBefore?: number | '';
    };
  }[];
  pregnancy?: string;
  lactation?: string;
  driving?: string;
  fertility?: string;
  interactions?: string;
  incompatibilities?: string;
  sideEffectsNote?: string;
  specificInteractions?: { target: string; content: string; severity?: string; title?: string; selfIngredient?: string; partnerType?: 'ingredient' | 'group' }[];
  pharmacodynamics?: string | { category: string; content: string }[];
  pharmacokinetics?: string | { category: string; content: string }[];
  overdose?: string;
  overdoseManagement?: string;
  pregnancyStatus1?: string;
  pregnancyStatus2?: string;
  pregnancyStatus3?: string;
  pregnancyNotes?: string;
  lactationStatus?: string;
  lactationNotes?: string;
  drivingStatus?: string;
  drivingNotes?: string;
  fertilityStatus?: string;
  fertilityNotes?: string;
  isWHOGMP?: boolean;
  isEUGMP?: boolean;
  isTCCS?: boolean;
  isCYP3A4?: boolean;
  storageCondition?: string;
  storageTemperature?: string;
  shelfLife?: string;
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
  classification?: 'treatment' | 'interaction';
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
  grade?: string;
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
  staffAccount?: string;
  username?: string;
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
  pinnedPatientIds?: string[];
  workspacePatientIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  powerPoints?: number;
  lastVisit?: any;
  visitCount?: any;
}

export interface ICD10 {
  id?: string;
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
  isTT26?: boolean;
  commonDrugs?: string[];
  pinnedBy?: string[];
  workspaceBy?: string[];
  chapterName?: string;
  blockName?: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  fax?: string;
  factoryAddress?: string;
  factoryPhone?: string;
  factoryFax?: string;
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
  alternativeName?: string;
  alternativeNames?: string[];
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
  staffAccount?: string; // Tài khoản nhân sự
  username?: string; // Tên đăng nhập nhân sự
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
  role?: string; // Vai trò hệ thống
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
  title?: string;
  content: string;
  createdAt: string;
  authorId?: string;
  targetRoles?: string[];
  targetTitles?: string[];
  type?: 'general' | 'drug_update';
  drugId?: string;
  drugName?: string;
  showInWorkspace?: boolean;
  showInHeader?: boolean;
  readBy?: string[];
}

export interface AuthLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: 'login' | 'logout';
  timestamp: string;
  ipAddress?: string;
  macAddress?: string;
  device?: string;
}

export interface GuestLog {
  id: string;
  ipAddress: string;
  macAddress?: string;
  device?: string;
  userAgent?: string;
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
  changes: { type: 'fix' | 'feature' | 'improvement' | 'breaking' | 'new'; description: string }[];
  isDraft?: boolean;
  readBy?: string[];
  createdBy: string;
  createdAt: string;
}
