import React, { useState, useEffect } from 'react';
import {
  X, Save, AlertCircle, Plus, Trash2, Check, Stethoscope,
  ChevronRight, FileText, Layers, Pill, Activity, AlertTriangle,
  ArrowUp, ArrowDown, Sparkles, BookOpen, Clock, HeartPulse,
  CheckCircle2, ShieldAlert, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, sanitizeFirestoreData } from '../lib/utils';
import { TreatmentGuideline, TreatmentGroup, ClinicalStep, DrugRegimenItem } from '../types';

interface TreatmentGuidelineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guideline: TreatmentGuideline) => Promise<void> | void;
  guideline?: TreatmentGuideline | null;
  groups: TreatmentGroup[];
  isDarkMode?: boolean;
}

const STEP_TYPE_OPTIONS = [
  { value: 'assessment', label: 'Thăm khám & Đánh giá ban đầu', color: '#2196F3' },
  { value: 'diagnostic', label: 'Chẩn đoán & Xét nghiệm CLS', color: '#9C27B0' },
  { value: 'decision', label: 'Phân nhánh & Ra quyết định', color: '#FF9800' },
  { value: 'treatment', label: 'Điều trị & Dùng thuốc', color: '#4CAF50' },
  { value: 'monitoring', label: 'Theo dõi & Đánh giá đáp ứng', color: '#00BCD4' },
  { value: 'emergency', label: 'Xử trí cấp cứu khẩn cấp', color: '#F44336' },
  { value: 'referral', label: 'Chuyển tuyến điều trị', color: '#795548' },
];

const DRUG_PRIORITY_OPTIONS = [
  { value: 'first_line', label: 'Tuyến 1 (Ưu tiên hàng đầu)', color: 'emerald' },
  { value: 'second_line', label: 'Tuyến 2 (Lựa chọn tiếp theo)', color: 'blue' },
  { value: 'alternative', label: 'Thuốc thay thế (Khi dị ứng/CCĐ)', color: 'amber' },
  { value: 'combination', label: 'Phối hợp đa thuốc', color: 'purple' },
];

const COMMON_ROUTES = [
  'Uống',
  'Tiêm tĩnh mạch',
  'Truyền tĩnh mạch',
  'Tiêm bắp',
  'Tiêm dưới da',
  'Khí dung / Hít',
  'Nhỏ mắt / Tai',
  'Tại chỗ / Bôi da',
  'Đặt dưới lưỡi',
  'Đặt hậu môn'
];

export const TreatmentGuidelineEditorModal: React.FC<TreatmentGuidelineEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  guideline,
  groups,
  isDarkMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'criteria' | 'flowchart' | 'regimens' | 'goals_lifestyle'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tab 1: General Info & Decision
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [icd10Input, setIcd10Input] = useState('');
  const [icd10Codes, setIcd10Codes] = useState<string[]>([]);
  const [severity, setSeverity] = useState('');
  const [summary, setSummary] = useState('');
  const [isHidden, setIsHidden] = useState(false);

  // Source / Legal
  const [org, setOrg] = useState('Bộ Y tế');
  const [docNum, setDocNum] = useState('');
  const [issueYear, setIssueYear] = useState<string | number>(new Date().getFullYear());
  const [signedDate, setSignedDate] = useState('');
  const [officialUrl, setOfficialUrl] = useState('');

  // Severity levels
  const [severityLevels, setSeverityLevels] = useState<Array<{ level: string; criteria: string; color: string; recommendedAction: string }>>([]);

  // Tab 2: Diagnostic Criteria & Red Flags
  const [clinicalCriteria, setClinicalCriteria] = useState<string[]>([]);
  const [newClinicalInput, setNewClinicalInput] = useState('');

  const [paraclinicalCriteria, setParaclinicalCriteria] = useState<string[]>([]);
  const [newParaclinicalInput, setNewParaclinicalInput] = useState('');

  const [differentialDiagnosis, setDifferentialDiagnosis] = useState<string[]>([]);
  const [newDifferentialInput, setNewDifferentialInput] = useState('');

  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [newRedFlagInput, setNewRedFlagInput] = useState('');

  // Tab 3: Flowchart Steps
  const [flowchartSteps, setFlowchartSteps] = useState<ClinicalStep[]>([]);

  // Tab 4: Drug Regimens
  const [regimens, setRegimens] = useState<Array<{
    categoryName: string;
    targetPatient?: string;
    drugs: DrugRegimenItem[];
    notes?: string;
  }>>([]);

  // Tab 5: Treatment Goals & Lifestyle
  const [treatmentGoals, setTreatmentGoals] = useState<Array<{
    metric: string;
    targetValue: string;
    timeline?: string;
    notes?: string;
  }>>([]);
  const [lifestyleAdvice, setLifestyleAdvice] = useState<string[]>([]);
  const [newLifestyleInput, setNewLifestyleInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  // Initialize or populate data when guideline changes
  useEffect(() => {
    if (guideline) {
      setId(guideline.id);
      setTitle(guideline.title || '');
      setDiseaseName(guideline.diseaseName || '');
      setGroupId(guideline.groupId || (groups[0]?.id || ''));
      setIcd10Codes(guideline.icd10Codes || []);
      setSeverity(guideline.severity || '');
      setSummary(guideline.summary || '');
      setIsHidden(!!guideline.isHidden);

      setOrg(guideline.source?.organization || 'Bộ Y tế');
      setDocNum(guideline.decisionNumber || guideline.source?.documentNumber || '');
      setIssueYear(guideline.effectiveYear || guideline.source?.issueYear || new Date().getFullYear());
      setSignedDate(guideline.source?.signedDate || '');
      setOfficialUrl(guideline.sourceUrl || guideline.source?.officialUrl || '');

      setSeverityLevels(guideline.severityLevels ? JSON.parse(JSON.stringify(guideline.severityLevels)) : []);

      setClinicalCriteria(guideline.diagnosticCriteria?.clinical ? [...guideline.diagnosticCriteria.clinical] : []);
      setParaclinicalCriteria(guideline.diagnosticCriteria?.paraclinical ? [...guideline.diagnosticCriteria.paraclinical] : []);
      setDifferentialDiagnosis(guideline.diagnosticCriteria?.differentialDiagnosis ? [...guideline.diagnosticCriteria.differentialDiagnosis] : []);
      setRedFlags(guideline.redFlags ? [...guideline.redFlags] : []);

      setFlowchartSteps(guideline.flowchartSteps ? JSON.parse(JSON.stringify(guideline.flowchartSteps)) : []);

      const existingRegs = guideline.regimens || guideline.drugRegimens;
      if (Array.isArray(existingRegs) && existingRegs.length > 0) {
        if ('drugs' in existingRegs[0]) {
          setRegimens(JSON.parse(JSON.stringify(existingRegs)));
        } else {
          setRegimens([
            {
              categoryName: 'Phác đồ điều trị dùng thuốc',
              drugs: JSON.parse(JSON.stringify(existingRegs))
            }
          ]);
        }
      } else {
        setRegimens([]);
      }

      setTreatmentGoals(guideline.treatmentGoals ? JSON.parse(JSON.stringify(guideline.treatmentGoals)) : []);
      setLifestyleAdvice(guideline.lifestyleAdvice ? [...guideline.lifestyleAdvice] : []);
      setKeywords(guideline.keywords ? [...guideline.keywords] : []);
    } else {
      // Create new empty form
      setId(`guide_${Date.now()}`);
      setTitle('');
      setDiseaseName('');
      setGroupId(groups[0]?.id || 'grp_cardio');
      setIcd10Codes([]);
      setSeverity('Nhẹ, Trung bình, Nặng');
      setSummary('');

      setOrg('Bộ Y tế');
      setDocNum('');
      setIssueYear(new Date().getFullYear());
      setSignedDate('');
      setOfficialUrl('');

      setSeverityLevels([
        { level: 'Mức độ nhẹ', criteria: 'Triệu chứng nhẹ, chưa có biến chứng', color: '#4CAF50', recommendedAction: 'Điều trị ngoại trú, theo dõi định kỳ' },
        { level: 'Mức độ trung bình', criteria: 'Triệu chứng rõ rệt, nguy cơ vừa', color: '#FF9800', recommendedAction: 'Điều trị nội/ngoại trú tích cực' },
        { level: 'Mức độ nặng / Nguy kịch', criteria: 'Có tổn thương cơ quan hoặc dấu hiệu nguy kịch', color: '#F44336', recommendedAction: 'Nhập viện theo dõi sát hoặc cấp cứu ngay' }
      ]);

      setClinicalCriteria([]);
      setParaclinicalCriteria([]);
      setDifferentialDiagnosis([]);
      setRedFlags([]);

      setFlowchartSteps([
        {
          id: `step_1_${Date.now()}`,
          stepNumber: 1,
          type: 'assessment',
          title: 'Bước 1: Tiếp nhận, khám lâm sàng và đánh giá mức độ',
          description: 'Thăm khám toàn diện, khai thác bệnh sử, tiền sử dị ứng và phân tầng mức độ bệnh.',
          keyActions: [
            'Đo dấu hiệu sinh tồn: Mạch, Nhiệt độ, Huyết áp, Nhịp thở, SpO2',
            'Khai thác triệu chứng cơ năng và thời gian khởi phát',
            'Khám thực thể phát hiện tổn thương cơ quan'
          ]
        },
        {
          id: `step_2_${Date.now()}`,
          stepNumber: 2,
          type: 'treatment',
          title: 'Bước 2: Lựa chọn phác đồ điều trị ban đầu',
          description: 'Bắt đầu dùng thuốc theo khuyến cáo ưu tiên hàng đầu của Bộ Y tế.',
          keyActions: [
            'Kê đơn thuốc tuyến 1 phù hợp với cơ địa người bệnh',
            'Kiểm tra chống chỉ định và tương tác thuốc trước khi dùng'
          ]
        }
      ]);

      setRegimens([
        {
          categoryName: 'Phác đồ khởi đầu (Tuyến 1)',
          targetPatient: 'Bệnh nhân mới chẩn đoán hoặc mức độ nhẹ - vừa',
          notes: 'Theo dõi đáp ứng lâm sàng sau 48 - 72 giờ',
          drugs: [
            {
              drugName: '',
              activeIngredient: '',
              dosage: '',
              route: 'Uống',
              frequency: '1 lần/ngày',
              priority: 'first_line',
              contraindications: [],
              clinicalNotes: ''
            }
          ]
        }
      ]);

      setTreatmentGoals([
        {
          metric: 'Triệu chứng lâm sàng',
          targetValue: 'Hết sốt, thuyên giảm rõ rệt sau 48 - 72 giờ',
          timeline: '48 - 72 giờ'
        }
      ]);
      setLifestyleAdvice([
        'Nghỉ ngơi hợp lý, tránh lao động quá sức trong đợt bệnh cấp',
        'Uống đủ nước, chế độ dinh dưỡng giàu vitamin và cân bằng',
        'Tái khám ngay nếu xuất hiện các dấu hiệu báo động đỏ'
      ]);
      setKeywords([]);
      setIsHidden(false);
    }
    setActiveTab('info');
    setErrorMessage(null);
  }, [guideline, isOpen, groups]);

  if (!isOpen) return null;

  // Handler for adding ICD-10
  const handleAddIcd10 = () => {
    const trimmed = icd10Input.trim().toUpperCase();
    if (trimmed && !icd10Codes.includes(trimmed)) {
      setIcd10Codes([...icd10Codes, trimmed]);
      setIcd10Input('');
    }
  };

  const handleRemoveIcd10 = (code: string) => {
    setIcd10Codes(icd10Codes.filter((c) => c !== code));
  };

  // Handler for adding keywords
  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  // Flowchart steps reorder & add
  const handleAddStep = () => {
    const newStep: ClinicalStep = {
      id: `step_${flowchartSteps.length + 1}_${Date.now()}`,
      stepNumber: flowchartSteps.length + 1,
      type: 'treatment',
      title: `Bước ${flowchartSteps.length + 1}: Hành động điều trị tiếp theo`,
      description: 'Mô tả chi tiết nội dung can thiệp lâm sàng theo hướng dẫn.',
      keyActions: ['Hành động 1']
    };
    setFlowchartSteps([...flowchartSteps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = flowchartSteps.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      stepNumber: idx + 1
    }));
    setFlowchartSteps(updated);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === flowchartSteps.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...flowchartSteps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // Reassign step numbers
    setFlowchartSteps(updated.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  // Regimen management
  const handleAddRegimenCategory = () => {
    setRegimens([
      ...regimens,
      {
        categoryName: `Phác đồ bậc ${regimens.length + 1}`,
        targetPatient: '',
        notes: '',
        drugs: [
          {
            drugName: '',
            activeIngredient: '',
            dosage: '',
            route: 'Uống',
            frequency: '1 lần/ngày',
            priority: 'first_line',
            contraindications: [],
            clinicalNotes: ''
          }
        ]
      }
    ]);
  };

  const handleRemoveRegimenCategory = (catIdx: number) => {
    setRegimens(regimens.filter((_, idx) => idx !== catIdx));
  };

  const handleAddDrugToRegimen = (catIdx: number) => {
    const updated = [...regimens];
    updated[catIdx].drugs.push({
      drugName: '',
      activeIngredient: '',
      dosage: '',
      route: 'Uống',
      frequency: '1 lần/ngày',
      priority: 'first_line',
      contraindications: [],
      clinicalNotes: ''
    });
    setRegimens(updated);
  };

  const handleRemoveDrugFromRegimen = (catIdx: number, drugIdx: number) => {
    const updated = [...regimens];
    updated[catIdx].drugs = updated[catIdx].drugs.filter((_, idx) => idx !== drugIdx);
    setRegimens(updated);
  };

  // Submit & Save
  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập Tiêu đề Hướng dẫn điều trị.');
      setActiveTab('info');
      return;
    }
    if (!diseaseName.trim()) {
      setErrorMessage('Vui lòng nhập Tên bệnh học.');
      setActiveTab('info');
      return;
    }
    if (!groupId) {
      setErrorMessage('Vui lòng chọn Nhóm điều trị chuyên khoa.');
      setActiveTab('info');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const guidelineData: TreatmentGuideline = {
        id: id.trim() || `guide_${Date.now()}`,
        title: title.trim(),
        diseaseName: diseaseName.trim(),
        groupId,
        icd10Codes,
        severity: severity.trim() || undefined,
        summary: summary.trim(),
        isHidden: !!isHidden,
        source: {
          organization: org.trim() || 'Bộ Y tế',
          documentNumber: docNum.trim() || 'Quyết định chuyên môn Bộ Y tế',
          issueYear: Number(issueYear) || new Date().getFullYear(),
          signedDate: signedDate.trim() || undefined,
          officialUrl: officialUrl.trim() || undefined
        },
        decisionNumber: docNum.trim() || undefined,
        effectiveYear: Number(issueYear) || undefined,
        sourceUrl: officialUrl.trim() || undefined,
        severityLevels: severityLevels.filter((sl) => sl.level.trim() !== ''),
        diagnosticCriteria: {
          clinical: clinicalCriteria.filter((c) => c.trim() !== ''),
          paraclinical: paraclinicalCriteria.filter((p) => p.trim() !== ''),
          differentialDiagnosis: differentialDiagnosis.filter((d) => d.trim() !== '')
        },
        redFlags: redFlags.filter((f) => f.trim() !== ''),
        flowchartSteps: flowchartSteps.map((step, idx) => ({
          ...step,
          stepNumber: idx + 1,
          keyActions: step.keyActions.filter((a) => a.trim() !== '')
        })),
        regimens: regimens.map((reg) => ({
          ...reg,
          drugs: reg.drugs.filter((d) => d.drugName.trim() !== '')
        })),
        treatmentGoals: treatmentGoals.filter((g) => g.metric.trim() !== ''),
        lifestyleAdvice: lifestyleAdvice.filter((l) => l.trim() !== ''),
        keywords: keywords.length > 0 ? keywords : [diseaseName.toLowerCase(), title.toLowerCase()],
        updatedAt: new Date().toISOString()
      };

      if (!guideline) {
        guidelineData.createdAt = new Date().toISOString();
      }

      await onSave(guidelineData);
      onClose();
    } catch (err: any) {
      console.error('Error saving guideline:', err);
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi lưu hướng dẫn điều trị.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn(
          "w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden my-auto",
          isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
        )}
      >
        {/* Header */}
        <div className={cn(
          "px-5 py-4 border-b flex items-center justify-between gap-4 shrink-0",
          isDarkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-slate-50/80"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {guideline ? 'Chỉnh sửa Hướng dẫn điều trị' : 'Thêm mới Hướng dẫn điều trị'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Chuẩn Bộ Y tế
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cập nhật phác đồ chẩn đoán, sơ đồ các bước xử trí và chỉ định thuốc lưu trữ đám mây
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={cn(
          "flex items-center px-4 border-b overflow-x-auto no-scrollbar shrink-0 gap-1 text-xs font-bold",
          isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        )}>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={cn(
              "px-3.5 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors",
              activeTab === 'info'
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <BookOpen size={15} />
            <span>1. Thông tin chung & Quyết định</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('criteria')}
            className={cn(
              "px-3.5 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors",
              activeTab === 'criteria'
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Activity size={15} />
            <span>2. Tiêu chuẩn & Cảnh báo đỏ ({clinicalCriteria.length + redFlags.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flowchart')}
            className={cn(
              "px-3.5 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors",
              activeTab === 'flowchart'
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Layers size={15} />
            <span>3. Sơ đồ xử trí lâm sàng ({flowchartSteps.length} bước)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regimens')}
            className={cn(
              "px-3.5 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors",
              activeTab === 'regimens'
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Pill size={15} />
            <span>4. Phác đồ thuốc ({regimens.reduce((acc, r) => acc + (r.drugs?.length || 0), 0)} thuốc)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('goals_lifestyle')}
            className={cn(
              "px-3.5 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors",
              activeTab === 'goals_lifestyle'
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <HeartPulse size={15} />
            <span>5. Mục tiêu & Lối sống ({treatmentGoals.length})</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: THÔNG TIN CHUNG & QUYẾT ĐỊNH */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300">
                    Tiêu đề Hướng dẫn điều trị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Hướng dẫn chẩn đoán và điều trị Tăng huyết áp người lớn"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none focus:ring-2 focus:ring-blue-500/30 transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300">
                    Tên bệnh học chính <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={diseaseName}
                    onChange={(e) => setDiseaseName(e.target.value)}
                    placeholder="VD: Tăng huyết áp nguyên phát (Vô căn)"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none focus:ring-2 focus:ring-blue-500/30 transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300">
                    Nhóm chuyên khoa điều trị <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border outline-none focus:ring-2 focus:ring-blue-500/30 transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  >
                    {groups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        {grp.name} {grp.code ? `(${grp.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300">
                    Mức độ bệnh / Phân tầng
                  </label>
                  <input
                    type="text"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    placeholder="VD: Độ 1, Độ 2, Cấp cứu"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none focus:ring-2 focus:ring-blue-500/30 transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300">
                    Mã ICD-10 liên quan
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={icd10Input}
                      onChange={(e) => setIcd10Input(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIcd10();
                        }
                      }}
                      placeholder="VD: I10, I15..."
                      className={cn(
                        "flex-1 px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none focus:ring-2 focus:ring-blue-500/30 uppercase",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleAddIcd10}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                  {icd10Codes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {icd10Codes.map((code) => (
                        <span
                          key={code}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1"
                        >
                          {code}
                          <button
                            type="button"
                            onClick={() => handleRemoveIcd10(code)}
                            className="hover:text-rose-500 text-slate-400 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Legal / Quyết định */}
              <div className={cn(
                "p-4 rounded-2xl border space-y-3",
                isDarkMode ? "bg-slate-800/50 border-slate-700/80" : "bg-slate-50 border-slate-200/80"
              )}>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <FileText size={15} className="text-blue-500" />
                  <span>Căn cứ pháp lý & Quyết định ban hành</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                      Cơ quan ban hành
                    </label>
                    <input
                      type="text"
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      placeholder="Bộ Y tế"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border outline-none",
                        isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                      Số Quyết định / Văn bản
                    </label>
                    <input
                      type="text"
                      value={docNum}
                      onChange={(e) => setDocNum(e.target.value)}
                      placeholder="VD: Quyết định số 5968/QĐ-BYT"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border outline-none",
                        isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                      Năm ban hành / Hiệu lực
                    </label>
                    <input
                      type="number"
                      value={issueYear}
                      onChange={(e) => setIssueYear(e.target.value)}
                      placeholder="2020"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border outline-none",
                        isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                      Ngày ký ban hành
                    </label>
                    <input
                      type="text"
                      value={signedDate}
                      onChange={(e) => setSignedDate(e.target.value)}
                      placeholder="VD: 20/12/2020"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border outline-none",
                        isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                    Đường dẫn liên kết văn bản gốc (Bộ Y tế / Cục KCB)
                  </label>
                  <input
                    type="text"
                    value={officialUrl}
                    onChange={(e) => setOfficialUrl(e.target.value)}
                    placeholder="https://kcb.vn/van-ban/..."
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs border outline-none",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300">
                  Tóm tắt tổng quan hướng dẫn
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Mô tả tóm tắt định hướng tiếp cận chẩn đoán, nguyên tắc xử trí và phác đồ dùng thuốc chính..."
                  className={cn(
                    "w-full p-3 rounded-xl text-xs font-medium border outline-none focus:ring-2 focus:ring-blue-500/30 resize-y",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              {/* Trạng thái hiển thị / Ẩn phác đồ */}
              <div className={cn(
                "p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all",
                isHidden
                  ? (isDarkMode ? "bg-amber-950/20 border-amber-800/60" : "bg-amber-50/80 border-amber-200")
                  : (isDarkMode ? "bg-slate-800/40 border-slate-700/80" : "bg-slate-50/80 border-slate-200")
              )}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-black uppercase tracking-wider flex items-center gap-1.5",
                      isHidden ? "text-amber-600 dark:text-amber-400" : (isDarkMode ? "text-slate-200" : "text-slate-800")
                    )}>
                      {isHidden ? <EyeOff size={14} /> : <Eye size={14} className="text-slate-400" />}
                      <span>Ẩn phác đồ điều trị này</span>
                    </span>
                    {isHidden && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                        Đang ẩn
                      </span>
                    )}
                  </div>
                  <p className={cn("text-[11px] leading-relaxed max-w-xl", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Khi kích hoạt tùy chọn này, phác đồ sẽ bị ẩn khỏi danh sách tra cứu thông thường của nhân viên y tế (chỉ người có quyền quản lý mới xem và khôi phục được).
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isHidden}
                    onChange={(e) => setIsHidden(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Severity Levels table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Bảng phân tầng mức độ bệnh & Hành động khuyến cáo
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSeverityLevels([
                        ...severityLevels,
                        { level: '', criteria: '', color: '#FF9800', recommendedAction: '' }
                      ]);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 transition-colors flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Thêm mức độ</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {severityLevels.map((sl, sIdx) => (
                    <div
                      key={sIdx}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col md:flex-row items-start md:items-center gap-3",
                        isDarkMode ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200"
                      )}
                    >
                      <div className="w-full md:w-48">
                        <input
                          type="text"
                          value={sl.level}
                          onChange={(e) => {
                            const updated = [...severityLevels];
                            updated[sIdx].level = e.target.value;
                            setSeverityLevels(updated);
                          }}
                          placeholder="Tên mức độ (Độ 1, Nặng...)"
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg text-xs border font-bold",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          value={sl.criteria}
                          onChange={(e) => {
                            const updated = [...severityLevels];
                            updated[sIdx].criteria = e.target.value;
                            setSeverityLevels(updated);
                          }}
                          placeholder="Tiêu chuẩn lâm sàng / chỉ số cận lâm sàng..."
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg text-xs border",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          value={sl.recommendedAction}
                          onChange={(e) => {
                            const updated = [...severityLevels];
                            updated[sIdx].recommendedAction = e.target.value;
                            setSeverityLevels(updated);
                          }}
                          placeholder="Hành động khuyến cáo (Khởi trị, cấp cứu...)"
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg text-xs border",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSeverityLevels(severityLevels.filter((_, idx) => idx !== sIdx));
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 self-end md:self-center"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIÊU CHUẨN CHẨN ĐOÁN & CẢNH BÁO ĐỎ */}
          {activeTab === 'criteria' && (
            <div className="space-y-6">
              {/* Cảnh báo đỏ (Red Flags) */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all",
                isDarkMode ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50/80 border-rose-200"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs font-black uppercase tracking-wider",
                    isDarkMode ? "text-rose-400" : "text-rose-700"
                  )}>
                    <AlertTriangle size={16} />
                    <span>Dấu hiệu báo động đỏ (Cần xử trí cấp cứu khẩn cấp)</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRedFlagInput}
                    onChange={(e) => setNewRedFlagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newRedFlagInput.trim()) {
                          setRedFlags([...redFlags, newRedFlagInput.trim()]);
                          setNewRedFlagInput('');
                        }
                      }
                    }}
                    placeholder="Thêm dấu hiệu nguy kịch (VD: Huyết áp tâm thu > 180 mmHg, lơ mơ, khó thở cấp...)"
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs border outline-none",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRedFlagInput.trim()) {
                        setRedFlags([...redFlags, newRedFlagInput.trim()]);
                        setNewRedFlagInput('');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
                  >
                    Thêm
                  </button>
                </div>

                {redFlags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {redFlags.map((flag, fIdx) => (
                      <span
                        key={fIdx}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5",
                          isDarkMode ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-white text-rose-800 border-rose-200 shadow-xs"
                        )}
                      >
                        <span>⚠️ {flag}</span>
                        <button
                          type="button"
                          onClick={() => setRedFlags(redFlags.filter((_, idx) => idx !== fIdx))}
                          className="text-rose-400 hover:text-rose-700 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tiêu chuẩn lâm sàng */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>1. Tiêu chuẩn chẩn đoán lâm sàng</span>
                  <span className="text-[11px] font-normal text-slate-400">({clinicalCriteria.length} tiêu chuẩn)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClinicalInput}
                    onChange={(e) => setNewClinicalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newClinicalInput.trim()) {
                          setClinicalCriteria([...clinicalCriteria, newClinicalInput.trim()]);
                          setNewClinicalInput('');
                        }
                      }
                    }}
                    placeholder="Nhập triệu chứng lâm sàng (VD: Đo HA tại phòng khám ≥ 140/90 mmHg trong 2 lần khám...)"
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs border outline-none",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newClinicalInput.trim()) {
                        setClinicalCriteria([...clinicalCriteria, newClinicalInput.trim()]);
                        setNewClinicalInput('');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Thêm
                  </button>
                </div>
                <div className="space-y-1.5">
                  {clinicalCriteria.map((crit, cIdx) => (
                    <div
                      key={cIdx}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3",
                        isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {cIdx + 1}
                        </span>
                        <span>{crit}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClinicalCriteria(clinicalCriteria.filter((_, idx) => idx !== cIdx))}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiêu chuẩn cận lâm sàng */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>2. Tiêu chuẩn cận lâm sàng & Xét nghiệm</span>
                  <span className="text-[11px] font-normal text-slate-400">({paraclinicalCriteria.length} xét nghiệm)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newParaclinicalInput}
                    onChange={(e) => setNewParaclinicalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newParaclinicalInput.trim()) {
                          setParaclinicalCriteria([...paraclinicalCriteria, newParaclinicalInput.trim()]);
                          setNewParaclinicalInput('');
                        }
                      }
                    }}
                    placeholder="Nhập xét nghiệm cận lâm sàng (VD: Điện tâm đồ ECG 12 chuyển đạo, Sinh hóa máu Creatinine...)"
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs border outline-none",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newParaclinicalInput.trim()) {
                        setParaclinicalCriteria([...paraclinicalCriteria, newParaclinicalInput.trim()]);
                        setNewParaclinicalInput('');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Thêm
                  </button>
                </div>
                <div className="space-y-1.5">
                  {paraclinicalCriteria.map((crit, pIdx) => (
                    <div
                      key={pIdx}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3",
                        isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {pIdx + 1}
                        </span>
                        <span>{crit}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setParaclinicalCriteria(paraclinicalCriteria.filter((_, idx) => idx !== pIdx))}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chẩn đoán phân biệt */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>3. Chẩn đoán phân biệt</span>
                  <span className="text-[11px] font-normal text-slate-400">({differentialDiagnosis.length} chẩn đoán)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDifferentialInput}
                    onChange={(e) => setNewDifferentialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newDifferentialInput.trim()) {
                          setDifferentialDiagnosis([...differentialDiagnosis, newDifferentialInput.trim()]);
                          setNewDifferentialInput('');
                        }
                      }
                    }}
                    placeholder="VD: Tăng huyết áp áo choàng trắng, tăng huyết áp thứ phát do bệnh nhu mô thận..."
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs border outline-none",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newDifferentialInput.trim()) {
                        setDifferentialDiagnosis([...differentialDiagnosis, newDifferentialInput.trim()]);
                        setNewDifferentialInput('');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Thêm
                  </button>
                </div>
                <div className="space-y-1.5">
                  {differentialDiagnosis.map((crit, dIdx) => (
                    <div
                      key={dIdx}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3",
                        isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {dIdx + 1}
                        </span>
                        <span>{crit}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDifferentialDiagnosis(differentialDiagnosis.filter((_, idx) => idx !== dIdx))}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SƠ ĐỒ CÁC BƯỚC LÂM SÀNG (FLOWCHART STEPS) */}
          {activeTab === 'flowchart' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Trình tự các bước xử trí lâm sàng ({flowchartSteps.length} bước)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sơ đồ hóa theo các chặng tiếp nhận, đánh giá, ra quyết định và dùng thuốc
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={15} />
                  <span>Thêm bước xử trí</span>
                </button>
              </div>

              <div className="space-y-4">
                {flowchartSteps.map((step, sIdx) => (
                  <div
                    key={step.id || sIdx}
                    className={cn(
                      "p-4 rounded-2xl border space-y-3 transition-all",
                      isDarkMode ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200 shadow-xs"
                    )}
                  >
                    {/* Top Row of Step */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {sIdx + 1}
                        </span>
                        <div className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                          Bước {sIdx + 1}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={sIdx === 0}
                          onClick={() => handleMoveStep(sIdx, 'up')}
                          className="p-1.5 rounded-lg border text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                          title="Di chuyển lên trên"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={sIdx === flowchartSteps.length - 1}
                          onClick={() => handleMoveStep(sIdx, 'down')}
                          className="p-1.5 rounded-lg border text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                          title="Di chuyển xuống dưới"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(sIdx)}
                          className="p-1.5 rounded-lg border text-rose-500 hover:bg-rose-500/10 ml-2"
                          title="Xóa bước này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                          Tiêu đề bước
                        </label>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...flowchartSteps];
                            updated[sIdx].title = e.target.value;
                            setFlowchartSteps(updated);
                          }}
                          placeholder="VD: Bước 1: Tiếp nhận và đo HA đúng chuẩn"
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                          Loại can thiệp
                        </label>
                        <select
                          value={step.type}
                          onChange={(e) => {
                            const updated = [...flowchartSteps];
                            updated[sIdx].type = e.target.value as any;
                            setFlowchartSteps(updated);
                          }}
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        >
                          {STEP_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                          Điều kiện áp dụng (Nếu có)
                        </label>
                        <input
                          type="text"
                          value={step.condition || ''}
                          onChange={(e) => {
                            const updated = [...flowchartSteps];
                            updated[sIdx].condition = e.target.value;
                            setFlowchartSteps(updated);
                          }}
                          placeholder="VD: Khi người bệnh có HATT ≥ 140 mmHg..."
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs border outline-none",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                          Nhãn nổi bật / Khung giờ
                        </label>
                        <input
                          type="text"
                          value={step.badge || ''}
                          onChange={(e) => {
                            const updated = [...flowchartSteps];
                            updated[sIdx].badge = e.target.value;
                            setFlowchartSteps(updated);
                          }}
                          placeholder="VD: Khởi trị / Cấp cứu / 48 giờ"
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs border outline-none",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                        Mô tả chi tiết cách xử trí
                      </label>
                      <textarea
                        rows={2}
                        value={step.description}
                        onChange={(e) => {
                          const updated = [...flowchartSteps];
                          updated[sIdx].description = e.target.value;
                          setFlowchartSteps(updated);
                        }}
                        placeholder="Nội dung chuyên môn hướng dẫn bác sĩ thực hiện tại bước này..."
                        className={cn(
                          "w-full p-2.5 rounded-xl text-xs border outline-none resize-y",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        )}
                      />
                    </div>

                    {/* Key Actions List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Các hành động chính cần làm tại bước này ({step.keyActions.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...flowchartSteps];
                            updated[sIdx].keyActions.push('Hành động mới');
                            setFlowchartSteps(updated);
                          }}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          + Thêm hành động
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {step.keyActions.map((action, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">•</span>
                            <input
                              type="text"
                              value={action}
                              onChange={(e) => {
                                const updated = [...flowchartSteps];
                                updated[sIdx].keyActions[aIdx] = e.target.value;
                                setFlowchartSteps(updated);
                              }}
                              className={cn(
                                "flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none",
                                isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...flowchartSteps];
                                updated[sIdx].keyActions = updated[sIdx].keyActions.filter((_, idx) => idx !== aIdx);
                                setFlowchartSteps(updated);
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PHÁC ĐỒ DÙNG THUỐC (REGIMENS & DRUGS) */}
          {activeTab === 'regimens' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Các nhóm phác đồ điều trị dùng thuốc
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Phân chia theo phác đồ khởi đầu, tăng bậc, phối hợp hoặc thay thế
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRegimenCategory}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={15} />
                  <span>Thêm nhóm phác đồ</span>
                </button>
              </div>

              <div className="space-y-6">
                {regimens.map((reg, rIdx) => (
                  <div
                    key={rIdx}
                    className={cn(
                      "p-4 rounded-2xl border space-y-4 transition-all",
                      isDarkMode ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                    )}
                  >
                    {/* Header of Regimen Category */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/80">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                            Tên nhóm phác đồ
                          </label>
                          <input
                            type="text"
                            value={reg.categoryName}
                            onChange={(e) => {
                              const updated = [...regimens];
                              updated[rIdx].categoryName = e.target.value;
                              setRegimens(updated);
                            }}
                            placeholder="VD: Phác đồ khởi trị phối hợp 2 thuốc (SPC)"
                            className={cn(
                              "w-full px-3 py-1.5 rounded-xl text-xs font-bold border outline-none",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                            Đối tượng chỉ định
                          </label>
                          <input
                            type="text"
                            value={reg.targetPatient || ''}
                            onChange={(e) => {
                              const updated = [...regimens];
                              updated[rIdx].targetPatient = e.target.value;
                              setRegimens(updated);
                            }}
                            placeholder="VD: Bệnh nhân Độ 1 nguy cơ cao hoặc Độ 2..."
                            className={cn(
                              "w-full px-3 py-1.5 rounded-xl text-xs border outline-none",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleAddDrugToRegimen(rIdx)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Plus size={13} />
                          <span>Thêm thuốc</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRegimenCategory(rIdx)}
                          className="p-1.5 rounded-xl border text-rose-500 hover:bg-rose-500/10"
                          title="Xóa nhóm phác đồ này"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Drugs list in this regimen */}
                    <div className="space-y-3">
                      {reg.drugs.map((drug, dIdx) => (
                        <div
                          key={dIdx}
                          className={cn(
                            "p-3 rounded-xl border space-y-2.5",
                            isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-slate-50/70 border-slate-200/80"
                          )}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Tên thuốc / Biệt dược</label>
                              <input
                                type="text"
                                value={drug.drugName}
                                onChange={(e) => {
                                  const updated = [...regimens];
                                  updated[rIdx].drugs[dIdx].drugName = e.target.value;
                                  setRegimens(updated);
                                }}
                                placeholder="VD: Amlodipine 5mg"
                                className={cn(
                                  "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Hoạt chất chính</label>
                              <input
                                type="text"
                                value={drug.activeIngredient || ''}
                                onChange={(e) => {
                                  const updated = [...regimens];
                                  updated[rIdx].drugs[dIdx].activeIngredient = e.target.value;
                                  setRegimens(updated);
                                }}
                                placeholder="VD: Amlodipine besylate"
                                className={cn(
                                  "w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Liều dùng</label>
                              <input
                                type="text"
                                value={drug.dosage}
                                onChange={(e) => {
                                  const updated = [...regimens];
                                  updated[rIdx].drugs[dIdx].dosage = e.target.value;
                                  setRegimens(updated);
                                }}
                                placeholder="VD: 5mg - 10mg / ngày"
                                className={cn(
                                  "w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Đường dùng</label>
                                <select
                                  value={drug.route}
                                  onChange={(e) => {
                                    const updated = [...regimens];
                                    updated[rIdx].drugs[dIdx].route = e.target.value;
                                    setRegimens(updated);
                                  }}
                                  className={cn(
                                    "w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                  )}
                                >
                                  {COMMON_ROUTES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveDrugFromRegimen(rIdx, dIdx)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 mt-4 shrink-0"
                                title="Xóa thuốc này"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Tần suất dùng</label>
                              <input
                                type="text"
                                value={drug.frequency}
                                onChange={(e) => {
                                  const updated = [...regimens];
                                  updated[rIdx].drugs[dIdx].frequency = e.target.value;
                                  setRegimens(updated);
                                }}
                                placeholder="VD: 1 lần/ngày vào buổi sáng"
                                className={cn(
                                  "w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Tuyến điều trị</label>
                              <select
                                value={drug.priority}
                                onChange={(e) => {
                                  const updated = [...regimens];
                                  updated[rIdx].drugs[dIdx].priority = e.target.value as any;
                                  setRegimens(updated);
                                }}
                                className={cn(
                                  "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                              >
                                {DRUG_PRIORITY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Lưu ý lâm sàng / Tác dụng phụ</label>
                              <input
                                type="text"
                                value={drug.clinicalNotes || ''}
                                onChange={(e) => {
                                  const updated = [...regimens];
                                  updated[rIdx].drugs[dIdx].clinicalNotes = e.target.value;
                                  setRegimens(updated);
                                }}
                                placeholder="VD: Cảnh báo phù chân mắt cá..."
                                className={cn(
                                  "w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: MỤC TIÊU ĐIỀU TRỊ & LỐI SỐNG */}
          {activeTab === 'goals_lifestyle' && (
            <div className="space-y-6">
              {/* Treatment Goals */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Mục tiêu điều trị cần đạt
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Các chỉ số đo lường hiệu quả điều trị và khung thời gian đạt đích
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTreatmentGoals([
                        ...treatmentGoals,
                        { metric: '', targetValue: '', timeline: '' }
                      ]);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-600/20 transition-colors flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Thêm mục tiêu</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {treatmentGoals.map((goal, gIdx) => (
                    <div
                      key={gIdx}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col md:flex-row items-start md:items-center gap-2.5",
                        isDarkMode ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200"
                      )}
                    >
                      <div className="w-full md:w-56">
                        <input
                          type="text"
                          value={goal.metric}
                          onChange={(e) => {
                            const updated = [...treatmentGoals];
                            updated[gIdx].metric = e.target.value;
                            setTreatmentGoals(updated);
                          }}
                          placeholder="Chỉ số (VD: Huyết áp phòng khám)"
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          value={goal.targetValue}
                          onChange={(e) => {
                            const updated = [...treatmentGoals];
                            updated[gIdx].targetValue = e.target.value;
                            setTreatmentGoals(updated);
                          }}
                          placeholder="Giá trị đích (VD: < 130/80 mmHg)"
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <div className="w-full md:w-44">
                        <input
                          type="text"
                          value={goal.timeline || ''}
                          onChange={(e) => {
                            const updated = [...treatmentGoals];
                            updated[gIdx].timeline = e.target.value;
                            setTreatmentGoals(updated);
                          }}
                          placeholder="Thời hạn (VD: Trong 3 tháng)"
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setTreatmentGoals(treatmentGoals.filter((_, idx) => idx !== gIdx))}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 shrink-0 self-end md:self-center"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lời khuyên lối sống */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Lời khuyên thay đổi lối sống & Dinh dưỡng</span>
                  <span className="text-[11px] font-normal text-slate-400">({lifestyleAdvice.length} lời khuyên)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLifestyleInput}
                    onChange={(e) => setNewLifestyleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newLifestyleInput.trim()) {
                          setLifestyleAdvice([...lifestyleAdvice, newLifestyleInput.trim()]);
                          setNewLifestyleInput('');
                        }
                      }
                    }}
                    placeholder="VD: Giảm muối < 5g/ngày, tăng cường rau quả tươi, tập thể dục 30 phút/ngày..."
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs border outline-none",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newLifestyleInput.trim()) {
                        setLifestyleAdvice([...lifestyleAdvice, newLifestyleInput.trim()]);
                        setNewLifestyleInput('');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Thêm
                  </button>
                </div>
                <div className="space-y-1.5">
                  {lifestyleAdvice.map((advice, aIdx) => (
                    <div
                      key={aIdx}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3",
                        isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold text-sm">✓</span>
                        <span>{advice}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLifestyleAdvice(lifestyleAdvice.filter((_, idx) => idx !== aIdx))}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Từ khóa tìm kiếm */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Từ khóa tra cứu nhanh (Keywords)
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    placeholder="VD: cao huyết áp, hạ áp, acei, arb..."
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs border outline-none",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Thêm từ khóa
                  </button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 flex items-center gap-1"
                      >
                        #{kw}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw)}
                          className="hover:text-rose-500 text-slate-400 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={cn(
          "px-5 py-3.5 border-t flex items-center justify-between gap-3 shrink-0",
          isDarkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-slate-50/80"
        )}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold border transition-colors",
              isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
            )}
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'Đang lưu trữ...' : (guideline ? 'Lưu thay đổi' : 'Tạo mới phác đồ')}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
