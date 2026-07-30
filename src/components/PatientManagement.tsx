import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, ChevronRight, X, Loader2, Check, AlertTriangle, Filter, Eye, Trash2, Pill, ClipboardList, Activity, Edit, Plus, Pin, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, setDoc, doc, deleteDoc, writeBatch, where, getDocs, auth, updateDoc } from '../firebase';
import { Patient, PatientDrug, PatientSupply, PatientSubclinical } from '../types';

interface PatientManagementProps {
  isDarkMode: boolean;
  canManage: boolean;
  userProfile?: any;
  featureSettings?: any;
  userPowerPoints?: number;
  hasDeletePower?: boolean;
  hasGroupPower?: boolean;
  hasManualPower?: boolean;
  hasShortcutsPower?: boolean;
  initialSearchTerm?: string | null;
  onClearInitialSearch?: () => void;
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

const getBadgeColorClasses = (color: string) => {
  const map: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-105 dark:border-blue-500/20",
      dot: "bg-blue-500"
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-500/20",
      dot: "bg-emerald-500"
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-500/20",
      dot: "bg-amber-500"
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-100 dark:border-rose-500/20",
      dot: "bg-rose-500"
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-500/10",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-100 dark:border-purple-500/20",
      dot: "bg-purple-500"
    },
    sky: {
      bg: "bg-sky-50 dark:bg-sky-500/10",
      text: "text-sky-600 dark:text-sky-450",
      border: "border-sky-101 dark:border-sky-500/20",
      dot: "bg-sky-500"
    },
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-100 dark:border-indigo-500/20",
      dot: "bg-indigo-500"
    },
    brown: {
      bg: "bg-amber-950/5 dark:bg-amber-500/10",
      text: "text-amber-800 dark:text-amber-300",
      border: "border-amber-900/10 dark:border-amber-500/20",
      dot: "bg-amber-700 dark:bg-amber-500"
    },
    gray: {
      bg: "bg-slate-100 dark:bg-slate-800/60",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-200 dark:border-slate-800",
      dot: "bg-slate-500"
    },
    pink: {
      bg: "bg-pink-50 dark:bg-pink-500/10",
      text: "text-pink-600 dark:text-pink-400",
      border: "border-pink-100 dark:border-pink-500/20",
      dot: "bg-pink-500"
    }
  };
  return map[color] || map.blue;
};

const PatientManagement: React.FC<PatientManagementProps> = ({ 
  isDarkMode, 
  canManage,
  userProfile,
  featureSettings,
  userPowerPoints,
  hasDeletePower = canManage,
  hasGroupPower = canManage,
  hasManualPower = canManage,
  hasShortcutsPower = canManage,
  initialSearchTerm,
  onClearInitialSearch
}) => {
  const canSeeShortcuts = hasShortcutsPower;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      if (onClearInitialSearch) {
        onClearInitialSearch();
      }
    }
  }, [initialSearchTerm]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<{
    drugs: PatientDrug[];
    supplies: PatientSupply[];
    subclinical: PatientSubclinical[];
  }>({ drugs: [], supplies: [], subclinical: [] });
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Patient Groups states
  const [patientGroups, setPatientGroups] = useState<{ id: string; name: string; code?: string; color: string; classification?: string }[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [groupColorInput, setGroupColorInput] = useState('blue');
  const [groupClassificationInput, setGroupClassificationInput] = useState('Độ tuổi');
  const [savingGroup, setSavingGroup] = useState(false);

  // Filtering criteria
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isEditingPatient, setIsEditingPatient] = useState(false);

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
    NGAY_VAO: new Date().toISOString().split('T')[0],
    MA_DOITUONG_KCB: ''
  });
  const [savingManual, setSavingManual] = useState(false);

  // Subscribe to Patients
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

  // Subscribe to Patient Groups (Nhóm đối tượng)
  useEffect(() => {
    const q = query(collection(db, 'patient_groups'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setPatientGroups(data);
      setGroupsLoaded(true);
    }, (error) => {
      console.error("Error fetching patient groups:", error);
      handleFirestoreError(error, OperationType.LIST, 'patient_groups');
      setGroupsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Initial seeding of standard Patient Groups with static IDs (Idempotent)
  useEffect(() => {
    if (groupsLoaded && patientGroups.length === 0 && hasGroupPower) {
      const defaultGroups = [
        { id: "tre_em", name: "Trẻ em", code: "TE", color: "blue", classification: "Độ tuổi" },
        { id: "nguoi_cao_tuoi", name: "Người cao tuổi", code: "NCT", color: "rose", classification: "Độ tuổi" },
        { id: "beo_phi", name: "Béo phì", code: "BP", color: "brown", classification: "Cân nặng" },
        { id: "thieu_can", name: "Thiếu cân", code: "TC", color: "amber", classification: "Cân nặng" },
        { id: "dai_thao_duong", name: "Đái tháo đường", code: "DTD", color: "emerald", classification: "Bệnh lý" },
        { id: "tang_huyet_ap", name: "Tăng huyết áp", code: "THA", color: "indigo", classification: "Bệnh lý" },
        { id: "tim_mach", name: "Tim mạch", code: "TM", color: "pink", classification: "Bệnh lý" }
      ];
      defaultGroups.forEach(async (g) => {
        try {
          const docRef = doc(db, 'patient_groups', g.id);
          const { id, ...data } = g;
          await setDoc(docRef, { ...data, createdAt: new Date().toISOString() });
        } catch (e) {
          console.error("Error seeding groups: ", e);
          handleFirestoreError(e, OperationType.WRITE, 'patient_groups');
        }
      });
    }
  }, [groupsLoaded, patientGroups.length, hasGroupPower]);

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) {
      alert("Vui lòng nhập tên nhóm đối tượng");
      return;
    }

    setSavingGroup(true);
    try {
      const groupData = {
        name: groupNameInput.trim(),
        code: groupCodeInput.trim().toUpperCase(),
        color: groupColorInput,
        classification: groupClassificationInput,
        updatedAt: new Date().toISOString()
      };

      if (editingGroupId) {
        await setDoc(doc(db, 'patient_groups', editingGroupId), groupData, { merge: true });
      } else {
        const newDocRef = doc(collection(db, 'patient_groups'));
        await setDoc(newDocRef, { ...groupData, createdAt: new Date().toISOString() });
      }

      setGroupNameInput('');
      setGroupCodeInput('');
      setGroupColorInput('blue');
      setGroupClassificationInput('Độ tuổi');
      setEditingGroupId(null);
    } catch (error) {
      console.error("Error saving patient group:", error);
      alert("Đã xảy ra lỗi khi lưu nhóm đối tượng");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhóm đối tượng này? Các bệnh nhân thuộc nhóm này sẽ không còn liên kết.")) return;
    try {
      await deleteDoc(doc(db, 'patient_groups', groupId));
    } catch (error) {
      console.error("Error deleting patient group:", error);
      alert("Đã xảy ra lỗi khi xóa nhóm đối tượng");
    }
  };

  const handleStartEditGroup = (g: { id: string, name: string, code?: string, color: string, classification?: string }) => {
    setEditingGroupId(g.id);
    setGroupNameInput(g.name);
    setGroupCodeInput(g.code || '');
    setGroupColorInput(g.color);
    setGroupClassificationInput(g.classification || 'Độ tuổi');
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setGroupNameInput('');
    setGroupCodeInput('');
    setGroupColorInput('blue');
    setGroupClassificationInput('Độ tuổi');
  };

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

  const handleEditPatient = (patient: Patient) => {
    setIsEditingPatient(true);
    setManualPatient({ ...patient });
    setIsManualModalOpen(true);
  };

  const pinnedIds = userProfile?.pinnedPatientIds || [];
  const workspaceIds = userProfile?.workspacePatientIds || [];

  const handleTogglePin = async (patient: Patient) => {
    if (!userProfile || !userProfile.uid) return;
    try {
      const pinnedPatientIds = userProfile.pinnedPatientIds || [];
      const newPinnedPatientIds = pinnedPatientIds.includes(patient.MA_LK) 
        ? pinnedPatientIds.filter((id: string) => id !== patient.MA_LK)
        : [...pinnedPatientIds, patient.MA_LK];
      
      const targetUid = userProfile.uid;
      await setDoc(doc(db, 'users', targetUid), {
        pinnedPatientIds: newPinnedPatientIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (typeof localStorage !== 'undefined' && localStorage.getItem('staff_login_session')) {
        try {
          const currentStaff = JSON.parse(localStorage.getItem('staff_login_session') || '{}');
          if (currentStaff.uid === targetUid) {
            currentStaff.pinnedPatientIds = newPinnedPatientIds;
            localStorage.setItem('staff_login_session', JSON.stringify(currentStaff));
          }
        } catch (e) {
          console.warn("Could not update staff_login_session", e);
        }
      }
    } catch (error) {
      if (userProfile?.uid) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
      }
    }
  };

  const handleToggleWorkspace = async (patient: Patient) => {
    if (!userProfile || !userProfile.uid) return;
    try {
      const workspacePatientIds = userProfile.workspacePatientIds || [];
      const newWorkspacePatientIds = workspacePatientIds.includes(patient.MA_LK) 
        ? workspacePatientIds.filter((id: string) => id !== patient.MA_LK)
        : [...workspacePatientIds, patient.MA_LK];
      
      const targetUid = userProfile.uid;
      await setDoc(doc(db, 'users', targetUid), {
        workspacePatientIds: newWorkspacePatientIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (typeof localStorage !== 'undefined' && localStorage.getItem('staff_login_session')) {
        try {
          const currentStaff = JSON.parse(localStorage.getItem('staff_login_session') || '{}');
          if (currentStaff.uid === targetUid) {
            currentStaff.workspacePatientIds = newWorkspacePatientIds;
            localStorage.setItem('staff_login_session', JSON.stringify(currentStaff));
          }
        } catch (e) {
          console.warn("Could not update staff_login_session", e);
        }
      }
    } catch (error) {
      if (userProfile?.uid) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
      }
    }
  };

  const filteredPatients = patients.filter(p => {
    // 1. Text search validation
    const matchesSearch = (p.HO_TEN || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                          (p.MA_BN || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                          (p.SO_CCCD || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    if (!matchesSearch) return false;

    // 2. Active Tab Filters
    if (activeFilter === 'all') return true;
    if (activeFilter === 'bhyt') return !!p.MA_THE_BHYT;
    if (activeFilter === 'male') return p.GIOI_TINH === '1';
    if (activeFilter === 'female') return p.GIOI_TINH === '2';

    // 3. Dynamic Patient Group Filters
    return p.MA_DOITUONG_KCB === activeFilter;
  });

  const displayPatients = [...filteredPatients].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.MA_LK);
    const bPinned = pinnedIds.includes(b.MA_LK);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

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
      setIsEditingPatient(false);
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
        NGAY_VAO: new Date().toISOString().split('T')[0],
        MA_DOITUONG_KCB: ''
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
          {hasGroupPower && (
            <button
              onClick={() => {
                setEditingGroupId(null);
                setGroupNameInput('');
                setGroupCodeInput('');
                setGroupColorInput('blue');
                setIsGroupModalOpen(true);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all",
                isDarkMode ? "shadow-none" : "shadow-md shadow-blue-200"
              )}
            >
              <Plus size={14} />
              Quản lý nhóm đối tượng
            </button>
          )}
          {hasManualPower && (
            <button
              onClick={() => {
                setIsEditingPatient(false);
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
                  NGAY_VAO: new Date().toISOString().split('T')[0],
                  MA_DOITUONG_KCB: ''
                });
                setIsManualModalOpen(true);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all",
                isDarkMode ? "shadow-none" : "shadow-md shadow-emerald-200"
              )}
            >
              <Users size={14} />
              Nhập thủ công
            </button>
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
                    { id: 'all', label: 'Tất cả bệnh nhân', count: patients.length, active: activeFilter === 'all' },
                    { id: 'bhyt', label: 'Có BHYT', count: patients.filter(p => !!p.MA_THE_BHYT).length, active: activeFilter === 'bhyt' },
                    { id: 'male', label: 'Bệnh nhân Nam', count: patients.filter(p => p.GIOI_TINH === '1').length, active: activeFilter === 'male' },
                    { id: 'female', label: 'Bệnh nhân Nữ', count: patients.filter(p => p.GIOI_TINH === '2').length, active: activeFilter === 'female' }
                  ].map(filter => (
                    <button 
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
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

              {/* Nhóm đối tượng quản lý widget */}
              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nhóm đối tượng</label>
                  {canManage && (
                    <button 
                      onClick={() => {
                        setEditingGroupId(null);
                        setGroupNameInput('');
                        setGroupCodeInput('');
                        setGroupColorInput('blue');
                        setIsGroupModalOpen(true);
                      }}
                      className="text-[10px] font-black text-blue-500 hover:underline uppercase tracking-wider"
                    >
                      Quản lý
                    </button>
                  )}
                </div>
                {patientGroups.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic px-1">Chưa có nhóm đối tượng</p>
                ) : (
                  <div className="space-y-1">
                    {patientGroups.map(group => {
                      const count = patients.filter(p => p.MA_DOITUONG_KCB === group.id).length;
                      const isActive = activeFilter === group.id;
                      const colorClasses = getBadgeColorClasses(group.color);
                      return (
                        <button 
                          key={group.id}
                          onClick={() => setActiveFilter(isActive ? 'all' : group.id)}
                          className={cn(
                            "w-full px-4 py-2.5 rounded-2xl text-left text-xs font-black transition-all flex items-center justify-between group border",
                            isActive 
                              ? (isDarkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600")
                              : (isDarkMode ? "border-transparent text-slate-500 hover:bg-slate-800/40" : "border-transparent text-slate-500 hover:bg-slate-50")
                          )}
                        >
                          <span className="flex flex-col items-start gap-0.5">
                            <span className="flex items-center gap-2">
                              <span className={cn("w-2-half h-2-half rounded-full", colorClasses.dot)} style={{ width: '8px', height: '8px' }} />
                              <span className="truncate max-w-[140px]">{group.name}</span>
                            </span>
                            {group.classification && (
                              <span className="ml-4 text-[9px] opacity-65 font-black uppercase tracking-wider text-slate-400">
                                {group.classification}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {group.code && (
                              <span className="font-mono text-[9px] font-black uppercase opacity-60 tracking-wider">
                                {group.code}
                              </span>
                            )}
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-black",
                              isActive
                                ? (isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600")
                                : (isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-500")
                            )}>
                              {count}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
                    {canSeeShortcuts && (
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Phím tắt</th>
                    )}
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={canSeeShortcuts ? 6 : 5} className="py-24 text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500 mb-4" />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Đang tải danh sách bệnh nhân...</p>
                      </td>
                    </tr>
                  ) : displayPatients.length === 0 ? (
                    <tr>
                      <td colSpan={canSeeShortcuts ? 6 : 5} className="py-24 text-center">
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
                    displayPatients.map((patient) => (
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
                            {patient.MA_DOITUONG_KCB && (
                              <div className="mt-1 flex items-center">
                                {(() => {
                                  const group = patientGroups.find(g => g.id === patient.MA_DOITUONG_KCB);
                                  const colorClasses = getBadgeColorClasses(group?.color || 'blue');
                                  return (
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider",
                                      colorClasses.bg, colorClasses.text, colorClasses.border
                                    )}>
                                      {group?.name || patient.MA_DOITUONG_KCB}
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
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
                        {canSeeShortcuts && (
                          <td className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Pin To Shortcuts */}
                              <button
                                onClick={() => handleTogglePin(patient)}
                                className={cn(
                                  "p-2 rounded-xl transition-all shadow-sm hover:scale-110 active:scale-95 border",
                                  pinnedIds.includes(patient.MA_LK)
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300" : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600")
                                )}
                                title={pinnedIds.includes(patient.MA_LK) ? "Gỡ khỏi Phím tắt nhanh" : "Ghim vào Phím tắt nhanh"}
                              >
                                <Pin size={14} className={pinnedIds.includes(patient.MA_LK) ? "fill-current" : ""} />
                              </button>

                              {/* Show on Workspace */}
                              <button
                                onClick={() => handleToggleWorkspace(patient)}
                                className={cn(
                                  "p-2 rounded-xl transition-all shadow-sm hover:scale-110 active:scale-95 border",
                                  workspaceIds.includes(patient.MA_LK)
                                    ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                    : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300" : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600")
                                )}
                                title={workspaceIds.includes(patient.MA_LK) ? "Gỡ ghim Workspace" : "Ghim hiển thị ở Workspace"}
                              >
                                <LayoutDashboard size={14} className={workspaceIds.includes(patient.MA_LK) ? "fill-current" : ""} />
                              </button>
                            </div>
                          </td>
                        )}
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
                                onClick={() => handleEditPatient(patient)}
                                className={cn(
                                  "p-2 rounded-2xl transition-all shadow-sm hover:scale-110 active:scale-95",
                                  isDarkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-slate-50 text-amber-600 hover:bg-white hover:shadow-md"
                                )}
                                title="Chỉnh sửa hồ sơ"
                              >
                                <Edit size={18} />
                              </button>
                            )}
                            {hasDeletePower && (
                              <button 
                                onClick={() => handleDeletePatient(patient.MA_LK)}
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
                <h3 className="text-xl font-black tracking-tight">{isEditingPatient ? "Chỉnh sửa thông tin bệnh nhân" : "Nhập thông tin bệnh nhân thủ công"}</h3>
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
                      disabled={isEditingPatient}
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900", isEditingPatient && "opacity-60 cursor-not-allowed")}
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhóm đối tượng</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={manualPatient.MA_DOITUONG_KCB || ''}
                      onChange={(e) => setManualPatient({...manualPatient, MA_DOITUONG_KCB: e.target.value})}
                    >
                      <option value="">-- Chọn nhóm đối tượng --</option>
                      {patientGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} {g.code ? `(${g.code})` : ''}</option>
                      ))}
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

      {/* Patient Group Management Modal */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGroupModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border transition-colors flex flex-col max-h-[90vh]",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
              )}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                    <Users size={20} className="text-blue-500" />
                    Quản lý nhóm đối tượng
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Thêm, sửa, hoặc xóa các nhóm quản lý bệnh nhân</p>
                </div>
                <button onClick={() => setIsGroupModalOpen(false)} className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                )}>
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Form Column */}
                  <div className="md:col-span-5 space-y-4">
                    <form onSubmit={handleSaveGroup} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[9px]">Tên nhóm đối tượng (Bắt buộc)</label>
                        <input 
                          type="text"
                          required
                          placeholder="Ví dụ: BHYT Trái tuyến"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm",
                            isDarkMode ? "bg-slate-800 text-white placeholder:text-slate-600" : "bg-slate-50 text-slate-900 placeholder:text-slate-400"
                          )}
                          value={groupNameInput}
                          onChange={(e) => setGroupNameInput(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[9px]">Mã viết tắt</label>
                        <input 
                          type="text"
                          placeholder="Ví dụ: BHYT_TT"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm",
                            isDarkMode ? "bg-slate-800 text-white placeholder:text-slate-600" : "bg-slate-50 text-slate-900 placeholder:text-slate-400"
                          )}
                          value={groupCodeInput}
                          onChange={(e) => setGroupCodeInput(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[9px] block">Phân loại đối tượng</label>
                        <select
                          required
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl border-none font-bold text-sm focus:ring-2 focus:ring-blue-500",
                            isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
                          )}
                          value={groupClassificationInput}
                          onChange={(e) => setGroupClassificationInput(e.target.value)}
                        >
                          <option value="Độ tuổi">Độ tuổi</option>
                          <option value="Cân nặng">Cân nặng</option>
                          <option value="Bệnh lý">Bệnh lý</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[9px] block">Màu sắc hiển thị</label>
                        <div className="flex flex-wrap gap-2">
                          {['blue', 'emerald', 'amber', 'rose', 'purple', 'sky', 'indigo', 'brown', 'gray', 'pink'].map((color) => {
                            const colorClasses = getBadgeColorClasses(color);
                            const isSelected = groupColorInput === color;
                            return (
                              <button
                                type="button"
                                key={color}
                                onClick={() => setGroupColorInput(color)}
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center transition-all border-2",
                                  isSelected 
                                    ? (isDarkMode ? "border-white scale-110" : "border-slate-900 scale-110") 
                                    : "border-transparent hover:scale-105"
                                )}
                                title={color === 'brown' ? 'Nâu' : color === 'gray' ? 'Xám' : color === 'pink' ? 'Hồng' : color}
                              >
                                <span className={cn("w-5 h-5 rounded-full block", colorClasses.dot)} />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          type="submit"
                          disabled={savingGroup}
                          className={cn(
                            "flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-center text-white transition-all flex items-center justify-center gap-1.5",
                            editingGroupId 
                              ? "bg-amber-600 hover:bg-amber-700" 
                              : "bg-blue-600 hover:bg-blue-700",
                            savingGroup && "opacity-60"
                          )}
                        >
                          {savingGroup ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          {editingGroupId ? "Cập nhật nhóm" : "Thêm nhóm mới"}
                        </button>
                        {editingGroupId && (
                          <button
                            type="button"
                            onClick={handleCancelEditGroup}
                            className={cn(
                              "px-3 py-2.5 rounded-xl text-xs font-bold border transition-all",
                              isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-600"
                            )}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* List Column */}
                  <div className="md:col-span-7 flex flex-col min-h-[250px] border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 md:pl-6 pt-4 md:pt-0">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[9px] block mb-3">Danh sách nhóm hiện có ({patientGroups.length})</label>
                    {patientGroups.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-8 text-center">Chưa có nhóm nào được tạo</p>
                    ) : (
                      <div className="space-y-2 overflow-y-auto max-h-[40vh] pr-1 custom-scrollbar">
                        {patientGroups.map((group) => {
                          const colorClasses = getBadgeColorClasses(group.color);
                          const isBeingEdited = editingGroupId === group.id;
                          return (
                            <div 
                              key={group.id}
                              className={cn(
                                "p-3 rounded-2xl border transition-all flex items-center justify-between",
                                isBeingEdited 
                                  ? (isDarkMode ? "bg-slate-800/60 border-amber-500/30" : "bg-amber-50/50 border-amber-200") 
                                  : (isDarkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50/50 border-slate-100")
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={cn("w-2.5 h-2.5 rounded-full block", colorClasses.dot)} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black">{group.name}</span>
                                    {group.code && (
                                      <span className="font-mono text-[9px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                        {group.code}
                                      </span>
                                    )}
                                  </div>
                                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase", colorClasses.bg, colorClasses.text)}>
                                    {group.classification || "Chưa phân loại"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleStartEditGroup(group)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95",
                                    isDarkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-white border border-slate-100 text-amber-600 hover:bg-slate-100"
                                  )}
                                  title="Sửa nhóm"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95",
                                    isDarkMode ? "bg-slate-800 text-rose-500 hover:bg-rose-500/20" : "bg-white border border-slate-100 text-rose-500 hover:bg-rose-50"
                                  )}
                                  title="Xóa nhóm"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={cn(
                "p-4 border-t shrink-0 flex justify-end",
                isDarkMode ? "border-slate-800 bg-slate-800/30" : "border-slate-100 bg-slate-50"
              )}>
                <button 
                  onClick={() => setIsGroupModalOpen(false)}
                  className={cn(
                    "px-6 py-2 text-white rounded-xl font-bold text-xs transition-all",
                    isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-900 hover:bg-slate-800"
                  )}
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientManagement;
