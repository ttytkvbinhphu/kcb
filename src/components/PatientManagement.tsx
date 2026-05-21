import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, ChevronRight, X, Loader2, Check, AlertTriangle, Filter, Eye, Trash2, Pill, ClipboardList, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, setDoc, doc, deleteDoc, writeBatch, where, getDocs } from '../firebase';
import { Patient, PatientDrug, PatientSupply, PatientSubclinical } from '../types';

interface PatientManagementProps {
  isDarkMode: boolean;
  canManage: boolean;
}

const AutoExpandingTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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

const HighlightText = ({ text, search, className }: { text: string; search: string; className?: string }) => {
  if (!search?.trim()) return <span className={className}>{text}</span>;
  const parts = text.split(new RegExp(`(${search})`, 'gi'));
  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === search.toLowerCase() 
          ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-slate-900 dark:text-white rounded-sm px-0.5 font-bold">{part}</mark> 
          : part
      )}
    </span>
  );
};

const PatientManagement: React.FC<PatientManagementProps> = ({ isDarkMode, canManage }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<{
    drugs: PatientDrug[];
    supplies: PatientSupply[];
    subclinical: PatientSubclinical[];
  }>({ drugs: [], supplies: [], subclinical: [] });
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Manual Input state
  const [manualPatient, setManualPatient] = useState<Partial<Patient>>({
    MA_LK: '',
    MA_BN: '',
    HO_TEN: '',
    NGAY_SINH: '',
    GIOI_TINH: '1',
    NHOM_MAU: '',
    MA_DANTOC: '',
    MA_NGHE_NGHIEP: '',
    SO_CCCD: '',
    DIEN_THOAI: '',
    DIA_CHI: '',
    MA_THE_BHYT: '',
    MA_DKBD: '',
    GT_THE_TU: '',
    GT_THE_DEN: '',
    LY_DO_VV: '',
    CHAN_DOAN_VAO: '',
    CHAN_DOAN_RV: '',
    MA_BENH_CHINH: '',
    MA_BENH_KT: '',
    MA_NOI_DI: '',
    MA_NOI_DEN: '',
    GIAY_CHUYEN_TUYEN: '',
    NGAYGIO_VAO: new Date().toISOString().slice(0, 19).replace('T', ' '),
    NGAYGIO_RA: '',
    SO_NGAY_DIEU_TRI_3176: '',
    PP_DIEU_TRI: '',
    CAN_NANG: '',
    MA_BAC_SI: '',
    TEN_BAC_SI: '',
    NGAY_VAO: new Date().toISOString().split('T')[0]
  });
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'patients'), orderBy('HO_TEN'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Patient);
      setPatients(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching patients:", error);
      handleFirestoreError(error, OperationType.LIST, 'patients');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchPatientDetails = async (maLk: string) => {
    setDetailsLoading(true);
    try {
      const drugsQuery = query(collection(db, 'patient_drugs'), where('MA_LK', '==', maLk));
      const suppliesQuery = query(collection(db, 'patient_supplies'), where('MA_LK', '==', maLk));
      const subclinicalQuery = query(collection(db, 'patient_subclinical'), where('MA_LK', '==', maLk));

      const [drugsSnap, suppliesSnap, subclinicalSnap] = await Promise.all([
        getDocs(drugsQuery),
        getDocs(suppliesQuery),
        getDocs(subclinicalQuery)
      ]);

      setPatientDetails({
        drugs: drugsSnap.docs.map(d => d.data() as PatientDrug),
        supplies: suppliesSnap.docs.map(d => d.data() as PatientSupply),
        subclinical: subclinicalSnap.docs.map(d => d.data() as PatientSubclinical)
      });
    } catch (error) {
      console.error("Error fetching patient details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailModalOpen(true);
    fetchPatientDetails(patient.MA_LK);
  };

  const filteredPatients = patients.filter(p => 
    (p.HO_TEN || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (p.MA_BN || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (p.SO_CCCD || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleDeletePatient = async (maLk: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bệnh nhân này và tất cả dữ liệu liên quan?")) return;
    
    try {
      await deleteDoc(doc(db, 'patients', maLk));
      // Note: In a real app, you'd also delete related drugs, supplies, etc.
      // For this demo, we'll just delete the main record.
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${maLk}`);
    }
  };

  const handleSaveManual = async () => {
    if (!manualPatient.MA_LK || !manualPatient.HO_TEN) {
      alert("Vui lòng nhập ít nhất Mã LK và Họ tên");
      return;
    }

    setSavingManual(true);
    try {
      await setDoc(doc(db, 'patients', manualPatient.MA_LK!), manualPatient);
      setIsManualModalOpen(false);
      setManualPatient({
        MA_LK: '',
        MA_BN: '',
        HO_TEN: '',
        NGAY_SINH: '',
        GIOI_TINH: '1',
        NHOM_MAU: '',
        MA_DANTOC: '',
        MA_NGHE_NGHIEP: '',
        SO_CCCD: '',
        DIEN_THOAI: '',
        DIA_CHI: '',
        MA_THE_BHYT: '',
        MA_DKBD: '',
        GT_THE_TU: '',
        GT_THE_DEN: '',
        LY_DO_VV: '',
        CHAN_DOAN_VAO: '',
        CHAN_DOAN_RV: '',
        MA_BENH_CHINH: '',
        MA_BENH_KT: '',
        MA_NOI_DI: '',
        MA_NOI_DEN: '',
        GIAY_CHUYEN_TUYEN: '',
        NGAYGIO_VAO: new Date().toISOString().slice(0, 19).replace('T', ' '),
        NGAYGIO_RA: '',
        SO_NGAY_DIEU_TRI_3176: '',
        PP_DIEU_TRI: '',
        CAN_NANG: '',
        MA_BAC_SI: '',
        TEN_BAC_SI: '',
        NGAY_VAO: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `patients/${manualPatient.MA_LK}`);
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div className="p-0 lg:p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 lg:px-0">
        <div>
          <h2 className={cn("text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
            Tra cứu bệnh nhân
          </h2>
          <p className={cn("text-xs font-medium mt-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
            {canManage 
              ? "Theo dõi và quản lý thông tin bệnh nhân, thuốc và vật tư y tế."
              : "Tra cứu thông tin hành chính và lịch sử điều trị của bệnh nhân."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button
                onClick={() => setIsManualModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all",
                  isDarkMode ? "shadow-none" : "shadow-md shadow-emerald-200"
                )}
              >
                <Users size={14} />
                Nhập thủ công
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Quick Access & Filters */}
        <div className="w-full lg:w-72 shrink-0 space-y-6 px-4 lg:px-0">
          <div className={cn(
            "p-5 rounded-[32px] border sticky top-4",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm shadow-slate-200/50"
          )}>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Tìm kiếm nhanh</label>
                <div className="relative group">
                  <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 transition-colors", isDarkMode ? "text-slate-600 group-focus-within:text-blue-500" : "text-slate-400 group-focus-within:text-blue-500")} size={14} />
                  <input
                    type="text"
                    placeholder="Tên, mã BN, CCCD..."
                    className={cn(
                      "w-full pl-9 pr-3 py-2.5 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-[13px]",
                      isDarkMode ? "bg-slate-800 text-white placeholder:text-slate-600" : "bg-slate-50 text-slate-900 placeholder:text-slate-400"
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Bộ lọc danh sách</label>
                <div className="space-y-1">
                  {[
                    { id: 'all', label: 'Tất cả bệnh nhân', count: patients.length, active: true },
                    { id: 'bhyt', label: 'Có BHYT', count: patients.filter(p => !!p.MA_THE_BHYT).length, active: false },
                    { id: 'male', label: 'Bệnh nhân Nam', count: patients.filter(p => p.GIOI_TINH === '1').length, active: false },
                    { id: 'female', label: 'Bệnh nhân Nữ', count: patients.filter(p => p.GIOI_TINH === '2').length, active: false }
                  ].map(filter => (
                    <button 
                      key={filter.id}
                      className={cn(
                        "w-full px-4 py-3 rounded-2xl text-left text-xs font-black transition-all flex items-center justify-between group",
                        filter.active 
                          ? (isDarkMode ? "bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5 border border-blue-500/20" : "bg-blue-50 text-blue-600 border border-blue-100")
                          : (isDarkMode ? "text-slate-500 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-50")
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full transition-all", filter.active ? "bg-blue-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700")} />
                        {filter.label}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black",
                        filter.active
                          ? (isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600")
                          : (isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-500")
                      )}>
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn("p-4 rounded-2xl border border-dashed text-center", isDarkMode ? "border-slate-800" : "border-slate-100")}>
                <Activity size={16} className="text-emerald-500 mx-auto mb-2 opacity-50" />
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                  Tự động đồng bộ hồ sơ từ HIS kết nối thời gian thực.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Patient Grid/Table */}
        <div className="flex-1 min-w-0 px-4 lg:px-0">
          <div className={cn(
            "rounded-[40px] border overflow-hidden",
            isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 shadow-sm"
          )}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className={cn(
                    "border-b",
                    isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50/50 border-slate-50"
                  )}>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin hồ sơ</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ngày sinh</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Giới tính</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lịch sử</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500 mb-4" />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Đang tải danh sách bệnh nhân...</p>
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <div className={cn(
                          "w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-4",
                          isDarkMode ? "bg-slate-800" : "bg-slate-50"
                        )}>
                          <Search size={32} className="text-slate-300" />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Không tìm thấy bệnh nhân</h4>
                        <button 
                          onClick={() => setSearchTerm('')}
                          className="mt-2 text-xs font-bold text-blue-500 hover:underline"
                        >
                          Xóa bộ lọc tìm kiếm
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr 
                        key={patient.MA_LK}
                        className={cn(
                          "group transition-all",
                          isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-blue-50/40"
                        )}
                      >
                        <td className="px-6 py-5 max-w-[240px]">
                          <div className="flex flex-col">
                            <HighlightText 
                              text={patient.HO_TEN || ''} 
                              search={searchTerm} 
                              className={cn("text-[13px] font-black leading-tight", isDarkMode ? "text-slate-100" : "text-slate-900")}
                            />
                            <div className="flex items-center gap-3 mt-1.5">
                              <HighlightText 
                                text={patient.MA_BN || ''} 
                                search={searchTerm} 
                                className="font-mono text-[9px] font-black text-blue-500 tracking-tighter" 
                              />
                              <div className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                CCCD: <HighlightText text={patient.SO_CCCD || '---'} search={searchTerm} />
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{patient.NGAY_SINH}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                            patient.GIOI_TINH === '1'
                              ? (isDarkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600 shadow-sm shadow-blue-100")
                              : (isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-600 shadow-sm shadow-rose-100")
                          )}>
                            {patient.GIOI_TINH === '1' ? 'Nam' : 'Nữ'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                              <ClipboardList size={12} className="text-slate-400" />
                              Vào: {patient.NGAYGIO_VAO || patient.NGAY_VAO || '---'}
                            </div>
                            {patient.NGAYGIO_RA && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                                <Check size={12} />
                                Ra: {patient.NGAYGIO_RA}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 pr-2">
                            <button 
                              onClick={() => handleOpenDetails(patient)}
                              className={cn(
                                "p-2 rounded-2xl transition-all shadow-sm hover:scale-110 active:scale-95",
                                isDarkMode ? "bg-slate-800 text-blue-400 hover:bg-slate-700" : "bg-slate-50 text-blue-600 hover:bg-white hover:shadow-md"
                              )}
                              title="Xem chi tiết"
                            >
                              <Eye size={18} />
                            </button>
                            {canManage && (
                              <button 
                                onClick={() => {
                                  if (confirm(`Bạn có chắc chắn muốn xóa hồ sơ của bệnh nhân ${patient.HO_TEN}?`)) {
                                    deleteDoc(doc(db, 'patients', patient.MA_LK));
                                  }
                                }}
                                className={cn(
                                  "p-2 rounded-2xl transition-all shadow-sm hover:scale-110 active:scale-95",
                                  isDarkMode ? "bg-slate-800 text-rose-500 hover:bg-rose-500/20" : "bg-rose-50 text-rose-500 hover:bg-rose-100 hover:shadow-md shadow-rose-100"
                                )}
                                title="Xóa hồ sơ"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Input Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !savingManual && setIsManualModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className="p-6 flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tight">Nhập thông tin bệnh nhân thủ công</h3>
                <button onClick={() => !savingManual && setIsManualModalOpen(false)} className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                )}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số phiếu (MA_LK) (Bắt buộc)</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_LK}
                      onChange={(e) => setManualPatient({...manualPatient, MA_LK: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã BN</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_BN}
                      onChange={(e) => setManualPatient({...manualPatient, MA_BN: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên (Bắt buộc)</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.HO_TEN}
                      onChange={(e) => setManualPatient({...manualPatient, HO_TEN: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số CCCD</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.SO_CCCD}
                      onChange={(e) => setManualPatient({...manualPatient, SO_CCCD: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh (YYYY-MM-DD)</label>
                    <input 
                      type="date" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.NGAY_SINH}
                      onChange={(e) => setManualPatient({...manualPatient, NGAY_SINH: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giới tính</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.GIOI_TINH}
                      onChange={(e) => setManualPatient({...manualPatient, GIOI_TINH: e.target.value})}
                    >
                      <option value="1">Nam</option>
                      <option value="2">Nữ</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhóm máu</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.NHOM_MAU}
                      onChange={(e) => setManualPatient({...manualPatient, NHOM_MAU: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dân tộc</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_DANTOC}
                      onChange={(e) => setManualPatient({...manualPatient, MA_DANTOC: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nghề nghiệp</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_NGHE_NGHIEP}
                      onChange={(e) => setManualPatient({...manualPatient, MA_NGHE_NGHIEP: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.DIA_CHI}
                      onChange={(e) => setManualPatient({...manualPatient, DIA_CHI: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điện thoại</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.DIEN_THOAI}
                      onChange={(e) => setManualPatient({...manualPatient, DIEN_THOAI: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã thẻ BHYT</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_THE_BHYT}
                      onChange={(e) => setManualPatient({...manualPatient, MA_THE_BHYT: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi khám lần đầu</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_DKBD}
                      onChange={(e) => setManualPatient({...manualPatient, MA_DKBD: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày đăng ký thẻ BHYT</label>
                    <input 
                      type="date" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.GT_THE_TU}
                      onChange={(e) => setManualPatient({...manualPatient, GT_THE_TU: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày hết hạn BHYT</label>
                    <input 
                      type="date" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.GT_THE_DEN}
                      onChange={(e) => setManualPatient({...manualPatient, GT_THE_DEN: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lý do vào viện</label>
                    <AutoExpandingTextarea 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold min-h-[60px] resize-none", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.LY_DO_VV}
                      onChange={(e) => setManualPatient({...manualPatient, LY_DO_VV: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chẩn đoán vào viện</label>
                    <AutoExpandingTextarea 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold min-h-[60px] resize-none", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.CHAN_DOAN_VAO}
                      onChange={(e) => setManualPatient({...manualPatient, CHAN_DOAN_VAO: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chẩn đoán ra viện</label>
                    <AutoExpandingTextarea 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold min-h-[60px] resize-none", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.CHAN_DOAN_RV}
                      onChange={(e) => setManualPatient({...manualPatient, CHAN_DOAN_RV: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã ICD-10 chính</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_BENH_CHINH}
                      onChange={(e) => setManualPatient({...manualPatient, MA_BENH_CHINH: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã ICD-10 phụ</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_BENH_KT}
                      onChange={(e) => setManualPatient({...manualPatient, MA_BENH_KT: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyển tuyến (Giấy chuyển)</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.GIAY_CHUYEN_TUYEN}
                      onChange={(e) => setManualPatient({...manualPatient, GIAY_CHUYEN_TUYEN: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày giờ vào khám</label>
                    <input 
                      type="datetime-local" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.NGAYGIO_VAO?.replace(' ', 'T')}
                      onChange={(e) => setManualPatient({...manualPatient, NGAYGIO_VAO: e.target.value.replace('T', ' ')})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày giờ hoàn tất</label>
                    <input 
                      type="datetime-local" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.NGAYGIO_RA?.replace(' ', 'T')}
                      onChange={(e) => setManualPatient({...manualPatient, NGAYGIO_RA: e.target.value.replace('T', ' ')})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng thời gian khám</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.SO_NGAY_DIEU_TRI_3176}
                      onChange={(e) => setManualPatient({...manualPatient, SO_NGAY_DIEU_TRI_3176: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương pháp điều trị</label>
                    <AutoExpandingTextarea 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold min-h-[60px] resize-none", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.PP_DIEU_TRI}
                      onChange={(e) => setManualPatient({...manualPatient, PP_DIEU_TRI: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cân nặng (kg)</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.CAN_NANG}
                      onChange={(e) => setManualPatient({...manualPatient, CAN_NANG: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã chứng chỉ hành nghề BS</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_BAC_SI}
                      onChange={(e) => setManualPatient({...manualPatient, MA_BAC_SI: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên bác sĩ khám</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.TEN_BAC_SI}
                      onChange={(e) => setManualPatient({...manualPatient, TEN_BAC_SI: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className={cn(
                "p-6 border-t flex gap-3",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-bold transition-all",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveManual}
                  disabled={savingManual}
                  className={cn(
                    "flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold transition-all disabled:bg-slate-300",
                    isDarkMode ? "shadow-none" : "shadow-lg shadow-emerald-200"
                  )}
                >
                  {savingManual ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Lưu thông tin"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedPatient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-5xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden border transition-colors flex flex-col",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-6 border-b flex items-center justify-between shrink-0",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{selectedPatient.HO_TEN}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mã BN: {selectedPatient.MA_BN} | MA_LK: {selectedPatient.MA_LK}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                )}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* General Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hành chính</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Số phiếu:</span> <span className="font-bold">{selectedPatient.MA_LK}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Mã BN:</span> <span className="font-bold">{selectedPatient.MA_BN}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Họ và tên:</span> <span className="font-bold">{selectedPatient.HO_TEN}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Số CCCD:</span> <span className="font-bold">{selectedPatient.SO_CCCD}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ngày sinh:</span> <span className="font-bold">{selectedPatient.NGAY_SINH}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Giới tính:</span> <span className="font-bold">{selectedPatient.GIOI_TINH === '1' ? 'Nam' : 'Nữ'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Nhóm máu:</span> <span className="font-bold">{selectedPatient.NHOM_MAU}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Dân tộc:</span> <span className="font-bold">{selectedPatient.MA_DANTOC}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Nghề nghiệp:</span> <span className="font-bold">{selectedPatient.MA_NGHE_NGHIEP}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Địa chỉ:</span> <span className="font-bold text-right">{selectedPatient.DIA_CHI}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">SĐT:</span> <span className="font-bold">{selectedPatient.DIEN_THOAI}</span></div>
                    </div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bảo hiểm & Khám bệnh</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Mã thẻ BHYT:</span> <span className="font-bold text-blue-500">{selectedPatient.MA_THE_BHYT}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Nơi khám lần đầu:</span> <span className="font-bold">{selectedPatient.MA_DKBD}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ngày ĐK thẻ:</span> <span className="font-bold">{selectedPatient.GT_THE_TU}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ngày hết hạn:</span> <span className="font-bold">{selectedPatient.GT_THE_DEN}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Lý do vào viện:</span> <span className="font-bold text-right">{selectedPatient.LY_DO_VV}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ngày giờ vào:</span> <span className="font-bold">{selectedPatient.NGAYGIO_VAO}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ngày giờ hoàn tất:</span> <span className="font-bold">{selectedPatient.NGAYGIO_RA}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tổng thời gian:</span> <span className="font-bold">{selectedPatient.SO_NGAY_DIEU_TRI_3176}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Cân nặng:</span> <span className="font-bold">{selectedPatient.CAN_NANG} kg</span></div>
                    </div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100")}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chẩn đoán & Điều trị</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-col"><span className="text-slate-500">Vào viện:</span> <span className="font-bold">{selectedPatient.CHAN_DOAN_VAO}</span></div>
                      <div className="flex flex-col mt-2"><span className="text-slate-500">Ra viện:</span> <span className="font-bold">{selectedPatient.CHAN_DOAN_RV}</span></div>
                      <div className="flex justify-between mt-2"><span className="text-slate-500">ICD-10 chính:</span> <span className="font-bold text-rose-500">{selectedPatient.MA_BENH_CHINH}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">ICD-10 phụ:</span> <span className="font-bold">{selectedPatient.MA_BENH_KT}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Chuyển tuyến:</span> <span className="font-bold">{selectedPatient.GIAY_CHUYEN_TUYEN}</span></div>
                      <div className="flex flex-col mt-2"><span className="text-slate-500">Phương pháp ĐT:</span> <span className="font-bold">{selectedPatient.PP_DIEU_TRI}</span></div>
                      <div className="flex justify-between mt-2"><span className="text-slate-500">Mã CCHN BS:</span> <span className="font-bold">{selectedPatient.MA_BAC_SI}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Bác sĩ khám:</span> <span className="font-bold">{selectedPatient.TEN_BAC_SI}</span></div>
                    </div>
                  </div>
                </div>

                {/* Details Tabs */}
                <div className="space-y-6">
                  {/* Drugs */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Pill className="text-blue-500" size={20} />
                      Thông tin sử dụng thuốc
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className={cn(
                            "text-[10px] font-black text-slate-400 uppercase tracking-widest border-b",
                            isDarkMode ? "border-slate-800" : "border-slate-100"
                          )}>
                            <th className="px-4 py-2">Tên thuốc / Hoạt chất</th>
                            <th className="px-4 py-2">Hàm lượng / Đơn vị</th>
                            <th className="px-4 py-2">Liều dùng / Cách dùng</th>
                            <th className="px-4 py-2">Số lượng</th>
                            <th className="px-4 py-2">Bác sĩ kê đơn</th>
                            <th className="px-4 py-2 text-right">Ngày giờ kê</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailsLoading ? (
                            <tr><td colSpan={6} className="py-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                          ) : patientDetails.drugs.length === 0 ? (
                            <tr><td colSpan={6} className="py-8 text-center text-slate-500">Không có dữ liệu thuốc.</td></tr>
                          ) : (
                            patientDetails.drugs.map((drug, idx) => (
                              <tr key={idx} className={cn(
                                "border-b transition-colors",
                                isDarkMode ? "border-slate-800/50" : "border-slate-50"
                              )}>
                                <td className="px-4 py-3">
                                  <p className="font-bold">{drug.TEN_THUOC}</p>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Hoạt chất: {drug.HOAT_CHAT || drug.HAM_LUONG}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium">{drug.HAM_LUONG}</p>
                                  <p className="text-xs text-slate-500">{drug.DON_VI_TINH}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium">{drug.LIEU_DUNG}</p>
                                  <p className="text-xs text-slate-500">{drug.CACH_DUNG}</p>
                                </td>
                                <td className="px-4 py-3 font-bold text-blue-600">{drug.SO_LUONG}</td>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-xs">{drug.TEN_BAC_SI}</p>
                                  <p className="text-[10px] text-slate-500">CCHN: {drug.MA_BAC_SI}</p>
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-mono text-slate-500">
                                  {drug.NGAYGIO_YL}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Supplies */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <ClipboardList className="text-emerald-500" size={20} />
                      Vật tư y tế & Dịch vụ
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className={cn(
                            "text-[10px] font-black text-slate-400 uppercase tracking-widest border-b",
                            isDarkMode ? "border-slate-800" : "border-slate-100"
                          )}>
                            <th className="px-4 py-2">Tên vật tư / Dịch vụ</th>
                            <th className="px-4 py-2">Đơn vị</th>
                            <th className="px-4 py-2">Số lượng</th>
                            <th className="px-4 py-2">Đơn giá</th>
                            <th className="px-4 py-2 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailsLoading ? (
                            <tr><td colSpan={5} className="py-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                          ) : patientDetails.supplies.length === 0 ? (
                            <tr><td colSpan={5} className="py-8 text-center text-slate-500">Không có dữ liệu vật tư.</td></tr>
                          ) : (
                            patientDetails.supplies.map((supply, idx) => (
                              <tr key={idx} className={cn(
                                "border-b transition-colors",
                                isDarkMode ? "border-slate-800/50" : "border-slate-50"
                              )}>
                                <td className="px-4 py-3 font-bold">{supply.TEN_VAT_TU || supply.TEN_DICH_VU}</td>
                                <td className="px-4 py-3">{supply.DON_VI_TINH}</td>
                                <td className="px-4 py-3 font-bold">{supply.SO_LUONG}</td>
                                <td className="px-4 py-3">{Number(supply.DON_GIA_BV).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{Number(supply.THANH_TIEN_BV).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Subclinical */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Activity className="text-amber-500" size={20} />
                      Kết quả cận lâm sàng
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailsLoading ? (
                        <div className="col-span-2 py-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
                      ) : patientDetails.subclinical.length === 0 ? (
                        <div className="col-span-2 py-8 text-center text-slate-500">Không có dữ liệu cận lâm sàng.</div>
                      ) : (
                        patientDetails.subclinical.map((item, idx) => (
                          <div key={idx} className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-100")}>
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-bold text-sm">{item.TEN_CHI_SO}</h5>
                              <span className="text-xs font-mono text-slate-500">{item.MA_CHI_SO}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-black text-blue-600">{item.GIA_TRI}</span>
                              <span className="text-xs font-bold text-slate-500">{item.DON_VI_DO}</span>
                            </div>
                            {item.KET_LUAN && (
                              <p className={cn(
                                "mt-2 text-xs font-medium italic transition-colors",
                                isDarkMode ? "text-slate-400" : "text-slate-600"
                              )}>
                                Kết luận: {item.KET_LUAN}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={cn(
                "p-6 border-t shrink-0",
                isDarkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"
              )}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng chi phí BV</p>
                      <p className="text-lg font-black text-blue-600">{Number(selectedPatient.T_TONGCHI_BV).toLocaleString()} đ</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bảo hiểm TT</p>
                      <p className="text-lg font-black text-emerald-600">{Number(selectedPatient.T_BHTT).toLocaleString()} đ</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bệnh nhân TT</p>
                      <p className="text-lg font-black text-rose-600">{Number(selectedPatient.T_BNTT).toLocaleString()} đ</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDetailModalOpen(false)}
                    className={cn(
                      "px-8 py-3 text-white rounded-2xl font-bold transition-all",
                      isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-900 hover:bg-slate-800"
                    )}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientManagement;
