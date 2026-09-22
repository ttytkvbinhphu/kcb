import React, { useState, useMemo } from "react";
import {
  Pill,
  FolderTree,
  Activity,
  Database,
  Briefcase,
  Star,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Search,
  X,
  ArrowLeft,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Folder,
  Baby,
  Scale,
  Droplets,
  Calendar,
  Check,
} from "lucide-react";
import { cn } from "../lib/utils";
import { DrugGroup } from "../types";
import { DualAgeRangeSlider } from "./DualAgeRangeSlider";
import { DualWeightRangeSlider } from "./DualWeightRangeSlider";
import { DualCrclRangeSlider } from "./DualCrclRangeSlider";

export interface DrugDirectorySidebarProps {
  viewMode:
    | "drugs"
    | "groups"
    | "ingredients"
    | "ingredient_categories"
    | "excipients"
    | "excipient_categories"
    | "companies";
  setViewMode: (
    mode:
      | "drugs"
      | "groups"
      | "ingredients"
      | "ingredient_categories"
      | "excipients"
      | "excipient_categories"
      | "companies"
  ) => void;
  canManage?: boolean;
  isDarkMode?: boolean;
  isManageDirectory?: boolean;
  totalDrugs: number;
  totalGroups: number;
  totalIngredients: number;
  favoriteOnlyFilter: boolean;
  setFavoriteOnlyFilter: (val: boolean | ((prev: boolean) => boolean)) => void;
  favoriteCount: number;
  stockFilter: string;
  setStockFilter: (status: string) => void;
  stockStats: {
    inStock?: number;
    available?: number;
    low: number;
    out: number;
    active?: number;
    suspended?: number;
    hidden?: number;
  };
  groupTypeTab?: "treatment" | "interaction";
  setGroupTypeTab?: (tab: "treatment" | "interaction") => void;
  ingredientView?: "search" | "manage" | "categories";
  setIngredientView?: (view: "search" | "manage" | "categories") => void;
  excipientView?: "excipients" | "categories";
  setExcipientView?: (view: "excipients" | "categories") => void;
  drugGroups: DrugGroup[];
  groupFilter: string;
  setGroupFilter: (group: string) => void;
  onOpenAddDrug?: () => void;
  featureSettings?: any;
  isDetailOpen?: boolean;
  activeDrugName?: string;
  onBackToDirectory?: () => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  searchMode?: "all" | "name" | "ingredient";
  setSearchMode?: (mode: "all" | "name" | "ingredient") => void;
  dosageFormFilter?: string;
  setDosageFormFilter?: (form: string) => void;
  uniqueDosageForms?: string[];
  statusFilter?: string;
  setStatusFilter?: (status: any) => void;
  statusFilters?: string[];
  setStatusFilters?: (statuses: string[]) => void;

  // Bộ lọc lâm sàng: Tuổi, Cân nặng, Lọc cầu thận (CrCl / eGFR)
  patientAge?: number | null;
  setPatientAge?: (val: number | null) => void;
  patientAgeMin?: number;
  setPatientAgeMin?: (val: number) => void;
  patientAgeMax?: number;
  setPatientAgeMax?: (val: number) => void;
  patientAgeUnit?: "years" | "months";
  setPatientAgeUnit?: (val: "years" | "months") => void;
  agePreset?: string;
  setAgePreset?: (val: string) => void;

  patientWeight?: number | null;
  setPatientWeight?: (val: number | null) => void;
  patientWeightMin?: number;
  setPatientWeightMin?: (val: number) => void;
  patientWeightMax?: number;
  setPatientWeightMax?: (val: number) => void;
  weightPreset?: string;
  setWeightPreset?: (val: string) => void;

  patientEgfr?: number | null;
  setPatientEgfr?: (val: number | null) => void;
  patientCrclMin?: number;
  setPatientCrclMin?: (val: number) => void;
  patientCrclMax?: number;
  setPatientCrclMax?: (val: number) => void;
  egfrPreset?: string;
  setEgfrPreset?: (val: string) => void;
}

export const DrugDirectorySidebar: React.FC<DrugDirectorySidebarProps> = ({
  viewMode,
  setViewMode,
  canManage = false,
  isDarkMode = false,
  isManageDirectory = false,
  totalDrugs,
  totalGroups,
  totalIngredients,
  favoriteOnlyFilter,
  setFavoriteOnlyFilter,
  favoriteCount,
  stockFilter,
  setStockFilter,
  stockStats,
  groupTypeTab = "treatment",
  setGroupTypeTab,
  ingredientView = "search",
  setIngredientView,
  excipientView = "excipients",
  setExcipientView,
  drugGroups,
  groupFilter,
  setGroupFilter,
  onOpenAddDrug,
  featureSettings,
  isDetailOpen = false,
  activeDrugName,
  onBackToDirectory,
  searchTerm = "",
  setSearchTerm,
  searchMode = "all",
  setSearchMode,
  dosageFormFilter = "all",
  setDosageFormFilter,
  uniqueDosageForms = [],
  statusFilter = "all",
  setStatusFilter,
  statusFilters = [],
  setStatusFilters,
  patientAge,
  setPatientAge,
  patientAgeMin = 0,
  setPatientAgeMin,
  patientAgeMax = 100,
  setPatientAgeMax,
  patientAgeUnit = "years",
  setPatientAgeUnit,
  agePreset = "all",
  setAgePreset,
  patientWeight,
  setPatientWeight,
  patientWeightMin = 0,
  setPatientWeightMin,
  patientWeightMax = 120,
  setPatientWeightMax,
  weightPreset = "all",
  setWeightPreset,
  patientEgfr,
  setPatientEgfr,
  patientCrclMin = 0,
  setPatientCrclMin,
  patientCrclMax = 120,
  setPatientCrclMax,
  egfrPreset = "all",
  setEgfrPreset,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("kcb_drug_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // State chuyển đổi giữa "Danh mục tra cứu" và "Bộ lọc tra cứu thuốc"
  const [sidebarMode, setSidebarMode] = useState<"categories" | "filters">("categories");
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [dosageFormSearchTerm, setDosageFormSearchTerm] = useState("");

  // Mặc định các bộ lọc đều ĐÓNG (collapsed) theo yêu cầu người dùng
  const [isStockSectionExpanded, setIsStockSectionExpanded] = useState(false);
  const [isGroupSectionExpanded, setIsGroupSectionExpanded] = useState(false);
  const [isDosageFormSectionExpanded, setIsDosageFormSectionExpanded] = useState(false);
  const [isAgeSectionExpanded, setIsAgeSectionExpanded] = useState(false);
  const [isWeightSectionExpanded, setIsWeightSectionExpanded] = useState(false);
  const [isRenalSectionExpanded, setIsRenalSectionExpanded] = useState(false);

  const isAgeFiltered = patientAgeMin > 0 || patientAgeMax < 100 || (patientAge !== null && patientAge !== undefined);
  const isWeightFiltered = patientWeightMin > 0 || patientWeightMax < 120 || (patientWeight !== null && patientWeight !== undefined);
  const isRenalFiltered = patientCrclMin > 0 || patientCrclMax < 120 || (patientEgfr !== null && patientEgfr !== undefined);

  // Danh sách các trạng thái đang được chọn (Multi-choice)
  const activeStatusFilters = useMemo(() => {
    if (statusFilters && statusFilters.length > 0) return statusFilters;
    if (statusFilter && statusFilter !== "all") {
      return statusFilter.includes(",") ? statusFilter.split(",") : [statusFilter];
    }
    return [];
  }, [statusFilters, statusFilter]);

  const handleToggleStatus = (statusId: string) => {
    if (isDetailOpen && onBackToDirectory) onBackToDirectory();
    if (viewMode !== "drugs") setViewMode("drugs");

    const exists = activeStatusFilters.includes(statusId);
    const nextFilters = exists
      ? activeStatusFilters.filter((id) => id !== statusId)
      : [...activeStatusFilters, statusId];

    if (setStatusFilters) {
      setStatusFilters(nextFilters);
    }
    if (setStatusFilter) {
      if (nextFilters.length === 1) {
        setStatusFilter(nextFilters[0]);
      } else if (nextFilters.length === 0) {
        setStatusFilter("all");
      } else {
        setStatusFilter(nextFilters.join(","));
      }
    }
  };

  const handleClearStatusFilters = () => {
    if (setStatusFilters) setStatusFilters([]);
    if (setStatusFilter) setStatusFilter("all");
  };

  // Tính số lượng bộ lọc đang kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (groupFilter && groupFilter !== "Tất cả") count++;
    if (stockFilter && stockFilter !== "all") count++;
    if (favoriteOnlyFilter) count++;
    if (dosageFormFilter && dosageFormFilter !== "all") count++;
    if (activeStatusFilters.length > 0) count++;
    if (patientAgeMin > 0 || patientAgeMax < 100) count++;
    else if (patientAge !== null && patientAge !== undefined) count++;
    else if (agePreset && agePreset !== "all") count++;
    if (patientWeightMin > 0 || patientWeightMax < 120) count++;
    else if (patientWeight !== null && patientWeight !== undefined) count++;
    else if (weightPreset && weightPreset !== "all") count++;
    if (patientCrclMin > 0 || patientCrclMax < 120) count++;
    else if (patientEgfr !== null && patientEgfr !== undefined) count++;
    else if (egfrPreset && egfrPreset !== "all") count++;
    return count;
  }, [
    groupFilter,
    stockFilter,
    favoriteOnlyFilter,
    dosageFormFilter,
    activeStatusFilters,
    patientAgeMin,
    patientAgeMax,
    patientAge,
    agePreset,
    patientWeightMin,
    patientWeightMax,
    patientWeight,
    weightPreset,
    patientCrclMin,
    patientCrclMax,
    patientEgfr,
    egfrPreset,
  ]);

  // Đặt lại toàn bộ bộ lọc
  const handleResetAllFilters = () => {
    setGroupFilter("Tất cả");
    setStockFilter("all");
    setFavoriteOnlyFilter(false);
    if (setDosageFormFilter) setDosageFormFilter("all");
    if (setStatusFilters) setStatusFilters([]);
    if (setStatusFilter) setStatusFilter("all");
    if (setSearchMode) setSearchMode("all");
    if (setPatientAgeMin) setPatientAgeMin(0);
    if (setPatientAgeMax) setPatientAgeMax(100);
    if (setPatientAge) setPatientAge(null);
    if (setPatientAgeUnit) setPatientAgeUnit("years");
    if (setAgePreset) setAgePreset("all");
    if (setPatientWeightMin) setPatientWeightMin(0);
    if (setPatientWeightMax) setPatientWeightMax(120);
    if (setPatientWeight) setPatientWeight(null);
    if (setWeightPreset) setWeightPreset("all");
    if (setPatientCrclMin) setPatientCrclMin(0);
    if (setPatientCrclMax) setPatientCrclMax(120);
    if (setPatientEgfr) setPatientEgfr(null);
    if (setEgfrPreset) setEgfrPreset("all");
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kcb_drug_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Lọc danh sách nhóm thuốc hiển thị trong sub-sidebar
  const filteredGroups = useMemo(() => {
    if (!groupSearchTerm.trim()) {
      return drugGroups.slice(0, 30);
    }
    const q = groupSearchTerm.toLowerCase();
    return drugGroups.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 30);
  }, [drugGroups, groupSearchTerm]);

  // Lọc danh sách dạng bào chế
  const filteredDosageForms = useMemo(() => {
    if (!uniqueDosageForms || uniqueDosageForms.length === 0) return [];
    if (!dosageFormSearchTerm.trim()) return uniqueDosageForms;
    const q = dosageFormSearchTerm.toLowerCase();
    return uniqueDosageForms.filter((f) => f.toLowerCase().includes(q));
  }, [uniqueDosageForms, dosageFormSearchTerm]);

  // Main menu items
  const mainMenuItems = [
    {
      id: "drugs" as const,
      label: featureSettings?.customTitle || "Biệt dược",
      icon: Pill,
      count: totalDrugs,
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
    {
      id: "groups" as const,
      label: "Nhóm thuốc",
      icon: FolderTree,
      count: totalGroups,
      badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    },
    {
      id: "ingredients" as const,
      label: "Hoạt chất",
      icon: Activity,
      count: totalIngredients > 0 ? totalIngredients : undefined,
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    ...(isManageDirectory && canManage
      ? [
          {
            id: "ingredient_categories" as const,
            label: "Phân loại Hoạt chất",
            icon: Layers,
            badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
          },
          {
            id: "excipients" as const,
            label: "Tá dược",
            icon: Database,
            badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          },
          {
            id: "companies" as const,
            label: "Công ty",
            icon: Briefcase,
            badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
          },
        ]
      : []),
  ];

  return (
    <aside
      id="drug-directory-left-sidebar"
      className={cn(
        "hidden lg:flex flex-col shrink-0 border-r transition-all duration-300 select-none z-20 sticky top-[54px] h-[calc(100vh-54px)]",
        isCollapsed ? "w-[60px]" : "w-64 xl:w-72",
        isDarkMode
          ? "bg-slate-950 border-slate-800 text-slate-200"
          : "bg-white border-slate-200/80 text-slate-800 shadow-xs"
      )}
    >
      {/* Header Sidebar */}
      <div
        className={cn(
          "flex items-center border-b px-3 h-[52px] shrink-0 transition-colors",
          isCollapsed ? "justify-center" : "justify-between",
          isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-slate-100 bg-slate-50/70"
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Pill size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-black uppercase tracking-wider truncate text-slate-900 dark:text-white leading-tight">
                {isManageDirectory ? "Quản lý thuốc" : "Tra cứu thuốc"}
              </h2>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                {totalDrugs} mặt hàng thuốc
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={toggleCollapse}
          className={cn(
            "p-1.5 rounded-lg transition-colors cursor-pointer shrink-0",
            isDarkMode
              ? "text-slate-400 hover:text-white hover:bg-slate-800"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          )}
          title={isCollapsed ? "Mở rộng thanh menu (PC)" : "Thu gọn thanh menu (PC)"}
          aria-label={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Thanh tìm kiếm thuốc - Chuyển qua Left Sidebar của Tra cứu thuốc */}
      {!isManageDirectory && setSearchTerm && (
        <div
          className={cn(
            "border-b transition-colors shrink-0",
            isCollapsed ? "p-2 flex justify-center" : "px-3 py-2.5",
            isDarkMode
              ? "border-slate-800/80 bg-slate-900/40"
              : "border-slate-100 bg-slate-50/80"
          )}
        >
          {!isCollapsed ? (
            <div className="space-y-2">
              <div
                onClick={() => {
                  if (sidebarMode !== "filters") {
                    setSidebarMode("filters");
                  }
                }}
                className={cn(
                  "flex items-center rounded-xl border transition-all h-[36px] px-2.5 gap-2 w-full cursor-text",
                  isDarkMode
                    ? "bg-slate-900 border-slate-750 text-slate-200 focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/30"
                    : "bg-white border-slate-200 text-slate-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 shadow-2xs"
                )}
              >
                <Search
                  size={14}
                  className={cn(
                    "shrink-0 transition-colors",
                    searchTerm ? "text-blue-500" : "text-slate-400"
                  )}
                />
                <input
                  type="text"
                  placeholder={
                    viewMode === "drugs"
                      ? searchMode === "all"
                        ? "Tìm tên, hoạt chất, ATC..."
                        : searchMode === "name"
                          ? "Tìm theo tên thuốc..."
                          : "Tìm theo hoạt chất..."
                      : "Tìm kiếm..."
                  }
                  className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full p-0 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  value={searchTerm || ""}
                  onFocus={() => {
                    if (sidebarMode !== "filters") {
                      setSidebarMode("filters");
                    }
                    if (isDetailOpen && onBackToDirectory) {
                      onBackToDirectory();
                    }
                  }}
                  onClick={() => {
                    if (sidebarMode !== "filters") {
                      setSidebarMode("filters");
                    }
                    if (isDetailOpen && onBackToDirectory) {
                      onBackToDirectory();
                    }
                  }}
                  onChange={(e) => {
                    if (isDetailOpen && onBackToDirectory) {
                      onBackToDirectory();
                    }
                    if (sidebarMode !== "filters") {
                      setSidebarMode("filters");
                    }
                    setSearchTerm?.(e.target.value);
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm?.("");
                    }}
                    title="Xóa nhanh từ khóa"
                    className={cn(
                      "p-1 rounded-md text-[10px] font-bold transition-all flex items-center cursor-pointer shrink-0",
                      isDarkMode ? "text-rose-400 hover:bg-slate-800" : "text-rose-500 hover:bg-slate-100"
                    )}
                  >
                    <X size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarMode((prev) => (prev === "filters" ? "categories" : "filters"));
                  }}
                  title={sidebarMode === "filters" ? "Xem danh mục tra cứu" : "Mở bộ lọc tra cứu thuốc"}
                  className={cn(
                    "p-1 rounded-md transition-all flex items-center justify-center shrink-0 cursor-pointer",
                    sidebarMode === "filters"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : isDarkMode
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Filter size={13} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                toggleCollapse();
                setSidebarMode("filters");
              }}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer",
                searchTerm || sidebarMode === "filters"
                  ? "bg-blue-600 text-white shadow-xs"
                  : isDarkMode
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              )}
              title={searchTerm ? `Từ khóa: "${searchTerm}" (Nhấn để mở bộ lọc)` : "Mở bộ lọc tra cứu thuốc"}
            >
              <Search size={15} />
            </button>
          )}
        </div>
      )}

      {/* Thông báo đang xem chi tiết thuốc */}
      {isDetailOpen && activeDrugName && !isCollapsed && (
        <div
          className={cn(
            "mx-3 mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-2 shrink-0",
            isDarkMode
              ? "bg-blue-950/40 border-blue-900/60 text-blue-300"
              : "bg-blue-50 border-blue-100 text-blue-700"
          )}
        >
          <div className="min-w-0 flex-1">
            <span className="text-[9.5px] font-black uppercase tracking-wider block opacity-70">
              Đang xem chi tiết
            </span>
            <p className="text-xs font-bold truncate leading-tight mt-0.5">{activeDrugName}</p>
          </div>
          {onBackToDirectory && (
            <button
              type="button"
              onClick={onBackToDirectory}
              className={cn(
                "p-1.5 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 cursor-pointer",
                isDarkMode
                  ? "bg-blue-600 text-white hover:bg-blue-500 shadow-xs"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              )}
              title="Quay lại danh sách tìm kiếm"
            >
              <ArrowLeft size={13} />
              <span className="text-[10px]">Danh sách</span>
            </button>
          )}
        </div>
      )}

      {/* Main Body List - Scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-2 space-y-3">
        {sidebarMode === "categories" || isCollapsed ? (
          <>
            {/* Section: Sub Menu Chế độ xem */}
            <div>
              {!isCollapsed && (
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Danh mục tra cứu
                  </span>
                  {!isManageDirectory && (
                    <button
                      type="button"
                      onClick={() => setSidebarMode("filters")}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Filter size={11} />
                      <span>Bộ lọc</span>
                      {activeFiltersCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-blue-600 text-white">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}

          <div className="space-y-1">
            {mainMenuItems.map((item) => {
              const isActive = viewMode === item.id;
              const IconComp = item.icon;

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDetailOpen && onBackToDirectory) {
                        onBackToDirectory();
                      }
                      setViewMode(item.id);
                    }}
                    className={cn(
                      "w-full flex items-center rounded-lg transition-all text-xs font-bold group cursor-pointer relative select-none",
                      isCollapsed ? "justify-center p-2.5 min-h-[44px]" : "justify-between px-2.5 py-2",
                      isActive
                        ? isDarkMode
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                          : "bg-blue-50 text-blue-600 border border-blue-100 font-black shadow-2xs"
                        : isDarkMode
                          ? "text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                    )}
                    title={item.label}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComp
                        size={17}
                        className={cn(
                          "shrink-0 transition-transform group-hover:scale-105",
                          isActive
                            ? isDarkMode
                              ? "text-blue-400"
                              : "text-blue-600"
                            : "text-slate-400 group-hover:text-current"
                        )}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.count !== undefined && (
                      <span
                        className={cn(
                          "text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5",
                          item.badgeColor
                        )}
                      >
                        {item.count}
                      </span>
                    )}

                    {/* Active bar indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />
                    )}
                  </button>

                  {/* Sub-items for "Biệt dược" when active & not collapsed */}
                  {item.id === "drugs" && isActive && !isCollapsed && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-blue-200 dark:border-blue-900/50 ml-3.5 my-1">
                      {/* Tất cả */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                          setStockFilter("all");
                          setFavoriteOnlyFilter(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          stockFilter === "all" && !favoriteOnlyFilter
                            ? isDarkMode
                              ? "bg-blue-500/20 text-blue-300 font-bold"
                              : "bg-blue-100/70 text-blue-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Layers size={13} className="shrink-0 text-slate-400" />
                          <span>Tất cả thuốc</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">{totalDrugs}</span>
                      </button>

                      {/* Thuốc yêu thích */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                          setFavoriteOnlyFilter((prev) => !prev);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          favoriteOnlyFilter
                            ? "bg-amber-500/20 text-amber-500 font-bold ring-1 ring-amber-400/40"
                            : isDarkMode
                              ? "text-slate-400 hover:text-amber-400 hover:bg-slate-900"
                              : "text-slate-600 hover:text-amber-600 hover:bg-slate-100"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Star
                            size={13}
                            className={cn(
                              "shrink-0",
                              favoriteOnlyFilter || favoriteCount > 0
                                ? "fill-amber-400 text-amber-500"
                                : "text-slate-400"
                            )}
                          />
                          <span>Thuốc yêu thích</span>
                        </span>
                        {favoriteCount > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-white shrink-0">
                            {favoriteCount}
                          </span>
                        )}
                      </button>

                      {/* Còn thuốc */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                          setStockFilter(stockFilter === "available" ? "all" : "available");
                          setFavoriteOnlyFilter(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          stockFilter === "available" && !favoriteOnlyFilter
                            ? isDarkMode
                              ? "bg-emerald-500/20 text-emerald-400 font-bold"
                              : "bg-emerald-50 text-emerald-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Còn thuốc</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {stockStats.available ?? stockStats.inStock ?? 0}
                        </span>
                      </button>

                      {/* Sắp hết */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                          setStockFilter(stockFilter === "low" ? "all" : "low");
                          setFavoriteOnlyFilter(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          stockFilter === "low" && !favoriteOnlyFilter
                            ? isDarkMode
                              ? "bg-amber-500/20 text-amber-400 font-bold"
                              : "bg-amber-50 text-amber-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span>Sắp hết</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                          {stockStats.low}
                        </span>
                      </button>

                      {/* Hết thuốc */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                          setStockFilter(stockFilter === "out" ? "all" : "out");
                          setFavoriteOnlyFilter(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          stockFilter === "out" && !favoriteOnlyFilter
                            ? isDarkMode
                              ? "bg-rose-500/20 text-rose-400 font-bold"
                              : "bg-rose-50 text-rose-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span>Hết thuốc</span>
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0">
                          {stockStats.out}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Sub-items for "Nhóm thuốc" when active & not collapsed */}
                  {item.id === "groups" && isActive && !isCollapsed && setGroupTypeTab && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-indigo-200 dark:border-indigo-900/50 ml-3.5 my-1">
                      <button
                        type="button"
                        onClick={() => setGroupTypeTab("treatment")}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          groupTypeTab === "treatment"
                            ? isDarkMode
                              ? "bg-indigo-500/20 text-indigo-300 font-bold"
                              : "bg-indigo-50 text-indigo-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate">Phân loại điều trị</span>
                        {groupTypeTab === "treatment" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setGroupTypeTab("interaction")}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          groupTypeTab === "interaction"
                            ? isDarkMode
                              ? "bg-indigo-500/20 text-indigo-300 font-bold"
                              : "bg-indigo-50 text-indigo-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate">Phân loại tác dụng</span>
                        {groupTypeTab === "interaction" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Sub-items for "Hoạt chất" when active & not collapsed */}
                  {item.id === "ingredients" && isActive && !isCollapsed && setIngredientView && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-emerald-200 dark:border-emerald-900/50 ml-3.5 my-1">
                      <button
                        type="button"
                        onClick={() => setIngredientView("search")}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          ingredientView === "search"
                            ? isDarkMode
                              ? "bg-emerald-500/20 text-emerald-300 font-bold"
                              : "bg-emerald-50 text-emerald-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate">Tra cứu hoạt chất</span>
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => setIngredientView("manage")}
                            className={cn(
                              "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                              ingredientView === "manage"
                                ? isDarkMode
                                  ? "bg-emerald-500/20 text-emerald-300 font-bold"
                                  : "bg-emerald-50 text-emerald-700 font-bold"
                                : isDarkMode
                                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                          >
                            <span className="truncate">Quản lý hoạt chất</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIngredientView("categories")}
                            className={cn(
                              "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                              ingredientView === "categories"
                                ? isDarkMode
                                  ? "bg-emerald-500/20 text-emerald-300 font-bold"
                                  : "bg-emerald-50 text-emerald-700 font-bold"
                                : isDarkMode
                                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                          >
                            <span className="truncate">Phân loại hoạt chất</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Sub-items for "Tá dược" when active & not collapsed */}
                  {item.id === "excipients" && isActive && !isCollapsed && setExcipientView && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-amber-200 dark:border-amber-900/50 ml-3.5 my-1">
                      <button
                        type="button"
                        onClick={() => setExcipientView("excipients")}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          excipientView === "excipients"
                            ? isDarkMode
                              ? "bg-amber-500/20 text-amber-300 font-bold"
                              : "bg-amber-50 text-amber-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate">Danh sách tá dược</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExcipientView("categories")}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer select-none",
                          excipientView === "categories"
                            ? isDarkMode
                              ? "bg-amber-500/20 text-amber-300 font-bold"
                              : "bg-amber-50 text-amber-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate">Phân loại tá dược</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Lọc nhanh theo Nhóm thuốc (Khi ở viewMode === 'drugs' và không thu gọn) */}
        {!isCollapsed && viewMode === "drugs" && drugGroups.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <button
                type="button"
                onClick={() => setIsGroupSectionExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {isGroupSectionExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>Lọc nhóm thuốc</span>
              </button>

              {groupFilter !== "Tất cả" && (
                <button
                  type="button"
                  onClick={() => setGroupFilter("Tất cả")}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {isGroupSectionExpanded && (
              <div className="space-y-1">
                {/* Ô tìm kiếm nhóm nhanh */}
                <div className="relative px-1 mb-1.5">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    placeholder="Tìm nhóm..."
                    className={cn(
                      "w-full pl-7 pr-6 py-1 text-[11px] rounded-md border transition-all outline-none",
                      isDarkMode
                        ? "bg-slate-900/80 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-500"
                    )}
                  />
                  {groupSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setGroupSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Danh sách các nhóm thuốc */}
                <div className="max-h-48 overflow-y-auto no-scrollbar space-y-0.5 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setGroupFilter("Tất cả");
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors truncate cursor-pointer select-none",
                      groupFilter === "Tất cả"
                        ? isDarkMode
                          ? "bg-blue-600/20 text-blue-400 font-bold"
                          : "bg-blue-50 text-blue-600 font-bold"
                        : isDarkMode
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    Tất cả nhóm thuốc
                  </button>

                  {filteredGroups.map((group) => {
                    const isSelected = groupFilter === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                          setGroupFilter(group.id);
                        }}
                        title={group.name}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors truncate flex items-center cursor-pointer select-none",
                          isSelected
                            ? isDarkMode
                              ? "bg-blue-600/20 text-blue-400 font-bold"
                              : "bg-blue-50 text-blue-600 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        {group.level > 0 && (
                          <span className="text-slate-400 mr-1 text-[9px] shrink-0">
                            {"\u00A0".repeat(group.level * 2)}└
                          </span>
                        )}
                        <span className="truncate">{group.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
          </>
        ) : (
          /* BỘ LỌC TRA CỨU THUỐC (Hiển thị khi tìm kiếm hoặc lọc ở Left Sidebar) */
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Thanh đặt lại bộ lọc - Chỉ hiển thị khi có bộ lọc đang kích hoạt */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                <span className="text-[10.5px] font-bold text-blue-700 dark:text-blue-300">
                  {activeFiltersCount} tiêu chí đang lọc
                </span>
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="flex items-center gap-1 text-[10px] font-black text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  title="Xóa tất cả tiêu chí lọc"
                >
                  <RotateCcw size={11} />
                  <span>Đặt lại</span>
                </button>
              </div>
            )}

            {/* 1. Phạm vi tìm kiếm */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <div className="w-1 h-3 bg-blue-500 rounded-full" />
                <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Phạm vi tìm kiếm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "name", label: "Tên thuốc" },
                  { id: "ingredient", label: "Hoạt chất" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setSearchMode?.(mode.id as any);
                    }}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-[10.5px] font-black text-center transition-all cursor-pointer select-none",
                      searchMode === mode.id
                        ? "bg-blue-600 text-white shadow-2xs"
                        : isDarkMode
                          ? "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                          : "bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tồn kho & Yêu thích */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setIsStockSectionExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-1 py-0.5 text-left cursor-pointer hover:opacity-85 transition-opacity select-none group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full shrink-0" />
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Tồn kho & Yêu thích
                  </span>
                  {(stockFilter !== "all" || favoriteOnlyFilter) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </div>
                <ChevronDown
                  size={13}
                  className={cn(
                    "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0",
                    !isStockSectionExpanded && "-rotate-90"
                  )}
                />
              </button>

              {isStockSectionExpanded && (
                <div className="space-y-1 animate-in fade-in duration-150">
                  {/* Tất cả thuốc */}
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setStockFilter("all");
                      setFavoriteOnlyFilter(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                      stockFilter === "all" && !favoriteOnlyFilter
                        ? isDarkMode
                          ? "bg-blue-600/20 text-blue-300 border border-blue-500/40 font-black"
                          : "bg-blue-50 text-blue-700 border border-blue-200 font-black shadow-2xs"
                        : isDarkMode
                          ? "text-slate-300 hover:bg-slate-900 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Layers size={14} className="text-slate-400 shrink-0" />
                      <span>Tất cả thuốc</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{totalDrugs}</span>
                  </button>

                  {/* Thuốc yêu thích */}
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setFavoriteOnlyFilter((prev) => !prev);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                      favoriteOnlyFilter
                        ? "bg-amber-500/20 text-amber-500 border border-amber-400/50 font-black shadow-2xs"
                        : isDarkMode
                          ? "text-slate-300 hover:bg-slate-900 hover:text-amber-400"
                          : "text-slate-600 hover:bg-slate-100 hover:text-amber-600"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Star
                        size={14}
                        className={cn(
                          "shrink-0",
                          favoriteOnlyFilter || favoriteCount > 0
                            ? "fill-amber-400 text-amber-500"
                            : "text-slate-400"
                        )}
                      />
                      <span>Thuốc yêu thích</span>
                    </span>
                    <span className="text-[10px] font-black text-amber-500 shrink-0">{favoriteCount}</span>
                  </button>

                  {/* Còn thuốc */}
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setFavoriteOnlyFilter(false);
                      setStockFilter(
                        stockFilter === "inStock" || stockFilter === "available" ? "all" : "inStock"
                      );
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                      (stockFilter === "inStock" || stockFilter === "available") && !favoriteOnlyFilter
                        ? isDarkMode
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 font-black shadow-2xs"
                        : isDarkMode
                          ? "text-slate-300 hover:bg-slate-900 hover:text-emerald-400"
                          : "text-slate-600 hover:bg-slate-100 hover:text-emerald-600"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>Còn thuốc</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {stockStats.inStock ?? stockStats.available ?? 0}
                    </span>
                  </button>

                  {/* Sắp hết */}
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setFavoriteOnlyFilter(false);
                      setStockFilter(stockFilter === "low" ? "all" : "low");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                      stockFilter === "low" && !favoriteOnlyFilter
                        ? isDarkMode
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black"
                          : "bg-amber-50 text-amber-700 border border-amber-200 font-black shadow-2xs"
                        : isDarkMode
                          ? "text-slate-300 hover:bg-slate-900 hover:text-amber-400"
                          : "text-slate-600 hover:bg-slate-100 hover:text-amber-600"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <AlertCircle size={14} className="text-amber-500 shrink-0" />
                      <span>Sắp hết</span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                      {stockStats.low}
                    </span>
                  </button>

                  {/* Hết thuốc */}
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setFavoriteOnlyFilter(false);
                      setStockFilter(stockFilter === "out" ? "all" : "out");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                      stockFilter === "out" && !favoriteOnlyFilter
                        ? isDarkMode
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black"
                          : "bg-rose-50 text-rose-700 border border-rose-200 font-black shadow-2xs"
                        : isDarkMode
                          ? "text-slate-300 hover:bg-slate-900 hover:text-rose-400"
                          : "text-slate-600 hover:bg-slate-100 hover:text-rose-600"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <XCircle size={14} className="text-rose-500 shrink-0" />
                      <span>Hết thuốc</span>
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0">
                      {stockStats.out}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Lọc theo Nhóm thuốc */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => setIsGroupSectionExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-left cursor-pointer hover:opacity-85 transition-opacity select-none group flex-1 min-w-0 mr-1"
                >
                  <div className="w-1 h-3 bg-teal-500 rounded-full shrink-0" />
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Nhóm thuốc
                  </span>
                  {groupFilter !== "Tất cả" && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-teal-600 text-white shrink-0">
                      1
                    </span>
                  )}
                  <ChevronDown
                    size={13}
                    className={cn(
                      "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ml-0.5",
                      !isGroupSectionExpanded && "-rotate-90"
                    )}
                  />
                </button>
                {groupFilter !== "Tất cả" && (
                  <button
                    type="button"
                    onClick={() => setGroupFilter("Tất cả")}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer shrink-0"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {isGroupSectionExpanded && (
                <div className="space-y-1 animate-in fade-in duration-150">
                  {/* Tìm nhóm thuốc nhanh */}
                  <div className="relative px-1 mb-1">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      placeholder="Tìm nhóm thuốc..."
                      className={cn(
                        "w-full pl-7 pr-6 py-1 text-[11px] rounded-md border transition-all outline-none",
                        isDarkMode
                          ? "bg-slate-900/80 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-500"
                      )}
                    />
                    {groupSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setGroupSearchTerm("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Danh sách các nhóm thuốc */}
                  <div className="max-h-48 overflow-y-auto no-scrollbar space-y-0.5 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (viewMode !== "drugs") setViewMode("drugs");
                        if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                        setGroupFilter("Tất cả");
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors truncate cursor-pointer select-none",
                        groupFilter === "Tất cả"
                          ? isDarkMode
                            ? "bg-teal-600/20 text-teal-400 font-bold"
                            : "bg-teal-50 text-teal-700 font-bold"
                          : isDarkMode
                            ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      Tất cả nhóm thuốc
                    </button>

                    {filteredGroups.map((group) => {
                      const isSelected = groupFilter === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            if (viewMode !== "drugs") setViewMode("drugs");
                            if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                            setGroupFilter(group.id);
                          }}
                          title={group.name}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors truncate flex items-center cursor-pointer select-none",
                            isSelected
                              ? isDarkMode
                                ? "bg-teal-600/20 text-teal-400 font-bold"
                                : "bg-teal-50 text-teal-700 font-bold"
                              : isDarkMode
                                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          )}
                        >
                          {group.level > 0 && (
                            <span className="text-slate-400 mr-1 text-[9px] shrink-0">
                              {"\u00A0".repeat(group.level * 2)}└
                            </span>
                          )}
                          <span className="truncate">{group.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Lọc theo Dạng bào chế */}
            {uniqueDosageForms && uniqueDosageForms.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => setIsDosageFormSectionExpanded((prev) => !prev)}
                    className="flex items-center gap-1.5 text-left cursor-pointer hover:opacity-85 transition-opacity select-none group flex-1 min-w-0 mr-1"
                  >
                    <div className="w-1 h-3 bg-purple-500 rounded-full shrink-0" />
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      Dạng bào chế
                    </span>
                    {dosageFormFilter && dosageFormFilter !== "all" && (
                      <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-purple-600 text-white shrink-0">
                        1
                      </span>
                    )}
                    <ChevronDown
                      size={13}
                      className={cn(
                        "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ml-0.5",
                        !isDosageFormSectionExpanded && "-rotate-90"
                      )}
                    />
                  </button>
                  {dosageFormFilter && dosageFormFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setDosageFormFilter?.("all")}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer shrink-0"
                    >
                      Xóa lọc
                    </button>
                  )}
                </div>

                {isDosageFormSectionExpanded && (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    {uniqueDosageForms.length > 5 && (
                      <div className="relative px-1 mb-1">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={dosageFormSearchTerm}
                          onChange={(e) => setDosageFormSearchTerm(e.target.value)}
                          placeholder="Tìm dạng bào chế..."
                          className={cn(
                            "w-full pl-7 pr-6 py-1 text-[11px] rounded-md border transition-all outline-none",
                            isDarkMode
                              ? "bg-slate-900/80 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-blue-500"
                              : "bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-500"
                          )}
                        />
                        {dosageFormSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setDosageFormSearchTerm("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="max-h-40 overflow-y-auto no-scrollbar space-y-0.5 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (viewMode !== "drugs") setViewMode("drugs");
                          if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                          setDosageFormFilter?.("all");
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors truncate cursor-pointer select-none",
                          dosageFormFilter === "all"
                            ? isDarkMode
                              ? "bg-purple-600/20 text-purple-400 font-bold"
                              : "bg-purple-50 text-purple-700 font-bold"
                            : isDarkMode
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        Tất cả bào chế
                      </button>
                      {filteredDosageForms.map((form) => {
                        const isSelected = dosageFormFilter === form;
                        return (
                          <button
                            key={form}
                            type="button"
                            onClick={() => {
                              if (viewMode !== "drugs") setViewMode("drugs");
                              if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                              setDosageFormFilter?.(form);
                            }}
                            title={form}
                            className={cn(
                              "w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors truncate cursor-pointer select-none",
                              isSelected
                                ? isDarkMode
                                  ? "bg-purple-600/20 text-purple-400 font-bold"
                                  : "bg-purple-50 text-purple-700 font-bold"
                                : isDarkMode
                                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                          >
                            {form}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bộ lọc Tuổi (Độ tuổi bệnh nhân) - Thanh ngang có 2 dấu chấm đầu và cuối */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => setIsAgeSectionExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-left cursor-pointer hover:opacity-85 transition-opacity select-none group flex-1 min-w-0 mr-1"
                >
                  <div className="w-1 h-3 bg-sky-500 rounded-full shrink-0" />
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Tuổi bệnh nhân
                  </span>
                  {isAgeFiltered && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-sky-600 text-white shrink-0">
                      {patientAgeMin === patientAgeMax
                        ? `${patientAgeMin}t`
                        : patientAgeMax >= 100
                        ? `≥ ${patientAgeMin}t`
                        : patientAgeMin === 0
                        ? `≤ ${patientAgeMax}t`
                        : `${patientAgeMin} - ${patientAgeMax}t`}
                    </span>
                  )}
                  <ChevronDown
                    size={13}
                    className={cn(
                      "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ml-auto",
                      !isAgeSectionExpanded && "-rotate-90"
                    )}
                  />
                </button>

                {isAgeFiltered && (
                  <button
                    type="button"
                    onClick={() => {
                      setPatientAgeMin?.(0);
                      setPatientAgeMax?.(100);
                      setPatientAge?.(null);
                      setAgePreset?.("all");
                    }}
                    className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-bold shrink-0"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {isAgeSectionExpanded && (
                <div className="space-y-2 animate-in fade-in duration-150 px-1 pt-1">
                  <DualAgeRangeSlider
                    minAge={patientAgeMin}
                    maxAge={patientAgeMax}
                    onChange={(min, max) => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setPatientAgeMin?.(min);
                      setPatientAgeMax?.(max);
                      if (min === 0 && max === 100) {
                        setPatientAge?.(null);
                        setAgePreset?.("all");
                      } else {
                        setPatientAge?.(min === max ? min : null);
                        setAgePreset?.("custom");
                      }
                    }}
                    isDarkMode={isDarkMode}
                  />
                  <div className="text-[9.5px] text-slate-400 leading-tight">
                    Kéo 2 dấu chấm để chọn khoảng tuổi. Hệ thống tự động lọc thuốc phù hợp & loại trừ thuốc chống chỉ định.
                  </div>
                </div>
              )}
            </div>

            {/* Bộ lọc Cân nặng - Thanh ngang có 2 dấu chấm đầu và cuối */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => setIsWeightSectionExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-left cursor-pointer hover:opacity-85 transition-opacity select-none group flex-1 min-w-0 mr-1"
                >
                  <div className="w-1 h-3 bg-amber-500 rounded-full shrink-0" />
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Cân nặng (kg)
                  </span>
                  {isWeightFiltered && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-amber-600 text-white shrink-0">
                      {patientWeightMin === patientWeightMax
                        ? `${patientWeightMin}kg`
                        : patientWeightMax >= 120
                        ? `≥ ${patientWeightMin}kg`
                        : patientWeightMin === 0
                        ? `≤ ${patientWeightMax}kg`
                        : `${patientWeightMin} - ${patientWeightMax}kg`}
                    </span>
                  )}
                  <ChevronDown
                    size={13}
                    className={cn(
                      "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ml-auto",
                      !isWeightSectionExpanded && "-rotate-90"
                    )}
                  />
                </button>

                {isWeightFiltered && (
                  <button
                    type="button"
                    onClick={() => {
                      setPatientWeightMin?.(0);
                      setPatientWeightMax?.(120);
                      setPatientWeight?.(null);
                      setWeightPreset?.("all");
                    }}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold shrink-0 cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {isWeightSectionExpanded && (
                <div className="space-y-2 animate-in fade-in duration-150 px-1 pt-1">
                  <DualWeightRangeSlider
                    minWeight={patientWeightMin}
                    maxWeight={patientWeightMax}
                    onChange={(min, max) => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setPatientWeightMin?.(min);
                      setPatientWeightMax?.(max);
                      if (min === 0 && max === 120) {
                        setPatientWeight?.(null);
                        setWeightPreset?.("all");
                      } else {
                        setPatientWeight?.(min === max ? min : null);
                        setWeightPreset?.("custom");
                      }
                    }}
                    isDarkMode={isDarkMode}
                  />
                  <div className="text-[9.5px] text-slate-400 leading-tight">
                    Kéo 2 dấu chấm để chọn khoảng cân nặng. Hệ thống tự động lọc thuốc phù hợp thể trọng & loại trừ thuốc chống chỉ định.
                  </div>
                </div>
              )}
            </div>

            {/* Bộ lọc Mức lọc cầu thận (eGFR / CrCl) - Thanh ngang có 2 dấu chấm đầu và cuối */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => setIsRenalSectionExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-left cursor-pointer hover:opacity-85 transition-opacity select-none group flex-1 min-w-0 mr-1"
                >
                  <div className="w-1 h-3 bg-rose-500 rounded-full shrink-0" />
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Lọc cầu thận (CrCl)
                  </span>
                  {isRenalFiltered && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-rose-600 text-white shrink-0">
                      {patientCrclMin === patientCrclMax
                        ? `${patientCrclMin} mL/p`
                        : patientCrclMax >= 120
                        ? `≥ ${patientCrclMin} mL/p`
                        : patientCrclMin === 0
                        ? `≤ ${patientCrclMax} mL/p`
                        : `${patientCrclMin} - ${patientCrclMax} mL/p`}
                    </span>
                  )}
                  <ChevronDown
                    size={13}
                    className={cn(
                      "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ml-auto",
                      !isRenalSectionExpanded && "-rotate-90"
                    )}
                  />
                </button>

                {isRenalFiltered && (
                  <button
                    type="button"
                    onClick={() => {
                      setPatientCrclMin?.(0);
                      setPatientCrclMax?.(120);
                      setPatientEgfr?.(null);
                      setEgfrPreset?.("all");
                    }}
                    className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold shrink-0 cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {isRenalSectionExpanded && (
                <div className="space-y-2 animate-in fade-in duration-150 px-1 pt-1">
                  <DualCrclRangeSlider
                    minCrcl={patientCrclMin}
                    maxCrcl={patientCrclMax}
                    onChange={(min, max) => {
                      if (viewMode !== "drugs") setViewMode("drugs");
                      if (isDetailOpen && onBackToDirectory) onBackToDirectory();
                      setPatientCrclMin?.(min);
                      setPatientCrclMax?.(max);
                      if (min === 0 && max === 120) {
                        setPatientEgfr?.(null);
                        setEgfrPreset?.("all");
                      } else {
                        setPatientEgfr?.(min === max ? min : null);
                        setEgfrPreset?.("custom");
                      }
                    }}
                    isDarkMode={isDarkMode}
                  />
                  <div className="text-[9.5px] text-slate-400 leading-tight">
                    Kéo 2 dấu chấm để chọn khoảng CrCl / eGFR. Hệ thống lọc thuốc phù hợp chức năng thận & loại trừ thuốc chống chỉ định.
                  </div>
                </div>
              )}
            </div>

            {/* 5. Trạng thái: Dạng đánh dấu ô vuông multi-choice (Hoạt động, Tạm ngưng, Sắp hết, Hết thuốc) */}
            {(setStatusFilter || setStatusFilters) && (
              <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-1 h-3 bg-indigo-500 rounded-full shrink-0" />
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">
                      Trạng thái
                    </span>
                    {activeStatusFilters.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                        {activeStatusFilters.length}
                      </span>
                    )}
                  </div>
                  {activeStatusFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearStatusFilters}
                      className="text-[9.5px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer select-none"
                      title="Bỏ chọn tất cả trạng thái"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>

                <div className="space-y-1 px-0.5">
                  {[
                    {
                      id: "active",
                      label: "Hoạt động",
                      dotClass: "bg-emerald-500",
                      checkedBoxClass: "bg-emerald-600 border-emerald-600 text-white",
                      count: stockStats?.active,
                      countClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
                      description: "Thuốc đang hoạt động & lưu hành",
                    },
                    {
                      id: "suspended",
                      label: "Tạm ngưng",
                      dotClass: "bg-amber-500",
                      checkedBoxClass: "bg-amber-600 border-amber-600 text-white",
                      count: stockStats?.suspended,
                      countClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
                      description: "Thuốc tạm ngưng cấp phát / sử dụng",
                    },
                    {
                      id: "low",
                      label: "Sắp hết",
                      dotClass: "bg-orange-500",
                      checkedBoxClass: "bg-orange-500 border-orange-500 text-white",
                      count: stockStats?.low,
                      countClass: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40",
                      description: "Thuốc cảnh báo tồn kho sắp hết",
                    },
                    {
                      id: "out",
                      label: "Hết thuốc",
                      dotClass: "bg-rose-500",
                      checkedBoxClass: "bg-rose-600 border-rose-600 text-white",
                      count: stockStats?.out,
                      countClass: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40",
                      description: "Thuốc đã hết tồn kho",
                    },
                    ...(canManage
                      ? [
                          {
                            id: "hidden",
                            label: "Đang ẩn",
                            dotClass: "bg-slate-400 dark:bg-slate-500",
                            checkedBoxClass: "bg-slate-600 border-slate-600 text-white",
                            count: stockStats?.hidden,
                            countClass: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800",
                            description: "Thuốc đang ẩn (dành cho quản lý)",
                          },
                        ]
                      : []),
                  ].map((item) => {
                    const isChecked = activeStatusFilters.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleStatus(item.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer select-none group text-left",
                          isChecked
                            ? isDarkMode
                              ? "bg-slate-800/90 text-white font-bold ring-1 ring-slate-700/60"
                              : "bg-indigo-50/70 text-slate-900 font-bold ring-1 ring-indigo-200/50"
                            : isDarkMode
                              ? "text-slate-300 hover:bg-slate-900 hover:text-white"
                              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                        )}
                        title={`${item.description} (Bấm để ${isChecked ? "bỏ chọn" : "chọn"})`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Ô vuông đánh dấu (checkbox) */}
                          <div
                            className={cn(
                              "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 shadow-2xs",
                              isChecked
                                ? item.checkedBoxClass
                                : isDarkMode
                                  ? "border-slate-700 bg-slate-900 group-hover:border-slate-500"
                                  : "border-slate-300 bg-white group-hover:border-slate-400"
                            )}
                          >
                            {isChecked && (
                              <Check size={11} strokeWidth={3.2} className="text-white" />
                            )}
                          </div>

                          <span className={cn("w-2 h-2 rounded-full shrink-0", item.dotClass)} />
                          <span className="truncate text-[11.5px]">{item.label}</span>
                        </div>

                        {item.count !== undefined && (
                          <span
                            className={cn(
                              "text-[10px] font-mono font-bold shrink-0 ml-1.5 px-1.5 py-0.5 rounded-md",
                              isChecked
                                ? item.countClass
                                : isDarkMode
                                  ? "text-slate-400 bg-slate-800/60"
                                  : "text-slate-500 bg-slate-100"
                            )}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Sidebar: Quick Action Button (Thêm thuốc mới nếu canManage) */}
      {canManage && onOpenAddDrug && (
        <div
          className={cn(
            "p-2 border-t shrink-0 transition-colors",
            isDarkMode ? "border-slate-800 bg-slate-900/30" : "border-slate-100 bg-slate-50/50"
          )}
        >
          <button
            type="button"
            onClick={onOpenAddDrug}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer select-none",
              isCollapsed && "px-0"
            )}
            title="Thêm thuốc"
          >
            <Plus size={16} />
            {!isCollapsed && <span>Thêm thuốc</span>}
          </button>
        </div>
      )}
    </aside>
  );
};
