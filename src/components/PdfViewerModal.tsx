import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  ExternalLink,
  Download,
  X,
  Loader2,
  Pill,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react";
import { Drug } from "../types";
import { cn } from "../lib/utils";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  drug?: Drug | null;
  isDarkMode: boolean;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  drug,
  isDarkMode,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose, pdfUrl]);

  if (!isOpen || !pdfUrl) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 lg:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className={cn(
            "relative z-10 flex flex-col w-full shadow-2xl border transition-all duration-300 overflow-hidden",
            isFullScreen
              ? "fixed inset-0 rounded-none h-full"
              : "h-[100dvh] sm:h-[92vh] sm:max-w-5xl lg:max-w-6xl sm:rounded-2xl lg:rounded-3xl",
            isDarkMode
              ? "bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/80"
              : "bg-white border-slate-200 text-slate-900 shadow-slate-300/60"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={cn(
              "px-4 py-3 sm:px-6 sm:py-4 border-b flex items-center justify-between gap-3 shrink-0 backdrop-blur-md",
              isDarkMode
                ? "bg-slate-900/95 border-slate-800"
                : "bg-white/95 border-slate-100"
            )}
          >
            {/* Title & Drug Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs",
                  isDarkMode
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200"
                )}
              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={cn(
                      "text-sm sm:text-base font-black tracking-tight truncate",
                      isDarkMode ? "text-slate-100" : "text-slate-900"
                    )}
                  >
                    Tờ hướng dẫn sử dụng (HDSD)
                  </h3>
                  {drug?.isRx ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider">
                      Thuốc kê đơn (Rx)
                    </span>
                  ) : drug ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white uppercase tracking-wider">
                      Không kê đơn (OTC)
                    </span>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs truncate mt-0.5",
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  {drug ? (
                    <>
                      <Pill className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span
                        className={cn(
                          "font-bold truncate",
                          isDarkMode ? "text-slate-200" : "text-slate-800"
                        )}
                      >
                        {drug.name}
                      </span>
                      {drug.activeIngredients && drug.activeIngredients.length > 0 && (
                        <span
                          className={cn(
                            "hidden sm:inline truncate",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}
                        >
                          • {drug.activeIngredients.map((i) => i.name).join(", ")}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Xem tài liệu PDF đính kèm</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Open External Tab */}
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Mở tài liệu trong tab mới"
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-2xs active:scale-95 cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-slate-300"
                )}
              >
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                <span className="hidden md:inline">Mở tab mới</span>
              </a>

              {/* Download */}
              <a
                href={pdfUrl}
                download={drug ? `HDSD_${drug.name.replace(/\s+/g, "_")}.pdf` : "tai_lieu_hdsd.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                title="Tải về máy"
                className={cn(
                  "hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-bold items-center gap-1.5 transition-all border shadow-2xs active:scale-95 cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-slate-300"
                )}
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                <span className="hidden lg:inline">Tải về</span>
              </a>

              {/* FullScreen Toggle (Desktop) */}
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "Thu nhỏ cửa sổ" : "Mở toàn màn hình"}
                className={cn(
                  "hidden sm:flex w-8 h-8 rounded-xl items-center justify-center transition-all border shadow-2xs active:scale-95 cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                )}
              >
                {isFullScreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                title="Đóng cửa sổ (Esc)"
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all border shadow-2xs active:scale-95 cursor-pointer",
                  isDarkMode
                    ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/30"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                )}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Đóng</span>
              </button>
            </div>
          </div>

          {/* PDF Viewer Body */}
          <div
            className={cn(
              "relative flex-1 w-full h-full flex flex-col overflow-hidden",
              isDarkMode ? "bg-slate-950" : "bg-slate-100"
            )}
          >
            {/* Loading Indicator */}
            {isLoading && (
              <div
                className={cn(
                  "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-xs",
                  isDarkMode ? "bg-slate-900/80" : "bg-slate-50/80"
                )}
              >
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p
                  className={cn(
                    "text-xs font-semibold animate-pulse",
                    isDarkMode ? "text-slate-400" : "text-slate-600"
                  )}
                >
                  Đang tải tệp tài liệu PDF...
                </p>
              </div>
            )}

            {/* Embedded Iframe */}
            <iframe
              src={pdfUrl}
              title={`HDSD ${drug?.name || "Tài liệu"}`}
              onLoad={() => setIsLoading(false)}
              className="w-full h-full border-0 flex-1"
            />

            {/* Helper Notice for Mobile/Unsupported Browsers */}
            <div
              className={cn(
                "px-3 py-2 text-[11px] flex items-center justify-between gap-2 border-t shrink-0 select-none",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              )}
            >
              <div className="flex items-center gap-1.5 truncate">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">
                  Nếu tài liệu không tự động hiển thị, hãy bấm <strong>Mở tab mới</strong> để xem trực tiếp.
                </span>
              </div>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "font-bold hover:underline shrink-0 text-[11px]",
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                )}
              >
                Mở ngay
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PdfViewerModal;
