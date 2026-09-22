import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Award,
  Layers,
  Pill,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
  Edit3,
  CopyPlus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Stethoscope,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TreatmentGroup, TreatmentGuideline as ITreatmentGuideline, ClinicalStep, DrugRegimenItem } from '../types';
import { renderMedicalGroupIcon } from './TreatmentGroupManagement';
import { getDecisionNumber, getEffectiveYear, getSourceUrl, getAllDrugsFromGuideline } from './TreatmentGuideline';
import { cn } from '../lib/utils';

interface TreatmentGuidelineDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  guideline: ITreatmentGuideline | null;
  guidelines?: ITreatmentGuideline[];
  onSelectGuideline?: (guideline: ITreatmentGuideline) => void;
  groups: TreatmentGroup[];
  isDarkMode: boolean;
  isPrivileged?: boolean;
  onEdit?: (guideline: ITreatmentGuideline) => void;
  onDuplicate?: (guideline: ITreatmentGuideline) => void;
  onDelete?: (id: string) => void;
  onNavigateToDrug?: (drugName: string) => void;
  onNavigateToICD10?: (code: string) => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const TreatmentGuidelineDetailModal: React.FC<TreatmentGuidelineDetailModalProps> = ({
  isOpen,
  onClose,
  guideline,
  guidelines = [],
  onSelectGuideline,
  groups,
  isDarkMode,
  isPrivileged = false,
  onEdit,
  onDuplicate,
  onDelete,
  onNavigateToDrug,
  onNavigateToICD10,
  favorites = [],
  onToggleFavorite
}) => {
  const [activeTab, setActiveTab] = useState<'flowchart' | 'regimens' | 'criteria' | 'source'>('flowchart');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keyboard shortcut: Esc to close / exit fullscreen, F to toggle fullscreen, Left/Right arrows to navigate
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an editable input
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'ArrowLeft' && guidelines.length > 1 && guideline && onSelectGuideline) {
        const currIdx = guidelines.findIndex((g) => g.id === guideline.id);
        if (currIdx > 0) {
          onSelectGuideline(guidelines[currIdx - 1]);
        }
      } else if (e.key === 'ArrowRight' && guidelines.length > 1 && guideline && onSelectGuideline) {
        const currIdx = guidelines.findIndex((g) => g.id === guideline.id);
        if (currIdx < guidelines.length - 1 && currIdx !== -1) {
          onSelectGuideline(guidelines[currIdx + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, guidelines, guideline, onClose, onSelectGuideline, isFullscreen]);

  if (!isOpen || !guideline) return null;

  const currentGroup = groups.find((grp) => grp.id === guideline.groupId) || null;
  const isFav = favorites.includes(guideline.id);
  const currentIndex = guidelines.findIndex((g) => g.id === guideline.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < guidelines.length - 1;

  const handleCopySummary = () => {
    const allDrugs = getAllDrugsFromGuideline(guideline);
    const goalsSummary = guideline.treatmentGoals
      ? guideline.treatmentGoals.map((g) => `${g.metric}: ${g.targetValue}`).join('; ')
      : Array.isArray(guideline.goals)
        ? guideline.goals.join('; ')
        : 'Xem chi tiết trong phác đồ';

    const text = `[HƯỚNG DẪN ĐIỀU TRỊ BỘ Y TẾ]
${guideline.title} (${guideline.icd10Codes?.join(', ') || ''})
Quyết định: ${getDecisionNumber(guideline)}
Đích điều trị: ${goalsSummary}
Phác đồ khuyến cáo:
${allDrugs.map((dr: any, idx) => `${idx + 1}. ${dr.drugName} (${dr.activeIngredient || dr.genericName || ''}) - Liều: ${dr.dosage}, Đường: ${dr.route}. Lưu ý: ${dr.clinicalNotes || dr.notes || 'Không'}`).join('\n')}
Cảnh báo đỏ: ${guideline.redFlags?.join('; ') || 'Theo dõi sát dấu hiệu sinh tồn'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStepColor = (type?: string) => {
    switch (type) {
      case 'emergency':
        return { bg: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-500/10 border-rose-500/30' };
      case 'medication':
        return { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-500/10 border-blue-500/30' };
      case 'assessment':
        return { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-500/10 border-amber-500/30' };
      case 'monitoring':
        return { bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-500/10 border-indigo-500/30' };
      default:
        return { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-500/10 border-emerald-500/30' };
    }
  };

  return (
    <AnimatePresence>
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs overflow-y-auto transition-all",
          isFullscreen ? "p-0" : "p-2 sm:p-4 md:p-6"
        )}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex flex-col shadow-2xl overflow-hidden transition-all",
            isFullscreen
              ? "w-full h-full max-w-none max-h-none rounded-none border-0 m-0"
              : "w-full max-w-5xl max-h-[92vh] rounded-[28px] border my-auto",
            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          )}
        >
          {/* Modal Header Bar */}
          <div
            onDoubleClick={() => setIsFullscreen(!isFullscreen)}
            className={cn(
              "p-4 sm:p-6 border-b transition-colors shrink-0 select-none",
              isDarkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-100 bg-slate-50/80"
            )}
            title="Nhấp đúp vào đây để bật/tắt toàn màn hình"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Badges: Group, Decision, ICD-10 */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentGroup && (
                  <span
                    className="px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                    style={{
                      backgroundColor: `${currentGroup.color || '#2196F3'}20`,
                      color: currentGroup.color || '#2196F3'
                    }}
                  >
                    {renderMedicalGroupIcon(currentGroup.icon, 14)}
                    {currentGroup.name}
                  </span>
                )}

                {getDecisionNumber(guideline) && (
                  <span
                    className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1",
                      isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    <Award size={13} className="text-amber-500" />
                    {getDecisionNumber(guideline)}
                  </span>
                )}

                {guideline.icd10Codes?.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onNavigateToICD10?.(code)}
                    className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    title="Bấm để tra cứu ICD-10"
                  >
                    ICD-10: {code}
                  </button>
                ))}

                {guideline.severity === 'critical' && (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wider">
                    Cấp cứu khẩn
                  </span>
                )}
              </div>

              {/* Action buttons: Edit, Duplicate, Delete, Copy, Print, Close */}
              <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                {isPrivileged && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit?.(guideline)}
                      className="p-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs shadow-blue-500/20"
                      title="Chỉnh sửa nội dung phác đồ"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicate?.(guideline)}
                      className={cn(
                        "p-2 rounded-xl text-xs font-bold border transition-colors",
                        isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      )}
                      title="Nhân bản phác đồ này"
                    >
                      <CopyPlus size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete?.(guideline.id)}
                      className="p-1.5 rounded-xl text-xs font-bold border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Xóa phác đồ này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}

                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(guideline.id)}
                    className={cn(
                      "p-2 rounded-xl text-xs font-bold border transition-colors",
                      isFav
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                        : isDarkMode
                          ? "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
                          : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                    )}
                    title={isFav ? "Bỏ lưu yêu thích" : "Lưu vào yêu thích"}
                  >
                    {isFav ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className={cn(
                    "p-2 rounded-xl text-xs font-bold border transition-colors",
                    isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  )}
                  title={copied ? "Đã sao chép tóm tắt" : "Sao chép tóm tắt phác đồ"}
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  title="In phác đồ điều trị này"
                  className={cn(
                    "p-2 rounded-xl text-xs font-bold border transition-colors",
                    isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Printer size={15} />
                </button>

                {/* Fullscreen toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className={cn(
                    "p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                    isFullscreen
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : isDarkMode
                        ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  )}
                  title={isFullscreen ? "Thu nhỏ cửa sổ (Rời toàn màn hình) - Phím F hoặc Esc" : "Toàn màn hình (Full screen) - Phím F hoặc nhấp đúp thanh tiêu đề"}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                {/* Close modal */}
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "p-2 rounded-xl border transition-colors ml-1",
                    isDarkMode
                      ? "border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                      : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  )}
                  title="Đóng cửa sổ (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Title & Summary */}
            <div className="mt-3">
              <h2 className={cn("text-xl sm:text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                {guideline.title}
              </h2>
              {guideline.summary && (
                <p className={cn("text-xs sm:text-sm mt-1 leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                  {guideline.summary}
                </p>
              )}
            </div>

            {/* Treatment Targets / Goals Badges */}
            {((guideline.treatmentGoals && guideline.treatmentGoals.length > 0) || (guideline.goals && guideline.goals.length > 0)) && (
              <div className="mt-3.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  <CheckCircle2 size={14} />
                  <span>Đích kiểm soát điều trị</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {guideline.treatmentGoals?.map((tg, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-300">{tg.metric}: </span>
                        <span>{tg.targetValue}</span>
                        {tg.timeline && <span className="text-[10px] text-slate-400 block font-normal">{tg.timeline}</span>}
                      </div>
                    </div>
                  ))}
                  {!guideline.treatmentGoals && Array.isArray(guideline.goals) && guideline.goals.map((goal: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red Flags / Dấu hiệu báo động đỏ */}
            {guideline.redFlags && guideline.redFlags.length > 0 && (
              <div className={cn(
                "mt-3 p-3.5 rounded-2xl border transition-colors",
                isDarkMode ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50/80 border-rose-200"
              )}>
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-black uppercase tracking-wider mb-2",
                  isDarkMode ? "text-rose-400" : "text-rose-700"
                )}>
                  <AlertTriangle size={14} className={isDarkMode ? "text-rose-400" : "text-rose-600"} />
                  <span>Dấu hiệu báo động đỏ (Cần xử trí cấp cứu ngay)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {guideline.redFlags.map((flag, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-colors",
                        isDarkMode
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : "bg-white text-rose-800 border-rose-200 shadow-2xs"
                      )}
                    >
                      <span className={isDarkMode ? "text-rose-400" : "text-rose-600 font-normal"}>⚠️</span>
                      <span>{flag}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs Bar */}
            <div className="mt-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('flowchart')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0",
                  activeTab === 'flowchart'
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Layers size={14} />
                <span>Sơ đồ phác đồ trực quan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('regimens')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0",
                  activeTab === 'regimens'
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Pill size={14} />
                <span>Phác đồ dùng thuốc ({getAllDrugsFromGuideline(guideline).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('criteria')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0",
                  activeTab === 'criteria'
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                )}
              >
                <FileText size={14} />
                <span>Tiêu chuẩn & Phân tầng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0",
                  activeTab === 'source'
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Award size={14} />
                <span>Nguồn Bộ Y tế</span>
              </button>
            </div>
          </div>

          {/* Modal Content Body - Scrollable */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {/* Tab 1: FLOWCHART */}
            {activeTab === 'flowchart' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-slate-300" : "text-slate-800")}>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Quy trình điều trị từng bước theo khuyến cáo Bộ Y tế
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {guideline.flowchartSteps?.length || 0} giai đoạn lâm sàng
                  </span>
                </div>

                {/* Step Diagram Nodes */}
                <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-emerald-500 before:to-indigo-500">
                  {guideline.flowchartSteps?.map((step, idx) => {
                    const stepColors = getStepColor(step.type);
                    const stepNum = step.order || (step as any).stepNumber || idx + 1;
                    const duration = step.duration || (step as any).timeframe;
                    const nextCondition = step.nextCondition || (step as any).condition;

                    return (
                      <div key={step.id || idx} className="relative group">
                        {/* Node Icon Circle */}
                        <div
                          className={cn(
                            "absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2",
                            isDarkMode ? "border-slate-900" : "border-white",
                            stepColors.bg
                          )}
                        >
                          {stepNum}
                        </div>

                        {/* Node Card */}
                        <div
                          className={cn(
                            "p-4 sm:p-5 rounded-2xl border transition-all",
                            isDarkMode
                              ? "bg-slate-800/60 border-slate-700/80 hover:bg-slate-800"
                              : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border", stepColors.light, stepColors.text)}>
                                Bước {stepNum}
                              </span>
                              <h4 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                                {step.title}
                              </h4>
                            </div>

                            {duration && (
                              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock size={12} />
                                {duration}
                              </span>
                            )}
                          </div>

                          <p className={cn("text-xs sm:text-sm mt-2 leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                            {step.description}
                          </p>

                          {/* Key actions */}
                          {step.keyActions && step.keyActions.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                                Hành động lâm sàng trọng tâm:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {step.keyActions.map((action, aIdx) => (
                                  <div
                                    key={aIdx}
                                    className={cn(
                                      "p-2 rounded-xl text-xs font-bold flex items-start gap-2 border",
                                      isDarkMode ? "bg-slate-900/40 border-slate-700/60 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                                    )}
                                  >
                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Next condition indicator */}
                          {nextCondition && (
                            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                              <ArrowRight size={14} className="shrink-0" />
                              <span>Điều kiện chuyển bước: {nextCondition}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: DRUG REGIMENS */}
            {activeTab === 'regimens' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-slate-300" : "text-slate-800")}>
                    <Pill size={16} className="text-blue-600" />
                    Phác đồ & Chỉ định thuốc chuẩn Quốc gia
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    {getAllDrugsFromGuideline(guideline).length} thuốc khuyến cáo
                  </span>
                </div>

                {/* Render category-grouped regimens if available */}
                {guideline.regimens && guideline.regimens.length > 0 ? (
                  <div className="space-y-6">
                    {guideline.regimens.map((category, catIdx) => (
                      <div key={catIdx} className="space-y-3">
                        <div className={cn("px-4 py-2.5 rounded-xl border flex items-center justify-between gap-2", isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-blue-50/70 border-blue-200")}>
                          <div>
                            <h4 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-blue-400" : "text-blue-800")}>
                              {category.categoryName}
                            </h4>
                            {category.targetPatient && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {category.targetPatient}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {category.drugs?.length || 0} thuốc
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {category.drugs?.map((regimen: any, idx: number) => {
                            const isFirstLine = regimen.priority === 'first_line';
                            const isEmergency = regimen.priority === 'emergency' || regimen.priority === 'combination';
                            const activeIng = regimen.activeIngredient || regimen.genericName;

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "p-4 rounded-2xl border transition-all relative overflow-hidden",
                                  isEmergency
                                    ? "bg-rose-500/5 border-rose-500/30"
                                    : isFirstLine
                                      ? isDarkMode
                                        ? "bg-slate-800/60 border-blue-500/50 shadow-md"
                                        : "bg-blue-50/30 border-blue-200 shadow-sm"
                                      : isDarkMode
                                        ? "bg-slate-800/30 border-slate-700"
                                        : "bg-white border-slate-200"
                                )}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className={cn("text-base font-black flex items-center gap-2", isDarkMode ? "text-white" : "text-slate-900")}>
                                      <span>{regimen.drugName}</span>
                                      {activeIng && activeIng !== regimen.drugName && (
                                        <span className="text-xs font-bold text-slate-400 font-normal">
                                          ({activeIng})
                                        </span>
                                      )}
                                    </h4>

                                    <span
                                      className={cn(
                                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                        isEmergency
                                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                          : isFirstLine
                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                      )}
                                    >
                                      {isEmergency ? 'Khẩn cấp / Phối hợp' : isFirstLine ? 'Ưu tiên hàng 1' : 'Hàng 2 / Thay thế'}
                                    </span>

                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600")}>
                                      Đường dùng: {regimen.route}
                                    </span>
                                  </div>

                                  {onNavigateToDrug && (
                                    <button
                                      type="button"
                                      onClick={() => onNavigateToDrug(regimen.drugName)}
                                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-center"
                                    >
                                      <span>Tra cứu thuốc này</span>
                                      <ExternalLink size={12} />
                                    </button>
                                  )}
                                </div>

                                {/* Dosage & Frequency details */}
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xs")}>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                      Liều dùng khuyến cáo
                                    </span>
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                      {regimen.dosage}
                                    </span>
                                  </div>

                                  {regimen.frequency && (
                                    <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xs")}>
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Cách dùng & Số lần
                                      </span>
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {regimen.frequency}
                                      </span>
                                    </div>
                                  )}

                                  {regimen.duration && (
                                    <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xs")}>
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Thời gian điều trị
                                      </span>
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {regimen.duration}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Notes & Clinical pearls */}
                                {(regimen.clinicalNotes || regimen.notes) && (
                                  <p className={cn("text-xs mt-3 leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                                    <span className="font-black text-slate-400">Lưu ý lâm sàng: </span>
                                    {regimen.clinicalNotes || regimen.notes}
                                  </p>
                                )}

                                {/* Contraindications */}
                                {regimen.contraindications && regimen.contraindications.length > 0 && (
                                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                                    <span className={cn("text-[10px] font-black uppercase", isDarkMode ? "text-rose-400" : "text-rose-700")}>Chống chỉ định:</span>
                                    {regimen.contraindications.map((contra: string, cIdx: number) => (
                                      <span
                                        key={cIdx}
                                        className={cn(
                                          "text-[10px] font-bold px-2 py-0.5 rounded border",
                                          isDarkMode
                                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                            : "bg-rose-50 text-rose-700 border-rose-200 shadow-2xs"
                                        )}
                                      >
                                        {contra}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {getAllDrugsFromGuideline(guideline).map((regimen: any, idx: number) => {
                      const isFirstLine = regimen.priority === 'first_line';
                      const isEmergency = regimen.priority === 'emergency' || regimen.priority === 'combination';
                      const activeIng = regimen.activeIngredient || regimen.genericName;

                      return (
                        <div
                          key={regimen.id || idx}
                          className={cn(
                            "p-5 rounded-2xl border transition-all relative overflow-hidden",
                            isEmergency
                              ? "bg-rose-500/5 border-rose-500/30"
                              : isFirstLine
                                ? isDarkMode
                                  ? "bg-slate-800/60 border-blue-500/50 shadow-md"
                                  : "bg-blue-50/30 border-blue-200 shadow-sm"
                                : isDarkMode
                                  ? "bg-slate-800/30 border-slate-700"
                                  : "bg-white border-slate-200"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={cn("text-base font-black flex items-center gap-2", isDarkMode ? "text-white" : "text-slate-900")}>
                                <span>{regimen.drugName}</span>
                                {activeIng && activeIng !== regimen.drugName && (
                                  <span className="text-xs font-bold text-slate-400 font-normal">
                                    ({activeIng})
                                  </span>
                                )}
                              </h4>

                              <span
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                  isEmergency
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                    : isFirstLine
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                )}
                              >
                                {isEmergency ? 'Khẩn cấp / Phối hợp' : isFirstLine ? 'Ưu tiên hàng 1' : 'Hàng 2 / Thay thế'}
                              </span>

                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600")}>
                                Đường dùng: {regimen.route}
                              </span>
                            </div>

                            {onNavigateToDrug && (
                              <button
                                type="button"
                                onClick={() => onNavigateToDrug(regimen.drugName)}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-center"
                              >
                                <span>Tra cứu thuốc này</span>
                                <ExternalLink size={12} />
                              </button>
                            )}
                          </div>

                          {/* Dosage & Frequency details */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xs")}>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                Liều dùng khuyến cáo
                              </span>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {regimen.dosage}
                              </span>
                            </div>

                            {regimen.frequency && (
                              <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-xs")}>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                  Cách dùng & Số lần
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {regimen.frequency}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Notes & Clinical pearls */}
                          {(regimen.clinicalNotes || regimen.notes) && (
                            <p className={cn("text-xs mt-3 leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                              <span className="font-black text-slate-400">Lưu ý lâm sàng: </span>
                              {regimen.clinicalNotes || regimen.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: CRITERIA & SEVERITY */}
            {activeTab === 'criteria' && (
              <div className="space-y-6">
                {/* Diagnostic criteria */}
                {guideline.diagnosticCriteria && (
                  <div className="space-y-3">
                    <h3 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-slate-300" : "text-slate-800")}>
                      <FileText size={16} className="text-blue-600" />
                      Tiêu chuẩn chẩn đoán xác định
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Clinical criteria */}
                      {guideline.diagnosticCriteria.clinical && guideline.diagnosticCriteria.clinical.length > 0 && (
                        <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200")}>
                          <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2.5">
                            Tiêu chuẩn Lâm sàng
                          </h4>
                          <ul className="space-y-2">
                            {guideline.diagnosticCriteria.clinical.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Paraclinical criteria */}
                      {guideline.diagnosticCriteria.paraclinical && guideline.diagnosticCriteria.paraclinical.length > 0 && (
                        <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200")}>
                          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2.5">
                            Tiêu chuẩn Cận lâm sàng & Xét nghiệm
                          </h4>
                          <ul className="space-y-2">
                            {guideline.diagnosticCriteria.paraclinical.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Risk Stratification / Severity Matrix */}
                {((guideline.severityLevels && guideline.severityLevels.length > 0) || (guideline.riskStratification && guideline.riskStratification.length > 0)) && (
                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-slate-300" : "text-slate-800")}>
                      <ShieldAlert size={16} className="text-amber-500" />
                      Bảng phân tầng mức độ bệnh & Xử trí lâm sàng
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {guideline.severityLevels?.map((sev, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-4 rounded-2xl border",
                            isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200 shadow-xs"
                          )}
                        >
                          <span className="text-xs font-black block mb-1" style={{ color: sev.color || '#2196F3' }}>
                            {sev.level}
                          </span>
                          <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                            {sev.criteria}
                          </p>
                          {sev.recommendedAction && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              ➔ {sev.recommendedAction}
                            </div>
                          )}
                        </div>
                      ))}
                      {!guideline.severityLevels && guideline.riskStratification?.map((risk, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-4 rounded-2xl border",
                            isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200 shadow-xs"
                          )}
                        >
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400 block mb-1">
                            {risk.level}
                          </span>
                          <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                            {risk.criteria}
                          </p>
                          {risk.action && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              ➔ {risk.action}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: OFFICIAL SOURCE & LEGAL */}
            {activeTab === 'source' && (
              <div className="space-y-4">
                <div className={cn("p-5 rounded-2xl border", isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Award size={24} />
                    </div>
                    <div>
                      <h4 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                        Cơ sở pháp lý & Tài liệu tham khảo chính thống
                      </h4>
                      <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        Ban hành theo Quyết định chuyên môn của Bộ Y tế Việt Nam
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100")}>
                      <span className="text-slate-400 font-bold block mb-1">Số Quyết định:</span>
                      <span className="font-black text-slate-800 dark:text-slate-100">
                        {getDecisionNumber(guideline)}
                      </span>
                    </div>

                    {getEffectiveYear(guideline) && (
                      <div className={cn("p-3 rounded-xl border", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100")}>
                        <span className="text-slate-400 font-bold block mb-1">Năm ban hành / Cập nhật:</span>
                        <span className="font-black text-slate-800 dark:text-slate-100">
                          {getEffectiveYear(guideline)}
                        </span>
                      </div>
                    )}
                  </div>

                  {getSourceUrl(guideline) && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Xem văn bản gốc trực tuyến:</span>
                      <a
                        href={getSourceUrl(guideline)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>Mở liên kết Bộ Y tế</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Navigation */}
          {guidelines.length > 1 && onSelectGuideline && (
            <div
              className={cn(
                "p-3.5 sm:p-4 border-t flex items-center justify-between gap-3 shrink-0",
                isDarkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-100 bg-slate-50/90"
              )}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onSelectGuideline(guidelines[currentIndex - 1])}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all",
                    !hasPrev
                      ? "opacity-40 cursor-not-allowed border-transparent text-slate-400"
                      : isDarkMode
                        ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                        : "border-slate-200 hover:bg-white text-slate-700 shadow-2xs"
                  )}
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Phác đồ trước</span>
                </button>

                <span className="text-xs text-slate-400 font-bold px-1">
                  {currentIndex + 1} / {guidelines.length}
                </span>

                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => hasNext && onSelectGuideline(guidelines[currentIndex + 1])}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all",
                    !hasNext
                      ? "opacity-40 cursor-not-allowed border-transparent text-slate-400"
                      : isDarkMode
                        ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                        : "border-slate-200 hover:bg-white text-slate-700 shadow-2xs"
                  )}
                >
                  <span className="hidden sm:inline">Phác đồ kế tiếp</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="text-[11px] text-slate-400 hidden sm:block">
                <span>Dùng phím <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">→</kbd> chuyển phác đồ, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">F</kbd> {isFullscreen ? "thu nhỏ" : "toàn màn hình"}, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">Esc</kbd> để {isFullscreen ? "thoát full / đóng" : "đóng"}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
