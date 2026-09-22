import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Save, BookOpen, AlertCircle, Plus, Trash2, Check,
  Layers, Pill, Activity, Stethoscope, AlertTriangle,
  ShieldCheck, ShieldAlert, Sparkles, ChevronRight, HelpCircle, FileText, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PharmacopoeiaMonograph } from '../lib/pharmacopoeiaData';

interface PharmacopoeiaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (monograph: PharmacopoeiaMonograph) => Promise<void> | void;
  monograph?: PharmacopoeiaMonograph | null;
  isDarkMode?: boolean;
}

const CATEGORY_PRESETS = [
  'Kháng sinh & Chống nhiễm khuẩn',
  'Tim mạch & Huyết áp',
  'Thần kinh & Giảm đau',
  'Tiêu hóa & Dạ dày',
  'Nội tiết & Chuyển hóa',
  'Hô hấp & Hen phế quản',
  'Tim mạch & Chuyển hóa',
  'Cơ xương khớp & Miễn dịch',
  'Ung bướu & Miễn dịch',
  'Huyết học & Chống đông',
  'Da liễu & Dị ứng',
  'Vitamin & Khoáng chất',
  'Khác'
];

const EDITION_PRESETS = [
  'Dược thư Quốc gia Việt Nam III',
  'Dược thư Quốc gia Việt Nam II',
  'Dược thư Quốc gia Việt Nam IV',
  'Dược thư Bổ sung'
];

const ADR_FREQUENCIES: Array<'Thường gặp (ADR > 1/100)' | 'Ít gặp (1/1000 < ADR < 1/100)' | 'Hiếm gặp (ADR < 1/1000)' | 'Chưa rõ tần suất'> = [
  'Thường gặp (ADR > 1/100)',
  'Ít gặp (1/1000 < ADR < 1/100)',
  'Hiếm gặp (ADR < 1/1000)',
  'Chưa rõ tần suất'
];

export const PharmacopoeiaEditorModal: React.FC<PharmacopoeiaEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  monograph,
  isDarkMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'dosage_forms' | 'indications' | 'dosage' | 'cautions' | 'adr_interactions' | 'overdose'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmation dialogs state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<PharmacopoeiaMonograph | null>(null);
  const [detectedDiffs, setDetectedDiffs] = useState<Array<{ field: string; oldVal: string; newVal: string }>>([]);

  // Form states
  const [id, setId] = useState('');
  const [vietnameseName, setVietnameseName] = useState('');
  const [internationalName, setInternationalName] = useState('');
  const [atcCode, setAtcCode] = useState('');
  const [pharmacologicalGroup, setPharmacologicalGroup] = useState('');
  const [therapeuticCategory, setTherapeuticCategory] = useState(CATEGORY_PRESETS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [edition, setEdition] = useState(EDITION_PRESETS[0]);
  const [notes, setNotes] = useState('');

  // Dosage Forms
  const [dosageForms, setDosageForms] = useState<string[]>([]);
  const [newDosageForm, setNewDosageForm] = useState('');

  // Pharmacology
  const [mechanism, setMechanism] = useState('');
  const [pharmacokinetics, setPharmacokinetics] = useState('');

  // Indications & Contraindications
  const [indications, setIndications] = useState<string[]>([]);
  const [newIndication, setNewIndication] = useState('');
  const [contraindications, setContraindications] = useState<string[]>([]);
  const [newContraindication, setNewContraindication] = useState('');

  // Dosage & Administration
  const [dosageGeneral, setDosageGeneral] = useState('');
  const [dosageAdults, setDosageAdults] = useState('');
  const [dosageChildren, setDosageChildren] = useState('');
  const [dosageSpecialPopulations, setDosageSpecialPopulations] = useState('');

  // Cautions
  const [cautionGeneral, setCautionGeneral] = useState('');
  const [cautionPregnancy, setCautionPregnancy] = useState('');
  const [cautionLactation, setCautionLactation] = useState('');
  const [cautionElderly, setCautionElderly] = useState('');
  const [cautionHepatic, setCautionHepatic] = useState('');
  const [cautionRenal, setCautionRenal] = useState('');

  // ADRs
  const [adrList, setAdrList] = useState<Array<{ frequency: 'Thường gặp (ADR > 1/100)' | 'Ít gặp (1/1000 < ADR < 1/100)' | 'Hiếm gặp (ADR < 1/1000)' | 'Chưa rõ tần suất'; effects: string[] }>>([
    { frequency: 'Thường gặp (ADR > 1/100)', effects: [] },
    { frequency: 'Ít gặp (1/1000 < ADR < 1/100)', effects: [] },
    { frequency: 'Hiếm gặp (ADR < 1/1000)', effects: [] },
    { frequency: 'Chưa rõ tần suất', effects: [] }
  ]);
  const [newAdrInputs, setNewAdrInputs] = useState<Record<string, string>>({});

  // Drug Interactions
  const [drugInteractions, setDrugInteractions] = useState<string[]>([]);
  const [newInteraction, setNewInteraction] = useState('');

  // Overdose & Storage
  const [overdoseSymptoms, setOverdoseSymptoms] = useState('');
  const [overdoseManagement, setOverdoseManagement] = useState('');
  const [storage, setStorage] = useState('');

  // Initial snapshot for detecting unsaved modifications
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');

  // Initialize or reset form
  useEffect(() => {
    if (monograph) {
      setId(monograph.id || '');
      setVietnameseName(monograph.vietnameseName || '');
      setInternationalName(monograph.internationalName || '');
      setAtcCode(monograph.atcCode || '');
      setPharmacologicalGroup(monograph.pharmacologicalGroup || '');
      
      let initCat = CATEGORY_PRESETS[0];
      let initCustomCat = '';
      if (CATEGORY_PRESETS.includes(monograph.therapeuticCategory)) {
        initCat = monograph.therapeuticCategory;
        initCustomCat = '';
      } else {
        initCat = 'Khác';
        initCustomCat = monograph.therapeuticCategory || '';
      }
      setTherapeuticCategory(initCat);
      setCustomCategory(initCustomCat);

      setEdition(monograph.edition || EDITION_PRESETS[0]);
      setNotes(monograph.notes || '');
      setDosageForms(monograph.dosageForms ? [...monograph.dosageForms] : []);
      setMechanism(monograph.pharmacology?.mechanism || '');
      setPharmacokinetics(monograph.pharmacology?.pharmacokinetics || '');
      setIndications(monograph.indications ? [...monograph.indications] : []);
      setContraindications(monograph.contraindications ? [...monograph.contraindications] : []);
      setDosageGeneral(monograph.dosageAndAdministration?.general || '');
      setDosageAdults(monograph.dosageAndAdministration?.adults || '');
      setDosageChildren(monograph.dosageAndAdministration?.children || '');
      setDosageSpecialPopulations(monograph.dosageAndAdministration?.specialPopulations || '');
      setCautionGeneral(monograph.cautions?.general || '');
      setCautionPregnancy(monograph.cautions?.pregnancy || '');
      setCautionLactation(monograph.cautions?.lactation || '');
      setCautionElderly(monograph.cautions?.elderly || '');
      setCautionHepatic(monograph.cautions?.hepaticImpairment || '');
      setCautionRenal(monograph.cautions?.renalImpairment || '');

      // ADRs
      const currentAdrs = ADR_FREQUENCIES.map(freq => {
        const found = monograph.adverseReactions?.find(a => a.frequency === freq);
        return {
          frequency: freq,
          effects: found ? [...found.effects] : []
        };
      });
      setAdrList(currentAdrs);

      setDrugInteractions(monograph.drugInteractions ? [...monograph.drugInteractions] : []);
      setOverdoseSymptoms(monograph.toxicityAndOverdose?.symptoms || '');
      setOverdoseManagement(monograph.toxicityAndOverdose?.management || '');
      setStorage(monograph.storage || '');

      const snapshotObj = {
        vietnameseName: monograph.vietnameseName || '',
        internationalName: monograph.internationalName || '',
        atcCode: monograph.atcCode || '',
        pharmacologicalGroup: monograph.pharmacologicalGroup || '',
        therapeuticCategory: initCat === 'Khác' ? initCustomCat : initCat,
        edition: monograph.edition || EDITION_PRESETS[0],
        notes: monograph.notes || '',
        dosageForms: monograph.dosageForms ? [...monograph.dosageForms] : [],
        mechanism: monograph.pharmacology?.mechanism || '',
        pharmacokinetics: monograph.pharmacology?.pharmacokinetics || '',
        indications: monograph.indications ? [...monograph.indications] : [],
        contraindications: monograph.contraindications ? [...monograph.contraindications] : [],
        dosageGeneral: monograph.dosageAndAdministration?.general || '',
        dosageAdults: monograph.dosageAndAdministration?.adults || '',
        dosageChildren: monograph.dosageAndAdministration?.children || '',
        dosageSpecialPopulations: monograph.dosageAndAdministration?.specialPopulations || '',
        cautionGeneral: monograph.cautions?.general || '',
        cautionPregnancy: monograph.cautions?.pregnancy || '',
        cautionLactation: monograph.cautions?.lactation || '',
        cautionElderly: monograph.cautions?.elderly || '',
        cautionHepatic: monograph.cautions?.hepaticImpairment || '',
        cautionRenal: monograph.cautions?.renalImpairment || '',
        adrs: currentAdrs,
        drugInteractions: monograph.drugInteractions ? [...monograph.drugInteractions] : [],
        overdoseSymptoms: monograph.toxicityAndOverdose?.symptoms || '',
        overdoseManagement: monograph.toxicityAndOverdose?.management || '',
        storage: monograph.storage || ''
      };
      setInitialSnapshot(JSON.stringify(snapshotObj));
    } else {
      // New monograph defaults
      const tempId = 'mono_' + Date.now().toString(36);
      setId(tempId);
      setVietnameseName('');
      setInternationalName('');
      setAtcCode('');
      setPharmacologicalGroup('');
      setTherapeuticCategory(CATEGORY_PRESETS[0]);
      setCustomCategory('');
      setEdition(EDITION_PRESETS[0]);
      setNotes('');
      setDosageForms(['Viên nén 500 mg']);
      setMechanism('');
      setPharmacokinetics('');
      setIndications([]);
      setContraindications([]);
      setDosageGeneral('Dùng đường uống.');
      setDosageAdults('');
      setDosageChildren('');
      setDosageSpecialPopulations('');
      setCautionGeneral('');
      setCautionPregnancy('Thận trọng và tham khảo ý kiến bác sĩ khi sử dụng trong thời kỳ mang thai.');
      setCautionLactation('Thận trọng khi sử dụng trong thời kỳ cho con bú.');
      setCautionElderly('');
      setCautionHepatic('');
      setCautionRenal('');
      const defaultAdrs = ADR_FREQUENCIES.map(freq => ({ frequency: freq, effects: [] }));
      setAdrList(defaultAdrs);
      setDrugInteractions([]);
      setOverdoseSymptoms('');
      setOverdoseManagement('');
      setStorage('Bảo quản ở nhiệt độ dưới 30°C, nơi khô ráo, tránh ánh sáng trực tiếp.');

      const snapshotObj = {
        vietnameseName: '',
        internationalName: '',
        atcCode: '',
        pharmacologicalGroup: '',
        therapeuticCategory: CATEGORY_PRESETS[0],
        edition: EDITION_PRESETS[0],
        notes: '',
        dosageForms: ['Viên nén 500 mg'],
        mechanism: '',
        pharmacokinetics: '',
        indications: [],
        contraindications: [],
        dosageGeneral: 'Dùng đường uống.',
        dosageAdults: '',
        dosageChildren: '',
        dosageSpecialPopulations: '',
        cautionGeneral: '',
        cautionPregnancy: 'Thận trọng và tham khảo ý kiến bác sĩ khi sử dụng trong thời kỳ mang thai.',
        cautionLactation: 'Thận trọng khi sử dụng trong thời kỳ cho con bú.',
        cautionElderly: '',
        cautionHepatic: '',
        cautionRenal: '',
        adrs: defaultAdrs,
        drugInteractions: [],
        overdoseSymptoms: '',
        overdoseManagement: '',
        storage: 'Bảo quản ở nhiệt độ dưới 30°C, nơi khô ráo, tránh ánh sáng trực tiếp.'
      };
      setInitialSnapshot(JSON.stringify(snapshotObj));
    }
    setErrorMessage(null);
    setShowCancelConfirm(false);
    setShowSaveConfirm(false);
    setPendingSaveData(null);
    setActiveTab('info');
  }, [monograph, isOpen]);

  // Check if current form differs from initial snapshot
  const isFormModified = useMemo(() => {
    if (!initialSnapshot) return false;
    const finalCategory = therapeuticCategory === 'Khác' ? customCategory.trim() : therapeuticCategory;
    const currentObj = {
      vietnameseName: vietnameseName.trim(),
      internationalName: internationalName.trim(),
      atcCode: atcCode.trim(),
      pharmacologicalGroup: pharmacologicalGroup.trim(),
      therapeuticCategory: finalCategory,
      edition: edition,
      notes: notes.trim(),
      dosageForms: dosageForms,
      mechanism: mechanism.trim(),
      pharmacokinetics: pharmacokinetics.trim(),
      indications: indications,
      contraindications: contraindications,
      dosageGeneral: dosageGeneral.trim(),
      dosageAdults: dosageAdults.trim(),
      dosageChildren: dosageChildren.trim(),
      dosageSpecialPopulations: dosageSpecialPopulations.trim(),
      cautionGeneral: cautionGeneral.trim(),
      cautionPregnancy: cautionPregnancy.trim(),
      cautionLactation: cautionLactation.trim(),
      cautionElderly: cautionElderly.trim(),
      cautionHepatic: cautionHepatic.trim(),
      cautionRenal: cautionRenal.trim(),
      adrs: adrList,
      drugInteractions: drugInteractions,
      overdoseSymptoms: overdoseSymptoms.trim(),
      overdoseManagement: overdoseManagement.trim(),
      storage: storage.trim()
    };
    return JSON.stringify(currentObj) !== initialSnapshot;
  }, [
    initialSnapshot,
    vietnameseName,
    internationalName,
    atcCode,
    pharmacologicalGroup,
    therapeuticCategory,
    customCategory,
    edition,
    notes,
    dosageForms,
    mechanism,
    pharmacokinetics,
    indications,
    contraindications,
    dosageGeneral,
    dosageAdults,
    dosageChildren,
    dosageSpecialPopulations,
    cautionGeneral,
    cautionPregnancy,
    cautionLactation,
    cautionElderly,
    cautionHepatic,
    cautionRenal,
    adrList,
    drugInteractions,
    overdoseSymptoms,
    overdoseManagement,
    storage
  ]);

  // Handle Cancel Click: prompt if changes detected
  const handleCancelClick = () => {
    if (isFormModified) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  // List helpers
  const handleAddDosageForm = () => {
    if (!newDosageForm.trim()) return;
    setDosageForms(prev => [...prev, newDosageForm.trim()]);
    setNewDosageForm('');
  };

  const handleRemoveDosageForm = (index: number) => {
    setDosageForms(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddIndication = () => {
    if (!newIndication.trim()) return;
    setIndications(prev => [...prev, newIndication.trim()]);
    setNewIndication('');
  };

  const handleRemoveIndication = (index: number) => {
    setIndications(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddContraindication = () => {
    if (!newContraindication.trim()) return;
    setContraindications(prev => [...prev, newContraindication.trim()]);
    setNewContraindication('');
  };

  const handleRemoveContraindication = (index: number) => {
    setContraindications(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAdrEffect = (frequency: string) => {
    const val = (newAdrInputs[frequency] || '').trim();
    if (!val) return;
    setAdrList(prev => prev.map(item => {
      if (item.frequency === frequency) {
        return { ...item, effects: [...item.effects, val] };
      }
      return item;
    }));
    setNewAdrInputs(prev => ({ ...prev, [frequency]: '' }));
  };

  const handleRemoveAdrEffect = (frequency: string, effectIndex: number) => {
    setAdrList(prev => prev.map(item => {
      if (item.frequency === frequency) {
        return { ...item, effects: item.effects.filter((_, i) => i !== effectIndex) };
      }
      return item;
    }));
  };

  const handleAddInteraction = () => {
    if (!newInteraction.trim()) return;
    setDrugInteractions(prev => [...prev, newInteraction.trim()]);
    setNewInteraction('');
  };

  const handleRemoveInteraction = (index: number) => {
    setDrugInteractions(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to compute list of changed fields
  const computeDiffs = (newData: PharmacopoeiaMonograph): Array<{ field: string; oldVal: string; newVal: string }> => {
    const diffs: Array<{ field: string; oldVal: string; newVal: string }> = [];

    if (!monograph) {
      diffs.push({ field: 'Tên chuyên khảo', oldVal: '(Mới)', newVal: `${newData.vietnameseName} (${newData.internationalName})` });
      diffs.push({ field: 'Nhóm điều trị & ATC', oldVal: '-', newVal: `${newData.therapeuticCategory} [${newData.atcCode}]` });
      diffs.push({ field: 'Dạng bào chế', oldVal: '0 dạng', newVal: `${newData.dosageForms.length} dạng: ${newData.dosageForms.join(', ')}` });
      diffs.push({ field: 'Chỉ định', oldVal: '0 mục', newVal: `${newData.indications.length} chỉ định` });
      diffs.push({ field: 'Chống chỉ định', oldVal: '0 mục', newVal: `${newData.contraindications.length} mục` });
      return diffs;
    }

    if ((monograph.vietnameseName || '') !== newData.vietnameseName) {
      diffs.push({ field: 'Tên tiếng Việt', oldVal: monograph.vietnameseName || '(Trống)', newVal: newData.vietnameseName });
    }
    if ((monograph.internationalName || '') !== newData.internationalName) {
      diffs.push({ field: 'Tên quốc tế (INN)', oldVal: monograph.internationalName || '(Trống)', newVal: newData.internationalName });
    }
    if ((monograph.atcCode || '') !== newData.atcCode) {
      diffs.push({ field: 'Mã ATC', oldVal: monograph.atcCode || '(Trống)', newVal: newData.atcCode });
    }
    if ((monograph.therapeuticCategory || '') !== newData.therapeuticCategory) {
      diffs.push({ field: 'Nhóm điều trị', oldVal: monograph.therapeuticCategory || '(Trống)', newVal: newData.therapeuticCategory });
    }
    if ((monograph.pharmacologicalGroup || '') !== newData.pharmacologicalGroup) {
      diffs.push({ field: 'Nhóm dược lý', oldVal: monograph.pharmacologicalGroup || '(Trống)', newVal: newData.pharmacologicalGroup });
    }
    if ((monograph.edition || '') !== newData.edition) {
      diffs.push({ field: 'Ấn bản Dược thư', oldVal: monograph.edition || '(Trống)', newVal: newData.edition });
    }

    const oldForms = (monograph.dosageForms || []).join('; ');
    const newForms = newData.dosageForms.join('; ');
    if (oldForms !== newForms) {
      diffs.push({ field: 'Dạng thuốc & hàm lượng', oldVal: oldForms || '(Trống)', newVal: newForms });
    }

    if ((monograph.pharmacology?.mechanism || '') !== newData.pharmacology.mechanism) {
      diffs.push({
        field: 'Dược lực học (Cơ chế)',
        oldVal: monograph.pharmacology?.mechanism ? `${monograph.pharmacology.mechanism.slice(0, 45)}...` : '(Trống)',
        newVal: `${newData.pharmacology.mechanism.slice(0, 45)}...`
      });
    }
    if ((monograph.pharmacology?.pharmacokinetics || '') !== newData.pharmacology.pharmacokinetics) {
      diffs.push({
        field: 'Dược động học (ADME)',
        oldVal: monograph.pharmacology?.pharmacokinetics ? `${monograph.pharmacology.pharmacokinetics.slice(0, 45)}...` : '(Trống)',
        newVal: `${newData.pharmacology.pharmacokinetics.slice(0, 45)}...`
      });
    }

    const oldInd = (monograph.indications || []).join('; ');
    const newInd = newData.indications.join('; ');
    if (oldInd !== newInd) {
      diffs.push({ field: 'Chỉ định điều trị', oldVal: `${(monograph.indications || []).length} mục`, newVal: `${newData.indications.length} mục` });
    }

    const oldContra = (monograph.contraindications || []).join('; ');
    const newContra = newData.contraindications.join('; ');
    if (oldContra !== newContra) {
      diffs.push({ field: 'Chống chỉ định', oldVal: `${(monograph.contraindications || []).length} mục`, newVal: `${newData.contraindications.length} mục` });
    }

    if ((monograph.dosageAndAdministration?.adults || '') !== (newData.dosageAndAdministration?.adults || '')) {
      diffs.push({ field: 'Liều dùng người lớn', oldVal: monograph.dosageAndAdministration?.adults || '(Trống)', newVal: newData.dosageAndAdministration?.adults || '(Trống)' });
    }
    if ((monograph.dosageAndAdministration?.children || '') !== (newData.dosageAndAdministration?.children || '')) {
      diffs.push({ field: 'Liều dùng trẻ em', oldVal: monograph.dosageAndAdministration?.children || '(Trống)', newVal: newData.dosageAndAdministration?.children || '(Trống)' });
    }
    if ((monograph.dosageAndAdministration?.specialPopulations || '') !== (newData.dosageAndAdministration?.specialPopulations || '')) {
      diffs.push({ field: 'Liều đối tượng đặc biệt', oldVal: monograph.dosageAndAdministration?.specialPopulations || '(Trống)', newVal: newData.dosageAndAdministration?.specialPopulations || '(Trống)' });
    }

    if ((monograph.cautions?.general || '') !== (newData.cautions?.general || '')) {
      diffs.push({ field: 'Thận trọng & Cảnh báo chung', oldVal: monograph.cautions?.general || '(Trống)', newVal: newData.cautions?.general || '(Trống)' });
    }
    if ((monograph.cautions?.pregnancy || '') !== (newData.cautions?.pregnancy || '')) {
      diffs.push({ field: 'Thận trọng thai kỳ', oldVal: monograph.cautions?.pregnancy || '(Trống)', newVal: newData.cautions?.pregnancy || '(Trống)' });
    }
    if ((monograph.cautions?.lactation || '') !== (newData.cautions?.lactation || '')) {
      diffs.push({ field: 'Thận trọng cho con bú', oldVal: monograph.cautions?.lactation || '(Trống)', newVal: newData.cautions?.lactation || '(Trống)' });
    }

    const totalOldAdrs = (monograph.adverseReactions || []).reduce((acc, cur) => acc + (cur.effects?.length || 0), 0);
    const totalNewAdrs = (newData.adverseReactions || []).reduce((acc, cur) => acc + (cur.effects?.length || 0), 0);
    if (totalOldAdrs !== totalNewAdrs) {
      diffs.push({ field: 'Tác dụng không mong muốn (ADR)', oldVal: `${totalOldAdrs} phản ứng`, newVal: `${totalNewAdrs} phản ứng` });
    }

    const oldInteract = (monograph.drugInteractions || []).length;
    const newInteract = (newData.drugInteractions || []).length;
    if (oldInteract !== newInteract) {
      diffs.push({ field: 'Tương tác thuốc', oldVal: `${oldInteract} tương tác`, newVal: `${newInteract} tương tác` });
    }

    if ((monograph.toxicityAndOverdose?.symptoms || '') !== (newData.toxicityAndOverdose?.symptoms || '') ||
        (monograph.toxicityAndOverdose?.management || '') !== (newData.toxicityAndOverdose?.management || '')) {
      diffs.push({ field: 'Quá liều & Xử trí', oldVal: 'Thông tin cũ', newVal: 'Đã cập nhật nội dung mới' });
    }

    if ((monograph.storage || '') !== (newData.storage || '')) {
      diffs.push({ field: 'Bảo quản', oldVal: monograph.storage || '(Trống)', newVal: newData.storage || '(Trống)' });
    }

    if ((monograph.notes || '') !== (newData.notes || '')) {
      diffs.push({ field: 'Ghi chú chuyên môn', oldVal: monograph.notes || '(Trống)', newVal: newData.notes || '(Trống)' });
    }

    return diffs;
  };

  // Submit trigger -> Opens Save Confirmation Dialog
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vietnameseName.trim()) {
      setActiveTab('info');
      setErrorMessage('Vui lòng nhập Tên chuyên khảo thuốc tiếng Việt (VD: Paracetamol, Amoxicilin).');
      return;
    }
    if (!internationalName.trim()) {
      setActiveTab('info');
      setErrorMessage('Vui lòng nhập Tên chung quốc tế INN (VD: Paracetamol, Amoxicillin).');
      return;
    }

    const finalCategory = therapeuticCategory === 'Khác' && customCategory.trim() 
      ? customCategory.trim() 
      : therapeuticCategory;

    const finalId = id.trim() || vietnameseName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'mono_' + Date.now();

    const dataToSave: PharmacopoeiaMonograph = {
      id: finalId,
      vietnameseName: vietnameseName.trim(),
      internationalName: internationalName.trim(),
      atcCode: atcCode.trim().toUpperCase() || 'CHƯA_CÓ',
      pharmacologicalGroup: pharmacologicalGroup.trim() || 'Dược phẩm',
      therapeuticCategory: finalCategory,
      edition: edition.trim() || 'Dược thư Quốc gia Việt Nam III',
      dosageForms: dosageForms.length > 0 ? dosageForms : ['Viên nén'],
      pharmacology: {
        mechanism: mechanism.trim() || 'Đang cập nhật cơ chế tác dụng.',
        pharmacokinetics: pharmacokinetics.trim() || 'Đang cập nhật dược động học.'
      },
      indications: indications.length > 0 ? indications : ['Theo chỉ định của bác sĩ điều trị.'],
      contraindications: contraindications.length > 0 ? contraindications : ['Quá mẫn với bất kỳ thành phần nào của thuốc.'],
      cautions: {
        general: cautionGeneral.trim() || 'Cần đọc kỹ hướng dẫn sử dụng trước khi dùng.',
        pregnancy: cautionPregnancy.trim() || 'Thận trọng khi dùng trong thời kỳ mang thai.',
        lactation: cautionLactation.trim() || 'Thận trọng khi dùng cho phụ nữ cho con bú.',
        elderly: cautionElderly.trim() || undefined,
        hepaticImpairment: cautionHepatic.trim() || undefined,
        renalImpairment: cautionRenal.trim() || undefined
      },
      dosageAndAdministration: {
        general: dosageGeneral.trim() || 'Dùng theo chỉ định của bác sĩ.',
        adults: dosageAdults.trim() || 'Theo chỉ định chuyên môn.',
        children: dosageChildren.trim() || undefined,
        specialPopulations: dosageSpecialPopulations.trim() || undefined
      },
      adverseReactions: adrList.filter(item => item.effects.length > 0),
      drugInteractions: drugInteractions,
      toxicityAndOverdose: {
        symptoms: overdoseSymptoms.trim() || 'Chưa ghi nhận hoặc triệu chứng quá liều thông thường.',
        management: overdoseManagement.trim() || 'Điều trị triệu chứng và hỗ trợ theo dõi tại cơ sở y tế.'
      },
      storage: storage.trim() || 'Bảo quản nơi khô ráo, tránh ánh sáng trực tiếp, nhiệt độ dưới 30°C.',
      notes: notes.trim() || undefined
    };

    const diffs = computeDiffs(dataToSave);
    setDetectedDiffs(diffs);
    setPendingSaveData(dataToSave);
    setShowSaveConfirm(true);
  };

  // Perform confirmed save
  const handleExecuteSave = async () => {
    if (!pendingSaveData) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await onSave(pendingSaveData);
      setShowSaveConfirm(false);
      onClose();
    } catch (err: any) {
      console.error('Save monograph error:', err);
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi lưu chuyên khảo Dược thư. Vui lòng thử lại.');
      setShowSaveConfirm(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const TABS: Array<{ id: 'info' | 'dosage_forms' | 'indications' | 'dosage' | 'cautions' | 'adr_interactions' | 'overdose'; label: string; icon: any }> = [
    { id: 'info', label: '1. Thông tin chung', icon: Layers },
    { id: 'dosage_forms', label: '2. Dạng thuốc & Dược lý', icon: Pill },
    { id: 'indications', label: '3. Chỉ định & Chống CĐ', icon: Check },
    { id: 'dosage', label: '4. Liều dùng & Cách dùng', icon: Stethoscope },
    { id: 'cautions', label: '5. Thận trọng & Cảnh báo', icon: ShieldCheck },
    { id: 'adr_interactions', label: '6. ADR & Tương tác', icon: AlertTriangle },
    { id: 'overdose', label: '7. Quá liều & Bảo quản', icon: ShieldAlert },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-slate-900 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className={cn(
          "w-full h-full flex flex-col overflow-hidden",
          isDarkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"
        )}
      >
        {/* Header */}
        <div className={cn(
          "px-4 sm:px-6 lg:px-8 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 shadow-xs",
          isDarkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
              <BookOpen size={18} />
            </div>

            <div className="min-w-0">
              <h2 className={cn("text-base sm:text-lg font-black tracking-tight flex items-center gap-2 truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                <span className="truncate">{monograph ? 'Chỉnh sửa chuyên khảo Dược thư' : 'Thêm chuyên khảo Dược thư mới'}</span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border shrink-0 hidden sm:inline-flex", isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-100 text-teal-800 border-teal-200")}>
                  Chuẩn Bộ Y Tế
                </span>
              </h2>
              <p className={cn("text-xs font-medium truncate", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                {vietnameseName ? `${vietnameseName} (${internationalName || 'Chuyên khảo'})` : 'Cập nhật nội dung toàn văn chuyên khảo Dược thư Quốc gia Việt Nam'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCancelClick}
              className={cn(
                "px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              )}
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-4 sm:px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-600/20 active:scale-95"
            >
              <Save size={15} />
              <span>{isSaving ? 'Đang lưu...' : monograph ? 'Lưu cập nhật' : 'Lưu chuyên khảo'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className={cn(
          "px-4 sm:px-6 lg:px-8 pt-1.5 border-b flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-xs shadow-2xs",
          isDarkMode ? "bg-slate-950/70 border-slate-800" : "bg-slate-100/90 border-slate-200"
        )}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all shrink-0 border-b-2 cursor-pointer",
                  isActive
                    ? (isDarkMode ? "bg-slate-900 text-teal-400 border-teal-500 shadow-sm" : "bg-white text-teal-700 border-teal-600 shadow-2xs")
                    : (isDarkMode ? "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40" : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-white/50")
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4">
            <div className={cn("p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-medium shadow-sm", isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700")}>
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
              <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Form Body - Full Screen Container */}
        <div className="flex-1 overflow-y-auto w-full">
          <form onSubmit={handleSubmit} className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* TAB 1: THÔNG TIN CHUNG */}
            {activeTab === 'info' && (
              <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-5", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                <div className={cn("flex items-center gap-2 border-b pb-3", isDarkMode ? "text-teal-400 border-slate-800" : "text-teal-600 border-slate-200")}>
                  <Layers size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider">Thông tin định danh & Phân loại</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Tên tiếng Việt <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vietnameseName}
                      onChange={(e) => setVietnameseName(e.target.value)}
                      placeholder="VD: Paracetamol, Amoxicilin, Ciprofloxacin..."
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition-all shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Tên chung quốc tế (INN) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={internationalName}
                      onChange={(e) => setInternationalName(e.target.value)}
                      placeholder="VD: Paracetamol (Acetaminophen), Amoxicillin..."
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Mã ATC (Anatomical Therapeutic Chemical)
                    </label>
                    <input
                      type="text"
                      value={atcCode}
                      onChange={(e) => setAtcCode(e.target.value)}
                      placeholder="VD: N02BE01, J01CA04..."
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold uppercase outline-none transition-all shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-teal-400 focus:border-teal-500" : "bg-white border-slate-300 text-teal-700 focus:border-teal-600"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Nhóm trị liệu (Chuyên khoa)
                    </label>
                    <select
                      value={therapeuticCategory}
                      onChange={(e) => setTherapeuticCategory(e.target.value)}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none cursor-pointer shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                      )}
                    >
                      {CATEGORY_PRESETS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Ấn bản Dược thư Quốc gia
                    </label>
                    <select
                      value={edition}
                      onChange={(e) => setEdition(e.target.value)}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none cursor-pointer shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                      )}
                    >
                      {EDITION_PRESETS.map(ed => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {therapeuticCategory === 'Khác' && (
                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Tên nhóm trị liệu tùy chỉnh
                    </label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Nhập tên nhóm trị liệu..."
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Nhóm dược lý chi tiết
                  </label>
                  <input
                    type="text"
                    value={pharmacologicalGroup}
                    onChange={(e) => setPharmacologicalGroup(e.target.value)}
                    placeholder="VD: Thuốc giảm đau - hạ sốt không Opioid, Kháng sinh Aminopenicillin..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Ghi chú chuyên môn (nếu có)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú thêm về phiên bản cập nhật, văn bản quy định hoặc nguồn tài liệu tham khảo..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: DẠNG THUỐC & DƯỢC LÝ */}
            {activeTab === 'dosage_forms' && (
              <div className="space-y-6">
                {/* Dosage Forms List */}
                <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-4", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                  <div className={cn("flex items-center justify-between border-b pb-3", isDarkMode ? "border-slate-800" : "border-slate-200")}>
                    <h3 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-teal-400" : "text-teal-600")}>
                      <Pill size={18} /> Dạng thuốc & Hàm lượng chuẩn
                    </h3>
                    <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")}>
                      Đã thêm {dosageForms.length} dạng
                    </span>
                  </div>

                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={newDosageForm}
                      onChange={(e) => setNewDosageForm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDosageForm(); } }}
                      placeholder="VD: Viên nén 500 mg, Gói bột 250 mg, Lọ tiêm truyền 10 mg/ml..."
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleAddDosageForm}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-teal-600/20"
                    >
                      <Plus size={15} /> Thêm dạng
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {dosageForms.map((form, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2.5 shadow-2xs",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-teal-50/70 border-teal-200 text-teal-900"
                        )}
                      >
                        <span>{form}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDosageForm(idx)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {dosageForms.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">Chưa có dạng thuốc nào. Hãy nhập dạng thuốc & hàm lượng ở trên.</p>
                    )}
                  </div>
                </div>

                {/* Dược lực học */}
                <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-3", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                  <label className={cn("block text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b pb-3", isDarkMode ? "text-teal-400 border-slate-800" : "text-teal-600 border-slate-200")}>
                    <Activity size={17} />
                    Dược lực học (Cơ chế tác dụng / Mechanism of Action)
                  </label>
                  <textarea
                    rows={6}
                    value={mechanism}
                    onChange={(e) => setMechanism(e.target.value)}
                    placeholder="Mô tả cơ chế tác dụng sinh hóa, thụ thể tác động, phổ kháng khuẩn hoặc tác dụng dược lực học chính..."
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border text-xs leading-relaxed outline-none shadow-2xs font-normal",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-slate-50/50 border-slate-300 text-slate-900 focus:border-teal-600 focus:bg-white"
                    )}
                  />
                </div>

                {/* Dược động học */}
                <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-3", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                  <label className={cn("block text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b pb-3", isDarkMode ? "text-blue-400 border-slate-800" : "text-blue-600 border-slate-200")}>
                    <Activity size={17} />
                    Dược động học (ADME: Hấp thu, Phân bố, Chuyển hóa, Thải trừ)
                  </label>
                  <textarea
                    rows={6}
                    value={pharmacokinetics}
                    onChange={(e) => setPharmacokinetics(e.target.value)}
                    placeholder="Hấp thu qua đường tiêu hóa, nồng độ đỉnh Cmax/Tmax, liên kết protein huyết tương, chuyển hóa qua enzym gan (CYP450), thời gian bán thải t1/2, bài tiết qua thận/mật..."
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border text-xs leading-relaxed outline-none shadow-2xs font-normal",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-slate-50/50 border-slate-300 text-slate-900 focus:border-teal-600 focus:bg-white"
                    )}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: CHỈ ĐỊNH & CHỐNG CHỈ ĐỊNH */}
            {activeTab === 'indications' && (
              <div className="space-y-6">
                {/* Indications */}
                <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-4", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                  <div className={cn("flex items-center justify-between border-b pb-3", isDarkMode ? "border-slate-800" : "border-slate-200")}>
                    <h3 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                      <Check size={18} /> Chỉ định điều trị
                    </h3>
                    <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", isDarkMode ? "bg-emerald-950/50 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
                      {indications.length} chỉ định
                    </span>
                  </div>

                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={newIndication}
                      onChange={(e) => setNewIndication(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIndication(); } }}
                      placeholder="Nhập một chỉ định điều trị mới..."
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleAddIndication}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-emerald-600/20"
                    >
                      <Plus size={15} /> Thêm chỉ định
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    {indications.map((ind, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-2xl border text-xs flex items-start justify-between gap-3 shadow-2xs",
                          isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-emerald-50/40 border-emerald-100 text-slate-800"
                        )}
                      >
                        <div className="flex items-start gap-2.5 flex-1">
                          <span className="text-emerald-500 font-black text-sm">•</span>
                          <span className="leading-relaxed font-medium">{ind}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveIndication(idx)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    {indications.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">Chưa có chỉ định nào. Hãy thêm các bệnh lý/triệu chứng chỉ định ở trên.</p>
                    )}
                  </div>
                </div>

                {/* Contraindications */}
                <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-4", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                  <div className={cn("flex items-center justify-between border-b pb-3", isDarkMode ? "border-slate-800" : "border-slate-200")}>
                    <h3 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-rose-400" : "text-rose-600")}>
                      <AlertTriangle size={18} /> Chống chỉ định
                    </h3>
                    <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", isDarkMode ? "bg-rose-950/50 text-rose-400" : "bg-rose-50 text-rose-600")}>
                      {contraindications.length} chống chỉ định
                    </span>
                  </div>

                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={newContraindication}
                      onChange={(e) => setNewContraindication(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddContraindication(); } }}
                      placeholder="Nhập trường hợp chống chỉ định mới..."
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleAddContraindication}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-rose-600/20"
                    >
                      <Plus size={15} /> Thêm CĐ
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    {contraindications.map((contra, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-2xl border text-xs flex items-start justify-between gap-3 shadow-2xs",
                          isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-rose-50/40 border-rose-100 text-slate-800"
                        )}
                      >
                        <div className="flex items-start gap-2.5 flex-1">
                          <span className="text-rose-500 font-black text-sm">✕</span>
                          <span className="leading-relaxed font-medium">{contra}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveContraindication(idx)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    {contraindications.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">Chưa có chống chỉ định nào. Hãy nhập trường hợp quá mẫn hoặc bệnh lý chống chỉ định.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LIỀU DÙNG & CÁCH DÙNG */}
            {activeTab === 'dosage' && (
              <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-6", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                <div className={cn("flex items-center gap-2 border-b pb-3", isDarkMode ? "text-blue-400 border-slate-800" : "text-blue-600 border-slate-200")}>
                  <Stethoscope size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider">Hướng dẫn liều dùng & Phác đồ chuẩn</h3>
                </div>

                <div>
                  <label className={cn("block text-xs font-bold mb-1.5", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                    Hướng dẫn & Đường dùng chung
                  </label>
                  <textarea
                    rows={3}
                    value={dosageGeneral}
                    onChange={(e) => setDosageGeneral(e.target.value)}
                    placeholder="VD: Dùng đường uống cùng hoặc không cùng bữa ăn, truyền tĩnh mạch chậm..."
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Liều dùng cho Người lớn <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={dosageAdults}
                    onChange={(e) => setDosageAdults(e.target.value)}
                    placeholder="VD: Uống 500 mg - 1000 mg mỗi 4 - 6 giờ khi cần. Tối đa không quá 4 g (4000 mg)/ngày..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs leading-relaxed outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Liều dùng cho Trẻ em
                  </label>
                  <textarea
                    rows={4}
                    value={dosageChildren}
                    onChange={(e) => setDosageChildren(e.target.value)}
                    placeholder="VD: Uống 10 - 15 mg/kg mỗi 4 - 6 giờ khi cần. Tối đa không quá 60 mg/kg/ngày hoặc 2 g/ngày..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs leading-relaxed outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Liều dùng cho Đối tượng đặc biệt (Suy gan, Suy thận, Người cao tuổi)
                  </label>
                  <textarea
                    rows={3}
                    value={dosageSpecialPopulations}
                    onChange={(e) => setDosageSpecialPopulations(e.target.value)}
                    placeholder="VD: Bệnh nhân suy thận nặng (ClCr < 10 ml/phút) kéo dài khoảng cách giữa các liều lên 8 giờ..."
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl border text-xs leading-relaxed outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                </div>
              </div>
            )}

            {/* TAB 5: THẬN TRỌNG & CẢNH BÁO */}
            {activeTab === 'cautions' && (
              <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-6", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                <div className={cn("flex items-center gap-2 border-b pb-3", isDarkMode ? "text-amber-400 border-slate-800" : "text-amber-600 border-slate-200")}>
                  <ShieldCheck size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider">Cảnh báo an toàn & Thận trọng đặc biệt</h3>
                </div>

                <div>
                  <label className={cn("block text-xs font-bold mb-1.5", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                    Cảnh báo & Thận trọng chung
                  </label>
                  <textarea
                    rows={4}
                    value={cautionGeneral}
                    onChange={(e) => setCautionGeneral(e.target.value)}
                    placeholder="Mô tả các cảnh báo an toàn thuốc, nguy cơ phản ứng da nghiêm trọng (SJS, TEN), lưu ý theo dõi công thức máu, chức năng gan thận..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs leading-relaxed outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-amber-500" : "bg-white border-slate-300 text-slate-900 focus:border-amber-600"
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Thời kỳ mang thai (Thai kỳ)
                    </label>
                    <textarea
                      rows={3}
                      value={cautionPregnancy}
                      onChange={(e) => setCautionPregnancy(e.target.value)}
                      placeholder="Khả năng qua nhau thai, phân loại an toàn thai kỳ FDA (A/B/C/D/X), lưu ý sử dụng theo từng 3 tháng thai kỳ..."
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Thời kỳ cho con bú
                    </label>
                    <textarea
                      rows={3}
                      value={cautionLactation}
                      onChange={(e) => setCautionLactation(e.target.value)}
                      placeholder="Mức độ bài tiết vào sữa mẹ, ảnh hưởng đối với trẻ bú mẹ, chỉ định ngưng cho con bú hoặc tiếp tục theo dõi..."
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Người bệnh Suy gan
                    </label>
                    <textarea
                      rows={3}
                      value={cautionHepatic}
                      onChange={(e) => setCautionHepatic(e.target.value)}
                      placeholder="Giảm liều, theo dõi men gan..."
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Người bệnh Suy thận
                    </label>
                    <textarea
                      rows={3}
                      value={cautionRenal}
                      onChange={(e) => setCautionRenal(e.target.value)}
                      placeholder="Hiệu chỉnh liều theo eGFR / ClCr..."
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">
                      Người cao tuổi
                    </label>
                    <textarea
                      rows={3}
                      value={cautionElderly}
                      onChange={(e) => setCautionElderly(e.target.value)}
                      placeholder="Theo dõi hạ huyết áp tư thế, giảm liều khởi đầu..."
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: ADR & TƯƠNG TÁC THUỐC */}
            {activeTab === 'adr_interactions' && (
              <div className="space-y-6">
                {/* Adverse Reactions */}
                <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-5", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                  <div className={cn("flex items-center gap-2 border-b pb-3", isDarkMode ? "text-orange-400 border-slate-800" : "text-orange-600 border-slate-200")}>
                    <AlertTriangle size={18} />
                    <h3 className="text-sm font-black uppercase tracking-wider">Tác dụng không mong muốn (ADR) theo phân loại tần suất</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {adrList.map((group) => (
                      <div
                        key={group.frequency}
                        className={cn(
                          "p-4 rounded-2xl border space-y-3",
                          isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <p className={cn("text-xs font-black", isDarkMode ? "text-orange-400" : "text-orange-700")}>
                          {group.frequency}
                        </p>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newAdrInputs[group.frequency] || ''}
                            onChange={(e) => setNewAdrInputs(prev => ({ ...prev, [group.frequency]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAdrEffect(group.frequency); } }}
                            placeholder="Thêm tác dụng phụ..."
                            className={cn(
                              "flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none shadow-2xs",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddAdrEffect(group.frequency)}
                            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {group.effects.map((eff, effIdx) => (
                            <div
                              key={effIdx}
                              className={cn(
                                "px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-2xs",
                                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-orange-100 text-slate-800"
                              )}
                            >
                              <span className="flex-1">• {eff}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAdrEffect(group.frequency, effIdx)}
                                className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          {group.effects.length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">Chưa có tác dụng phụ nào ở nhóm này.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drug Interactions */}
                <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-4", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                  <div className={cn("flex items-center justify-between border-b pb-3", isDarkMode ? "border-slate-800" : "border-slate-200")}>
                    <h3 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-rose-400" : "text-rose-600")}>
                      <AlertTriangle size={18} /> Tương tác thuốc (Drug-Drug Interactions)
                    </h3>
                    <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", isDarkMode ? "bg-rose-950/50 text-rose-400" : "bg-rose-50 text-rose-600")}>
                      {drugInteractions.length} tương tác
                    </span>
                  </div>

                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={newInteraction}
                      onChange={(e) => setNewInteraction(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInteraction(); } }}
                      placeholder="VD: Rượu, Cholestyramin làm giảm hấp thu; Isoniazid tăng độc tính gan..."
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleAddInteraction}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-rose-600/20"
                    >
                      <Plus size={15} /> Thêm tương tác
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    {drugInteractions.map((inter, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-2xl border text-xs flex items-start justify-between gap-3 shadow-2xs",
                          isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-rose-50/30 border-rose-100 text-slate-800"
                        )}
                      >
                        <div className="flex items-start gap-2.5 flex-1">
                          <span className="text-rose-500 font-black">⚡</span>
                          <span className="leading-relaxed font-medium">{inter}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveInteraction(idx)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    {drugInteractions.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">Chưa có tương tác thuốc nào được ghi nhận.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: QUÁ LIỀU & BẢO QUẢN */}
            {activeTab === 'overdose' && (
              <div className={cn("p-5 sm:p-7 rounded-3xl border shadow-sm space-y-6", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-white border-slate-200")}>
                <div className={cn("flex items-center gap-2 border-b pb-3", isDarkMode ? "text-purple-400 border-slate-800" : "text-purple-600 border-slate-200")}>
                  <ShieldAlert size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider">Độc tính, Quá liều & Điều kiện bảo quản</h3>
                </div>

                <div>
                  <label className={cn("block text-xs font-bold mb-1.5 flex items-center gap-1.5", isDarkMode ? "text-rose-400" : "text-rose-600")}>
                    <AlertTriangle size={15} />
                    Triệu chứng quá liều & Độc tính
                  </label>
                  <textarea
                    rows={4}
                    value={overdoseSymptoms}
                    onChange={(e) => setOverdoseSymptoms(e.target.value)}
                    placeholder="Mô tả các biểu hiện lâm sàng ngộ độc cấp hoặc mạn tính: buồn nôn, nôn, đau bụng, hoại tử tế bào gan, suy thận cấp..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs leading-relaxed outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-rose-500" : "bg-white border-slate-300 text-slate-900 focus:border-rose-600"
                    )}
                  />
                </div>

                <div>
                  <label className={cn("block text-xs font-bold mb-1.5 flex items-center gap-1.5", isDarkMode ? "text-teal-400" : "text-teal-600")}>
                    <ShieldCheck size={15} />
                    Xử trí quá liều & Thuốc giải độc đặc hiệu
                  </label>
                  <textarea
                    rows={4}
                    value={overdoseManagement}
                    onChange={(e) => setOverdoseManagement(e.target.value)}
                    placeholder="Biện pháp rửa dạ dày, dùng than hoạt, phác đồ dùng thuốc giải độc đặc hiệu (VD: N-acetylcystein / NAC cho Paracetamol, Naloxone cho Opioid)..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs leading-relaxed outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Điều kiện bảo quản chuẩn
                  </label>
                  <textarea
                    rows={3}
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    placeholder="Bảo quản nơi khô ráo, tránh ánh sáng trực tiếp, nhiệt độ dưới 30°C..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none shadow-2xs",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* CANCEL CONFIRMATION DIALOG */}
        <AnimatePresence>
          {showCancelConfirm && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                )}
              >
                <div className="flex items-center gap-3 text-amber-500">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-base">Xác nhận hủy bỏ?</h3>
                    <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>Nội dung đã có thay đổi</p>
                  </div>
                </div>

                <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                  Bạn có các nội dung vừa chỉnh sửa chưa được lưu. Nếu hủy bỏ ngay, các thông tin thay đổi này sẽ bị mất và khôi phục về trạng thái ban đầu.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    Tiếp tục chỉnh sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelConfirm(false);
                      onClose();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-600/20"
                  >
                    Xác nhận Hủy
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SAVE CONFIRMATION DIALOG WITH FIELD-BY-FIELD DIFF LIST */}
        <AnimatePresence>
          {showSaveConfirm && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "w-full max-w-lg max-h-[88vh] flex flex-col p-6 rounded-3xl border shadow-2xl space-y-4 overflow-hidden",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                )}
              >
                <div className={cn("flex items-center gap-3 shrink-0", isDarkMode ? "text-teal-400" : "text-teal-600")}>
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-base">Xác nhận lưu chuyên khảo Dược thư</h3>
                    <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      {monograph ? 'Kiểm tra danh sách nội dung sẽ thay đổi' : 'Tạo mới chuyên khảo chuẩn Dược thư Quốc gia'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {detectedDiffs.length > 0 ? (
                    <div className="space-y-2.5">
                      <p className={cn("text-xs font-bold flex items-center gap-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        <Info size={14} className="text-teal-500" />
                        Các mục sẽ được cập nhật ({detectedDiffs.length} mục):
                      </p>
                      <div className="space-y-2">
                        {detectedDiffs.map((diff, index) => (
                          <div
                            key={index}
                            className={cn(
                              "p-3 rounded-2xl border text-xs space-y-1",
                              isDarkMode ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200"
                            )}
                          >
                            <div className={cn("font-black", isDarkMode ? "text-teal-400" : "text-teal-600")}>{diff.field}</div>
                            {monograph && (
                              <div className={cn("text-[11px] line-through truncate", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                                Cũ: {diff.oldVal}
                              </div>
                            )}
                            <div className={cn("font-semibold truncate", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                              {monograph ? 'Mới: ' : ''}{diff.newVal}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={cn("p-4 rounded-2xl border text-xs text-center", isDarkMode ? "bg-slate-800/40 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")}>
                      Không phát hiện thay đổi nội dung so với phiên bản hiện tại. Bạn có muốn lưu lại không?
                    </div>
                  )}
                </div>

                <div className={cn("flex items-center justify-end gap-3 pt-3 border-t shrink-0", isDarkMode ? "border-slate-800" : "border-slate-200")}>
                  <button
                    type="button"
                    onClick={() => setShowSaveConfirm(false)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    Xem lại
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-teal-600/20"
                  >
                    {isSaving ? 'Đang lưu...' : 'Xác nhận Lưu'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
