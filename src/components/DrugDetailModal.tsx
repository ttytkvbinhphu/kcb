import React, { useState, useEffect } from 'react';
import { X, Pill, ShieldAlert, AlertTriangle, Info, BookOpen, Activity, Clock, UserCheck, Zap, Star, FileText, RefreshCw, Calendar, Heart, Baby, Car, AlertCircle, ExternalLink, Briefcase, Lock } from 'lucide-react';
import { Drug, ICD10, Ingredient } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, handleFirestoreError, OperationType, query, orderBy } from '../firebase';

interface DrugDetailModalProps {
  drug: Drug | null;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  canSeeIcdSuggestions?: boolean;
  canSeeCommonIndications?: boolean;
}

const DrugDetailModal: React.FC<DrugDetailModalProps> = ({ 
  drug, 
  isOpen, 
  onClose, 
  isDarkMode,
  canSeeIcdSuggestions = true,
  canSeeCommonIndications = true
}) => {
  const [activeDetailTab, setActiveDetailTab] = useState<'indications' | 'contraindications' | 'dosage' | 'interactions' | 'warnings' | 'side_effects' | 'pharmacology' | 'info'>('indications');
  const [direction, setDirection] = useState(0);
  const [icdList, setIcdList] = useState<ICD10[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    const unsubscribeIcd = onSnapshot(collection(db, 'icd10'), (snapshot) => {
      setIcdList(snapshot.docs.map(doc => doc.data() as ICD10));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'icd10');
    });

    const qIngredients = query(collection(db, 'ingredients'), orderBy('name'));
    const unsubscribeIngredients = onSnapshot(qIngredients, (snapshot) => {
      setIngredients(snapshot.docs.map(doc => doc.data() as Ingredient));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ingredients');
    });

    return () => {
      unsubscribeIcd();
      unsubscribeIngredients();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Use ref for onClose to avoid effect re-runs when parent re-renders
  const onCloseRef = React.useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle mobile back button
  useEffect(() => {
    if (!isOpen) return;

    const modalHash = '#drug-detail';
    
    // Only push if we're not already on this hash (prevents double push)
    if (window.location.hash !== modalHash) {
      window.history.pushState({ modal: 'drug-detail' }, '', modalHash);
    }

    const handlePopState = () => {
      // If the hash is no longer #drug-detail, it means back was pressed
      if (window.location.hash !== modalHash) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up hash if closed via X button or Esc instead of back button
      // We use a small check to ensure we only go back if the modal is actually closing
      if (!isOpen && window.location.hash === modalHash) {
        // This part is tricky because isOpen is from closure. 
        // But if this effect is cleaning up because isOpen changed to false, it works.
      }
    };
  }, [isOpen]);

  // Separate cleanup effect for the hash when closing
  useEffect(() => {
    if (!isOpen && window.location.hash === '#drug-detail') {
      window.history.back();
    }
  }, [isOpen]);

  if (!drug) return null;

  const detailTabs = [
    { id: 'indications', label: 'Chỉ định', icon: <Info size={14} /> },
    { id: 'contraindications', label: 'Chống chỉ định', icon: <ShieldAlert size={14} /> },
    { id: 'dosage', label: 'Liều lượng', icon: <Clock size={14} /> },
    { id: 'side_effects', label: 'Tác dụng phụ', icon: <AlertCircle size={14} /> },
    { id: 'interactions', label: 'Tương tác', icon: <RefreshCw size={14} /> },
    { id: 'warnings', label: 'Cảnh báo', icon: <AlertTriangle size={14} /> },
    { id: 'pharmacology', label: 'Dược lý', icon: <Activity size={14} /> },
    { id: 'info', label: 'Thông tin', icon: <UserCheck size={14} /> }
  ];

  const currentIndex = detailTabs.findIndex(t => t.id === activeDetailTab);

  const paginate = (newDirection: number) => {
    const newIndex = currentIndex + newDirection;
    if (newIndex >= 0 && newIndex < detailTabs.length) {
      setDirection(newDirection);
      setActiveDetailTab(detailTabs[newIndex].id as any);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98
    })
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-0 lg:p-8 xl:p-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ 
              duration: 0.3, 
              ease: [0.4, 0, 0.2, 1] 
            }}
            className={cn(
              "relative w-full h-full lg:w-[92vw] lg:max-w-7xl lg:h-[88vh] lg:rounded-[48px] overflow-hidden shadow-2xl flex flex-col transition-all border-t lg:border border-white/10",
              isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
            )}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.08, 
                duration: 0.2,
                ease: "easeOut"
              }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Header / Banner Area */}
              <div className={cn(
                "shrink-0 p-6 lg:p-10 relative overflow-hidden transition-colors duration-500",
                isDarkMode 
                  ? "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white" 
                  : "bg-gradient-to-br from-blue-50 to-indigo-50 text-slate-900"
              )}>
                <div className="absolute inset-x-0 bottom-0 h-px bg-slate-100/10 dark:bg-slate-800" />
                <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                
                <div className="relative z-10 pr-12">
                  {/* Nút đóng - luôn ở góc trên phải */}
                  <button
                    onClick={onClose}
                    className={cn(
                      "absolute top-0 right-0 p-2 rounded-2xl transition-colors z-20",
                      isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                    )}
                  >
                    <X size={22} />
                  </button>

                  <div className="flex items-center gap-4 lg:gap-6">
                    <div className={cn(
                      "relative p-1 rounded-[20px] lg:rounded-[28px] shadow-2xl border overflow-hidden w-16 h-16 lg:w-24 lg:h-24 flex items-center justify-center shrink-0",
                      isDarkMode ? "bg-white/10 border-white/20" : "bg-white border-slate-100"
                    )}>
                      {drug.avatarUrl ? (
                        <img src={drug.avatarUrl} alt={drug.name} className="w-full h-full object-cover rounded-[18px] lg:rounded-[24px]" referrerPolicy="no-referrer" />
                      ) : (
                        <Pill size={32} className="text-blue-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 lg:gap-3 mb-1 flex-wrap">
                        <h3 className="text-xl lg:text-4xl font-black tracking-tight leading-tight">{drug.name}</h3>
                        {drug.pdfUrl && (
                          <a 
                            href={drug.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "shrink-0 p-1.5 lg:p-2 rounded-xl transition-all hover:scale-110 flex items-center justify-center",
                              isDarkMode ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-sm"
                            )}
                            title="Xem tờ hướng dẫn (PDF)"
                          >
                            <FileText size={18} className="lg:w-6 lg:h-6" />
                          </a>
                        )}
                        {drug.isRx && (
                          <span className="shrink-0 px-2 py-0.5 bg-rose-500/20 text-rose-500 rounded-lg text-[10px] font-black border border-rose-500/30">Rx</span>
                        )}
                        {drug.isClosed && (
                          <span className={cn(
                            "shrink-0 px-3 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5",
                            isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100/80 text-slate-500 border-slate-200 shadow-sm"
                          )}>
                            <AlertCircle size={12} className="shrink-0" />
                            ĐANG ẨN
                          </span>
                        )}

                      </div>
                      <p className={cn(
                        "font-bold uppercase tracking-widest text-[9px] lg:text-[11px] mb-3 opacity-70",
                        isDarkMode ? "text-blue-300" : "text-blue-600"
                      )}>
                        {(drug.activeIngredients || []).map(ing => {
                          const baseIngredient = ingredients.find(i => 
                            i.name.toLowerCase() === ing.name.toLowerCase() ||
                            i.alias?.toLowerCase() === ing.name.toLowerCase() ||
                            i.aliases?.some(a => a.toLowerCase() === ing.name.toLowerCase())
                          );
                          
                          let displayName = `${ing.name} ${ing.amount}${ing.unit}`;
                          if (baseIngredient) {
                             const allAliases = new Set<string>();
                             if (baseIngredient.name.toLowerCase() !== ing.name.toLowerCase()) allAliases.add(baseIngredient.name);
                             if (baseIngredient.alias && baseIngredient.alias.toLowerCase() !== ing.name.toLowerCase()) allAliases.add(baseIngredient.alias);
                             if (baseIngredient.aliases) {
                               baseIngredient.aliases.forEach(a => {
                                 if (a.toLowerCase() !== ing.name.toLowerCase()) allAliases.add(a);
                               });
                             }
                             if (allAliases.size > 0) {
                               displayName += ` (${Array.from(allAliases).join(', ')})`;
                             }
                          }
                          return displayName;
                        }).join(' + ')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {drug.atcCode && (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            isDarkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-100 border-blue-200 text-blue-700"
                          )}>
                            ATC: {drug.atcCode}
                          </span>
                        )}
                        {drug.administrationRoute && (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          )}>
                            {drug.administrationRoute}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className={cn(
                "px-4 lg:px-10 py-1 border-b backdrop-blur-md transition-colors shrink-0",
                isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-100 shadow-sm"
              )}>
                <div className="flex overflow-x-auto gap-0.5 p-0.5 custom-scrollbar">
                  {detailTabs.map((tab) => {
                    const isActive = activeDetailTab === tab.id;
                    const tabIndex = detailTabs.findIndex(t => t.id === tab.id);
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setDirection(tabIndex > currentIndex ? 1 : -1);
                          setActiveDetailTab(tab.id as any);
                        }}
                        className={cn(
                          "flex items-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap",
                          isActive ? "px-4" : "px-3",
                          isActive
                            ? "bg-blue-600 text-white shadow-md"
                            : isDarkMode
                                ? "text-slate-400 hover:bg-slate-800"
                                : "text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        <span className="shrink-0">{tab.icon}</span>
                        {/* Chỉ hiện label khi tab đang active; trên desktop luôn hiện */}
                        <span className={cn(isActive ? "inline" : "hidden md:inline")}>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar",
                isDarkMode ? "bg-slate-900 font-bold" : "bg-slate-50/30 font-bold"
              )}>
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <motion.div
                    key={activeDetailTab}
                    custom={direction}
                    variants={slideVariants as any}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipe = Math.abs(offset.x) > 50 || Math.abs(velocity.x) > 500;
                      if (swipe) {
                        if (offset.x < 0) {
                          paginate(1);
                        } else {
                          paginate(-1);
                        }
                      }
                    }}
                    className="min-h-full p-6 lg:p-10 touch-pan-y"
                  >
                    {/* Indications Tab */}
                    {activeDetailTab === 'indications' && (
                      <div className="space-y-6">
                        {drug.mechanismOfAction && (
                          <div className={cn(
                            "p-6 rounded-3xl border flex items-start gap-4",
                            isDarkMode ? "bg-violet-900/10 border-violet-900/20 shadow-xl" : "bg-violet-50 border-violet-100 shadow-sm"
                          )}>
                            <Zap className="text-violet-500 shrink-0 mt-1" size={20} />
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Cơ chế tác dụng</h4>
                              <p className="text-sm leading-relaxed">{drug.mechanismOfAction}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          {(drug.indications || []).map((item, i) => (
                            <div key={i} className={cn(
                              "p-5 rounded-[24px] border transition-all",
                              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                            )}>
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-2 shadow-sm shrink-0",
                                  (item.isPrimary && canSeeCommonIndications) ? "bg-amber-500" : "bg-blue-500"
                                )} />
                                <div className="flex-1">
                                  {item.title && (
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">{item.title}</h5>
                                  )}
                                  <p className="text-sm leading-relaxed whitespace-pre-line">{item.content}</p>
                                  
                                  {canSeeIcdSuggestions && item.icd10s && item.icd10s.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {item.icd10s.map((fullName, idx) => {
                                        const code = fullName.split(' - ')[0];
                                        const desc = fullName.split(' - ')[1] || icdList.find(icd => icd.code === code)?.description;
                                        const isDefault = (item.defaultIcd10s || []).includes(fullName) || item.defaultIcd10 === fullName;
                                        return (
                                          <div key={idx} className={cn(
                                            "px-2.5 py-1.5 rounded-lg text-[9px] font-black border flex items-center gap-2 transition-all",
                                            isDefault 
                                              ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200"
                                              : isDarkMode ? "bg-slate-900/50 border-slate-700" : "bg-slate-100 border-slate-200"
                                          )}>
                                            <span className={isDefault ? "text-white" : "text-blue-500"}>{code}</span>
                                            {desc && <span className={cn("font-bold", isDefault ? "text-white/80" : "opacity-50")}>{desc}</span>}
                                            {isDefault && <Star size={10} fill="currentColor" className="text-white" />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {(drug.indications || []).length === 0 && !drug.mechanismOfAction && (
                            <div className="text-center py-20 opacity-40">
                              <Info size={48} className="mx-auto mb-4" />
                              <p className="font-black uppercase tracking-tighter">Thuốc này chưa cập nhật Chỉ định.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contraindications Tab */}
                    {activeDetailTab === 'contraindications' && (
                      <div className="space-y-4">
                        {(drug.contraindications || []).map((item, i) => (
                          <div key={i} className={cn(
                            "p-6 rounded-3xl border flex items-start gap-5",
                            isDarkMode ? "bg-slate-800 border-rose-900/30" : "bg-white border-rose-100 shadow-sm"
                          )}>
                            <div className="p-2 rounded-xl bg-rose-50 text-rose-500 shrink-0">
                              <ShieldAlert size={20} />
                            </div>
                            <div>
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">{item.type || 'Chung'}</h5>
                              <p className="text-sm leading-relaxed">{item.content}</p>
                              {canSeeIcdSuggestions && item.icd10s && item.icd10s.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.icd10s.map((code, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black border border-rose-100">
                                      {code}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {(drug.contraindications || []).length === 0 && (
                          <div className="text-center py-20 opacity-40">
                            <ShieldAlert size={48} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-tighter">Thuốc này không có Chống chỉ định.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dosage Tab */}
                    {activeDetailTab === 'dosage' && (
                      <div className="space-y-6">
                        {drug.generalAdministration && (
                          <div className={cn(
                            "p-8 rounded-[32px] border relative overflow-hidden",
                            isDarkMode ? "bg-amber-900/10 border-amber-900/20" : "bg-amber-50/20 border-amber-100 shadow-sm"
                          )}>
                            <Clock className="absolute right-6 top-6 text-amber-500/10" size={80} />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Sử dụng chung</h4>
                            <p className="text-sm leading-relaxed relative z-10">{drug.generalAdministration}</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(drug.dosageAndAdministration || []).map((item, idx) => (
                            <div key={idx} className={cn(
                              "p-6 rounded-[24px] border",
                              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"
                            )}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                <h5 className="font-black text-sm uppercase tracking-tight">{item.category}</h5>
                              </div>
                              <p className="text-sm leading-relaxed opacity-80">{item.content}</p>
                            </div>
                          ))}
                        </div>
                        {(drug.dosageAndAdministration || []).length === 0 && !drug.generalAdministration && (
                          <div className="text-center py-20 opacity-40">
                            <Clock size={48} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-tighter">Thuốc này chưa cập nhật Liều lượng.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Side Effects Tab */}
                    {activeDetailTab === 'side_effects' && (
                      <div className="space-y-4">
                        {Array.isArray(drug.sideEffects) && drug.sideEffects.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(drug.sideEffects as any[]).map((se, i) => (
                              <div key={i} className={cn(
                                "p-5 rounded-2xl border flex items-start gap-4 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/50",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                              )}>
                                <div className="w-2 h-2 rounded-full mt-2 bg-amber-500 shrink-0 shadow-sm" />
                                <p className="text-sm leading-relaxed">{typeof se === 'string' ? se : se.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-20 opacity-40">
                            <AlertCircle size={48} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-tighter">Thuốc này chưa cập nhật Tác dụng phụ.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pharmacology Tab */}
                    {activeDetailTab === 'pharmacology' && (
                      <div className="space-y-8">
                        {drug.pharmacology && (
                          <div className={cn(
                            "p-8 rounded-[32px] border",
                            isDarkMode ? "bg-blue-500/5 border-blue-500/10 shadow-xl" : "bg-blue-50 border-blue-100 shadow-sm"
                          )}>
                            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">
                              <BookOpen size={16} /> Dược lý học
                            </h4>
                            <div className="text-sm leading-relaxed whitespace-pre-line opacity-90">{drug.pharmacology}</div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {drug.pharmacodynamics && (
                            <div className={cn("p-6 rounded-3xl border shadow-sm", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100")}>
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">Dược lực học</h5>
                              <div className="text-sm leading-relaxed opacity-80">{typeof drug.pharmacodynamics === 'string' ? drug.pharmacodynamics : 'Xem chi tiết trong mục hướng dẫn.'}</div>
                            </div>
                          )}
                          {drug.pharmacokinetics && (
                            <div className={cn("p-6 rounded-3xl border shadow-sm", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100")}>
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4">Dược động học</h5>
                              <div className="text-sm leading-relaxed opacity-80">{typeof drug.pharmacokinetics === 'string' ? drug.pharmacokinetics : 'Xem chi tiết trong mục hướng dẫn.'}</div>
                            </div>
                          )}
                        </div>
                        {!drug.pharmacology && !drug.pharmacodynamics && !drug.pharmacokinetics && (
                          <div className="text-center py-20 opacity-40">
                            <Activity size={48} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-tighter">Thuốc này chưa cập nhật Dược lý.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Warnings Tab */}
                    {activeDetailTab === 'warnings' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className={cn("p-6 rounded-3xl border border-amber-200/50 shadow-sm", isDarkMode ? "bg-amber-900/10" : "bg-amber-50/20")}>
                            <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 mb-4">
                              <AlertTriangle size={16} /> Thận trọng
                            </h5>
                            <div className="text-sm leading-relaxed">{drug.precautions || 'Không có cảnh báo đặc biệt.'}</div>
                          </div>
                          <div className={cn("p-6 rounded-3xl border border-blue-200/50 shadow-sm", isDarkMode ? "bg-blue-900/10" : "bg-blue-50/20")}>
                            <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4">
                              <RefreshCw size={16} /> Tương tác chung
                            </h5>
                            <div className="text-sm leading-relaxed">{drug.interactions || 'Không có tương tác đặc biệt.'}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                           <div className={cn("p-5 rounded-2xl border shadow-sm", isDarkMode ? "bg-rose-900/10 border-rose-900/20" : "bg-rose-50 border-rose-100")}>
                              <Heart className="text-rose-500 mb-2 shadow-sm" size={18} />
                              <h6 className="text-[10px] font-black uppercase text-rose-600 mb-1">Thai kỳ</h6>
                              <p className="text-[11px] leading-relaxed">{drug.pregnancy || 'Cần thận trọng.'}</p>
                           </div>
                           <div className={cn("p-5 rounded-2xl border shadow-sm", isDarkMode ? "bg-pink-900/10 border-pink-900/20" : "bg-pink-50 border-pink-100")}>
                              <Baby className="text-pink-500 mb-2 shadow-sm" size={18} />
                              <h6 className="text-[10px] font-black uppercase text-pink-600 mb-1">Cho con bú</h6>
                              <p className="text-[11px] leading-relaxed">{drug.lactation || 'Cần thận trọng.'}</p>
                           </div>
                           <div className={cn("p-5 rounded-2xl border shadow-sm", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200")}>
                              <Car className="text-slate-500 mb-2" size={18} />
                              <h6 className="text-[10px] font-black uppercase text-slate-600 mb-1">Lái xe</h6>
                              <p className="text-[11px] leading-relaxed">{drug.driving || 'Không ảnh hưởng.'}</p>
                           </div>
                        </div>

                        {drug.overdose && (
                          <div className={cn("p-8 rounded-[32px] border border-rose-200/50 shadow-sm", isDarkMode ? "bg-rose-900/10" : "bg-rose-50/20")}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">Quá liều & Xử trí</h4>
                            <p className="text-sm leading-relaxed">{drug.overdose}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specific Interactions Tab */}
                    {activeDetailTab === 'interactions' && (
                      <div className="space-y-4">
                        {(drug.specificInteractions || []).map((item, idx) => (
                          <div key={idx} className={cn(
                            "p-6 rounded-3xl border flex items-start gap-4 transition-all hover:shadow-md",
                            isDarkMode ? "bg-slate-800 border-indigo-900/30" : "bg-white border-indigo-100 shadow-sm"
                          )}>
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500 shrink-0 shadow-sm">
                              <RefreshCw size={20} />
                            </div>
                            <div>
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">{item.target}</h5>
                              <p className="text-sm leading-relaxed">{item.content}</p>
                            </div>
                          </div>
                        ))}
                        {(drug.specificInteractions || []).length === 0 && (
                          <div className="text-center py-20 opacity-40">
                            <RefreshCw size={48} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-tighter">Không có dữ liệu tương tác đặc hiệu.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info Tab */}
                    {activeDetailTab === 'info' && (
                      <div className="space-y-4">
                        {/* Thông tin công ty */}
                        <div className={cn(
                          "p-6 rounded-3xl border space-y-4",
                          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                        )}>
                          <div className="flex items-center gap-3 mb-2">
                             <Briefcase size={18} className="text-blue-500" />
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thông tin công ty</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Nhà sản xuất</p>
                              <p className="text-sm font-bold flex items-center gap-2">
                                {drug.manufacturer || 'Chưa cập nhật'}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Số đăng ký (SĐK)</p>
                              <p className="text-sm font-bold">
                                {drug.registrationNumber || 'Chưa cập nhật'}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Phiên bản tờ hướng dẫn</p>
                              <p className="text-sm font-bold">
                                {drug.leafletVersion || 'Chưa cập nhật'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Người cập nhật */}
                        <div className={cn(
                          "p-5 rounded-2xl border flex items-center gap-4",
                          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                        )}>
                          <div className={cn("p-2.5 rounded-xl shrink-0", isDarkMode ? "bg-slate-700" : "bg-slate-100")}>
                            <UserCheck size={18} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">Cập nhật bởi</p>
                            <p className="text-sm font-bold">{drug.updatedBy || 'Hệ thống'}</p>
                          </div>
                        </div>

                        {/* Ngày cập nhật */}
                        {drug.updatedAt && (
                          <div className={cn(
                            "p-5 rounded-2xl border flex items-center gap-4",
                            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                          )}>
                            <div className={cn("p-2.5 rounded-xl shrink-0", isDarkMode ? "bg-slate-700" : "bg-slate-100")}>
                              <Clock size={18} className="text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">Ngày cập nhật</p>
                              <p className={cn("text-sm font-bold", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                                {(() => {
                                  try {
                                    return new Intl.DateTimeFormat('vi-VN', {
                                      day: '2-digit', month: '2-digit', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit', hour12: false,
                                      timeZone: 'Asia/Ho_Chi_Minh'
                                    }).format(new Date(drug.updatedAt));
                                  } catch { return drug.updatedAt; }
                                })()}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Ngày tạo */}
                        {drug.createdAt && (
                          <div className={cn(
                            "p-5 rounded-2xl border flex items-center gap-4",
                            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                          )}>
                            <div className={cn("p-2.5 rounded-xl shrink-0", isDarkMode ? "bg-slate-700" : "bg-slate-100")}>
                              <Calendar size={18} className="text-emerald-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">Ngày tạo</p>
                              <p className={cn("text-sm font-bold", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                                {(() => {
                                  try {
                                    return new Intl.DateTimeFormat('vi-VN', {
                                      day: '2-digit', month: '2-digit', year: 'numeric'
                                    }).format(new Date(drug.createdAt));
                                  } catch { return drug.createdAt; }
                                })()}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Tờ hướng dẫn PDF */}
                        {drug.pdfUrl && (
                          <a
                            href={drug.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-3 p-5 rounded-2xl border transition-all hover:scale-[1.01] active:scale-95",
                              isDarkMode
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/15"
                                : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100 shadow-sm"
                            )}
                          >
                            <div className={cn("p-2.5 rounded-xl shrink-0", isDarkMode ? "bg-rose-500/20" : "bg-rose-100")}>
                              <FileText size={18} className="text-rose-500" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Tài liệu đính kèm</p>
                              <p className="text-sm font-bold">Xem tờ hướng dẫn sử dụng (PDF)</p>
                            </div>
                            <ExternalLink size={16} className="opacity-50 shrink-0" />
                          </a>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>


            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DrugDetailModal;
