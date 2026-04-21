import { db, collection, getDocs, setDoc, doc, getDoc } from '../firebase';
const MOCK_DRUGS = [
  {
    id: '1',
    name: 'Paracetamol',
    activeIngredients: [{ name: 'Paracetamol', strength: '500mg' }],
    dosageForm: 'Viên nén',
    excipients: 'Tinh bột ngô, Povidon K30...',
    manufacturer: 'Hậu Giang Pharma',
    indications: [{ content: 'Giảm đau', icd10: 'R51' }, { content: 'Hạ sốt', icd10: 'R50.9' }],
    contraindications: [{ content: 'Mẫn cảm với thành phần thuốc', type: 'Other' }, { content: 'Suy gan nặng', type: 'Other' }],
    sideEffects: ['Phát ban', 'Tổn thương gan (liều cao)'],
    category: 'Giảm đau, hạ sốt',
    isActive: true
  },
  {
    id: '2',
    name: 'Amoxicillin',
    activeIngredients: [{ name: 'Amoxicillin', strength: '500mg' }],
    dosageForm: 'Viên nang',
    excipients: 'Magnesi stearat...',
    manufacturer: 'Domesco',
    indications: [{ content: 'Nhiễm khuẩn đường hô hấp', icd10: 'J01.9' }, { content: 'Nhiễm khuẩn đường tiết niệu', icd10: 'N39.0' }],
    contraindications: [{ content: 'Mẫn cảm với Penicillin', type: 'Other' }],
    sideEffects: ['Tiêu chảy', 'Buồn nôn'],
    category: 'Kháng sinh',
    isActive: true
  },
  {
    id: '3',
    name: 'Ibuprofen',
    activeIngredients: [{ name: 'Ibuprofen', strength: '400mg' }],
    dosageForm: 'Viên nén',
    excipients: 'Lactose, Tinh bột sắn...',
    manufacturer: 'Traphaco',
    indications: [{ content: 'Giảm đau kháng viêm', icd10: 'M79.1' }, { content: 'Đau khớp', icd10: 'M25.5' }],
    contraindications: [{ content: 'Loét dạ dày tá tràng', type: 'Other' }, { content: 'Suy thận', type: 'Other' }],
    sideEffects: ['Đau dạ dày', 'Chóng mặt'],
    category: 'Kháng viêm không steroid (NSAID)',
    isActive: true
  },
  {
    id: '4',
    name: 'Metformin',
    activeIngredients: [{ name: 'Metformin hydrochloride', strength: '850mg' }],
    dosageForm: 'Viên nén bao phim',
    excipients: 'Hypromellose, Magnesi stearat...',
    manufacturer: 'Stada',
    indications: [{ content: 'Đái tháo đường tuýp 2', icd10: 'E11.9' }],
    contraindications: [{ content: 'Suy thận nặng', type: 'Other' }, { content: 'Nhiễm toan chuyển hóa', type: 'Other' }],
    sideEffects: ['Rối loạn tiêu hóa', 'Vị kim loại trong miệng'],
    category: 'Thuốc điều trị đái tháo đường',
    isActive: true
  },
  {
    id: '5',
    name: 'Amlodipine',
    activeIngredients: [{ name: 'Amlodipine besylate', strength: '5mg' }],
    dosageForm: 'Viên nén',
    excipients: 'Calci phosphat dibasic, Tinh bột natri glycolat...',
    manufacturer: 'Pymepharco',
    indications: [{ content: 'Tăng huyết áp', icd10: 'I10' }, { content: 'Đau thắt ngực', icd10: 'I20.9' }],
    contraindications: [{ content: 'Hạ huyết áp nặng', type: 'Other' }, { content: 'Sốc tim', type: 'Other' }],
    sideEffects: ['Phù chân', 'Đau đầu'],
    category: 'Thuốc điều trị tăng huyết áp',
    isActive: true
  }
];

export const seedInitialData = async () => {
  try {
    // Seed drugs
    const drugsRef = collection(db, 'drugs');
    const drugsSnap = await getDocs(drugsRef);
    if (drugsSnap.empty) {
      for (const drug of MOCK_DRUGS) {
        await setDoc(doc(db, 'drugs', drug.id), drug);
      }
    }

    // Seed system config if empty
    const titlesRef = collection(db, 'config_titles');
    const titlesSnap = await getDocs(titlesRef);
    if (titlesSnap.empty) {
      const defaultTitles = ['Bác sĩ', 'Dược sĩ', 'Điều dưỡng'];
      for (let i = 0; i < defaultTitles.length; i++) {
        await setDoc(doc(db, 'config_titles', `title_${i}`), { name: defaultTitles[i], order: i });
      }
    }

    const positionsRef = collection(db, 'config_positions');
    const positionsSnap = await getDocs(positionsRef);
    if (positionsSnap.empty) {
      const defaultPositions = ['Giám đốc', 'Phó giám đốc', 'Trưởng khoa', 'Phó khoa', 'Nhân viên'];
      for (let i = 0; i < defaultPositions.length; i++) {
        await setDoc(doc(db, 'config_positions', `pos_${i}`), { name: defaultPositions[i], order: i });
      }
    }

    const specialtiesRef = collection(db, 'config_specialties');
    const specialtiesSnap = await getDocs(specialtiesRef);
    if (specialtiesSnap.empty) {
      const defaultSpecialties = ['Không', 'Tiến sĩ', 'Thạc sĩ', 'Chuyên khoa I', 'Chuyên khoa II', 'Dược lâm sàng'];
      for (let i = 0; i < defaultSpecialties.length; i++) {
        await setDoc(doc(db, 'config_specialties', `spec_${i}`), { name: defaultSpecialties[i], order: i });
      }
    }

    const rolesRef = collection(db, 'config_roles');
    const rolesSnap = await getDocs(rolesRef);
    if (rolesSnap.empty) {
      const defaultRoles = [
        { id: 'admin', name: 'Quản trị viên' },
        { id: 'operator_doctor', name: 'Điều hành (Bác sĩ)' },
        { id: 'operator_pharmacist', name: 'Điều hành (Dược sĩ)' },
        { id: 'member', name: 'Thành viên' }
      ];
      for (let i = 0; i < defaultRoles.length; i++) {
        await setDoc(doc(db, 'config_roles', defaultRoles[i].id), { name: defaultRoles[i].name, order: i });
      }
    }

    const permsRef = collection(db, 'role_permissions');
    const permsSnap = await getDocs(permsRef);
    
    // Ensure specialized operator roles have permissions even if collection is not empty
    const requiredRolePerms = [
      { roleId: 'admin', allowedTabs: ['dashboard', 'view_calendar', 'view_notes', 'manage_users', 'manage_staff', 'manage_directory', 'manage_icd10', 'manage_interaction', 'manage_adr', 'manage_patients', 'manage_config'] },
      { roleId: 'operator_doctor', allowedTabs: ['dashboard', 'view_calendar', 'view_notes', 'manage_icd10', 'manage_interaction', 'manage_adr', 'manage_patients'] },
      { roleId: 'operator_pharmacist', allowedTabs: ['dashboard', 'view_calendar', 'view_notes', 'manage_directory', 'manage_icd10', 'manage_interaction', 'manage_adr', 'manage_patients'] },
      { roleId: 'member', allowedTabs: ['dashboard', 'view_calendar', 'view_notes', 'view_patients'] }
    ];

    for (const perm of requiredRolePerms) {
      const permDoc = doc(db, 'role_permissions', perm.roleId);
      const permSnap = await getDoc(permDoc);
      if (!permSnap.exists() || (perm.roleId === 'admin' && (!permSnap.data().allowedTabs.includes('manage_patients') || !permSnap.data().allowedTabs.includes('manage_staff')))) {
        await setDoc(permDoc, perm);
      }
    }

    const titlePermsRef = collection(db, 'title_permissions');
    const titlePermsSnap = await getDocs(titlePermsRef);
    if (titlePermsSnap.empty) {
      const defaultTitlePerms = [
        { titleId: 'Bác sĩ', allowedTabs: ['dashboard', 'view_calendar', 'view_notes', 'view_prescription', 'view_history', 'view_directory', 'view_icd10', 'view_interaction', 'view_adr', 'view_patients'] },
        { titleId: 'Dược sĩ', allowedTabs: ['dashboard', 'view_calendar', 'view_notes', 'view_directory', 'view_icd10', 'view_interaction', 'view_adr', 'view_patients'] },
        { titleId: 'Điều dưỡng', allowedTabs: ['dashboard', 'view_calendar', 'view_notes', 'view_directory', 'view_icd10', 'view_interaction', 'view_patients'] }
      ];
      for (const perm of defaultTitlePerms) {
        await setDoc(doc(db, 'title_permissions', perm.titleId), perm);
      }
    } else {
      // Migration: Ensure view_patients is added to existing title permissions
      const defaultTitleIds = ['Bác sĩ', 'Dược sĩ', 'Điều dưỡng'];
      for (const titleId of defaultTitleIds) {
        const permDoc = doc(db, 'title_permissions', titleId);
        const permSnap = await getDoc(permDoc);
        if (permSnap.exists()) {
          const data = permSnap.data();
          if (!data.allowedTabs.includes('view_patients')) {
            await setDoc(permDoc, {
              ...data,
              allowedTabs: [...data.allowedTabs, 'view_patients']
            });
          }
        }
      }
    }

    // Seed system settings if empty
    const settingsRef = doc(db, 'system_settings', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        appName: 'KCB Bình Phú',
        loginTitle: 'Hệ thống Quản lý KCB',
        loginSubtitle: 'Phòng khám Đa khoa Bình Phú',
        appDescription: 'Hệ thống hỗ trợ quyết định lâm sàng và quản lý dược lý hiện đại dành cho nhân viên y tế tại KCB Bình Phú.',
        defaultTheme: 'light',
        termsOfUse: `# PHẦN A: QUY ĐỊNH CHUNG

## Điều 1: Phạm vi điều chỉnh
> Ứng dụng này được thiết kế dành riêng cho nhân viên y tế tại KCB Bình Phú để hỗ trợ công tác chuyên môn.

1.1. Ứng dụng cung cấp các công cụ hỗ trợ tra cứu thuốc, kiểm tra tương tác và quản lý hồ sơ bệnh nhân nội bộ.
1.2. Mọi thông tin trên ứng dụng chỉ mang tính chất tham khảo chuyên môn, không thay thế hoàn toàn quyết định lâm sàng của Bác sĩ.

## Điều 2: Đối tượng sử dụng
* Bác sĩ, Dược sĩ, Điều dưỡng đã được cấp tài khoản chính thức.
* Nhân viên thực tập hoặc khách truy cập có quyền hạn giới hạn.

---

# PHẦN B: QUYỀN VÀ TRÁCH NHIỆM

## Điều 3: Trách nhiệm người dùng
1. **Bảo mật:** Không chia sẻ mật khẩu hoặc quyền truy cập cho người không có nhiệm vụ.
2. **Dữ liệu:** <mark>Tuyệt đối không sao chép hoặc phát tán thông tin bệnh nhân dưới mọi hình thức trái quy định.</mark>
3. **Cập nhật:** Thông báo ngay cho Quản trị viên nếu phát hiện sai sót dữ liệu thuốc.

## Điều 4: Quyền lợi
* Được sử dụng toàn bộ các tính năng hỗ trợ quyết định lâm sàng (CDSS) được cấu hình cho chức danh.
* Dữ liệu thuốc và phác đồ được cập nhật liên tục từ các nguồn tin cậy.`
      });
    }
  } catch (e) {
    console.warn("Could not seed initial data:", e);
  }
};
