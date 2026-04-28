import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, FileText, User, ClipboardList, Pill, Save, Printer, ChevronRight, ChevronLeft, CheckCircle2, Search, Sparkles, History, ArrowLeft, Download } from 'lucide-react';
import { Prescription, PrescriptionItem, Drug, ICD10, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { db, auth, collection, setDoc, doc, getDocs, handleFirestoreError, OperationType, onSnapshot, query, where, orderBy } from '../firebase';

const prescriptionSchema = z.object({
  patientName: z.string().min(2, 'Tên bệnh nhân quá ngắn'),
  patientAge: z.number().min(0).max(150),
  patientGender: z.enum(['Nam', 'Nữ']),
  patientAddress: z.string().optional(),
  diagnosis: z.string().min(5, 'Chẩn đoán cần chi tiết hơn'),
  icd10Code: z.string().optional(),
  items: z.array(z.object({
    drugId: z.string(),
    drugName: z.string(),
    dosage: z.string().min(1, 'Liều dùng không được để trống'),
    frequency: z.string().min(1, 'Tần suất không được để trống'),
    duration: z.string().min(1, 'Thời gian không được để trống'),
    note: z.string().optional(),
  })).min(1, 'Cần ít nhất một loại thuốc'),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

interface PrescriptionFormProps {
  userProfile: UserProfile;
  isDarkMode?: boolean;
  featureSettings?: any;
}

const AutoExpandingTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onInput={(e) => {
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        if (props.onInput) props.onInput(e);
      }}
    />
  );
};

const PrescriptionForm: React.FC<PrescriptionFormProps> = ({ userProfile, isDarkMode, featureSettings }) => {
  const [viewMode, setViewMode] = useState<'form' | 'history'>('form');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<Prescription | null>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [icdList, setIcdList] = useState<ICD10[]>([]);
  const [selectedIcd, setSelectedIcd] = useState<ICD10 | null>(null);
  const [history, setHistory] = useState<Prescription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<Prescription | null>(null);

  useEffect(() => {
    const fetchDrugs = async () => {
      try {
        const drugsSnap = await getDocs(collection(db, 'drugs'));
        setDrugs(drugsSnap.docs.map(doc => doc.data() as Drug));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'drugs');
      }
    };

    const unsubscribeIcd = onSnapshot(collection(db, 'icd10'), (snapshot) => {
      setIcdList(snapshot.docs.map(doc => doc.data() as ICD10));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'icd10');
    });

    fetchDrugs();
    return () => unsubscribeIcd();
  }, []);

  useEffect(() => {
    if (viewMode === 'history' && auth.currentUser) {
      setIsLoadingHistory(true);
      const q = query(
        collection(db, 'prescriptions'),
        where('doctorUid', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setHistory(snapshot.docs.map(doc => doc.data() as Prescription));
        setIsLoadingHistory(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'prescriptions');
        setIsLoadingHistory(false);
      });

      return () => unsubscribe();
    }
  }, [viewMode]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientName: '',
      patientAge: 0,
      patientGender: 'Nam',
      patientAddress: '',
      diagnosis: '',
      icd10Code: '',
      items: [{ drugId: '', drugName: '', dosage: '', frequency: '', duration: '', note: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchIcdCode = watch('icd10Code');

  useEffect(() => {
    if (watchIcdCode) {
      const icd = icdList.find(i => i.code === watchIcdCode);
      if (icd) {
        setSelectedIcd(icd);
        setValue('diagnosis', icd.description);
      }
    } else {
      setSelectedIcd(null);
    }
  }, [watchIcdCode, icdList, setValue]);

  const addSuggestedDrug = (drugName: string) => {
    const drug = drugs.find(d => (d.name || '').toLowerCase().includes((drugName || '').toLowerCase()));
    append({
      drugId: drug?.id || '',
      drugName: drug?.name || drugName,
      dosage: '',
      frequency: '',
      duration: '',
      note: ''
    });
  };

  const drugsByIcd = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    drugs.forEach(drug => {
      const codes = new Set<string>();
      (drug.indications || []).forEach(ind => {
        (ind.icd10s || []).forEach(icdItem => {
          if (icdItem && typeof icdItem === 'string') {
            const codeOnly = icdItem.split(' - ')[0].trim().toUpperCase();
            if (codeOnly) codes.add(codeOnly);
          }
        });
      });
      codes.forEach(code => {
        if (!map[code]) map[code] = [];
        if (!map[code].includes(drug.name)) {
          map[code].push(drug.name);
        }
      });
    });
    return map;
  }, [drugs]);

  const isDrugSuggestionsAllowed = React.useMemo(() => {
    const allowedRoles = featureSettings?.drugSuggestionsAllowedRoles || [];
    if (allowedRoles.length === 0) return true;
    return allowedRoles.includes(userProfile.role);
  }, [featureSettings, userProfile.role]);

  const onSubmit: SubmitHandler<PrescriptionFormData> = async (data) => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      const id = Math.random().toString(36).substr(2, 9);
      const newPrescription: Prescription = {
        ...data,
        id,
        createdAt: new Date().toISOString(),
        doctorName: auth.currentUser.displayName || 'Bác sĩ',
        doctorUid: auth.currentUser.uid,
      };
      
      await setDoc(doc(db, 'prescriptions', id), newPrescription);
      setSubmittedData(newPrescription);
      setStep(3);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prescriptions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="p-2 lg:p-6 max-w-full mx-auto pb-24 lg:pb-12">
      <div className="mb-2 lg:mb-12">
        <div className="hidden lg:flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl text-white transition-all",
              isDarkMode ? "bg-blue-600 shadow-none" : "bg-blue-600 shadow-lg shadow-blue-200 lg:shadow-blue-200"
            )}>
              {viewMode === 'form' ? <FileText size={28} /> : <History size={28} />}
            </div>
            <div>
              <h2 className={cn(
                "text-2xl lg:text-3xl font-black tracking-tight transition-colors",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                {viewMode === 'form' ? 'Kê toa thuốc mới' : 'Lịch sử kê toa'}
              </h2>
              <p className={cn(
                "text-sm lg:text-base font-medium transition-colors",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                {viewMode === 'form' 
                  ? 'Tạo đơn thuốc chuyên nghiệp và in ấn ngay lập tức.' 
                  : 'Xem lại và quản lý các đơn thuốc bạn đã thực hiện.'}
              </p>
            </div>
          </div>

          <div className={cn(
            "flex p-1 rounded-2xl gap-1 transition-colors",
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          )}>
            <button
              onClick={() => setViewMode('form')}
              className={cn(
                "px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all",
                viewMode === 'form'
                  ? (isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-600 shadow-sm")
                  : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700")
              )}
            >
              <Plus size={18} /> Kê toa mới
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={cn(
                "px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all",
                viewMode === 'history'
                  ? (isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-600 shadow-sm")
                  : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700")
              )}
            >
              <History size={18} /> Lịch sử
            </button>
          </div>
        </div>

        {viewMode === 'form' && (
          <div className="flex items-center gap-2 lg:gap-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full text-sm lg:text-base font-bold transition-all duration-300",
                  step === s ? (isDarkMode ? "bg-blue-600 text-white shadow-none scale-110" : "bg-blue-600 text-white shadow-lg shadow-blue-200 lg:shadow-blue-200 scale-110") : 
                  step > s ? "bg-emerald-500 text-white" : cn(isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-500")
                )}>
                  {step > s ? <CheckCircle2 size={18} className="lg:hidden" /> : s}
                  {step > s && <CheckCircle2 size={20} className="hidden lg:block" />}
                </div>
                {s < 3 && <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", step > s ? "bg-emerald-500" : cn(isDarkMode ? "bg-slate-800" : "bg-slate-200"))} />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'form' ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "p-8 rounded-3xl border shadow-xl space-y-8 transition-colors",
                  isDarkMode 
                    ? "bg-slate-900 border-slate-800 shadow-none" 
                    : "bg-white border-slate-100 shadow-slate-200/50"
                )}
              >
                <div className="flex items-center gap-3 text-blue-600 mb-6">
                  <User size={24} />
                  <h3 className="text-xl font-bold uppercase tracking-wider">Thông tin bệnh nhân</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className={cn(
                      "text-sm font-bold ml-1 transition-colors",
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    )}>Họ và tên</label>
                    <input
                      {...register('patientName')}
                      className={cn(
                        "w-full px-5 py-4 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium",
                        isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                      )}
                      placeholder="Nguyễn Văn A"
                    />
                    {errors.patientName && <p className="text-rose-500 text-xs font-bold ml-1">{errors.patientName.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={cn(
                        "text-sm font-bold ml-1 transition-colors",
                        isDarkMode ? "text-slate-300" : "text-slate-700"
                      )}>Tuổi</label>
                      <input
                        type="number"
                        {...register('patientAge', { valueAsNumber: true })}
                        className={cn(
                          "w-full px-5 py-4 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={cn(
                        "text-sm font-bold ml-1 transition-colors",
                        isDarkMode ? "text-slate-300" : "text-slate-700"
                      )}>Giới tính</label>
                      <select
                        {...register('patientGender')}
                        className={cn(
                          "w-full px-5 py-4 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium appearance-none",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                      >
                        <option value="Nam" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Nam</option>
                        <option value="Nữ" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Nữ</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-blue-600 mb-4 mt-4">
                    <ClipboardList size={24} />
                    <h3 className="text-xl font-bold uppercase tracking-wider">Chẩn đoán & ICD-10</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-2">
                      <label className={cn(
                        "text-sm font-bold ml-1 transition-colors",
                        isDarkMode ? "text-slate-300" : "text-slate-700"
                      )}>Mã ICD-10 (Gợi ý)</label>
                      <select
                        {...register('icd10Code')}
                        className={cn(
                          "w-full px-5 py-4 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium appearance-none",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                      >
                        <option value="" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Chọn mã ICD-10...</option>
                        {icdList.map(icd => (
                          <option key={icd.code} value={icd.code} className={isDarkMode ? "bg-slate-900" : "bg-white"}>{icd.code} - {icd.description}</option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-2 space-y-2">
                      <label className={cn(
                        "text-sm font-bold ml-1 transition-colors",
                        isDarkMode ? "text-slate-300" : "text-slate-700"
                      )}>Chẩn đoán chi tiết</label>
                      <AutoExpandingTextarea
                        {...register('diagnosis')}
                        rows={3}
                        className={cn(
                          "w-full px-5 py-4 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium",
                          isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                        )}
                        placeholder="Nhập chẩn đoán lâm sàng..."
                      />
                      {errors.diagnosis && <p className="text-rose-500 text-xs font-bold ml-1">{errors.diagnosis.message}</p>}
                    </div>
                  </div>

                  {isDrugSuggestionsAllowed && selectedIcd && drugsByIcd[(selectedIcd.code || '').trim().toUpperCase()] && drugsByIcd[(selectedIcd.code || '').trim().toUpperCase()].length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-6 rounded-[32px] border transition-colors",
                        isDarkMode ? "bg-blue-900/10 border-blue-900/30" : "bg-blue-50 border-blue-100"
                      )}
                    >
                      <div className={cn("flex items-center gap-2 font-bold mb-4 transition-colors", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                        <Sparkles size={18} />
                        <span>Thuốc gợi ý cho {selectedIcd.code}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {drugsByIcd[(selectedIcd.code || '').trim().toUpperCase()].map((drug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addSuggestedDrug(drug)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-sm font-bold border transition-all shadow-sm flex items-center gap-2",
                              isDarkMode 
                                ? "bg-slate-800 text-blue-400 border-blue-900/50 hover:bg-blue-600 hover:text-white" 
                                : "bg-white text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
                            )}
                          >
                            <Plus size={14} /> {drug}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={nextStep}
                    className={cn(
                      "px-8 py-4 bg-blue-500 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all",
                      isDarkMode ? "shadow-none" : "shadow-lg shadow-blue-200"
                    )}
                  >
                    Tiếp theo <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className={cn(
                  "p-8 rounded-3xl border shadow-xl transition-colors",
                  isDarkMode 
                    ? "bg-slate-900 border-slate-800 shadow-none" 
                    : "bg-white border-slate-100 shadow-slate-200/50"
                )}>
                  <div className="flex items-center justify-between mb-8">
                    <div className={cn("flex items-center gap-3 transition-colors", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                      <Pill size={24} />
                      <h3 className="text-xl font-bold uppercase tracking-wider">Danh mục thuốc kê toa</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => append({ drugId: '', drugName: '', dosage: '', frequency: '', duration: '', note: '' })}
                      className={cn(
                        "px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
                        isDarkMode ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      )}
                    >
                      <Plus size={18} /> Thêm thuốc
                    </button>
                  </div>

                  <div className="space-y-6">
                    {fields.map((field, index) => (
                      <div key={field.id} className={cn(
                        "p-6 rounded-2xl border relative group transition-colors",
                        isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                      )}>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className={cn(
                            "absolute -right-2 -top-2 p-2 text-rose-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all",
                            isDarkMode ? "bg-slate-800 hover:bg-rose-900/30" : "bg-white hover:bg-rose-50"
                          )}
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className={cn(
                              "text-xs font-black uppercase tracking-widest ml-1 transition-colors",
                              isDarkMode ? "text-slate-500" : "text-slate-400"
                            )}>Tên thuốc</label>
                            <select
                              {...register(`items.${index}.drugId` as const)}
                              onChange={(e) => {
                                const drugId = e.target.value;
                                const drug = drugs.find(d => d.id === drugId);
                                if (drug) {
                                  setValue(`items.${index}.drugName`, drug.name);
                                }
                              }}
                              className={cn(
                                "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                              )}
                            >
                              <option value="" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Chọn thuốc...</option>
                              {drugs.map(d => (
                                <option key={d.id} value={d.id} className={isDarkMode ? "bg-slate-900" : "bg-white"}>
                                  {d.name} ({(d.activeIngredients || []).map(ing => `${ing.name} ${ing.strength}`).join(' + ')})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <label className={cn(
                                "text-xs font-black uppercase tracking-widest ml-1",
                                isDarkMode ? "text-slate-500" : "text-slate-400"
                              )}>Liều dùng</label>
                              <input
                                {...register(`items.${index}.dosage` as const)}
                                className={cn(
                                  "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                                placeholder="1 viên"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={cn(
                                "text-xs font-black uppercase tracking-widest ml-1",
                                isDarkMode ? "text-slate-500" : "text-slate-400"
                              )}>Tần suất</label>
                              <input
                                {...register(`items.${index}.frequency` as const)}
                                className={cn(
                                  "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                                placeholder="2 lần/ngày"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={cn(
                                "text-xs font-black uppercase tracking-widest ml-1",
                                isDarkMode ? "text-slate-500" : "text-slate-400"
                              )}>Số ngày</label>
                              <input
                                {...register(`items.${index}.duration` as const)}
                                className={cn(
                                  "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                )}
                                placeholder="5 ngày"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className={cn(
                              "text-xs font-black uppercase tracking-widest ml-1 transition-colors",
                              isDarkMode ? "text-slate-500" : "text-slate-400"
                            )}>Ghi chú (Uống lúc nào...)</label>
                            {(() => {
                              const selectedDrugId = watch(`items.${index}.drugId`);
                              const drug = drugs.find(d => d.id === selectedDrugId);
                              const primaryInd = drug?.indications?.find(ind => ind.isPrimary);
                              if (primaryInd) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => setValue(`items.${index}.note`, primaryInd.content)}
                                    className={cn(
                                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all hover:scale-105 active:scale-95",
                                      isDarkMode ? "bg-amber-900/20 text-amber-400 border-amber-900/30" : "bg-amber-50 text-amber-600 border-amber-200"
                                    )}
                                    title="Sử dụng chỉ định thường dùng làm ghi chú"
                                  >
                                    <Sparkles size={10} /> {primaryInd.content.length > 20 ? primaryInd.content.substring(0, 20) + '...' : primaryInd.content}
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <input
                            {...register(`items.${index}.note` as const)}
                            className={cn(
                              "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                            )}
                            placeholder="Uống sau khi ăn no..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      onClick={prevStep}
                      className={cn(
                        "px-8 py-4 border rounded-2xl font-bold flex items-center gap-2 transition-all shadow-sm",
                        isDarkMode 
                          ? "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <ChevronLeft size={20} /> Quay lại
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "px-12 py-4 text-white rounded-2xl font-bold flex items-center gap-3 transition-all",
                        isDarkMode 
                          ? "bg-blue-600 hover:bg-blue-700 shadow-none disabled:bg-slate-800" 
                          : "bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:bg-slate-300"
                      )}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="animate-spin" size={20} /> Đang lưu...</>
                      ) : (
                        <><Save size={20} /> Hoàn tất kê toa</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && submittedData && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-12 rounded-3xl border shadow-2xl text-center transition-colors",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}
              >
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 transition-colors",
                  isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                )}>
                  <CheckCircle2 size={48} />
                </div>
                <h3 className={cn("text-3xl font-black mb-4 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Kê toa thành công!</h3>
                <p className={cn("text-lg mb-10 max-w-md mx-auto transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Đơn thuốc cho bệnh nhân <strong className={cn("transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{submittedData.patientName}</strong> đã được lưu vào hệ thống.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={cn(
                      "w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all",
                      isDarkMode ? "shadow-none" : "shadow-lg shadow-blue-200"
                    )}
                  >
                    <Printer size={20} /> In đơn thuốc
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSubmittedData(null);
                    }}
                    className={cn(
                      "w-full sm:w-auto px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                      isDarkMode ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    )}
                  >
                    <Plus size={20} /> Tạo đơn mới
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      ) : (
        <div className="space-y-6">
          {selectedHistoryItem ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-8 rounded-3xl border shadow-xl transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <button 
                onClick={() => setSelectedHistoryItem(null)}
                className={cn(
                  "flex items-center gap-2 text-sm font-bold mb-8 transition-colors",
                  isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <ArrowLeft size={18} /> Quay lại danh sách
              </button>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                    )}>
                      Đơn thuốc #{selectedHistoryItem.id}
                    </span>
                    <span className={cn(
                      "text-xs font-bold",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>
                      {format(new Date(selectedHistoryItem.createdAt), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <h3 className={cn("text-3xl font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                    {selectedHistoryItem.patientName}
                  </h3>
                  <p className={cn("font-medium transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {selectedHistoryItem.patientAge} tuổi • {selectedHistoryItem.patientGender}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className={cn(
                      "px-6 py-3 rounded-2xl font-bold flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    )}
                  >
                    <Printer size={18} /> In đơn
                  </button>
                  <button
                    className={cn(
                      "p-3 rounded-2xl font-bold border transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                  <div className={cn(
                    "p-6 rounded-2xl space-y-4 transition-colors",
                    isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
                  )}>
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                      <ClipboardList size={16} /> Chẩn đoán
                    </div>
                    <div className="space-y-4">
                      {selectedHistoryItem.icd10Code && (
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Mã ICD-10</label>
                          <div className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                             {selectedHistoryItem.icd10Code}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Bệnh cảnh</label>
                        <div className={cn("font-bold leading-relaxed", isDarkMode ? "text-white" : "text-slate-900")}>
                          {selectedHistoryItem.diagnosis}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "p-6 rounded-2xl space-y-4 transition-colors",
                    isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
                  )}>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                      <User size={16} /> Bác sĩ kê toa
                    </div>
                    <div>
                      <div className={cn("font-black text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                         BS. {selectedHistoryItem.doctorName}
                      </div>
                      <div className="text-xs font-bold text-slate-400">ID: {selectedHistoryItem.doctorUid.substring(0, 8)}</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <h4 className={cn("text-lg font-black flex items-center gap-2 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                    <Pill size={20} className="text-blue-500" /> Danh mục thuốc ({selectedHistoryItem.items.length})
                  </h4>
                  
                  <div className="space-y-4">
                    {selectedHistoryItem.items.map((item, idx) => (
                      <div key={idx} className={cn(
                        "p-6 rounded-2xl border transition-colors",
                        isDarkMode ? "border-slate-800 hover:bg-slate-800/30" : "border-slate-100 hover:bg-slate-50"
                      )}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className={cn("font-bold text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                            {idx + 1}. {item.drugName}
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-lg text-xs font-black bg-blue-500 text-white"
                          )}>
                            {item.duration}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                          <div className="flex items-center gap-2 text-slate-400">
                             Liều: <span className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>{item.dosage}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                             Tần suất: <span className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>{item.frequency}</span>
                          </div>
                        </div>
                        {item.note && (
                          <div className={cn(
                            "mt-4 p-3 rounded-xl border-l-4 border-amber-500 text-xs italic font-medium",
                            isDarkMode ? "bg-amber-900/10 text-amber-300" : "bg-amber-50 text-amber-700"
                          )}>
                            Ghi chú: {item.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className={cn(
              "p-8 rounded-3xl border shadow-xl transition-colors",
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
            )}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Tìm kiếm tên bệnh nhân, ID đơn thuốc..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "w-full pl-12 pr-4 py-3 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-medium transition-all",
                      isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                    )}
                  />
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-xs font-bold text-slate-400">{history.length} đơn thuốc</div>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="py-24 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-blue-500" size={40} />
                  <p className="text-slate-400 font-bold">Đang tải lịch sử...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History size={40} className="text-slate-400" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-400">Chưa có đơn thuốc nào</h4>
                  <button 
                    onClick={() => setViewMode('form')}
                    className="mt-4 text-blue-600 font-bold hover:underline"
                  >
                    Bắt đầu kê toa ngay
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={cn(
                        "text-left border-b transition-colors",
                        isDarkMode ? "border-slate-800" : "border-slate-100"
                      )}>
                        <th className="pb-4 pl-4 font-black uppercase tracking-widest text-[10px] text-slate-400">ID & Ngày</th>
                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Bệnh nhân</th>
                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Số thuốc</th>
                        <th className="pb-4 pr-4 font-black uppercase tracking-widest text-[10px] text-slate-400 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-transparent">
                      {history
                        .filter(item => 
                          item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((item) => (
                          <tr 
                            key={item.id} 
                            onClick={() => setSelectedHistoryItem(item)}
                            className={cn(
                              "group cursor-pointer transition-all",
                              isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                            )}
                          >
                            <td className="py-4 pl-4">
                              <div className={cn("text-xs font-black uppercase tracking-wider mb-1", isDarkMode ? "text-blue-400" : "text-blue-600")}>#{item.id}</div>
                              <div className="text-[10px] font-bold text-slate-400">{format(new Date(item.createdAt), 'dd/MM/yyyy')}</div>
                            </td>
                            <td className="py-4">
                              <div className={cn("font-bold text-base transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{item.patientName}</div>
                              <div className="text-xs text-slate-500 font-medium">{item.patientAge} tuổi • {item.patientGender}</div>
                            </td>
                            <td className="py-4 text-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-black",
                                isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white border border-slate-100 text-slate-500"
                              )}>
                                {item.items.length} thuốc
                              </span>
                            </td>
                            <td className="py-4 pr-4 text-right">
                              <button className={cn(
                                "p-2 rounded-xl border opacity-0 group-hover:opacity-100 transition-all",
                                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                              )}>
                                <ChevronRight size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
  <svg
    className={cn("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default PrescriptionForm;
