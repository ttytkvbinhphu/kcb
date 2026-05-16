import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ClipboardList, Info, Pill, BookOpen, AlertCircle, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ICDDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  icd: {
    code: string;
    description: string;
    isAppendixA2?: boolean;
    isAppendixA3?: boolean;
    isAppendixA4?: boolean;
    isAppendixA5?: boolean;
    isAppendixA6?: boolean;
    isRestricted?: boolean;
    notes?: string;
    chapter?: string;
  } | null;
  suggestions: string[];
  isDarkMode?: boolean;
  onShowDrugDetail?: (drugName: string) => void;
}

const ICDDetailModal: React.FC<ICDDetailModalProps> = ({
  isOpen,
  onClose,
  icd,
  suggestions,
  isDarkMode = false,
  onShowDrugDetail
}) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!icd) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border transition-colors flex flex-col max-h-[90vh]",
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
            )}
          >
            {/* Header */}
            <div className={cn(
              "p-6 flex items-center justify-between border-b shrink-0",
              isDarkMode ? "border-slate-800" : "border-slate-100"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                  isDarkMode ? "bg-emerald-900/30 text-emerald-400 shadow-none" : "bg-emerald-50 text-emerald-600 shadow-emerald-100"
                )}>
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h3 className={cn("text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                    Chi tiết mã ICD-10
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                      isDarkMode ? "bg-emerald-950/40 text-emerald-450 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                    )}>
                      {icd.code}
                    </span>
                    {icd.isAppendixA2 && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-sm">
                        Không là bệnh chính
                      </span>
                    )}
                    {icd.isAppendixA3 && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-600 text-white shadow-sm">
                        Không khuyến khích là bệnh chính
                      </span>
                    )}
                    {icd.isRestricted && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-sm">
                        Không dùng
                      </span>
                    )}
                    {icd.isAppendixA4 && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-sm">
                        Chỉ dùng mã hóa nguyên nhân tử vong
                      </span>
                    )}
                    {icd.isAppendixA5 && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-pink-600 text-white shadow-sm">
                        Mã bệnh ở nữ giới
                      </span>
                    )}
                    {icd.isAppendixA6 && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-600 text-white shadow-sm">
                        Mã bệnh ở nam giới
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                )}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-8">
                {/* Description */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Mô tả bệnh</span>
                  </div>
                  <p className={cn(
                    "text-lg font-bold leading-relaxed",
                    isDarkMode ? "text-slate-200" : "text-slate-900"
                  )}>
                    {icd.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chapter Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Chương bệnh</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border flex items-start gap-3",
                      isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-blue-50/50 border-blue-100"
                    )}>
                      <BookOpen size={18} className="text-blue-500 shrink-0 mt-1" />
                      <div>
                        <p className={cn("text-xs font-bold leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                          {icd.chapter || 'Thông tin chương đang cập nhật'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Appendix Info */}
                  {(icd.isAppendixA2 || icd.isRestricted) && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1 h-4 rounded-full", icd.isRestricted ? "bg-rose-500" : "bg-indigo-500")} />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Phụ lục & Lưu ý</span>
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl border flex items-start gap-3",
                        icd.isRestricted 
                          ? (isDarkMode ? "bg-rose-900/10 border-rose-500/20" : "bg-rose-50/50 border-rose-100")
                          : (isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-indigo-50/50 border-indigo-100")
                      )}>
                        {icd.isRestricted ? (
                           <AlertCircle size={18} className="text-rose-500 shrink-0 mt-1" />
                        ) : (
                           <BookOpen size={18} className="text-indigo-500 shrink-0 mt-1" />
                        )}
                        <div className="space-y-2">
                          {icd.isAppendixA2 && (
                            <div className="space-y-1">
                               <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-indigo-400" : "text-indigo-600")}>Không là bệnh chính</p>
                               <p className={cn("text-xs font-bold leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                 Mã bệnh này không được sử dụng làm chẩn đoán chính trong điều trị.
                               </p>
                            </div>
                          )}
                          {icd.isRestricted && (
                            <div className="space-y-1">
                               <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-rose-400" : "text-rose-600")}>Mã không dùng trực tiếp</p>
                               <p className={cn("text-xs font-bold leading-relaxed", isDarkMode ? "text-rose-300" : "text-rose-700")}>
                                 Mã bệnh này không được sử dụng làm chẩn đoán do là mã tổng quát. Phải sử dụng mã 4 hoặc 5 ký tự cụ thể hơn.
                               </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {icd.notes && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-amber-500 rounded-full" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Ghi chú bổ sung</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border",
                      isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-300" : "bg-amber-50/50 border-amber-100 text-slate-600"
                    )}>
                      <p className="text-sm font-medium leading-relaxed italic">
                        "{icd.notes}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Gợi ý thuốc điều trị</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      suggestions.length > 0
                        ? (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                        : (isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400")
                    )}>
                      {suggestions.length} gợi ý
                    </span>
                  </div>

                  {suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {suggestions.map((drugName, idx) => (
                        <button
                          key={idx}
                          onClick={() => onShowDrugDetail?.(drugName)}
                          className={cn(
                            "group flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                            isDarkMode 
                              ? "bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-primary/50" 
                              : "bg-white hover:bg-slate-50 border-slate-200 hover:border-primary/30 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                              isDarkMode ? "bg-slate-700 text-slate-400 group-hover:text-primary" : "bg-slate-50 text-slate-400 group-hover:text-primary"
                            )}>
                              <Pill size={16} />
                            </div>
                            <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                              {drugName}
                            </span>
                          </div>
                          <Check size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      "p-10 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center text-center",
                      isDarkMode ? "border-slate-800 bg-slate-800/20" : "border-slate-100 bg-slate-50/30"
                    )}>
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
                        <Info size={24} />
                      </div>
                      <p className={cn("text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        Chưa có gợi ý thuốc cho mã bệnh này
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        Cập nhật dữ liệu từ Catalog Management
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={cn(
              "p-6 border-t shrink-0 flex justify-end gap-3 transition-colors",
              isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50/50 border-slate-100"
            )}>
              <button
                onClick={onClose}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold transition-all",
                  isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ICDDetailModal;
