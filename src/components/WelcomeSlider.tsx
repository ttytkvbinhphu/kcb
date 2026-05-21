import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Check, Sparkles, BookOpen, Search, Users, X } from 'lucide-react';
import { cn } from '../lib/utils';

// Helper to convert Google Drive links to direct image URLs
const getDirectImageUrl = (url: string) => {
  if (!url) return '';
  
  // Handle Google Drive preview or view links
  const driveMatch = url.match(/\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }
  
  return url;
};

interface WelcomeSliderProps {
  onComplete: () => void;
  isDarkMode: boolean;
  userName?: string;
  slides: any[];
  initialSlide?: number;
}

export default function WelcomeSlider({ onComplete, isDarkMode, userName, slides: dbSlides, initialSlide = 0 }: WelcomeSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Prevent body scrolling when slider is open
  useEffect(() => {
    setMounted(true);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const isMobile = windowWidth < 768;
  const scaleFactor = isMobile ? Math.min(1, windowWidth / 800) : 1;

  const getResponsiveSize = (size: string | undefined, type: 'font' | 'width' = 'font') => {
    if (!size) return undefined;
    if (!isMobile) return size;
    
    const num = parseInt(size);
    if (isNaN(num)) return size;
    
    if (type === 'font') {
      return `${Math.max(12, Math.round(num * scaleFactor * 0.85))}px`;
    } else {
      return `${Math.round(num * scaleFactor)}px`;
    }
  };

  const displaySlides = React.useMemo(() => {
    if (!dbSlides || dbSlides.length === 0) {
      return [{
        id: 'default-1',
        title: 'Chào mừng bạn đến với hệ thống',
        description: 'Hệ thống hỗ trợ tra cứu và quản lý thông tin Y - Dược dành cho nhân viên y tế.',
        icon: <Sparkles className="w-16 h-16 text-indigo-500" />
      }];
    }
    const filtered = dbSlides.filter(s => s.isActive !== false);
    if (filtered.length === 0) {
      return [{
        id: 'default-1',
        title: 'Chào mừng bạn đến với hệ thống',
        description: 'Hệ thống hỗ trợ tra cứu và quản lý thông tin Y - Dược dành cho nhân viên y tế.',
        icon: <Sparkles className="w-16 h-16 text-indigo-500" />
      }];
    }
    return filtered;
  }, [dbSlides]);

  const nextSlide = () => {
    if (currentSlide < displaySlides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const currentSlideData = displaySlides[currentSlide] || displaySlides[0];

  if (!mounted) return null;
  if (!displaySlides.length || !currentSlideData) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col",
        isDarkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900"
      )}
    >
      {/* Skip Button */}
      <div className={cn(
        "absolute z-50 transition-all duration-300",
        isMobile ? "top-6 right-6" : "top-8 right-8"
      )}>
        <button
          onClick={onComplete}
          className={cn(
            "group flex items-center gap-3 p-2 sm:px-6 sm:py-3 rounded-2xl transition-all duration-300 backdrop-blur-md border",
            isDarkMode 
              ? "bg-slate-900/40 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800/60" 
              : "bg-white/40 border-slate-200/50 text-slate-500 hover:text-slate-900 hover:bg-white/60"
          )}
        >
          {!isMobile && (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-300">Thoát</span>
          )}
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
            <X size={18} />
          </div>
        </button>
      </div>
      {/* Background Layer with Improved Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {currentSlideData.imageUrl ? (
          <motion.img
            key={`img-bg-${currentSlide}`}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2 }}
            src={getDirectImageUrl(currentSlideData.imageUrl)}
            className={cn(
              "w-full h-full",
              currentSlideData.imageFit === 'contain' ? "object-contain" : "object-cover"
            )}
            alt={currentSlideData.title}
          />
        ) : (
          <div 
            className={cn(
              "w-full h-full",
              currentSlideData.bgColor ? "" : (isDarkMode ? "bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950" : "bg-gradient-to-br from-blue-50 via-white to-indigo-50")
            )} 
            style={currentSlideData.bgColor ? { backgroundColor: currentSlideData.bgColor } : {}} 
          />
        )}
        
        {/* Dynamic Gradient Overlay for Readability */}
        <div className={cn(
          "absolute inset-0 z-[1] transition-opacity duration-700",
          isDarkMode 
            ? "bg-gradient-to-b from-black/20 via-black/40 to-black/80" 
            : "bg-gradient-to-b from-white/10 via-white/30 to-white/70"
        )} />
        
        {/* Subtle Atmospheric Blur (Recipe 7) */}
        <div className={cn(
          "absolute inset-0 z-[2] opacity-30 blur-[100px] pointer-events-none",
          isDarkMode ? "bg-indigo-500/10" : "bg-indigo-500/5"
        )} />

        {/* --- Main Content Rendering (Presentation vs Legacy) --- */}
        {currentSlideData.elements ? (
          /* Presentation Mode: Free-form elements */
          <div className="absolute inset-0 z-20 pointer-events-none">
            {currentSlideData.elements.map((el: any) => (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  duration: 0.8, 
                  ease: [0.23, 1, 0.32, 1],
                  delay: 0.2 
                }}
                className="absolute pointer-events-auto"
                style={{ 
                  left: `${el.x}%`, 
                  top: isMobile ? `${el.y * 0.7 + 12}%` : `${el.y}%`,
                  width: el.type === 'image' ? (isMobile ? `min(85vw, ${getResponsiveSize(el.w, 'width')})` : el.w) : 'auto',
                  transform: el.style?.textAlign === 'center' ? 'translateX(-50%)' : el.style?.textAlign === 'right' ? 'translateX(-100%)' : 'none',
                  zIndex: el.type === 'text' ? 20 : 10
                }}
              >
                {el.type === 'text' ? (
                  <div 
                    style={{ 
                      fontSize: getResponsiveSize(el.style?.fontSize, 'font') || '20px', 
                      color: el.style?.color || (isDarkMode ? '#ffffff' : '#000000'),
                      fontWeight: el.style?.fontWeight || 'normal',
                      fontFamily: el.style?.fontFamily || 'Inter',
                      textAlign: el.style?.textAlign || 'left'
                    }}
                    className="whitespace-pre-wrap leading-tight drop-shadow-2xl px-4"
                  >
                    {el.content}
                  </div>
                ) : (
                  <img 
                    src={getDirectImageUrl(el.content)} 
                    className="w-full h-auto rounded-[2rem] shadow-2xl transition-transform hover:scale-105"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          /* Legacy Mode: Structured fields */
          <div className="relative z-20 flex flex-col h-full w-full max-w-6xl mx-auto px-6 py-12 lg:py-20 justify-center">
            {/* Corner Descriptions */}
            <AnimatePresence>
              {[
                { text: currentSlideData.description2, pos: currentSlideData.position2 || 'top-left' },
                { text: currentSlideData.description3, pos: currentSlideData.position3 || 'bottom-right' },
                { text: currentSlideData.description4, pos: currentSlideData.position4 || 'top-right' }
              ].map((item, idx) => item.text && (
                <motion.div
                  key={`legacy-desc-${idx}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "absolute px-4 py-2 rounded-full border backdrop-blur-md text-[10px] font-bold uppercase tracking-widest",
                    isDarkMode ? "bg-white/5 border-white/10 text-white/60" : "bg-black/5 border-black/5 text-slate-500",
                    item.pos === 'top-left' && (isMobile ? "top-20 left-6" : "top-10 left-10"),
                    item.pos === 'top-right' && (isMobile ? "top-20 right-6" : "top-10 right-10"),
                    item.pos === 'bottom-left' && (isMobile ? "bottom-40 left-6" : "bottom-32 left-10"),
                    item.pos === 'bottom-right' && (isMobile ? "bottom-40 right-6" : "bottom-32 right-10")
                  )}
                >
                  {item.text}
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="max-w-4xl mx-auto text-center space-y-8">
              {currentSlideData.showIcon !== false && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "w-24 h-24 lg:w-32 lg:h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl mx-auto mb-8",
                    isDarkMode ? "bg-white/10 border border-white/20" : "bg-indigo-50 border-4 border-white"
                  )}
                >
                  {currentSlideData.icon || <Sparkles size={48} className="text-indigo-500" />}
                </motion.div>
              )}
              {currentSlideData.title && (
                <h3 className={cn("text-3xl sm:text-5xl lg:text-8xl font-black tracking-tighter leading-none", isDarkMode ? "text-white" : "text-slate-900")}>
                  {currentSlideData.title === '{name}' ? (userName || 'Bác sĩ') : currentSlideData.title}
                </h3>
              )}
              {currentSlideData.description && (
                <p className={cn("text-base sm:text-xl lg:text-2xl font-medium opacity-70 max-w-2xl mx-auto px-4", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  {currentSlideData.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer Area */}
        <div className={cn(
          "w-full flex flex-col items-center mt-auto pb-8 sm:pb-12 px-6",
          isMobile ? "gap-6" : "gap-12"
        )}>
          {/* Pagination Dots (Modern & Pulsing) */}
          <div className="flex justify-center gap-2 sm:gap-4">
            {displaySlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className="group relative h-8 flex items-center justify-center transition-all"
              >
                <div
                  className={cn(
                    "h-1 rounded-full transition-all duration-700 relative",
                    currentSlide === idx 
                      ? "w-8 sm:w-16 bg-indigo-500" 
                      : (isDarkMode ? "w-2 sm:w-4 bg-white/10 group-hover:bg-white/30" : "w-2 sm:w-4 bg-black/5 group-hover:bg-black/20")
                  )}
                >
                  {currentSlide === idx && (
                    <motion.div 
                      layoutId="active-dot"
                      className="absolute inset-0 bg-indigo-400 blur-sm opacity-50"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Navigation Buttons (Recipe 4 Pill Style) */}
          <div className="w-full flex items-center gap-3 sm:gap-6 max-w-lg">
            {currentSlide > 0 && (
              <button
                onClick={prevSlide}
                type="button"
                className={cn(
                  "px-6 sm:px-10 py-4 sm:py-5 rounded-full font-bold transition-all text-[10px] sm:text-sm uppercase tracking-widest backdrop-blur-xl border",
                  isDarkMode 
                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                    : "bg-black/5 border-black/5 text-slate-700 hover:bg-black/10"
                )}
              >
                Trở lại
              </button>
            )}
            <button
              onClick={nextSlide}
              type="button"
              className={cn(
                "flex-1 flex items-center justify-center gap-3 sm:gap-4 px-6 sm:px-10 py-4 sm:py-6 rounded-full font-black transition-all text-white text-sm sm:text-base shadow-[0_20px_50px_rgba(79,70,229,0.3)] uppercase tracking-[0.15em]",
                isDarkMode ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-600 hover:bg-indigo-700"
              )}
              style={currentSlideData.bgColor && currentSlide === displaySlides.length - 1 ? { backgroundColor: currentSlideData.bgColor } : {}}
            >
              {currentSlide === displaySlides.length - 1 ? (
                <>
                  {currentSlideData.buttonText || "Khám phá ngay"} <Check size={24} />
                </>
              ) : (
                <>
                  Tiếp theo <ChevronRight size={24} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
