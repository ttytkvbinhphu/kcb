import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCw, ZoomIn, ZoomOut, Check, Scissors } from 'lucide-react';
import { cn } from '../lib/utils';
import getCroppedImg from '../lib/imageUtils';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onConfirm: (croppedImage: string) => void;
  aspect?: number;
  isDarkMode?: boolean;
}

export default function ImageEditorModal({
  isOpen,
  onClose,
  imageSrc,
  onConfirm,
  aspect = 1,
  isDarkMode = false
}: ImageEditorModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      if (croppedImage) {
        onConfirm(croppedImage);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            "w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[80vh]",
            isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white"
          )}
        >
          <div className={cn(
            "p-6 border-b flex items-center justify-between shrink-0",
            isDarkMode ? "border-slate-800" : "border-slate-100"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white">
                <Scissors size={20} />
              </div>
              <div>
                <h3 className={cn("text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                  Chỉnh sửa hình ảnh
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Cắt, xoay và thu phóng</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl transition-colors text-slate-400",
                isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
              )}
            >
              <X size={24} />
            </button>
          </div>

          <div className={cn(
            "flex-1 relative overflow-hidden",
            isDarkMode ? "bg-slate-950" : "bg-slate-100"
          )}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
            />
          </div>

          <div className="p-6 space-y-6 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Zoom Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ZoomIn size={14} /> Thu phóng
                  </label>
                  <span className="text-xs font-bold text-blue-600">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                    className={cn(
                      "p-2 rounded-lg text-slate-500 transition-colors",
                      isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                    )}
                  >
                    <ZoomOut size={18} />
                  </button>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className={cn(
                      "flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600",
                      isDarkMode ? "bg-slate-800" : "bg-slate-200"
                    )}
                  />
                  <button 
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    className={cn(
                      "p-2 rounded-lg text-slate-500 transition-colors",
                      isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                    )}
                  >
                    <ZoomIn size={18} />
                  </button>
                </div>
              </div>

              {/* Rotation Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <RotateCw size={14} /> Xoay ảnh
                  </label>
                  <span className="text-xs font-bold text-blue-600">{rotation}°</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={rotation}
                    min={0}
                    max={360}
                    step={1}
                    aria-labelledby="Rotation"
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className={cn(
                      "flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600",
                      isDarkMode ? "bg-slate-800" : "bg-slate-200"
                    )}
                  />
                  <button 
                    onClick={() => setRotation((rotation + 90) % 360)}
                    className={cn(
                      "p-2 rounded-lg text-slate-500 transition-colors",
                      isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                    )}
                  >
                    <RotateCw size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className={cn(
                  "flex-1 py-4 rounded-2xl font-bold transition-all",
                  isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={cn(
                  "flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                  isDarkMode ? "shadow-none" : "shadow-lg shadow-blue-200"
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={20} /> Xác nhận cắt ảnh
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
