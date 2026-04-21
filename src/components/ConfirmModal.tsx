import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isDarkMode?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'danger',
  isDarkMode = false
}) => {
  const [loading, setLoading] = useState(false);

  const colors = {
    danger: {
      bg: isDarkMode ? 'bg-rose-900/20' : 'bg-rose-50',
      text: isDarkMode ? 'text-rose-400' : 'text-rose-600',
      button: isDarkMode ? 'bg-rose-600 hover:bg-rose-700 shadow-none' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
      icon: <AlertTriangle size={24} className={isDarkMode ? "text-rose-400" : "text-rose-600"} />
    },
    warning: {
      bg: isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50',
      text: isDarkMode ? 'text-amber-400' : 'text-amber-600',
      button: isDarkMode ? 'bg-amber-600 hover:bg-amber-700 shadow-none' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
      icon: <AlertTriangle size={24} className={isDarkMode ? "text-amber-400" : "text-amber-600"} />
    },
    info: {
      bg: isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      text: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      button: isDarkMode ? 'bg-blue-600 hover:bg-blue-700 shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
      icon: <AlertTriangle size={24} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
    }
  };

  const activeColor = colors[type];

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error in ConfirmModal onConfirm:", error);
      // We don't close the modal if it fails, so the user can see the error (if handled by onConfirm)
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border transition-colors",
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
            )}
          >
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", activeColor.bg)}>
                  {activeColor.icon}
                </div>
                <div>
                  <h3 className={cn("text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                    {title}
                  </h3>
                  <p className={cn("text-xs font-bold uppercase tracking-widest opacity-50", activeColor.text)}>
                    Yêu cầu xác nhận
                  </p>
                </div>
              </div>

              <p className={cn("text-sm font-medium leading-relaxed mb-8", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                {message}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className={cn(
                    "flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2",
                    activeColor.button
                  )}
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {loading ? 'Đang xử lý...' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
