import React, { useState, useEffect } from 'react';
import {
  BookOpen, Edit3, Eye, Save, X, RotateCcw,
  Printer, ShieldCheck, Award, FileText, Users, Building,
  Calendar, CheckCircle2, AlertCircle, Plus, Trash2, Sparkles,
  BookmarkCheck, Quote, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PharmacopoeiaForeword, DEFAULT_PHARMACOPOEIA_FOREWORD } from '../lib/pharmacopoeiaData';

interface PharmacopoeiaForewordModalProps {
  isOpen: boolean;
  onClose: () => void;
  foreword: PharmacopoeiaForeword;
  onSave: (foreword: PharmacopoeiaForeword) => Promise<void> | void;
  canManage?: boolean;
  initialMode?: 'view' | 'edit';
  isDarkMode?: boolean;
}

export const PharmacopoeiaForewordModal: React.FC<PharmacopoeiaForewordModalProps> = ({
  isOpen,
  onClose,
  foreword,
  onSave,
  canManage = false,
  initialMode = 'view',
  isDarkMode = false
}) => {
  const [activeMode, setActiveMode] = useState<'view' | 'edit'>(initialMode);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Form State
  const [formData, setFormData] = useState<PharmacopoeiaForeword>(() => ({
    ...DEFAULT_PHARMACOPOEIA_FOREWORD,
    ...foreword
  }));

  const [newMemberText, setNewMemberText] = useState('');

  // Reset form when modal opens or foreword changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...DEFAULT_PHARMACOPOEIA_FOREWORD,
        ...foreword
      });
      setActiveMode(initialMode);
    }
  }, [isOpen, foreword, initialMode]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleRestoreDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục Lời nói đầu về nội dung mẫu chuẩn của Dược thư Quốc gia Việt Nam III (Bộ Y tế)?')) {
      setFormData({ ...DEFAULT_PHARMACOPOEIA_FOREWORD });
    }
  };

  const handleAddMember = () => {
    if (!newMemberText.trim()) return;
    setFormData(prev => ({
      ...prev,
      councilMembers: [...(prev.councilMembers || []), newMemberText.trim()]
    }));
    setNewMemberText('');
  };

  const handleRemoveMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      councilMembers: (prev.councilMembers || []).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập tiêu đề Lời nói đầu');
      return;
    }
    if (!formData.content.trim()) {
      alert('Vui lòng nhập nội dung Lời nói đầu');
      return;
    }

    try {
      setIsSaving(true);
      const dataToSave: PharmacopoeiaForeword = {
        ...formData,
        updatedAt: new Date().toISOString()
      };
      await onSave(dataToSave);
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3000);
      setActiveMode('view');
    } catch (err: any) {
      console.error('Save foreword error:', err);
      alert(err?.message || 'Có lỗi xảy ra khi lưu Lời nói đầu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className={cn(
          "w-full max-w-5xl h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors",
          isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Header */}
        <div className={cn(
          "px-5 sm:px-8 py-4 border-b flex items-center justify-between gap-4 shrink-0 shadow-xs",
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md",
              isDarkMode ? "bg-emerald-600 shadow-emerald-600/20" : "bg-teal-600 shadow-teal-600/20"
            )}>
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight line-clamp-1">
                  {activeMode === 'edit' ? 'Soạn thảo & Chỉnh sửa Lời nói đầu' : formData.title || 'Lời nói đầu Dược thư Quốc gia'}
                </h2>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0",
                  isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  {activeMode === 'edit' ? 'Chế độ chỉnh sửa' : 'Chính thức'}
                </span>
              </div>
              <p className={cn("text-xs font-medium line-clamp-1 mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                {formData.publisher} • {formData.edition}
              </p>
            </div>
          </div>

          {/* Action Tabs and Controls */}
          <div className="flex items-center gap-2">
            {canManage && (
              <div className={cn(
                "p-1 rounded-2xl border flex items-center text-xs font-bold",
                isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-200"
              )}>
                <button
                  type="button"
                  onClick={() => setActiveMode('view')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                    activeMode === 'view'
                      ? (isDarkMode ? "bg-slate-700 text-white shadow-xs" : "bg-white text-slate-900 shadow-xs")
                      : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                  )}
                >
                  <Eye size={14} />
                  <span>Xem trước</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('edit')}
                  title="Chỉnh sửa"
                  aria-label="Chỉnh sửa"
                  className={cn(
                    "p-2 sm:px-2.5 sm:py-1.5 rounded-xl transition-all flex items-center justify-center cursor-pointer",
                    activeMode === 'edit'
                      ? "bg-emerald-600 text-white shadow-xs"
                      : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                  )}
                >
                  <Edit3 size={15} />
                </button>
              </div>
            )}

            {activeMode === 'view' && (
              <button
                type="button"
                onClick={handlePrint}
                title="In Lời nói đầu"
                className={cn(
                  "p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                <Printer size={15} />
                <span className="hidden sm:inline">In</span>
              </button>
            )}

            {activeMode === 'edit' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                title={isSaving ? 'Đang lưu...' : 'Lưu Lời nói đầu'}
                aria-label="Lưu Lời nói đầu"
                className="p-2 sm:px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl border transition-colors cursor-pointer ml-1",
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
              )}
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        <AnimatePresence>
          {saveSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-600 text-white flex items-center gap-2 text-xs font-bold shadow-lg"
            >
              <CheckCircle2 size={16} />
              <span>Đã lưu Lời nói đầu Dược thư Quốc gia thành công lên hệ thống!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {activeMode === 'view' ? (
            /* ==================== VIEW MODE (TRANG TRỌNG / OFFICIAL READER) ==================== */
            <div className="max-w-4xl mx-auto space-y-8 print:p-0">
              {/* Header Emblem & Official Titles */}
              <div className={cn(
                "text-center space-y-3 pb-6 border-b border-dashed",
                isDarkMode ? "border-slate-800" : "border-slate-300"
              )}>
                <div className="flex justify-center mb-1">
                  <div className={cn(
                    "w-14 h-14 rounded-3xl border flex items-center justify-center shadow-inner",
                    isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-600 border-teal-200"
                  )}>
                    <ShieldCheck size={32} />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className={cn(
                    "text-xs sm:text-sm font-black uppercase tracking-widest",
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  )}>
                    {formData.publisher}
                  </h3>
                  <h1 className={cn("text-2xl sm:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                    {formData.title}
                  </h1>
                  <p className={cn("text-sm font-bold", isDarkMode ? "text-teal-400" : "text-teal-600")}>
                    {formData.edition}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
                  {formData.decisionNumber && (
                    <span className={cn("px-3 py-1 rounded-full border font-medium", isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700")}>
                      📜 {formData.decisionNumber}
                    </span>
                  )}
                  {formData.effectiveDate && (
                    <span className={cn("px-3 py-1 rounded-full border font-medium", isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700")}>
                      📅 Ngày hiệu lực: {formData.effectiveDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Main Foreword Paragraphs */}
              <div className="space-y-4 text-sm sm:text-base leading-relaxed text-justify">
                {formData.content.split('\n\n').filter(p => p.trim()).map((para, idx) => {
                  const trimmed = para.trim();
                  if (idx === 0 && trimmed.length > 0) {
                    const firstChar = trimmed.charAt(0);
                    const restText = trimmed.slice(1);
                    return (
                      <p
                        key={idx}
                        className={cn(
                          "indent-6 sm:indent-8 leading-8",
                          isDarkMode ? "text-slate-200" : "text-slate-800"
                        )}
                      >
                        <span
                          className={cn(
                            "text-2xl sm:text-3xl font-black inline-block align-baseline leading-none relative top-[0.1px] mr-[0.5px]",
                            isDarkMode ? "text-teal-400" : "text-teal-600"
                          )}
                        >
                          {firstChar}
                        </span>
                        {restText}
                      </p>
                    );
                  }

                  return (
                    <p
                      key={idx}
                      className={cn(
                        "indent-6 sm:indent-8 leading-8",
                        isDarkMode ? "text-slate-200" : "text-slate-800"
                      )}
                    >
                      {para}
                    </p>
                  );
                })}
              </div>

              {/* Legal & Regulatory Guidelines Box */}
              {formData.guidelinesSummary && (
                <div className={cn(
                  "p-5 rounded-3xl border relative overflow-hidden space-y-2",
                  isDarkMode ? "bg-teal-950/20 border-teal-800/40 text-teal-200" : "bg-teal-50/60 border-teal-200/80 text-teal-900"
                )}>
                  <div className={cn(
                    "flex items-center gap-2 font-black text-xs uppercase tracking-wider",
                    isDarkMode ? "text-teal-400" : "text-teal-600"
                  )}>
                    <BookmarkCheck size={16} />
                    <span>Giá trị pháp lý và nguyên tắc áp dụng chuyên môn</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed italic">
                    "{formData.guidelinesSummary}"
                  </p>
                </div>
              )}

              {/* Council & Editorial Board */}
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t",
                isDarkMode ? "border-slate-800" : "border-slate-200"
              )}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                    <Users size={15} className="text-teal-500" />
                    <span>Hội đồng biên soạn & Ban chỉ đạo</span>
                  </div>

                  {formData.chiefEditor && (
                    <div className={cn("p-3.5 rounded-2xl border", isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-200")}>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDarkMode ? "text-teal-400" : "text-teal-600")}>
                        Chủ tịch Hội đồng / Tổng biên tập
                      </span>
                      <span className={cn("text-xs font-black mt-0.5 block", isDarkMode ? "text-white" : "text-slate-900")}>
                        {formData.chiefEditor}
                      </span>
                    </div>
                  )}

                  {formData.councilMembers && formData.councilMembers.length > 0 && (
                    <div className={cn("p-4 rounded-2xl border space-y-2", isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50 border-slate-200")}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thành viên Ban chỉ đạo & Hội đồng chuyên môn</span>
                      <ul className="space-y-1.5 text-xs">
                        {formData.councilMembers.map((m, mIdx) => (
                          <li key={mIdx} className="flex items-start gap-2">
                            <span className="text-teal-500 font-bold mt-0.5">•</span>
                            <span className={cn(isDarkMode ? "text-slate-300" : "text-slate-700")}>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Formal Signatory Block */}
                <div className="flex flex-col justify-end items-end text-right space-y-2 pt-6 md:pt-0">
                  <p className="text-xs italic text-slate-400">Hà Nội, ngày ban hành theo quyết định</p>
                  <p className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-teal-400" : "text-teal-600")}>
                    {formData.signatoryTitle || 'Thay mặt Bộ Y tế & Hội đồng Dược thư'}
                  </p>
                  <div className="h-16 flex items-center justify-end">
                    <span className="text-xs italic text-slate-400 font-serif">(Đã ký và phê duyệt)</span>
                  </div>
                  <p className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                    {formData.signatoryName || formData.chiefEditor || 'Hội đồng Dược thư Quốc gia Việt Nam'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ==================== EDIT MODE (BIÊN SOẠN & ĐIỀN LỜI NÓI ĐẦU) ==================== */
            <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6">
              <div className={cn(
                "p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs",
                isDarkMode ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
              )}>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-500 shrink-0" />
                  <span>
                    Chỉnh sửa thông tin Lời nói đầu, cơ quan ban hành, số quyết định và hội đồng chuyên môn cho toàn bộ Dược thư Quốc gia.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreDefault}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  )}
                  title="Khôi phục nội dung chuẩn mẫu Bộ Y tế"
                >
                  <RotateCcw size={13} />
                  <span>Mẫu chuẩn Bộ Y tế</span>
                </button>
              </div>

              {/* Group 1: General Info */}
              <div className={cn("p-6 rounded-3xl border space-y-4", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50/70 border-slate-200/80")}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FileText size={15} className="text-teal-500" /> 1. Thông tin chung & Pháp lý
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={cn("text-xs font-bold block mb-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                      Tiêu đề Lời nói đầu <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="VD: Lời nói đầu Dược thư Quốc gia Việt Nam"
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                      )}
                      required
                    />
                  </div>

                  <div>
                    <label className={cn("text-xs font-bold block mb-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                      Tên Ấn bản / Phiên bản <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.edition}
                      onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                      placeholder="VD: Dược thư Quốc gia Việt Nam Lần thứ ba (Ấn bản III)"
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                      )}
                      required
                    />
                  </div>

                  <div>
                    <label className={cn("text-xs font-bold block mb-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                      Cơ quan ban hành / Xuất bản
                    </label>
                    <input
                      type="text"
                      value={formData.publisher}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                      placeholder="VD: Bộ Y Tế - Hội đồng Dược thư Quốc gia"
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={cn("text-xs font-bold block mb-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        Số Quyết định
                      </label>
                      <input
                        type="text"
                        value={formData.decisionNumber || ''}
                        onChange={(e) => setFormData({ ...formData, decisionNumber: e.target.value })}
                        placeholder="VD: Quyết định số 4068/QĐ-BYT"
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                        )}
                      />
                    </div>
                    <div>
                      <label className={cn("text-xs font-bold block mb-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        Ngày hiệu lực
                      </label>
                      <input
                        type="text"
                        value={formData.effectiveDate || ''}
                        onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                        placeholder="VD: 23/12/2022"
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Foreword Content */}
              <div className={cn("p-6 rounded-3xl border space-y-3", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50/70 border-slate-200/80")}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Quote size={15} className="text-teal-500" /> 2. Toàn văn Lời nói đầu <span className="text-rose-500">*</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Cách đoạn bằng 2 lần xuống dòng (Enter 2 lần)</span>
                </div>

                <textarea
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập toàn văn nội dung Lời nói đầu của Dược thư..."
                  className={cn(
                    "w-full p-4 rounded-2xl border text-xs leading-relaxed font-medium outline-none transition-all",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                  )}
                  required
                />
              </div>

              {/* Group 3: Guidelines and Legal Value */}
              <div className={cn("p-6 rounded-3xl border space-y-3", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50/70 border-slate-200/80")}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BookmarkCheck size={15} className="text-teal-500" /> 3. Giá trị pháp lý & Hướng dẫn áp dụng
                </h3>
                <textarea
                  rows={3}
                  value={formData.guidelinesSummary || ''}
                  onChange={(e) => setFormData({ ...formData, guidelinesSummary: e.target.value })}
                  placeholder="Tóm tắt giá trị pháp lý, phạm vi áp dụng tại các cơ sở khám chữa bệnh trên toàn quốc..."
                  className={cn(
                    "w-full p-3.5 rounded-2xl border text-xs leading-relaxed font-medium outline-none transition-all",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                  )}
                />
              </div>

              {/* Group 4: Council & Editorial Board */}
              <div className={cn("p-6 rounded-3xl border space-y-4", isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50/70 border-slate-200/80")}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Users size={15} className="text-teal-500" /> 4. Ban chỉ đạo & Hội đồng biên soạn
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={cn("text-xs font-bold block mb-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                      Chủ tịch Hội đồng / Tổng biên tập
                    </label>
                    <input
                      type="text"
                      value={formData.chiefEditor || ''}
                      onChange={(e) => setFormData({ ...formData, chiefEditor: e.target.value })}
                      placeholder="VD: GS. TS. Nguyễn Thanh Long - Nguyên Bộ trưởng Bộ Y tế"
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                      )}
                    />
                  </div>

                  <div>
                    <label className={cn("text-xs font-bold block mb-1.5", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                      Chức danh người ký / Đơn vị đại diện
                    </label>
                    <input
                      type="text"
                      value={formData.signatoryTitle || ''}
                      onChange={(e) => setFormData({ ...formData, signatoryTitle: e.target.value })}
                      placeholder="VD: Thay mặt Bộ Y tế & Hội đồng Dược thư Quốc gia"
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                      )}
                    />
                  </div>
                </div>

                {/* Council Members List */}
                <div className="space-y-2 pt-2">
                  <label className={cn("text-xs font-bold block", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    Danh sách Thành viên Hội đồng & Ban chuyên môn
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMemberText}
                      onChange={(e) => setNewMemberText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMember();
                        }
                      }}
                      placeholder="Nhập tên và học hàm, học vị, chức vụ thành viên..."
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-teal-500" : "bg-white border-slate-300 text-slate-900 focus:border-teal-600"
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Thêm</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    {(formData.councilMembers || []).map((member, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-2.5 px-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs",
                          isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                        )}
                      >
                        <span className="flex-1 font-medium">{member}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Xóa thành viên này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions inside Form */}
              <div className={cn(
                "flex items-center justify-between pt-4 border-t",
                isDarkMode ? "border-slate-800" : "border-slate-200"
              )}>
                <button
                  type="button"
                  onClick={() => setActiveMode('view')}
                  className={cn(
                    "px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Eye size={15} />
                  <span>Xem trước kết quả</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer",
                      isDarkMode ? "border-slate-700 text-slate-400 hover:text-slate-200" : "border-slate-300 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    title={isSaving ? 'Đang lưu...' : 'Lưu Lời nói đầu'}
                    aria-label="Lưu Lời nói đầu"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
