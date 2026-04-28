import React, { useState, useEffect, useRef } from 'react';
import { Search, FileUp, Users, ChevronRight, X, Loader2, Check, AlertTriangle, Filter, Eye, Trash2, Download, Table, Pill, ClipboardList, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, setDoc, doc, deleteDoc, writeBatch, where, getDocs } from '../firebase';
import { Patient, PatientDrug, PatientSupply, PatientSubclinical } from '../types';
import * as XLSX from 'xlsx';

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

const PatientManagement: React.FC<PatientManagementProps> = ({ isDarkMode, canManage }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<{
    drugs: PatientDrug[];
    supplies: PatientSupply[];
    subclinical: PatientSubclinical[];
  }>({ drugs: [], supplies: [], subclinical: [] });
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

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
      handleFirestoreError(error, OperationType.LIST, 'patients');
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

  const downloadSampleExcel = () => {
    const patients = [
      {
        MA_LK: '20240001', MA_BN: 'BN001', HO_TEN: 'Nguyễn Văn A', SO_CCCD: '001090123456', 
        NGAY_SINH: '1985-05-15', GIOI_TINH: '1', NHOM_MAU: 'A+', MA_DANTOC: '01', 
        MA_NGHE_NGHIEP: '01', DIA_CHI: '123 Đường Lê Lợi, Quận 1, TP.HCM', DIEN_THOAI: '0901234567', 
        MA_THE_BHYT: 'GD4797921500001', MA_DKBD: '79001', GT_THE_TU: '2024-01-01', GT_THE_DEN: '2024-12-31', 
        LY_DO_VV: 'Đau bụng âm ỉ vùng thượng vị', CHAN_DOAN_VAO: 'Viêm loét dạ dày tá tràng', 
        CHAN_DOAN_RV: 'Viêm dạ dày cấp', MA_BENH_CHINH: 'K29.1', MA_BENH_KT: 'K29.5', 
        GIAY_CHUYEN_TUYEN: '', NGAYGIO_VAO: '2024-04-01 08:30:00', NGAYGIO_RA: '2024-04-01 11:45:00', 
        SO_NGAY_DIEU_TRI_3176: '3 giờ 15 phút', PP_DIEU_TRI: 'Nội khoa', CAN_NANG: '65', 
        MA_BAC_SI: 'BS001', TEN_BAC_SI: 'BS. Lê Văn Tám'
      },
      {
        MA_LK: '20240002', MA_BN: 'BN002', HO_TEN: 'Trần Thị B', SO_CCCD: '001095654321', 
        NGAY_SINH: '1992-10-20', GIOI_TINH: '2', NHOM_MAU: 'B-', MA_DANTOC: '01', 
        MA_NGHE_NGHIEP: '02', DIA_CHI: '456 Đường Nguyễn Huệ, Quận 1, TP.HCM', DIEN_THOAI: '0912345678', 
        MA_THE_BHYT: 'DN4797921500002', MA_DKBD: '79002', GT_THE_TU: '2024-01-01', GT_THE_DEN: '2024-12-31', 
        LY_DO_VV: 'Sốt cao, ho kéo dài', CHAN_DOAN_VAO: 'Viêm phế quản cấp', 
        CHAN_DOAN_RV: 'Viêm phế quản', MA_BENH_CHINH: 'J20.9', MA_BENH_KT: '', 
        GIAY_CHUYEN_TUYEN: '', NGAYGIO_VAO: '2024-04-02 09:00:00', NGAYGIO_RA: '2024-04-02 10:30:00', 
        SO_NGAY_DIEU_TRI_3176: '1 giờ 30 phút', PP_DIEU_TRI: 'Nội khoa', CAN_NANG: '52', 
        MA_BAC_SI: 'BS002', TEN_BAC_SI: 'BS. Nguyễn Thị Hoa'
      },
      {
        MA_LK: '20240003', MA_BN: 'BN003', HO_TEN: 'Lê Văn C', SO_CCCD: '001088776655', 
        NGAY_SINH: '1970-01-01', GIOI_TINH: '1', NHOM_MAU: 'O+', MA_DANTOC: '01', 
        MA_NGHE_NGHIEP: '03', DIA_CHI: '789 Đường Cách Mạng Tháng 8, Quận 10, TP.HCM', DIEN_THOAI: '0988776655', 
        MA_THE_BHYT: 'HT4797921500003', MA_DKBD: '79010', GT_THE_TU: '2024-01-01', GT_THE_DEN: '2024-12-31', 
        LY_DO_VV: 'Đau đầu, chóng mặt', CHAN_DOAN_VAO: 'Tăng huyết áp vô căn', 
        CHAN_DOAN_RV: 'Tăng huyết áp', MA_BENH_CHINH: 'I10', MA_BENH_KT: 'E11', 
        GIAY_CHUYEN_TUYEN: '', NGAYGIO_VAO: '2024-04-03 14:00:00', NGAYGIO_RA: '2024-04-03 15:30:00', 
        SO_NGAY_DIEU_TRI_3176: '1 giờ 30 phút', PP_DIEU_TRI: 'Nội khoa', CAN_NANG: '70', 
        MA_BAC_SI: 'BS003', TEN_BAC_SI: 'BS. Phạm Văn Dũng'
      },
      {
        MA_LK: '20240004', MA_BN: 'BN004', HO_TEN: 'Phạm Thị D', SO_CCCD: '001099887766', 
        NGAY_SINH: '2000-12-12', GIOI_TINH: '2', NHOM_MAU: 'AB+', MA_DANTOC: '01', 
        MA_NGHE_NGHIEP: '04', DIA_CHI: '321 Đường Võ Văn Kiệt, Quận 5, TP.HCM', DIEN_THOAI: '0977665544', 
        MA_THE_BHYT: 'TE4797921500004', MA_DKBD: '79005', GT_THE_TU: '2024-01-01', GT_THE_DEN: '2024-12-31', 
        LY_DO_VV: 'Đau họng, nuốt vướng', CHAN_DOAN_VAO: 'Viêm Amidan cấp', 
        CHAN_DOAN_RV: 'Viêm Amidan', MA_BENH_CHINH: 'J03.9', MA_BENH_KT: '', 
        GIAY_CHUYEN_TUYEN: '', NGAYGIO_VAO: '2024-04-04 10:00:00', NGAYGIO_RA: '2024-04-04 11:00:00', 
        SO_NGAY_DIEU_TRI_3176: '1 giờ', PP_DIEU_TRI: 'Nội khoa', CAN_NANG: '48', 
        MA_BAC_SI: 'BS004', TEN_BAC_SI: 'BS. Đỗ Thị Lan'
      }
    ];

    const drugs = [
      { MA_LK: '20240001', TEN_THUOC: 'Paracetamol 500mg', HOAT_CHAT: 'Paracetamol', DON_VI_TINH: 'Viên', HAM_LUONG: '500mg', LIEU_DUNG: 'Ngày 2 lần, mỗi lần 1 viên', CACH_DUNG: 'Uống sau ăn', SO_LUONG: '10', MA_BAC_SI: 'BS001', TEN_BAC_SI: 'BS. Lê Văn Tám', NGAYGIO_YL: '2024-04-01 09:00:00' },
      { MA_LK: '20240001', TEN_THUOC: 'Omeprazol 20mg', HOAT_CHAT: 'Omeprazol', DON_VI_TINH: 'Viên', HAM_LUONG: '20mg', LIEU_DUNG: 'Ngày 1 lần, mỗi lần 1 viên', CACH_DUNG: 'Uống trước ăn sáng 30p', SO_LUONG: '14', MA_BAC_SI: 'BS001', TEN_BAC_SI: 'BS. Lê Văn Tám', NGAYGIO_YL: '2024-04-01 09:00:00' },
      { MA_LK: '20240002', TEN_THUOC: 'Amoxicillin 500mg', HOAT_CHAT: 'Amoxicillin', DON_VI_TINH: 'Viên', HAM_LUONG: '500mg', LIEU_DUNG: 'Ngày 3 lần, mỗi lần 1 viên', CACH_DUNG: 'Uống sau ăn', SO_LUONG: '21', MA_BAC_SI: 'BS002', TEN_BAC_SI: 'BS. Nguyễn Thị Hoa', NGAYGIO_YL: '2024-04-02 09:30:00' },
      { MA_LK: '20240003', TEN_THUOC: 'Amlodipin 5mg', HOAT_CHAT: 'Amlodipin', DON_VI_TINH: 'Viên', HAM_LUONG: '5mg', LIEU_DUNG: 'Ngày 1 lần, mỗi lần 1 viên', CACH_DUNG: 'Uống sáng', SO_LUONG: '30', MA_BAC_SI: 'BS003', TEN_BAC_SI: 'BS. Phạm Văn Dũng', NGAYGIO_YL: '2024-04-03 14:30:00' }
    ];

    const supplies = [
      { MA_LK: '20240001', TEN_VAT_TU: 'Bông gòn y tế', DON_VI_TINH: 'Gói', SO_LUONG: '1', DON_GIA: '5000', THANH_TIEN: '5000' },
      { MA_LK: '20240002', TEN_VAT_TU: 'Khẩu trang y tế', DON_VI_TINH: 'Cái', SO_LUONG: '2', DON_GIA: '2000', THANH_TIEN: '4000' },
      { MA_LK: '20240003', TEN_VAT_TU: 'Kim tiêm G25', DON_VI_TINH: 'Cái', SO_LUONG: '1', DON_GIA: '3000', THANH_TIEN: '3000' },
      { MA_LK: '20240004', TEN_VAT_TU: 'Gạc tiệt trùng', DON_VI_TINH: 'Miếng', SO_LUONG: '5', DON_GIA: '1000', THANH_TIEN: '5000' }
    ];

    const subclinical = [
      { MA_LK: '20240001', TEN_CHI_SO: 'Huyết áp', GIA_TRI: '120/80', DON_VI: 'mmHg', KET_LUAN: 'Bình thường' },
      { MA_LK: '20240002', TEN_CHI_SO: 'Nhiệt độ', GIA_TRI: '38.5', DON_VI: 'độ C', KET_LUAN: 'Sốt nhẹ' },
      { MA_LK: '20240003', TEN_CHI_SO: 'Glucose máu', GIA_TRI: '6.5', DON_VI: 'mmol/L', KET_LUAN: 'Hơi cao' },
      { MA_LK: '20240004', TEN_CHI_SO: 'Nhịp tim', GIA_TRI: '80', DON_VI: 'lần/phút', KET_LUAN: 'Bình thường' }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patients), "Patients");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(drugs), "Drugs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplies), "Supplies");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subclinical), "Subclinical");
    XLSX.writeFile(wb, "Mau_Du_Lieu_Benh_Nhan.xlsx");
  };

  const parseExcel = (file: File, sheetName?: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const targetSheetName = sheetName || workbook.SheetNames[0];
        const sheet = workbook.Sheets[targetSheetName];
        if (!sheet) {
          resolve([]);
          return;
        }
        const json = XLSX.utils.sheet_to_json(sheet);
        resolve(json);
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Vui lòng chọn file Excel dữ liệu tổng hợp");
      return;
    }

    setImporting(true);
    setImportProgress('Đang xử lý dữ liệu...');

    try {
      const batchSize = 500;
      
      const reader = new FileReader();
      const workbook = await new Promise<XLSX.WorkBook>((resolve) => {
        reader.onload = (e) => resolve(XLSX.read(e.target?.result, { type: 'binary' }));
        reader.readAsBinaryString(importFile);
      });

      const hasSheet = (name: string) => workbook.SheetNames.some(s => (s || '').toLowerCase() === (name || '').toLowerCase());
      const getSheetData = (possibleNames: string[]) => {
        const name = workbook.SheetNames.find(s => possibleNames.includes((s || '').toLowerCase()));
        return name ? XLSX.utils.sheet_to_json(workbook.Sheets[name]) : [];
      };

      // 1. Process Patients (First sheet or 'Patients' or 'BenhNhan')
      setImportProgress('Đang tải thông tin bệnh nhân...');
      const patientData = getSheetData(['patients', 'benhnhan', (workbook.SheetNames[0] || '').toLowerCase()]);
      let batch = writeBatch(db);
      let count = 0;
      for (const item of patientData as any[]) {
        if (!item.MA_LK) continue;
        const docRef = doc(db, 'patients', String(item.MA_LK));
        batch.set(docRef, {
          ...item,
          MA_LK: String(item.MA_LK),
          MA_BN: String(item.MA_BN || ''),
          HO_TEN: String(item.HO_TEN || ''),
          updatedAt: new Date().toISOString()
        });
        count++;
        if (count % batchSize === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      await batch.commit();

      // 2. Process Drugs
      setImportProgress('Đang tải thông tin thuốc...');
      const drugData = getSheetData(['drugs', 'thuoc']);
      if (drugData.length > 0) {
        batch = writeBatch(db);
        count = 0;
        for (const item of drugData as any[]) {
          if (!item.MA_LK) continue;
          const docRef = doc(collection(db, 'patient_drugs'));
          batch.set(docRef, {
            ...item,
            MA_LK: String(item.MA_LK)
          });
          count++;
          if (count % batchSize === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
        await batch.commit();
      }

      // 3. Process Supplies
      setImportProgress('Đang tải thông tin vật tư...');
      const supplyData = getSheetData(['supplies', 'vattu']);
      if (supplyData.length > 0) {
        batch = writeBatch(db);
        count = 0;
        for (const item of supplyData as any[]) {
          if (!item.MA_LK) continue;
          const docRef = doc(collection(db, 'patient_supplies'));
          batch.set(docRef, {
            ...item,
            MA_LK: String(item.MA_LK)
          });
          count++;
          if (count % batchSize === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
        await batch.commit();
      }

      // 4. Process Subclinical
      setImportProgress('Đang tải thông tin cận lâm sàng...');
      const subclinicalData = getSheetData(['subclinical', 'canlamsang']);
      if (subclinicalData.length > 0) {
        batch = writeBatch(db);
        count = 0;
        for (const item of subclinicalData as any[]) {
          if (!item.MA_LK) continue;
          const docRef = doc(collection(db, 'patient_subclinical'));
          batch.set(docRef, {
            ...item,
            MA_LK: String(item.MA_LK)
          });
          count++;
          if (count % batchSize === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
        await batch.commit();
      }

      setImportProgress('Hoàn tất!');
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImporting(false);
        setImportFile(null);
      }, 1500);

    } catch (error) {
      console.error("Import error:", error);
      alert("Lỗi khi import dữ liệu. Vui lòng kiểm tra lại định dạng file.");
      setImporting(false);
    }
  };

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
    <div className="p-1 lg:p-4 max-w-7xl mx-auto space-y-2 lg:space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="hidden lg:block">
          <h2 className={cn("text-xl lg:text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
            Tra cứu bệnh nhân
          </h2>
          <p className={cn("text-xs font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>
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
                  "flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all",
                  isDarkMode ? "shadow-none" : "shadow-md shadow-emerald-200"
                )}
              >
                <Users size={14} />
                Nhập thủ công
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all",
                  isDarkMode ? "shadow-none" : "shadow-md shadow-blue-200"
                )}
              >
                <FileUp size={14} />
                Import Excel
              </button>
            </>
          )}
        </div>
      </div>

      <div className={cn(
        "p-3 rounded-2xl border transition-all",
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-md shadow-slate-200/40"
      )}>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, mã BN hoặc CCCD..."
            className={cn(
              "w-full pl-10 pr-3 py-2.5 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm",
              isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                <th className="px-3 py-1.5">Mã BN</th>
                <th className="px-3 py-1.5">Họ và tên</th>
                <th className="px-3 py-1.5">Ngày sinh</th>
                <th className="px-3 py-1.5">Giới tính</th>
                <th className="px-3 py-1.5">CCCD</th>
                <th className="px-3 py-1.5">Ngày vào</th>
                <th className="px-3 py-1.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-1" />
                    <p className="text-xs text-slate-500 font-medium">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2",
                      isDarkMode ? "bg-slate-800" : "bg-slate-100"
                    )}>
                      <Users size={24} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Không tìm thấy bệnh nhân nào.</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr 
                    key={patient.MA_LK}
                    className={cn(
                      "group transition-all",
                      isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                    )}
                  >
                    <td className="px-3 py-2 first:rounded-l-xl last:rounded-r-xl">
                      <span className="font-mono text-[10px] font-bold text-blue-500">{patient.MA_BN}</span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-bold text-sm">{patient.HO_TEN}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{patient.NGAY_SINH}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{patient.GIOI_TINH === '1' ? 'Nam' : 'Nữ'}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{patient.SO_CCCD}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{patient.NGAY_VAO}</td>
                    <td className="px-3 py-2 text-right first:rounded-l-xl last:rounded-r-xl">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenDetails(patient)}
                          className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        {canManage && (
                          <button 
                            onClick={() => handleDeletePatient(patient.MA_LK)}
                            className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
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

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !importing && setIsImportModalOpen(false)}
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
              <div className={cn(
                "p-6 border-b flex items-center justify-between",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <h3 className="text-xl font-black tracking-tight">Import dữ liệu bệnh nhân</h3>
                <button onClick={() => !importing && setIsImportModalOpen(false)} className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                )}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Tải lên dữ liệu Excel</h3>
                    <p className="text-xs text-slate-500">Hệ thống hỗ trợ import từ file Excel (.xlsx, .xls)</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setImportFile(null)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                        isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      Xóa file
                    </button>
                    <button 
                      onClick={downloadSampleExcel}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                        isDarkMode ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      )}
                    >
                      <Download size={14} />
                      Tải file mẫu (4 ví dụ)
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">File Excel dữ liệu (Chứa 4 Tab)</label>
                    <div className={cn(
                      "relative border-2 border-dashed rounded-[24px] p-12 transition-all flex flex-col items-center justify-center gap-4",
                      importFile 
                        ? "border-emerald-500 bg-emerald-500/5" 
                        : (isDarkMode ? "border-slate-700 hover:border-blue-500 bg-slate-800/50" : "border-slate-200 hover:border-blue-500 bg-slate-50/50")
                    )}>
                      <div className={cn(
                        "p-4 rounded-2xl",
                        importFile ? "bg-emerald-500/20 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        <Table size={40} />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-bold">
                          {importFile ? importFile.name : "Kéo thả hoặc nhấn để chọn file Excel"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {importFile ? "Sẵn sàng để import" : "File mẫu có sẵn 4 tab: Patients, Drugs, Supplies, Subclinical"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        disabled={importing}
                      />
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-2xl flex items-start gap-3 transition-colors",
                  isDarkMode ? "bg-blue-900/20" : "bg-blue-50"
                )}>
                  <AlertTriangle className="text-blue-500 shrink-0" size={20} />
                  <p className={cn("text-xs leading-relaxed font-medium transition-colors", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                    Vui lòng đảm bảo các file Excel có cấu trúc cột đúng như quy định. File 1 là bắt buộc để liên kết dữ liệu.
                  </p>
                </div>

                {importing && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{importProgress}</span>
                      <Loader2 className="animate-spin" size={16} />
                    </div>
                    <div className={cn(
                      "h-2 rounded-full overflow-hidden transition-colors",
                      isDarkMode ? "bg-slate-800" : "bg-slate-100"
                    )}>
                      <motion.div 
                        className="h-full bg-blue-600"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 10 }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={importing || !importFile}
                  className={cn(
                    "w-full py-4 bg-blue-600 text-white rounded-2xl font-bold transition-all disabled:bg-slate-300 flex items-center justify-center gap-2",
                    isDarkMode ? "shadow-none disabled:bg-slate-800" : "shadow-lg shadow-blue-200"
                  )}
                >
                  {importing ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                  {importing ? "Đang xử lý..." : "Bắt đầu Import"}
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
