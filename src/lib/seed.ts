import { db, collection, getDocs, setDoc, doc, getDoc, updateDoc } from '../firebase';
const MOCK_DRUGS = [
  {
    id: '1',
    name: 'Paracetamol',
    activeIngredients: [{ name: 'Paracetamol', amount: '500', unit: 'mg' }],
    dosageForm: 'Viên nén',
    excipients: 'Tinh bột ngô, Povidon K30...',
    manufacturer: 'Hậu Giang Pharma',
    indications: [{ content: 'Giảm đau', icd10: 'R51' }, { content: 'Hạ sốt', icd10: 'R50.9' }],
    contraindications: [{ content: 'Mẫn cảm với thành phần thuốc', type: 'Other' }, { content: 'Suy gan nặng', type: 'Other' }],
    sideEffects: ['Phát ban', 'Tổn thương gan (liều cao)'],
    category: 'Giảm đau, hạ sốt'
  },
  {
    id: '2',
    name: 'Amoxicillin',
    activeIngredients: [{ name: 'Amoxicillin', amount: '500', unit: 'mg' }],
    dosageForm: 'Viên nang',
    excipients: 'Magnesi stearat...',
    manufacturer: 'Domesco',
    indications: [{ content: 'Nhiễm khuẩn đường hô hấp', icd10: 'J01.9' }, { content: 'Nhiễm khuẩn đường tiết niệu', icd10: 'N39.0' }],
    contraindications: [{ content: 'Mẫn cảm với Penicillin', type: 'Other' }],
    sideEffects: ['Tiêu chảy', 'Buồn nôn'],
    category: 'Kháng sinh'
  },
  {
    id: '3',
    name: 'Ibuprofen',
    activeIngredients: [{ name: 'Ibuprofen', amount: '400', unit: 'mg' }],
    dosageForm: 'Viên nén',
    excipients: 'Lactose, Tinh bột sắn...',
    manufacturer: 'Traphaco',
    indications: [{ content: 'Giảm đau kháng viêm', icd10: 'M79.1' }, { content: 'Đau khớp', icd10: 'M25.5' }],
    contraindications: [{ content: 'Loét dạ dày tá tràng', type: 'Other' }, { content: 'Suy thận', type: 'Other' }],
    sideEffects: ['Đau dạ dày', 'Chóng mặt'],
    category: 'Kháng viêm không steroid (NSAID)'
  },
  {
    id: '4',
    name: 'Metformin',
    activeIngredients: [{ name: 'Metformin hydrochloride', amount: '850', unit: 'mg' }],
    dosageForm: 'Viên nén bao phim',
    excipients: 'Hypromellose, Magnesi stearat...',
    manufacturer: 'Stada',
    indications: [{ content: 'Đái tháo đường tuýp 2', icd10: 'E11.9' }],
    contraindications: [{ content: 'Suy thận nặng', type: 'Other' }, { content: 'Nhiễm toan chuyển hóa', type: 'Other' }],
    sideEffects: ['Rối loạn tiêu hóa', 'Vị kim loại trong miệng'],
    category: 'Thuốc điều trị đái tháo đường'
  },
  {
    id: '5',
    name: 'Amlodipine',
    activeIngredients: [{ name: 'Amlodipine besylate', amount: '5', unit: 'mg' }],
    dosageForm: 'Viên nén',
    excipients: 'Calci phosphat dibasic, Tinh bột natri glycolat...',
    manufacturer: 'Pymepharco',
    indications: [{ content: 'Tăng huyết áp', icd10: 'I10' }, { content: 'Đau thắt ngực', icd10: 'I20.9' }],
    contraindications: [{ content: 'Hạ huyết áp nặng', type: 'Other' }, { content: 'Sốc tim', type: 'Other' }],
    sideEffects: ['Phù chân', 'Đau đầu'],
    category: 'Thuốc điều trị tăng huyết áp'
  }
];

const MOCK_ADR_CATALOG = [
  {
    id: 'adr_cat_1',
    reactionName: 'Mề đay, phát ban do thuốc',
    description: 'Phản ứng dị ứng thường gặp nhất, xuất hiện sau khi dùng thuốc từ vài phút đến vài ngày.',
    commonDrugs: ['Amoxicillin', 'Cefalexin', 'Ibuprofen'],
    severityLevel: 'Nhẹ',
    management: 'Ngừng thuốc ngay lập tức. Sử dụng thuốc kháng Histamin. Theo dõi sát các dấu hiệu chuyển nặng.',
    category: 'Phản ứng ngoài da',
    sortOrder: 0
  },
  {
    id: 'adr_cat_2',
    reactionName: 'Sốc phản vệ',
    description: 'Phản ứng dị ứng nghiêm trọng, đe dọa tính mạng, diễn biến rất nhanh.',
    commonDrugs: ['Penicillin', 'Ceftriaxone', 'Vacxin'],
    severityLevel: 'Nghiêm trọng',
    management: 'Cấp cứu theo phác đồ sốc phản vệ của Bộ Y tế. Tiêm Adrenaline là thuốc tiên quyết.',
    category: 'Phản ứng phản vệ & Sốc phản vệ',
    sortOrder: 1
  },
  {
    id: 'adr_cat_3',
    reactionName: 'Viêm gan do thuốc',
    description: 'Tình trạng tổn thương tế bào gan do thuốc hoặc chuyển hóa của thuốc tại gan.',
    commonDrugs: ['Paracetamol (liều cao)', 'Isoniazid', 'Rifampicin'],
    severityLevel: 'Nặng',
    management: 'Ngừng thuốc nghi ngờ. Sử dụng các thuốc giải độc gan (như N-acetylcysteine cho Paracetamol).',
    category: 'Rối loạn chức năng gan',
    sortOrder: 2
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

    // Seed ADR Catalog
    const adrCatRef = collection(db, 'adr_catalog');
    const adrCatSnap = await getDocs(adrCatRef);
    if (adrCatSnap.empty) {
      for (const item of MOCK_ADR_CATALOG) {
        await setDoc(doc(db, 'adr_catalog', item.id), item);
      }
    }

    // Seed ADR Reports and migration
    const adrReportsRef = collection(db, 'adr_reports');
    const adrReportsSnap = await getDocs(adrReportsRef);
    if (adrReportsSnap.empty) {
      const mockReports = [
        {
          id: 'adr_report_1',
          patientInitials: 'NGUYỄN VĂN A',
          patientAge: 45,
          patientGender: 'Nam',
          drugId: '2',
          drugName: 'Amoxicillin',
          reactionDescription: 'Nổi mẩn đỏ toàn thân sau khi uống thuốc 30 phút, ngứa nhiều.',
          severity: 'Trung bình',
          outcome: 'Hồi phục',
          reporterName: 'Admin',
          reporterUid: 'system',
          reportedAt: new Date().toISOString(),
          status: 'Đã hoàn thành',
          notes: 'Đã xử trí bằng kháng histamin, bệnh nhân ổn định.'
        }
      ];
      for (const report of mockReports) {
        await setDoc(doc(db, 'adr_reports', report.id), report);
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
        { titleId: 'Bác sĩ', allowedTabs: ['dashboard', 'view_calendar', 'view_notes', 'view_prescription', 'view_directory', 'view_icd10', 'view_interaction', 'view_adr', 'view_patients'] },
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

    // Seed system settings if the document does not exist or missing critical fields
    const settingsRef = doc(db, 'system_settings', 'main');
    const settingsSnap = await getDoc(settingsRef);
    const defaultTerms = `# PHẦN A: QUY ĐỊNH CHUNG

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
* Dữ liệu thuốc và phác đồ được cập nhật liên tục từ các nguồn tin cậy.`;

    const defaultSettings = {
      appName: 'KCB Bình Phú',
      loginTitle: 'Hệ thống Quản lý KCB',
      loginSubtitle: 'Phòng khám Đa khoa Bình Phú',
      appDescription: 'Hệ thống hỗ trợ quyết định lâm sàng và quản lý dược lý hiện đại dành cho nhân viên y tế tại KCB Bình Phú.',
      defaultTheme: 'light',
      termsOfUse: defaultTerms
    };

    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, defaultSettings);
    } else {
      const data = settingsSnap.data();
      const missingFields: Record<string, any> = {};
      
      // Force termsOfUse if missing or placeholder (like "New App")
      if (!data.termsOfUse || data.termsOfUse.length < 50) {
        missingFields.termsOfUse = defaultTerms;
      }
      if (!data.appName) missingFields.appName = defaultSettings.appName;
      if (!data.loginTitle) missingFields.loginTitle = defaultSettings.loginTitle;
      if (!data.loginSubtitle) missingFields.loginSubtitle = defaultSettings.loginSubtitle;
      
      if (Object.keys(missingFields).length > 0) {
        await updateDoc(settingsRef, missingFields);
      }
    }

    // One-time migration: set default utilities box visibility for key features
    const featureSettingsRef = doc(db, 'system_config', 'feature_settings');
    const featureSettingsSnap = await getDoc(featureSettingsRef);
    const migrationKey = '_migrations';
    const migrationFlag = 'utilitiesBoxDefaultsV1';
    const targetFeatureIds = ['view_notes', 'view_icd10', 'view_interaction'];

    if (!featureSettingsSnap.exists()) {
      const initialFeatureSettings: Record<string, any> = {
        [migrationKey]: { [migrationFlag]: true }
      };

      for (const featureId of targetFeatureIds) {
        initialFeatureSettings[featureId] = {
          hiddenLocations: ['utilities_box']
        };
      }

      await setDoc(featureSettingsRef, initialFeatureSettings);
    } else {
      const featureSettingsData = featureSettingsSnap.data() as Record<string, any>;
      const migrations = featureSettingsData[migrationKey] || {};
      const alreadyMigrated = migrations[migrationFlag] === true;

      if (!alreadyMigrated) {
        const nextFeatureSettings: Record<string, any> = { ...featureSettingsData };

        for (const featureId of targetFeatureIds) {
          const current = nextFeatureSettings[featureId] || {};
          const currentHiddenLocations = Array.isArray(current.hiddenLocations) ? current.hiddenLocations : [];
          const nextHiddenLocations = currentHiddenLocations.includes('utilities_box')
            ? currentHiddenLocations
            : [...currentHiddenLocations, 'utilities_box'];

          nextFeatureSettings[featureId] = {
            ...current,
            hiddenLocations: nextHiddenLocations
          };
        }

        nextFeatureSettings[migrationKey] = {
          ...migrations,
          [migrationFlag]: true
        };

        await setDoc(featureSettingsRef, nextFeatureSettings);
      }
    }
  } catch (e) {
    console.warn("Could not seed initial data:", e);
  }
};
