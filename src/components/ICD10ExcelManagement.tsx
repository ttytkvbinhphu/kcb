import React, { useState, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  AlertTriangle,
  Columns,
  Maximize2,
  Minimize2,
  Copy,
  CheckCircle2,
  Star,
  Pill,
  BookOpen,
  LayoutGrid,
  ShieldAlert,
  Info,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ICD10, Drug, UserProfile } from "../types";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface ICD10ExcelManagementProps {
  icdList: ICD10[];
  drugList?: Drug[];
  isDarkMode: boolean;
  canManage: boolean;
  userRole?: string;
  userProfile?: UserProfile;
  featureSettings?: any;
  onAddIcd: () => void;
  onEditIcd: (icd: ICD10) => void;
  onViewIcdDetail: (icd: ICD10) => void;
  onDeleteIcd: (code: string) => void;
  onBatchDelete?: (codes: string[]) => Promise<void>;
  onBatchToggleAppendixA2?: (icds: ICD10[], status: boolean) => Promise<void>;
  onBatchToggleTT26?: (icds: ICD10[], status: boolean) => Promise<void>;
  onBatchTogglePin?: (codes: string[], isPin: boolean) => Promise<void>;
  onBatchImport?: (importedIcds: Partial<ICD10>[]) => Promise<void>;
  onOpenBatchUpdateDesc?: () => void;
  onSelectDrug?: (drug: Drug) => void;
  onSwitchToCardView?: () => void;
  initialSearchTerm?: string | null;
  onClearInitialSearch?: () => void;
}

type SortField =
  | "code"
  | "description"
  | "chapterName"
  | "isAppendixA2"
  | "isTT26"
  | "isRestricted"
  | "guide"
  | "status";

type SortOrder = "asc" | "desc";
type Density = "compact" | "medium" | "comfortable";

interface ColumnDef {
  id: string;
  label: string;
  excelCol: string;
  width?: string;
  visible: boolean;
  sortable?: boolean;
}

export const ICD10ExcelManagement: React.FC<ICD10ExcelManagementProps> = ({
  icdList,
  drugList = [],
  isDarkMode,
  canManage,
  userRole,
  userProfile,
  featureSettings,
  onAddIcd,
  onEditIcd,
  onViewIcdDetail,
  onDeleteIcd,
  onBatchDelete,
  onBatchToggleAppendixA2,
  onBatchToggleTT26,
  onBatchTogglePin,
  onBatchImport,
  onOpenBatchUpdateDesc,
  onSelectDrug,
  onSwitchToCardView,
  initialSearchTerm,
  onClearInitialSearch,
}) => {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "");
  const [selectedChapter, setSelectedChapter] = useState<string>("all");
  const [selectedAppendix, setSelectedAppendix] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedGuide, setSelectedGuide] = useState<string>("all");
  const [selectedSuggestions, setSelectedSuggestions] = useState<string>("all");
  const [selectedFavorite, setSelectedFavorite] = useState<string>("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Selection
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [jumpPageInput, setJumpPageInput] = useState("");

  // Density & View Options
  const [density, setDensity] = useState<Density>("compact");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Import / Export states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Batch delete confirm
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // Columns definition with Excel Letters
  const [columns, setColumns] = useState<ColumnDef[]>([
    { id: "stt", label: "STT", excelCol: "A", width: "w-12", visible: true, sortable: false },
    { id: "code", label: "Mã ICD-10", excelCol: "B", width: "w-28", visible: true, sortable: true },
    { id: "description", label: "Tên bệnh / Chẩn đoán", excelCol: "C", width: "min-w-[240px]", visible: true, sortable: true },
    { id: "oldName", label: "Tên cũ", excelCol: "D", width: "min-w-[160px]", visible: false, sortable: false },
    { id: "chapter", label: "Chương / Khối", excelCol: "E", width: "min-w-[170px]", visible: true, sortable: true },
    { id: "appendix", label: "Phụ lục & Quy định", excelCol: "F", width: "min-w-[170px]", visible: true, sortable: true },
    { id: "guide", label: "Hướng dẫn WHO", excelCol: "G", width: "min-w-[220px]", visible: true, sortable: true },
    { id: "drugs", label: "Thuốc gợi ý", excelCol: "H", width: "w-28", visible: true, sortable: false },
    { id: "notes", label: "Ghi chú", excelCol: "I", width: "min-w-[140px]", visible: true, sortable: false },
    { id: "status", label: "Trạng thái", excelCol: "J", width: "w-28", visible: true, sortable: true },
    { id: "actions", label: "Thao tác", excelCol: "K", width: "w-32", visible: true, sortable: false },
  ]);

  const toggleColumnVisibility = (colId: string) => {
    if (colId === "actions") return; // Thao tác luôn cố định
    setColumns((prev) =>
      prev.map((col) => (col.id === colId ? { ...col, visible: !col.visible } : col))
    );
  };

  // Pinned codes set from user profile
  const pinnedCodesSet = useMemo(() => {
    return new Set<string>(userProfile?.pinnedIcdCodes || []);
  }, [userProfile?.pinnedIcdCodes]);

  // Drug map by ICD code for quick lookup of suggestion counts
  const drugCountByIcd = useMemo(() => {
    const map = new Map<string, number>();
    drugList.forEach((drug) => {
      const countedForDrug = new Set<string>();
      (drug.indications || []).forEach((ind) => {
        (ind.icd10s || []).forEach((codeItem) => {
          if (codeItem && typeof codeItem === 'string') {
            const cleanCode = codeItem.split(' - ')[0]?.trim().toUpperCase();
            if (cleanCode && !countedForDrug.has(cleanCode)) {
              countedForDrug.add(cleanCode);
              map.set(cleanCode, (map.get(cleanCode) || 0) + 1);
            }
          }
        });
      });
      const legacyCodes = (drug as any).icdCodes;
      if (Array.isArray(legacyCodes)) {
        legacyCodes.forEach((codeItem: string) => {
          if (codeItem && typeof codeItem === 'string') {
            const cleanCode = codeItem.split(' - ')[0]?.trim().toUpperCase();
            if (cleanCode && !countedForDrug.has(cleanCode)) {
              countedForDrug.add(cleanCode);
              map.set(cleanCode, (map.get(cleanCode) || 0) + 1);
            }
          }
        });
      }
    });
    return map;
  }, [drugList]);

  // Distinct chapter list for filter dropdown
  const distinctChapters = useMemo(() => {
    const chapters = new Set<string>();
    icdList.forEach((icd) => {
      if (icd.chapterName) {
        chapters.add(icd.chapterName);
      }
    });
    return Array.from(chapters).sort();
  }, [icdList]);

  // Filtering ICD-10 items
  const filteredList = useMemo(() => {
    let result = icdList.filter((item) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const codeMatch = item.code.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const oldNameMatch = item.oldName?.toLowerCase().includes(query);
        const guideMatch = item.guide?.toLowerCase().includes(query);
        const notesMatch = item.notes?.toLowerCase().includes(query);
        const chapterMatch = item.chapterName?.toLowerCase().includes(query);
        const blockMatch = item.blockName?.toLowerCase().includes(query);

        if (
          !codeMatch &&
          !descMatch &&
          !oldNameMatch &&
          !guideMatch &&
          !notesMatch &&
          !chapterMatch &&
          !blockMatch
        ) {
          return false;
        }
      }

      // Chapter filter
      if (selectedChapter !== "all") {
        if (selectedChapter === "A-B") {
          const first = item.code.charAt(0).toUpperCase();
          if (first !== "A" && first !== "B") return false;
        } else if (selectedChapter === "C-D") {
          const first = item.code.charAt(0).toUpperCase();
          if (first !== "C" && first !== "D") return false;
        } else if (selectedChapter === "E-H") {
          const first = item.code.charAt(0).toUpperCase();
          if (!["E", "F", "G", "H"].includes(first)) return false;
        } else if (selectedChapter === "I-K") {
          const first = item.code.charAt(0).toUpperCase();
          if (!["I", "J", "K"].includes(first)) return false;
        } else if (selectedChapter === "L-N") {
          const first = item.code.charAt(0).toUpperCase();
          if (!["L", "M", "N"].includes(first)) return false;
        } else if (selectedChapter === "O-Q") {
          const first = item.code.charAt(0).toUpperCase();
          if (!["O", "P", "Q"].includes(first)) return false;
        } else if (selectedChapter === "R-S") {
          const first = item.code.charAt(0).toUpperCase();
          if (!["R", "S", "T"].includes(first)) return false;
        } else if (selectedChapter === "U-Z") {
          const first = item.code.charAt(0).toUpperCase();
          if (!["U", "V", "W", "X", "Y", "Z"].includes(first)) return false;
        } else if (item.chapterName !== selectedChapter) {
          return false;
        }
      }

      // Appendix filter
      if (selectedAppendix !== "all") {
        if (selectedAppendix === "appendix_a2" && !item.isAppendixA2) return false;
        if (selectedAppendix === "tt26" && !item.isTT26) return false;
        if (selectedAppendix === "restricted" && !item.isRestricted) return false;
        if (
          selectedAppendix === "appendix_other" &&
          !item.isAppendixA3 &&
          !item.isAppendixA4 &&
          !item.isAppendixA5 &&
          !item.isAppendixA6
        )
          return false;
        if (
          selectedAppendix === "normal" &&
          (item.isAppendixA2 || item.isTT26 || item.isRestricted)
        )
          return false;
      }

      // Status filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "expired" && !item.isExpired) return false;
        if (selectedStatus === "new" && !item.isNew) return false;
        if (selectedStatus === "renamed" && !item.oldName) return false;
        if (selectedStatus === "valid" && (item.isExpired || item.isNew || item.oldName))
          return false;
      }

      // Guide filter
      if (selectedGuide === "has_guide" && !item.guide?.trim()) return false;
      if (selectedGuide === "no_guide" && item.guide?.trim()) return false;

      // Suggestions filter
      if (selectedSuggestions !== "all") {
        const drugCount = drugCountByIcd.get(item.code.toUpperCase()) || 0;
        const hasCommonDrugs = (item.commonDrugs && item.commonDrugs.length > 0) || drugCount > 0;
        if (selectedSuggestions === "has_suggestions" && !hasCommonDrugs) return false;
        if (selectedSuggestions === "no_suggestions" && hasCommonDrugs) return false;
      }

      // Favorite filter
      if (selectedFavorite === "favorite") {
        const isFav = pinnedCodesSet.has(item.code) || item.isPinned;
        if (!isFav) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case "code":
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case "description":
          valA = (a.description || "").toLowerCase();
          valB = (b.description || "").toLowerCase();
          break;
        case "chapterName":
          valA = (a.chapterName || a.code).toLowerCase();
          valB = (b.chapterName || b.code).toLowerCase();
          break;
        case "isAppendixA2":
          valA = a.isAppendixA2 ? 1 : 0;
          valB = b.isAppendixA2 ? 1 : 0;
          break;
        case "isTT26":
          valA = a.isTT26 ? 1 : 0;
          valB = b.isTT26 ? 1 : 0;
          break;
        case "isRestricted":
          valA = a.isRestricted ? 1 : 0;
          valB = b.isRestricted ? 1 : 0;
          break;
        case "guide":
          valA = a.guide ? 1 : 0;
          valB = b.guide ? 1 : 0;
          break;
        case "status":
          valA = a.isExpired ? 2 : a.isNew ? 1 : 0;
          valB = b.isExpired ? 2 : b.isNew ? 1 : 0;
          break;
        default:
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    icdList,
    searchTerm,
    selectedChapter,
    selectedAppendix,
    selectedStatus,
    selectedGuide,
    selectedSuggestions,
    selectedFavorite,
    sortField,
    sortOrder,
    pinnedCodesSet,
    drugCountByIcd,
  ]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Adjust page if out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedCodes.size > 0 && selectedCodes.size === paginatedList.length) {
      setSelectedCodes(new Set());
    } else {
      const newSet = new Set<string>();
      paginatedList.forEach((item) => newSet.add(item.code));
      setSelectedCodes(newSet);
    }
  };

  const handleToggleSelectRow = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Copy code to clipboard
  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const itemsToExport =
      selectedCodes.size > 0
        ? icdList.filter((item) => selectedCodes.has(item.code))
        : filteredList;

    if (itemsToExport.length === 0) {
      alert("Không có dữ liệu để xuất file Excel!");
      return;
    }

    const dataToExport = itemsToExport.map((item, index) => {
      const drugCount = drugCountByIcd.get(item.code.toUpperCase()) || 0;
      return {
        STT: index + 1,
        "Mã ICD-10": item.code,
        "Mã nhóm": item.groupCode || (item.code.includes('.') ? item.code.split('.')[0] : (item.code.length >= 3 ? item.code.slice(0, 3) : item.code)),
        "Tên bệnh / Chẩn đoán": item.description,
        "Tên cũ (nếu có)": item.oldName || "",
        "Chương bệnh": item.chapterName || "",
        "Khối bệnh": item.blockName || "",
        "Phụ lục A2": item.isAppendixA2 ? "Có" : "Không",
        "Thông tư 26 (TT26)": item.isTT26 ? "Có" : "Không",
        "Giới hạn tuyến": item.isRestricted ? "Có" : "Không",
        "Phụ lục khác": [
          item.isAppendixA3 && "PL A3",
          item.isAppendixA4 && "PL A4",
          item.isAppendixA5 && "PL A5",
          item.isAppendixA6 && "PL A6",
        ]
          .filter(Boolean)
          .join(", "),
        "Hướng dẫn WHO": item.guide || "",
        "Số thuốc gợi ý": drugCount || (item.commonDrugs?.length ?? 0),
        "Ghi chú": item.notes || "",
        "Trạng thái": item.isExpired
          ? "Hết hiệu lực"
          : item.isNew
          ? "Mã mới bổ sung"
          : item.oldName
          ? "Đã đổi tên"
          : "Đang áp dụng",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto-fit column widths
    const colWidths = Object.keys(dataToExport[0] || {}).map((key) => {
      let maxLen = key.length;
      dataToExport.forEach((row: any) => {
        const cellVal = String(row[key] || "");
        if (cellVal.length > maxLen) maxLen = cellVal.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 55) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ICD10_Directory");

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    XLSX.writeFile(workbook, `ICD10_DanhMuc_Benh_${dateStr}.xlsx`);
  };

  // Import from Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          alert("File Excel trống hoặc không đúng cấu trúc!");
          return;
        }

        setImportPreviewData(json);
        setIsImportModalOpen(true);
      } catch (err) {
        console.error("Lỗi đọc file Excel:", err);
        alert("Có lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file!");
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!onBatchImport || importPreviewData.length === 0) return;
    setIsImporting(true);
    try {
      const parsedIcds: Partial<ICD10>[] = importPreviewData.map((row: any) => {
        const code =
          row["Mã ICD-10"] ||
          row["Mã ICD"] ||
          row["Mã bệnh"] ||
          row["code"] ||
          row["Code"] ||
          "";
        const groupCode =
          row["Mã nhóm"] ||
          row["Mã nhóm ICD-10"] ||
          row["Mã ICD-10 nhóm"] ||
          row["groupCode"] ||
          "";
        const description =
          row["Tên bệnh / Chẩn đoán"] ||
          row["Tên bệnh"] ||
          row["Mô tả bệnh"] ||
          row["Mô tả"] ||
          row["description"] ||
          "";
        const oldName = row["Tên cũ (nếu có)"] || row["Tên cũ"] || row["oldName"] || "";
        const chapterName = row["Chương bệnh"] || row["Chương"] || row["chapterName"] || "";
        const blockName = row["Khối bệnh"] || row["Khối"] || row["blockName"] || "";
        const guide = row["Hướng dẫn WHO"] || row["Hướng dẫn"] || row["guide"] || "";
        const notes = row["Ghi chú"] || row["notes"] || "";

        const a2Val = String(row["Phụ lục A2"] || row["isAppendixA2"] || "").toLowerCase();
        const tt26Val = String(row["Thông tư 26 (TT26)"] || row["TT26"] || row["isTT26"] || "").toLowerCase();
        const restrictedVal = String(row["Giới hạn tuyến"] || row["isRestricted"] || "").toLowerCase();

        const isAppendixA2 = a2Val === "có" || a2Val === "true" || a2Val === "1" || a2Val === "yes";
        const isTT26 = tt26Val === "có" || tt26Val === "true" || tt26Val === "1" || tt26Val === "yes";
        const isRestricted =
          restrictedVal === "có" || restrictedVal === "true" || restrictedVal === "1" || restrictedVal === "yes";

        const cleanCode = String(code).trim().toUpperCase();
        const autoGroup = cleanCode.includes('.')
          ? cleanCode.split('.')[0]
          : (cleanCode.length >= 3 ? cleanCode.slice(0, 3) : cleanCode);
        const finalGroup = groupCode ? String(groupCode).trim().toUpperCase() : autoGroup;

        return {
          code: cleanCode,
          groupCode: finalGroup || undefined,
          description: String(description).trim(),
          oldName: oldName ? String(oldName).trim() : undefined,
          chapterName: chapterName ? String(chapterName).trim() : undefined,
          blockName: blockName ? String(blockName).trim() : undefined,
          guide: guide ? String(guide).trim() : undefined,
          notes: notes ? String(notes).trim() : undefined,
          isAppendixA2,
          isTT26,
          isRestricted,
        };
      });

      const validIcds = parsedIcds.filter((i) => i.code && i.description);
      if (validIcds.length === 0) {
        alert("Không tìm thấy dòng dữ liệu hợp lệ (yêu cầu cột 'Mã ICD-10' và 'Tên bệnh')!");
        return;
      }

      await onBatchImport(validIcds);
      setIsImportModalOpen(false);
      setImportPreviewData([]);
      alert(`Đã nhập thành công ${validIcds.length} mã bệnh ICD-10!`);
    } catch (err) {
      console.error("Lỗi nhập dữ liệu:", err);
      alert("Đã xảy ra lỗi trong quá trình nhập dữ liệu!");
    } finally {
      setIsImporting(false);
    }
  };

  // Batch delete handler
  const handleExecuteBatchDelete = async () => {
    if (!onBatchDelete || selectedCodes.size === 0) return;
    setIsBatchProcessing(true);
    try {
      await onBatchDelete(Array.from(selectedCodes));
      setSelectedCodes(new Set());
      setShowBatchDeleteConfirm(false);
    } catch (err) {
      console.error("Lỗi xóa hàng loạt:", err);
      alert("Lỗi khi xóa các mã bệnh đã chọn!");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch toggle Appendix A2
  const handleExecuteBatchToggleA2 = async (status: boolean) => {
    if (!onBatchToggleAppendixA2 || selectedCodes.size === 0) return;
    setIsBatchProcessing(true);
    try {
      const targetIcds = icdList.filter((i) => selectedCodes.has(i.code));
      await onBatchToggleAppendixA2(targetIcds, status);
      setSelectedCodes(new Set());
    } catch (err) {
      console.error("Lỗi cập nhật Phụ lục A2:", err);
      alert("Lỗi khi cập nhật trạng thái Phụ lục A2!");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch toggle TT26
  const handleExecuteBatchToggleTT26 = async (status: boolean) => {
    if (!onBatchToggleTT26 || selectedCodes.size === 0) return;
    setIsBatchProcessing(true);
    try {
      const targetIcds = icdList.filter((i) => selectedCodes.has(i.code));
      await onBatchToggleTT26(targetIcds, status);
      setSelectedCodes(new Set());
    } catch (err) {
      console.error("Lỗi cập nhật TT26:", err);
      alert("Lỗi khi cập nhật trạng thái Thông tư 26!");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch toggle Pin
  const handleExecuteBatchTogglePin = async (isPin: boolean) => {
    if (!onBatchTogglePin || selectedCodes.size === 0) return;
    setIsBatchProcessing(true);
    try {
      await onBatchTogglePin(Array.from(selectedCodes), isPin);
      setSelectedCodes(new Set());
    } catch (err) {
      console.error("Lỗi ghim mã bệnh:", err);
      alert("Lỗi khi cập nhật ghim danh sách mã bệnh!");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Row height by density
  const rowHeightClass = {
    compact: "py-1.5 px-2 text-xs",
    medium: "py-2.5 px-3 text-xs sm:text-sm",
    comfortable: "py-3.5 px-3.5 text-sm",
  }[density];

  // Stats calculation
  const stats = useMemo(() => {
    const total = icdList.length;
    const a2 = icdList.filter((i) => i.isAppendixA2).length;
    const tt26 = icdList.filter((i) => i.isTT26).length;
    const restricted = icdList.filter((i) => i.isRestricted).length;
    const hasGuide = icdList.filter((i) => i.guide?.trim()).length;
    const hasSuggestions = icdList.filter(
      (i) => (i.commonDrugs && i.commonDrugs.length > 0) || (drugCountByIcd.get(i.code.toUpperCase()) || 0) > 0
    ).length;
    const expired = icdList.filter((i) => i.isExpired).length;
    const newCount = icdList.filter((i) => i.isNew).length;

    return {
      total,
      a2,
      tt26,
      restricted,
      hasGuide,
      hasSuggestions,
      expired,
      newCount,
      active: total - expired,
    };
  }, [icdList, drugCountByIcd]);

  // Jump to page handler
  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpPageInput("");
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedChapter("all");
    setSelectedAppendix("all");
    setSelectedStatus("all");
    setSelectedGuide("all");
    setSelectedSuggestions("all");
    setSelectedFavorite("all");
    setCurrentPage(1);
    if (onClearInitialSearch) onClearInitialSearch();
  };

  return (
    <div
      className={cn(
        "w-full flex flex-col transition-all duration-200 overflow-hidden font-sans",
        isFullScreen ? "fixed inset-0 z-50 p-3 sm:p-5 backdrop-blur-md overflow-y-auto" : "space-y-3",
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50/70 text-slate-900"
      )}
    >
      {/* 1. EXCEL RIBBON & BRAND HEADER */}
      <div
        className={cn(
          "w-full rounded-2xl border shadow-xs transition-all p-3 sm:p-4 space-y-3",
          isDarkMode
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white border-slate-200 shadow-slate-200/50"
        )}
      >
        {/* Top title & primary Excel tools */}
        <div
          className={cn(
            "flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b",
            isDarkMode ? "border-slate-800" : "border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                  BẢNG TÍNH QUẢN LÝ ICD-10
                </h2>
                <span
                  className={cn(
                    "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border",
                    isDarkMode
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  )}
                >
                  Excel Sheet Mode
                </span>
              </div>
              <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Quản lý danh mục chẩn đoán & mã bệnh ICD-10 tập trung, tra cứu nhanh, phân loại phụ lục và thao tác bảng tính
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={onAddIcd}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>Thêm mã mới</span>
              </button>
            )}

            {/* Batch Update Description Modal Button */}
            {canManage && onOpenBatchUpdateDesc && (
              <button
                type="button"
                onClick={onOpenBatchUpdateDesc}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
                title="Dán danh sách mã và mô tả mới để cập nhật nhanh hàng loạt"
              >
                <Edit2 size={14} className="text-blue-500" />
                <span className="hidden sm:inline">Cập nhật mô tả</span>
              </button>
            )}

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
              title="Xuất file Excel (.xlsx) danh sách mã ICD-10 đang xem hoặc đã chọn"
            >
              <Download size={14} className="text-emerald-500" />
              <span>Xuất Excel {selectedCodes.size > 0 ? `(${selectedCodes.size})` : ""}</span>
            </button>

            {/* Import Excel */}
            {canManage && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                    isDarkMode
                      ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                  title="Nhập danh mục mã bệnh từ file Excel (.xlsx, .xls)"
                >
                  <Upload size={14} className="text-blue-500" />
                  <span>Nhập Excel</span>
                </button>
              </>
            )}

            {/* Switch to Card View toggle button */}
            {onSwitchToCardView && (
              <button
                type="button"
                onClick={onSwitchToCardView}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
                title="Chuyển sang giao diện dạng thẻ tra cứu lâm sàng"
              >
                <LayoutGrid size={14} className="text-indigo-500" />
                <span className="hidden md:inline">Xem dạng Thẻ</span>
              </button>
            )}

            {/* Density Selector */}
            <div
              className={cn(
                "hidden sm:flex items-center rounded-xl border p-0.5",
                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
              )}
            >
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  density === "compact"
                    ? isDarkMode
                      ? "bg-slate-700 shadow-2xs text-emerald-400"
                      : "bg-white shadow-2xs text-emerald-600"
                    : isDarkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                )}
                title="Mật độ hiển thị: Gọn (tối đa dữ liệu)"
              >
                Gọn
              </button>
              <button
                type="button"
                onClick={() => setDensity("medium")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  density === "medium"
                    ? isDarkMode
                      ? "bg-slate-700 shadow-2xs text-emerald-400"
                      : "bg-white shadow-2xs text-emerald-600"
                    : isDarkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                )}
                title="Mật độ hiển thị: Tiêu chuẩn"
              >
                Vừa
              </button>
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  density === "comfortable"
                    ? isDarkMode
                      ? "bg-slate-700 shadow-2xs text-emerald-400"
                      : "bg-white shadow-2xs text-emerald-600"
                    : isDarkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                )}
                title="Mật độ hiển thị: Thoải mái"
              >
                Rộng
              </button>
            </div>

            {/* Column Visibility Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                  showColumnConfig
                    ? isDarkMode
                      ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                      : "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
                title="Tùy biến cột hiển thị"
              >
                <Columns size={14} />
                <span className="hidden sm:inline">Cột</span>
              </button>

              {showColumnConfig && (
                <div
                  className={cn(
                    "absolute right-0 top-full mt-2 w-56 p-3 rounded-2xl border shadow-xl z-50 space-y-2",
                    isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between border-b pb-2",
                      isDarkMode ? "border-slate-800" : "border-slate-200"
                    )}
                  >
                    <span className="text-xs font-black uppercase text-slate-500">Ẩn / Hiện Cột</span>
                    <button
                      type="button"
                      onClick={() => setShowColumnConfig(false)}
                      className={cn(
                        "p-1 transition-colors",
                        isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {columns.map((col) => (
                      <label
                        key={col.id}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-lg transition-colors",
                          col.id === "actions"
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer",
                          isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={col.visible}
                          disabled={col.id === "actions"}
                          onChange={() => toggleColumnVisibility(col.id)}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 disabled:opacity-50"
                        />
                        <span className={cn("font-semibold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                          {col.label} {col.id === "actions" && "(Cố định)"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className={cn(
                "p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              )}
              title={isFullScreen ? "Thu nhỏ cửa sổ" : "Mở rộng toàn màn hình"}
            >
              {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* KPI Metrics Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs font-medium">
          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Tổng mã:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
              {stats.total.toLocaleString()}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Áp dụng:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-blue-400" : "text-blue-600")}>
              {stats.active.toLocaleString()}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Phụ lục A2:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-purple-400" : "text-purple-600")}>
              {stats.a2.toLocaleString()}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Thông tư 26:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
              {stats.tt26.toLocaleString()}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Có H.Dẫn:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-teal-400" : "text-teal-600")}>
              {stats.hasGuide.toLocaleString()}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Có gợi ý thuốc:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-indigo-400" : "text-indigo-600")}>
              {stats.hasSuggestions.toLocaleString()}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Kết quả lọc:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-amber-400" : "text-amber-600")}>
              {filteredList.length.toLocaleString()}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              selectedCodes.size > 0
                ? isDarkMode
                  ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                  : "bg-emerald-50 border-emerald-300 text-emerald-800"
                : isDarkMode
                ? "bg-slate-850 border-slate-800 text-slate-400"
                : "bg-slate-50 border-slate-200/80 text-slate-400"
            )}
          >
            <span className="text-[11px]">Đã chọn:</span>
            <span className="font-black text-sm">{selectedCodes.size} dòng</span>
          </div>
        </div>

        {/* Filter Bar & Quick Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 pt-1">
          {/* Quick Search */}
          <div className="lg:col-span-2 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm mã, tên bệnh, tên cũ, H.Dẫn..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold border transition-all outline-none",
                isDarkMode
                  ? "bg-slate-850 border-slate-800 focus:border-emerald-500 text-white placeholder:text-slate-500"
                  : "bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400"
              )}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className={cn(
                  "absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 transition-colors",
                  isDarkMode ? "hover:text-slate-200" : "hover:text-slate-600"
                )}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Chapter Filter */}
          <div>
            <select
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all outline-none",
                isDarkMode
                  ? "bg-slate-850 border-slate-800 text-slate-200 focus:border-emerald-500"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500"
              )}
            >
              <option value="all">Tất cả chương</option>
              <option value="A-B">Chương I: Nhiễm khuẩn (A-B)</option>
              <option value="C-D">Chương II-III: U bướu & Máu (C-D)</option>
              <option value="E-H">Chương IV-VIII: Nội tiết & Giác quan (E-H)</option>
              <option value="I-K">Chương IX-XI: Tuần hoàn, Hô hấp, Tiêu hóa (I-K)</option>
              <option value="L-N">Chương XII-XIV: Da, Cơ xương, Tiết niệu (L-N)</option>
              <option value="O-Q">Chương XV-XVII: Thai sản, Dị tật (O-Q)</option>
              <option value="R-S">Chương XVIII-XIX: Triệu chứng, Tổn thương (R-S)</option>
              <option value="U-Z">Chương XX-XXII: Khác & Đặc biệt (U-Z)</option>
            </select>
          </div>

          {/* Appendix Filter */}
          <div>
            <select
              value={selectedAppendix}
              onChange={(e) => {
                setSelectedAppendix(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all outline-none",
                isDarkMode
                  ? "bg-slate-850 border-slate-800 text-slate-200 focus:border-emerald-500"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500"
              )}
            >
              <option value="all">Tất cả phụ lục</option>
              <option value="appendix_a2">Phụ lục A2 (Đặc biệt)</option>
              <option value="tt26">Thông tư 26 (TT26)</option>
              <option value="restricted">Giới hạn tuyến KCB</option>
              <option value="appendix_other">Phụ lục A3 - A6</option>
              <option value="normal">Mã bệnh chuẩn</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all outline-none",
                isDarkMode
                  ? "bg-slate-850 border-slate-800 text-slate-200 focus:border-emerald-500"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500"
              )}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="valid">Đang áp dụng</option>
              <option value="new">Mã mới bổ sung</option>
              <option value="renamed">Mã đã đổi tên</option>
              <option value="expired">Đã hết hiệu lực</option>
            </select>
          </div>

          {/* Guide & Drug Suggestions Filter */}
          <div>
            <select
              value={selectedGuide}
              onChange={(e) => {
                setSelectedGuide(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all outline-none",
                isDarkMode
                  ? "bg-slate-850 border-slate-800 text-slate-200 focus:border-emerald-500"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500"
              )}
            >
              <option value="all">Hướng dẫn WHO (Tất cả)</option>
              <option value="has_guide">Có hướng dẫn WHO</option>
              <option value="no_guide">Không có hướng dẫn</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetFilters}
              className={cn(
                "w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center",
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                  : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              )}
            >
              Đặt lại lọc
            </button>
          </div>
        </div>

        {/* Batch Operations Bar (when items are selected) */}
        {selectedCodes.size > 0 && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-xs animate-in fade-in slide-in-from-top-1 duration-200",
              isDarkMode
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            )}
          >
            <div className="flex items-center gap-2 font-bold">
              <CheckSquare size={16} className="text-emerald-500" />
              <span>
                Đang chọn: <strong>{selectedCodes.size}</strong> mã bệnh
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExecuteBatchToggleA2(true)}
                    disabled={isBatchProcessing}
                    className="px-2.5 py-1 rounded-lg font-bold bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    Bật PL A2
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteBatchToggleA2(false)}
                    disabled={isBatchProcessing}
                    className="px-2.5 py-1 rounded-lg font-bold bg-purple-800/80 text-white hover:bg-purple-900 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    Tắt PL A2
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteBatchToggleTT26(true)}
                    disabled={isBatchProcessing}
                    className="px-2.5 py-1 rounded-lg font-bold bg-teal-600 text-white hover:bg-teal-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    Bật TT26
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteBatchTogglePin(true)}
                    disabled={isBatchProcessing}
                    className="px-2.5 py-1 rounded-lg font-bold bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Star size={12} className="fill-white" />
                    <span>Ghim</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-2.5 py-1 rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Download size={12} />
                <span>Xuất {selectedCodes.size} dòng</span>
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  disabled={isBatchProcessing}
                  className="px-2.5 py-1 rounded-lg font-bold bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Xóa đã chọn</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedCodes(new Set())}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer",
                  isDarkMode
                    ? "border-emerald-800 text-emerald-300 hover:bg-emerald-900/50"
                    : "border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                )}
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. EXCEL SPREADSHEET TABLE CANVAS */}
      <div
        className={cn(
          "w-full rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}
      >
        <div className="w-full overflow-x-auto relative custom-scrollbar">
          <table className="w-full border-collapse text-left border-spacing-0 min-w-[950px]">
            {/* Table Header */}
            <thead
              className={cn(
                "sticky top-0 z-20 text-[11px] font-black uppercase tracking-wider select-none border-b",
                isDarkMode
                  ? "bg-slate-900 text-slate-300 border-slate-800 shadow-sm"
                  : "bg-slate-100 text-slate-700 border-slate-300 shadow-xs"
              )}
            >
              {/* Excel Column Letters Header (A, B, C, D...) */}
              <tr
                className={cn(
                  "text-[9px] font-mono tracking-normal border-b text-center",
                  isDarkMode
                    ? "bg-slate-950/70 text-slate-500 border-slate-800"
                    : "bg-slate-200/60 text-slate-500 border-slate-300"
                )}
              >
                <th className="py-1 border-r border-inherit w-10 text-center font-normal">#</th>
                {columns.find((c) => c.id === "stt")?.visible && (
                  <th className="py-1 border-r border-inherit w-12 font-normal">A</th>
                )}
                {columns.find((c) => c.id === "code")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">B</th>
                )}
                {columns.find((c) => c.id === "description")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">C</th>
                )}
                {columns.find((c) => c.id === "oldName")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">D</th>
                )}
                {columns.find((c) => c.id === "chapter")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">E</th>
                )}
                {columns.find((c) => c.id === "appendix")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">F</th>
                )}
                {columns.find((c) => c.id === "guide")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">G</th>
                )}
                {columns.find((c) => c.id === "drugs")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">H</th>
                )}
                {columns.find((c) => c.id === "notes")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">I</th>
                )}
                {columns.find((c) => c.id === "status")?.visible && (
                  <th className="py-1 border-r border-inherit font-normal">J</th>
                )}
                {columns.find((c) => c.id === "actions")?.visible && (
                  <th className="py-1 font-normal">K</th>
                )}
              </tr>

              {/* Main Column Titles Header */}
              <tr>
                <th
                  className={cn(
                    "py-2.5 px-2 text-center border-r w-10",
                    isDarkMode ? "border-slate-800 bg-slate-850" : "border-slate-300 bg-slate-200/70"
                  )}
                >
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    title="Chọn tất cả các dòng trên trang này"
                    className={cn(
                      "flex items-center justify-center mx-auto transition-colors",
                      isDarkMode ? "text-slate-400 hover:text-emerald-400" : "text-slate-500 hover:text-emerald-600"
                    )}
                  >
                    {selectedCodes.size > 0 && selectedCodes.size === paginatedList.length ? (
                      <CheckSquare size={14} className={isDarkMode ? "text-emerald-400" : "text-emerald-600"} />
                    ) : (
                      <Square size={14} />
                    )}
                  </button>
                </th>

                {columns.find((c) => c.id === "stt")?.visible && (
                  <th
                    className={cn(
                      "py-2.5 px-2 text-center border-r w-12",
                      isDarkMode ? "border-slate-800 bg-slate-850/60 text-slate-300" : "border-slate-300 bg-slate-200/50 text-slate-700"
                    )}
                  >
                    STT
                  </th>
                )}

                {columns.find((c) => c.id === "code")?.visible && (
                  <th
                    onClick={() => handleSort("code")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors w-28",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Mã ICD-10</span>
                      {sortField === "code" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "description")?.visible && (
                  <th
                    onClick={() => handleSort("description")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors min-w-[240px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Tên bệnh / Chẩn đoán</span>
                      {sortField === "description" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "oldName")?.visible && (
                  <th
                    className={cn(
                      "py-2.5 px-3 border-r min-w-[160px]",
                      isDarkMode ? "border-slate-800 text-slate-300" : "border-slate-300 text-slate-700"
                    )}
                  >
                    Tên cũ
                  </th>
                )}

                {columns.find((c) => c.id === "chapter")?.visible && (
                  <th
                    onClick={() => handleSort("chapterName")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors min-w-[170px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Chương / Khối</span>
                      {sortField === "chapterName" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "appendix")?.visible && (
                  <th
                    onClick={() => handleSort("isAppendixA2")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors min-w-[170px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Phụ lục & Quy định</span>
                      {sortField === "isAppendixA2" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "guide")?.visible && (
                  <th
                    onClick={() => handleSort("guide")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors min-w-[220px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Hướng dẫn WHO</span>
                      {sortField === "guide" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "drugs")?.visible && (
                  <th
                    className={cn(
                      "py-2.5 px-2 border-r w-28 text-center",
                      isDarkMode ? "border-slate-800 text-slate-300" : "border-slate-300 text-slate-700"
                    )}
                  >
                    Gợi ý thuốc
                  </th>
                )}

                {columns.find((c) => c.id === "notes")?.visible && (
                  <th
                    className={cn(
                      "py-2.5 px-3 border-r min-w-[140px]",
                      isDarkMode ? "border-slate-800 text-slate-300" : "border-slate-300 text-slate-700"
                    )}
                  >
                    Ghi chú
                  </th>
                )}

                {columns.find((c) => c.id === "status")?.visible && (
                  <th
                    onClick={() => handleSort("status")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors w-28",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Trạng thái</span>
                      {sortField === "status" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "actions")?.visible && (
                  <th
                    className={cn(
                      "py-2.5 px-3 w-32 text-center",
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    )}
                  >
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody
              className={cn(
                "divide-y font-normal",
                isDarkMode ? "divide-slate-800/80" : "divide-slate-200"
              )}
            >
              {paginatedList.length > 0 ? (
                paginatedList.map((item, index) => {
                  const isSelected = selectedCodes.has(item.code);
                  const isPinned = pinnedCodesSet.has(item.code) || item.isPinned;
                  const drugCount = drugCountByIcd.get(item.code.toUpperCase()) || 0;
                  const globalStt = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={item.code}
                      className={cn(
                        "group transition-colors",
                        isSelected
                          ? isDarkMode
                            ? "bg-emerald-950/40 hover:bg-emerald-950/60 text-white"
                            : "bg-emerald-50/80 hover:bg-emerald-100/70 text-emerald-950"
                          : isDarkMode
                          ? index % 2 === 0
                            ? "bg-slate-900/40 hover:bg-slate-800/60"
                            : "bg-slate-900/80 hover:bg-slate-800/60"
                          : index % 2 === 0
                          ? "bg-white hover:bg-blue-50/40"
                          : "bg-slate-50/60 hover:bg-blue-50/40"
                      )}
                    >
                      {/* Checkbox */}
                      <td
                        className={cn(
                          "text-center border-r",
                          rowHeightClass,
                          isDarkMode ? "border-slate-800/80" : "border-slate-200"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.code)}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* STT */}
                      {columns.find((c) => c.id === "stt")?.visible && (
                        <td
                          className={cn(
                            "text-center font-mono text-slate-400 border-r",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          {globalStt}
                        </td>
                      )}

                      {/* Code */}
                      {columns.find((c) => c.id === "code")?.visible && (
                        <td
                          className={cn(
                            "border-r font-mono font-bold tracking-tight",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex flex-col">
                              <span
                                onClick={() => onViewIcdDetail(item)}
                                className={cn(
                                  "hover:underline cursor-pointer font-black text-xs sm:text-sm",
                                  isDarkMode ? "text-emerald-400" : "text-emerald-600"
                                )}
                                title="Xem chi tiết mã bệnh"
                              >
                                {item.code}
                              </span>
                              {(item.groupCode || (item.code.includes('.') ? item.code.split('.')[0] : '')) && (
                                <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-500" title={`Mã nhóm: ${item.groupCode || item.code.split('.')[0]}`}>
                                  Nhóm: {item.groupCode || item.code.split('.')[0]}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.code, item.code)}
                              className={cn(
                                "opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity",
                                isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"
                              )}
                              title="Sao chép mã"
                            >
                              {copiedCode === item.code ? (
                                <CheckCircle2 size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} className="text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Description */}
                      {columns.find((c) => c.id === "description")?.visible && (
                        <td
                          className={cn(
                            "border-r font-medium",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          <div className="space-y-0.5">
                            <span
                              onClick={() => onViewIcdDetail(item)}
                              className={cn(
                                "cursor-pointer transition-colors",
                                isDarkMode ? "hover:text-emerald-400" : "hover:text-emerald-600"
                              )}
                            >
                              {item.description}
                            </span>
                            {item.oldName && (
                              <div className={cn(
                                "text-[10px] italic",
                                isDarkMode ? "text-amber-400" : "text-amber-600"
                              )}>
                                Tên cũ: {item.oldName}
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Old Name */}
                      {columns.find((c) => c.id === "oldName")?.visible && (
                        <td
                          className={cn(
                            "border-r text-slate-500 italic",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          {item.oldName || "—"}
                        </td>
                      )}

                      {/* Chapter / Block */}
                      {columns.find((c) => c.id === "chapter")?.visible && (
                        <td
                          className={cn(
                            "border-r text-xs",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          {item.chapterName ? (
                            <div className="space-y-0.5">
                              <span className={cn(
                                "font-semibold block truncate max-w-[220px]",
                                isDarkMode ? "text-slate-300" : "text-slate-700"
                              )}>
                                {item.chapterName}
                              </span>
                              {item.blockName && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-[220px]">
                                  {item.blockName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {/* Appendix & Regulations */}
                      {columns.find((c) => c.id === "appendix")?.visible && (
                        <td
                          className={cn(
                            "border-r",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-1">
                            {item.isAppendixA2 && (
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                  isDarkMode
                                    ? "bg-purple-950/70 text-purple-300 border-purple-800"
                                    : "bg-purple-100 text-purple-800 border-purple-300"
                                )}
                              >
                                PL A2
                              </span>
                            )}
                            {item.isTT26 && (
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                  isDarkMode
                                    ? "bg-teal-950/70 text-teal-300 border-teal-800"
                                    : "bg-teal-100 text-teal-800 border-teal-300"
                                )}
                              >
                                TT26
                              </span>
                            )}
                            {item.isRestricted && (
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                  isDarkMode
                                    ? "bg-amber-950/70 text-amber-300 border-amber-800"
                                    : "bg-amber-100 text-amber-800 border-amber-300"
                                )}
                              >
                                Giới hạn
                              </span>
                            )}
                            {!item.isAppendixA2 && !item.isTT26 && !item.isRestricted && (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* WHO Guide */}
                      {columns.find((c) => c.id === "guide")?.visible && (
                        <td
                          className={cn(
                            "border-r",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          {item.guide ? (
                            <div
                              onClick={() => onViewIcdDetail(item)}
                              className={cn(
                                "line-clamp-2 text-xs cursor-pointer transition-colors",
                                isDarkMode
                                  ? "text-slate-300 hover:text-emerald-400"
                                  : "text-slate-600 hover:text-emerald-600"
                              )}
                              title={item.guide}
                            >
                              {item.guide}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa có hướng dẫn</span>
                          )}
                        </td>
                      )}

                      {/* Drug Suggestions Count */}
                      {columns.find((c) => c.id === "drugs")?.visible && (
                        <td
                          className={cn(
                            "border-r text-center",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          {drugCount > 0 || (item.commonDrugs && item.commonDrugs.length > 0) ? (
                            <button
                              type="button"
                              onClick={() => onViewIcdDetail(item)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                isDarkMode
                                  ? "bg-indigo-950/60 text-indigo-300 border-indigo-800 hover:bg-indigo-900/80"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              )}
                              title="Nhấn để xem danh sách thuốc gợi ý"
                            >
                              <Pill size={11} className="text-indigo-500" />
                              <span>{drugCount || item.commonDrugs?.length} thuốc</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">0</span>
                          )}
                        </td>
                      )}

                      {/* Notes */}
                      {columns.find((c) => c.id === "notes")?.visible && (
                        <td
                          className={cn(
                            "border-r text-xs text-slate-500 max-w-[200px] truncate",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                          title={item.notes}
                        >
                          {item.notes || "—"}
                        </td>
                      )}

                      {/* Status */}
                      {columns.find((c) => c.id === "status")?.visible && (
                        <td
                          className={cn(
                            "border-r",
                            rowHeightClass,
                            isDarkMode ? "border-slate-800/80" : "border-slate-200"
                          )}
                        >
                          {item.isExpired ? (
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                isDarkMode
                                  ? "bg-rose-950/60 text-rose-300 border-rose-800"
                                  : "bg-rose-100 text-rose-800 border-rose-200"
                              )}
                            >
                              Hết hạn
                            </span>
                          ) : item.isNew ? (
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                isDarkMode
                                  ? "bg-blue-950/60 text-blue-300 border-blue-800"
                                  : "bg-blue-100 text-blue-800 border-blue-200"
                              )}
                            >
                              Mới
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                isDarkMode
                                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
                              )}
                            >
                              Áp dụng
                            </span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      {columns.find((c) => c.id === "actions")?.visible && (
                        <td className={cn("text-center", rowHeightClass)}>
                          <div className="flex items-center justify-center gap-1">
                            {/* View Detail */}
                            <button
                              type="button"
                              onClick={() => onViewIcdDetail(item)}
                              className={cn(
                                "p-1 rounded transition-colors",
                                isDarkMode
                                  ? "hover:bg-slate-700 text-slate-400 hover:text-slate-100"
                                  : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                              )}
                              title="Xem chi tiết"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Edit */}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => onEditIcd(item)}
                                className={cn(
                                  "p-1 rounded transition-colors",
                                  isDarkMode
                                    ? "hover:bg-blue-900/40 text-blue-400"
                                    : "hover:bg-blue-100 text-blue-600"
                                )}
                                title="Chỉnh sửa mã bệnh"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}

                            {/* Delete */}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => onDeleteIcd(item.code)}
                                className={cn(
                                  "p-1 rounded transition-colors",
                                  isDarkMode
                                    ? "hover:bg-rose-900/40 text-rose-400"
                                    : "hover:bg-rose-100 text-rose-600"
                                )}
                                title="Xóa mã bệnh"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={columns.filter((c) => c.visible).length + 1}
                    className="py-12 text-center text-slate-400 text-sm"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet size={36} className={isDarkMode ? "text-slate-600" : "text-slate-300"} />
                      <p className={cn("font-semibold", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                        Không tìm thấy mã bệnh ICD-10 nào phù hợp
                      </p>
                      <p className="text-xs text-slate-400">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc bấm &quot;Đặt lại lọc&quot; để hiển thị toàn bộ danh mục.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. EXCEL PAGINATION & ROW CONTROLS FOOTER */}
        <div
          className={cn(
            "p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none",
            isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-slate-100/70 border-slate-200"
          )}
        >
          {/* Left: Row counts & page size selector */}
          <div className="flex items-center gap-3">
            <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
              Hiển thị{" "}
              <strong>
                {filteredList.length === 0
                  ? 0
                  : (currentPage - 1) * pageSize + 1}
                -
                {Math.min(currentPage * pageSize, filteredList.length)}
              </strong>{" "}
              trên tổng số <strong>{filteredList.length.toLocaleString()}</strong> mã
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Dòng/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={cn(
                  "py-1 px-2 rounded-lg text-xs font-bold border transition-all outline-none",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200"
                    : "bg-white border-slate-200 text-slate-800"
                )}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Right: Pagination buttons & Jump to page */}
          <div className="flex items-center gap-2">
            {/* Quick jump */}
            <form onSubmit={handleJumpToPage} className="flex items-center gap-1 mr-2">
              <span className="text-slate-400 text-[11px] hidden md:inline">Đến trang:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder={String(currentPage)}
                className={cn(
                  "w-12 py-1 px-1.5 text-center rounded-lg text-xs font-bold border outline-none",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200"
                    : "bg-white border-slate-200 text-slate-800"
                )}
              />
              <button
                type="submit"
                className={cn(
                  "py-1 px-2 rounded-lg text-[11px] font-bold border cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                Đi
              </button>
            </form>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={cn(
                  "p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="px-3 py-1 font-bold text-xs">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={cn(
                  "p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className={cn(
                  "p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
                title="Trang cuối"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODALS */}
      {/* Batch Delete Confirmation Modal */}
      <AnimatePresence>
        {showBatchDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className={cn("p-3 rounded-xl", isDarkMode ? "bg-rose-950/60" : "bg-rose-100")}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black">Xác nhận xóa hàng loạt</h3>
                  <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
                </div>
              </div>

              <p className="text-sm">
                Bạn có chắc chắn muốn xóa <strong>{selectedCodes.size}</strong> mã bệnh ICD-10 đã chọn khỏi hệ thống?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteConfirm(false)}
                  disabled={isBatchProcessing}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                    isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBatchDelete}
                  disabled={isBatchProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {isBatchProcessing ? "Đang xử lý..." : "Xác nhận xóa"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Excel Import Preview Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Header */}
              <div
                className={cn(
                  "p-4 border-b flex items-center justify-between",
                  isDarkMode ? "border-slate-800 bg-slate-850" : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">
                      Xem trước dữ liệu nhập từ Excel
                    </h3>
                    <p className="text-xs text-slate-500">
                      File: <strong>{importFileName}</strong> — Tìm thấy{" "}
                      <strong>{importPreviewData.length}</strong> dòng
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className={cn(
                    "p-1 rounded-lg text-slate-400 transition-colors",
                    isDarkMode ? "hover:text-slate-200" : "hover:text-slate-600"
                  )}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Table Preview */}
              <div className="flex-1 overflow-auto p-4 max-h-[60vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={cn(
                        "border-b sticky top-0 font-black",
                        isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                      )}
                    >
                      <th className="py-2 px-2 border-r border-inherit">STT</th>
                      <th className="py-2 px-3 border-r border-inherit">Mã ICD-10</th>
                      <th className="py-2 px-3 border-r border-inherit">Tên bệnh</th>
                      <th className="py-2 px-3 border-r border-inherit">Chương</th>
                      <th className="py-2 px-3 border-r border-inherit">Phụ lục A2</th>
                      <th className="py-2 px-3 border-r border-inherit">Thông tư 26</th>
                      <th className="py-2 px-3">Hướng dẫn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {importPreviewData.slice(0, 30).map((row, idx) => {
                      const code = row["Mã ICD-10"] || row["Mã ICD"] || row["Mã bệnh"] || row["code"] || "";
                      const desc = row["Tên bệnh / Chẩn đoán"] || row["Tên bệnh"] || row["description"] || "";
                      const chapter = row["Chương bệnh"] || row["Chương"] || row["chapterName"] || "";
                      const a2 = row["Phụ lục A2"] || row["isAppendixA2"] || "";
                      const tt26 = row["Thông tư 26 (TT26)"] || row["TT26"] || row["isTT26"] || "";
                      const guide = row["Hướng dẫn WHO"] || row["Hướng dẫn"] || row["guide"] || "";

                      return (
                        <tr key={idx} className={isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}>
                          <td className="py-2 px-2 border-r border-inherit font-mono text-slate-400">{idx + 1}</td>
                          <td className={cn("py-2 px-3 border-r border-inherit font-mono font-bold", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                            {code || <span className="text-rose-500 italic">Thiếu</span>}
                          </td>
                          <td className="py-2 px-3 border-r border-inherit font-medium">
                            {desc || <span className="text-rose-500 italic">Thiếu</span>}
                          </td>
                          <td className="py-2 px-3 border-r border-inherit text-slate-500">{chapter || "—"}</td>
                          <td className="py-2 px-3 border-r border-inherit text-center">{String(a2)}</td>
                          <td className="py-2 px-3 border-r border-inherit text-center">{String(tt26)}</td>
                          <td className="py-2 px-3 text-slate-500 truncate max-w-[200px]">{guide || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {importPreviewData.length > 30 && (
                  <p className="text-xs text-center text-slate-400 italic mt-3">
                    ...và {importPreviewData.length - 30} dòng tiếp theo
                  </p>
                )}
              </div>

              {/* Footer */}
              <div
                className={cn(
                  "p-4 border-t flex items-center justify-between",
                  isDarkMode ? "border-slate-800 bg-slate-850" : "border-slate-200 bg-slate-50"
                )}
              >
                <span className="text-xs text-slate-500">
                  Hệ thống sẽ cập nhật hoặc bổ sung các mã bệnh này vào cơ sở dữ liệu.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    disabled={isImporting}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                      isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isImporting ? "Đang nhập dữ liệu..." : `Xác nhận nhập (${importPreviewData.length} mã)`}
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
