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
  Filter,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Sparkles,
  AlertTriangle,
  Info,
  Layers,
  Pill,
  Building2,
  Calendar,
  DollarSign,
  Package,
  ShieldAlert,
  Columns,
  EyeOff,
  Maximize2,
  Minimize2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Drug, DrugGroup, Ingredient } from "../types";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface DrugExcelManagementProps {
  drugs: Drug[];
  drugGroups: DrugGroup[];
  availableIngredients: Ingredient[];
  isDarkMode: boolean;
  canManage: boolean;
  userRole?: string;
  onAddDrug: () => void;
  onEditDrug: (drug: Drug) => void;
  onViewDrugDetail: (drug: Drug) => void;
  onToggleClosed: (drug: Drug) => void;
  onDeleteDrug: (id: string, name: string, pdfUrl?: string) => void;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  onBatchToggleClosed?: (drugs: Drug[], isClosed: boolean) => Promise<void>;
  onBatchImport?: (importedDrugs: Partial<Drug>[]) => Promise<void>;
}

type SortField =
  | "name"
  | "activeIngredients"
  | "groupId"
  | "dosageForm"
  | "registrationNumber"
  | "price"
  | "stockQuantity"
  | "isClosed"
  | "updatedAt";

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

export const DrugExcelManagement: React.FC<DrugExcelManagementProps> = ({
  drugs,
  drugGroups,
  availableIngredients,
  isDarkMode,
  canManage,
  userRole,
  onAddDrug,
  onEditDrug,
  onViewDrugDetail,
  onToggleClosed,
  onDeleteDrug,
  onBatchDelete,
  onBatchToggleClosed,
  onBatchImport,
}) => {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // all, active, closed
  const [selectedBhyt, setSelectedBhyt] = useState<string>("all"); // all, bhyt, no_bhyt
  const [selectedStock, setSelectedStock] = useState<string>("all"); // all, in_stock, out_of_stock
  const [selectedRoute, setSelectedRoute] = useState<string>("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Density & View Options
  const [density, setDensity] = useState<Density>("compact");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Import / Export states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Batch delete confirm
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // Columns definition with toggles
  const [columns, setColumns] = useState<ColumnDef[]>([
    { id: "stt", label: "STT", excelCol: "A", width: "w-12", visible: true, sortable: false },
    { id: "regNumber", label: "Mã thuốc / SĐK", excelCol: "B", width: "w-36", visible: true, sortable: true },
    { id: "name", label: "Tên biệt dược", excelCol: "C", width: "w-64", visible: true, sortable: true },
    { id: "ingredients", label: "Hoạt chất & Hàm lượng", excelCol: "D", width: "w-72", visible: true, sortable: true },
    { id: "group", label: "Nhóm thuốc", excelCol: "E", width: "w-44", visible: true, sortable: true },
    { id: "dosageForm", label: "Dạng bào chế & Đường dùng", excelCol: "F", width: "w-48", visible: true, sortable: true },
    { id: "packaging", label: "ĐVT", excelCol: "G", width: "w-20", visible: true, sortable: false },
    { id: "price", label: "Đơn giá", excelCol: "H", width: "w-24", visible: true, sortable: true },
    { id: "stock", label: "Tồn kho & HSD", excelCol: "I", width: "w-36", visible: true, sortable: true },
    { id: "status", label: "Trạng thái", excelCol: "J", width: "w-32", visible: true, sortable: true },
    { id: "actions", label: "Thao tác", excelCol: "K", width: "w-32", visible: true, sortable: false },
  ]);

  const toggleColumnVisibility = (colId: string) => {
    if (colId === "actions") return; // Thao tác luôn luôn hiện
    setColumns((prev) =>
      prev.map((col) => (col.id === colId ? { ...col, visible: !col.visible } : col))
    );
  };

  // Groups Map for quick lookup
  const groupsMap = useMemo(() => {
    const map = new Map<string, string>();
    drugGroups.forEach((g) => {
      map.set(g.id, g.name);
    });
    return map;
  }, [drugGroups]);

  // Distinct administration routes for filter dropdown
  const distinctRoutes = useMemo(() => {
    const routes = new Set<string>();
    drugs.forEach((d) => {
      if (d.administrationRoute) routes.add(d.administrationRoute);
    });
    return Array.from(routes);
  }, [drugs]);

  // Filter drugs
  const filteredDrugs = useMemo(() => {
    let result = drugs.filter((drug) => {
      // Search across name, registrationNumber, active ingredients, excipients, manufacturer
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = drug.name?.toLowerCase().includes(query);
        const matchReg = drug.registrationNumber?.toLowerCase().includes(query);
        const matchAtc = drug.atcCode?.toLowerCase().includes(query);
        const matchMfg = drug.manufacturer?.toLowerCase().includes(query);
        const matchIng = drug.activeIngredients?.some((ai: any) =>
          typeof ai === "string"
            ? (ai as string).toLowerCase().includes(query)
            : (ai.name?.toLowerCase().includes(query) ||
               `${ai.amount || ""} ${ai.unit || ""}`.toLowerCase().includes(query))
        );
        const matchGroup = drug.groupIds?.some((gid) =>
          groupsMap.get(gid)?.toLowerCase().includes(query)
        );

        if (!matchName && !matchReg && !matchAtc && !matchMfg && !matchIng && !matchGroup) {
          return false;
        }
      }

      // Group filter
      if (selectedGroup !== "all") {
        const inGroup =
          drug.groupId === selectedGroup ||
          (drug.groupIds && drug.groupIds.includes(selectedGroup));
        if (!inGroup) return false;
      }

      // Status filter
      if (selectedStatus === "active" && drug.isClosed) return false;
      if (selectedStatus === "closed" && !drug.isClosed) return false;

      // BHYT filter
      const isBhyt = Boolean((drug as any).isInsuranceCovered || (drug as any).bhyt);
      if (selectedBhyt === "bhyt" && !isBhyt) return false;
      if (selectedBhyt === "no_bhyt" && isBhyt) return false;

      // Stock filter
      const stockNum = Number(drug.stockQuantity ?? 0);
      if (selectedStock === "in_stock") {
        if (drug.stockQuantity !== undefined && stockNum <= 0) return false;
        if (drug.stockStatus === "out_of_stock") return false;
      }
      if (selectedStock === "out_of_stock") {
        if (drug.stockQuantity !== undefined && stockNum > 0) return false;
        if (drug.stockStatus !== "out_of_stock" && drug.stockQuantity === undefined) return false;
      }

      // Route filter
      if (selectedRoute !== "all" && drug.administrationRoute !== selectedRoute) {
        return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case "name":
          valA = (a.name || "").toLowerCase();
          valB = (b.name || "").toLowerCase();
          break;
        case "registrationNumber":
          valA = (a.registrationNumber || "").toLowerCase();
          valB = (b.registrationNumber || "").toLowerCase();
          break;
        case "activeIngredients":
          valA = (
            a.activeIngredients
              ?.map((i) => (typeof i === "string" ? i : i.name))
              .join(", ") || ""
          ).toLowerCase();
          valB = (
            b.activeIngredients
              ?.map((i) => (typeof i === "string" ? i : i.name))
              .join(", ") || ""
          ).toLowerCase();
          break;
        case "groupId":
          valA = (groupsMap.get(a.groupId || "") || "").toLowerCase();
          valB = (groupsMap.get(b.groupId || "") || "").toLowerCase();
          break;
        case "dosageForm":
          valA = (a.dosageForm || "").toLowerCase();
          valB = (b.dosageForm || "").toLowerCase();
          break;
        case "price":
          valA = a.price || 0;
          valB = b.price || 0;
          break;
        case "stockQuantity":
          valA = a.stockQuantity || 0;
          valB = b.stockQuantity || 0;
          break;
        case "isClosed":
          valA = a.isClosed ? 1 : 0;
          valB = b.isClosed ? 1 : 0;
          break;
        case "updatedAt":
          valA = a.updatedAt || "";
          valB = b.updatedAt || "";
          break;
        default:
          valA = (a.name || "").toLowerCase();
          valB = (b.name || "").toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    drugs,
    searchTerm,
    selectedGroup,
    selectedStatus,
    selectedBhyt,
    selectedStock,
    selectedRoute,
    sortField,
    sortOrder,
    groupsMap,
  ]);

  // Pagination slice
  const totalItems = filteredDrugs.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedDrugs = useMemo(() => {
    if (pageSize === -1) return filteredDrugs;
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredDrugs.slice(startIndex, startIndex + pageSize);
  }, [filteredDrugs, validCurrentPage, pageSize]);

  // Handle column sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === paginatedDrugs.length) {
      setSelectedIds(new Set());
    } else {
      const nextSet = new Set<string>();
      paginatedDrugs.forEach((d) => nextSet.add(d.id));
      setSelectedIds(nextSet);
    }
  };

  const handleSelectRow = (id: string) => {
    const nextSet = new Set(selectedIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setSelectedIds(nextSet);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const exportList =
      selectedIds.size > 0
        ? drugs.filter((d) => selectedIds.has(d.id))
        : filteredDrugs;

    const dataToExport = exportList.map((d, index) => {
      const activeIngStr = (d.activeIngredients || [])
        .map((ai: any) =>
          typeof ai === "string"
            ? ai
            : `${ai.name || ""} ${ai.amount || ""} ${ai.unit || ""}`.trim()
        )
        .filter(Boolean)
        .join("; ");

      const groupNames = (d.groupIds && d.groupIds.length > 0 ? d.groupIds : [d.groupId])
        .map((gid) => (gid ? groupsMap.get(gid) : ""))
        .filter(Boolean)
        .join("; ");

      const isBhyt = Boolean((d as any).isInsuranceCovered || (d as any).bhyt);

      return {
        "STT": index + 1,
        "Mã thuốc / SĐK": d.registrationNumber || d.id || "",
        "Mã ATC": d.atcCode || "",
        "Tên biệt dược": d.name || "",
        "Hoạt chất & Hàm lượng": activeIngStr,
        "Nhóm thuốc": groupNames || d.pharmacologicalGroup || "",
        "Dạng bào chế": d.dosageForm || "",
        "Đường dùng": d.administrationRoute || "",
        "Quy cách đóng gói": (d as any).packaging || "",
        "Đơn vị tính": d.unit || "",
        "Đơn giá (VNĐ)": d.price || 0,
        "BHYT thanh toán": isBhyt ? "Có BHYT" : "Không",
        "Số lượng tồn": d.stockQuantity ?? "",
        "Số lô": d.lotNumber || (d.lots && d.lots[0]?.lotNumber) || "",
        "Hạn dùng": d.expiryDate || (d.lots && d.lots[0]?.expiryDate) || "",
        "Nhà sản xuất": d.manufacturer || "",
        "Nước sản xuất": (d as any).manufacturingCountry || (d as any).country || "",
        "Trạng thái": d.isClosed ? "Tạm ngưng" : "Đang lưu hành",
        "Thuốc kê đơn (Rx)": d.isRx ? "Kê đơn" : "Không kê đơn",
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
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_Muc_Thuoc");

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    XLSX.writeFile(workbook, `Danh_Muc_Thuoc_BV_${dateStr}.xlsx`);
  };

  // Excel Import Handler
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
          alert("File Excel trống hoặc không đúng định dạng!");
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
      const parsedDrugs: Partial<Drug>[] = importPreviewData.map((row: any) => {
        const name = row["Tên biệt dược"] || row["Tên thuốc"] || row["name"] || "";
        const regNumber = row["Mã thuốc / SĐK"] || row["Số đăng ký"] || row["Mã thuốc"] || row["registrationNumber"] || "";
        const ingredientsStr = row["Hoạt chất & Hàm lượng"] || row["Hoạt chất"] || row["activeIngredients"] || "";
        const dosageForm = row["Dạng bào chế"] || row["dosageForm"] || "";
        const route = row["Đường dùng"] || row["administrationRoute"] || "";
        const packaging = row["Quy cách đóng gói"] || row["packaging"] || "";
        const unit = row["Đơn vị tính"] || row["unit"] || "";
        const price = Number(row["Đơn giá (VNĐ)"] || row["Đơn giá"] || row["price"] || 0);
        const mfg = row["Nhà sản xuất"] || row["manufacturer"] || "";

        // Parse ingredients
        const activeIngredients = ingredientsStr
          ? ingredientsStr.split(";").map((part: string) => {
              const trimmed = part.trim();
              return { name: trimmed, strength: "" };
            })
          : [];

        return {
          id: Math.random().toString(36).substr(2, 9),
          name: String(name).trim(),
          registrationNumber: String(regNumber).trim(),
          activeIngredients,
          dosageForm: String(dosageForm).trim(),
          administrationRoute: String(route).trim(),
          packaging: String(packaging).trim(),
          unit: String(unit).trim(),
          price: isNaN(price) ? 0 : price,
          manufacturer: String(mfg).trim(),
          isClosed: false,
          isRx: false,
        };
      }).filter(d => d.name);

      await onBatchImport(parsedDrugs);
      setIsImportModalOpen(false);
      setImportPreviewData([]);
    } catch (err) {
      console.error("Lỗi import:", err);
      alert("Đã xảy ra lỗi trong quá trình nhập dữ liệu!");
    } finally {
      setIsImporting(false);
    }
  };

  // Batch operations
  const handleExecuteBatchDelete = async () => {
    if (!onBatchDelete || selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    try {
      await onBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBatchDeleteConfirm(false);
    } catch (err) {
      console.error("Lỗi xóa hàng loạt:", err);
      alert("Lỗi khi xóa các thuốc đã chọn!");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleExecuteBatchToggleStatus = async (targetClosed: boolean) => {
    if (!onBatchToggleClosed || selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    try {
      const targetDrugs = drugs.filter((d) => selectedIds.has(d.id));
      await onBatchToggleClosed(targetDrugs, targetClosed);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái:", err);
      alert("Lỗi khi cập nhật trạng thái!");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Row height by density
  const rowHeightClass = {
    compact: "py-1.5 px-2 text-xs",
    medium: "py-2.5 px-3 text-xs sm:text-sm",
    comfortable: "py-3.5 px-3.5 text-sm",
  }[density];

  // Stats
  const activeCount = useMemo(() => drugs.filter((d) => !d.isClosed).length, [drugs]);
  const closedCount = useMemo(() => drugs.filter((d) => d.isClosed).length, [drugs]);
  const bhytCount = useMemo(
    () => drugs.filter((d) => Boolean((d as any).isInsuranceCovered || (d as any).bhyt)).length,
    [drugs]
  );

  return (
    <div
      className={cn(
        "w-full flex flex-col transition-all duration-200 overflow-hidden font-sans",
        isFullScreen ? "fixed inset-0 z-50 p-3 sm:p-5 backdrop-blur-md" : "space-y-3",
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
        {/* Action Toolbar */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 pb-3 border-b",
            isDarkMode ? "border-slate-800" : "border-slate-200"
          )}
        >
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={onAddDrug}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>Thêm thuốc</span>
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
              title="Xuất file Excel (.xlsx) danh sách thuốc đang xem hoặc đã chọn"
            >
              <Download size={14} className="text-emerald-500" />
              <span>Xuất Excel {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</span>
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
                  title="Nhập dữ liệu thuốc từ file Excel / CSV"
                >
                  <Upload size={14} className="text-blue-500" />
                  <span>Nhập Excel</span>
                </button>
              </>
            )}

            {/* Density Selector */}
            <div
              className={cn(
                "flex items-center border rounded-xl p-0.5",
                isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-200"
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
                title="Mật độ hiển thị: Siêu gọn (Excel Dense)"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-medium">
          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Tổng số thuốc:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
              {drugs.length}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Đang lưu hành:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-blue-400" : "text-blue-600")}>
              {activeCount}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Tạm ngưng:</span>
            <span className="font-black text-sm text-rose-500">{closedCount}</span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200/80"
            )}
          >
            <span className="text-slate-400 text-[11px]">Danh mục BHYT:</span>
            <span className={cn("font-black text-sm", isDarkMode ? "text-teal-400" : "text-teal-600")}>
              {bhytCount}
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
              {filteredDrugs.length}
            </span>
          </div>

          <div
            className={cn(
              "px-3 py-2 rounded-xl border flex items-center justify-between",
              selectedIds.size > 0
                ? isDarkMode
                  ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                  : "bg-emerald-50 border-emerald-300 text-emerald-800"
                : isDarkMode
                ? "bg-slate-850 border-slate-800 text-slate-400"
                : "bg-slate-50 border-slate-200/80 text-slate-400"
            )}
          >
            <span className="text-[11px]">Đã chọn:</span>
            <span className="font-black text-sm">{selectedIds.size} dòng</span>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {/* Quick Search */}
          <div className="lg:col-span-2 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm nhanh tên biệt dược, hoạt chất, mã, SĐK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-9 pr-8 py-2 rounded-xl text-xs border outline-none font-semibold transition-all",
                isDarkMode
                  ? "bg-slate-800/80 border-slate-700 text-white focus:border-emerald-500"
                  : "bg-white border-slate-200 text-slate-900 focus:border-emerald-500 shadow-2xs"
              )}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <div>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={cn(
                "w-full px-2.5 py-2 rounded-xl text-xs border outline-none font-semibold cursor-pointer",
                isDarkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-200"
                  : "bg-white border-slate-200 text-slate-700 shadow-2xs"
              )}
            >
              <option value="all">📂 Tất cả nhóm ({drugGroups.length})</option>
              {drugGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={cn(
                "w-full px-2.5 py-2 rounded-xl text-xs border outline-none font-semibold cursor-pointer",
                isDarkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-200"
                  : "bg-white border-slate-200 text-slate-700 shadow-2xs"
              )}
            >
              <option value="all">⚡ Tất cả trạng thái</option>
              <option value="active">🟢 Đang lưu hành</option>
              <option value="closed">🔴 Tạm ngưng</option>
            </select>
          </div>

          {/* BHYT Filter */}
          <div>
            <select
              value={selectedBhyt}
              onChange={(e) => setSelectedBhyt(e.target.value)}
              className={cn(
                "w-full px-2.5 py-2 rounded-xl text-xs border outline-none font-semibold cursor-pointer",
                isDarkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-200"
                  : "bg-white border-slate-200 text-slate-700 shadow-2xs"
              )}
            >
              <option value="all">🏥 Danh mục BHYT: Tất cả</option>
              <option value="bhyt">✅ Có thanh toán BHYT</option>
              <option value="no_bhyt">❌ Không thuộc BHYT</option>
            </select>
          </div>

          {/* Stock / Route Filter */}
          <div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className={cn(
                "w-full px-2.5 py-2 rounded-xl text-xs border outline-none font-semibold cursor-pointer",
                isDarkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-200"
                  : "bg-white border-slate-200 text-slate-700 shadow-2xs"
              )}
            >
              <option value="all">💊 Tất cả đường dùng</option>
              {distinctRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected rows action bar */}
        {selectedIds.size > 0 && canManage && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-200",
              isDarkMode
                ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                : "bg-emerald-50 border-emerald-300 text-emerald-900"
            )}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 size={16} className={isDarkMode ? "text-emerald-400" : "text-emerald-600"} />
              <span>Đang chọn {selectedIds.size} thuốc:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleExecuteBatchToggleStatus(false)}
                disabled={isBatchProcessing}
                className="px-2.5 py-1 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                Bật lưu hành ({selectedIds.size})
              </button>

              <button
                type="button"
                onClick={() => handleExecuteBatchToggleStatus(true)}
                disabled={isBatchProcessing}
                className="px-2.5 py-1 rounded-lg font-bold bg-amber-600 text-white hover:bg-amber-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                Tạm ngưng ({selectedIds.size})
              </button>

              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={isBatchProcessing}
                className="px-2.5 py-1 rounded-lg font-bold bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Xóa đã chọn</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
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
        <div className="w-full overflow-x-auto relative">
          <table className="w-full border-collapse text-left border-spacing-0">
            {/* Table Header */}
            <thead
              className={cn(
                "sticky top-0 z-20 text-[11px] font-black uppercase tracking-wider select-none border-b",
                isDarkMode
                  ? "bg-slate-900 text-slate-300 border-slate-800 shadow-sm"
                  : "bg-slate-100 text-slate-700 border-slate-300 shadow-xs"
              )}
            >
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
                    onClick={handleSelectAll}
                    title="Chọn tất cả các dòng trên trang này"
                    className={cn(
                      "flex items-center justify-center mx-auto transition-colors",
                      isDarkMode ? "text-slate-400 hover:text-emerald-400" : "text-slate-500 hover:text-emerald-600"
                    )}
                  >
                    {selectedIds.size > 0 && selectedIds.size === paginatedDrugs.length ? (
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

                {columns.find((c) => c.id === "regNumber")?.visible && (
                  <th
                    onClick={() => handleSort("registrationNumber")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Mã thuốc / SĐK</span>
                      {sortField === "registrationNumber" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "name")?.visible && (
                  <th
                    onClick={() => handleSort("name")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Tên biệt dược</span>
                      {sortField === "name" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "ingredients")?.visible && (
                  <th
                    onClick={() => handleSort("activeIngredients")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors min-w-[220px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Hoạt chất & Hàm lượng</span>
                      {sortField === "activeIngredients" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "group")?.visible && (
                  <th
                    onClick={() => handleSort("groupId")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors min-w-[160px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Nhóm thuốc</span>
                      {sortField === "groupId" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "dosageForm")?.visible && (
                  <th
                    onClick={() => handleSort("dosageForm")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors min-w-[150px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Bào chế / Đường dùng</span>
                      {sortField === "dosageForm" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "packaging")?.visible && (
                  <th
                    className={cn(
                      "py-2.5 px-2 border-r min-w-[70px] max-w-[90px] text-center",
                      isDarkMode ? "border-slate-800 text-slate-300" : "border-slate-300 text-slate-700"
                    )}
                  >
                    ĐVT
                  </th>
                )}

                {columns.find((c) => c.id === "price")?.visible && (
                  <th
                    onClick={() => handleSort("price")}
                    className={cn(
                      "py-2.5 px-2 border-r cursor-pointer transition-colors min-w-[90px] max-w-[110px] text-right",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Đơn giá</span>
                      {sortField === "price" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "stock")?.visible && (
                  <th
                    onClick={() => handleSort("stockQuantity")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors min-w-[120px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Tồn kho & HSD</span>
                      {sortField === "stockQuantity" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "status")?.visible && (
                  <th
                    onClick={() => handleSort("isClosed")}
                    className={cn(
                      "py-2.5 px-3 border-r cursor-pointer transition-colors text-center min-w-[110px]",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:bg-slate-200/70 text-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Trạng thái</span>
                      {sortField === "isClosed" && (
                        sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                )}

                {columns.find((c) => c.id === "actions")?.visible && (
                  <th
                    className={cn(
                      "sticky right-0 top-0 z-30 py-2.5 px-3 text-center min-w-[110px] border-l shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)]",
                      isDarkMode
                        ? "bg-slate-900 border-slate-800 text-slate-300"
                        : "bg-slate-100 border-slate-300 text-slate-700"
                    )}
                  >
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-200")}>
              {paginatedDrugs.length > 0 ? (
                paginatedDrugs.map((drug, idx) => {
                  const globalIndex = (validCurrentPage - 1) * (pageSize === -1 ? 0 : pageSize) + idx + 1;
                  const isSelected = selectedIds.has(drug.id);

                  // Extract active ingredients string
                  const activeIngStr = (drug.activeIngredients || [])
                    .map((ai: any) =>
                      typeof ai === "string"
                        ? ai
                        : `${ai.name || ""} ${ai.amount || ""} ${ai.unit || ""}`.trim()
                    )
                    .filter(Boolean)
                    .join(", ");

                  // Extract primary group name
                  const groupNames = (drug.groupIds && drug.groupIds.length > 0 ? drug.groupIds : [drug.groupId])
                    .map((gid) => (gid ? groupsMap.get(gid) : ""))
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <tr
                      key={drug.id}
                      onClick={() => handleSelectRow(drug.id)}
                      className={cn(
                        "group transition-colors cursor-pointer select-none",
                        isSelected
                          ? isDarkMode
                            ? "bg-emerald-950/40 hover:bg-emerald-950/60"
                            : "bg-emerald-50/90 hover:bg-emerald-100/70"
                          : drug.isClosed
                          ? isDarkMode
                            ? "bg-slate-900/40 opacity-60 hover:opacity-90 hover:bg-slate-800/40"
                            : "bg-slate-50/70 opacity-65 hover:opacity-90 hover:bg-slate-100/60"
                          : idx % 2 === 0
                          ? isDarkMode
                            ? "bg-slate-900 hover:bg-slate-800/60"
                            : "bg-white hover:bg-slate-50"
                          : isDarkMode
                          ? "bg-slate-850/40 hover:bg-slate-800/60"
                          : "bg-slate-50/40 hover:bg-slate-50"
                      )}
                    >
                      {/* Selection Checkbox */}
                      <td
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(drug.id);
                        }}
                        className={cn(
                          "text-center border-r font-mono text-[11px] text-slate-400",
                          isDarkMode ? "border-slate-800 bg-slate-850/60" : "border-slate-200 bg-slate-100/40",
                          rowHeightClass
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* STT */}
                      {columns.find((c) => c.id === "stt")?.visible && (
                        <td
                          className={cn(
                            "text-center border-r font-mono text-slate-400 font-bold",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          {globalIndex}
                        </td>
                      )}

                      {/* Registration Number / SDK */}
                      {columns.find((c) => c.id === "regNumber")?.visible && (
                        <td
                          className={cn(
                            "border-r font-mono font-bold",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <div className="flex items-center justify-between gap-1 group/code">
                            <span
                              className={cn(
                                "truncate",
                                drug.registrationNumber
                                  ? isDarkMode
                                    ? "text-teal-400"
                                    : "text-teal-700"
                                  : "text-slate-400 italic"
                              )}
                            >
                              {drug.registrationNumber || drug.atcCode || "Chưa có SĐK"}
                            </span>
                            {drug.registrationNumber && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(drug.registrationNumber!, drug.id);
                                }}
                                className="opacity-0 group-hover/code:opacity-100 p-1 text-slate-400 hover:text-emerald-500 transition-opacity"
                                title="Sao chép mã"
                              >
                                {copiedId === drug.id ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Drug Name */}
                      {columns.find((c) => c.id === "name")?.visible && (
                        <td
                          className={cn(
                            "border-r font-bold",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {drug.avatarUrl ? (
                              <img
                                src={drug.avatarUrl}
                                alt=""
                                className={cn(
                                  "w-6 h-6 rounded-md object-cover shrink-0 border",
                                  isDarkMode ? "border-slate-700" : "border-slate-200"
                                )}
                              />
                            ) : (
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px]",
                                  drug.isRx
                                    ? isDarkMode
                                      ? "bg-rose-950 text-rose-300 font-black"
                                      : "bg-rose-100 text-rose-700 font-black"
                                    : isDarkMode
                                    ? "bg-slate-800 text-slate-300"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {drug.isRx ? "Rx" : <Pill size={13} />}
                              </div>
                            )}
                            <div className="truncate">
                              <span
                                className={cn(
                                  "hover:underline",
                                  isDarkMode ? "text-slate-100" : "text-slate-900"
                                )}
                              >
                                {drug.name}
                              </span>
                              {drug.manufacturer && (
                                <span className="block text-[10px] font-normal text-slate-400 truncate">
                                  {drug.manufacturer}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Active Ingredients */}
                      {columns.find((c) => c.id === "ingredients")?.visible && (
                        <td
                          className={cn(
                            "border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <span
                            className={cn(
                              "line-clamp-2",
                              activeIngStr ? "font-medium" : "text-slate-400 italic"
                            )}
                          >
                            {activeIngStr || "Chưa cập nhật hoạt chất"}
                          </span>
                        </td>
                      )}

                      {/* Drug Group */}
                      {columns.find((c) => c.id === "group")?.visible && (
                        <td
                          className={cn(
                            "border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold truncate max-w-[160px] border",
                              isDarkMode
                                ? "bg-slate-800 text-blue-300 border-slate-700"
                                : "bg-blue-50 text-blue-700 border-blue-200/80"
                            )}
                          >
                            {groupNames || drug.pharmacologicalGroup || "Khác"}
                          </span>
                        </td>
                      )}

                      {/* Dosage Form & Route */}
                      {columns.find((c) => c.id === "dosageForm")?.visible && (
                        <td
                          className={cn(
                            "border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold truncate">
                              {drug.dosageForm || "—"}
                            </span>
                            {drug.administrationRoute && (
                              <span className="text-[10px] text-slate-400 truncate">
                                Đường {drug.administrationRoute}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Packaging & Unit */}
                      {columns.find((c) => c.id === "packaging")?.visible && (
                        <td
                          className={cn(
                            "border-r px-2 text-center min-w-[70px] max-w-[90px]",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <div className="flex flex-col items-center justify-center">
                            {drug.unit ? (
                              <span
                                className={cn(
                                  "font-medium text-xs truncate max-w-full",
                                  isDarkMode ? "text-slate-200" : "text-slate-800"
                                )}
                              >
                                {drug.unit}
                              </span>
                            ) : (drug as any).packaging ? (
                              <span className="truncate text-xs text-slate-500">
                                {(drug as any).packaging}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Price & BHYT */}
                      {columns.find((c) => c.id === "price")?.visible && (
                        <td
                          className={cn(
                            "border-r text-right px-2 min-w-[90px] max-w-[110px]",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={cn(
                                "font-mono font-bold text-xs truncate max-w-full",
                                isDarkMode ? "text-emerald-400" : "text-emerald-600"
                              )}
                            >
                              {drug.price ? `${drug.price.toLocaleString("vi-VN")} đ` : "—"}
                            </span>
                            {Boolean((drug as any).isInsuranceCovered || (drug as any).bhyt) ? (
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.2 rounded",
                                  isDarkMode
                                    ? "bg-teal-950 text-teal-300"
                                    : "bg-teal-100 text-teal-800"
                                )}
                              >
                                BHYT
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400">Tự túc</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Stock & Expiry */}
                      {columns.find((c) => c.id === "stock")?.visible && (
                        <td
                          className={cn(
                            "border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                "font-mono font-bold",
                                drug.stockQuantity !== undefined && Number(drug.stockQuantity) <= 0
                                  ? "text-rose-500"
                                  : isDarkMode
                                  ? "text-slate-300"
                                  : "text-slate-700"
                              )}
                            >
                              {drug.stockQuantity !== undefined ? `${drug.stockQuantity} ${drug.unit || ""}` : "—"}
                            </span>
                            {drug.expiryDate && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                HSD: {drug.expiryDate}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      {columns.find((c) => c.id === "status")?.visible && (
                        <td
                          className={cn(
                            "border-r text-center",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canManage) onToggleClosed(drug);
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 transition-all border",
                              drug.isClosed
                                ? isDarkMode
                                  ? "bg-rose-950/80 text-rose-300 border-rose-800"
                                  : "bg-rose-100 text-rose-700 border-rose-300"
                                : isDarkMode
                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300",
                              canManage && "hover:scale-105 cursor-pointer"
                            )}
                            title={canManage ? "Bấm để đổi trạng thái lưu hành" : undefined}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                drug.isClosed ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                              )}
                            />
                            <span>{drug.isClosed ? "Tạm ngưng" : "Lưu hành"}</span>
                          </button>
                        </td>
                      )}

                      {/* Actions (Sticky Pinned Right) */}
                      {columns.find((c) => c.id === "actions")?.visible && (
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "sticky right-0 z-10 text-center border-l shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] min-w-[110px]",
                            isSelected
                              ? isDarkMode
                                ? "bg-emerald-950 group-hover:bg-emerald-950"
                                : "bg-emerald-50 group-hover:bg-emerald-100"
                              : drug.isClosed
                              ? isDarkMode
                                ? "bg-slate-900 group-hover:bg-slate-850"
                                : "bg-slate-50 group-hover:bg-slate-100"
                              : idx % 2 === 0
                              ? isDarkMode
                                ? "bg-slate-900 group-hover:bg-slate-800"
                                : "bg-white group-hover:bg-slate-50"
                              : isDarkMode
                              ? "bg-slate-850 group-hover:bg-slate-800"
                              : "bg-slate-50 group-hover:bg-slate-100/70",
                            isDarkMode ? "border-slate-800" : "border-slate-200",
                            rowHeightClass
                          )}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onViewDrugDetail(drug)}
                              className={cn(
                                "p-1 rounded-lg text-slate-400 hover:text-blue-500 transition-colors cursor-pointer",
                                isDarkMode ? "hover:bg-slate-800" : "hover:bg-blue-50"
                              )}
                              title="Xem chi tiết chuyên khảo"
                            >
                              <Eye size={14} />
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onEditDrug(drug)}
                                  className={cn(
                                    "p-1 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer",
                                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-emerald-50"
                                  )}
                                  title="Chỉnh sửa thông tin thuốc"
                                >
                                  <Edit2 size={14} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDeleteDrug(drug.id, drug.name, drug.pdfUrl)}
                                  className={cn(
                                    "p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer",
                                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-rose-50"
                                  )}
                                  title="Xóa thuốc khỏi danh mục"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
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
                    className="py-12 text-center text-slate-400 space-y-2"
                  >
                    <FileSpreadsheet size={32} className="mx-auto opacity-30 text-emerald-500" />
                    <p className="text-sm font-bold">Không tìm thấy thuốc nào khớp với bộ lọc</p>
                    <p className="text-xs text-slate-500">
                      Thử xóa bớt từ khóa hoặc thiết lập lại bộ lọc để xem toàn bộ danh mục
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedGroup("all");
                        setSelectedStatus("all");
                        setSelectedBhyt("all");
                        setSelectedRoute("all");
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors",
                        isDarkMode
                          ? "text-emerald-400 bg-slate-800 hover:bg-slate-700"
                          : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      )}
                    >
                      Đặt lại toàn bộ lọc
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. EXCEL STATUS BAR & PAGINATION */}
        <div
          className={cn(
            "w-full px-3 sm:px-4 py-2.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none",
            isDarkMode
              ? "bg-slate-900 border-slate-800 text-slate-400"
              : "bg-slate-100/80 border-slate-200 text-slate-600 font-medium"
          )}
        >
          {/* Status info */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              READY
            </span>
            <span
              className={cn(
                "hidden sm:inline border-l pl-3",
                isDarkMode ? "border-slate-700" : "border-slate-300"
              )}
            >
              Hiển thị{" "}
              <b className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
                {totalItems > 0 ? (validCurrentPage - 1) * (pageSize === -1 ? totalItems : pageSize) + 1 : 0}
              </b>{" "}
              -{" "}
              <b className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
                {pageSize === -1 ? totalItems : Math.min(validCurrentPage * pageSize, totalItems)}
              </b>{" "}
              trong tổng số <b className={isDarkMode ? "text-slate-100" : "text-slate-900"}>{totalItems}</b> thuốc
            </span>
          </div>

          {/* Page size & pagination controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Dòng/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200"
                    : "bg-white border-slate-300 text-slate-800"
                )}
              >
                <option value={15}>15 dòng</option>
                <option value={25}>25 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
                <option value={200}>200 dòng</option>
                <option value={-1}>Toàn bộ</option>
              </select>
            </div>

            {/* Pagination buttons */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  className={cn(
                    "p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer",
                    isDarkMode
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 hover:bg-slate-200 text-slate-700"
                  )}
                  title="Trang đầu"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className={cn(
                    "p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer",
                    isDarkMode
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 hover:bg-slate-200 text-slate-700"
                  )}
                  title="Trang trước"
                >
                  <ChevronLeft size={14} />
                </button>

                <span className={cn("px-2 font-mono font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                  {validCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className={cn(
                    "p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer",
                    isDarkMode
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 hover:bg-slate-200 text-slate-700"
                  )}
                  title="Trang sau"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage === totalPages}
                  className={cn(
                    "p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer",
                    isDarkMode
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 hover:bg-slate-200 text-slate-700"
                  )}
                  title="Trang cuối"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. MODAL PREVIEW IMPORT EXCEL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div
            className={cn(
              "w-full max-w-4xl max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
              isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "p-4 sm:p-5 border-b flex items-center justify-between",
                isDarkMode ? "border-slate-800" : "border-slate-200"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isDarkMode ? "bg-blue-950 text-blue-400" : "bg-blue-600/10 text-blue-600"
                  )}
                >
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black">Xem trước dữ liệu Nhập Excel</h3>
                  <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    File: <b>{importFileName}</b> ({importPreviewData.length} dòng dữ liệu)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDarkMode
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                )}
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Hệ thống đã nhận diện được các cột từ file Excel của bạn. Vui lòng kiểm tra lại trước khi lưu vào danh mục thuốc:
              </p>

              <div
                className={cn(
                  "border rounded-xl overflow-x-auto max-h-96",
                  isDarkMode ? "border-slate-800" : "border-slate-200"
                )}
              >
                <table className="w-full text-xs text-left border-collapse">
                  <thead
                    className={cn(
                      "sticky top-0 font-bold uppercase",
                      isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    <tr>
                      <th className={cn("p-2 border-r", isDarkMode ? "border-slate-700" : "border-slate-200")}>#</th>
                      <th className={cn("p-2 border-r", isDarkMode ? "border-slate-700" : "border-slate-200")}>Tên biệt dược</th>
                      <th className={cn("p-2 border-r", isDarkMode ? "border-slate-700" : "border-slate-200")}>SĐK / Mã</th>
                      <th className={cn("p-2 border-r", isDarkMode ? "border-slate-700" : "border-slate-200")}>Hoạt chất</th>
                      <th className={cn("p-2 border-r", isDarkMode ? "border-slate-700" : "border-slate-200")}>Bào chế</th>
                      <th className={cn("p-2 border-r", isDarkMode ? "border-slate-700" : "border-slate-200")}>Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y font-medium", isDarkMode ? "divide-slate-800" : "divide-slate-200")}>
                    {importPreviewData.slice(0, 50).map((row, i) => (
                      <tr
                        key={i}
                        className={cn(isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50")}
                      >
                        <td
                          className={cn(
                            "p-2 font-mono text-slate-400 border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200"
                          )}
                        >
                          {i + 1}
                        </td>
                        <td
                          className={cn(
                            "p-2 font-bold border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200"
                          )}
                        >
                          {row["Tên biệt dược"] || row["Tên thuốc"] || row["name"] || "—"}
                        </td>
                        <td
                          className={cn(
                            "p-2 font-mono border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200"
                          )}
                        >
                          {row["Mã thuốc / SĐK"] || row["Số đăng ký"] || row["registrationNumber"] || "—"}
                        </td>
                        <td
                          className={cn(
                            "p-2 border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200"
                          )}
                        >
                          {row["Hoạt chất & Hàm lượng"] || row["Hoạt chất"] || row["activeIngredients"] || "—"}
                        </td>
                        <td
                          className={cn(
                            "p-2 border-r",
                            isDarkMode ? "border-slate-800" : "border-slate-200"
                          )}
                        >
                          {row["Dạng bào chế"] || row["dosageForm"] || "—"}
                        </td>
                        <td
                          className={cn(
                            "p-2 font-mono",
                            isDarkMode ? "text-emerald-400" : "text-emerald-600"
                          )}
                        >
                          {row["Đơn giá (VNĐ)"] || row["Đơn giá"] || row["price"] || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importPreviewData.length > 50 && (
                <p className="text-[11px] text-slate-400 italic text-center">
                  Đang hiển thị trước 50/{importPreviewData.length} dòng. Toàn bộ {importPreviewData.length} dòng sẽ được lưu vào hệ thống.
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              className={cn(
                "p-4 border-t flex items-center justify-end gap-3",
                isDarkMode ? "border-slate-800" : "border-slate-200"
              )}
            >
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold border transition-colors",
                  isDarkMode
                    ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                    : "border-slate-300 hover:bg-slate-100 text-slate-700"
                )}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang nhập dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Xác nhận nhập ({importPreviewData.length} thuốc)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL BATCH DELETE CONFIRM */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div
            className={cn(
              "w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200",
              isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-black text-base">Xác nhận xóa hàng loạt?</h3>
                <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>

            <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
              Bạn có chắc chắn muốn xóa vĩnh viễn <b>{selectedIds.size}</b> thuốc đã chọn khỏi danh mục hệ thống không?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold border transition-colors",
                  isDarkMode
                    ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                    : "border-slate-300 hover:bg-slate-100 text-slate-700"
                )}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDelete}
                disabled={isBatchProcessing}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBatchProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
