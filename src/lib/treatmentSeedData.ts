import { TreatmentGroup, TreatmentGuideline } from '../types';

export interface MaterialColorOption {
  id: string;
  name: string;
  hex: string;
  lightHex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

export const MATERIAL_DESIGN_COLORS: MaterialColorOption[] = [
  { id: 'blue', name: 'Xanh Lam (Blue 500)', hex: '#2196F3', lightHex: '#E3F2FD', textClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-500', borderClass: 'border-blue-500/30' },
  { id: 'red', name: 'Đỏ Cấp cứu (Red 500)', hex: '#F44336', lightHex: '#FFEBEE', textClass: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-500', borderClass: 'border-red-500/30' },
  { id: 'pink', name: 'Hồng Sen (Pink 500)', hex: '#E91E63', lightHex: '#FCE4EC', textClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-500', borderClass: 'border-pink-500/30' },
  { id: 'purple', name: 'Tím Đậm (Purple 500)', hex: '#9C27B0', lightHex: '#F3E5F5', textClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-500', borderClass: 'border-purple-500/30' },
  { id: 'deep_purple', name: 'Tím Lam (Deep Purple)', hex: '#673AB7', lightHex: '#EDE7F6', textClass: 'text-indigo-700 dark:text-indigo-400', bgClass: 'bg-indigo-600', borderClass: 'border-indigo-500/30' },
  { id: 'indigo', name: 'Chàm Indigo', hex: '#3F51B5', lightHex: '#E8EAF6', textClass: 'text-indigo-600 dark:text-indigo-400', bgClass: 'bg-indigo-500', borderClass: 'border-indigo-500/30' },
  { id: 'cyan', name: 'Xanh Lơ (Cyan 500)', hex: '#00BCD4', lightHex: '#E0F7FA', textClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-500', borderClass: 'border-cyan-500/30' },
  { id: 'teal', name: 'Xanh Mòng Két (Teal 500)', hex: '#009688', lightHex: '#E0F2F1', textClass: 'text-teal-600 dark:text-teal-400', bgClass: 'bg-teal-500', borderClass: 'border-teal-500/30' },
  { id: 'green', name: 'Xanh Lá (Green 500)', hex: '#4CAF50', lightHex: '#E8F5E9', textClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-500/30' },
  { id: 'amber', name: 'Vàng Hổ Phách (Amber 500)', hex: '#FFC107', lightHex: '#FFF8E1', textClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500', borderClass: 'border-amber-500/30' },
  { id: 'orange', name: 'Cam (Orange 500)', hex: '#FF9800', lightHex: '#FFF3E0', textClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-500', borderClass: 'border-orange-500/30' },
  { id: 'deep_orange', name: 'Cam Đỏ (Deep Orange)', hex: '#FF5722', lightHex: '#FBE9E7', textClass: 'text-orange-700 dark:text-orange-400', bgClass: 'bg-orange-600', borderClass: 'border-orange-500/30' },
  { id: 'brown', name: 'Nâu Đất (Brown 500)', hex: '#795548', lightHex: '#EFEBE9', textClass: 'text-amber-900 dark:text-amber-300', bgClass: 'bg-amber-800', borderClass: 'border-amber-800/30' },
  { id: 'blue_grey', name: 'Xám Lam (Blue Grey)', hex: '#607D8B', lightHex: '#ECEFF1', textClass: 'text-slate-600 dark:text-slate-300', bgClass: 'bg-slate-500', borderClass: 'border-slate-500/30' },
];

export const AVAILABLE_GROUP_ICONS = [
  { id: 'Heart', label: 'Tim mạch' },
  { id: 'Activity', label: 'Hoạt động tim phổi' },
  { id: 'Stethoscope', label: 'Ống nghe' },
  { id: 'Wind', label: 'Hô hấp / Phổi' },
  { id: 'Brain', label: 'Thần kinh' },
  { id: 'Zap', label: 'Cấp cứu' },
  { id: 'ShieldAlert', label: 'Nhiễm trùng / Cảnh báo' },
  { id: 'Flame', label: 'Tiêu hóa / Viêm' },
  { id: 'Baby', label: 'Nhi khoa' },
  { id: 'Droplet', label: 'Máu / Dịch thể' },
  { id: 'Bone', label: 'Cơ xương khớp' },
  { id: 'Thermometer', label: 'Nhiệt độ / Sốt' },
  { id: 'Pill', label: 'Thuốc / Dược lý' },
  { id: 'Sparkles', label: 'Đặc biệt' },
  { id: 'Eye', label: 'Mắt' },
];

export const DEFAULT_TREATMENT_GROUPS: TreatmentGroup[] = [
  {
    id: 'grp_cardio',
    name: 'Tim mạch',
    code: 'CARDIO',
    description: 'Tăng huyết áp, suy tim, bệnh mạch vành, cơn đau thắt ngực, rối loạn nhịp tim...',
    icon: 'Heart',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    order: 1,
    isActive: true
  },
  {
    id: 'grp_respiratory',
    name: 'Hô hấp',
    code: 'RESP',
    description: 'Hen phế quản, bệnh phổi tắc nghẽn mạn tính (COPD), viêm phổi cộng đồng...',
    icon: 'Wind',
    color: '#00BCD4',
    bgColor: '#E0F7FA',
    order: 2,
    isActive: true
  },
  {
    id: 'grp_endocrine',
    name: 'Nội tiết - Chuyển hóa',
    code: 'ENDO',
    description: 'Đái tháo đường típ 2, rối loạn lipid máu, bệnh lý tuyến giáp, hội chứng chuyển hóa...',
    icon: 'Activity',
    color: '#FF9800',
    bgColor: '#FFF3E0',
    order: 3,
    isActive: true
  },
  {
    id: 'grp_infection',
    name: 'Truyền nhiễm - Nhiễm trùng',
    code: 'INFECT',
    description: 'Sốt xuất huyết Dengue, viêm gan siêu vi B/C, cúm mùa, nhiễm khuẩn hô hấp...',
    icon: 'ShieldAlert',
    color: '#E91E63',
    bgColor: '#FCE4EC',
    order: 4,
    isActive: true
  },
  {
    id: 'grp_emergency',
    name: 'Cấp cứu - Hồi sức',
    code: 'EMERGENCY',
    description: 'Sốc phản vệ, ngừng tuần hoàn hô hấp, xử trí ngộ độc cấp, cấp cứu ban đầu...',
    icon: 'Zap',
    color: '#F44336',
    bgColor: '#FFEBEE',
    order: 5,
    isActive: true
  },
  {
    id: 'grp_gastro',
    name: 'Tiêu hóa - Gan mật',
    code: 'GASTRO',
    description: 'Loét dạ dày tá tràng, diệt H. pylori, xuất huyết tiêu hóa trên, trào ngược GERD...',
    icon: 'Flame',
    color: '#009688',
    bgColor: '#E0F2F1',
    order: 6,
    isActive: true
  },
  {
    id: 'grp_rheuma',
    name: 'Cơ xương khớp',
    code: 'RHEUMA',
    description: 'Cơn Gout cấp và kiểm soát mạn tính, thoái hóa khớp, viêm khớp dạng thấp...',
    icon: 'Bone',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    order: 7,
    isActive: true
  },
  {
    id: 'grp_neuro',
    name: 'Thần kinh - Tâm thần',
    code: 'NEURO',
    description: 'Đột quỵ não cấp, đau đầu Migraine, rối loạn tiền đình, đau thần kinh tọa...',
    icon: 'Brain',
    color: '#3F51B5',
    bgColor: '#E8EAF6',
    order: 8,
    isActive: true
  },
  {
    id: 'grp_pediatric',
    name: 'Nhi khoa',
    code: 'PEDIATRIC',
    description: 'Sốt co giật lành tính ở trẻ em, tiêu chảy cấp, viêm tiểu phế quản trẻ em...',
    icon: 'Baby',
    color: '#4CAF50',
    bgColor: '#E8F5E9',
    order: 9,
    isActive: true
  }
];

export const INITIAL_TREATMENT_GUIDELINES: TreatmentGuideline[] = [
  {
    id: 'guide_hypertension',
    title: 'Hướng dẫn Chẩn đoán và Điều trị Tăng huyết áp',
    diseaseName: 'Tăng huyết áp nguyên phát (Vô căn)',
    icd10Codes: ['I10', 'I15'],
    groupId: 'grp_cardio',
    source: {
      organization: 'Bộ Y tế',
      documentNumber: 'Quyết định số 5968/QĐ-BYT',
      issueYear: 2020,
      signedDate: '20/12/2020',
      officialUrl: 'https://kcb.vn'
    },
    summary: 'Phác đồ tiếp cận toàn diện theo bậc phân tầng nguy cơ tim mạch tổng thể, tối ưu hóa phối hợp thuốc cố định liều đôi ngay từ đầu đối với đa số bệnh nhân nhằm nâng cao tỷ lệ tuân thủ và đạt đích huyết áp sớm.',
    severityLevels: [
      { level: 'Tiền tăng huyết áp', criteria: 'HATT 130 - 139 mmHg hoặc HATTr 85 - 89 mmHg', color: '#FFC107', recommendedAction: 'Thay đổi lối sống, tái khám sau 3 - 6 tháng' },
      { level: 'Tăng HA Độ 1', criteria: 'HATT 140 - 159 mmHg hoặc HATTr 90 - 99 mmHg', color: '#FF9800', recommendedAction: 'Đơn trị hoặc phối hợp đôi liều thấp nếu nguy cơ tim mạch cao' },
      { level: 'Tăng HA Độ 2', criteria: 'HATT 160 - 179 mmHg hoặc HATTr 100 - 109 mmHg', color: '#FF5722', recommendedAction: 'Khởi trị ngay bằng phối hợp 2 thuốc (A + C hoặc A + D)' },
      { level: 'Tăng HA Độ 3', criteria: 'HATT ≥ 180 mmHg hoặc HATTr ≥ 110 mmHg', color: '#F44336', recommendedAction: 'Điều trị tích cực, phối hợp 3 thuốc hoặc nhập viện nếu có tổn thương cơ quan đích' },
      { level: 'Cơn THA cấp cứu', criteria: 'HATT > 180 mmHg kèm tổn thương cơ quan đích cấp tính (phù phổi, đột quỵ, nhồi máu cơ tim)', color: '#D32F2F', recommendedAction: 'Nhập viện cấp cứu/ICU ngay, dùng thuốc hạ áp tĩnh mạch kiểm soát' }
    ],
    diagnosticCriteria: {
      clinical: [
        'Đo huyết áp tại phòng khám đúng chuẩn ≥ 140/90 mmHg trong ít nhất 2 lần khám khác nhau.',
        'Đo huyết áp liên tục 24h (ABPM) trung bình ngày ≥ 135/85 mmHg, hoặc ban đêm ≥ 120/70 mmHg.',
        'Tự đo huyết áp tại nhà (HBPM) trung bình ≥ 135/85 mmHg.',
        'Thăm khám tìm tổn thương cơ quan đích: Soi đáy mắt, mạch ngoại biên, tiếng thổi tim.'
      ],
      paraclinical: [
        'Điện tâm đồ (ECG 12 chuyển đạo): Tìm dày thất trái (chỉ số Sokolow-Lyon, Cornell).',
        'Tổng phân tích nước tiểu: Tỷ lệ Albumin/Creatinine niệu (UACR) hoặc que thử protein niệu.',
        'Sinh hóa máu: Đường huyết đói, HbA1c, Lipid máu toàn phần, Creatinine máu, eGFR, Acid Uric, Điện giải đồ (Na, K).',
        'Siêu âm tim và siêu âm Doppler mạch cảnh (nếu có điều kiện).'
      ],
      differentialDiagnosis: [
        'Tăng huyết áp áo choàng trắng (White-coat hypertension).',
        'Tăng huyết áp ẩn giấu (Masked hypertension).',
        'Tăng huyết áp thứ phát (Bệnh nhu mô thận, hẹp động mạch thận, u tủy thượng thận, hẹp eo động mạch chủ).'
      ]
    },
    flowchartSteps: [
      {
        id: 'step_1',
        stepNumber: 1,
        type: 'assessment',
        title: 'Bước 1: Tiếp nhận, đo HA đúng chuẩn & Phân tầng nguy cơ',
        description: 'Bệnh nhân nghỉ ngơi yên tĩnh tối thiểu 5 phút. Đo HA 2 lần cách nhau 1-2 phút ở cả 2 tay. Lấy số đo bên cao hơn.',
        badge: 'Khám ban đầu',
        badgeColor: '#2196F3',
        keyActions: [
          'Khai thác tiền sử bệnh tim mạch gia đình, thói quen hút thuốc lá, vận động, chế độ ăn mặn.',
          'Phân tầng nguy cơ tim mạch tổng thể SCORE: Thấp, Trung bình, Cao, Rất cao.',
          'Chỉ định xét nghiệm cơ bản: ECG, Creatinine, eGFR, Glucose đói, Ion đồ.'
        ]
      },
      {
        id: 'step_2',
        stepNumber: 2,
        type: 'decision',
        title: 'Bước 2: Phác đồ Khởi trị (Bước 1 theo BYT)',
        condition: 'Đa số bệnh nhân Tăng HA Độ 1 nguy cơ cao hoặc Độ 2 trở lên',
        description: 'Khởi đầu với Viên phối hợp 2 thuốc cố định liều (Single Pill Combination - SPC): Ức chế men chuyển (ACEi) hoặc Chẹn thụ thể (ARB) + Chẹn kênh calci (CCB) hoặc Lợi tiểu Thiazide/Thiazide-like.',
        badge: 'Phối hợp đôi',
        badgeColor: '#4CAF50',
        keyActions: [
          'Lựa chọn viên kết hợp: Perindopril + Amlodipine, hoặc Telmisartan + Amlodipine, hoặc Losartan + Hydrochlorothiazide.',
          'Ngoại lệ dùng đơn trị liệu: Người rất cao tuổi (≥ 80 tuổi), bệnh nhân suy nhược, hoặc Tăng HA Độ 1 nguy cơ tim mạch thấp.',
          'Tư vấn thay đổi lối sống: Giảm muối (< 5g muối/ngày), tăng rau quả, tập thể dục 30 phút/ngày, bỏ thuốc lá.'
        ]
      },
      {
        id: 'step_3',
        stepNumber: 3,
        type: 'treatment',
        title: 'Bước 3: Nâng bậc Phối hợp 3 thuốc (Nếu chưa kiểm soát sau 1 - 2 tháng)',
        condition: 'HA chưa đạt mục tiêu < 130/80 mmHg sau 4 - 8 tuần',
        description: 'Chuyển sang Viên phối hợp 3 thuốc cố định liều: ACEi/ARB + CCB + Lợi tiểu Thiazide/Thiazide-like.',
        badge: 'Phối hợp 3 thuốc',
        badgeColor: '#FF9800',
        keyActions: [
          'Ví dụ: Perindopril + Amlodipine + Indapamide (Co-Aprovel hoặc Triplixam).',
          'Đánh giá lại sự tuân thủ điều trị của bệnh nhân trước khi nâng bậc.',
          'Kiểm tra nồng độ Kali máu và Creatinine huyết thanh.'
        ]
      },
      {
        id: 'step_4',
        stepNumber: 4,
        type: 'monitoring',
        title: 'Bước 4: Tăng huyết áp kháng trị & Cân nhắc phối hợp 4 thuốc',
        condition: 'HA vẫn ≥ 140/90 mmHg dù đã dùng đủ liều 3 nhóm thuốc trong đó có lợi tiểu',
        description: 'Xác định THA kháng trị thực sự (loại trừ không tuân thủ và THA áo choàng trắng). Bổ sung Spironolactone (25 - 50 mg/ngày) hoặc Chẹn Beta / Chẹn Alpha.',
        badge: 'Kháng trị',
        badgeColor: '#F44336',
        keyActions: [
          'Bổ sung Spironolactone 25mg/ngày (nếu eGFR ≥ 45 ml/phút và K+ < 4.5 mmol/L).',
          'Nếu không dung nạp Spironolactone: Chuyển sang Bisoprolol hoặc Doxazosin.',
          'Hội chẩn chuyên khoa tim mạch tuyến trên tìm nguyên nhân THA thứ phát.'
        ]
      }
    ],
    regimens: [
      {
        categoryName: '1. Phác đồ Khởi đầu - Phối hợp đôi cố định liều (A + C hoặc A + D)',
        targetPatient: 'Bệnh nhân Tăng HA không có biến chứng đặc biệt',
        drugs: [
          {
            drugName: 'Amlodipine + Perindopril',
            activeIngredient: 'Amlodipine besylate + Perindopril arginine',
            dosage: '5mg / 5mg (hoặc 5mg / 10mg)',
            route: 'Uống',
            frequency: '1 lần/ngày vào buổi sáng',
            priority: 'first_line',
            contraindications: ['Tiền sử phù mạch do ACEi', 'Hẹp động mạch thận hai bên', 'Phụ nữ có thai'],
            clinicalNotes: 'Uống trước bữa ăn sáng. Theo dõi ho khan do ACEi; nếu có ho, chuyển sang ARB (Telmisartan + Amlodipine).'
          },
          {
            drugName: 'Telmisartan + Amlodipine',
            activeIngredient: 'Telmisartan + Amlodipine',
            dosage: '40mg / 5mg (hoặc 80mg / 5mg)',
            route: 'Uống',
            frequency: '1 lần/ngày',
            priority: 'first_line',
            contraindications: ['Hạ huyết áp', 'Phụ nữ có thai hoặc cho con bú', 'Tắc mật nặng'],
            clinicalNotes: 'Lựa chọn thay thế hàng đầu khi bệnh nhân có phản ứng ho khan với ACEi. Hiệu quả hạ áp 24 giờ ổn định.'
          },
          {
            drugName: 'Losartan + Hydrochlorothiazide',
            activeIngredient: 'Losartan kali + HCTZ',
            dosage: '50mg / 12.5mg',
            route: 'Uống',
            frequency: '1 lần/ngày vào buổi sáng',
            priority: 'first_line',
            contraindications: ['Vô niệu', 'Mẫn cảm Sulfonamide', 'Hạ natri/kali máu nặng'],
            clinicalNotes: 'Rất thích hợp cho bệnh nhân cao tuổi hoặc có nguy cơ đột quỵ não.'
          }
        ]
      },
      {
        categoryName: '2. Phác đồ Phối hợp 3 thuốc (A + C + D)',
        targetPatient: 'Bệnh nhân chưa kiểm soát sau phối hợp đôi đủ liều',
        drugs: [
          {
            drugName: 'Perindopril + Indapamide + Amlodipine',
            activeIngredient: 'Perindopril + Indapamide + Amlodipine',
            dosage: '5mg / 1.25mg / 5mg (hoặc 10mg / 2.5mg / 10mg)',
            route: 'Uống',
            frequency: '1 viên/ngày vào buổi sáng',
            priority: 'combination',
            clinicalNotes: 'Viên 3 thành phần giúp đạt mục tiêu hạ áp trên >80% bệnh nhân THA kháng trị vừa.'
          }
        ]
      },
      {
        categoryName: '3. Phác đồ kèm Bệnh mạch vành / Suy tim phân suất tống máu giảm',
        targetPatient: 'Bệnh nhân có tiền sử nhồi máu cơ tim, đau thắt ngực hoặc suy tim (HFrEF)',
        drugs: [
          {
            drugName: 'Bisoprolol fumarate',
            activeIngredient: 'Bisoprolol',
            dosage: '2.5mg - 5mg (tăng dần đến 10mg)',
            route: 'Uống',
            frequency: '1 lần/ngày vào buổi sáng',
            priority: 'first_line',
            contraindications: ['Hen phế quản nặng', 'Block nhĩ thất độ 2-3', 'Nhịp tim chậm < 50 ck/phút', 'Sốc tim'],
            clinicalNotes: 'Bắt buộc chỉ định chẹn Beta giao cảm cho bệnh nhân sau nhồi máu cơ tim hoặc suy tim ổn định.'
          }
        ]
      }
    ],
    treatmentGoals: [
      { metric: 'Huyết áp phòng khám chung (< 65 tuổi)', targetValue: '< 130/80 mmHg', timeline: 'Đạt trong vòng 3 tháng', notes: 'Nếu dung nạp tốt, không hạ HATT < 120 mmHg' },
      { metric: 'Huyết áp người cao tuổi (≥ 65 tuổi)', targetValue: 'HATT 130 - 139 mmHg, HATTr < 80 mmHg', timeline: 'Hạ áp từ từ', notes: 'Cẩn thận hạ huyết áp tư thế đứng' },
      { metric: 'Bệnh nhân có Đái tháo đường / Bệnh thận mạn', targetValue: '< 130/80 mmHg', timeline: 'Kiểm soát chặt chẽ', notes: 'Ưu tiên ACEi hoặc ARB để bảo vệ thận' }
    ],
    redFlags: [
      'Huyết áp tăng vọt > 180/120 mmHg kèm đau đầu dữ dội, nhìn mờ, lú lẫn (Bệnh não do tăng HA).',
      'Đau ngực cấp kiểu đè ép lan lên cổ hoặc cánh tay trái (Nghi ngờ Hội chứng vành cấp).',
      'Khó thở dữ dội, thở nhanh nông, ran ẩm đầy 2 đáy phổi (Nghi ngờ Phù phổi cấp do suy tim trái cấp).',
      'Yếu liệt nửa người, méo miệng, nói ngọng đột ngột (Dấu hiệu Đột quỵ thiếu máu não hoặc Xuất huyết não).'
    ],
    lifestyleAdvice: [
      'Chế độ ăn giảm muối: Tiêu thụ dưới 5 gam muối (tương đương 1 thìa cà phê gạt) mỗi ngày.',
      'Tăng cường ăn rau xanh, trái cây tươi, ngũ cốc nguyên hạt, cá biển giàu Omega-3 (Chế độ ăn DASH).',
      'Hạn chế rượu bia: Nam không quá 2 đơn vị cồn/ngày, nữ không quá 1 đơn vị cồn/ngày.',
      'Duy trì cân nặng lý tưởng (BMI 18.5 - 22.9 kg/m2 theo chuẩn người châu Á), vòng bụng < 90cm ở nam và < 80cm ở nữ.',
      'Tập thể dục nhịp điệu vừa phải (đi bộ nhanh, bơi lội, đạp xe) ít nhất 30 - 45 phút/ngày, 5 - 7 ngày/tuần.'
    ]
  },
  {
    id: 'guide_anaphylaxis',
    title: 'Hướng dẫn Cấp cứu và Xử trí Sốc phản vệ',
    diseaseName: 'Phản vệ & Sốc phản vệ',
    icd10Codes: ['T78.2', 'T78.0'],
    groupId: 'grp_emergency',
    source: {
      organization: 'Bộ Y tế',
      documentNumber: 'Thông tư số 51/2017/TT-BYT',
      issueYear: 2017,
      signedDate: '29/12/2017',
      officialUrl: 'https://kcb.vn'
    },
    summary: 'Quy chuẩn bắt buộc trong toàn ngành y tế Việt Nam. ADRENALIN là thuốc thiết yếu duy nhất cứu sống người bệnh phản vệ, phải được tiêm bắp ngay lập tức khi xuất hiện triệu chứng từ Độ 2 trở lên, không được chậm trễ.',
    severityLevels: [
      { level: 'Độ 1 (Nhẹ)', criteria: 'Chỉ có triệu chứng ở da, tổ chức dưới da và niêm mạc (mày đay, ngứa, phù mạch)', color: '#FFC107', recommendedAction: 'Dùng thuốc kháng Histamin H1 hoặc Methylprednisolone uống/tiêm' },
      { level: 'Độ 2 (Nặng)', criteria: 'Có từ 2 biểu hiện ở nhiều cơ quan: Mày đay/phù mạch xuất hiện nhanh; Khó thở tức ngực; Nôn, đau bụng; HA chưa tụt hoặc tăng', color: '#FF9800', recommendedAction: 'TIÊM BẮP NGAY ADRENALIN 1/2 ống (người lớn) hoặc theo cân nặng (trẻ em)' },
      { level: 'Độ 3 (Nguy kịch)', criteria: 'Đường thở phù thanh quản; Thở rít, tím tái; Sốc, mạch nhanh nhỏ, tụt HA; Rối loạn ý thức', color: '#F44336', recommendedAction: 'Tiêm bắp ngay Adrenalin, nhắc lại mỗi 3-5 phút, thiết lập truyền tĩnh mạch Adrenalin, thở oxy, truyền dịch' },
      { level: 'Độ 4 (Ngừng tuần hoàn)', criteria: 'Ngừng thở, ngừng tim đột ngột sau khi tiếp xúc dị nguyên', color: '#B71C1C', recommendedAction: 'Hồi sinh tim phổi nâng cao (CPR) + Tiêm tĩnh mạch Adrenalin 1mg' }
    ],
    diagnosticCriteria: {
      clinical: [
        'Bệnh cảnh 1: Triệu chứng xuất hiện trong vài giây đến vài giờ ở da/niêm mạc CÙNG VỚI ít nhất 1 trong 2 triệu chứng hô hấp (khó thở, thở rít) hoặc tụt huyết áp/ngất.',
        'Bệnh cảnh 2: Có ít nhất 2 trong 4 biểu hiện sau tiếp xúc dị nguyên nghi ngờ: (a) Da niêm mạc; (b) Hô hấp; (c) Tụt HA hoặc rối loạn ý thức; (d) Tiêu hóa (nôn, đau bụng quặn).',
        'Bệnh cảnh 3: Tụt huyết áp đột ngột sau khi tiếp xúc với dị nguyên mà người bệnh đã từng bị dị ứng trước đó.'
      ],
      paraclinical: [
        'Chẩn đoán phản vệ HOÀN TOÀN DỰA VÀO LÂM SÀNG, không chờ đợi xét nghiệm cận lâm sàng.',
        'Định lượng Tryptase máu (sau cấp cứu ổn định để làm bằng chứng pháp y nếu cần).'
      ]
    },
    flowchartSteps: [
      {
        id: 'ana_step_1',
        stepNumber: 1,
        type: 'emergency',
        title: 'Bước 1: Cắt đứt tiếp xúc dị nguyên & Đặt tư thế cấp cứu',
        description: 'Ngừng ngay đường truyền thuốc/vắc xin nghi ngờ. Đặt bệnh nhân nằm tại chỗ, đầu thấp, chân kê cao (nếu nôn đặt nghiêng sang bên).',
        badge: 'Cấp cứu tối khẩn',
        badgeColor: '#F44336',
        keyActions: [
          'Ngừng tiêm truyền hoặc tiếp xúc ngay lập tức.',
          'Hô to gọi hỗ trợ từ mọi người xung quanh.',
          'Lấy hộp chống sốc phản vệ ngay lập tức.'
        ]
      },
      {
        id: 'ana_step_2',
        stepNumber: 2,
        type: 'treatment',
        title: 'Bước 2: TIÊM BẮP ADRENALIN 1mg/1ml NGAY LẬP TỨC',
        condition: 'Bệnh nhân có triệu chứng Phản vệ từ Độ 2 trở lên',
        description: 'Vị trí tiêm: Mặt trước ngoài đùi (giữa đùi). Liều dùng: Người lớn tiêm 1/2 ống (0.5ml = 0.5mg). Trẻ em: 0.01 mg/kg cân nặng.',
        badge: 'Thuốc cứu sinh',
        badgeColor: '#D32F2F',
        keyActions: [
          'Tiêm bắp ngay: Người lớn tiêm 1/2 ống (0.5ml). Trẻ >30kg tiêm 1/2 ống; Trẻ 10-30kg tiêm 1/3 ống; Trẻ <10kg tiêm 1/5 ống.',
          'Theo dõi huyết áp và nhịp thở mỗi 3 - 5 phút.',
          'NẾU HUYẾT ÁP CHƯA LÊN: Nhắc lại mũi tiêm bắp Adrenalin lần 2, lần 3 sau mỗi 3 - 5 phút.'
        ]
      },
      {
        id: 'ana_step_3',
        stepNumber: 3,
        type: 'treatment',
        title: 'Bước 3: Hỗ trợ hô hấp & Thiết lập đường truyền dịch nhanh',
        description: 'Thở Oxy gọng mũi 4-6 lít/phút hoặc Mask 8-10 lít/phút. Thiết lập ngay 1-2 đường truyền tĩnh mạch lớn (kim luồn 16G - 18G).',
        badge: 'Hồi sức dịch',
        badgeColor: '#2196F3',
        keyActions: [
          'Truyền tĩnh mạch nhanh dung dịch Natri Clorid 0.9% hoặc Ringer Lactate: 1 - 2 lít ở người lớn (trẻ em 10 - 20 ml/kg trong 10-20 phút đầu).',
          'Nếu có co thắt thanh quản/khó thở thanh môn: Chuẩn bị đặt nội khí quản hoặc mở khí quản cấp cứu.',
          'Khí dung Salbutamol 5mg nếu có co thắt phế quản kèm theo.'
        ]
      },
      {
        id: 'ana_step_4',
        stepNumber: 4,
        type: 'monitoring',
        title: 'Bước 4: Truyền tĩnh mạch Adrenalin liên tục & Thuốc phối hợp',
        condition: 'Sau 2-3 lần tiêm bắp Adrenalin mà huyết áp vẫn chưa hồi phục',
        description: 'Truyền tĩnh mạch liên tục Adrenalin qua bơm tiêm điện với liều khởi đầu 0.1 µg/kg/phút, điều chỉnh theo huyết áp mục tiêu (HATT ≥ 90 mmHg).',
        badge: 'Duy trì & Phòng pha 2',
        badgeColor: '#9C27B0',
        keyActions: [
          'Methylprednisolone 40 - 80mg tiêm tĩnh mạch (chống phản vệ pha 2 muộn).',
          'Diphenhydramine hoặc Dimedrol 10 - 20mg tiêm bắp/tĩnh mạch.',
          'Theo dõi bệnh nhân tại phòng cấp cứu tối thiểu 24 giờ liên tục sau khi hồi phục.'
        ]
      }
    ],
    regimens: [
      {
        categoryName: 'Thuốc cấp cứu thiết yếu số 1 (Bắt buộc dùng ngay)',
        targetPatient: 'Mọi đối tượng bị phản vệ từ Độ 2 trở lên',
        drugs: [
          {
            drugName: 'Adrenalin (Epinephrine) 1mg/1ml',
            activeIngredient: 'Adrenalin',
            dosage: 'Người lớn: 0.5ml (1/2 ống) tiêm bắp; Trẻ em: 0.01 mg/kg',
            route: 'Tiêm bắp mặt trước ngoài đùi',
            frequency: 'Nhắc lại mỗi 3 - 5 phút nếu huyết áp chưa lên',
            priority: 'first_line',
            contraindications: ['Không có chống chỉ định tuyệt đối trong cấp cứu sốc phản vệ'],
            clinicalNotes: 'Tiêm bắp ngay, không pha loãng. Tuyệt đối không tiêm tĩnh mạch trực tiếp dạng nguyên chất 1mg/1ml vì nguy cơ rung thất hoặc tai biến mạch não.'
          }
        ]
      },
      {
        categoryName: 'Thuốc hỗ trợ bổ sung (Chỉ dùng sau khi đã tiêm Adrenalin)',
        targetPatient: 'Bệnh nhân sau giai đoạn cấp cứu ban đầu',
        drugs: [
          {
            drugName: 'Methylprednisolone',
            activeIngredient: 'Methylprednisolone natri succinat',
            dosage: '40mg - 80mg (người lớn) hoặc 1-2 mg/kg (trẻ em)',
            route: 'Tiêm tĩnh mạch',
            frequency: 'Mỗi 6 - 8 giờ trong 24 giờ đầu',
            priority: 'second_line',
            clinicalNotes: 'Thuốc có tác dụng chậm sau 4 - 6 giờ, dùng để dự phòng phản ứng phản vệ tái phát pha 2, không thay thế được Adrenalin.'
          },
          {
            drugName: 'Diphenhydramine (Dimedrol)',
            activeIngredient: 'Diphenhydramine hydrochloride',
            dosage: '10mg - 25mg tiêm bắp hoặc tĩnh mạch chậm',
            route: 'Tiêm bắp',
            frequency: '1 lần',
            priority: 'second_line',
            clinicalNotes: 'Kháng thụ thể H1 giúp giảm mày đay ngứa và phù mạch niêm mạc.'
          }
        ]
      }
    ],
    treatmentGoals: [
      { metric: 'Huyết áp tâm thu', targetValue: '≥ 90 mmHg (người lớn) hoặc theo lứa tuổi trẻ em', timeline: 'Đạt ngay trong 5 - 10 phút đầu' },
      { metric: 'Độ bão hòa Oxy (SpO2)', targetValue: '≥ 95%', timeline: 'Duy trì liên tục bằng Oxy' },
      { metric: 'Thời gian theo dõi sau sốc', targetValue: 'Tối thiểu 24 - 48 giờ', timeline: 'Phòng ngừa phản vệ hai pha (Biphasic)' }
    ],
    redFlags: [
      'Khó thở thanh quản cấp, tiếng rít Stridor ngày càng tăng: Nguy cơ bít tắc đường thở hoàn toàn.',
      'Mạch nhanh nhỏ không bắt được, chi lạnh toát, nổi vân tím: Sốc giảm thể tích phân bố nặng.',
      'Co giật hoặc hôn mê sâu do thiếu oxy não.',
      'Phản vệ tái phát pha 2 (xuất hiện sau 4 - 8 giờ dù bệnh nhân đã tưởng chừng ổn định).'
    ],
    lifestyleAdvice: [
      'Ghi rõ tiền sử dị ứng thuốc/dị nguyên vào trang bìa sổ khám bệnh và bệnh án.',
      'Cấp Thẻ dị ứng hoặc Vòng đeo tay cảnh báo dị ứng cho bệnh nhân khi ra viện.',
      'Tuyệt đối không sử dụng lại thuốc hoặc hoạt chất cùng nhóm đã gây phản vệ.',
      'Bác sĩ/cơ sở y tế phải làm báo cáo biến cố bất lợi ADR gửi về Trung tâm ADR Quốc gia.'
    ]
  },
  {
    id: 'guide_diabetes_type2',
    title: 'Hướng dẫn Chẩn đoán và Điều trị Đái tháo đường típ 2',
    diseaseName: 'Đái tháo đường típ 2 (T2DM)',
    icd10Codes: ['E11', 'E11.9'],
    groupId: 'grp_endocrine',
    source: {
      organization: 'Bộ Y tế',
      documentNumber: 'Quyết định số 5481/QĐ-BYT',
      issueYear: 2020,
      signedDate: '30/12/2020',
      officialUrl: 'https://kcb.vn'
    },
    summary: 'Phác đồ kiểm soát đường huyết cá thể hóa dựa trên bệnh đồng mắc tim mạch và thận. Ưu tiên các nhóm thuốc mới (SGLT2i và GLP-1 RA) có bằng chứng bảo vệ tim - thận vượt trội độc lập với mức HbA1c.',
    severityLevels: [
      { level: 'Tiền đái tháo đường', criteria: 'Glucose đói 5.6 - 6.9 mmol/L hoặc HbA1c 5.7 - 6.4%', color: '#FFC107', recommendedAction: 'Can thiệp lối sống tích cực, giảm 5-7% cân nặng, kiểm tra lại sau 3-6 tháng' },
      { level: 'ĐTĐ típ 2 mới phát hiện (HbA1c < 9%)', criteria: 'FPG ≥ 7.0 mmol/L, HbA1c 6.5 - 8.9%', color: '#4CAF50', recommendedAction: 'Metformin + Thay đổi lối sống; cân nhắc phối hợp sớm nếu HbA1c > 7.5%' },
      { level: 'ĐTĐ típ 2 có nguy cơ tim mạch/thận cao', criteria: 'Có tiền sử xơ vữa mạch (ASCVD), suy tim (HF) hoặc suy thận (CKD)', color: '#FF9800', recommendedAction: 'Ưu tiên kết hợp Metformin + SGLT2i (Empagliflozin, Dapagliflozin) hoặc GLP-1 RA' },
      { level: 'ĐTĐ típ 2 mất bù (HbA1c ≥ 9.0% hoặc triệu chứng rầm rộ)', criteria: 'FPG ≥ 13.0 mmol/L, sụt cân nhiều, khát nhiều, tiểu nhiều', color: '#F44336', recommendedAction: 'Khởi trị ngay bằng Insulin nền phối hợp thuốc uống hoặc phác đồ Insulin nhiều mũi' }
    ],
    diagnosticCriteria: {
      clinical: [
        'Hội chứng 4 nhiều kinh điển: Ăn nhiều, uống nhiều, tiểu nhiều, sút cân không rõ nguyên nhân.',
        'Mệt mỏi kéo dài, nhìn mờ thoáng qua, vết thương khó lành, hay tái phát nhiễm nấm da/âm đạo.',
        'Đa số bệnh nhân giai đoạn sớm không có triệu chứng rõ rệt, phát hiện qua khám sức khỏe định kỳ.'
      ],
      paraclinical: [
        'Glucose huyết tương lúc đói (FPG) ≥ 7.0 mmol/L (≥ 126 mg/dL) sau nhịn đói tối thiểu 8 giờ (lặp lại 2 lần).',
        'Glucose huyết tương 2 giờ sau nghiệm pháp dung nạp 75g Glucose đường uống (OGTT) ≥ 11.1 mmol/L (≥ 200 mg/dL).',
        'HbA1c ≥ 6.5% (48 mmol/mol) thực hiện tại phòng xét nghiệm chuẩn hóa quốc tế NGSP/DCCT.',
        'Hoặc: Glucose huyết tương bất kỳ ≥ 11.1 mmol/L kèm triệu chứng kinh điển của tăng đường huyết.'
      ]
    },
    flowchartSteps: [
      {
        id: 'dm_step_1',
        stepNumber: 1,
        type: 'assessment',
        title: 'Bước 1: Chẩn đoán, đánh giá HbA1c & Biến chứng tim thận',
        description: 'Xác định chẩn đoán ĐTĐ típ 2. Kiểm tra eGFR, tỷ lệ UACR niệu và tiền sử bệnh tim mạch xơ vữa (nhồi máu cơ tim, đột quỵ) hoặc suy tim.',
        badge: 'Đánh giá ban đầu',
        badgeColor: '#2196F3',
        keyActions: [
          'Đo HbA1c, FPG, Lipid máu, Creatinine, eGFR, UACR, men gan AST/ALT.',
          'Khám bàn chân đái tháo đường, bắt mạch mu chân, thử cảm giác sợi monofilament.',
          'Soi đáy mắt tìm bệnh võng mạc đái tháo đường.'
        ]
      },
      {
        id: 'dm_step_2',
        stepNumber: 2,
        type: 'decision',
        title: 'Bước 2: Khởi trị nền tảng (Metformin + Lối sống)',
        condition: 'Bệnh nhân mới chẩn đoán, eGFR ≥ 30 ml/phút',
        description: 'Metformin là thuốc lựa chọn hàng đầu nếu không có chống chỉ định suy thận nặng (eGFR < 30 ml/phút). Bắt đầu liều thấp 500mg và tăng dần để tránh tác dụng phụ tiêu hóa.',
        badge: 'Lựa chọn hàng đầu',
        badgeColor: '#4CAF50',
        keyActions: [
          'Metformin 500mg - 1000mg/ngày, tăng dần đến 1500 - 2000mg/ngày sau bữa ăn.',
          'Dinh dưỡng tiết chế: Giảm tinh bột hấp thu nhanh, ăn nhiều chất xơ, tập luyện thể lực 150 phút/tuần.',
          'Nếu eGFR 30 - 44 ml/phút: Giảm tối đa liều Metformin xuống 1000mg/ngày. Nếu eGFR < 30: Chống chỉ định.'
        ]
      },
      {
        id: 'dm_step_3',
        stepNumber: 3,
        type: 'treatment',
        title: 'Bước 3: Phối hợp thuốc theo Kiểu hình bệnh đồng mắc (ASCVD / HF / CKD)',
        condition: 'Sau 3 tháng chưa đạt mục tiêu HbA1c hoặc có sẵn bệnh lý tim mạch thận',
        description: 'Bổ sung thuốc nhóm ức chế SGLT2 (Empagliflozin / Dapagliflozin) hoặc DPP-4i / Sulfonylurea / GLP-1 RA tùy theo điều kiện chi trả và chức năng thận.',
        badge: 'Cá thể hóa',
        badgeColor: '#FF9800',
        keyActions: [
          'Nếu có Suy tim (HF) hoặc Bệnh thận mạn (CKD eGFR 20-60): ƯU TIÊN SGLT2i (Dapagliflozin 10mg hoặc Empagliflozin 10mg).',
          'Nếu ưu tiên tránh hạ đường huyết: Thêm DPP-4i (Sitagliptin 100mg, Vildagliptin 50mg x 2).',
          'Nếu ưu tiên chi phí thấp: Thêm Sulfonylurea thế hệ mới (Gliclazide MR 30 - 60mg).'
        ]
      },
      {
        id: 'dm_step_4',
        stepNumber: 4,
        type: 'monitoring',
        title: 'Bước 4: Thêm Insulin nền nếu chưa đạt mục tiêu sau phối hợp thuốc uống',
        condition: 'HbA1c vẫn trên mục tiêu dù đã dùng 2-3 loại thuốc uống',
        description: 'Bắt đầu Insulin nền (Glargine U100/U300 hoặc Degludec, NPH) với liều khởi đầu 10 đơn vị/ngày hoặc 0.1 - 0.2 đơn vị/kg/ngày tiêm dưới da buổi tối.',
        badge: 'Insulin hóa',
        badgeColor: '#9C27B0',
        keyActions: [
          'Chỉnh liều Insulin nền tăng 2 đơn vị mỗi 3 ngày cho đến khi đường huyết đói đạt 4.4 - 7.0 mmol/L.',
          'Hướng dẫn bệnh nhân kỹ thuật tự tiêm bút tiêm Insulin và nhận biết triệu chứng hạ đường huyết.',
          'Vẫn tiếp tục duy trì Metformin và SGLT2i nếu không có chống chỉ định.'
        ]
      }
    ],
    regimens: [
      {
        categoryName: 'Thuốc uống điều trị nền tảng',
        targetPatient: 'Khởi trị hoặc phối hợp thuốc uống',
        drugs: [
          {
            drugName: 'Metformin hydrochloride',
            activeIngredient: 'Metformin',
            dosage: '500mg - 1000mg x 2 lần/ngày (tối đa 2000mg/ngày)',
            route: 'Uống',
            frequency: 'Uống ngay trong hoặc sau bữa ăn',
            priority: 'first_line',
            contraindications: ['Suy thận eGFR < 30 ml/phút', 'Nhiễm toan lactic', 'Suy gan nặng'],
            clinicalNotes: 'Thuốc nền tảng kinh điển, không gây hạ đường huyết khi đơn trị, giảm biến cố tim mạch lâu dài.'
          },
          {
            drugName: 'Dapagliflozin (Forxiga)',
            activeIngredient: 'Dapagliflozin',
            dosage: '10mg x 1 lần/ngày',
            route: 'Uống',
            frequency: '1 lần/ngày bất kỳ thời điểm nào',
            priority: 'first_line',
            contraindications: ['Đái tháo đường típ 1', 'Bệnh thận giai đoạn cuối lọc máu'],
            clinicalNotes: 'Nhóm ức chế SGLT2: Giảm tỷ lệ tử vong tim mạch, giảm nhập viện do suy tim và làm chậm tiến triển suy thận mạn.'
          },
          {
            drugName: 'Gliclazide MR',
            activeIngredient: 'Gliclazide',
            dosage: '30mg - 60mg (tối đa 120mg/ngày)',
            route: 'Uống',
            frequency: '1 lần/ngày vào bữa sáng',
            priority: 'second_line',
            contraindications: ['Dị ứng Sulfonylurea', 'Suy gan thận nặng', 'Nhiễm toan ceton'],
            clinicalNotes: 'Tăng tiết Insulin nhanh, giá thành rẻ. Cần dặn dò ăn uống đúng bữa để phòng ngừa hạ đường huyết.'
          }
        ]
      }
    ],
    treatmentGoals: [
      { metric: 'HbA1c mục tiêu chung', targetValue: '< 7.0%', timeline: 'Đánh giá lại mỗi 3 tháng', notes: 'Có thể nới lỏng < 7.5 - 8.0% ở người cao tuổi có nhiều bệnh lý phối hợp' },
      { metric: 'Đường huyết lúc đói (FPG)', targetValue: '4.4 - 7.2 mmol/L (80 - 130 mg/dL)', timeline: 'Theo dõi thường xuyên tại nhà' },
      { metric: 'Đường huyết sau ăn 2 giờ', targetValue: '< 10.0 mmol/L (< 180 mg/dL)', timeline: 'Đo sau bữa ăn' },
      { metric: 'Huyết áp kèm theo', targetValue: '< 130/80 mmHg', timeline: 'Bảo vệ mạch máu và thận' },
      { metric: 'LDL-Cholesterol', targetValue: '< 1.8 mmol/L (nguy cơ cao) hoặc < 1.4 mmol/L (nguy cơ rất cao)', timeline: 'Dùng Statin phối hợp' }
    ],
    redFlags: [
      'Hạ đường huyết nghiêm trọng (< 3.0 mmol/L) với triệu chứng vã mồ hôi lạnh, run tay, hôn mê: Cần cho uống nước đường hoặc tiêm Glucose 30% cấp cứu.',
      'Nhiễm toan Ceton đái tháo đường (DKA): Thở nhanh sâu kiểu Kussmaul, hơi thở mùi táo thối, đau bụng, lơ mơ.',
      'Hội chứng tăng áp lực thẩm thấu máu (HHS): Đường huyết > 33.3 mmol/L, mất nước nặng nề, tụt huyết áp, hôn mê.',
      'Loét bàn chân nhiễm trùng hoại tử, biến dạng móng chân: Nguy cơ đoạn chi cao, cần can thiệp ngoại khoa khẩn.'
    ],
    lifestyleAdvice: [
      'Chế độ ăn kiểm soát năng lượng: Hạn chế bánh kẹo ngọt, nước ngọt có ga, bánh mì trắng, xôi, gạo lứt thay cho gạo trắng.',
      'Tập luyện thể dục đều đặn: Tối thiểu 150 phút/tuần, không nghỉ quá 2 ngày liên tiếp.',
      'Chăm sóc bàn chân hàng ngày: Rửa chân nước ấm, lau khô kẽ chân, không đi chân trần, kiểm tra phát hiện sớm vết trầy xước.',
      'Tự theo dõi đường huyết mao mạch tại nhà bằng máy đo cá nhân.'
    ]
  },
  {
    id: 'guide_dengue',
    title: 'Hướng dẫn Chẩn đoán và Điều trị Sốt xuất huyết Dengue',
    diseaseName: 'Sốt xuất huyết Dengue',
    icd10Codes: ['A90', 'A91'],
    groupId: 'grp_infection',
    source: {
      organization: 'Bộ Y tế',
      documentNumber: 'Quyết định số 2760/QĐ-BYT',
      issueYear: 2023,
      signedDate: '04/07/2023',
      officialUrl: 'https://kcb.vn'
    },
    summary: 'Phác đồ cập nhật mới nhất của Bộ Y tế về giám sát sát sao giai đoạn nguy hiểm (ngày 3 đến ngày 7), nhận diện kịp thời dấu hiệu cảnh báo và kỹ thuật bù dịch chống sốc Dengue theo phác đồ giờ nghiêm ngặt, tránh quá tải dịch.',
    severityLevels: [
      { level: '1. SXH Dengue', criteria: 'Sốt cao đột ngột ngày 1-3 kèm nghiệm pháp dây thắt (+), đau mỏi cơ khớp, chưa có thoát huyết tương', color: '#4CAF50', recommendedAction: 'Điều trị ngoại trú, theo dõi sát, bù dịch đường uống (Oresol), tái khám hàng ngày' },
      { level: '2. SXH Dengue có Dấu hiệu Cảnh báo', criteria: 'Đau bụng vùng gan, nôn nhiều (≥3 lần/1h), ứ dịch màng phổi/bụng, gan to > 2cm, Hct tăng cao kèm tiểu cầu giảm nhanh', color: '#FF9800', recommendedAction: 'CHỈ ĐỊNH NHẬP VIỆN ĐIỀU TRỊ NỘI TRÚ NGAY, theo dõi sinh hiệu và Hct' },
      { level: '3. SXH Dengue Nặng (Sốc Dengue)', criteria: 'Sốc thoát huyết tương (huyết áp kẹp, tụt HA, mạch nhanh nhỏ), xuất huyết tiêu hóa nặng, suy tạng (men gan > 1000, suy thận)', color: '#F44336', recommendedAction: 'HỒI SỨC CẤP CỨU KHẨN CẤP, truyền dịch điện giải/cao phân tử theo phác đồ chống sốc giờ' }
    ],
    diagnosticCriteria: {
      clinical: [
        'Sốt cao đột ngột liên tục từ 2 - 7 ngày.',
        'Nghiệm pháp dây thắt (Lacet) dương tính hoặc xuất huyết dưới da dạng chấm/nốt.',
        'Nhức đầu, đau hốc mắt, đau cơ, đau khớp, chán ăn, buồn nôn.',
        'Giai đoạn nguy hiểm (từ ngày thứ 3 đến ngày thứ 7): Sốt có thể giảm nhưng biến chứng thoát huyết tương bắt đầu xuất hiện.'
      ],
      paraclinical: [
        'Xét nghiệm nhanh kháng nguyên Dengue NS1: Dương tính trong những ngày 1 - 4 của bệnh.',
        'Xét nghiệm kháng thể IgM/IgG Dengue: Dương tính từ ngày thứ 5 trở đi.',
        'Tổng phân tích tế bào máu: Hematocrit (Hct) tăng cao (dấu hiệu cô đặc máu do thoát dịch), Bạch cầu giảm, Tiểu cầu giảm (< 100.000 /µL).',
        'Siêu âm màng phổi, màng bụng phát hiện dịch tự do sớm.'
      ]
    },
    flowchartSteps: [
      {
        id: 'den_step_1',
        stepNumber: 1,
        type: 'assessment',
        title: 'Bước 1: Đánh giá giai đoạn bệnh & Tìm Dấu hiệu Cảnh báo',
        description: 'Xác định ngày thứ mấy của bệnh. Khám phát hiện các Dấu hiệu Cảnh báo (Warning Signs). Đo Hct và Tiểu cầu mỗi 12 - 24 giờ.',
        badge: 'Phân loại',
        badgeColor: '#2196F3',
        keyActions: [
          'Hỏi bệnh: Đau bụng nhiều ở vùng gan không? Có nôn ói liên tục không? Có chảy máu cam, chảy máu chân răng không?',
          'Đo mạch, huyết áp, độ kẹp huyết áp (HATT - HATTr ≤ 20 mmHg là cảnh báo sốc).',
          'Nếu KHÔNG có dấu hiệu cảnh báo và Hct bình thường: Hướng dẫn chăm sóc tại nhà, hẹn tái khám mỗi sáng.'
        ]
      },
      {
        id: 'den_step_2',
        stepNumber: 2,
        type: 'decision',
        title: 'Bước 2: Xử trí SXH Dengue có Dấu hiệu Cảnh báo',
        condition: 'Bệnh nhân có từ 1 dấu hiệu cảnh báo hoặc Hct tăng > 20%',
        description: 'Cho nhập viện. Khởi đầu bù dịch truyền Ringer Lactate hoặc Natri Clorid 0.9% với lưu lượng giảm dần: 6 - 7 ml/kg/giờ trong 1 - 2 giờ đầu, sau đó giảm xuống 5 ml/kg/giờ trong 2 - 4 giờ, rồi 3 ml/kg/giờ.',
        badge: 'Truyền dịch theo giờ',
        badgeColor: '#FF9800',
        keyActions: [
          'Chỉ định truyền dịch tĩnh mạch đẳng trương nếu bệnh nhân không uống được hoặc nôn nhiều.',
          'Đo lại Hct trước và sau mỗi đợt truyền dịch để điều chỉnh tốc độ.',
          'Tuyệt đối ngưng truyền dịch ngay khi huyết động ổn định và hết giai đoạn nguy hiểm (sau ngày thứ 7).'
        ]
      },
      {
        id: 'den_step_3',
        stepNumber: 3,
        type: 'emergency',
        title: 'Bước 3: Hồi sức Cấp cứu Sốc Dengue',
        condition: 'Bệnh nhân có mạch nhanh nhỏ, huyết áp kẹp (≤ 20 mmHg) hoặc tụt HA',
        description: 'Truyền dịch chống sốc khẩn trương: Ringer Lactate 15 ml/kg/giờ trong giờ đầu. Đánh giá lại mạch, HA, Hct.',
        badge: 'Chống sốc',
        badgeColor: '#F44336',
        keyActions: [
          'Nếu sốc hồi phục: Giảm tốc độ truyền xuống 10 ml/kg/giờ -> 7.5 ml/kg/giờ -> 5 ml/kg/giờ -> 3 ml/kg/giờ.',
          'Nếu sốc không cải thiện và Hct vẫn tăng cao: Chuyển sang Dung dịch Cao phân tử (Dextran 40 hoặc HES 200/0.5 6%) 10 - 15 ml/kg/giờ.',
          'Nếu sốc không cải thiện nhưng Hct tụt nhanh: Nghi ngờ XUẤT HUYẾT NỘI TẠNG ẨN, chỉ định truyền Máu toàn phần hoặc Khối hồng cầu cấp cứu.'
        ]
      }
    ],
    regimens: [
      {
        categoryName: 'Thuốc hạ sốt và bù dịch đường uống',
        targetPatient: 'Mọi bệnh nhân sốt xuất huyết Dengue',
        drugs: [
          {
            drugName: 'Paracetamol',
            activeIngredient: 'Paracetamol',
            dosage: '10 - 15 mg/kg mỗi 4 - 6 giờ (người lớn tối đa 2g/ngày)',
            route: 'Uống',
            frequency: 'Khi sốt ≥ 38.5°C',
            priority: 'first_line',
            contraindications: ['TUYỆT ĐỐI CHỐNG CHỈ ĐỊNH ASPIRIN VÀ IBUPROFEN / NSAID do nguy cơ gây xuất huyết dạ dày nặng nề'],
            clinicalNotes: 'Chỉ dùng Paracetamol đơn chất, không lạm dụng quá 4 lần/ngày vì nguy cơ gây độc tế bào gan.'
          },
          {
            drugName: 'Oresol (Dung dịch bù nước điện giải Oresol)',
            activeIngredient: 'Glucose, Natri clorid, Kali clorid, Natri citrat',
            dosage: 'Pha đúng chuẩn 1 gói với đúng thể tích nước quy định',
            route: 'Uống',
            frequency: 'Uống rải rác trong ngày theo nhu cầu',
            priority: 'first_line',
            clinicalNotes: 'Uống nhiều nước oresol, nước trái cây tươi (nước cam, nước dừa), nước cháo loãng với muối.'
          }
        ]
      }
    ],
    treatmentGoals: [
      { metric: 'Huyết áp và mạch', targetValue: 'Mạch rõ, HATT > 90 mmHg, HA không kẹp (> 25 mmHg)', timeline: 'Theo dõi mỗi 1 - 2 giờ trong giai đoạn sốc' },
      { metric: 'Hematocrit (Hct)', targetValue: 'Duy trì ở mức ổn định gần với trị số nền ban đầu', timeline: 'Kiểm tra theo dõi sát' },
      { metric: 'Lượng nước tiểu', targetValue: '≥ 0.5 - 1 ml/kg/giờ', timeline: 'Chỉ số tưới máu thận tốt' }
    ],
    redFlags: [
      'Đau bụng nhiều, tăng dần ở hạ sườn phải: Dấu hiệu cảnh báo thoát huyết tương nặng bao gan.',
      'Nôn nhiều liên tục hoặc nôn ra dịch nâu đen / máu tươi: Dấu hiệu xuất huyết tiêu hóa.',
      'Chân tay lạnh ngắt, da nhớp nháp mồ hôi, li bì hoặc vật vã kích thích: Dấu hiệu vào sốc.',
      'Tiểu ít hoặc không có nước tiểu trong 6 - 8 giờ liên tục.'
    ],
    lifestyleAdvice: [
      'Nằm nghỉ ngơi tuyệt đối tại giường, tránh vận động gắng sức.',
      'Ăn thức ăn mềm, lỏng, dễ tiêu hóa (cháo, súp), không ăn thức ăn hoặc uống nước có màu đỏ/đen/nâu để tránh nhầm với xuất huyết tiêu hóa.',
      'Nằm màn kể cả ban ngày để tránh muỗi Aedes đốt lây truyền cho người trong gia đình.'
    ]
  },
  {
    id: 'guide_asthma',
    title: 'Hướng dẫn Chẩn đoán và Điều trị Hen phế quản (Người lớn & Trẻ em)',
    diseaseName: 'Hen phế quản (Khí phế thũng do hen)',
    icd10Codes: ['J45', 'J45.9'],
    groupId: 'grp_respiratory',
    source: {
      organization: 'Bộ Y tế',
      documentNumber: 'Quyết định số 1851/QĐ-BYT',
      issueYear: 2020,
      signedDate: '24/04/2020',
      officialUrl: 'https://kcb.vn'
    },
    summary: 'Phác đồ kiểm soát hen theo 5 bậc của Bộ Y tế và GINA. Khuyến cáo mang tính cách mạng: Không còn khuyến cáo dùng đơn trị liệu SABA cắt cơn đơn thuần vì nguy cơ tăng tử vong do hen; Thay vào đó là dùng ICS-Formoterol liều thấp vừa kiểm soát vừa cắt cơn ngay từ Bậc 1.',
    severityLevels: [
      { level: 'Bậc 1 - 2 (Hen nhẹ)', criteria: 'Triệu chứng < 2 lần/tháng (Bậc 1) hoặc ≥ 2 lần/tháng nhưng không hàng ngày (Bậc 2)', color: '#4CAF50', recommendedAction: 'ICS-Formoterol liều thấp khi cần, hoặc ICS duy trì liều thấp hàng ngày' },
      { level: 'Bậc 3 (Hen trung bình)', criteria: 'Triệu chứng hầu hết các ngày hoặc thức giấc vì hen ≥ 1 lần/tuần', color: '#FF9800', recommendedAction: 'ICS-Formoterol liều thấp duy trì và cắt cơn (SMART)' },
      { level: 'Bậc 4 - 5 (Hen nặng)', criteria: 'Triệu chứng hàng ngày, thức giấc vì hen thường xuyên, chức năng phổi FEV1 < 60%', color: '#F44336', recommendedAction: 'ICS-LABA liều trung bình/cao, cân nhắc phối hợp LAMA (Tiotropium) hoặc kháng sinh học' },
      { level: 'Cơn hen phế quản cấp', criteria: 'Khó thở cấp tính, thở rít, co kéo cơ hô hấp phụ, nói từng từ, PEF < 50%', color: '#D32F2F', recommendedAction: 'CẤP CỨU: Khí dung Salbutamol + Ipratropium, Corticosteroid toàn thân, Oxy' }
    ],
    diagnosticCriteria: {
      clinical: [
        'Khó thở từng cơn tái phát, thở khò khè, nặng ngực, ho khan (đặc biệt về đêm hoặc sáng sớm).',
        'Triệu chứng thay đổi theo thời gian và cường độ, thường khởi phát sau gắng sức, cười to, tiếp xúc dị nguyên hoặc thay đổi thời tiết.',
        'Tiền sử bản thân hoặc gia đình có cơ địa dị ứng (viêm mũi dị ứng, chàm eczema).'
      ],
      paraclinical: [
        'Hô hấp ký: Rối loạn thông khí tắc nghẽn có hồi phục (FEV1/FVC < 0.70; FEV1 tăng ≥ 12% VÀ ≥ 200 ml sau khi hít 400 µg Salbutamol).',
        'Dao động lưu lượng đỉnh (PEF): Biến thiên PEF ngày đêm > 10% ở người lớn (> 13% ở trẻ em).'
      ]
    },
    flowchartSteps: [
      {
        id: 'asthma_step_1',
        stepNumber: 1,
        type: 'assessment',
        title: 'Bước 1: Chẩn đoán xác định & Đánh giá mức độ kiểm soát hen',
        description: 'Phân loại theo GINA: Kiểm soát tốt, Kiểm soát một phần, Không kiểm soát. Kiểm tra kỹ thuật dùng bình hít của bệnh nhân.',
        badge: 'Đánh giá',
        badgeColor: '#2196F3',
        keyActions: [
          'Hỏi 4 câu hỏi GINA trong 4 tuần qua: Triệu chứng ban ngày > 2 lần/tuần? Thức giấc ban đêm do hen? Dùng thuốc cắt cơn > 2 lần/tuần? Giới hạn hoạt động do hen?',
          'Quan sát trực tiếp bệnh nhân thực hiện thao tác hít thuốc (bình xịt định liều MDI hoặc bình hít bột khô DPI).'
        ]
      },
      {
        id: 'asthma_step_2',
        stepNumber: 2,
        type: 'treatment',
        title: 'Bước 2: Phác đồ duy trì & cắt cơn theo bậc (Bậc 1 đến 5)',
        description: 'Lựa chọn ưu tiên: Sử dụng ICS-Formoterol liều thấp làm thuốc kiểm soát kiêm cắt cơn (Liệu pháp SMART/MART).',
        badge: 'Kiểm soát dài hạn',
        badgeColor: '#4CAF50',
        keyActions: [
          'Bậc 1 - 2: Budesonide/Formoterol (160/4.5 µg) 1 nhát hít khi có triệu chứng khó thở.',
          'Bậc 3: Budesonide/Formoterol (160/4.5 µg) 1 nhát hít x 2 lần/ngày (sáng/tối) + hít thêm khi khó thở.',
          'Bậc 4: Tăng lên Budesonide/Formoterol (160/4.5 µg) 2 nhát hít x 2 lần/ngày.',
          'Nếu sau 3 tháng hen được kiểm soát tốt hoàn toàn: Cân nhắc hạ bậc điều trị từ từ.'
        ]
      },
      {
        id: 'asthma_step_3',
        stepNumber: 3,
        type: 'emergency',
        title: 'Bước 3: Xử trí Cơn hen phế quản cấp tính tại phòng khám/cấp cứu',
        condition: 'Bệnh nhân lên cơn khó thở dữ dội, co kéo hõm ức, PEF < 50%',
        description: 'Xử trí khẩn cấp: Thở Oxy duy trì SpO2 93 - 95%, Khí dung thuốc giãn phế quản tác dụng ngắn kết hợp và dùng Corticosteroid toàn thân sớm.',
        badge: 'Xử trí cơn cấp',
        badgeColor: '#F44336',
        keyActions: [
          'Khí dung Salbutamol 5mg + Ipratropium bromide 0.5mg (Ventolin + Combivent) 3 liều liên tiếp cách nhau 20 phút trong giờ đầu.',
          'Uống hoặc tiêm tĩnh mạch Methylprednisolone 40mg (hoặc Prednisolone 1mg/kg).',
          'Đánh giá lại sau 1 giờ: Nếu cải thiện tốt cho về duy trì thuốc hít; nếu không cải thiện, chỉ định nhập viện.'
        ]
      }
    ],
    regimens: [
      {
        categoryName: 'Thuốc kiểm soát hen duy trì và cắt cơn',
        targetPatient: 'Bệnh nhân hen ngoại trú',
        drugs: [
          {
            drugName: 'Budesonide + Formoterol (Symbicort Turbuhaler)',
            activeIngredient: 'Budesonide + Formoterol fumarate',
            dosage: '160/4.5 µg (1 - 2 nhát hít x 2 lần/ngày + hít khi khó thở)',
            route: 'Khí dung/Hít',
            frequency: 'Hàng ngày sáng - tối',
            priority: 'first_line',
            contraindications: ['Dị ứng với protein sữa (dạng bột khô)', 'Rối loạn nhịp tim nhanh nặng'],
            clinicalNotes: 'BẮT BUỘC SÚC MIỆNG VÀ NHỔ RA sau mỗi lần hít thuốc để phòng ngừa nấm họng miệng (tưa miệng) và khản tiếng.'
          },
          {
            drugName: 'Salbutamol (Ventolin Inhaler)',
            activeIngredient: 'Salbutamol',
            dosage: '100 µg (1 - 2 nhát xịt cắt cơn cấp)',
            route: 'Khí dung/Hít',
            frequency: 'Khi có cơn khó thở',
            priority: 'alternative',
            clinicalNotes: 'Chỉ dùng cắt cơn ngắn hạn. Nếu phải dùng > 2 lần/tuần chứng tỏ hen chưa được kiểm soát, cần tăng liều thuốc hít ngừa cơn ICS.'
          }
        ]
      }
    ],
    treatmentGoals: [
      { metric: 'Mức độ kiểm soát cơn', targetValue: 'Không có triệu chứng ban ngày hoặc < 2 lần/tuần', timeline: 'Đánh giá sau mỗi 1-3 tháng' },
      { metric: 'Thức giấc ban đêm do hen', targetValue: '0 lần/tháng', timeline: 'Duy trì bền vững' },
      { metric: 'Chức năng thông khí phổi (PEF / FEV1)', targetValue: '≥ 80% giá trị dự đoán', timeline: 'Đo định kỳ' }
    ],
    redFlags: [
      'Bệnh nhân nói từng từ, vã mồ hôi, co kéo toàn bộ cơ hô hấp phụ: Cơn hen phế quản nặng đe dọa tính mạng.',
      'Lồng ngực im lặng ("Silent chest"): Nghe phổi không còn tiếng ran rít do luồng khí quá yếu, nguy cơ ngừng thở trong vài phút.',
      'Mạch nghịch thường (> 20 mmHg) hoặc huyết áp tụt, SpO2 < 90% dù đang thở oxy.',
      'Ý thức lú lẫn, ngủ gà, kiệt sức cơ hoành: Chỉ định đặt nội khí quản và thở máy ngay.'
    ],
    lifestyleAdvice: [
      'Tránh các yếu tố kích phát cơn hen: Khói thuốc lá, khói hương nhang, lông chó mèo, phấn hoa, gián nhà, nấm mốc.',
      'Vệ sinh chăn ga gối đệm định kỳ bằng nước nóng 60°C để tiêu diệt mạt bụi nhà.',
      'Khởi động kỹ trước khi tập thể dục; nếu có hen do gắng sức, hít 1 nhát thuốc trước khi tập 15 phút.',
      'Tiêm phòng vắc xin Cúm hàng năm và vắc xin Phế cầu để phòng ngừa nhiễm trùng hô hấp kích phát cơn hen.'
    ]
  },
  {
    id: 'guide_gastro_ulcer',
    title: 'Hướng dẫn Chẩn đoán và Điều trị Loét Dạ dày Tá tràng & Diệt H. pylori',
    diseaseName: 'Viêm loét dạ dày tá tràng có nhiễm Helicobacter pylori',
    icd10Codes: ['K25', 'K26', 'K29'],
    groupId: 'grp_gastro',
    source: {
      organization: 'Bộ Y tế',
      documentNumber: 'Quyết định số 468/QĐ-BYT',
      issueYear: 2021,
      signedDate: '15/01/2021',
      officialUrl: 'https://kcb.vn'
    },
    summary: 'Phác đồ điều trị tiệt trừ H. pylori 4 thuốc có Bismuth trong 14 ngày là phác đồ hàng 1 được khuyến cáo mạnh mẽ nhất tại Việt Nam do tỷ lệ kháng thuốc Clarithromycin vượt quá 20%.',
    severityLevels: [
      { level: 'Viêm dạ dày trợt nông', criteria: 'Niêm mạc xung huyết, trợt nhẹ trên nội soi, không có ổ loét sâu', color: '#4CAF50', recommendedAction: 'Dùng PPI 4 - 8 tuần, thay đổi chế độ ăn' },
      { level: 'Ổ loét dạ dày / tá tràng tiến triển', criteria: 'Ổ loét đường kính ≥ 5mm, đáy có giả mạc, test H. pylori (+)', color: '#FF9800', recommendedAction: 'Phác đồ tiệt trừ H. pylori 4 thuốc 14 ngày + duy trì PPI' },
      { level: 'Loét biến chứng Xuất huyết tiêu hóa', criteria: 'Nôn ra máu, đi ngoài phân đen, nội soi Forrest I hoặc II', color: '#F44336', recommendedAction: 'CẤP CỨU: Hồi sức dịch, tiêm tĩnh mạch PPI liều cao (Bolus 80mg + truyền 8mg/h trong 72h), can thiệp nội soi' }
    ],
    diagnosticCriteria: {
      clinical: [
        'Đau vùng thượng vị: Loét tá tràng thường đau khi đói, về đêm, ăn vào đỡ đau; Loét dạ dày đau sau khi ăn.',
        'Ợ hơi, ợ chua, buồn nôn, cảm giác đầy bụng khó tiêu, chán ăn.',
        'Dấu hiệu cảnh báo: Sụt cân nhanh không rõ nguyên nhân, nuốt nghẹn, nôn tái diễn, thiếu máu.'
      ],
      paraclinical: [
        'Nội soi thực quản - dạ dày - tá tràng (tiêu chuẩn vàng): Xác định vị trí, kích thước, phân độ Forrest của ổ loét và bấm sinh thiết.',
        'Test Urease nhanh (CLO test) từ mảnh sinh thiết dạ dày: Độ nhạy và độ đặc hiệu > 95%.',
        'Test hơi thở C13/C14 (Urea Breath Test): Phương pháp không xâm lấn tốt nhất để kiểm tra kết quả tiệt trừ H. pylori sau điều trị.'
      ]
    },
    flowchartSteps: [
      {
        id: 'pud_step_1',
        stepNumber: 1,
        type: 'diagnostic',
        title: 'Bước 1: Nội soi chẩn đoán & Xét nghiệm H. pylori',
        description: 'Nội soi dạ dày đánh giá ổ loét. Chỉ định làm CLO test hoặc Test hơi thở (người bệnh phải ngưng PPI ít nhất 2 tuần và kháng sinh 4 tuần trước khi test).',
        badge: 'Nội soi & Test',
        badgeColor: '#2196F3',
        keyActions: [
          'Nếu ổ loét dạ dày: Bắt buộc sinh thiết bờ ổ loét để loại trừ ung thư dạ dày thể loét.',
          'Nếu loét tá tràng: Hầu hết là lành tính, sinh thiết niêm mạc hang vị tìm H. pylori.'
        ]
      },
      {
        id: 'pud_step_2',
        stepNumber: 2,
        type: 'treatment',
        title: 'Bước 2: Phác đồ tiệt trừ H. pylori 4 thuốc có Bismuth 14 ngày',
        condition: 'Bệnh nhân có xét nghiệm H. pylori dương tính',
        description: 'Phác đồ chuẩn 14 ngày: PPI (liều chuẩn x 2 lần/ngày) + Bismuth subcitrate + Metronidazole + Tetracycline.',
        badge: 'Phác đồ 4 thuốc (Chuẩn BYT)',
        badgeColor: '#4CAF50',
        keyActions: [
          'Esomeprazole 40mg x 2 lần/ngày (uống trước ăn sáng và trước ăn tối 30 phút).',
          'Bismuth subcitrate 120mg x 4 viên/ngày (hoặc 240mg x 2 lần/ngày).',
          'Tetracycline 500mg x 4 lần/ngày (uống sau ăn).',
          'Metronidazole 500mg x 3 lần/ngày (uống trong hoặc sau bữa ăn).'
        ]
      },
      {
        id: 'pud_step_3',
        stepNumber: 3,
        type: 'monitoring',
        title: 'Bước 3: Duy trì làm lành ổ loét & Kiểm tra tiệt trừ',
        description: 'Sau 14 ngày kháng sinh, tiếp tục duy trì PPI liều chuẩn 1 lần/ngày trong 4 - 8 tuần để ổ loét lành sẹo hoàn toàn. Làm test hơi thở C13 sau khi ngưng thuốc để xác nhận hết vi khuẩn.',
        badge: 'Lành sẹo & Tái khám',
        badgeColor: '#9C27B0',
        keyActions: [
          'Tiếp tục Esomeprazole 40mg/ngày trong 4 tuần (loét tá tràng) hoặc 8 tuần (loét dạ dày).',
          'Ngưng PPI ít nhất 2 tuần trước khi làm Test hơi thở C13/C14 đánh giá thành công tiệt trừ.',
          'Nội soi kiểm tra lại đối với loét dạ dày để đảm bảo đã lành sẹo lành tính.'
        ]
      }
    ],
    regimens: [
      {
        categoryName: 'Phác đồ tiệt trừ H. pylori 4 thuốc có Bismuth (Bismuth Quadruple Therapy)',
        targetPatient: 'Bệnh nhân loét có H. pylori (+)',
        drugs: [
          {
            drugName: 'Esomeprazole (Nexium)',
            activeIngredient: 'Esomeprazole',
            dosage: '40mg x 2 lần/ngày',
            route: 'Uống',
            frequency: 'Trước bữa ăn 30 - 60 phút',
            priority: 'first_line',
            clinicalNotes: 'Ức chế tiết acid mạnh, duy trì pH dạ dày > 6 để kháng sinh đạt hiệu lực tối đa.'
          },
          {
            drugName: 'Bismuth subcitrate (Trymo)',
            activeIngredient: 'Bismuth subcitrate',
            dosage: '120mg x 4 viên/ngày (hoặc 240mg x 2 lần/ngày)',
            route: 'Uống',
            frequency: 'Trước bữa ăn',
            priority: 'first_line',
            clinicalNotes: 'Bảo vệ niêm mạc và trực tiếp diệt khuẩn H. pylori. Cần dặn bệnh nhân phân sẽ chuyển sang màu đen lành tính.'
          },
          {
            drugName: 'Tetracycline hydrochloride',
            activeIngredient: 'Tetracycline',
            dosage: '500mg x 4 lần/ngày',
            route: 'Uống',
            frequency: 'Sau ăn và trước khi ngủ kèm nhiều nước',
            priority: 'first_line',
            contraindications: ['Phụ nữ có thai, cho con bú', 'Trẻ em dưới 8 tuổi (gây hỏng men răng và vàng răng vĩnh viễn)'],
            clinicalNotes: 'Uống với nhiều nước ở tư thế đứng để tránh loét thực quản.'
          },
          {
            drugName: 'Metronidazole',
            activeIngredient: 'Metronidazole',
            dosage: '500mg x 3 lần/ngày',
            route: 'Uống',
            frequency: 'Sau ăn',
            priority: 'first_line',
            contraindications: ['Uống rượu bia (gây phản ứng cai giống Disulfiram dữ dội)'],
            clinicalNotes: 'Tuyệt đối kiêng rượu bia trong suốt thời gian uống thuốc và 48 giờ sau khi ngưng.'
          }
        ]
      }
    ],
    treatmentGoals: [
      { metric: 'Tiệt trừ thành công vi khuẩn H. pylori', targetValue: 'Test hơi thở C13 âm tính sau 4 tuần ngưng kháng sinh', timeline: 'Đánh giá sau kết thúc phác đồ' },
      { metric: 'Lành sẹo ổ loét hoàn toàn', targetValue: 'Hết triệu chứng đau rát và lành ổ loét trên nội soi', timeline: 'Sau 4 - 8 tuần điều trị' }
    ],
    redFlags: [
      'Nôn ra máu tươi hoặc dịch có cặn bã cà phê.',
      'Đi ngoài phân đen nhánh như bã hắc ín, có mùi khẳm đặc trưng.',
      'Đau bụng đột ngột dữ dội như dao đâm, bụng cứng như gỗ: Dấu hiệu Thủng ổ loét dạ dày tá tràng, cần mổ cấp cứu ngay.',
      'Hẹp môn vị: Nôn ra thức ăn cũ của ngày hôm trước sau ăn vài giờ.'
    ],
    lifestyleAdvice: [
      'Ăn uống điều độ, đúng giờ, không để bụng quá đói hoặc ăn quá no.',
      'Tránh thức ăn chua cay, nhiều dầu mỡ, đồ uống có ga, cà phê đậm đặc, rượu bia.',
      'Bỏ hoàn toàn thuốc lá (chất Nicotin làm giảm tưới máu niêm mạc và ức chế tiết dịch nhầy bảo vệ).',
      'Hạn chế căng thẳng thần kinh, thức khuya; thận trọng khi dùng các thuốc giảm đau kháng viêm NSAID và Corticoid.'
    ]
  },
  {
    id: 'guide_acute_gout',
    title: 'Hướng dẫn Chẩn đoán và Điều trị Cơn Gout cấp & Kiểm soát Gout mạn',
    diseaseName: 'Bệnh Gút (Gout)',
    icd10Codes: ['M10', 'M10.9'],
    groupId: 'grp_rheuma',
    source: {
      organization: 'Bộ Y tế',
      documentNumber: 'Quyết định số 448/QĐ-BYT',
      issueYear: 2021,
      signedDate: '01/02/2021',
      officialUrl: 'https://kcb.vn'
    },
    summary: 'Chiến lược điều trị 2 giai đoạn: (1) Cắt cơn viêm khớp gout cấp tính càng sớm càng tốt bằng Colchicine liều thấp hoặc NSAID/Corticoid; (2) Hạ acid uric máu mạn tính đạt mục tiêu đích điều trị để hòa tan tinh thể urat và ngăn ngừa hủy hoại khớp.',
    severityLevels: [
      { level: 'Tăng Acid Uric máu không triệu chứng', criteria: 'Acid uric > 420 µmol/L (nam) hoặc > 360 µmol/L (nữ) nhưng chưa từng có cơn viêm khớp', color: '#4CAF50', recommendedAction: 'Chủ yếu điều chỉnh chế độ ăn uống, vận động, chưa cần dùng thuốc hạ AU trừ khi > 540 µmol/L kèm nguy cơ tim mạch' },
      { level: 'Cơn Gout cấp tính', criteria: 'Sưng nóng đỏ đau dữ dội khớp bàn ngón chân cái (khớp MTP 1) hoặc cổ chân, khởi phát đột ngột về đêm', color: '#F44336', recommendedAction: 'Dùng Colchicine liều thấp (1mg ngay + 0.5mg sau 1h) hoặc NSAID sớm trong 12 - 24h đầu' },
      { level: 'Gout mạn tính có hạt Tophi', criteria: 'Có các nốt tophi dưới da, hủy hoại khớp trên X-quang, sỏi thận acid uric', color: '#9C27B0', recommendedAction: 'Hạ Acid Uric lâu dài với Allopurinol hoặc Febuxostat đạt đích < 300 µmol/L kèm dự phòng cơn cấp' }
    ],
    diagnosticCriteria: {
      clinical: [
        'Cơn viêm khớp bùng phát đột ngột về đêm, thường ở khớp bàn ngón chân 1 (khớp ngón chân cái), sưng tấy, đỏ, đau đến mức không thể chạm ga trải giường.',
        'Đau đạt đỉnh trong vòng 12 - 24 giờ đầu, sau đó tự thuyên giảm dần sau 7 - 14 ngày dù không điều trị.',
        'Tiền sử xuất hiện sau bữa ăn nhiều đạm (hải sản, thịt chó, nội tạng) hoặc sau uống bia rượu nhiều.'
      ],
      paraclinical: [
        'Tìm thấy tinh thể Urat Monosodium (hình kim, lưỡng chiết quang âm) trong dịch khớp dưới kính hiển vi phân cực (tiêu chuẩn vàng).',
        'Định lượng Acid Uric máu: Thường tăng cao > 420 µmol/L (tuy nhiên trong cơn cấp, khoảng 20-30% bệnh nhân có thể có nồng độ AU bình thường do lắng đọng vào khớp).',
        'Siêu âm khớp: Hình ảnh "đường đôi" (Double contour sign) đặc trưng cho lắng đọng tinh thể urat trên bề mặt sụn khớp.',
        'X-quang khớp: Hình ảnh khuyết xương hình móc "hang chuột khoét" ở giai đoạn mạn tính.'
      ]
    },
    flowchartSteps: [
      {
        id: 'gout_step_1',
        stepNumber: 1,
        type: 'emergency',
        title: 'Bước 1: Cắt cơn viêm khớp Gout cấp (Dùng càng sớm càng tốt)',
        description: 'Bắt đầu dùng thuốc ngay trong vòng 12 - 24 giờ đầu kể từ khi khởi phát cơn đau. Khuyến cáo dùng Colchicine liều thấp kết hợp hoặc NSAID.',
        badge: 'Cắt cơn cấp',
        badgeColor: '#F44336',
        keyActions: [
          'Phác đồ Colchicine liều thấp: Uống 1mg ngay lập tức, sau 1 giờ uống tiếp 0.5mg (Tổng ngày đầu: 1.5mg). Những ngày sau uống 0.5mg - 1mg/ngày.',
          'Hoặc NSAID chọn lọc COX-2 (Celecoxib 200mg x 2 lần/ngày hoặc Etoricoxib 90mg/ngày) nếu không có suy thận hay loét dạ dày.',
          'Nếu suy thận nặng hoặc không dung nạp: Dùng Prednisolone 30 - 35 mg/ngày trong 3 - 5 ngày rồi giảm liều.',
          'TUYỆT ĐỐI KHÔNG BẮT ĐẦU HOẶC THAY ĐỔI LIỀU THUỐC HẠ ACID URIC TRONG CƠN CẤP (nhưng nếu bệnh nhân đang uống sẵn từ trước thì vẫn duy trì).'
        ]
      },
      {
        id: 'gout_step_2',
        stepNumber: 2,
        type: 'treatment',
        title: 'Bước 2: Bắt đầu thuốc hạ Acid Uric máu (Sau khi cơn cấp đã lui 2-4 tuần)',
        description: 'Khởi đầu thuốc hạ Acid Uric máu liều thấp, tăng dần mỗi 2 - 4 tuần kết hợp dùng thuốc dự phòng cơn gút cấp trong 3 - 6 tháng đầu.',
        badge: 'Hạ Acid Uric',
        badgeColor: '#2196F3',
        keyActions: [
          'Thuốc hàng 1: Allopurinol bắt đầu liều thấp 100mg/ngày (50mg nếu suy thận), tăng dần liều mỗi 2 - 4 tuần cho đến khi đạt đích Acid Uric.',
          'Nếu dị ứng Allopurinol hoặc suy thận: Chuyển sang Febuxostat 40mg - 80mg/ngày.',
          'BẮT BUỘC DỰ PHÒNG CƠN CẤP: Dùng Colchicine 0.5mg/ngày liên tục trong 3 - 6 tháng đầu khi mới dùng thuốc hạ AU.'
        ]
      },
      {
        id: 'gout_step_3',
        stepNumber: 3,
        type: 'monitoring',
        title: 'Bước 3: Đánh giá đích điều trị Acid Uric & Theo dõi tophi',
        description: 'Đích Acid Uric máu phải đạt < 360 µmol/L (< 6.0 mg/dL) đối với gout thông thường, hoặc < 300 µmol/L (< 5.0 mg/dL) nếu có hạt tophi.',
        badge: 'Đạt đích AU',
        badgeColor: '#4CAF50',
        keyActions: [
          'Xét nghiệm lại Acid Uric máu mỗi tháng trong giai đoạn chỉnh liều, sau đó mỗi 6 tháng khi đã ổn định.',
          'Khi đạt nồng độ mục tiêu, các tinh thể urat trong khớp và hạt tophi sẽ tan dần sau 6 - 24 tháng.'
        ]
      }
    ],
    regimens: [
      {
        categoryName: 'Thuốc cắt cơn đau Gout cấp tính',
        targetPatient: 'Bệnh nhân đang có cơn sưng đau khớp cấp',
        drugs: [
          {
            drugName: 'Colchicine 1mg',
            activeIngredient: 'Colchicine',
            dosage: 'Ngày đầu: 1mg lúc đầu, sau 1 giờ uống thêm 0.5mg. Ngày 2 trở đi: 0.5mg - 1mg/ngày',
            route: 'Uống',
            frequency: 'Theo lộ trình cơn cấp',
            priority: 'first_line',
            contraindications: ['Suy thận nặng eGFR < 30 ml/phút kèm suy gan', 'Dùng chung với Clarithromycin hoặc Ketoconazole'],
            clinicalNotes: 'KHÔNG DÙNG LIỀU CAO CŨ (1mg mỗi 2 giờ cho đến khi ỉa chảy) vì độc tính tiêu hóa và thần kinh rất cao. Liều thấp có hiệu quả tương đương và an toàn hơn hẳn.'
          },
          {
            drugName: 'Celecoxib',
            activeIngredient: 'Celecoxib',
            dosage: '200mg x 2 lần/ngày trong 3 - 5 ngày',
            route: 'Uống',
            frequency: 'Sau ăn',
            priority: 'first_line',
            contraindications: ['Suy tim ứ huyết nặng', 'Bệnh tim thiếu máu cục bộ', 'Suy thận eGFR < 30'],
            clinicalNotes: 'Chống viêm giảm đau mạnh, ít tác dụng phụ trên dạ dày hơn NSAID cổ điển.'
          }
        ]
      },
      {
        categoryName: 'Thuốc hạ Acid Uric máu lâu dài (Kiểm soát mạn tính)',
        targetPatient: 'Dùng lâu dài để ngừa biến chứng',
        drugs: [
          {
            drugName: 'Allopurinol',
            activeIngredient: 'Allopurinol',
            dosage: 'Khởi đầu 100mg/ngày, tăng dần 100mg mỗi 2-4 tuần (tối đa 800mg/ngày)',
            route: 'Uống',
            frequency: '1 lần/ngày sau bữa ăn',
            priority: 'first_line',
            contraindications: ['Tiền sử dị ứng nặng với Allopurinol (Hội chứng DRESS, Steven-Johnson)'],
            clinicalNotes: 'Thuốc ức chế men Xanthine Oxidase kinh điển, chi phí thấp. Dặn dò bệnh nhân nếu có sốt, ngứa, phát ban đỏ trên da phải ngưng thuốc ngay lập tức và đi khám.'
          },
          {
            drugName: 'Febuxostat',
            activeIngredient: 'Febuxostat',
            dosage: '40mg - 80mg x 1 lần/ngày',
            route: 'Uống',
            frequency: '1 lần/ngày không phụ thuộc bữa ăn',
            priority: 'second_line',
            contraindications: ['Dị ứng với thuốc', 'Bệnh tim mạch thiếu máu cục bộ không ổn định'],
            clinicalNotes: 'Hiệu quả hạ Acid Uric rất mạnh, dùng tốt cho bệnh nhân suy thận nhẹ - trung bình không cần chỉnh liều.'
          }
        ]
      }
    ],
    treatmentGoals: [
      { metric: 'Acid Uric máu mục tiêu chung', targetValue: '< 360 µmol/L (< 6 mg/dL)', timeline: 'Duy trì suốt đời' },
      { metric: 'Acid Uric bệnh nhân có hạt Tophi / Gout mạn', targetValue: '< 300 µmol/L (< 5 mg/dL)', timeline: 'Để tan nhanh hạt tophi' },
      { metric: 'Số cơn gút cấp tái phát', targetValue: '0 cơn/năm', timeline: 'Khi đạt mục tiêu AU ổn định' }
    ],
    redFlags: [
      'Nhiễm trùng khớp thứ phát (khớp sưng tấy kèm sốt cao, rét run, chọc dịch khớp đục mủ): Cần phân biệt khẩn với viêm khớp nhiễm khuẩn.',
      'Dị ứng thuốc Allopurinol: Phát ban dát sẩn ngứa, bong tróc da, loét niêm mạc, men gan tăng vọt (Hội chứng Steven-Johnson / TEN đe dọa tính mạng).',
      'Hạt tophi bị vỡ chảy dịch trắng như vôi bột kèm bội nhiễm vi khuẩn hoại tử mô mềm.'
    ],
    lifestyleAdvice: [
      'Hạn chế tối đa rượu bia (đặc biệt là bia vì chứa nhiều Guanosine và làm ức chế bài tiết acid uric qua thận).',
      'Tránh thực phẩm giàu purin: Nội tạng động vật (tim, gan, cật), thịt bò, thịt dê, thịt thú rừng, hải sản (tôm, cua, cá trích, cá mòi).',
      'Uống đủ nước: 2 - 2.5 lít nước mỗi ngày (ưu tiên nước khoáng kiềm) để tăng đào thải acid uric và chống sỏi thận.',
      'Duy trì cân nặng hợp lý, tránh nhịn đói hoặc giảm cân quá nhanh vì gây tăng tạo thể ceton làm ức chế thải acid uric.'
    ]
  }
];
