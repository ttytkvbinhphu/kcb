import { Drug, ManualInteraction } from '../types';

export interface UnifiedInteraction extends ManualInteraction {
  isFromDrugDirectory?: boolean;
  sourceCategory?: 
    | 'Phụ nữ có thai'
    | 'Phụ nữ cho con bú'
    | 'Lái xe & Vận hành máy'
    | 'Khả năng sinh sản'
    | 'Trẻ em / Độ tuổi'
    | 'Cân nặng'
    | 'Suy thận'
    | 'Suy gan'
    | 'Người cao tuổi'
    | 'Đối tượng đặc biệt'
    | 'Chống chỉ định'
    | 'Cảnh báo & Thận trọng'
    | 'Tương tác thuốc'
    | 'Tương kỵ hóa lý'
    | 'Bệnh lý ICD-10'
    | string;
  drugId?: string;
  drugAvatarUrl?: string;
}

/**
 * Extracts comprehensive interactions (Drug-Drug, Drug-ICD10, Drug-Subject/Population)
 * directly from the Drug Directory data (Drug objects).
 */
export function extractAllInteractionsFromDrugs(drugs: Drug[]): UnifiedInteraction[] {
  if (!Array.isArray(drugs) || drugs.length === 0) return [];

  const results: UnifiedInteraction[] = [];

  for (const drug of drugs) {
    if (!drug || !drug.name) continue;

    const drugId = drug.id;
    const drugName = drug.name;
    const updatedAt = drug.updatedAt || new Date().toISOString();
    const updatedBy = drug.updatedBy || 'Dược thư Quốc gia';

    // 1. Phụ nữ có thai (Pregnancy)
    const pregText = (drug.pregnancy || '').trim();
    const hasPregnancy = Boolean(
      pregText ||
      drug.pregnancyStatus1 ||
      drug.pregnancyStatus2 ||
      drug.pregnancyStatus3 ||
      drug.pregnancyNotes
    );

    if (hasPregnancy) {
      let severity: 'low' | 'medium' | 'high' = 'medium';
      let contraindicated = false;
      let desc = pregText;

      const fullPregStr = `${drug.pregnancyStatus1 || ''} ${drug.pregnancyStatus2 || ''} ${drug.pregnancyStatus3 || ''} ${drug.pregnancyNotes || ''} ${pregText}`.toLowerCase();

      if (
        fullPregStr.includes('không nên dùng') ||
        fullPregStr.includes('chống chỉ định') ||
        fullPregStr.includes('chống chỉ định tuyệt đối') ||
        fullPregStr.includes('nguy cơ dị tật') ||
        fullPregStr.includes('độc tính thai nhi')
      ) {
        severity = 'high';
        contraindicated = true;
      } else if (
        fullPregStr.includes('cân nhắc lợi hại') ||
        fullPregStr.includes('thận trọng') ||
        fullPregStr.includes('chỉ dùng khi thật cần thiết')
      ) {
        severity = 'medium';
      } else if (fullPregStr.includes('có thể dùng') || fullPregStr.includes('an toàn')) {
        severity = 'low';
      }

      if (!desc) {
        const trimesters: string[] = [];
        if (drug.pregnancyStatus1) trimesters.push(`3T đầu: ${drug.pregnancyStatus1}`);
        if (drug.pregnancyStatus2) trimesters.push(`3T giữa: ${drug.pregnancyStatus2}`);
        if (drug.pregnancyStatus3) trimesters.push(`3T cuối: ${drug.pregnancyStatus3}`);
        const notes = drug.pregnancyNotes ? ` - ${drug.pregnancyNotes}` : '';
        desc = trimesters.length > 0 ? `${trimesters.join(' | ')}${notes}` : (drug.pregnancyNotes || 'Cần thận trọng khi sử dụng trong thời kỳ mang thai.');
      }

      results.push({
        id: `auto-preg-${drugId}`,
        type: 'Thuốc - Đối tượng',
        sourceIds: [drugId],
        sourceNames: [drugName],
        targetName: 'Phụ nữ có thai',
        severity,
        contraindicated,
        description: desc,
        recommendation: contraindicated
          ? 'Chống chỉ định trong thai kỳ. Cần lựa chọn hoạt chất thay thế đã được chứng minh an toàn.'
          : 'Cân nhắc kỹ giữa lợi ích điều trị cho người mẹ và nguy cơ tiềm ẩn đối với thai nhi. Theo dõi chặt chẽ.',
        updatedAt,
        updatedBy,
        isFromDrugDirectory: true,
        sourceCategory: 'Phụ nữ có thai',
        drugId,
        drugAvatarUrl: drug.avatarUrl
      });
    }

    // 2. Phụ nữ cho con bú (Lactation)
    const lactText = (drug.lactation || '').trim();
    const hasLactation = Boolean(lactText || drug.lactationStatus || drug.lactationNotes);

    if (hasLactation) {
      let severity: 'low' | 'medium' | 'high' = 'medium';
      let contraindicated = false;
      const fullLactStr = `${drug.lactationStatus || ''} ${drug.lactationNotes || ''} ${lactText}`.toLowerCase();

      if (fullLactStr.includes('không nên dùng') || fullLactStr.includes('chống chỉ định')) {
        severity = 'high';
        contraindicated = true;
      } else if (fullLactStr.includes('cân nhắc lợi hại') || fullLactStr.includes('thận trọng')) {
        severity = 'medium';
      } else if (fullLactStr.includes('có thể dùng') || fullLactStr.includes('an toàn')) {
        severity = 'low';
      }

      const desc = lactText || (drug.lactationStatus ? `${drug.lactationStatus}${drug.lactationNotes ? ` - ${drug.lactationNotes}` : ''}` : drug.lactationNotes || 'Cần thận trọng khi cho con bú.');

      results.push({
        id: `auto-lact-${drugId}`,
        type: 'Thuốc - Đối tượng',
        sourceIds: [drugId],
        sourceNames: [drugName],
        targetName: 'Phụ nữ cho con bú',
        severity,
        contraindicated,
        description: desc,
        recommendation: contraindicated
          ? 'Không nên cho con bú trong thời gian dùng thuốc hoặc ngừng thuốc nếu bắt buộc phải điều trị.'
          : 'Tham khảo ý kiến bác sĩ/dược sĩ lâm sàng để đánh giá nguy cơ thuốc bài tiết qua sữa mẹ.',
        updatedAt,
        updatedBy,
        isFromDrugDirectory: true,
        sourceCategory: 'Phụ nữ cho con bú',
        drugId,
        drugAvatarUrl: drug.avatarUrl
      });
    }

    // 3. Người lái xe & vận hành máy móc (Driving)
    const drivText = (drug.driving || '').trim();
    const hasDriving = Boolean(drivText || drug.drivingStatus || drug.drivingNotes);

    if (hasDriving) {
      let severity: 'low' | 'medium' | 'high' = 'low';
      let contraindicated = false;
      const fullDrivStr = `${drug.drivingStatus || ''} ${drug.drivingNotes || ''} ${drivText}`.toLowerCase();

      if (fullDrivStr.includes('không nên dùng') || fullDrivStr.includes('chống chỉ định')) {
        severity = 'high';
        contraindicated = true;
      } else if (fullDrivStr.includes('cân nhắc') || fullDrivStr.includes('thận trọng') || fullDrivStr.includes('buồn ngủ') || fullDrivStr.includes('chóng mặt')) {
        severity = 'medium';
      }

      const desc = drivText || (drug.drivingStatus ? `${drug.drivingStatus}${drug.drivingNotes ? ` - ${drug.drivingNotes}` : ''}` : drug.drivingNotes || 'Cần thận trọng khi lái xe và vận hành máy móc.');

      results.push({
        id: `auto-driv-${drugId}`,
        type: 'Thuốc - Đối tượng',
        sourceIds: [drugId],
        sourceNames: [drugName],
        targetName: 'Người lái xe & vận hành máy móc',
        severity,
        contraindicated,
        description: desc,
        recommendation: severity === 'high' || severity === 'medium'
          ? 'Cảnh báo người bệnh về các tác dụng không mong muốn như buồn ngủ, chóng mặt, rối loạn thị giác có thể ảnh hưởng đến khả năng lái xe.'
          : 'Thuốc ít hoặc không gây ảnh hưởng đáng kể đến khả năng lái xe và vận hành máy móc.',
        updatedAt,
        updatedBy,
        isFromDrugDirectory: true,
        sourceCategory: 'Lái xe & Vận hành máy',
        drugId,
        drugAvatarUrl: drug.avatarUrl
      });
    }

    // 4. Khả năng sinh sản (Fertility)
    const fertText = (drug.fertility || '').trim();
    if (fertText || drug.fertilityStatus || drug.fertilityNotes) {
      const desc = fertText || (drug.fertilityStatus ? `${drug.fertilityStatus}${drug.fertilityNotes ? ` - ${drug.fertilityNotes}` : ''}` : drug.fertilityNotes || 'Ảnh hưởng đến khả năng sinh sản.');
      const isNegative = desc.toLowerCase().includes('không nên') || desc.toLowerCase().includes('suy giảm') || desc.toLowerCase().includes('ảnh hưởng');

      results.push({
        id: `auto-fert-${drugId}`,
        type: 'Thuốc - Đối tượng',
        sourceIds: [drugId],
        sourceNames: [drugName],
        targetName: 'Khả năng sinh sản (Nam/Nữ)',
        severity: isNegative ? 'medium' : 'low',
        contraindicated: false,
        description: desc,
        recommendation: 'Tham khảo ý kiến chuyên gia nếu bệnh nhân đang có kế hoạch sinh con hoặc điều trị vô sinh.',
        updatedAt,
        updatedBy,
        isFromDrugDirectory: true,
        sourceCategory: 'Khả năng sinh sản',
        drugId,
        drugAvatarUrl: drug.avatarUrl
      });
    }

    // 5. Chống chỉ định (Contraindications)
    // Supports Array of objects, Array of strings, or single string
    const normalizedContraindications: { content: string; type?: string; ageConfig?: any; weightConfig?: any; icd10s?: string[]; drugs?: string[]; title?: string; severity?: string }[] = [];

    const rawContraindications: any = (drug as any).contraindications;
    if (Array.isArray(rawContraindications)) {
      rawContraindications.forEach((c: any) => {
        if (!c) return;
        if (typeof c === 'string') {
          const str = (c as string).trim();
          if (str) normalizedContraindications.push({ content: str, type: 'Other' });
        } else if (typeof c === 'object') {
          const content = String(c.content || c.title || '');
          if (content.trim()) {
            normalizedContraindications.push({
              content: content.trim(),
              title: c.title,
              type: c.type || 'Other',
              ageConfig: c.ageConfig,
              weightConfig: c.weightConfig,
              icd10s: c.icd10s,
              drugs: c.drugs,
              severity: c.severity
            });
          }
        }
      });
    } else if (typeof rawContraindications === 'string' && rawContraindications.trim()) {
      rawContraindications.split(/\r?\n|•|;|- /).forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed.length > 2) {
          normalizedContraindications.push({ content: trimmed, type: 'Other' });
        }
      });
    }

    normalizedContraindications.forEach((c, idx) => {
      const content = c.content.trim();
      const type = c.type;
      const lowerContent = content.toLowerCase();

      // Check if this is an Age / Weight / Population contraindication
      const isAge = type === 'Age' || c.ageConfig || lowerContent.includes('tuổi') || lowerContent.includes('trẻ em') || lowerContent.includes('sơ sinh') || lowerContent.includes('người cao tuổi') || lowerContent.includes('trẻ nhỏ') || lowerContent.includes('tháng tuổi');
      const isWeight = type === 'Weight' || c.weightConfig || lowerContent.includes('cân nặng') || lowerContent.includes('thể trọng') || lowerContent.includes('kg');
      const isRenal = lowerContent.includes('suy thận') || lowerContent.includes('thanh thải') || lowerContent.includes('crcl') || lowerContent.includes('chức năng thận');
      const isHepatic = lowerContent.includes('suy gan') || lowerContent.includes('men gan') || lowerContent.includes('chức năng gan');
      const isPregLact = lowerContent.includes('mang thai') || lowerContent.includes('có thai') || lowerContent.includes('thai kỳ') || lowerContent.includes('cho con bú') || lowerContent.includes('sữa mẹ');
      const isDriving = lowerContent.includes('lái xe') || lowerContent.includes('vận hành máy');
      const isFertility = lowerContent.includes('sinh sản') || lowerContent.includes('vô sinh') || lowerContent.includes('tinh trùng');

      if (isAge || isWeight || isRenal || isHepatic || isPregLact || isDriving || isFertility || (!c.icd10s?.length && !c.drugs?.length)) {
        let targetName = 'Đối tượng đặc biệt';
        let sourceCategory: UnifiedInteraction['sourceCategory'] = 'Chống chỉ định';

        if (isAge) {
          sourceCategory = 'Trẻ em / Độ tuổi';
          if (c.ageConfig && typeof c.ageConfig.value === 'number') {
            targetName = `Trẻ em ${c.ageConfig.operator || '<'} ${c.ageConfig.value} ${c.ageConfig.unit === 'months' ? 'tháng tuổi' : 'tuổi'}`;
          } else if (lowerContent.includes('sơ sinh')) {
            targetName = 'Trẻ sơ sinh';
          } else if (lowerContent.includes('dưới 12 tuổi') || lowerContent.includes('< 12 tuổi')) {
            targetName = 'Trẻ em < 12 tuổi';
          } else if (lowerContent.includes('dưới 6 tuổi') || lowerContent.includes('< 6 tuổi')) {
            targetName = 'Trẻ em < 6 tuổi';
          } else if (lowerContent.includes('dưới 2 tuổi') || lowerContent.includes('< 2 tuổi')) {
            targetName = 'Trẻ em < 2 tuổi';
          } else if (lowerContent.includes('người cao tuổi') || lowerContent.includes('người già')) {
            targetName = 'Người cao tuổi (≥ 65 tuổi)';
            sourceCategory = 'Người cao tuổi';
          } else {
            targetName = 'Độ tuổi chống chỉ định';
          }
        } else if (isWeight) {
          sourceCategory = 'Cân nặng';
          if (c.weightConfig && typeof c.weightConfig.value === 'number') {
            targetName = `Cân nặng ${c.weightConfig.operator || '<'} ${c.weightConfig.value} kg`;
          } else {
            targetName = 'Bệnh nhân theo cân nặng';
          }
        } else if (isRenal) {
          targetName = 'Bệnh nhân suy thận';
          sourceCategory = 'Suy thận';
        } else if (isHepatic) {
          targetName = 'Bệnh nhân suy gan';
          sourceCategory = 'Suy gan';
        } else if (isPregLact) {
          targetName = lowerContent.includes('cho con bú') || lowerContent.includes('sữa mẹ') ? 'Phụ nữ cho con bú' : 'Phụ nữ có thai';
          sourceCategory = lowerContent.includes('cho con bú') || lowerContent.includes('sữa mẹ') ? 'Phụ nữ cho con bú' : 'Phụ nữ có thai';
        } else if (isDriving) {
          targetName = 'Lái xe & Vận hành máy móc';
          sourceCategory = 'Lái xe & Vận hành máy';
        } else if (isFertility) {
          targetName = 'Khả năng sinh sản';
          sourceCategory = 'Khả năng sinh sản';
        }

        results.push({
          id: `auto-ccđ-pop-${drugId}-${idx}`,
          type: 'Thuốc - Đối tượng',
          sourceIds: [drugId],
          sourceNames: [drugName],
          targetName: c.title || targetName,
          severity: 'high',
          contraindicated: true,
          description: content,
          recommendation: 'Chống chỉ định tuyệt đối cho đối tượng này. Không được kê đơn hoặc sử dụng.',
          updatedAt,
          updatedBy,
          isFromDrugDirectory: true,
          sourceCategory,
          drugId,
          drugAvatarUrl: drug.avatarUrl
        });
      }

      // ICD-10 Contraindication
      if (type === 'ICD-10' || (c.icd10s && c.icd10s.length > 0)) {
        results.push({
          id: `auto-ccđ-icd-${drugId}-${idx}`,
          type: 'Thuốc - ICD-10',
          sourceIds: [drugId],
          sourceNames: [drugName],
          targetId: c.icd10s?.join(', ') || '',
          targetName: c.icd10s?.join(', ') || content,
          severity: 'high',
          contraindicated: true,
          description: content,
          recommendation: 'Chống chỉ định đối với bệnh nhân có tiền sử hoặc đang mắc bệnh lý này.',
          updatedAt,
          updatedBy,
          isFromDrugDirectory: true,
          sourceCategory: 'Bệnh lý ICD-10',
          drugId,
          drugAvatarUrl: drug.avatarUrl
        });
      }

      // Drug-Drug Contraindication
      if (type === 'Drug' || (c.drugs && c.drugs.length > 0)) {
        results.push({
          id: `auto-ccđ-drug-${drugId}-${idx}`,
          type: 'Thuốc - Thuốc',
          sourceIds: [drugId],
          sourceNames: [drugName],
          targetName: c.drugs?.join(', ') || content,
          severity: 'high',
          contraindicated: true,
          description: content,
          recommendation: 'Chống chỉ định phối hợp với thuốc này do nguy cơ biến cố lâm sàng nghiêm trọng.',
          updatedAt,
          updatedBy,
          isFromDrugDirectory: true,
          sourceCategory: 'Chống chỉ định',
          drugId,
          drugAvatarUrl: drug.avatarUrl
        });
      }
    });

    // 6. Cảnh báo & Thận trọng (Warnings & Precautions)
    const rawCautions: any[] = [];
    const rawWarnings: any = (drug as any).warnings;
    if (Array.isArray(rawWarnings)) {
      rawWarnings.forEach((w: any) => {
        if (!w) return;
        if (typeof w === 'string') {
          const str = (w as string).trim();
          if (str) rawCautions.push({ content: str, origin: 'Cảnh báo', type: 'Other' });
        } else if (typeof w === 'object') {
          rawCautions.push({ ...w, origin: 'Cảnh báo' });
        }
      });
    }
    const rawPrecautions: any = (drug as any).precautions;
    if (Array.isArray(rawPrecautions)) {
      rawPrecautions.forEach((p: any) => {
        if (!p) return;
        if (typeof p === 'string') {
          const str = (p as string).trim();
          if (str) rawCautions.push({ content: str, origin: 'Thận trọng', type: 'Other' });
        } else if (typeof p === 'object') {
          rawCautions.push({ ...p, origin: 'Thận trọng' });
        }
      });
    } else if (typeof rawPrecautions === 'string' && rawPrecautions.trim()) {
      rawPrecautions.split(/\r?\n|•|;|- /).forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed.length > 2) {
          rawCautions.push({ content: trimmed, origin: 'Thận trọng', type: 'Other' });
        }
      });
    }

    rawCautions.forEach((w, idx) => {
      const content = (w.content || w.title || '').trim();
      if (!content) return;
      const lowerContent = content.toLowerCase();
      const type = w.type;

      // Severity mapping
      let severity: 'low' | 'medium' | 'high' = 'medium';
      let contraindicated = false;
      if (w.severity === 'Chống chỉ định' || w.severity === 'Phối hợp nguy hiểm') {
        severity = 'high';
        if (w.severity === 'Chống chỉ định') contraindicated = true;
      } else if (w.severity === 'Cần theo dõi điều trị') {
        severity = 'low';
      }

      const isAge = type === 'Age' || w.ageConfig || lowerContent.includes('tuổi') || lowerContent.includes('trẻ em') || lowerContent.includes('người cao tuổi') || lowerContent.includes('trẻ sơ sinh') || lowerContent.includes('trẻ nhỏ');
      const isWeight = type === 'Weight' || w.weightConfig || lowerContent.includes('cân nặng') || lowerContent.includes('thể trọng') || lowerContent.includes('kg');
      const isRenal = lowerContent.includes('suy thận') || lowerContent.includes('thanh thải') || lowerContent.includes('crcl') || lowerContent.includes('chức năng thận');
      const isHepatic = lowerContent.includes('suy gan') || lowerContent.includes('men gan') || lowerContent.includes('chức năng gan');
      const isPregLact = lowerContent.includes('mang thai') || lowerContent.includes('có thai') || lowerContent.includes('thai kỳ') || lowerContent.includes('cho con bú') || lowerContent.includes('sữa mẹ');
      const isDriving = lowerContent.includes('lái xe') || lowerContent.includes('vận hành máy');
      const isFertility = lowerContent.includes('sinh sản') || lowerContent.includes('vô sinh');

      if (isAge || isWeight || isRenal || isHepatic || isPregLact || isDriving || isFertility || (!w.icd10s?.length && !w.drugs?.length)) {
        let targetName = w.title || 'Đối tượng đặc biệt';
        let sourceCategory: UnifiedInteraction['sourceCategory'] = 'Cảnh báo & Thận trọng';

        if (isAge) {
          sourceCategory = 'Trẻ em / Độ tuổi';
          if (w.ageConfig && typeof w.ageConfig.value === 'number') {
            targetName = `Trẻ em ${w.ageConfig.operator || '<'} ${w.ageConfig.value} ${w.ageConfig.unit === 'months' ? 'tháng tuổi' : 'tuổi'}`;
          } else if (lowerContent.includes('người cao tuổi') || lowerContent.includes('người già')) {
            targetName = 'Người cao tuổi (≥ 65 tuổi)';
            sourceCategory = 'Người cao tuổi';
          } else if (lowerContent.includes('trẻ em') || lowerContent.includes('trẻ nhỏ')) {
            targetName = 'Trẻ em & Trẻ vị thành niên';
          }
        } else if (isWeight) {
          sourceCategory = 'Cân nặng';
          if (w.weightConfig && typeof w.weightConfig.value === 'number') {
            targetName = `Cân nặng ${w.weightConfig.operator || '<'} ${w.weightConfig.value} kg`;
          } else {
            targetName = 'Bệnh nhân theo thể trọng';
          }
        } else if (isRenal) {
          targetName = 'Bệnh nhân suy thận';
          sourceCategory = 'Suy thận';
        } else if (isHepatic) {
          targetName = 'Bệnh nhân suy gan';
          sourceCategory = 'Suy gan';
        } else if (isPregLact) {
          targetName = lowerContent.includes('cho con bú') || lowerContent.includes('sữa mẹ') ? 'Phụ nữ cho con bú' : 'Phụ nữ có thai';
          sourceCategory = lowerContent.includes('cho con bú') || lowerContent.includes('sữa mẹ') ? 'Phụ nữ cho con bú' : 'Phụ nữ có thai';
        } else if (isDriving) {
          targetName = 'Lái xe & Vận hành máy móc';
          sourceCategory = 'Lái xe & Vận hành máy';
        } else if (isFertility) {
          targetName = 'Khả năng sinh sản';
          sourceCategory = 'Khả năng sinh sản';
        }

        results.push({
          id: `auto-warn-pop-${drugId}-${idx}`,
          type: 'Thuốc - Đối tượng',
          sourceIds: [drugId],
          sourceNames: [drugName],
          targetName: w.title || targetName,
          severity,
          contraindicated,
          description: content,
          recommendation: w.title
            ? `${w.title}: ${w.severity ? `Mức độ [${w.severity}]. ` : ''}Cần theo dõi sát dấu hiệu lâm sàng và xét nghiệm chức năng định kỳ.`
            : 'Cần theo dõi sát tình trạng lâm sàng và điều chỉnh liều nếu cần thiết.',
          updatedAt,
          updatedBy,
          isFromDrugDirectory: true,
          sourceCategory,
          drugId,
          drugAvatarUrl: drug.avatarUrl
        });
      }

      // ICD-10 Warning
      if (type === 'ICD-10' || (w.icd10s && w.icd10s.length > 0)) {
        results.push({
          id: `auto-warn-icd-${drugId}-${idx}`,
          type: 'Thuốc - ICD-10',
          sourceIds: [drugId],
          sourceNames: [drugName],
          targetId: w.icd10s?.join(', ') || '',
          targetName: w.icd10s?.join(', ') || w.title || content,
          severity,
          contraindicated,
          description: content,
          recommendation: `Thận trọng khi sử dụng cho người bệnh có tiền sử mắc bệnh lý ${w.icd10s?.join(', ') || ''}.`,
          updatedAt,
          updatedBy,
          isFromDrugDirectory: true,
          sourceCategory: 'Bệnh lý ICD-10',
          drugId,
          drugAvatarUrl: drug.avatarUrl
        });
      }

      // Drug-Drug Warning
      if (type === 'Drug' || (w.drugs && w.drugs.length > 0)) {
        results.push({
          id: `auto-warn-drug-${drugId}-${idx}`,
          type: 'Thuốc - Thuốc',
          sourceIds: [drugId],
          sourceNames: [drugName],
          targetName: w.drugs?.join(', ') || w.title || content,
          severity,
          contraindicated,
          description: content,
          recommendation: 'Cần lưu ý thận trọng khi dùng đồng thời, theo dõi đáp ứng điều trị.',
          updatedAt,
          updatedBy,
          isFromDrugDirectory: true,
          sourceCategory: 'Tương tác thuốc',
          drugId,
          drugAvatarUrl: drug.avatarUrl
        });
      }
    });

    // 7. Liều lượng & Phân liều cho đối tượng đặc biệt (Dosages & Administration)
    const rawDosages: any[] = Array.isArray((drug as any).dosages)
      ? (drug as any).dosages
      : (Array.isArray((drug as any).dosageAndAdministration)
          ? (drug as any).dosageAndAdministration
          : (Array.isArray((drug as any).dosage) ? (drug as any).dosage : []));

    rawDosages.forEach((d: any, idx: number) => {
      if (!d) return;

      const hasPatientGroups = Array.isArray(d.patientGroups) && d.patientGroups.length > 0;
      const hasCrcl = typeof d.crclMin === 'number' || typeof d.crclMax === 'number';
      const hasAge = typeof d.ageMin === 'number' || typeof d.ageMax === 'number';
      const hasWeight = typeof d.weightMin === 'number' || typeof d.weightMax === 'number';

      if (hasPatientGroups || hasCrcl || hasAge || hasWeight || d.category || d.content) {
        let targetName = '';
        let sourceCategory: UnifiedInteraction['sourceCategory'] = 'Đối tượng đặc biệt';

        if (hasPatientGroups) {
          targetName = d.patientGroups!.join(', ');
          if (targetName.includes('Trẻ em')) sourceCategory = 'Trẻ em / Độ tuổi';
          else if (targetName.includes('Người cao tuổi')) sourceCategory = 'Người cao tuổi';
          else if (targetName.includes('Suy thận')) sourceCategory = 'Suy thận';
          else if (targetName.includes('Suy gan')) sourceCategory = 'Suy gan';
          else if (targetName.includes('thai')) sourceCategory = 'Phụ nữ có thai';
          else if (targetName.includes('cho con bú')) sourceCategory = 'Phụ nữ cho con bú';
        } else if (hasCrcl) {
          targetName = `Bệnh nhân suy thận (CrCl ${d.crclMin ?? 0}${d.crclMax ? ` - ${d.crclMax}` : ''} mL/phút)`;
          sourceCategory = 'Suy thận';
        } else if (hasAge) {
          targetName = `Độ tuổi ${d.ageMin ?? 0}${d.ageMax ? ` - ${d.ageMax}` : '+'} tuổi`;
          sourceCategory = 'Trẻ em / Độ tuổi';
        } else if (hasWeight) {
          targetName = `Cân nặng ${d.weightMin ?? 0}${d.weightMax ? ` - ${d.weightMax}` : '+'} kg`;
          sourceCategory = 'Cân nặng';
        }

        const desc = d.content || d.groupDescription || d.category || 'Phân liều đặc biệt cho nhóm đối tượng.';

        results.push({
          id: `auto-dose-pop-${drugId}-${idx}`,
          type: 'Thuốc - Đối tượng',
          sourceIds: [drugId],
          sourceNames: [drugName],
          targetName: targetName || d.groupTitle || d.category || 'Đối tượng phân liều đặc biệt',
          severity: hasCrcl ? 'medium' : 'low',
          contraindicated: false,
          description: desc,
          recommendation: 'Tuân thủ hướng dẫn chỉnh liều và theo dõi chặt chẽ chức năng cơ quan tương ứng.',
          updatedAt,
          updatedBy,
          isFromDrugDirectory: true,
          sourceCategory,
          drugId,
          drugAvatarUrl: drug.avatarUrl
        });
      }
    });

    // 8. Tương tác thuốc cụ thể (Specific Interactions)
    if (Array.isArray(drug.specificInteractions)) {
      drug.specificInteractions.forEach((s, idx) => {
        if (!s || !s.target) return;

        let severity: 'low' | 'medium' | 'high' = 'medium';
        const sSev = (s.severity || '').toLowerCase();
        if (sSev.includes('nghiêm trọng') || sSev === 'high' || sSev.includes('chống chỉ định')) {
          severity = 'high';
        } else if (sSev.includes('nhẹ') || sSev === 'low') {
          severity = 'low';
        }

        const isContra = sSev.includes('chống chỉ định') || (s.content || '').toLowerCase().includes('chống chỉ định');

        results.push({
          id: `auto-spec-${drugId}-${idx}`,
          type: 'Thuốc - Thuốc',
          sourceIds: [drugId],
          sourceNames: [drugName],
          targetName: s.target,
          severity,
          contraindicated: isContra,
          description: s.content || 'Tương tác dược lực học / dược động học khi phối hợp.',
          recommendation: s.title
            ? `Cơ chế / Xử trí: ${s.title}`
            : (severity === 'high'
              ? 'Tránh phối hợp. Nếu bắt buộc, cần theo dõi sát nồng độ thuốc hoặc các biến cố bất lợi.'
              : 'Theo dõi đáp ứng lâm sàng của người bệnh và hiệu chỉnh liều khi cần.'),
          updatedAt,
          updatedBy,
          isFromDrugDirectory: true,
          sourceCategory: 'Tương tác thuốc',
          drugId,
          drugAvatarUrl: drug.avatarUrl
        });
      });
    }

    // 9. Tương kỵ thuốc (Incompatibilities)
    const incompText = (drug.incompatibilities || '').trim();
    if (incompText) {
      results.push({
        id: `auto-incomp-${drugId}`,
        type: 'Thuốc - Thuốc',
        sourceIds: [drugId],
        sourceNames: [drugName],
        targetName: 'Tương kỵ dung dịch / Thuốc tiêm truyền',
        severity: 'high',
        contraindicated: true,
        description: incompText,
        recommendation: 'Không pha trộn chung trong cùng bơm tiêm hoặc dây truyền dịch để tránh kết tủa hoặc mất hoạt tính thuốc.',
        updatedAt,
        updatedBy,
        isFromDrugDirectory: true,
        sourceCategory: 'Tương kỵ hóa lý',
        drugId,
        drugAvatarUrl: drug.avatarUrl
      });
    }
  }

  return results;
}

/**
 * Checks interaction between a group of selected drugs using both manual data and directory data
 */
export function checkPairInteractions(
  selectedDrugs: Drug[],
  manualInteractions: ManualInteraction[],
  autoInteractions: UnifiedInteraction[]
): {
  matchedInteractions: (ManualInteraction | UnifiedInteraction)[];
  highestSeverity: 'low' | 'medium' | 'high';
  isContraindicated: boolean;
  summaryText: string;
} {
  const selectedIds = new Set(selectedDrugs.map(d => d.id));
  const selectedNames = selectedDrugs.map(d => (d.name || '').toLowerCase());
  const selectedIngredients = selectedDrugs.flatMap(d => (d.activeIngredients || []).map(ai => (ai.name || '').toLowerCase()));

  const matched: (ManualInteraction | UnifiedInteraction)[] = [];

  // Check manual interactions
  for (const mi of manualInteractions) {
    if (mi.type === 'Thuốc - Thuốc') {
      const matchAll = mi.sourceIds.every(id => selectedIds.has(id)) && mi.sourceIds.length >= 2;
      const matchNames = mi.sourceNames.length >= 2 && mi.sourceNames.every(name => selectedNames.some(sn => sn.includes(name.toLowerCase())));
      if (matchAll || matchNames) {
        matched.push(mi);
      }
    }
  }

  // Check auto interactions from directory
  for (const auto of autoInteractions) {
    if (auto.type === 'Thuốc - Thuốc') {
      const targetNameLower = (auto.targetName || '').toLowerCase();
      const isTargetInSelected =
        selectedNames.some(n => n.includes(targetNameLower) || targetNameLower.includes(n)) ||
        selectedIngredients.some(ing => ing.includes(targetNameLower) || targetNameLower.includes(ing));

      const isSourceInSelected = auto.sourceIds.some(id => selectedIds.has(id));

      if (isSourceInSelected && isTargetInSelected) {
        matched.push(auto);
      }
    }
  }

  // Deduplicate matches by unique description + target
  const uniqueMap = new Map<string, ManualInteraction | UnifiedInteraction>();
  matched.forEach(item => {
    const key = `${item.sourceNames.join('+')}--${item.targetName || ''}--${item.description.slice(0, 40)}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  });

  const finalMatched = Array.from(uniqueMap.values());

  let highestSeverity: 'low' | 'medium' | 'high' = 'low';
  let isContraindicated = false;

  for (const item of finalMatched) {
    if (item.contraindicated) isContraindicated = true;
    if (item.severity === 'high') highestSeverity = 'high';
    else if (item.severity === 'medium' && highestSeverity !== 'high') highestSeverity = 'medium';
  }

  let summaryText = '';
  if (finalMatched.length > 0) {
    summaryText = `Phát hiện ${finalMatched.length} tương tác / cảnh báo giữa các thuốc đã chọn từ Dược thư và danh mục lâm sàng.`;
  }

  return {
    matchedInteractions: finalMatched,
    highestSeverity,
    isContraindicated,
    summaryText
  };
}
