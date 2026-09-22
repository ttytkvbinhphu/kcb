import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ArrowLeft,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Pill,
  Filter,
  SlidersHorizontal,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  FileText,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Clock,
  RefreshCw,
  Heart,
  Baby,
  Car,
  AlertTriangle,
  Activity,
  Zap,
  FolderTree,
  Folder,
  Scissors,
  Settings,
  Briefcase,
  MoveRight,
  ChevronUp,
  ChevronDown,
  Star,
  ThumbsUp,
  Database,
  AlertCircle,
  Calendar,
  Coins,
  Sparkles,
  Hash,
  FileSearch,
  Lightbulb,
  Link,
  Link2,
  Pause,
  MoreVertical,
  Lock,
  ClipboardList,
  CheckCircle2,
  Layers,
  FolderOpen,
  FlaskConical,
  User,
  FolderInput,
  Scale,
  BookOpen,
  FileCheck,
} from "lucide-react";
import { Drug, DrugGroup, Ingredient, ManualInteraction } from "../types";
import { subscribeICD10 } from "../lib/icdStore";
import { useFavoriteDrugs } from "../lib/favoritesStore";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { cn, sanitizeFirestoreData } from "../lib/utils";
import { DrugDosageWarningsFormTabs } from "./DrugDosageWarningsFormTabs";
import {
  db,
  collection,
  onSnapshot,
  query,
  orderBy,
  handleFirestoreError,
  OperationType,
  setDoc,
  doc,
  deleteDoc,
  storage,
  getDoc,
  writeBatch,
  getDocs,
  where,
} from "../firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
} from "firebase/storage";
import DrugGroupManagement from "./DrugGroupManagement";
import CatalogManagement from "./CatalogManagement";
import ImageEditorModal from "./ImageEditorModal";
import DrugDetailModal from "./DrugDetailModal";
import { DrugDirectorySidebar } from "./DrugDirectorySidebar";
import PdfViewerModal from "./PdfViewerModal";
import { DrugExcelManagement } from "./DrugExcelManagement";
import { isDrugMatchingClinicalFilters } from "../lib/clinicalDrugFilterHelper";
import { DualAgeRangeSlider } from "./DualAgeRangeSlider";
import { DualWeightRangeSlider } from "./DualWeightRangeSlider";
import { DualCrclRangeSlider } from "./DualCrclRangeSlider";

import ConfirmModal from "./ConfirmModal";

const isIngredientMatch = (
  ing1?: string,
  ing2?: string,
  list: Ingredient[] = [],
) => {
  if (!ing1 || !ing2) return false;
  if (ing1 === ing2) return true;
  const i1 = ing1.toLowerCase().trim();
  const i2 = ing2.toLowerCase().trim();
  if (i1 === i2 || i1.includes(i2) || i2.includes(i1)) return true;

  // Check from list
  const ai1 = list.find((ai) => ai.name && ai.name.toLowerCase() === i1);
  if (ai1) {
    if (ai1.alias && i2.includes(ai1.alias.toLowerCase())) return true;
    if (
      ai1.aliases &&
      ai1.aliases.some((alias) => alias && i2.includes(alias.toLowerCase()))
    )
      return true;
  }
  const ai2 = list.find((ai) => ai.name && ai.name.toLowerCase() === i2);
  if (ai2) {
    if (ai2.alias && i1.includes(ai2.alias.toLowerCase())) return true;
    if (
      ai2.aliases &&
      ai2.aliases.some((alias) => alias && i1.includes(alias.toLowerCase()))
    )
      return true;
  }
  return false;
};

const parseStatusAndNotes = (storedValue: string, options: string[]) => {
  if (!storedValue) return { status: options[0] || "", notes: "" };
  const matchedOption = options.find(
    (opt) => storedValue === opt || storedValue.startsWith(opt + " - "),
  );
  if (matchedOption) {
    const notes = storedValue.startsWith(matchedOption + " - ")
      ? storedValue.substring(matchedOption.length + 3)
      : "";
    return { status: matchedOption, notes };
  }
  return { status: options[0] || "", notes: storedValue };
};

const parsePregnancyTrimesters = (storedValue: string) => {
  const defaultRes = {
    status1: "Cân nhắc lợi hại",
    status2: "Cân nhắc lợi hại",
    status3: "Cân nhắc lợi hại",
    notes: "",
  };
  if (!storedValue) return defaultRes;
  const match = storedValue.match(
    /^3T đầu:\s*([^|]+)\s*\|\s*3T giữa:\s*([^|]+)\s*\|\s*3T cuối:\s*([^-]+)(?:\s*-\s*([\s\S]*))?$/,
  );
  if (match) {
    return {
      status1: match[1].trim(),
      status2: match[2].trim(),
      status3: match[3].trim(),
      notes: (match[4] || "").trim(),
    };
  }
  return {
    status1: "Cân nhắc lợi hại",
    status2: "Cân nhắc lợi hại",
    status3: "Cân nhắc lợi hại",
    notes: storedValue,
  };
};

const buildAgeContent = (cfg: any) => {
  if (!cfg) return "";
  const unitStr = cfg.unit === "months" ? "tháng" : "tuổi";
  const hasBefore =
    cfg.valueBefore !== undefined &&
    cfg.valueBefore !== "" &&
    cfg.operatorBefore;
  const hasAfter = cfg.value !== undefined && cfg.value !== "" && cfg.operator;
  if (hasBefore && hasAfter) {
    return `Tuổi: ${cfg.valueBefore} ${unitStr} ${cfg.operatorBefore} Tuổi ${cfg.operator} ${cfg.value} ${unitStr}`;
  } else if (hasBefore) {
    return `Tuổi: ${cfg.valueBefore} ${unitStr} ${cfg.operatorBefore} Tuổi`;
  } else if (hasAfter) {
    return `Tuổi ${cfg.operator} ${cfg.value} ${unitStr}`;
  }
  return "";
};

const buildWeightContent = (cfg: any) => {
  if (!cfg) return "";
  const unitStr = cfg.unit === "g" ? "g" : "kg";
  const hasBefore =
    cfg.valueBefore !== undefined &&
    cfg.valueBefore !== "" &&
    cfg.operatorBefore;
  const hasAfter = cfg.value !== undefined && cfg.value !== "" && cfg.operator;
  if (hasBefore && hasAfter) {
    return `Cân nặng: ${cfg.valueBefore} ${unitStr} ${cfg.operatorBefore} Cân nặng ${cfg.operator} ${cfg.value} ${unitStr}`;
  } else if (hasBefore) {
    return `Cân nặng: ${cfg.valueBefore} ${unitStr} ${cfg.operatorBefore} Cân nặng`;
  } else if (hasAfter) {
    return `Cân nặng ${cfg.operator} ${cfg.value} ${unitStr}`;
  }
  return "";
};

interface DrugDirectoryProps {
  activeTab?: string;
  appActiveTab?: string;
  canManage: boolean;
  isDarkMode: boolean;
  isActive?: boolean;
  subHeaderPortalId?: string;
  onToggleSidebar?: () => void;
  featureSettings?: any;
  userRole?: string;
  isApproved?: boolean;
  userPowerPoints?: number;
  initialSelectedDrugId?: string | null;
  initialSelectedDrugName?: string | null;
  onClearInitialDrug?: () => void;
  currentUserName?: string;
  externalViewMode?: "drugs" | "groups" | "ingredients" | "ingredient_categories" | "excipients" | "excipient_categories" | "companies";
  onExternalViewModeChange?: (mode: "drugs" | "groups" | "ingredients" | "ingredient_categories" | "excipients" | "excipient_categories" | "companies") => void;
}

const AutoExpandingTextarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = (props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onInput={(e) => {
        e.currentTarget.style.height = "auto";
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        if (props.onInput) props.onInput(e);
      }}
    />
  );
};

// ── AgeRangeSlider ────────────────────────────────────────────────────────────
interface AgeRangeSliderProps {
  ageMin: number;
  ageMax: number | null; // null = no upper limit
  onChange: (min: number, max: number | null) => void;
  isDarkMode: boolean;
}

const AGE_RANGE_MAX = 100; // absolute upper boundary on the track

const AgeRangeSlider: React.FC<AgeRangeSliderProps> = ({
  ageMin,
  ageMax,
  onChange,
  isDarkMode,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const hasMax = ageMax !== null;

  // Convert age value → % position on track
  const pct = (val: number) => Math.round((val / AGE_RANGE_MAX) * 100);

  const minPct = pct(ageMin);
  const maxPct = hasMax ? pct(ageMax as number) : 100;

  // Drag helpers
  const getAgeFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const { left, width } = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round(ratio * AGE_RANGE_MAX);
  };

  const startDrag =
    (handle: "min" | "max") => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const move = (ev: MouseEvent | TouchEvent) => {
        const clientX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
        const age = getAgeFromClientX(clientX);
        if (handle === "min") {
          const newMin = Math.min(
            age,
            hasMax ? (ageMax as number) - 1 : AGE_RANGE_MAX - 1,
          );
          onChange(Math.max(0, newMin), ageMax);
        } else {
          const newMax = Math.max(age, ageMin + 1);
          onChange(ageMin, Math.min(newMax, AGE_RANGE_MAX));
        }
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchend", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("mouseup", up);
      window.addEventListener("touchend", up);
    };

  // Tick marks at multiples of 10
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black",
            isDarkMode
              ? "bg-blue-900/30 border-blue-800/50 text-blue-300"
              : "bg-blue-50 border-blue-200 text-blue-700",
          )}
        >
          <span className="opacity-60 font-bold text-[10px] uppercase">Từ</span>
          <span>{ageMin} tuổi</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black",
            hasMax
              ? isDarkMode
                ? "bg-indigo-900/30 border-indigo-800/50 text-indigo-300"
                : "bg-indigo-50 border-indigo-200 text-indigo-700"
              : isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-400"
                : "bg-slate-100 border-slate-200 text-slate-500",
          )}
        >
          {hasMax ? (
            <>
              <span className="opacity-60 font-bold text-[10px] uppercase">
                Đến
              </span>
              <span>{ageMax} tuổi</span>
            </>
          ) : (
            <span className="italic">Không giới hạn tuổi tối đa</span>
          )}
        </div>
      </div>
      <div
        ref={trackRef}
        className="relative h-2 rounded-full cursor-pointer mx-2"
        style={{ background: isDarkMode ? "#1e293b" : "#e2e8f0" }}
      >
        <div
          className="absolute top-0 h-2 rounded-full"
          style={{
            left: `${minPct}%`,
            width: `${maxPct - minPct}%`,
            background: "linear-gradient(90deg, #3b82f6, #6366f1)",
          }}
        />
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-3 flex flex-col items-center"
            style={{ left: `${t}%`, transform: "translateX(-50%)" }}
          >
            <div
              className={cn(
                "w-px h-1.5",
                isDarkMode ? "bg-slate-700" : "bg-slate-300",
              )}
            />
            {t % 20 === 0 && (
              <span
                className={cn(
                  "text-[8px] font-bold mt-0.5",
                  isDarkMode ? "text-slate-500" : "text-slate-400",
                )}
              >
                {t}
              </span>
            )}
          </div>
        ))}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 z-10",
            isDarkMode
              ? "bg-blue-500 border-blue-300"
              : "bg-blue-500 border-white",
          )}
          style={{ left: `${minPct}%`, transform: "translate(-50%, -50%)" }}
          onMouseDown={startDrag("min")}
          onTouchStart={startDrag("min")}
          title={`Tuổi tối thiểu: ${ageMin}`}
        />
        {hasMax && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 z-10",
              isDarkMode
                ? "bg-indigo-500 border-indigo-300"
                : "bg-indigo-500 border-white",
            )}
            style={{ left: `${maxPct}%`, transform: "translate(-50%, -50%)" }}
            onMouseDown={startDrag("max")}
            onTouchStart={startDrag("max")}
            title={`Tuổi tối đa: ${ageMax}`}
          />
        )}
      </div>
      <div className="flex items-center justify-end mt-6 gap-2">
        <button
          type="button"
          onClick={() =>
            onChange(ageMin, hasMax ? null : Math.max(ageMin + 1, 18))
          }
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
            hasMax
              ? isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              : isDarkMode
                ? "bg-indigo-900/30 border-indigo-700 text-indigo-400 hover:bg-indigo-900/50"
                : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100",
          )}
        >
          <span>
            {hasMax
              ? "✕ Ẩn giới hạn tuổi tối đa"
              : "+ Thêm giới hạn tuổi tối đa"}
          </span>
        </button>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

// ── WeightRangeSlider ─────────────────────────────────────────────────────────
interface WeightRangeSliderProps {
  weightMin: number;
  weightMax: number | null; // null = no upper limit
  onChange: (min: number, max: number | null) => void;
  isDarkMode: boolean;
}

const WEIGHT_RANGE_MAX = 150; // absolute upper boundary on the track (kg)

const WeightRangeSlider: React.FC<WeightRangeSliderProps> = ({
  weightMin,
  weightMax,
  onChange,
  isDarkMode,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const hasMax = weightMax !== null;

  const pct = (val: number) => Math.round((val / WEIGHT_RANGE_MAX) * 100);
  const minPct = pct(weightMin);
  const maxPct = hasMax ? pct(weightMax as number) : 100;

  const getWeightFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const { left, width } = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round(ratio * WEIGHT_RANGE_MAX);
  };

  const startDrag =
    (handle: "min" | "max") => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const move = (ev: MouseEvent | TouchEvent) => {
        const clientX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
        const weight = getWeightFromClientX(clientX);
        if (handle === "min") {
          const newMin = Math.min(
            weight,
            hasMax ? (weightMax as number) - 1 : WEIGHT_RANGE_MAX - 1,
          );
          onChange(Math.max(0, newMin), weightMax);
        } else {
          const newMax = Math.max(weight, weightMin + 1);
          onChange(weightMin, Math.min(newMax, WEIGHT_RANGE_MAX));
        }
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchend", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("mouseup", up);
      window.addEventListener("touchend", up);
    };

  const ticks = [0, 30, 60, 90, 120, 150];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black",
            isDarkMode
              ? "bg-emerald-900/30 border-emerald-800/50 text-emerald-300"
              : "bg-emerald-50 border-emerald-200 text-emerald-700",
          )}
        >
          <span className="opacity-60 font-bold text-[10px] uppercase">Từ</span>
          <span>{weightMin} kg</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black",
            hasMax
              ? isDarkMode
                ? "bg-teal-900/30 border-teal-800/50 text-teal-300"
                : "bg-teal-50 border-teal-200 text-teal-700"
              : isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-400"
                : "bg-slate-100 border-slate-200 text-slate-500",
          )}
        >
          {hasMax ? (
            <>
              <span className="opacity-60 font-bold text-[10px] uppercase">
                Đến
              </span>
              <span>{weightMax} kg</span>
            </>
          ) : (
            <span className="italic">Không giới hạn</span>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative h-2 rounded-full cursor-pointer mx-2"
        style={{ background: isDarkMode ? "#1e293b" : "#e2e8f0" }}
      >
        <div
          className="absolute top-0 h-2 rounded-full"
          style={{
            left: `${minPct}%`,
            width: `${maxPct - minPct}%`,
            background: "linear-gradient(90deg, #10b981, #14b8a6)",
          }}
        />
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-3 flex flex-col items-center"
            style={{ left: `${pct(t)}%`, transform: "translateX(-50%)" }}
          >
            <div
              className={cn(
                "w-px h-1.5",
                isDarkMode ? "bg-slate-700" : "bg-slate-300",
              )}
            />
            <span
              className={cn(
                "text-[8px] font-bold mt-0.5",
                isDarkMode ? "text-slate-500" : "text-slate-400",
              )}
            >
              {t}
            </span>
          </div>
        ))}

        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 z-10",
            isDarkMode
              ? "bg-emerald-500 border-emerald-300"
              : "bg-emerald-500 border-white",
          )}
          style={{ left: `${minPct}%`, transform: "translate(-50%, -50%)" }}
          onMouseDown={startDrag("min")}
          onTouchStart={startDrag("min")}
          title={`Cân nặng tối thiểu: ${weightMin} kg`}
        />
        {hasMax && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 z-10",
              isDarkMode
                ? "bg-teal-500 border-teal-300"
                : "bg-teal-500 border-white",
            )}
            style={{ left: `${maxPct}%`, transform: "translate(-50%, -50%)" }}
            onMouseDown={startDrag("max")}
            onTouchStart={startDrag("max")}
            title={`Cân nặng tối đa: ${weightMax} kg`}
          />
        )}
      </div>

      <div className="flex items-center justify-end mt-6 gap-2">
        <button
          type="button"
          onClick={() =>
            onChange(weightMin, hasMax ? null : Math.max(weightMin + 1, 50))
          }
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
            hasMax
              ? isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              : isDarkMode
                ? "bg-teal-900/30 border-teal-700 text-teal-400 hover:bg-teal-900/50"
                : "bg-teal-50 border-teal-200 text-teal-600 hover:bg-teal-100",
          )}
        >
          <span>
            {hasMax ? "✕ Ẩn giới hạn cân nặng" : "+ Thêm giới hạn cân nặng"}
          </span>
        </button>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

// ── CrClRangeSlider ──────────────────────────────────────────────────────────
interface CrClRangeSliderProps {
  crclMin: number;
  crclMax: number | null; // null = no upper limit
  onChange: (min: number, max: number | null) => void;
  isDarkMode: boolean;
}

const CRCL_RANGE_MAX = 150; // mL/min

const CrClRangeSlider: React.FC<CrClRangeSliderProps> = ({
  crclMin,
  crclMax,
  onChange,
  isDarkMode,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const hasMax = crclMax !== null;

  const pct = (val: number) => Math.round((val / CRCL_RANGE_MAX) * 100);
  const minPct = pct(crclMin);
  const maxPct = hasMax ? pct(crclMax as number) : 100;

  const getCrClFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const { left, width } = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round(ratio * CRCL_RANGE_MAX);
  };

  const startDrag =
    (handle: "min" | "max") => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const move = (ev: MouseEvent | TouchEvent) => {
        const clientX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
        const crcl = getCrClFromClientX(clientX);
        if (handle === "min") {
          const newMin = Math.min(
            crcl,
            hasMax ? (crclMax as number) - 1 : CRCL_RANGE_MAX - 1,
          );
          onChange(Math.max(0, newMin), crclMax);
        } else {
          const newMax = Math.max(crcl, crclMin + 1);
          onChange(crclMin, Math.min(newMax, CRCL_RANGE_MAX));
        }
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchend", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("mouseup", up);
      window.addEventListener("touchend", up);
    };

  const ticks = [0, 30, 60, 90, 120, 150];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black",
            isDarkMode
              ? "bg-purple-900/30 border-purple-800/50 text-purple-300"
              : "bg-purple-50 border-purple-200 text-purple-700",
          )}
        >
          <span className="opacity-60 font-bold text-[10px] uppercase">Từ</span>
          <span>{crclMin} mL/min</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black",
            hasMax
              ? isDarkMode
                ? "bg-fuchsia-900/30 border-fuchsia-800/50 text-fuchsia-300"
                : "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700"
              : isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-400"
                : "bg-slate-100 border-slate-200 text-slate-500",
          )}
        >
          {hasMax ? (
            <>
              <span className="opacity-60 font-bold text-[10px] uppercase">
                Đến
              </span>
              <span>{crclMax} mL/min</span>
            </>
          ) : (
            <span className="italic">Không giới hạn</span>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative h-2 rounded-full cursor-pointer mx-2"
        style={{ background: isDarkMode ? "#1e293b" : "#e2e8f0" }}
      >
        <div
          className="absolute top-0 h-2 rounded-full"
          style={{
            left: `${minPct}%`,
            width: `${maxPct - minPct}%`,
            background: "linear-gradient(90deg, #a855f7, #d946ef)",
          }}
        />
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-3 flex flex-col items-center"
            style={{ left: `${pct(t)}%`, transform: "translateX(-50%)" }}
          >
            <div
              className={cn(
                "w-px h-1.5",
                isDarkMode ? "bg-slate-700" : "bg-slate-300",
              )}
            />
            <span
              className={cn(
                "text-[8px] font-bold mt-0.5",
                isDarkMode ? "text-slate-500" : "text-slate-400",
              )}
            >
              {t}
            </span>
          </div>
        ))}

        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 z-10",
            isDarkMode
              ? "bg-purple-500 border-purple-300"
              : "bg-purple-500 border-white",
          )}
          style={{ left: `${minPct}%`, transform: "translate(-50%, -50%)" }}
          onMouseDown={startDrag("min")}
          onTouchStart={startDrag("min")}
          title={`CrCl tối thiểu: ${crclMin} mL/min`}
        />
        {hasMax && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 z-10",
              isDarkMode
                ? "bg-fuchsia-500 border-fuchsia-300"
                : "bg-fuchsia-500 border-white",
            )}
            style={{ left: `${maxPct}%`, transform: "translate(-50%, -50%)" }}
            onMouseDown={startDrag("max")}
            onTouchStart={startDrag("max")}
            title={`CrCl tối đa: ${crclMax} mL/min`}
          />
        )}
      </div>

      <div className="flex items-center justify-end mt-6 gap-2">
        <button
          type="button"
          onClick={() =>
            onChange(crclMin, hasMax ? null : Math.max(crclMin + 1, 90))
          }
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
            hasMax
              ? isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              : isDarkMode
                ? "bg-purple-900/30 border-purple-700 text-purple-400 hover:bg-purple-900/50"
                : "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100",
          )}
        >
          <span>
            {hasMax ? "✕ Ẩn giới hạn CrCl tối đa" : "+ Thêm giới hạn CrCl tối đa"}
          </span>
        </button>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const getBadgeColorClasses = (color: string, isDarkMode = false) => {
  const map: Record<
    string,
    { bg: string; text: string; border: string; dot: string }
  > = {
    blue: {
      bg: isDarkMode ? "bg-blue-500/10" : "bg-blue-50",
      text: isDarkMode ? "text-blue-400" : "text-blue-600",
      border: isDarkMode ? "border-blue-500/20" : "border-blue-105",
      dot: "bg-blue-500",
    },
    emerald: {
      bg: isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50",
      text: isDarkMode ? "text-emerald-400" : "text-emerald-600",
      border: isDarkMode ? "border-emerald-500/20" : "border-emerald-100",
      dot: "bg-emerald-500",
    },
    amber: {
      bg: isDarkMode ? "bg-amber-500/10" : "bg-amber-50",
      text: isDarkMode ? "text-amber-400" : "text-amber-600",
      border: isDarkMode ? "border-amber-500/20" : "border-amber-100",
      dot: "bg-amber-500",
    },
    rose: {
      bg: isDarkMode ? "bg-rose-500/10" : "bg-rose-50",
      text: isDarkMode ? "text-rose-400" : "text-rose-600",
      border: isDarkMode ? "border-rose-500/20" : "border-rose-100",
      dot: "bg-rose-500",
    },
    purple: {
      bg: isDarkMode ? "bg-purple-500/10" : "bg-purple-50",
      text: isDarkMode ? "text-purple-400" : "text-purple-600",
      border: isDarkMode ? "border-purple-500/20" : "border-purple-100",
      dot: "bg-purple-500",
    },
    sky: {
      bg: isDarkMode ? "bg-sky-500/10" : "bg-sky-50",
      text: isDarkMode ? "text-sky-450" : "text-sky-600",
      border: isDarkMode ? "border-sky-500/20" : "border-sky-101",
      dot: "bg-sky-500",
    },
    indigo: {
      bg: isDarkMode ? "bg-indigo-500/10" : "bg-indigo-50",
      text: isDarkMode ? "text-indigo-400" : "text-indigo-600",
      border: isDarkMode ? "border-indigo-500/20" : "border-indigo-100",
      dot: "bg-indigo-500",
    },
    brown: {
      bg: isDarkMode ? "bg-amber-500/10" : "bg-amber-950/5",
      text: isDarkMode ? "text-amber-300" : "text-amber-800",
      border: isDarkMode ? "border-amber-500/20" : "border-amber-900/10",
      dot: "bg-amber-700",
    },
    gray: {
      bg: isDarkMode ? "bg-slate-800/60" : "bg-slate-100",
      text: isDarkMode ? "text-slate-400" : "text-slate-600",
      border: isDarkMode ? "border-slate-800" : "border-slate-200",
      dot: "bg-slate-500",
    },
    pink: {
      bg: isDarkMode ? "bg-pink-500/10" : "bg-pink-50",
      text: isDarkMode ? "text-pink-400" : "text-pink-600",
      border: isDarkMode ? "border-pink-500/20" : "border-pink-100",
      dot: "bg-pink-500",
    },
  };
  return map[color] || map.blue;
};

const parseSingleDoseValue = (val: string): number => {
  if (val.includes('/')) {
    const parts = val.split('/').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && parts[1] !== 0) {
      return parts[0] / parts[1];
    }
  }
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

const parseDoseValue = (val: string): { min: number; max: number } => {
  const cleaned = val.trim().replace(',', '.');
  if (!cleaned) return { min: 0, max: 0 };
  
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map(p => p.trim());
    if (parts.length === 2) {
      const min = parseSingleDoseValue(parts[0]);
      const max = parseSingleDoseValue(parts[1]);
      return { min, max };
    }
  }
  
  const num = parseSingleDoseValue(cleaned);
  return { min: num, max: num };
};

const formatDoseValue = (num: number): string => {
  if (Math.round(num) === num) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, "");
};

const formatLotPriceVN = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === "") return "";
  const numStr = String(val).replace(/\D/g, "");
  if (!numStr) return "";
  return Number(numStr).toLocaleString("vi-VN");
};

const getDrugPriceDisplay = (drug: any): string | null => {
  if (!drug) return null;

  // 1. Check direct drug.price
  if (drug.price !== undefined && drug.price !== null && drug.price !== "") {
    const numStr = String(drug.price).replace(/\D/g, "");
    if (numStr) {
      return `${Number(numStr).toLocaleString("vi-VN")} ₫`;
    }
  }

  // 2. Check drug.lots prices
  if (drug.lots && drug.lots.length > 0) {
    const validPrices = drug.lots
      .map((l: any) => l.price)
      .filter((p: any) => p !== undefined && p !== null && p !== "")
      .map((p: any) => Number(String(p).replace(/\D/g, "")))
      .filter((p: number) => !isNaN(p) && p > 0);

    if (validPrices.length > 0) {
      const minPrice = Math.min(...validPrices);
      const maxPrice = Math.max(...validPrices);
      if (minPrice === maxPrice) {
        return `${minPrice.toLocaleString("vi-VN")} ₫`;
      } else {
        return `${minPrice.toLocaleString("vi-VN")} - ${maxPrice.toLocaleString("vi-VN")} ₫`;
      }
    }
  }

  return null;
};

const sortIcd10Codes = (codes: string[]): string[] => {
  if (!Array.isArray(codes)) return [];
  return [...codes].sort((a, b) =>
    a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" }),
  );
};

const getAutoSum = (sch: any, tabType: string): string | null => {
  const morningVal = (tabType === "quantity" ? sch.morning : tabType === "dosage" ? sch.dosageMorning : sch.weightMorning) || "";
  const noonVal = (tabType === "quantity" ? sch.noon : tabType === "dosage" ? sch.dosageNoon : sch.weightNoon) || "";
  const afternoonVal = (tabType === "quantity" ? sch.afternoon : tabType === "dosage" ? sch.dosageAfternoon : sch.weightAfternoon) || "";
  const nightVal = (tabType === "quantity" ? sch.night : tabType === "dosage" ? sch.dosageNight : sch.weightNight) || "";

  if (!morningVal && !noonVal && !afternoonVal && !nightVal) {
    return null;
  }

  const sumMinMax = [morningVal, noonVal, afternoonVal, nightVal].reduce(
    (acc, val) => {
      const { min, max } = parseDoseValue(val);
      return { min: acc.min + min, max: acc.max + max };
    },
    { min: 0, max: 0 }
  );

  if (sumMinMax.min === 0 && sumMinMax.max === 0) return "";
  if (sumMinMax.min === sumMinMax.max) {
    return formatDoseValue(sumMinMax.min);
  }
  return `${formatDoseValue(sumMinMax.min)}-${formatDoseValue(sumMinMax.max)}`;
};

const DrugDirectory: React.FC<DrugDirectoryProps> = ({
  activeTab: propActiveTab,
  appActiveTab,
  canManage,
  isDarkMode,
  isActive = true,
  subHeaderPortalId,
  onToggleSidebar,
  featureSettings,
  userRole,
  isApproved = false,
  userPowerPoints = 0,
  initialSelectedDrugId,
  initialSelectedDrugName,
  onClearInitialDrug,
  currentUserName = "Dược sĩ",
  externalViewMode,
  onExternalViewModeChange,
}) => {
  const isGuestUser = !userRole;
  const isPendingUser = !!userRole && !isApproved;
  const isManageDirectory = appActiveTab === "manage_directory" || propActiveTab === "manage_directory";

  // Power-point threshold helpers
  const canSeeCommonIndications =
    userPowerPoints >= (featureSettings?.commonIndicationsMinPower ?? 0);
  const canSeeIcdSuggestions =
    userPowerPoints >= (featureSettings?.icdSuggestionsMinPower ?? 0);
  const canSeeClosedDrugs =
    userPowerPoints >= (featureSettings?.showClosedDrugsMinPower ?? 0);
  const canSeeStatusColumn =
    userPowerPoints >= (featureSettings?.showStatusColumnMinPower ?? 0);
  const canSeeActionsColumn =
    userPowerPoints >= (featureSettings?.showActionsColumnMinPower ?? 0);
  const canSeeDosageSuggestions =
    userPowerPoints >= (featureSettings?.showDosageSuggestionsMinPower ?? 0);
  const canSeeIntakeTime =
    userPowerPoints >= (featureSettings?.showIntakeTimeMinPower ?? 0);
  const canSeePrecautionType =
    userPowerPoints >= (featureSettings?.precautionTypeMinPower ?? 0);
  const canSeePrecautionSeverity =
    userPowerPoints >= (featureSettings?.precautionSeverityMinPower ?? 0);
  const canSeePregnancyTrimesters =
    userPowerPoints >= (featureSettings?.pregnancyTrimestersMinPower ?? 0);
  const canSeeQuickSelectTags =
    userPowerPoints >= (featureSettings?.quickSelectTagsMinPower ?? 0);
  const canSeeInteractionSuggestions =
    userPowerPoints >= (featureSettings?.interactionSuggestionsMinPower ?? 0);
  const canSeeWeightSuggestions =
    userPowerPoints >= (featureSettings?.weightSuggestionsMinPower ?? 0);
  const canSeeAgeContraindications =
    userPowerPoints >= (featureSettings?.ageContraindicationsMinPower ?? 5);

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [drugGroups, setDrugGroups] = useState<DrugGroup[]>([]);

  const getGroupFullPath = (group: DrugGroup): string => {
    const pathList: string[] = [group.name];
    let current = group;
    let limit = 10;
    while (current.parentId && limit > 0) {
      const parent = drugGroups.find(g => g.id === current.parentId);
      if (parent) {
        pathList.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
      limit--;
    }
    return pathList.join(" > ");
  };

  const [groupTypeTab, setGroupTypeTab] = useState<'treatment' | 'interaction'>('treatment');
  const [selectedCap1Id, setSelectedCap1Id] = useState<string>("all");
  const [selectedCap2Id, setSelectedCap2Id] = useState<string>("all");
  const [groupDisplayMode, setGroupDisplayMode] = useState<"drugs" | "ingredients">("drugs");
  const [sidebarCap2Search, setSidebarCap2Search] = useState<string>("");
  const [icdList, setIcdList] = useState<any[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<
    Ingredient[]
  >([]);
  const [availableExcipients, setAvailableExcipients] = useState<any[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [adrCatalog, setAdrCatalog] = useState<any[]>([]);
  const [adrSearchQueries, setAdrSearchQueries] = useState<{
    [key: number]: string;
  }>({});
  const [activeIndexDropdown, setActiveIndexDropdown] = useState<number | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState("all");
  const [dosageFormFilter, setDosageFormFilter] = useState("all");

  // Bộ lọc lâm sàng: Tuổi, Cân nặng, Mức lọc cầu thận (eGFR / CrCl)
  const [patientAgeMin, setPatientAgeMin] = useState<number>(0);
  const [patientAgeMax, setPatientAgeMax] = useState<number>(100);
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const [patientAgeUnit, setPatientAgeUnit] = useState<"years" | "months">("years");
  const [agePreset, setAgePreset] = useState<string>("all");

  const [patientWeightMin, setPatientWeightMin] = useState<number>(0);
  const [patientWeightMax, setPatientWeightMax] = useState<number>(120);
  const [patientWeight, setPatientWeight] = useState<number | null>(null);
  const [weightPreset, setWeightPreset] = useState<string>("all");

  const [patientCrclMin, setPatientCrclMin] = useState<number>(0);
  const [patientCrclMax, setPatientCrclMax] = useState<number>(120);
  const [patientEgfr, setPatientEgfr] = useState<number | null>(null);
  const [egfrPreset, setEgfrPreset] = useState<string>("all");

  const { favoriteIds, isFavorite, toggleFavorite, count: favoriteCount } = useFavoriteDrugs();
  const [favoriteOnlyFilter, setFavoriteOnlyFilter] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [groupFilter, setGroupFilter] = useState("Tất cả");
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const [groupFilterSearch, setGroupFilterSearch] = useState("");
  const groupFilterRef = useRef<HTMLDivElement>(null);
  const [isDosageFormFilterOpen, setIsDosageFormFilterOpen] = useState(false);
  const [dosageFormFilterSearch, setDosageFormFilterSearch] = useState("");
  const dosageFormFilterRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileGroupFilterSelectOpen, setIsMobileGroupFilterSelectOpen] =
    useState(false);
  const [
    isMobileDosageFormFilterSelectOpen,
    setIsMobileDosageFormFilterSelectOpen,
  ] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [localViewMode, setLocalViewMode] = useState<
    "drugs" | "groups" | "ingredients" | "ingredient_categories" | "excipients" | "excipient_categories" | "companies"
  >(externalViewMode || "drugs");

  const viewMode = externalViewMode !== undefined ? externalViewMode : localViewMode;

  const setViewMode = (mode: "drugs" | "groups" | "ingredients" | "ingredient_categories" | "excipients" | "excipient_categories" | "companies") => {
    if (onExternalViewModeChange) {
      onExternalViewModeChange(mode);
    } else {
      setLocalViewMode(mode);
    }
  };
  const [excipientView, setExcipientView] = useState<
    "excipients" | "categories"
  >("excipients");
  const [ingredientView, setIngredientView] = useState<
    "search" | "manage" | "categories"
  >("search");

  // Khi ở giao diện Tra cứu thuốc, tự động chuyển về 'drugs' nếu đang chọn tab quản lý (Phân loại hoạt chất, Tá dược, Công ty)
  useEffect(() => {
    if (
      !isManageDirectory &&
      (viewMode === "ingredient_categories" ||
        viewMode === "excipients" ||
        viewMode === "excipient_categories" ||
        viewMode === "companies")
    ) {
      setViewMode("drugs");
    }
  }, [isManageDirectory, viewMode]);
  const mainSearchRef = useRef<HTMLDivElement>(null);
  const desktopTabsContainerRef = useRef<HTMLDivElement>(null);
  const [isTabsResizing, setIsTabsResizing] = useState(false);
  const [tabsLayoutKey, setTabsLayoutKey] = useState(0);

  // Ngăn chặn giật lag / nhảy loạn xạ vị trí tab khi người dùng thay đổi kích thước cửa sổ trình duyệt
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;

    const handleWindowResize = () => {
      setIsTabsResizing(true);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsTabsResizing(false);
        setTabsLayoutKey((k) => k + 1);
      }, 100);
    };

    window.addEventListener("resize", handleWindowResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Dọn dẹp cache thu gọn tab cũ nếu có
  useEffect(() => {
    try {
      localStorage.removeItem("kcb_collapsed_drug_tabs");
    } catch {}
  }, []);

  const [showStickySearch, setShowStickySearch] = useState(false);

  // Patient Groups state
  const [patientGroups, setPatientGroups] = useState<
    {
      id: string;
      name: string;
      code?: string;
      color: string;
      classification?: string;
    }[]
  >([]);

  // Subscribe to Patient Groups (Nhóm đối tượng)
  useEffect(() => {
    const q = query(collection(db, "patient_groups"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }) as any,
        );
        setPatientGroups(data);
      },
      (error) => {
        console.error("Error fetching patient groups in DrugDirectory:", error);
      },
    );
    return () => unsubscribe();
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [mobileBottomNavHeight, setMobileBottomNavHeight] = useState<number>(() => {
    if (typeof window === "undefined") return 58;
    const navEl = document.getElementById("bottommobilenav") || document.querySelector("nav[aria-label='Mobile Navigation']");
    if (navEl) {
      const rect = navEl.getBoundingClientRect();
      const dist = Math.max(0, window.innerHeight - rect.top);
      if (dist > 0) return Math.round(dist);
    }
    return 58;
  });

  useEffect(() => {
    if (!isMobile) return;
    const updateHeight = () => {
      const navEl = document.getElementById("bottommobilenav") || document.querySelector("nav[aria-label='Mobile Navigation']");
      if (navEl) {
        const rect = navEl.getBoundingClientRect();
        const dist = Math.max(0, window.innerHeight - rect.top);
        if (dist > 0) {
          setMobileBottomNavHeight(Math.round(dist));
          return;
        }
      }
      setMobileBottomNavHeight(58);
    };

    updateHeight();
    const timer = setTimeout(updateHeight, 150);
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);

    let ro: ResizeObserver | null = null;
    const navEl = document.getElementById("bottommobilenav") || document.querySelector("nav[aria-label='Mobile Navigation']");
    if (navEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateHeight);
      ro.observe(navEl);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
      if (ro) ro.disconnect();
    };
  }, [isMobile]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickySearch(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" },
    );

    if (mainSearchRef.current) {
      observer.observe(mainSearchRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // CRITICAL: Force-clear the subheader portal node when DrugDirectory unmounts.
  // Without this, the filter buttons remain in the DOM as "zombie" nodes that
  // block pointer events on whichever module is rendered next.
  useEffect(() => {
    return () => {
      // Force a GPU repaint so any composited layers left by this module are flushed.
      document.documentElement.style.transform = "translateZ(0)";
      requestAnimationFrame(() => {
        document.documentElement.style.transform = "";
      });
    };
  }, [subHeaderPortalId]);

  const [searchMode, setSearchMode] = useState<"all" | "name" | "ingredient">(
    "all",
  );
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const pageBeforeSearchRef = useRef(1);
  const wasSearchingRef = useRef(false);
  const [ingredientPage, setIngredientPage] = useState(1);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem("drug_items_per_page");
    return saved ? Number(saved) : 20;
  });

  useEffect(() => {
    localStorage.setItem("drug_items_per_page", itemsPerPage.toString());
  }, [itemsPerPage]);
  const INGREDIENTS_PER_PAGE = 48;
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [formGroupSearch, setFormGroupSearch] = useState("");
  const [ingGroupSearches, setIngGroupSearches] = useState<Record<number, string>>({});
  const [formInteractionGroupSearch, setFormInteractionGroupSearch] = useState("");
  const [excipientFormSearch, setExcipientFormSearch] = useState("");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [isIngredientCategoryModalOpen, setIsIngredientCategoryModalOpen] =
    useState(false);
  const [isExcipientModalOpen, setIsExcipientModalOpen] = useState(false);
  const [isExcipientCategoryModalOpen, setIsExcipientCategoryModalOpen] =
    useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [catalogAddTrigger, setCatalogAddTrigger] = useState(0);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfViewerDrug, setPdfViewerDrug] = useState<Drug | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "general"
    | "dosage"
    | "warnings"
    | "side_effects_tab"
    | "interactions"
    | "overdose"
    | "pharmacology"
    | "company"
  >("company");
  const [activeSubTab, setActiveSubTab] = useState<string>("");
  const [activeSideEffectIngTab, setActiveSideEffectIngTab] =
    useState<string>("all");
  const [scheduleTabs, setScheduleTabs] = useState<
    Record<string, "quantity" | "dosage" | "weight">
  >({});
  const [activePkTabIndex, setActivePkTabIndex] = useState<number>(0);

  useEffect(() => {
    // Reset sub-tab when main tab changes
    const defaultSubTabs: Record<string, string> = {
      general: "info",
      dosage: "indications",
      warnings: "contra",
      side_effects_tab: "adr",
      interactions: "interactions",
      overdose: "overdose_management",
      pharmacology: "pharmacodynamics",
      company: "settings",
    };
    setActiveSubTab(defaultSubTabs[activeTab] || "");
  }, [activeTab]);

  const SUB_TABS: Record<string, { id: string; label: string }[]> = {
    general: [
      { id: "info", label: "Cơ bản" },
      { id: "composition", label: "Thành phần" },
    ],
    dosage: [
      { id: "indications", label: "Chỉ định" },
      { id: "administration", label: "Liều dùng" },
    ],
    warnings: [
      { id: "contra", label: "Chống chỉ định" },
      { id: "special", label: "Thận trọng" },
      { id: "special_subjects", label: "Đối tượng đặc biệt" },
    ],
    side_effects_tab: [
      { id: "adr", label: "Tác dụng phụ" },
      { id: "adr_management", label: "Xử trí ADR" },
    ],
    interactions: [
      { id: "interactions", label: "Tương tác" },
      { id: "incompatibilities", label: "Tương kỵ" },
    ],
    overdose: [{ id: "overdose_management", label: "Xử trí quá liều" }],
    pharmacology: [
      { id: "pharmacodynamics", label: "Dược lực học" },
      { id: "pharmacokinetics", label: "Dược động học" },
    ],
    company: [
      { id: "settings", label: "Thiết lập" },
      { id: "info", label: "Công ty" },
      { id: "reasoning", label: "Lập luận" },
    ],
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // State to manage collapse/expand of dosage groups
  const [collapsedDosageGroups, setCollapsedDosageGroups] = useState<Record<number, boolean>>({});

  // Management state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [formData, setFormData] = useState<Drug>({
    id: "",
    name: "",
    activeIngredients: [],
    atcCode: "",
    dosageForm: "",
    detailedDosageForm: "",
    excipients: "",
    excipientsList: [],
    tabletWeight: "",
    manufacturer: "",
    mechanismOfAction: "",
    mechanismOfActionLabel: "",
    pharmacologicalGroup: "",
    indications: [],
    contraindications: [],
    sideEffects: [],
    groupId: "",
    groupIds: [],
    interactionGroupIds: [],
    avatarUrl: "",
    pdfUrl: "",
    registrationNumber: "",
    lotNumber: "",
    lots: [],
    leafletVersion: "",
    administrationRoute: "",
    generalAdministration: "",
    generalAdministrationTime: "",
    isClosed: false,
    isRx: false,
    isNew: false,
    isUpdated: false,
    status: "active",
    stockStatus: "available",
    expiryStatus: "valid",
    expiryAlertMonths: 3,
    dosageAndAdministration: [],
    precautions: [{ content: "" }],
    pregnancy: "",
    pregnancyStatus1: "Cân nhắc lợi hại",
    pregnancyStatus2: "Cân nhắc lợi hại",
    pregnancyStatus3: "Cân nhắc lợi hại",
    pregnancyNotes: "",
    lactation: "",
    lactationStatus: "Cân nhắc lợi hại",
    lactationNotes: "",
    driving: "",
    drivingStatus: "Có thể dùng",
    drivingNotes: "",
    fertility: "",
    fertilityStatus: "Cân nhắc lợi hại",
    fertilityNotes: "",
    interactions: "",
    incompatibilities: "",
    specificInteractions: [],
    pharmacodynamics: [],
    pharmacokinetics: [],
    overdose: "",
    overdoseManagement: "",
    adrManagement: "",
    isWHOGMP: false,
    isEUGMP: false,
    isTCCS: false,
    isCYP3A4: false,
    storageCondition: "",
    storageTemperature: "",
    shelfLife: "",
    standardizationRationale: "",
    standardizationBasis: "",
    standardizationStatus: "draft",
    standardizationNotes: "",
    updatedAt: "",
    updatedBy: "",
    createdAt: "",
  });

  // Local string states for comma-separated fields
  const [contraindicationsText, setContraindicationsText] = useState(""); // Keep for legacy if needed, but we'll use formData
  const [sideEffectsText, setSideEffectsText] = useState("");
  const [searchingIcdIndex, setSearchingIcdIndex] = useState<number | null>(
    null,
  );
  const [searchingContraIcdIndex, setSearchingContraIcdIndex] = useState<
    number | null
  >(null);
  const [searchingContraCautionIcdIndex, setSearchingContraCautionIcdIndex] = useState<
    number | null
  >(null);
  const [searchingWarnIcdIndex, setSearchingWarnIcdIndex] = useState<number | null>(null);
  const [searchingPrecautionIcdIndex, setSearchingPrecautionIcdIndex] = useState<number | null>(null);
  const [searchingContraDrugIndex, setSearchingContraDrugIndex] = useState<
    number | null
  >(null);
  const [contraDrugQuery, setContraDrugQuery] = useState("");
  const [searchingWarnDrugIndex, setSearchingWarnDrugIndex] = useState<number | null>(null);
  const [warnDrugQuery, setWarnDrugQuery] = useState("");
  const [searchingPrecDrugIndex, setSearchingPrecDrugIndex] = useState<number | null>(null);
  const [precDrugQuery, setPrecDrugQuery] = useState("");
  const [icdQuery, setIcdQuery] = useState("");
  const hasLoadedIcdRef = useRef(false);

  const [excipientSuggestions, setExcipientSuggestions] = useState<any[]>([]);
  const [showExcipientSuggestions, setShowExcipientSuggestions] =
    useState(false);
  const [focusedExcipientIndex, setFocusedExcipientIndex] = useState(-1);
  const excipientInputRef = useRef<HTMLInputElement>(null);

  const [ingredientSuggestions, setIngredientSuggestions] = useState<any[]>([]);
  const [showIngredientSuggestions, setShowIngredientSuggestions] =
    useState(false);
  const [focusedIngredientIndex, setFocusedIngredientIndex] = useState(-1);
  const [activeIngredientRowIndex, setActiveIngredientRowIndex] = useState<
    number | null
  >(null);

  // States for interaction specific drug/active-ingredient/group pairing
  const [partnerSearchQueries, setPartnerSearchQueries] = useState<
    Record<number, string>
  >({});
  const [partnerSearchType, setPartnerSearchType] = useState<
    Record<number, "ingredient" | "group">
  >({});
  const [selectedSelfIngredient, setSelectedSelfIngredient] = useState<
    Record<number, string>
  >({});
  const [partnerInputText, setPartnerInputText] = useState<
    Record<number, string>
  >({});
  const [activePartnerSuggestRowIdx, setActivePartnerSuggestRowIdx] = useState<
    number | null
  >(null);
  const [selectedInteractionIngredient, setSelectedInteractionIngredient] =
    useState<string>("all");

  // States for Báo cáo số lượng (Quantity Report)
  const [selectedReportLotIndex, setSelectedReportLotIndex] = useState<string>("0");
  const [reportLotNumber, setReportLotNumber] = useState<string>("");
  const [reportExpiryDate, setReportExpiryDate] = useState<string>("");
  const [reportQuantity, setReportQuantity] = useState<string>("");
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  // Sync quantity report input fields when formData.lots or selected lot changes
  useEffect(() => {
    if (formData.lots && formData.lots.length > 0) {
      const idxNum = Number(selectedReportLotIndex);
      const targetLot = formData.lots[idxNum] || formData.lots[0];
      if (targetLot && selectedReportLotIndex !== "new") {
        setReportLotNumber(targetLot.lotNumber || "");
        setReportExpiryDate(targetLot.expiryDate || "");
        setReportQuantity(targetLot.quantity !== undefined && targetLot.quantity !== null ? String(targetLot.quantity) : "");
        if (targetLot.reportDate) {
          setReportDate(targetLot.reportDate);
        }
      }
    } else {
      if (selectedReportLotIndex !== "new") {
        setReportLotNumber(formData.lotNumber || "");
        setReportExpiryDate(formData.expiryDate || "");
        setReportQuantity(formData.stockQuantity !== undefined && formData.stockQuantity !== null ? String(formData.stockQuantity) : "");
        if (formData.lastReportDate) {
          setReportDate(formData.lastReportDate);
        }
      }
    }
  }, [formData.lots, selectedReportLotIndex]);

  const handleSaveQuantityReport = () => {
    const currentLots = [...(formData.lots || [])];
    const qVal = reportQuantity !== "" ? Number(reportQuantity) : 0;
    const repDate = reportDate || new Date().toISOString().split("T")[0];

    let updatedLots = [...currentLots];

    if (selectedReportLotIndex !== "" && selectedReportLotIndex !== "new") {
      const idx = Number(selectedReportLotIndex);
      if (updatedLots[idx]) {
        updatedLots[idx] = {
          ...updatedLots[idx],
          lotNumber: reportLotNumber.trim() || updatedLots[idx].lotNumber,
          expiryDate: reportExpiryDate || updatedLots[idx].expiryDate,
          quantity: qVal,
          reportDate: repDate,
        };
      }
    } else {
      const existingIdx = updatedLots.findIndex(
        (l) => l.lotNumber.trim().toLowerCase() === reportLotNumber.trim().toLowerCase()
      );
      if (existingIdx >= 0) {
        updatedLots[existingIdx] = {
          ...updatedLots[existingIdx],
          lotNumber: reportLotNumber.trim() || updatedLots[existingIdx].lotNumber,
          expiryDate: reportExpiryDate || updatedLots[existingIdx].expiryDate,
          quantity: qVal,
          reportDate: repDate,
        };
        setSelectedReportLotIndex(String(existingIdx));
      } else {
        const newLotObj = {
          lotNumber: reportLotNumber.trim() || "Lô mới",
          expiryDate: reportExpiryDate || "",
          quantity: qVal,
          reportDate: repDate,
        };
        updatedLots.push(newLotObj);
        setSelectedReportLotIndex(String(updatedLots.length - 1));
      }
    }

    const totalQty = updatedLots.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);

    let suggestedStockStatus = formData.stockStatus;
    if (totalQty === 0) {
      suggestedStockStatus = "out";
    } else if (totalQty <= 50) {
      suggestedStockStatus = "low";
    } else {
      suggestedStockStatus = "available";
    }

    const newReportLog = {
      id: Math.random().toString(36).substring(2, 9),
      lotNumber: reportLotNumber || (updatedLots[0]?.lotNumber ?? ""),
      expiryDate: reportExpiryDate || (updatedLots[0]?.expiryDate ?? ""),
      quantity: qVal,
      reportDate: repDate,
      createdAt: new Date().toISOString(),
    };

    const updatedReports = [newReportLog, ...(formData.quantityReports || [])];

    setFormData({
      ...formData,
      lots: updatedLots,
      stockQuantity: totalQty,
      lastReportDate: repDate,
      stockStatus: suggestedStockStatus,
      quantityReports: updatedReports,
    });

    const displayLotName = reportLotNumber || (updatedLots[0]?.lotNumber ? updatedLots[0].lotNumber : "Lô");
    const displayDateStr = repDate.split("-").reverse().join("/");
    setReportSuccessMsg(`Đã cập nhật báo cáo số lượng (${qVal}) cho ${displayLotName} (Ngày BC: ${displayDateStr})`);
    setTimeout(() => {
      setReportSuccessMsg(null);
    }, 3500);
  };

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    indications: true,
    contraindications: true,
    dosage: true,
    interactions: true,
    warnings: true,
    pharmacology: true,
  });

  // Auto-calculate expiryStatus based on expiryDate and expiryAlertMonths threshold
  useEffect(() => {
    if (formData && formData.expiryDate !== undefined) {
      const expDateStr = formData.expiryDate;
      const alertMonths = formData.expiryAlertMonths || 3;

      let calcStatus: "valid" | "expiring" | "expired" = "valid";
      if (expDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expDate = new Date(expDateStr);
        if (!isNaN(expDate.getTime())) {
          if (expDate < today) {
            calcStatus = "expired";
          } else {
            const thresholdDate = new Date();
            thresholdDate.setHours(0, 0, 0, 0);
            thresholdDate.setMonth(thresholdDate.getMonth() + alertMonths);
            if (expDate <= thresholdDate) {
              calcStatus = "expiring";
            }
          }
        }
      }

      if (formData.expiryStatus !== calcStatus) {
        setFormData((prev) => ({
          ...prev,
          expiryStatus: calcStatus,
        }));
      }
    }
  }, [formData.expiryDate, formData.expiryAlertMonths, formData.expiryStatus]);

  // Lock scroll on outer container when a drug is selected (Mobile only)
  useEffect(() => {
    if (!selectedDrug || window.innerWidth >= 1024) return;

    const mainContainer = document.querySelector("main");
    if (mainContainer) {
      const originalOverflow = mainContainer.style.overflow;
      mainContainer.style.overflow = "hidden";
      return () => {
        mainContainer.style.overflow = originalOverflow;
      };
    }
  }, [selectedDrug]);

  const [activeDetailTab, setActiveDetailTab] = useState<
    | "indications"
    | "contraindications"
    | "dosage"
    | "interactions"
    | "warnings"
    | "side_effects"
    | "pharmacology"
  >("indications");

  const detailTabs = [
    { id: "indications", label: "Chỉ định", icon: <Info size={14} /> },
    {
      id: "contraindications",
      label: "Chống chỉ định",
      icon: <ShieldAlert size={14} />,
    },
    { id: "dosage", label: "Liều lượng", icon: <Clock size={14} /> },
    {
      id: "side_effects",
      label: "Tác dụng phụ",
      icon: <AlertCircle size={14} />,
    },
    { id: "interactions", label: "Tương tác", icon: <RefreshCw size={14} /> },
    { id: "warnings", label: "Cảnh báo", icon: <AlertTriangle size={14} /> },
    { id: "pharmacology", label: "Dược lý", icon: <Activity size={14} /> },
  ];

  const handleSwipe = (direction: number) => {
    const currentIndex = detailTabs.findIndex((t) => t.id === activeDetailTab);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < detailTabs.length) {
      setActiveDetailTab(detailTabs[nextIndex].id as any);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Image Editor state
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string>("");
  const [editingImageType, setEditingImageType] = useState<"avatar">("avatar");

  // Drug Detail Modal & Desktop Header Tabs State & Persistence
  const STORAGE_KEY_OPENED_TABS = "drug_directory_opened_tabs";
  const STORAGE_KEY_ACTIVE_TAB = "drug_directory_active_tab_id";

  const safeGetItem = (key: string): string | null => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  };
  const safeSetItem = (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(key, value);
    } catch {}
  };
  const safeRemoveItem = (key: string): void => {
    try {
      if (typeof window !== "undefined") localStorage.removeItem(key);
    } catch {}
  };

  interface DrugTabItem {
    id: string;
    name: string;
    drug: Drug;
  }

  const [openedDrugTabs, setOpenedDrugTabs] = useState<DrugTabItem[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEY_OPENED_TABS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error restoring opened drug tabs from localStorage:", e);
    }
    return [];
  });

  const [activeDrugTabId, setActiveDrugTabId] = useState<string | null>(() => {
    try {
      const savedActive = safeGetItem(STORAGE_KEY_ACTIVE_TAB);
      const savedTabs = safeGetItem(STORAGE_KEY_OPENED_TABS);
      if (savedActive && savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.some((t: DrugTabItem) => t.id === savedActive)) {
          return savedActive;
        }
      }
    } catch {}
    return null;
  });

  const [detailDrug, setDetailDrug] = useState<Drug | null>(() => {
    try {
      const savedActive = safeGetItem(STORAGE_KEY_ACTIVE_TAB);
      const savedTabs = safeGetItem(STORAGE_KEY_OPENED_TABS);
      if (savedActive && savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed)) {
          const found = parsed.find((t: DrugTabItem) => t.id === savedActive);
          if (found?.drug) return found.drug;
        }
      }
    } catch (e) {
      console.error("Error restoring detail drug from localStorage:", e);
    }
    return null;
  });

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(() => {
    try {
      const savedActive = safeGetItem(STORAGE_KEY_ACTIVE_TAB);
      return Boolean(savedActive);
    } catch {
      return false;
    }
  });

  // Sync openedDrugTabs to localStorage whenever changed (debounced to avoid blocking I/O during drag)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (openedDrugTabs.length > 0) {
          safeSetItem(STORAGE_KEY_OPENED_TABS, JSON.stringify(openedDrugTabs));
        } else {
          safeRemoveItem(STORAGE_KEY_OPENED_TABS);
        }
      } catch (e) {
        console.error("Error saving openedDrugTabs to localStorage:", e);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [openedDrugTabs]);

  // Sync activeDrugTabId to localStorage whenever changed
  useEffect(() => {
    try {
      if (activeDrugTabId) {
        safeSetItem(STORAGE_KEY_ACTIVE_TAB, activeDrugTabId);
      } else {
        safeRemoveItem(STORAGE_KEY_ACTIVE_TAB);
      }
    } catch (e) {
      console.error("Error saving activeDrugTabId to localStorage:", e);
    }
  }, [activeDrugTabId]);

  // Synchronize opened drug tabs with fresh data from Firestore whenever drugs list updates
  const prevDrugsForTabsSyncRef = useRef<Drug[]>(drugs);
  useEffect(() => {
    if (!drugs || drugs.length === 0 || openedDrugTabs.length === 0) return;

    // Khi người dùng chỉ đang kéo thả đổi thứ tự tab, danh sách `drugs` không đổi -> bỏ qua để tránh duyệt lại hàng ngàn thuốc gây giật lag
    if (prevDrugsForTabsSyncRef.current === drugs) {
      if (activeDrugTabId && !detailDrug) {
        const activeTab = openedDrugTabs.find((t) => t.id === activeDrugTabId);
        if (activeTab?.drug) {
          setDetailDrug(activeTab.drug);
        } else {
          const found = drugs.find((d) => d.id === activeDrugTabId);
          if (found) setDetailDrug(found);
        }
      }
      return;
    }
    prevDrugsForTabsSyncRef.current = drugs;

    let hasChanges = false;
    const updatedTabs = openedDrugTabs.map((tab) => {
      const freshDrug = drugs.find(
        (d) =>
          d.id === tab.id ||
          (tab.drug?.id && d.id === tab.drug.id) ||
          d.name.toLowerCase() === tab.name.toLowerCase()
      );
      if (freshDrug) {
        if (!tab.drug || tab.drug.updatedAt !== freshDrug.updatedAt || tab.name !== freshDrug.name) {
          hasChanges = true;
          return { ...tab, name: freshDrug.name, drug: freshDrug };
        }
      }
      return tab;
    });

    if (hasChanges) {
      setOpenedDrugTabs(updatedTabs);
      if (activeDrugTabId) {
        const activeTab = updatedTabs.find((t) => t.id === activeDrugTabId);
        if (activeTab && activeTab.drug) {
          setDetailDrug(activeTab.drug);
        }
      }
    } else if (activeDrugTabId && !detailDrug) {
      const activeTab = openedDrugTabs.find((t) => t.id === activeDrugTabId);
      if (activeTab?.drug) {
        setDetailDrug(activeTab.drug);
      } else {
        const found = drugs.find((d) => d.id === activeDrugTabId);
        if (found) setDetailDrug(found);
      }
    }
  }, [drugs, activeDrugTabId, openedDrugTabs, detailDrug]);

  const handleShowDrugDetail = (drug: Drug) => {
    const tabId = drug.id || drug.name;
    setOpenedDrugTabs((prev) => {
      const existsIndex = prev.findIndex(
        (t) => t.id === tabId || t.name.toLowerCase() === drug.name.toLowerCase()
      );
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = { ...copy[existsIndex], drug };
        return copy;
      }
      return [...prev, { id: tabId, name: drug.name, drug }];
    });
    setActiveDrugTabId(tabId);
    setDetailDrug(drug);
    setIsDetailModalOpen(true);
  };

  const handleSelectDirectoryTab = () => {
    setActiveDrugTabId(null);
  };

  const handleSelectDrugTab = (tab: DrugTabItem) => {
    setActiveDrugTabId(tab.id);
    setDetailDrug(tab.drug);
    setIsDetailModalOpen(true);
  };

  const handleCloseDrugTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsTabsResizing(true);
    setOpenedDrugTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      if (activeDrugTabId === tabId) {
        if (remaining.length > 0) {
          const nextTab = remaining[remaining.length - 1];
          setActiveDrugTabId(nextTab.id);
          setDetailDrug(nextTab.drug);
        } else {
          setActiveDrugTabId(null);
          setDetailDrug(null);
          setIsDetailModalOpen(false);
        }
      }
      return remaining;
    });
    setTabsLayoutKey((k) => k + 1);
    setTimeout(() => {
      setIsTabsResizing(false);
    }, 80);
  };

  const handleOpenPdfViewer = (drug: Drug) => {
    if (drug.pdfUrl) {
      setPdfViewerDrug(drug);
      setPdfViewerUrl(drug.pdfUrl);
    }
  };

  const handleClosePdfViewer = () => {
    setPdfViewerUrl(null);
    setPdfViewerDrug(null);
  };

  const handleImageCropConfirm = (croppedImage: string) => {
    if (editingImageType === "avatar") {
      setFormData({ ...formData, avatarUrl: croppedImage });
    }
    setIsImageEditorOpen(false);
  };

  const openImageEditor = (url: string, type: "avatar") => {
    if (!url) return;
    setImageToEdit(url);
    setEditingImageType(type);
    setIsImageEditorOpen(true);
  };

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
  const initialFormSnapshotRef = useRef<string | null>(null);

  const isFormChanged = () => {
    if (!initialFormSnapshotRef.current) return false;
    // If it's a new drug and no key content has been entered yet, treat as unchanged
    if (!editingDrug) {
      const hasAnyContent =
        (formData.name && formData.name.trim() !== "") ||
        (formData.activeIngredients && formData.activeIngredients.length > 0) ||
        (formData.dosageForm && formData.dosageForm.trim() !== "") ||
        (sideEffectsText && sideEffectsText.trim() !== "") ||
        (contraindicationsText && contraindicationsText.trim() !== "") ||
        selectedFile !== null;
      if (!hasAnyContent) return false;
    }
    const currentSnapshot = JSON.stringify({
      formData,
      sideEffectsText,
      contraindicationsText,
      selectedFileName: selectedFile ? selectedFile.name : null,
    });
    return currentSnapshot !== initialFormSnapshotRef.current;
  };

  const handleAttemptCloseModal = () => {
    if (uploading) return;
    if (isFormChanged()) {
      setIsUnsavedConfirmOpen(true);
    } else {
      setIsModalOpen(false);
      setEditingDrug(null);
    }
  };

  // Prevent accidentally closing or reloading the page while adding/editing a drug, and lock background gestures/scroll
  useEffect(() => {
    if (!isModalOpen) return;

    window.dispatchEvent(new CustomEvent("set-tab-swipe-lock", { detail: { locked: true } }));
    window.dispatchEvent(new CustomEvent("lock-app-swipe", { detail: { locked: true } }));
    const origBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const mainContainer = document.querySelector("main");
    const origMainOverflow = mainContainer ? mainContainer.style.overflow : "";
    if (mainContainer) {
      mainContainer.style.overflow = "hidden";
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = "Bạn đang thêm hoặc chỉnh sửa thông tin thuốc. Thay đổi của bạn có thể không được lưu nếu bạn rời khỏi trang.";
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isUnsavedConfirmOpen) {
          setIsUnsavedConfirmOpen(false);
        } else {
          handleAttemptCloseModal();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.dispatchEvent(new CustomEvent("set-tab-swipe-lock", { detail: { locked: false } }));
      window.dispatchEvent(new CustomEvent("lock-app-swipe", { detail: { locked: false } }));
      document.body.style.overflow = origBodyOverflow;
      if (mainContainer) {
        mainContainer.style.overflow = origMainOverflow;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, isUnsavedConfirmOpen]);

  // Prevent background app tab swipe when DrugDetailModal is open on mobile
  useEffect(() => {
    if (!isDetailModalOpen) return;

    window.dispatchEvent(new CustomEvent("set-tab-swipe-lock", { detail: { locked: true } }));
    window.dispatchEvent(new CustomEvent("lock-app-swipe", { detail: { locked: true } }));

    return () => {
      window.dispatchEvent(new CustomEvent("set-tab-swipe-lock", { detail: { locked: false } }));
      window.dispatchEvent(new CustomEvent("lock-app-swipe", { detail: { locked: false } }));
    };
  }, [isDetailModalOpen]);
  const [confirmData, setConfirmData] = useState<{
    id: string;
    name: string;
    pdfUrl?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        groupFilterRef.current &&
        !groupFilterRef.current.contains(event.target as Node)
      ) {
        setIsGroupFilterOpen(false);
      }
      if (
        dosageFormFilterRef.current &&
        !dosageFormFilterRef.current.contains(event.target as Node)
      ) {
        setIsDosageFormFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close action menu & info tooltips when clicking outside
  useEffect(() => {
    if (!openActionMenuId && !openTooltipId) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (openActionMenuId && !target.closest(".action-menu-container")) {
        setOpenActionMenuId(null);
      }
      if (openTooltipId && !target.closest(".info-tooltip-container")) {
        setOpenTooltipId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [openActionMenuId, openTooltipId]);

  // Live lookup: always find the current portal node at render time.
  // This prevents stale-reference bugs where DrugDirectory holds onto a detached
  // DOM node after App.tsx destroys and recreates the portal div on tab change.
  const getPortalNode = () =>
    subHeaderPortalId ? document.getElementById(subHeaderPortalId) : null;
  const getDesktopTabsPortalNode = () =>
    typeof document !== "undefined" ? document.getElementById("desktop-header-tabs-portal") : null;

  useEffect(() => {
    if (initialSelectedDrugId && drugs.length > 0) {
      const drug = drugs.find((d) => d.id === initialSelectedDrugId);
      if (drug) {
        const canSeeThisDrug =
          !drug.isClosed || (canManage && canSeeClosedDrugs);
        if (canSeeThisDrug) {
          handleShowDrugDetail(drug);
          setViewMode("drugs");
        }
        if (onClearInitialDrug) onClearInitialDrug();
      }
    }
  }, [
    initialSelectedDrugId,
    drugs,
    onClearInitialDrug,
    canManage,
    canSeeClosedDrugs,
  ]);

  useEffect(() => {
    if (initialSelectedDrugName && drugs.length > 0) {
      const nameLower = initialSelectedDrugName.toLowerCase().trim();
      const drug = drugs.find(
        (d) => (d.name || "").toLowerCase().trim() === nameLower,
      );
      if (drug) {
        const canSeeThisDrug =
          !drug.isClosed || (canManage && canSeeClosedDrugs);
        if (canSeeThisDrug) {
          handleShowDrugDetail(drug);
          setViewMode("drugs");
        }
      } else {
        // Fallback: set search term so user sees filtered results
        setSearchTerm(initialSelectedDrugName);
      }
      if (onClearInitialDrug) onClearInitialDrug();
    }
  }, [
    initialSelectedDrugName,
    drugs,
    onClearInitialDrug,
    canManage,
    canSeeClosedDrugs,
  ]);

  useEffect(() => {
    const q = query(collection(db, "drugs"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const drugsData = snapshot.docs.map((doc) => {
          const data = sanitizeFirestoreData(doc.data()) as Drug;
          return {
            ...data,
            id: data.id || doc.id,
            groupIds: data.groupIds || (data.groupId ? [data.groupId] : []),
            interactionGroupIds: data.interactionGroupIds || [],
            indications: data.indications || [],
            contraindications: data.contraindications || [],
            sideEffects: data.sideEffects || [],
          };
        });
        setDrugs(drugsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching drugs:", error);
        handleFirestoreError(error, OperationType.LIST, "drugs");
        setLoading(false);
      },
    );

    const unsubscribeGroups = onSnapshot(
      query(collection(db, "drug_groups"), orderBy("order")),
      (snapshot) => {
        const groups = snapshot.docs.map((doc) => sanitizeFirestoreData(doc.data()) as DrugGroup);
        setDrugGroups(groups);
      },
    );

    const unsubscribeIngredients = onSnapshot(
      query(collection(db, "ingredients"), orderBy("name")),
      (snapshot) => {
        const ingredients = snapshot.docs.map(
          (doc) => sanitizeFirestoreData(doc.data()) as Ingredient,
        );
        setAvailableIngredients(ingredients);
      },
    );

    const unsubscribeExcipients = onSnapshot(
      query(collection(db, "excipients"), orderBy("name")),
      (snapshot) => {
        const excipients = snapshot.docs.map((doc) => sanitizeFirestoreData(doc.data()));
        setAvailableExcipients(excipients);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "excipients");
      },
    );

    const unsubscribeCompanies = onSnapshot(
      query(collection(db, "companies"), orderBy("name")),
      (snapshot) => {
        const companies = snapshot.docs.map((doc) => sanitizeFirestoreData(doc.data()));
        setAvailableCompanies(companies);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "companies");
      },
    );

    const unsubscribeAdrCatalog = onSnapshot(
      collection(db, "adr_catalog"),
      (snapshot) => {
        const items = snapshot.docs.map((doc) => sanitizeFirestoreData(doc.data()));
        setAdrCatalog(items);
      },
      (error) => {
        console.warn("Could not load adr_catalog from Firestore:", error.message);
      },
    );

    return () => {
      unsubscribe();
      unsubscribeGroups();
      unsubscribeIngredients();
      unsubscribeExcipients();
      unsubscribeCompanies();
      unsubscribeAdrCatalog();
    };
  }, []);

  useEffect(() => {
    const shouldLoadIcd =
      isModalOpen ||
      searchingIcdIndex !== null ||
      searchingContraIcdIndex !== null ||
      searchingContraCautionIcdIndex !== null ||
      searchingWarnIcdIndex !== null ||
      searchingPrecautionIcdIndex !== null ||
      !!selectedDrug;
    if (!shouldLoadIcd || hasLoadedIcdRef.current) return;

    hasLoadedIcdRef.current = true;
    const unsubscribeICD = subscribeICD10((list) => {
      setIcdList(list);
    });

    return () => {
      unsubscribeICD();
      hasLoadedIcdRef.current = false;
    };
  }, [isModalOpen, searchingIcdIndex, searchingContraIcdIndex, searchingContraCautionIcdIndex, selectedDrug]);

  const [isIcdLookupOpen, setIsIcdLookupOpen] = useState(false);
  const [icdLookupTarget, setIcdLookupTarget] = useState<{
    type: "indication" | "contraindication" | "contraindication_caution" | "precaution" | "warning";
    index: number;
  } | null>(null);
  const [showIcdFilters, setShowIcdFilters] = useState(false);
  const [icdChapterFilter, setIcdChapterFilter] = useState<string>("all");
  const [icdSuggestionFilter, setIcdSuggestionFilter] = useState<
    "all" | "suggested" | "not_suggested"
  >("all");

  const [daggerSearchTerm, setDaggerSearchTerm] = useState("");
  const [asteriskSearchTerm, setAsteriskSearchTerm] = useState("");
  const [activeDoubleIcdIndex, setActiveDoubleIcdIndex] = useState<number | null>(null);
  const [isDaggerFocused, setIsDaggerFocused] = useState(false);
  const [isAsteriskFocused, setIsAsteriskFocused] = useState(false);

  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    new Set(),
  );

  // Default collapse all when entering groups tab
  useEffect(() => {
    if (viewMode === "groups") {
      setExpandedGroupIds((prev) => (prev.size === 0 ? prev : new Set()));
    }
  }, [viewMode]);

  const handleExpandAllGroups = () => {
    setExpandedGroupIds(new Set(drugGroups.map((g) => g.id)));
  };

  const handleCollapseAllGroups = () => {
    setExpandedGroupIds(new Set());
  };

  const toggleGroupExpand = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const sortedDrugGroups = useMemo(() => {
    const buildTree = (
      parentId: string | null = null,
      seen = new Set<string>(),
    ): DrugGroup[] => {
      return drugGroups
        .filter((g) => g.parentId === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .flatMap((g) => {
          if (seen.has(g.id)) return []; // Prevent infinite recursion
          const newSeen = new Set(seen);
          newSeen.add(g.id);
          return [g, ...buildTree(g.id, newSeen)];
        });
    };
    try {
      return buildTree(null);
    } catch (e) {
      console.error("Circular dependency in drug groups:", e);
      return [];
    }
  }, [drugGroups]);

  // Map each group to a set of all its descendant group IDs (including itself)
  const groupDescendantsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    const getDescendants = (id: string): Set<string> => {
      if (map[id]) return map[id];
      const descendants = new Set<string>([id]);
      drugGroups
        .filter((g) => g.parentId === id)
        .forEach((child) => {
          getDescendants(child.id).forEach((dId) => descendants.add(dId));
        });
      map[id] = descendants;
      return descendants;
    };

    drugGroups.forEach((g) => getDescendants(g.id));
    return map;
  }, [drugGroups]);

  // Calculate recursive drug counts for each group in a single pass over drugs
  const groupDrugCounts = useMemo(() => {
    const directCounts: Record<string, number> = {};
    for (let i = 0; i < drugs.length; i++) {
      const d = drugs[i];
      if (d.groupId) {
        directCounts[d.groupId] = (directCounts[d.groupId] || 0) + 1;
      }
      if (Array.isArray(d.groupIds)) {
        for (let j = 0; j < d.groupIds.length; j++) {
          const gid = d.groupIds[j];
          if (gid && gid !== d.groupId) {
            directCounts[gid] = (directCounts[gid] || 0) + 1;
          }
        }
      }
      if (Array.isArray(d.interactionGroupIds)) {
        for (let j = 0; j < d.interactionGroupIds.length; j++) {
          const gid = d.interactionGroupIds[j];
          if (gid) {
            directCounts[gid] = (directCounts[gid] || 0) + 1;
          }
        }
      }
    }

    const counts: Record<string, number> = {};
    drugGroups.forEach((g) => {
      const descendants = groupDescendantsMap[g.id];
      let total = 0;
      if (descendants) {
        descendants.forEach((dId) => {
          total += directCounts[dId] || 0;
        });
      } else {
        total = directCounts[g.id] || 0;
      }
      counts[g.id] = total;
    });
    return counts;
  }, [drugs, drugGroups, groupDescendantsMap]);

  const uniqueIngredients = useMemo(() => {
    const ingredientsMap = new Map<
      string,
      { name: string; drugCount: number }
    >();
    drugs.forEach((drug) => {
      (drug.activeIngredients || []).forEach((ing) => {
        const name = (ing.name || "").trim();
        if (!name) return;
        const key = name.toLowerCase();
        const existing = ingredientsMap.get(key);
        if (existing) {
          existing.drugCount++;
        } else {
          ingredientsMap.set(key, { name, drugCount: 1 });
        }
      });
    });
    return Array.from(ingredientsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [drugs]);

  const stockStats = useMemo(() => {
    let available = 0;
    let low = 0;
    let out = 0;
    let active = 0;
    let suspended = 0;
    let hidden = 0;
    drugs.forEach((d) => {
      if (d.isClosed) hidden++;
      if (d.status === "suspended") {
        suspended++;
      } else if (!d.isClosed) {
        active++;
      }
      if (d.stockStatus === "low") {
        low++;
      } else if (d.stockStatus === "out") {
        out++;
      } else {
        available++;
      }
    });
    return { available, low, out, active, suspended, hidden, totalGroups: drugGroups.length };
  }, [drugs, drugGroups]);

  // 3-Level Group calculations
  const activeClassificationGroups = useMemo(() => {
    return drugGroups.filter((g) => (g.classification || "treatment") === groupTypeTab);
  }, [drugGroups, groupTypeTab]);

  const groupLevelResolvedMap = useMemo(() => {
    const map: Record<string, number> = {};
    const groupMap = new Map<string, DrugGroup>();
    activeClassificationGroups.forEach((g) => groupMap.set(g.id, g));

    const resolveLevel = (g: DrugGroup, visited = new Set<string>()): number => {
      if (map[g.id] !== undefined) return map[g.id];
      if (visited.has(g.id)) return 0;
      visited.add(g.id);

      if (g.level !== undefined && g.level !== null && g.level >= 0) {
        map[g.id] = g.level;
        return g.level;
      }
      if (!g.parentId) {
        map[g.id] = 0;
        return 0;
      }
      const parent = groupMap.get(g.parentId);
      if (!parent) {
        map[g.id] = 0;
        return 0;
      }
      const parentLevel = resolveLevel(parent, visited);
      const lvl = Math.min(parentLevel + 1, 2);
      map[g.id] = lvl;
      return lvl;
    };

    activeClassificationGroups.forEach((g) => resolveLevel(g));
    return map;
  }, [activeClassificationGroups]);

  const cap1Groups = useMemo(() => {
    return activeClassificationGroups
      .filter((g) => groupLevelResolvedMap[g.id] === 0)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  }, [activeClassificationGroups, groupLevelResolvedMap]);

  // Pre-indexed group meta: descendants, lowercase names, lowercase codes
  const groupMetaMap = useMemo(() => {
    const map: Record<
      string,
      {
        descendants: Set<string>;
        namesLower: Set<string>;
        codesLower: Set<string>;
      }
    > = {};

    const groupObjMap = new Map<string, DrugGroup>();
    drugGroups.forEach((g) => groupObjMap.set(g.id, g));

    drugGroups.forEach((g) => {
      const descendants = groupDescendantsMap[g.id] || new Set([g.id]);
      const namesLower = new Set<string>();
      const codesLower = new Set<string>();

      descendants.forEach((dId) => {
        const obj = groupObjMap.get(dId);
        if (obj) {
          const n = (obj.name || "").toLowerCase().trim();
          if (n) namesLower.add(n);
          const c = ((obj as any).code || "").toLowerCase().trim();
          if (c) codesLower.add(c);
        }
      });

      map[g.id] = { descendants, namesLower, codesLower };
    });

    return map;
  }, [drugGroups, groupDescendantsMap]);

  // Precompute drug membership across all groups in one pass
  const baseGroupDrugsMap = useMemo(() => {
    const map: Record<string, Drug[]> = {};
    if (drugs.length === 0 || drugGroups.length === 0) return map;

    const prepared = drugs.map((drug) => {
      const groupField = (
        (drug as any).drugGroup ||
        drug.pharmacologicalGroup ||
        (drug as any).therapeuticGroup ||
        (drug as any).category ||
        (drug as any).groupName ||
        ""
      ).toLowerCase().trim();

      const drugAtc = (drug.atcCode || "").toLowerCase().trim();
      const drugGroupId = (drug.groupId || "").toLowerCase().trim();
      const lowerGroupIds = Array.isArray(drug.groupIds)
        ? drug.groupIds.map((gid) => String(gid || "").toLowerCase().trim()).filter(Boolean)
        : [];
      const lowerInteractionIds = Array.isArray(drug.interactionGroupIds)
        ? drug.interactionGroupIds.map((gid) => String(gid || "").toLowerCase().trim()).filter(Boolean)
        : [];

      return {
        drug,
        groupField,
        drugAtc,
        drugGroupId,
        lowerGroupIds,
        lowerInteractionIds,
      };
    });

    drugGroups.forEach((g) => {
      const meta = groupMetaMap[g.id];
      if (!meta) {
        map[g.id] = [];
        return;
      }
      const { descendants, namesLower, codesLower } = meta;
      const matched: Drug[] = [];

      for (let i = 0; i < prepared.length; i++) {
        const item = prepared[i];
        const d = item.drug;

        // 1. Direct ID matches
        if (d.groupId && descendants.has(d.groupId)) {
          matched.push(d);
          continue;
        }
        if (item.lowerGroupIds.length > 0 && item.lowerGroupIds.some((id) => descendants.has(id))) {
          matched.push(d);
          continue;
        }
        if (item.lowerInteractionIds.length > 0 && item.lowerInteractionIds.some((id) => descendants.has(id))) {
          matched.push(d);
          continue;
        }

        // 2. Direct string match
        if (item.drugGroupId && (namesLower.has(item.drugGroupId) || codesLower.has(item.drugGroupId))) {
          matched.push(d);
          continue;
        }
        if (item.lowerGroupIds.some((gid) => namesLower.has(gid) || codesLower.has(gid))) {
          matched.push(d);
          continue;
        }

        // 3. Name containment
        if (item.groupField) {
          if (namesLower.has(item.groupField) || codesLower.has(item.groupField)) {
            matched.push(d);
            continue;
          }
          let foundSubstring = false;
          for (const gName of namesLower) {
            if (gName.length >= 3 && (item.groupField.includes(gName) || gName.includes(item.groupField))) {
              foundSubstring = true;
              break;
            }
          }
          if (foundSubstring) {
            matched.push(d);
            continue;
          }
        }

        // 4. ATC code match
        if (item.drugAtc) {
          let foundAtc = false;
          for (const gCode of codesLower) {
            if (gCode.length >= 2 && item.drugAtc.startsWith(gCode)) {
              foundAtc = true;
              break;
            }
          }
          if (foundAtc) {
            matched.push(d);
            continue;
          }
        }
      }

      map[g.id] = matched;
    });

    return map;
  }, [drugs, drugGroups, groupMetaMap]);

  // Set of drug IDs in each group for instant O(1) checks
  const groupDrugIdSets = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const gid in baseGroupDrugsMap) {
      map[gid] = new Set(baseGroupDrugsMap[gid].map((d) => d.id));
    }
    return map;
  }, [baseGroupDrugsMap]);

  // Instant O(1) check if a drug belongs to a group or any of its descendant groups
  const isDrugInGroup = useCallback((drug: Drug, groupId: string) => {
    if (!drug || !groupId) return false;
    const set = groupDrugIdSets[groupId];
    return set ? set.has(drug.id) : false;
  }, [groupDrugIdSets]);

  const getDrugsForGroup = useCallback((groupId: string) => {
    const baseList = baseGroupDrugsMap[groupId] || [];
    if (!groupSearchTerm.trim()) return baseList;
    const q = groupSearchTerm.toLowerCase();
    const groupObj = activeClassificationGroups.find((g) => g.id === groupId);
    if (groupObj && groupObj.name.toLowerCase().includes(q)) return baseList;
    return baseList.filter((d) => {
      return (
        d.name.toLowerCase().includes(q) ||
        (d.activeIngredients || []).some((ing) => (ing.name || "").toLowerCase().includes(q)) ||
        ((d as any).activeIngredient || "").toLowerCase().includes(q) ||
        (d.registrationNumber || "").toLowerCase().includes(q) ||
        (d.manufacturer || "").toLowerCase().includes(q)
      );
    });
  }, [baseGroupDrugsMap, groupSearchTerm, activeClassificationGroups]);

  const cap2GroupsFiltered = useMemo(() => {
    let list = activeClassificationGroups.filter((g) => groupLevelResolvedMap[g.id] === 1);
    if (selectedCap1Id !== "all") {
      list = list.filter((g) => g.parentId === selectedCap1Id);
    }
    if (sidebarCap2Search.trim()) {
      const q = sidebarCap2Search.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (groupSearchTerm.trim()) {
      list = list.filter((g) => getDrugsForGroup(g.id).length > 0);
    }
    return list.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  }, [activeClassificationGroups, groupLevelResolvedMap, selectedCap1Id, sidebarCap2Search, groupSearchTerm, getDrugsForGroup]);

  const displayedCap2Groups = useMemo(() => {
    if (selectedCap2Id !== "all") {
      const found = cap2GroupsFiltered.filter((g) => g.id === selectedCap2Id);
      if (found.length > 0) return found;
    }
    return cap2GroupsFiltered;
  }, [cap2GroupsFiltered, selectedCap2Id]);

  const cap3GroupsFiltered = useMemo(() => {
    let list = activeClassificationGroups.filter((g) => groupLevelResolvedMap[g.id] === 2);
    if (selectedCap1Id !== "all") {
      const validCap2Ids = new Set(
        activeClassificationGroups
          .filter((g) => groupLevelResolvedMap[g.id] === 1 && g.parentId === selectedCap1Id)
          .map((g) => g.id)
      );
      list = list.filter((g) => g.parentId && validCap2Ids.has(g.parentId));
    }
    if (groupSearchTerm.trim()) {
      const q = groupSearchTerm.toLowerCase();
      list = list.filter((g) => {
        if (g.name.toLowerCase().includes(q)) return true;
        return getDrugsForGroup(g.id).length > 0;
      });
    }
    return list.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  }, [activeClassificationGroups, groupLevelResolvedMap, selectedCap1Id, groupSearchTerm, getDrugsForGroup]);

  const groupIngredientsCacheRef = useRef<Map<string, Array<{ name: string; count: number; sampleDrugs: string[] }>>>(new Map());

  useEffect(() => {
    groupIngredientsCacheRef.current.clear();
  }, [drugs, drugGroups]);

  const getIngredientsForGroup = useCallback((groupId: string) => {
    if (groupIngredientsCacheRef.current.has(groupId)) {
      return groupIngredientsCacheRef.current.get(groupId)!;
    }
    const drugsInG = getDrugsForGroup(groupId);
    const ingredientMap = new Map<string, { name: string; drugNames: Set<string> }>();

    drugsInG.forEach((d) => {
      if (d.activeIngredients && d.activeIngredients.length > 0) {
        d.activeIngredients.forEach((ing) => {
          const cleanName = ing.name ? ing.name.trim() : "";
          if (!cleanName || cleanName.length < 2) return;
          const key = cleanName.toLowerCase();
          const existing = ingredientMap.get(key) || { name: cleanName, drugNames: new Set<string>() };
          existing.drugNames.add(d.name);
          ingredientMap.set(key, existing);
        });
      } else if ((d as any).activeIngredient) {
        const parts = ((d as any).activeIngredient as string).split(/[,;\n+]/).map((s) => s.trim()).filter(Boolean);
        parts.forEach((p) => {
          const cleanName = p.replace(/\s*\d+.*$/, "").trim() || p;
          if (cleanName.length < 2) return;
          const key = cleanName.toLowerCase();
          const existing = ingredientMap.get(key) || { name: cleanName, drugNames: new Set<string>() };
          existing.drugNames.add(d.name);
          ingredientMap.set(key, existing);
        });
      }
    });

    const res = Array.from(ingredientMap.values()).map((item) => ({
      name: item.name,
      count: item.drugNames.size,
      sampleDrugs: Array.from(item.drugNames).slice(0, 4),
    }));
    groupIngredientsCacheRef.current.set(groupId, res);
    return res;
  }, [getDrugsForGroup]);

  const filteredIngredients = useMemo(() => {
    return uniqueIngredients.filter((ing) =>
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [uniqueIngredients, searchTerm]);

  const totalIngredientPages = Math.ceil(
    filteredIngredients.length / INGREDIENTS_PER_PAGE,
  );
  const paginatedIngredients = useMemo(() => {
    const start = (ingredientPage - 1) * INGREDIENTS_PER_PAGE;
    return filteredIngredients.slice(start, start + INGREDIENTS_PER_PAGE);
  }, [filteredIngredients, ingredientPage]);

  const selectedIngredientNames = useMemo(() => {
    if (!selectedIngredient) return new Set<string>();

    const searchName = selectedIngredient.toLowerCase();
    const baseIngredient = availableIngredients.find(
      (ai) =>
        ai.name.toLowerCase() === searchName ||
        (ai.alias && ai.alias.toLowerCase() === searchName) ||
        (ai.aliases && ai.aliases.some((a) => a.toLowerCase() === searchName)),
    );

    if (!baseIngredient) return new Set([searchName]);

    const names = new Set<string>();
    names.add(baseIngredient.name.toLowerCase());
    if (baseIngredient.alias) names.add(baseIngredient.alias.toLowerCase());
    if (baseIngredient.aliases) {
      baseIngredient.aliases.forEach((a) => names.add(a.toLowerCase()));
    }
    return names;
  }, [selectedIngredient, availableIngredients]);

  const uniqueDosageForms = useMemo(() => {
    const forms = new Set<string>();
    drugs.forEach((d) => {
      if (d.dosageForm) forms.add(d.dosageForm.trim());
    });
    return Array.from(forms).sort();
  }, [drugs]);

  const activeFiltersCount = useMemo(() => {
    if (viewMode !== "drugs") return 0;
    let count = 0;
    if (statusFilters.length > 0 || statusFilter !== "all") count++;
    if (groupFilter !== "Tất cả") count++;
    if (stockFilter !== "all") count++;
    if (dosageFormFilter !== "all") count++;
    if (favoriteOnlyFilter) count++;
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
    viewMode,
    statusFilter,
    statusFilters,
    groupFilter,
    stockFilter,
    dosageFormFilter,
    favoriteOnlyFilter,
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

  const hasActiveFilters = activeFiltersCount > 0;

  const filteredDrugs = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();

    return drugs
      .filter((drug) => {
        // Visibility logic
        // Only show closed drugs if in management mode AND have enough power points
        if (drug.isClosed && (!canManage || !canSeeClosedDrugs)) return false;
        if (favoriteOnlyFilter && !isFavorite(drug.id)) return false;

        // Status filter (Multi-choice & single support)
        if (statusFilters.length > 0) {
          const opFilters = statusFilters.filter((s) =>
            ["active", "suspended", "hidden"].includes(s)
          );
          const stockStatusFilters = statusFilters.filter((s) =>
            ["low", "out"].includes(s)
          );

          if (opFilters.length > 0) {
            const matchesOp = opFilters.some((f) => {
              if (f === "active") return !drug.isClosed && drug.status !== "suspended";
              if (f === "suspended") return drug.status === "suspended";
              if (f === "hidden") return Boolean(drug.isClosed);
              return false;
            });
            if (!matchesOp) return false;
          }

          if (stockStatusFilters.length > 0) {
            const matchesStockStatus = stockStatusFilters.some((f) => {
              if (f === "low") return drug.stockStatus === "low";
              if (f === "out") return drug.stockStatus === "out";
              return false;
            });
            if (!matchesStockStatus) return false;
          }
        } else if (statusFilter !== "all") {
          if (
            statusFilter === "active" &&
            (drug.isClosed || drug.status === "suspended")
          )
            return false;
          if (statusFilter === "suspended" && drug.status !== "suspended")
            return false;
          if (canManage && statusFilter === "hidden" && !drug.isClosed)
            return false;
          if (statusFilter === "low" && drug.stockStatus !== "low")
            return false;
          if (statusFilter === "out" && drug.stockStatus !== "out")
            return false;
        }

        let matchesSearch = false;
        if (searchMode === "all") {
          matchesSearch =
            (drug.name || "").toLowerCase().includes(term) ||
            (drug.activeIngredients || []).some(
              (ing) =>
                String(ing.name || "")
                  .toLowerCase()
                  .includes(term) ||
                String(ing.amount || "")
                  .toLowerCase()
                  .includes(term) ||
                String(ing.unit || "")
                  .toLowerCase()
                  .includes(term),
            ) ||
            (drug.atcCode || "").toLowerCase().includes(term);
        } else if (searchMode === "name") {
          matchesSearch = (drug.name || "").toLowerCase().includes(term);
        } else if (searchMode === "ingredient") {
          matchesSearch = (drug.activeIngredients || []).some((ing) =>
            String(ing.name || "")
              .toLowerCase()
              .includes(term),
          );
        }

        const matchesGroup =
          groupFilter === "Tất cả" ||
          (drug.groupId &&
            groupDescendantsMap[groupFilter]?.has(drug.groupId)) ||
          (drug.groupIds || []).some((id) =>
            groupDescendantsMap[groupFilter]?.has(id),
          );
        const matchesIngredient =
          selectedIngredientNames.size === 0 ||
          (drug.activeIngredients || []).some((ing) =>
            selectedIngredientNames.has((ing.name || "").toLowerCase()),
          );

        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "available" &&
            (!drug.stockStatus || drug.stockStatus === "available")) ||
          drug.stockStatus === stockFilter;

        const matchesDosageForm =
          dosageFormFilter === "all" ||
          (drug.dosageForm && drug.dosageForm === dosageFormFilter);

        const matchesClinical = isDrugMatchingClinicalFilters(
          drug,
          {
            age: patientAgeMin === patientAgeMax ? patientAgeMin : patientAge,
            minAge: patientAgeMin,
            maxAge: patientAgeMax,
            unit: patientAgeUnit,
            preset: agePreset,
          },
          {
            weight: patientWeightMin === patientWeightMax ? patientWeightMin : patientWeight,
            minWeight: patientWeightMin,
            maxWeight: patientWeightMax,
            preset: weightPreset,
          },
          {
            egfr: patientCrclMin === patientCrclMax ? patientCrclMin : patientEgfr,
            minCrcl: patientCrclMin,
            maxCrcl: patientCrclMax,
            preset: egfrPreset,
          }
        );

        return (
          matchesSearch &&
          matchesGroup &&
          matchesIngredient &&
          matchesStock &&
          matchesDosageForm &&
          matchesClinical
        );
      })
      .sort((a, b) => {
        if (!isGuestUser) {
          // Prioritize new drugs (isNew) to the top
          const aNew = !!a.isNew;
          const bNew = !!b.isNew;
          if (aNew && !bNew) return -1;
          if (!aNew && bNew) return 1;

          // Prioritize updated drugs (isUpdated) below new drugs, but above others
          const aUpdated = !!a.isUpdated;
          const bUpdated = !!b.isUpdated;
          if (aUpdated && !bUpdated) return -1;
          if (!aUpdated && bUpdated) return 1;
        }

        // Sort "Hết hàng" (out of stock) to the bottom
        const aOut = a.stockStatus === "out";
        const bOut = b.stockStatus === "out";
        if (aOut && !bOut) return 1;
        if (!aOut && bOut) return -1;
        return 0;
      });
  }, [
    drugs,
    searchTerm,
    searchMode,
    groupFilter,
    groupDescendantsMap,
    selectedIngredientNames,
    canSeeClosedDrugs,
    canManage,
    statusFilter,
    statusFilters,
    stockFilter,
    dosageFormFilter,
    userRole,
    favoriteOnlyFilter,
    isFavorite,
    patientAgeMin,
    patientAgeMax,
    patientAge,
    patientAgeUnit,
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

  const getDrugGroupName = useCallback((drug: Drug): string => {
    if (drug.groupId) {
      const g = drugGroups.find((grp) => grp.id === drug.groupId);
      if (g) return g.name;
    }
    if (drug.groupIds && drug.groupIds.length > 0) {
      const g = drugGroups.find((grp) => grp.id === drug.groupIds![0]);
      if (g) return g.name;
    }
    if (drug.pharmacologicalGroup) return drug.pharmacologicalGroup;
    return "";
  }, [drugGroups]);

  const getDrugIngredientDisplay = useCallback((drug: Drug): string => {
    if (drug.activeIngredients && drug.activeIngredients.length > 0) {
      return drug.activeIngredients
        .map((ing) => `${ing.name}${ing.amount ? ` ${ing.amount}` : ""}${ing.unit ? ing.unit : ""}`)
        .join(" + ");
    }
    return "";
  }, []);

  const favoriteDrugs = useMemo(() => {
    if (!favoriteIds || favoriteIds.length === 0) return [];
    const favSet = new Set(favoriteIds.map((id) => String(id).trim().toLowerCase()));
    return drugs.filter((drug) => {
      const dId = drug.id ? String(drug.id).trim().toLowerCase() : "";
      const dName = drug.name ? String(drug.name).trim().toLowerCase() : "";
      const dReg = drug.registrationNumber ? String(drug.registrationNumber).trim().toLowerCase() : "";
      return (dId && favSet.has(dId)) || (dName && favSet.has(dName)) || (dReg && favSet.has(dReg));
    });
  }, [drugs, favoriteIds]);

  useEffect(() => {
    setCurrentPage(1);
    setIngredientPage(1);
  }, [
    groupFilter,
    searchMode,
    selectedIngredient,
    itemsPerPage,
    stockFilter,
    dosageFormFilter,
    favoriteOnlyFilter,
    patientAgeMin,
    patientAgeMax,
    patientAge,
    patientWeightMin,
    patientWeightMax,
    patientWeight,
    patientCrclMin,
    patientCrclMax,
    patientEgfr,
    agePreset,
    weightPreset,
    egfrPreset,
  ]);

  // Scroll to top automatically when major group or desktop search changes (do not scroll on clinical filters or mobile filter adjustments)
  useEffect(() => {
    if (viewMode === "drugs" && !isMobile) {
      const scrollElement =
        document.querySelector(".drug-list-container") ||
        document.querySelector("main");
      if (scrollElement) {
        scrollElement.scrollTo({ top: 0, behavior: "auto" });
      }
    }
  }, [
    groupFilter,
    searchTerm,
    selectedIngredient,
    stockFilter,
    dosageFormFilter,
    statusFilter,
    statusFilters,
    favoriteOnlyFilter,
    isMobile,
  ]);

  // Handle searchTerm changes with page restoration
  useEffect(() => {
    const isSearching = (searchTerm || "").trim() !== "";

    if (isSearching) {
      if (!wasSearchingRef.current) {
        // Save current page before starting search
        pageBeforeSearchRef.current = currentPage;
      }
      setCurrentPage(1);
      setIngredientPage(1);
    } else if (wasSearchingRef.current) {
      // Restore previous page when search is cleared
      setCurrentPage(pageBeforeSearchRef.current);
    }

    wasSearchingRef.current = isSearching;
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredDrugs.length / itemsPerPage));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  // Safety: Cap currentPage within totalPages range when results change
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setPageInput(validPage.toString());
  }, [validPage]);

  const paginatedDrugs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDrugs.slice(start, start + itemsPerPage);
  }, [filteredDrugs, currentPage, itemsPerPage]);

  const filteredExcipients = useMemo(() => {
    if (!excipientFormSearch) return [];
    const term = excipientFormSearch.toLowerCase();
    return availableExcipients
      .filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          (e.alias && e.alias.toLowerCase().includes(term)) ||
          (e.aliases &&
            e.aliases.some((a: string) => a.toLowerCase().includes(term))),
      )
      .slice(0, 10);
  }, [availableExcipients, excipientFormSearch]);

  const handleOpenModal = (drug?: Drug) => {
    if (userRole !== "admin" && !canManage) return;
    setSelectedFile(null);
    setFormGroupSearch("");
    setExcipientFormSearch("");
    setActiveTab("company");
    setSelectedSelfIngredient({});
    setPartnerSearchType({});
    setPartnerSearchQueries({});
    setPartnerInputText({});
    setSelectedInteractionIngredient("all");
    setActiveSideEffectIngTab("all");
    setActivePkTabIndex(0);
    if (drug) {
      // Deep clone the drug first to prevent mutating the original reference in-memory
      const clonedDrug = JSON.parse(JSON.stringify(drug)) as Drug;
      setEditingDrug(clonedDrug);
      const groupIds =
        clonedDrug.groupIds || (clonedDrug.groupId ? [clonedDrug.groupId] : []);
      const interactionGroupIds =
        clonedDrug.interactionGroupIds || [];
      const initialData = {
        ...clonedDrug,
        pharmacologicalGroup: clonedDrug.pharmacologicalGroup || "",
        groupIds,
        interactionGroupIds,
        groupId: clonedDrug.groupId || "",
        avatarUrl: clonedDrug.avatarUrl || "",
        pdfUrl: clonedDrug.pdfUrl || "",
        administrationRoute: clonedDrug.administrationRoute || "",
        isRx: !!clonedDrug.isRx,
        isNew: !!clonedDrug.isNew,
        isUpdated: clonedDrug.isUpdated !== undefined ? clonedDrug.isUpdated : false,
        stockStatus: clonedDrug.stockStatus || "available",
        expiryStatus: clonedDrug.expiryStatus || "valid",
        activeIngredients: (clonedDrug.activeIngredients || []).map(
          (ing: any) => {
            const ingGroupIds = Array.isArray(ing.groupIds) && ing.groupIds.length > 0
              ? ing.groupIds
              : ing.groupId
                ? [ing.groupId]
                : ((clonedDrug.activeIngredients || []).length === 1 && groupIds.length > 0
                    ? groupIds
                    : []);
            if ("strength" in ing && !ing.amount && !ing.unit) {
              const match = String(ing.strength).match(/^([\d.,]+)\s*(.*)$/);
              return {
                name: ing.name,
                amount: match ? match[1] : ing.strength,
                unit: match ? match[2] : "",
                sideEffectsNote: ing.sideEffectsNote || "",
                equivalent: ing.equivalent || "",
                equivalentAmount: ing.equivalentAmount || "",
                equivalentUnit: ing.equivalentUnit || "",
                groupIds: ingGroupIds,
                groupId: ingGroupIds[0] || "",
              };
            }
            return {
              name: ing.name,
              amount: ing.amount || "",
              unit: ing.unit || "",
              sideEffectsNote: ing.sideEffectsNote || "",
              equivalent: ing.equivalent || "",
              equivalentAmount: ing.equivalentAmount || "",
              equivalentUnit: ing.equivalentUnit || "",
              groupIds: ingGroupIds,
              groupId: ingGroupIds[0] || "",
            };
          },
        ),
        generalAdministration: clonedDrug.generalAdministration || "",
        generalAdministrationTime: clonedDrug.generalAdministrationTime || "",
        atcCode: clonedDrug.atcCode || "",
        excipients:
          clonedDrug.excipients ||
          (clonedDrug.excipientsList && clonedDrug.excipientsList.length > 0
            ? clonedDrug.excipientsList.map((e: any) => e.name).join(", ")
            : ""),
        excipientsList:
          clonedDrug.excipientsList && clonedDrug.excipientsList.length > 0
            ? clonedDrug.excipientsList
            : (clonedDrug.excipients || "")
                .split(/[,;]\s*/)
                .filter(Boolean)
                .map((name: string) => ({ name, amount: "", unit: "" })),
        tabletWeight: clonedDrug.tabletWeight || "",
        detailedDosageForm: clonedDrug.detailedDosageForm || "",
        indications: (clonedDrug.indications || []).map((i: any) => ({
          ...i,
          icd10s: sortIcd10Codes(i.icd10s || (i.icd10 ? [i.icd10] : [])),
          defaultIcd10s:
            i.defaultIcd10s || (i.defaultIcd10 ? [i.defaultIcd10] : []),
          betterAlternativeIcd10s: i.betterAlternativeIcd10s || [],
          notRecommendedIcd10s: i.notRecommendedIcd10s || [],
        })),
        contraindications: (clonedDrug.contraindications || []).map((c: any) =>
          typeof c === "string"
            ? { content: c, type: "Other", icd10s: [], cautionIcd10s: [] }
            : {
                ...c,
                icd10s: sortIcd10Codes(c.icd10s || (c.icd10 ? [c.icd10] : [])),
                cautionIcd10s: sortIcd10Codes(c.cautionIcd10s || []),
              },
        ),
        sideEffects: (clonedDrug.sideEffects || []).map((se: any) => {
          const item = typeof se === "string" ? { frequency: "Chung", content: se } : se;
          const selfActiveIngs = (clonedDrug.activeIngredients || [])
            .map((ai: any) => ai.name)
            .filter(Boolean);
          const isByIngredient =
            clonedDrug.sideEffectsType === "by_ingredient" ||
            (!clonedDrug.sideEffectsType && selfActiveIngs.length > 1);
          if (isByIngredient && selfActiveIngs.length > 0 && item && typeof item === "object" && !item.ingredient) {
            return { ...item, ingredient: selfActiveIngs[0] };
          }
          return item;
        }),
        sideEffectsType:
          clonedDrug.sideEffectsType ||
          ((clonedDrug.activeIngredients || []).length > 1
            ? "by_ingredient"
            : "general"),
        dosageAndAdministration: clonedDrug.dosageAndAdministration || [],
        precautions: Array.isArray(clonedDrug.precautions)
          ? clonedDrug.precautions
          : clonedDrug.precautions
            ? [{ content: clonedDrug.precautions }]
            : [{ content: "" }],
        warnings: Array.isArray(clonedDrug.warnings)
          ? clonedDrug.warnings
          : [],
        pregnancy: clonedDrug.pregnancy || "",
        pregnancyStatus1: parsePregnancyTrimesters(clonedDrug.pregnancy || "")
          .status1,
        pregnancyStatus2: parsePregnancyTrimesters(clonedDrug.pregnancy || "")
          .status2,
        pregnancyStatus3: parsePregnancyTrimesters(clonedDrug.pregnancy || "")
          .status3,
        pregnancyNotes: parsePregnancyTrimesters(clonedDrug.pregnancy || "")
          .notes,
        lactation: clonedDrug.lactation || "",
        lactationStatus: parseStatusAndNotes(clonedDrug.lactation || "", [
          "Có thể dùng",
          "Cân nhắc lợi hại",
          "Không nên dùng",
          "Không có dữ liệu",
        ]).status,
        lactationNotes: parseStatusAndNotes(clonedDrug.lactation || "", [
          "Có thể dùng",
          "Cân nhắc lợi hại",
          "Không nên dùng",
          "Không có dữ liệu",
        ]).notes,
        driving: clonedDrug.driving || "",
        drivingStatus: parseStatusAndNotes(clonedDrug.driving || "", [
          "Có thể dùng",
          "Cân nhắc lợi hại",
          "Không nên dùng",
          "Không có dữ liệu",
        ]).status,
        drivingNotes: parseStatusAndNotes(clonedDrug.driving || "", [
          "Có thể dùng",
          "Cân nhắc lợi hại",
          "Không nên dùng",
          "Không có dữ liệu",
        ]).notes,
        fertility: clonedDrug.fertility || "",
        fertilityStatus: parseStatusAndNotes(clonedDrug.fertility || "", [
          "Có thể dùng",
          "Cân nhắc lợi hại",
          "Không nên dùng",
          "Không có dữ liệu",
        ]).status,
        fertilityNotes: parseStatusAndNotes(clonedDrug.fertility || "", [
          "Có thể dùng",
          "Cân nhắc lợi hại",
          "Không nên dùng",
          "Không có dữ liệu",
        ]).notes,
        interactions: clonedDrug.interactions || "",
        incompatibilities: clonedDrug.incompatibilities || "",
        sideEffectsNote: clonedDrug.sideEffectsNote || "",
        pharmacodynamics: Array.isArray(clonedDrug.pharmacodynamics)
          ? clonedDrug.pharmacodynamics
          : clonedDrug.pharmacodynamics
            ? [{ category: "Chung", content: clonedDrug.pharmacodynamics }]
            : [],
        pharmacokinetics: Array.isArray(clonedDrug.pharmacokinetics)
          ? clonedDrug.pharmacokinetics
          : clonedDrug.pharmacokinetics
            ? [{ category: "Chung", content: clonedDrug.pharmacokinetics }]
            : [],
        specificInteractions: clonedDrug.specificInteractions || [],
        overdose: clonedDrug.overdose || "",
        overdoseManagement: clonedDrug.overdoseManagement || "",
        adrManagement: clonedDrug.adrManagement || "",
        lots:
          clonedDrug.lots ||
          (clonedDrug.lotNumber || clonedDrug.expiryDate
            ? [
                {
                  lotNumber: clonedDrug.lotNumber || "",
                  expiryDate: clonedDrug.expiryDate || "",
                },
              ]
            : []),
        expiryAlertMonths: clonedDrug.expiryAlertMonths ?? 3,
        isWHOGMP: !!clonedDrug.isWHOGMP,
        isEUGMP: !!clonedDrug.isEUGMP,
        isTCCS: !!clonedDrug.isTCCS,
        isCYP3A4: !!clonedDrug.isCYP3A4,
        storageCondition: clonedDrug.storageCondition || "",
        storageTemperature: clonedDrug.storageTemperature || "",
        shelfLife: clonedDrug.shelfLife || "",
        standardizationRationale: clonedDrug.standardizationRationale || "",
        standardizationBasis: clonedDrug.standardizationBasis || "",
        standardizationStatus: clonedDrug.standardizationStatus || "draft",
        standardizationNotes: clonedDrug.standardizationNotes || "",
      };
      const sideEffectsTxt = Array.isArray(initialData.sideEffects)
        ? initialData.sideEffects
            .map((se: any) => (typeof se === "string" ? se : se.content))
            .join(", ")
        : "";
      setFormData(initialData);
      setSideEffectsText(sideEffectsTxt);
      setContraindicationsText("");

      initialFormSnapshotRef.current = JSON.stringify({
        formData: initialData,
        sideEffectsText: sideEffectsTxt,
        contraindicationsText: "",
        selectedFileName: null,
      });
    } else {
      setEditingDrug(null);
      const newDrugData: Drug = {
        id: Math.random().toString(36).substr(2, 9),
        name: "",
        activeIngredients: [],
        atcCode: "",
        dosageForm: "",
        detailedDosageForm: "",
        excipients: "",
        excipientsList: [],
        tabletWeight: "",
        manufacturer: "",
        mechanismOfAction: "",
        mechanismOfActionLabel: "",
        pharmacologicalGroup: "",
        indications: [{ content: "", icd10s: [], defaultIcd10s: [], betterAlternativeIcd10s: [], notRecommendedIcd10s: [] }],
        contraindications: [{ content: "", type: "Other" }],
        sideEffects: [],
        sideEffectsType: "general",
        sideEffectsNote: "",
        groupId: "",
        groupIds: [],
        interactionGroupIds: [],
        avatarUrl: "",
        pdfUrl: "",
        registrationNumber: "",
        lotNumber: "",
        lots: [],
        unit: "",
        expiryDate: "",
        expiryAlertMonths: 3,
        expiryStatus: "valid",
        administrationRoute: "",
        isClosed: false,
        isRx: false,
        isNew: false,
        isUpdated: false,
        generalAdministration: "",
        generalAdministrationTime: "",
        dosageAndAdministration: [],
        precautions: "",
        pregnancy: "",
        lactation: "",
        driving: "",
        fertility: "",
        interactions: "",
        pharmacodynamics: [],
        pharmacokinetics: [],
        overdose: "",
        overdoseManagement: "",
        adrManagement: "",
        isWHOGMP: false,
        isEUGMP: false,
        isTCCS: false,
        isCYP3A4: false,
        storageCondition: "",
        storageTemperature: "",
        shelfLife: "",
        standardizationRationale: "",
        standardizationBasis: "",
        standardizationStatus: "draft",
        standardizationNotes: "",
      };
      setFormData(newDrugData);
      setContraindicationsText("");
      setSideEffectsText("");

      initialFormSnapshotRef.current = JSON.stringify({
        formData: newDrugData,
        sideEffectsText: "",
        contraindicationsText: "",
        selectedFileName: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleSelectExcipient = (name: string) => {
    const currentVal = formData.excipients || "";
    const segments = currentVal.split(",");
    // Replace the last segment with the chosen name
    segments[segments.length - 1] = name;
    const newVal =
      segments
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ") + ", ";
    setFormData({ ...formData, excipients: newVal });
    setExcipientSuggestions([]);
    setShowExcipientSuggestions(false);
    setFocusedExcipientIndex(-1);

    // Focus back to input
    if (excipientInputRef.current) {
      excipientInputRef.current.focus();
    }
  };

  const handleExcipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showExcipientSuggestions || excipientSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedExcipientIndex(
        (prev) => (prev + 1) % excipientSuggestions.length,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedExcipientIndex(
        (prev) =>
          (prev - 1 + excipientSuggestions.length) %
          excipientSuggestions.length,
      );
    } else if (e.key === "Enter") {
      if (
        focusedExcipientIndex >= 0 &&
        focusedExcipientIndex < excipientSuggestions.length
      ) {
        e.preventDefault();
        handleSelectExcipient(excipientSuggestions[focusedExcipientIndex].name);
      }
    } else if (e.key === "Escape") {
      setShowExcipientSuggestions(false);
    }
  };

  const handleSelectActiveIngredient = (index: number, name: string) => {
    const newList = [...(formData.activeIngredients || [])];
    newList[index] = { ...newList[index], name };
    setFormData({ ...formData, activeIngredients: newList });
    setIngredientSuggestions([]);
    setShowIngredientSuggestions(false);
    setFocusedIngredientIndex(-1);
    setActiveIngredientRowIndex(null);
  };

  const toggleGroupForIngredient = (ingIndex: number, targetGroupId: string) => {
    const newList = [...(formData.activeIngredients || [])];
    const currentItem = newList[ingIndex] || { name: "", amount: "", unit: "" };
    const currentIds = Array.isArray(currentItem.groupIds)
      ? currentItem.groupIds
      : currentItem.groupId
        ? [currentItem.groupId]
        : [];
    let nextIds = [...currentIds];
    if (nextIds.includes(targetGroupId)) {
      nextIds = nextIds.filter((id) => id !== targetGroupId);
    } else {
      nextIds.push(targetGroupId);
    }
    newList[ingIndex] = {
      ...currentItem,
      groupIds: nextIds,
      groupId: nextIds[0] || "",
    };
    const allGroupIds = Array.from(
      new Set(
        newList.flatMap((ai: any) =>
          Array.isArray(ai.groupIds) ? ai.groupIds : ai.groupId ? [ai.groupId] : [],
        ),
      ),
    );
    setFormData((prev) => ({
      ...prev,
      activeIngredients: newList,
      groupIds: allGroupIds,
      groupId: allGroupIds[0] || "",
    }));
  };

  const removeGroupFromIngredient = (ingIndex: number, targetGroupId: string) => {
    const newList = [...(formData.activeIngredients || [])];
    const currentItem = newList[ingIndex];
    if (!currentItem) return;
    const currentIds = Array.isArray(currentItem.groupIds)
      ? currentItem.groupIds
      : currentItem.groupId
        ? [currentItem.groupId]
        : [];
    const nextIds = currentIds.filter((id) => id !== targetGroupId);
    newList[ingIndex] = {
      ...currentItem,
      groupIds: nextIds,
      groupId: nextIds[0] || "",
    };
    const allGroupIds = Array.from(
      new Set(
        newList.flatMap((ai: any) =>
          Array.isArray(ai.groupIds) ? ai.groupIds : ai.groupId ? [ai.groupId] : [],
        ),
      ),
    );
    setFormData((prev) => ({
      ...prev,
      activeIngredients: newList,
      groupIds: allGroupIds,
      groupId: allGroupIds[0] || "",
    }));
  };

  const handleActiveIngredientKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
  ) => {
    if (!showIngredientSuggestions || ingredientSuggestions.length === 0)
      return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIngredientIndex(
        (prev) => (prev + 1) % ingredientSuggestions.length,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIngredientIndex(
        (prev) =>
          (prev - 1 + ingredientSuggestions.length) %
          ingredientSuggestions.length,
      );
    } else if (e.key === "Enter") {
      if (
        focusedIngredientIndex >= 0 &&
        focusedIngredientIndex < ingredientSuggestions.length
      ) {
        e.preventDefault();
        handleSelectActiveIngredient(
          rowIndex,
          ingredientSuggestions[focusedIngredientIndex].name,
        );
      }
    } else if (e.key === "Escape") {
      setShowIngredientSuggestions(false);
      setActiveIngredientRowIndex(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit for Storage
        alert("File PDF quá lớn (tối đa 10MB).");
        return;
      }
      setSelectedFile(file);
      // Use functional update to ensure we don't lose other form data changes
      const blobUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, pdfUrl: blobUrl }));

      // If we were waiting for a file to extract, trigger it
      if (autoExtractRef.current) {
        autoExtractRef.current = false;
        // Small delay to ensure state and file are ready
        setTimeout(() => {
          handleAIExtract(file);
        }, 100);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFormData((prev) => ({ ...prev, pdfUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    autoExtractRef.current = false;
  };

  const autoExtractRef = useRef(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Vui lòng nhập tên thuốc.");
      return;
    }
    if ((formData.activeIngredients || []).length === 0) {
      alert("Vui lòng thêm ít nhất một hoạt chất.");
      return;
    }

    // handleRemoveFile(); // Removed automatic cleanup to preserve existing PDFs

    setUploading(true);
    setUploadProgress(0);
    let pdfUploadFailed = false;
    try {
      let finalPdfUrl = formData.pdfUrl; // Preserve existing PDF URL

      // If a new file was selected, upload it to Firebase Storage
      if (selectedFile) {
        try {
          console.log("Starting upload to Storage...", selectedFile.name);
          const storageRef = ref(
            storage,
            `drug-pdfs/${formData.id}_${selectedFile.name}`,
          );

          // Use uploadBytesResumable with progress tracking and a reasonable 10s timeout to keep save fast
          const uploadTask = uploadBytesResumable(storageRef, selectedFile);
          
          const uploadPromise = new Promise<string>((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                setUploadProgress(progress);
                console.log(`Upload progress: ${progress}%`);
              },
              (error) => {
                reject(error);
              },
              async () => {
                try {
                  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(downloadUrl);
                } catch (urlErr) {
                  reject(urlErr);
                }
              }
            );
          });

          const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => {
              try {
                uploadTask.cancel();
              } catch (_) {}
              reject(new Error("Upload timeout (quá thời gian tải lên - 90 giây)"));
            }, 90000)
          );

          finalPdfUrl = await Promise.race([uploadPromise, timeoutPromise]);
          console.log("Upload complete. URL:", finalPdfUrl);
        } catch (uploadErr) {
          console.error("Error uploading file to Storage:", uploadErr);
          pdfUploadFailed = true;
          if (
            finalPdfUrl &&
            typeof finalPdfUrl === "string" &&
            finalPdfUrl.startsWith("blob:")
          ) {
            finalPdfUrl = "";
          }
        }
      }

      console.log("Preparing drug data for save...");
      // Parse comma-separated strings into arrays
      const parseList = (text: any) => {
        if (typeof text !== "string") return [];
        return text
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
      };

      const buildExcipientsString = (list: any[] = []) => {
        return list
          .filter((e) => e && e.name && e.name.trim() !== "")
          .map((e) => {
            const amountPart = (e.amount || "").trim();
            const unitPart = (e.unit || "").trim();
            if (amountPart || unitPart) {
              return `${e.name.trim()} ${amountPart}${unitPart}`;
            }
            return e.name.trim();
          })
          .join(", ");
      };

      const allPredefinedGroupNames = patientGroups.map((g) =>
        g.name.toLowerCase(),
      );

      const drugData: any = {
        ...formData,
        dosageAndAdministration: (formData.dosageAndAdministration || []).map(
          (item: any) => ({
            ...item,
            patientGroups: item.patientGroups || [],
          }),
        ),
        pdfUrl: finalPdfUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserName || "Hệ thống",
        createdAt: editingDrug
          ? formData.createdAt || new Date().toISOString()
          : new Date().toISOString(),
        excipientsList: (formData.excipients || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s !== "")
          .map((s: string) => ({
            name: s,
            amount: "",
            unit: "",
          })),
        excipients: (formData.excipients || "").trim(),
        tabletWeight: (formData.tabletWeight || "").trim(),
        pregnancy: (
          `3T đầu: ${formData.pregnancyStatus1 || "Cân nhắc lợi hại"} | 3T giữa: ${formData.pregnancyStatus2 || "Cân nhắc lợi hại"} | 3T cuối: ${formData.pregnancyStatus3 || "Cân nhắc lợi hại"}` +
          (formData.pregnancyNotes ? ` - ${formData.pregnancyNotes}` : "")
        ).trim(),
        lactation: (
          formData.lactationStatus +
          (formData.lactationNotes ? ` - ${formData.lactationNotes}` : "")
        ).trim(),
        driving: (
          formData.drivingStatus +
          (formData.drivingNotes ? ` - ${formData.drivingNotes}` : "")
        ).trim(),
        fertility: (
          (formData.fertilityStatus || "Cân nhắc lợi hại") +
          (formData.fertilityNotes ? ` - ${formData.fertilityNotes}` : "")
        ).trim(),
        incompatibilities: (formData.incompatibilities || "").trim(),
        sideEffectsNote: (formData.sideEffectsNote || "").trim(),
        indications: (formData.indications || []).filter(
          (i) => i && typeof i.content === "string" && i.content.trim() !== "",
        ),
        contraindications: (formData.contraindications || []).filter(
          (c) => c && typeof c.content === "string" && c.content.trim() !== "",
        ),
        precautions: Array.isArray(formData.precautions)
          ? formData.precautions.filter(
              (p) =>
                p && typeof p.content === "string" && p.content.trim() !== "",
            )
          : formData.precautions
            ? [{ content: String(formData.precautions) }]
            : [],
        warnings: Array.isArray(formData.warnings)
          ? formData.warnings.filter(
              (w: any) =>
                w && typeof w.content === "string" && w.content.trim() !== "",
            )
          : [],
        sideEffects: Array.isArray(formData.sideEffects)
          ? formData.sideEffects
              .filter((se: any) => {
                if (typeof se === "string") return se.trim() !== "";
                return se && se.content && se.content.trim() !== "";
              })
              .map((se: any) => {
                if (typeof se === "object" && se) {
                  const sideEffectsType = formData.sideEffectsType || "general";
                  const selfActiveIngs = (formData.activeIngredients || [])
                    .map((ai: any) => ai.name)
                    .filter(Boolean);
                  if (sideEffectsType === "by_ingredient" && selfActiveIngs.length > 0) {
                    if (!se.ingredient || !selfActiveIngs.includes(se.ingredient)) {
                      return {
                        ...se,
                        ingredient: selfActiveIngs[0],
                      };
                    }
                  }
                }
                return se;
              })
          : parseList(sideEffectsText),
      };

      // Ensure no top-level 'category' field is sent to Firestore
      if ("category" in drugData) {
        delete drugData.category;
      }

      const extractIcdCodes = (indications: any[] = []) => {
        return Array.from(
          new Set(
            indications
              .flatMap((ind) => ind?.icd10s || [])
              .map((code: string) => (code || "").trim())
              .filter((code: string) => !!code),
          ),
        );
      };

      try {
        console.log("Saving drug document to Firestore...");
        const drugRef = doc(db, "drugs", formData.id);
        // setDoc imported from ../firebase already calls sanitizeData
        await setDoc(drugRef, drugData);
        console.log("Drug document saved successfully.");

        // SYNC INTERACTIONS TO MANUAL_INTERACTIONS LIST
        try {
          console.log("Syncing interactions...");
          const batch = writeBatch(db);
          const syncItems: any[] = [];

          (drugData.specificInteractions || []).forEach((si: any) => {
            if (!si || !si.target || !si.content) return;
            const targetDrugName = (si.target || "").toLowerCase().trim();
            const targetDrug = drugs.find(
              (d) => (d.name || "").toLowerCase().trim() === targetDrugName,
            );
            if (targetDrug) {
              syncItems.push({
                type: "Thuốc - Thuốc",
                sourceIds: [formData.id, targetDrug.id].sort(),
                sourceNames: [formData.name, targetDrug.name].sort(),
                description: si.content,
                severity: "medium",
              });
            }
          });

          (drugData.contraindications || []).forEach((c: any) => {
            if (c.type === "Drug" && c.content) {
              const targetContent = (c.content || "").toLowerCase().trim();
              const targetDrug = drugs.find((d) => {
                const drugName = (d.name || "").toLowerCase().trim();
                return (
                  drugName === targetContent || targetContent.includes(drugName)
                );
              });
              if (targetDrug) {
                syncItems.push({
                  type: "Thuốc - Thuốc",
                  sourceIds: [formData.id, targetDrug.id].sort(),
                  sourceNames: [formData.name, targetDrug.name].sort(),
                  description: `Chống chỉ định: ${c.content}`,
                  severity: "high",
                });
              }
            } else if (c.type === "ICD-10" && c.content) {
              syncItems.push({
                type: "Thuốc - ICD-10",
                sourceIds: [formData.id],
                sourceNames: [formData.name],
                targetName: c.content,
                description: `Chống chỉ định cho bệnh lý: ${c.content}`,
                severity: "high",
              });
            }
          });

          const syncIdsToKeep = new Set<string>();
          syncItems.forEach((item) => {
            let syncId = "";
            if (item.type === "Thuốc - Thuốc") {
              syncId = `INT-AUTO-${item.sourceIds[0]}-${item.sourceIds[1]}`;
            } else {
              const safeContent = (item.targetName || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "-")
                .substring(0, 50);
              syncId = `INT-AUTO-${formData.id}-${safeContent}`;
            }
            syncIdsToKeep.add(syncId);

            const interactionData: ManualInteraction = {
              id: syncId,
              type: item.type,
              sourceIds: item.sourceIds,
              sourceNames: item.sourceNames,
              targetName: item.targetName || "",
              severity: item.severity,
              description: item.description,
              recommendation:
                "Tham khảo hướng dẫn chuyên môn và theo dõi sát bệnh nhân.",
              updatedAt: new Date().toISOString(),
              updatedBy: currentUserName || "",
            };
            batch.set(doc(db, "manual_interactions", syncId), interactionData);
          });

          // Cleanup stale interactions involve this drug but aren't in current list
          try {
            console.log("Cleaning up stale interactions...");
            const q = query(
              collection(db, "manual_interactions"),
              where("sourceIds", "array-contains", formData.id),
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach((docSnap) => {
              if (
                docSnap.id.startsWith("INT-AUTO-") &&
                !syncIdsToKeep.has(docSnap.id)
              ) {
                batch.delete(docSnap.ref);
              }
            });
          } catch (cleanupError) {
            console.warn("Error during interaction cleanup:", cleanupError);
          }

          console.log("Committing batch updates...");
          await batch.commit();
          console.log("Batch commit complete.");
        } catch (syncError) {
          console.error("Error syncing interactions:", syncError);
        }

        setIsModalOpen(false);
        setSelectedFile(null); // Clear selected file after successful save
        if (pdfUploadFailed) {
          alert("Lưu thông tin thuốc thành công! Lưu ý: File PDF đính kèm không thể tải lên do kết nối chậm hoặc tệp quá lớn, nhưng toàn bộ thông tin chi tiết của thuốc đã được lưu thành công.");
        }
      } catch (firestoreError) {
        console.error("Firestore save error:", firestoreError);
        handleFirestoreError(
          firestoreError,
          OperationType.WRITE,
          `drugs/${formData.id}`,
        );
      }
    } catch (error: any) {
      console.error("Error saving drug detail:", error);
      let errorMessage = "Lỗi khi lưu thông tin hoặc tải file.";

      if (error.code === "storage/unauthorized") {
        errorMessage =
          "Lỗi: Không có quyền truy cập Storage. Vui lòng kiểm tra lại cấu hình Firebase Storage Rules.";
      } else if (error.code === "storage/canceled") {
        errorMessage = "Tải lên đã bị hủy.";
      } else if (error.message) {
        // Check if it's a JSON string from handleFirestoreError
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) {
            errorMessage += " Chi tiết: " + parsed.error;
          } else {
            errorMessage += " Chi tiết: " + error.message;
          }
        } catch {
          errorMessage += " Chi tiết: " + error.message;
        }
      }

      alert(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const moveArrayItem = (
    fieldName: keyof Drug,
    index: number,
    direction: "up" | "down",
  ) => {
    const list = formData[fieldName];
    if (!Array.isArray(list)) return;

    const newList = [...list];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;

    [newList[index], newList[targetIdx]] = [newList[targetIdx], newList[index]];
    setFormData((prev) => ({ ...prev, [fieldName]: newList }));
  };

  const handleAIExtract = async (fileToUse?: File) => {
    const targetFile = fileToUse || selectedFile;

    if (!targetFile) {
      autoExtractRef.current = true;
      fileInputRef.current?.click();
      return;
    }

    setExtracting(true);
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(targetFile);
      });

      const { generateGeminiContent } = await import("../lib/gemini");
      const text = await generateGeminiContent(
        "gemini-3.5-flash",
        [
          {
            parts: [
              {
                text: "Bạn là một chuyên gia trích xuất dữ liệu y tế chuyên sâu. Trình bày thông tin thuốc từ tệp PDF đính kèm. QUY TẮC BẮT BUỘC:\n1. CHỉ trả về JSON thô.\n2. PHÂN LOẠI CHI TIẾT: Tách biệt rõ ràng Chỉ định, Chống chỉ định (thuốc/bệnh lý/khác), Tác dụng phụ, Dược lực học, Dược động học.\n3. TRÍCH XUẤT ICD-10: Cố gắng suy luận mã ICD-10 cho các chỉ định (ví dụ: 'Tăng huyết áp' -> 'I10').\n4. Tóm tắt súc tích nhưng không mất ý y khoa. Đảm bảo các đơn vị đo lường (mg, ml, %) chính xác.\n\nCấu trúc:\n- name, atcCode, manufacturers, dosageForm, administrationRoute, drugGroup, isRx (boolean), mechanismOfAction\n- activeIngredients: [{name, amount, unit}]\n- indications: [{content, icd10s: string[]}]\n- contraindications: [{content, type: 'Drug'|'ICD-10'|'Age'|'Weight'|'Other'}]\n- sideEffects: string[]\n- pharmacodynamics/pharmacokinetics: [{category, content}]\n- specificInteractions: [{target, content}]\n- pregnancy/lactation/driving: string\n- overdose: string",
              },
              { inlineData: { data: base64Data, mimeType: "application/pdf" } },
            ],
          },
        ],
        {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      );

      // Basic JSON cleanup if needed
      const cleanJson = (str: string) => {
        let cleaned = str.trim();
        if (cleaned.startsWith("```json"))
          cleaned = cleaned.replace(/^```json/, "");
        else if (cleaned.startsWith("```"))
          cleaned = cleaned.replace(/^```/, "");
        if (cleaned.endsWith("```")) cleaned = cleaned.replace(/```$/, "");
        cleaned = cleaned.trim();

        try {
          return JSON.parse(cleaned);
        } catch (e) {
          console.warn(
            "Initial JSON parse failed, attempting stack-based repair...",
            e,
          );

          let fixed = cleaned;
          const stack: string[] = [];
          let inString = false;
          let escaped = false;

          for (let i = 0; i < fixed.length; i++) {
            const char = fixed[i];
            if (escaped) {
              escaped = false;
              continue;
            }
            if (char === "\\") {
              escaped = true;
              continue;
            }
            if (char === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (char === "{") stack.push("}");
              else if (char === "[") stack.push("]");
              else if (char === "}" || char === "]") {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                  stack.pop();
                }
              }
            }
          }

          if (inString) fixed += '"';
          while (stack.length > 0) {
            fixed += stack.pop();
          }

          try {
            return JSON.parse(fixed);
          } catch (inner) {
            console.warn(
              "Stack-based repair failed, attempting last-resort cutoff repair...",
            );
            const lastBrace = cleaned.lastIndexOf("}");
            const lastBracket = cleaned.lastIndexOf("]");
            const cutoff = Math.max(lastBrace, lastBracket);
            if (cutoff > 0) {
              try {
                return JSON.parse(cleaned.substring(0, cutoff + 1));
              } catch (final) {
                throw e;
              }
            }
            throw e;
          }
        }
      };

      try {
        const result = cleanJson(text);
        setExtractedData(result);
        setIsReviewModalOpen(true);
      } catch (parseError) {
        console.error(
          "JSON Parse failed after all attempts:",
          parseError,
          "Text preview:",
          text.substring(0, 1000) + "...",
        );
        alert(
          "Dữ liệu từ AI bị lỗi định dạng. Vui lòng thử lại với file PDF khác hoặc tóm tắt hơn.",
        );
      }
    } catch (error) {
      console.error("AI Extraction failed:", error);
      alert(
        "Không thể trích xuất thông tin. Vui lòng kiểm tra file PDF hoặc thử lại.",
      );
    } finally {
      setExtracting(false);
    }
  };

  const applyExtractedData = () => {
    if (extractedData) {
      // Find matching drug groups if drugGroup name was extracted
      let matchedGroupIds: string[] = Array.isArray(formData.groupIds)
        ? [...formData.groupIds]
        : [];

      const extractedGroupNameRaw =
        extractedData.drugGroup || extractedData.group;
      if (extractedGroupNameRaw && drugGroups.length > 0) {
        const extractedGroupNames = Array.isArray(extractedGroupNameRaw)
          ? extractedGroupNameRaw.map((name) => String(name).toLowerCase())
          : [String(extractedGroupNameRaw).toLowerCase()];

        extractedGroupNames.forEach((nameToMatch) => {
          const matched = drugGroups.find(
            (g) =>
              g.name.toLowerCase().includes(nameToMatch) ||
              nameToMatch.includes(g.name.toLowerCase()),
          );
          if (matched && !matchedGroupIds.includes(matched.id)) {
            matchedGroupIds.push(matched.id);
          }
        });
      }

      const { id, drugGroup, group, manufacturers, ...restExtracted } =
        extractedData;

      // Clinical list parsers
      const ensureStringArray = (val: any): string[] => {
        if (Array.isArray(val)) return val.map((v) => String(v));
        if (typeof val === "string")
          return val
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean);
        return [];
      };

      const ensureFormattedList = (
        val: any,
      ): { category: string; content: string }[] => {
        if (Array.isArray(val)) {
          return val.map((item) => {
            if (typeof item === "string")
              return { category: "Chung", content: item };
            return {
              category: item.category || "Chung",
              content: item.content || String(item) || "",
            };
          });
        }
        if (typeof val === "string" && val.trim())
          return [{ category: "Chung", content: val }];
        return [];
      };

      // Helper to handle complex objects from AI for simple string fields
      const ensureString = (val: any, fallback: string = ""): string => {
        if (typeof val === "string") return val;
        if (Array.isArray(val)) return val.join(", ");
        if (val && typeof val === "object") return JSON.stringify(val);
        return fallback;
      };

      const updatedData = {
        ...formData,
        ...restExtracted,
        groupIds: matchedGroupIds,
        administrationRoute: ensureString(
          restExtracted.administrationRoute,
          formData.administrationRoute,
        ),
        activeIngredients: Array.isArray(restExtracted.activeIngredients)
          ? restExtracted.activeIngredients
          : formData.activeIngredients,
        atcCode: ensureString(restExtracted.atcCode, formData.atcCode),
        excipients: ensureString(restExtracted.excipients, formData.excipients),
        indications: (Array.isArray(restExtracted.indications)
          ? restExtracted.indications
          : formData.indications || []
        ).map((ind: any) =>
          typeof ind === "string"
            ? { content: ind, icd10s: [] }
            : { ...ind, icd10s: ind.icd10s || (ind.icd10 ? [ind.icd10] : []) },
        ),
        contraindications: (Array.isArray(restExtracted.contraindications)
          ? restExtracted.contraindications
          : formData.contraindications || []
        ).map((c: any) =>
          typeof c === "string"
            ? { content: c, type: "Other" }
            : { ...c, type: c.type || "Other" },
        ),
        sideEffects:
          ensureStringArray(restExtracted.sideEffects).length > 0
            ? ensureStringArray(restExtracted.sideEffects)
            : formData.sideEffects,
        generalAdministration: ensureString(
          restExtracted.generalAdministration,
          formData.generalAdministration,
        ),
        generalAdministrationTime: ensureString(
          restExtracted.generalAdministrationTime,
          formData.generalAdministrationTime,
        ),
        dosageAndAdministration: Array.isArray(
          restExtracted.dosageAndAdministration,
        )
          ? restExtracted.dosageAndAdministration.map((item: any) =>
              typeof item === "string"
                ? { title: "Liều dùng", content: item }
                : {
                    title: item.title || "Liều dùng",
                    content: item.content || "",
                  },
            )
          : typeof restExtracted.dosageAndAdministration === "string"
            ? [
                {
                  title: "Liều dùng",
                  content: restExtracted.dosageAndAdministration,
                },
              ]
            : formData.dosageAndAdministration,
        precautions: Array.isArray(restExtracted.precautions)
          ? restExtracted.precautions.map((p: any) =>
              typeof p === "string" ? { content: p } : p,
            )
          : typeof restExtracted.precautions === "string"
            ? [{ content: restExtracted.precautions }]
            : formData.precautions,
        driving: ensureString(restExtracted.driving, formData.driving),
        fertility: ensureString(restExtracted.fertility, formData.fertility),
        pregnancy: ensureString(restExtracted.pregnancy, formData.pregnancy),
        lactation: ensureString(restExtracted.lactation, formData.lactation),
        pharmacodynamics: ensureFormattedList(
          restExtracted.pharmacodynamics || formData.pharmacodynamics,
        ),
        pharmacokinetics: ensureFormattedList(
          restExtracted.pharmacokinetics || formData.pharmacokinetics,
        ),
        interactions: ensureString(
          restExtracted.interactions,
          formData.interactions,
        ),
        specificInteractions: Array.isArray(restExtracted.specificInteractions)
          ? restExtracted.specificInteractions
          : formData.specificInteractions,
        overdose: ensureString(restExtracted.overdose, formData.overdose),
        manufacturer: ensureString(
          restExtracted.manufacturer || manufacturers,
          formData.manufacturer,
        ),
        dosageForm: ensureString(restExtracted.dosageForm, formData.dosageForm),
        isRx:
          typeof restExtracted.isRx === "boolean"
            ? restExtracted.isRx
            : formData.isRx,
        mechanismOfAction: ensureString(
          restExtracted.mechanismOfAction,
          formData.mechanismOfAction,
        ),
      };
      setFormData(updatedData);

      // Update helper text states if they exist
      if (typeof setContraindicationsText === "function") {
        const cText = (updatedData.contraindications || [])
          .map((c: any) => (typeof c === "string" ? c : c.content))
          .join(", ");
        setContraindicationsText(cText);
      }

      if (typeof setSideEffectsText === "function") {
        const seText = (updatedData.sideEffects || [])
          .map((se: any) => (typeof se === "string" ? se : se.content))
          .join(", ");
        setSideEffectsText(seText);
      }

      setIsReviewModalOpen(false);
      setExtractedData(null);
    }
  };

  const handleToggleClosed = async (drug: any) => {
    try {
      const drugRef = doc(db, "drugs", drug.id);
      const updateData = { ...drug, isClosed: !drug.isClosed };
      if ("category" in updateData) delete updateData.category;
      await setDoc(drugRef, updateData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drugs/${drug.id}`);
    }
  };

  const handleToggleSuspended = async (drug: any) => {
    try {
      const drugRef = doc(db, "drugs", drug.id);
      const newStatus = drug.status === "suspended" ? "active" : "suspended";
      const updateData = { ...drug, status: newStatus };
      if ("category" in updateData) delete updateData.category;
      await setDoc(drugRef, updateData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drugs/${drug.id}`);
    }
  };

  const handleDelete = (id: string, name: string, pdfUrl?: string) => {
    setConfirmData({ id, name, pdfUrl });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmData) return;
    const { id, name, pdfUrl } = confirmData;
    try {
      // Delete PDF from storage if it exists and is a Firebase Storage URL
      if (pdfUrl && pdfUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const storageRef = ref(storage, pdfUrl);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn("Could not delete file from storage:", storageError);
        }
      }

      try {
        await deleteDoc(doc(db, "drugs", id));

        // SYNC DELETE: Remove all manual interactions linked to this drug
        try {
          const batch = writeBatch(db);
          const q = query(collection(db, "manual_interactions"));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as ManualInteraction;
            if (
              docSnap.id.startsWith("INT-AUTO-") &&
              (data.sourceIds || []).includes(id)
            ) {
              batch.delete(docSnap.ref);
            }
          });
          await batch.commit();
        } catch (syncError) {
          console.warn(
            "Could not cleanup interactions after drug deletion:",
            syncError,
          );
        }

        if (selectedDrug?.id === id) setSelectedDrug(null);
      } catch (firestoreError) {
        handleFirestoreError(
          firestoreError,
          OperationType.DELETE,
          `drugs/${id}`,
        );
      }
    } catch (error: any) {
      console.error("Error deleting drug:", error);
      let msg = "Lỗi khi xóa thuốc.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) msg += " Chi tiết: " + parsed.error;
      } catch {
        if (error.message) msg += " Chi tiết: " + error.message;
      }
      setErrorMessage(msg);
      // Re-throw to prevent ConfirmModal from closing if we want it to stay open on error
      // Actually, ConfirmModal now catches it and console.errors it.
      throw error;
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((id) => {
          batch.delete(doc(db, "drugs", id));
        });
        await batch.commit();
      }
      if (selectedDrug && ids.includes(selectedDrug.id)) {
        setSelectedDrug(null);
      }
    } catch (error) {
      console.error("Batch delete error:", error);
      throw error;
    }
  };

  const handleBatchToggleClosed = async (targetDrugs: Drug[], targetClosed: boolean) => {
    try {
      const chunkSize = 400;
      for (let i = 0; i < targetDrugs.length; i += chunkSize) {
        const chunk = targetDrugs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((drug) => {
          const drugRef = doc(db, "drugs", drug.id);
          batch.set(drugRef, { isClosed: targetClosed }, { merge: true });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Batch toggle closed error:", error);
      throw error;
    }
  };

  const handleBatchImport = async (importedDrugs: Partial<Drug>[]) => {
    try {
      const chunkSize = 400;
      for (let i = 0; i < importedDrugs.length; i += chunkSize) {
        const chunk = importedDrugs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((d) => {
          const id = d.id || Math.random().toString(36).substring(2, 11);
          const drugRef = doc(db, "drugs", id);
          const sanitized = sanitizeFirestoreData({ ...d, id });
          batch.set(drugRef, sanitized, { merge: true });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Batch import error:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const modes = [
    {
      id: "drugs",
      label: featureSettings?.customTitle || "Biệt dược",
      icon: <Pill size={16} />,
    },
    { id: "groups", label: "Nhóm thuốc", icon: <FolderTree size={16} /> },
    {
      id: "ingredients",
      label: "Hoạt chất",
      icon: <Activity size={16} />,
    },
    ...(isManageDirectory && canManage
      ? [
          { id: "ingredient_categories", label: "Phân loại Hoạt chất", icon: <FolderTree size={16} /> },
          { id: "excipients", label: "Tá dược", icon: <Database size={16} /> },
          { id: "companies", label: "Công ty", icon: <Briefcase size={16} /> },
        ]
      : []),
  ];

  const viewModeToggle = (
    <div
      className={cn(
        "flex p-1 rounded-2xl gap-1 border w-full lg:w-auto",
        isDarkMode
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-slate-100 shadow-sm",
      )}
    >
      {modes.map((mode) => {
        const isActive = viewMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => setViewMode(mode.id as any)}
            className={cn(
              "relative flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all transition-colors active:scale-95 whitespace-nowrap overflow-hidden",
              isActive
                ? isDarkMode
                  ? "text-blue-400"
                  : "text-blue-600"
                : isDarkMode
                  ? "text-slate-500 hover:text-slate-400"
                  : "text-slate-400 hover:text-slate-600",
            )}
          >
            {isActive && (
              <div
                className={cn(
                  "absolute inset-0 z-0 rounded-xl",
                  isDarkMode
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "bg-blue-50 border border-blue-100",
                )}
              />
            )}
            <span className="relative z-10 shrink-0">
              {isMobile &&
              isActive &&
              ["drugs", "groups", "ingredients"].includes(mode.id) ? (
                <span className="text-[11px] font-black tracking-tighter">
                  {mode.id === "drugs"
                    ? "Biệt dược"
                    : mode.id === "groups"
                      ? "Nhóm thuốc"
                      : "Hoạt chất"}
                </span>
              ) : (
                mode.icon
              )}
            </span>
            <span className="relative z-10 hidden sm:inline-block">
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={cn(
        "w-full max-w-full mx-auto min-h-screen transition-colors flex flex-col lg:flex-row",
        isDarkMode
          ? "text-slate-200 lg:bg-slate-950/30"
          : "text-slate-900 lg:bg-slate-50/50",
      )}
    >
      {/* Desktop Header Tabs Portal (Danh mục & Tên thuốc tabs) */}
      {(() => {
        if (isActive === false) return null;
        const desktopPortalNode = getDesktopTabsPortalNode();
        if (!desktopPortalNode) return null;

        return createPortal(
          <div
            ref={desktopTabsContainerRef}
            className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar scrollbar-hide w-full h-full flex-1 min-w-0 relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* Tab Quản lý danh mục (cố định ở đầu danh sách, chỉ hiển thị ở Quản lý thuốc) */}
            {isManageDirectory && (
              <button
                type="button"
                onClick={handleSelectDirectoryTab}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all whitespace-nowrap border shrink-0 cursor-pointer select-none",
                  activeDrugTabId === null
                    ? isDarkMode
                      ? "bg-blue-600/30 border-blue-500/60 text-blue-300 shadow-xs"
                      : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                    : isDarkMode
                      ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
                title="Quản lý danh mục"
              >
                <Search size={13} className={activeDrugTabId === null ? (isDarkMode ? "text-blue-400" : "text-white") : "text-slate-400"} />
                <span>{featureSettings?.customTitle || "Quản lý danh mục"}</span>
              </button>
            )}

            {/* Các Tab Chi tiết thuốc đã mở - tự động co dãn vừa vặn thanh chứa và kéo thả sắp xếp */}
            <Reorder.Group
              as="div"
              axis="x"
              key={`desktop-drug-tabs-${tabsLayoutKey}`}
              values={openedDrugTabs}
              onReorder={setOpenedDrugTabs}
              className="flex items-center gap-1.5 flex-1 min-w-0 h-full"
            >
              {openedDrugTabs.map((tab) => {
                const isActiveTab = activeDrugTabId === tab.id;
                const drugItem = tab.drug || drugs.find((d) => d.id === tab.id || d.name.toLowerCase() === tab.name.toLowerCase());
                const drugAvatar = drugItem?.avatarUrl;

                return (
                  <Reorder.Item
                    as="div"
                    key={tab.id}
                    value={tab}
                    id={`desktop-header-tab-${tab.id}`}
                    onClick={() => handleSelectDrugTab(tab)}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.08}
                    layout="position"
                    whileDrag={{
                      scale: 1.04,
                      zIndex: 100,
                      cursor: "grabbing",
                      boxShadow: isDarkMode
                        ? "0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)"
                        : "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
                    }}
                    transition={
                      isTabsResizing
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 450, damping: 35, mass: 0.6 }
                    }
                    style={isTabsResizing ? { transform: "none" } : undefined}
                    className={cn(
                      "group relative flex items-center font-bold text-xs whitespace-nowrap select-none shrink-0 cursor-grab active:cursor-grabbing touch-none",
                      "transition-colors duration-150",
                      "border pl-1.5 pr-1 py-1 gap-1.5 rounded-md max-w-[200px]",
                      isActiveTab
                        ? isDarkMode
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                          : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                        : isDarkMode
                          ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                          : "bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                    title={tab.name}
                  >
                    {/* Avatar thuốc */}
                    <div className="relative shrink-0 rounded-full select-none pointer-events-none">
                      {drugAvatar ? (
                        <img
                          src={drugAvatar}
                          alt={tab.name}
                          className="w-5 h-5 rounded-full object-cover shrink-0 shadow-xs border border-white/20"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                            isActiveTab
                              ? "bg-white/20 text-white"
                              : isDarkMode
                                ? "bg-slate-800 text-blue-400 border border-slate-700"
                                : "bg-blue-50 text-blue-600 border border-blue-200/60"
                          )}
                        >
                          <Pill size={11} className={isActiveTab ? "text-white" : "text-blue-500"} />
                        </div>
                      )}
                    </div>

                    {/* Tên thuốc */}
                    <span className="truncate min-w-0 flex-1 ml-0">
                      {tab.name}
                    </span>

                    {/* Nút đóng tab X - ẩn khi không rê chuột, hiện ra khi hover */}
                    <div className="flex items-center shrink-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto ml-1 transition-opacity duration-150">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseDrugTab(tab.id, e);
                        }}
                        className={cn(
                          "p-0.5 rounded transition-colors cursor-pointer shrink-0",
                          isActiveTab
                            ? "text-blue-200 hover:text-white hover:bg-blue-700/80"
                            : "text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        )}
                        title={`Đóng tab ${tab.name}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>,
          desktopPortalNode
        );
      })()}

      {(() => {
        if (isActive === false) return null;
        const portalNode = getPortalNode();
        if (!portalNode) return null;

        if (isMobile) {
          if (viewMode === "groups") {
            return createPortal(
              <div className="flex items-center justify-between w-full gap-2">
                <div className={cn(
                  "flex items-center gap-0.5 p-0.5 rounded-lg border",
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-slate-200 shadow-xs"
                )}>
                  <button
                    type="button"
                    onClick={() => setGroupTypeTab("treatment")}
                    className={cn(
                      "px-2.5 h-[28px] rounded-md text-[10px] font-black transition-all uppercase tracking-wider",
                      groupTypeTab === "treatment"
                        ? "bg-blue-600 text-white shadow"
                        : isDarkMode
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Điều trị
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupTypeTab("interaction")}
                    className={cn(
                      "px-2.5 h-[28px] rounded-md text-[10px] font-black transition-all uppercase tracking-wider",
                      groupTypeTab === "interaction"
                        ? "bg-blue-600 text-white shadow"
                        : isDarkMode
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Tương tác
                  </button>
                </div>

                {!canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("drugs");
                      setFavoriteOnlyFilter((prev) => !prev);
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-all flex items-center justify-center relative cursor-pointer active:scale-95",
                      favoriteOnlyFilter
                        ? "text-amber-500 bg-amber-500/20 ring-1 ring-amber-400/50"
                        : favoriteCount > 0
                          ? isDarkMode
                            ? "text-amber-400 hover:bg-amber-500/15"
                            : "text-amber-600 hover:bg-amber-50"
                          : isDarkMode
                            ? "text-slate-400 hover:text-amber-400 hover:bg-slate-800/60"
                            : "text-slate-500 hover:text-amber-600 hover:bg-slate-100",
                    )}
                    title={favoriteOnlyFilter ? "Đang lọc thuốc yêu thích (nhấn để xem tất cả)" : "Thuốc yêu thích"}
                  >
                    <Star
                      size={16}
                      className={cn(
                        favoriteOnlyFilter
                          ? "fill-amber-400 text-amber-500"
                          : favoriteCount > 0
                            ? "fill-amber-400 text-amber-500"
                            : "text-current",
                      )}
                    />
                    {favoriteCount > 0 && (
                      <span
                        className={cn(
                          "absolute top-0 right-0 flex items-center justify-center text-[8.5px] min-w-4 h-4 px-1 rounded-full font-black leading-none shadow-2xs pointer-events-none z-10 border",
                          favoriteOnlyFilter
                            ? "bg-amber-500 text-white border-white dark:border-slate-900 ring-1 ring-amber-400"
                            : "bg-amber-500 text-white border-white dark:border-slate-900",
                        )}
                      >
                        {favoriteCount > 99 ? "99+" : favoriteCount}
                      </span>
                    )}
                  </button>
                )}
              </div>,
              portalNode,
            );
          }

          if (viewMode !== "excipients" && viewMode !== "companies" && (viewMode !== "ingredients" || ingredientView === "search")) {
            return createPortal(
              <div className="flex items-center justify-between w-full gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className={cn(
                      "absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
                      searchTerm ? "text-blue-500" : "text-slate-400",
                    )}
                    size={14}
                  />
                  <input
                    type="text"
                    placeholder={
                      viewMode === "drugs"
                        ? searchMode === "all"
                          ? "Tìm tên, hoạt chất..."
                          : searchMode === "name"
                            ? "Tìm theo tên..."
                            : "Tìm theo hoạt chất..."
                        : "Tìm kiếm..."
                    }
                    className={cn(
                      "w-full pl-6 pr-6 py-1 text-xs bg-transparent border-0 outline-none focus:outline-none focus:ring-0 transition-all font-bold",
                      isDarkMode
                        ? "text-white placeholder:text-slate-500"
                        : "text-slate-900 placeholder:text-slate-400",
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Xóa từ khóa"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {isManageDirectory && (canManage || userRole === "admin") && viewMode === "drugs" && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal()}
                      className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs shrink-0"
                      title="Thêm thuốc mới"
                    >
                      <Plus size={15} />
                    </button>
                  )}
                  {viewMode === "drugs" && (
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center justify-center relative cursor-pointer",
                        showFilters
                          ? isDarkMode
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-blue-50 text-blue-600"
                          : isDarkMode
                            ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                      )}
                      title="Cấu hình bộ lọc"
                    >
                      <Filter size={15} />
                      {activeFiltersCount > 0 && (
                        <span className="absolute top-0 right-0 flex items-center justify-center bg-blue-600 text-white text-[8.5px] min-w-4 h-4 px-1 rounded-full font-black border border-white dark:border-slate-900 shadow-2xs pointer-events-none z-10">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Nút Thuốc Yêu Thích ở góc phải Header di động (chỉ hiển thị khi tra cứu) */}
                  {!canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        if (viewMode !== "drugs") {
                          setViewMode("drugs");
                        }
                        setFavoriteOnlyFilter((prev) => !prev);
                      }}
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center justify-center relative cursor-pointer active:scale-95",
                        favoriteOnlyFilter
                          ? "text-amber-500 bg-amber-500/20 ring-1 ring-amber-400/50"
                          : favoriteCount > 0
                            ? isDarkMode
                              ? "text-amber-400 hover:bg-amber-500/15"
                              : "text-amber-600 hover:bg-amber-50"
                            : isDarkMode
                              ? "text-slate-400 hover:text-amber-400 hover:bg-slate-800/60"
                              : "text-slate-500 hover:text-amber-600 hover:bg-slate-100",
                      )}
                      title={favoriteOnlyFilter ? "Đang lọc thuốc yêu thích (nhấn để xem tất cả)" : "Thuốc yêu thích"}
                    >
                      <Star
                        size={16}
                        className={cn(
                          favoriteOnlyFilter
                            ? "fill-amber-400 text-amber-500"
                            : favoriteCount > 0
                              ? "fill-amber-400 text-amber-500"
                              : "text-current",
                        )}
                      />
                      {favoriteCount > 0 && (
                        <span
                          className={cn(
                            "absolute top-0 right-0 flex items-center justify-center text-[8.5px] min-w-4 h-4 px-1 rounded-full font-black leading-none shadow-2xs pointer-events-none z-10 border",
                            favoriteOnlyFilter
                              ? "bg-amber-500 text-white border-white dark:border-slate-900 ring-1 ring-amber-400"
                              : "bg-amber-500 text-white border-white dark:border-slate-900",
                          )}
                        >
                          {favoriteCount > 99 ? "99+" : favoriteCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>,
              portalNode,
            );
          }
          return null;
        }

        if (!onExternalViewModeChange) {
          return createPortal(
            <div className="flex items-center justify-end w-full">
              {viewModeToggle}
            </div>,
            portalNode,
          );
        }

        return null;
      })()}

      {/* New Left Sidebar for Tra cứu thuốc on PC */}
      {!isMobile && (
        <DrugDirectorySidebar
          viewMode={viewMode}
          setViewMode={(mode) => {
            if (activeDrugTabId !== null) {
              handleSelectDirectoryTab();
            }
            setViewMode(mode);
          }}
          canManage={canManage || userRole === "admin"}
          isDarkMode={isDarkMode}
          isManageDirectory={isManageDirectory}
          totalDrugs={drugs.length}
          totalGroups={drugGroups.length}
          totalIngredients={availableIngredients.length}
          favoriteOnlyFilter={favoriteOnlyFilter}
          setFavoriteOnlyFilter={(val) => {
            if (activeDrugTabId !== null) {
              handleSelectDirectoryTab();
            }
            if (viewMode !== "drugs") {
              setViewMode("drugs");
            }
            setFavoriteOnlyFilter(val);
          }}
          favoriteCount={favoriteCount}
          stockFilter={stockFilter}
          setStockFilter={(status) => {
            if (activeDrugTabId !== null) {
              handleSelectDirectoryTab();
            }
            if (viewMode !== "drugs") {
              setViewMode("drugs");
            }
            setStockFilter(status);
          }}
          stockStats={stockStats}
          groupTypeTab={groupTypeTab}
          setGroupTypeTab={setGroupTypeTab}
          ingredientView={ingredientView}
          setIngredientView={setIngredientView}
          excipientView={excipientView}
          setExcipientView={setExcipientView}
          drugGroups={sortedDrugGroups}
          groupFilter={groupFilter}
          setGroupFilter={(group) => {
            if (activeDrugTabId !== null) {
              handleSelectDirectoryTab();
            }
            if (viewMode !== "drugs") {
              setViewMode("drugs");
            }
            setGroupFilter(group);
          }}
          onOpenAddDrug={isManageDirectory && (canManage || userRole === "admin") ? () => handleOpenModal() : undefined}
          featureSettings={featureSettings}
          isDetailOpen={!isMobile && activeDrugTabId !== null && detailDrug !== null}
          activeDrugName={detailDrug?.name}
          onBackToDirectory={handleSelectDirectoryTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          dosageFormFilter={dosageFormFilter}
          setDosageFormFilter={(form) => {
            if (activeDrugTabId !== null) {
              handleSelectDirectoryTab();
            }
            if (viewMode !== "drugs") {
              setViewMode("drugs");
            }
            setDosageFormFilter(form);
          }}
          uniqueDosageForms={uniqueDosageForms}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statusFilters={statusFilters}
          setStatusFilters={setStatusFilters}
          patientAgeMin={patientAgeMin}
          setPatientAgeMin={setPatientAgeMin}
          patientAgeMax={patientAgeMax}
          setPatientAgeMax={setPatientAgeMax}
          patientAge={patientAge}
          setPatientAge={setPatientAge}
          patientAgeUnit={patientAgeUnit}
          setPatientAgeUnit={setPatientAgeUnit}
          agePreset={agePreset}
          setAgePreset={setAgePreset}
          patientWeightMin={patientWeightMin}
          setPatientWeightMin={setPatientWeightMin}
          patientWeightMax={patientWeightMax}
          setPatientWeightMax={setPatientWeightMax}
          patientWeight={patientWeight}
          setPatientWeight={setPatientWeight}
          weightPreset={weightPreset}
          setWeightPreset={setWeightPreset}
          patientEgfr={patientEgfr}
          setPatientEgfr={setPatientEgfr}
          patientCrclMin={patientCrclMin}
          setPatientCrclMin={setPatientCrclMin}
          patientCrclMax={patientCrclMax}
          setPatientCrclMax={setPatientCrclMax}
          egfrPreset={egfrPreset}
          setEgfrPreset={setEgfrPreset}
        />
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 min-w-0 transition-colors",
          (!isMobile && activeDrugTabId !== null && detailDrug)
            ? "p-0"
            : "p-0 sm:p-1.5 lg:p-6"
        )}
      >
      {/* Giao diện Chi tiết thuốc hiển thị trực tiếp (embedded) trên PC */}
      {!isMobile && activeDrugTabId !== null && detailDrug && (
        <div className="w-full flex-1 pb-0">
          <DrugDetailModal
            embedded={true}
            drug={detailDrug}
            isOpen={true}
            onClose={() => {
              if (activeDrugTabId) {
                handleCloseDrugTab(activeDrugTabId);
              } else {
                setActiveDrugTabId(null);
                setDetailDrug(null);
                setIsDetailModalOpen(false);
              }
            }}
            isDarkMode={isDarkMode}
            userPowerPoints={userPowerPoints}
            canSeeIcdSuggestions={canSeeIcdSuggestions}
            canSeeCommonIndications={canSeeCommonIndications}
            canSeeDosageSuggestions={canSeeDosageSuggestions}
            canSeePrecautionType={canSeePrecautionType}
            canSeePrecautionSeverity={canSeePrecautionSeverity}
            canSeePregnancyTrimesters={canSeePregnancyTrimesters}
            canSeeQuickSelectTags={canSeeQuickSelectTags}
            canSeeIntakeTime={canSeeIntakeTime}
            canSeeAgeContraindications={canSeeAgeContraindications}
            canSeeInteractionSuggestions={canSeeInteractionSuggestions}
            userRole={userRole}
            onEdit={(drug) => {
              if (activeDrugTabId) {
                handleCloseDrugTab(activeDrugTabId);
              }
              handleOpenModal(drug);
            }}
            drugGroups={drugGroups}
          />
        </div>
      )}

      {/* Main Content Wrapper with Push Effect on Mobile */}
      <motion.div
        animate={{
          x: "0%",
          scale: 1,
          opacity: 1,
        }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className={cn(
          "w-full origin-left transition-colors",
          (!isMobile && activeDrugTabId !== null && detailDrug) && "hidden"
        )}
      >
        {!(isManageDirectory && viewMode === "drugs") && (isManageDirectory || (isMobile && !getPortalNode())) && (
          <div
            ref={!isManageDirectory ? mainSearchRef : undefined}
            className={cn(
              "w-full mb-2 lg:mb-4 flex flex-wrap items-center gap-2.5 lg:gap-3",
              isManageDirectory ? "justify-between" : "justify-start"
            )}
          >
            {/* Tiêu đề chỉ hiển thị ở Quản lý danh mục thuốc (nếu có), bỏ ở Tra cứu thuốc PC */}
            {isManageDirectory && (
              <div className="hidden lg:block">
                <div
                  className={cn(
                    "inline-flex items-center gap-4 px-6 py-3 rounded-[32px] border-2 transition-all",
                    isDarkMode
                      ? "bg-blue-500/5 border-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/5"
                      : "bg-blue-50 border-blue-100 text-blue-600 shadow-xl shadow-blue-500/10",
                  )}
                >
                  <div className="p-2 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                    <Pill size={32} />
                  </div>
                  <span className="text-[35px] font-black tracking-tighter uppercase">
                    {featureSettings?.customTitle || "Quản lý danh mục thuốc"}
                  </span>
                </div>
              </div>
            )}

            {/* Thanh tìm kiếm float left tại Tra cứu thuốc */}
            {!isManageDirectory &&
              viewMode !== "groups" &&
              viewMode !== "excipients" &&
              viewMode !== "companies" &&
              (viewMode !== "ingredients" || ingredientView === "search") && (
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2 flex-1 min-w-[260px]",
                    isMobile && getPortalNode() && "hidden",
                  )}
                >
                  {/* Ô nhập tìm kiếm - Đã chuyển sang Left Sidebar trên PC của Tra cứu thuốc */}
                  {isMobile && !getPortalNode() && (
                    <div
                      className={cn(
                        "flex items-center rounded-2xl border transition-all shadow-xs h-[38px] sm:h-[40px] px-3 gap-2 flex-1 min-w-[220px] max-w-md",
                        isDarkMode
                          ? "bg-slate-900/70 border-slate-800 text-slate-200"
                          : "bg-white border-slate-200/90 text-slate-700 shadow-sm",
                      )}
                    >
                      <Search size={14} className="text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder={
                          viewMode === "drugs"
                            ? searchMode === "all"
                              ? "Tìm tên thuốc, hoạt chất, mã ATC..."
                              : searchMode === "name"
                                ? "Tìm theo tên thuốc..."
                                : "Tìm theo hoạt chất..."
                            : "Tìm kiếm..."
                        }
                        className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full p-0 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          title="Xóa nhanh từ khóa"
                          className={cn(
                            "p-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center cursor-pointer shrink-0",
                            isDarkMode ? "text-rose-400 hover:bg-slate-800" : "text-rose-500 hover:bg-slate-100",
                          )}
                        >
                          <X size={13} />
                        </button>
                      )}
                      {viewMode === "drugs" && (
                        <select
                          value={searchMode}
                          onChange={(e) => setSearchMode(e.target.value as any)}
                          className={cn(
                            "text-[10px] font-black uppercase tracking-wider py-1 px-1.5 rounded-xl border-none focus:ring-0 cursor-pointer transition-all shrink-0",
                            isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600 shadow-xs",
                          )}
                        >
                          <option value="all">Tất cả</option>
                          <option value="name">Tên</option>
                          <option value="ingredient">Hoạt chất</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

            <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
              {/* Nút Thêm thuốc chỉ xuất hiện ở Quản lý danh mục thuốc, bỏ ở giao diện Tra cứu thuốc */}
              {isManageDirectory && (canManage || userRole === "admin") && viewMode === "drugs" && (
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className={cn(
                    "hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20 text-xs cursor-pointer select-none whitespace-nowrap",
                  )}
                >
                  <Plus size={16} />
                  <span>Thêm thuốc</span>
                </button>
              )}
              {/* Thống kê thuốc gom gọn vào 1 div duy nhất - Ẩn ở giao diện Tra cứu thuốc theo yêu cầu */}
              {isManageDirectory && (
                <div
                  id="drug-directory-stats-frame"
                  className={cn(
                    "inline-flex items-center gap-1 sm:gap-1.5 p-1 border transition-all shadow-xs text-xs flex-wrap max-w-full",
                    !isManageDirectory ? "rounded-none lg:rounded-2xl" : (isMobile ? "rounded-none" : "rounded-2xl"),
                    isDarkMode
                      ? "bg-slate-900/70 border-slate-800 text-slate-200"
                      : "bg-white border-slate-200/90 text-slate-700 shadow-sm"
                  )}
                >
                  {/* Tổng thuốc */}
                  <div
                    id="stats-total-drugs"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 transition-all select-none",
                      !isManageDirectory ? "rounded-none lg:rounded-xl" : "rounded-xl",
                      isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-100/80"
                    )}
                    title={`Tổng số thuốc: ${drugs.length}`}
                  >
                    <Pill size={13} className="text-blue-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Thuốc:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{drugs.length}</span>
                  </div>

                  <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

                  {/* Nhóm thuốc */}
                  <button
                    type="button"
                    id="stats-total-groups"
                    onClick={() => setViewMode(viewMode === "groups" ? "drugs" : "groups")}
                    title="Xem danh sách nhóm thuốc"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 transition-all cursor-pointer select-none active:scale-95",
                      !isManageDirectory ? "rounded-none lg:rounded-xl" : "rounded-xl",
                      viewMode === "groups"
                        ? isDarkMode
                          ? "bg-indigo-600/30 text-indigo-300 font-bold"
                          : "bg-indigo-50 text-indigo-700 font-bold"
                        : isDarkMode
                          ? "hover:bg-slate-800/60 text-slate-300"
                          : "hover:bg-slate-100/80 text-slate-700"
                    )}
                  >
                    <FolderTree size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nhóm:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{stockStats.totalGroups}</span>
                  </button>

                  <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

                  {/* Hoạt chất */}
                  <div
                    id="stats-total-ingredients"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 transition-all select-none",
                      !isManageDirectory ? "rounded-none lg:rounded-xl" : "rounded-xl",
                      isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-100/80"
                    )}
                    title={`Tổng số hoạt chất: ${availableIngredients.length}`}
                  >
                    <Activity size={13} className="text-cyan-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Hoạt chất:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{availableIngredients.length}</span>
                  </div>

                  {/* Còn hàng, Sắp hết, Hết hàng - Chỉ hiển thị khi ở chế độ Biệt dược / Thuốc và có quyền xem cột Tình trạng */}
                  {viewMode === "drugs" && canSeeStatusColumn && (
                    <>
                      <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

                      {/* Còn hàng */}
                      <button
                        type="button"
                        id="stats-stock-available"
                        onClick={() => setStockFilter(stockFilter === "available" ? "all" : "available")}
                        title={stockFilter === "available" ? "Bỏ lọc Còn hàng" : "Lọc thuốc Còn hàng"}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 transition-all cursor-pointer select-none active:scale-95",
                          !isManageDirectory ? "rounded-none lg:rounded-xl" : "rounded-xl",
                          stockFilter === "available"
                            ? isDarkMode
                              ? "bg-emerald-500/20 text-emerald-300 font-bold ring-1 ring-emerald-500/50"
                              : "bg-emerald-50 text-emerald-700 font-bold ring-1 ring-emerald-300"
                            : isDarkMode
                              ? "hover:bg-slate-800/60 text-slate-300"
                              : "hover:bg-slate-100/80 text-slate-700"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Còn:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{stockStats.available}</span>
                      </button>

                      {/* Sắp hết */}
                      <button
                        type="button"
                        id="stats-stock-low"
                        onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")}
                        title={stockFilter === "low" ? "Bỏ lọc Sắp hết hàng" : "Lọc thuốc Sắp hết hàng"}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 transition-all cursor-pointer select-none active:scale-95",
                          !isManageDirectory ? "rounded-none lg:rounded-xl" : "rounded-xl",
                          stockFilter === "low"
                            ? isDarkMode
                              ? "bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/50"
                              : "bg-amber-50 text-amber-700 font-bold ring-1 ring-amber-300"
                            : isDarkMode
                              ? "hover:bg-slate-800/60 text-slate-300"
                              : "hover:bg-slate-100/80 text-slate-700"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Sắp hết:</span>
                        <span className="font-black text-amber-600 dark:text-amber-400">{stockStats.low}</span>
                      </button>

                      {/* Hết hàng */}
                      <button
                        type="button"
                        id="stats-stock-out"
                        onClick={() => setStockFilter(stockFilter === "out" ? "all" : "out")}
                        title={stockFilter === "out" ? "Bỏ lọc Hết hàng" : "Lọc thuốc Hết hàng"}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 transition-all cursor-pointer select-none active:scale-95",
                          !isManageDirectory ? "rounded-none lg:rounded-xl" : "rounded-xl",
                          stockFilter === "out"
                            ? isDarkMode
                              ? "bg-rose-500/20 text-rose-300 font-bold ring-1 ring-rose-500/50"
                              : "bg-rose-50 text-rose-700 font-bold ring-1 ring-rose-300"
                            : isDarkMode
                              ? "hover:bg-slate-800/60 text-slate-300"
                              : "hover:bg-slate-100/80 text-slate-700"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Hết:</span>
                        <span className="font-black text-rose-600 dark:text-rose-400">{stockStats.out}</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {!onExternalViewModeChange && (
                <div className={cn(!getPortalNode() ? "w-full overflow-x-auto no-scrollbar py-1" : "hidden lg:block", !isManageDirectory && "lg:ml-auto")}>
                  {viewModeToggle}
                </div>
              )}
              {viewMode === "groups" && !isMobile && (
                <div
                  className={cn(
                    "flex items-center gap-1 p-1 rounded-2xl shadow-sm border",
                    !isManageDirectory && "lg:ml-auto",
                    isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setGroupTypeTab("treatment")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                      groupTypeTab === "treatment"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                        : isDarkMode
                        ? "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/55",
                    )}
                  >
                    Điều trị
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupTypeTab("interaction")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                      groupTypeTab === "interaction"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                        : isDarkMode
                        ? "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/55",
                    )}
                  >
                    Tương tác
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {viewMode !== "groups" &&
        viewMode !== "excipients" &&
        viewMode !== "companies" &&
        (viewMode !== "ingredients" || ingredientView === "search") &&
        isManageDirectory &&
        !(isManageDirectory && (viewMode as any) === "drugs") && (
          <div
            ref={isManageDirectory ? mainSearchRef : undefined}
            className={cn(
              "w-full mb-3 p-1.5 lg:p-3 rounded-2xl lg:rounded-[32px] border transition-all shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3",
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-100",
              (isMobile && getPortalNode()) && "hidden",
            )}
          >
            {isMobile ? (
              <div className="flex items-center gap-2 w-full">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
                      searchTerm ? "text-blue-500" : "text-slate-400",
                    )}
                  />
                  <input
                    type="text"
                    placeholder={
                      viewMode === "drugs"
                        ? searchMode === "all"
                          ? "Tìm tên thuốc, hoạt chất, mã..."
                          : searchMode === "name"
                            ? "Tìm theo tên thuốc..."
                            : "Tìm theo hoạt chất..."
                        : "Tìm kiếm..."
                    }
                    className={cn(
                      "w-full pl-9 pr-9 py-2.5 border rounded-xl text-xs font-bold focus:ring-1 focus:ring-blue-500 transition-all",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500"
                        : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-xs",
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Xóa từ khóa"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {viewMode === "drugs" && (
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all relative shrink-0",
                      showFilters
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : isDarkMode
                          ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-xs",
                    )}
                    title="Cấu hình bộ lọc"
                  >
                    <Filter size={16} />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center bg-blue-600 text-white text-[8px] min-w-3.5 h-3.5 px-0.5 rounded-full font-black border border-white dark:border-slate-900">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                )}
                {viewMode === "drugs" && !canManage && (
                  <button
                    type="button"
                    onClick={() => setFavoriteOnlyFilter((prev) => !prev)}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all relative shrink-0 active:scale-95 cursor-pointer",
                      favoriteOnlyFilter
                        ? "bg-amber-500 border-amber-500 text-white shadow-sm ring-1 ring-amber-400"
                        : favoriteCount > 0
                          ? isDarkMode
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                            : "bg-amber-50 border-amber-200 text-amber-600"
                          : isDarkMode
                            ? "bg-slate-800 border-slate-700 text-slate-400"
                            : "bg-white border-slate-200 text-slate-500 shadow-xs",
                    )}
                    title={favoriteOnlyFilter ? "Đang lọc thuốc yêu thích (nhấn để xem tất cả)" : "Thuốc yêu thích"}
                  >
                    <Star
                      size={16}
                      className={cn(
                        favoriteOnlyFilter
                          ? "fill-white text-white"
                          : favoriteCount > 0
                            ? "fill-amber-400 text-amber-500"
                            : "text-current",
                      )}
                    />
                    {favoriteCount > 0 && (
                      <span
                        className={cn(
                          "absolute -top-1 -right-1 flex items-center justify-center text-[8px] min-w-3.5 h-3.5 px-0.5 rounded-full font-black border",
                          favoriteOnlyFilter
                            ? "bg-white text-amber-600 border-amber-400"
                            : "bg-amber-500 text-white border-white dark:border-slate-900",
                        )}
                      >
                        {favoriteCount > 99 ? "99+" : favoriteCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="relative flex-1 flex items-center group">
                  <Search
                    className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder={
                      searchMode === "all"
                        ? "Tìm tên thuốc, hoạt chất, mã ATC..."
                        : searchMode === "name"
                          ? "Tìm theo tên thuốc..."
                          : "Tìm theo hoạt chất..."
                    }
                    className={cn(
                      "w-full pl-10 pr-28 lg:pl-12 lg:pr-32 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl focus:ring-0 transition-all text-xs font-bold",
                      isDarkMode
                        ? "bg-slate-800/50 text-white placeholder:text-slate-600"
                        : "bg-slate-50 text-slate-900 placeholder:text-slate-400",
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute right-1.5 lg:right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        title="Xóa nhanh từ khóa tìm kiếm"
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95",
                          isDarkMode
                            ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                            : "bg-rose-100 text-rose-600 hover:bg-rose-200"
                        )}
                      >
                        <X size={14} />
                        <span className="hidden sm:inline">Xóa</span>
                      </button>
                    )}
                    <select
                      value={searchMode}
                      onChange={(e) => setSearchMode(e.target.value as any)}
                      className={cn(
                        "text-[9px] lg:text-[10px] font-black uppercase tracking-widest py-1 lg:py-1.5 px-2 lg:px-3 rounded-lg lg:rounded-xl border-none focus:ring-0 cursor-pointer transition-all",
                        isDarkMode
                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm",
                      )}
                    >
                      <option value="all">Tất cả</option>
                      <option value="name">Tên</option>
                      <option value="ingredient">Hoạt chất</option>
                    </select>
                  </div>
                </div>

                <div
                  className={cn(
                    "h-6 lg:h-8 w-px hidden lg:block transition-colors",
                    isDarkMode ? "bg-slate-800" : "bg-slate-100",
                  )}
                ></div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {viewMode === "drugs" && (
                    <>
                      {canManage && (
                        <div className="relative group">
                          <Filter
                            className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                            size={14}
                          />
                          <select
                            className={cn(
                              "w-full sm:w-40 pl-9 lg:pl-11 pr-8 lg:pr-10 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl appearance-none focus:ring-0 cursor-pointer text-xs font-bold transition-all",
                              isDarkMode
                                ? "bg-slate-800/50 text-slate-300"
                                : "bg-slate-50 text-slate-600",
                            )}
                            value={statusFilters.length === 1 ? statusFilters[0] : (statusFilters.length === 0 ? statusFilter : "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStatusFilter(val as any);
                              setStatusFilters(val === "all" ? [] : [val]);
                            }}
                          >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="suspended">Tạm ngưng</option>
                            <option value="hidden">Đang ẩn</option>
                          </select>
                          <ChevronRight
                            className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90"
                            size={14}
                          />
                        </div>
                      )}

                      <div
                        className="relative flex-1 sm:flex-none group"
                        ref={groupFilterRef}
                      >
                        <div
                          onClick={() => {
                            setIsGroupFilterOpen(!isGroupFilterOpen);
                            if (!isGroupFilterOpen) {
                              setGroupFilterSearch("");
                              // Scroll to element on mobile to avoid keyboard covering
                              if (window.innerWidth < 768) {
                                setTimeout(() => {
                                  groupFilterRef.current?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                                }, 300);
                              }
                            }
                          }}
                          className={cn(
                            "w-auto min-w-[160px] sm:min-w-[200px] pl-9 lg:pl-11 pr-8 lg:pr-10 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl flex items-center cursor-pointer transition-all h-full min-h-[40px] lg:min-h-[56px]",
                            groupFilter !== "Tất cả"
                              ? isDarkMode
                                ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/50"
                                : "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                              : isDarkMode
                                ? "bg-slate-800/50 text-slate-300"
                                : "bg-slate-50 text-slate-600",
                          )}
                        >
                          <Folder
                            className={cn(
                              "absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 transition-colors",
                              isGroupFilterOpen
                                ? "text-blue-500"
                                : "text-slate-400",
                            )}
                            size={14}
                          />
                          <span className="text-xs font-bold truncate">
                            {groupFilter === "Tất cả"
                              ? "Tất cả nhóm thuốc"
                              : drugGroups.find((g) => g.id === groupFilter)
                                  ?.name || "Tất cả nhóm thuốc"}
                          </span>
                          <ChevronRight
                            className={cn(
                              "absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform",
                              isGroupFilterOpen ? "-rotate-90" : "rotate-90",
                            )}
                            size={14}
                          />
                        </div>

                        <AnimatePresence>
                          {isGroupFilterOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className={cn(
                                "absolute top-full left-0 mt-2 z-50 rounded-2xl shadow-2xl border overflow-hidden min-w-[280px] sm:min-w-[400px]",
                                isDarkMode
                                  ? "bg-slate-900 border-slate-800"
                                  : "bg-white border-slate-100",
                              )}
                            >
                              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="relative">
                                  <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    size={14}
                                  />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Tìm nhóm thuốc..."
                                    className={cn(
                                      "w-full pl-9 pr-10 py-2 bg-transparent border-none focus:ring-0 text-xs font-bold",
                                      isDarkMode
                                        ? "text-white"
                                        : "text-slate-900",
                                    )}
                                    value={groupFilterSearch}
                                    onChange={(e) =>
                                      setGroupFilterSearch(e.target.value)
                                    }
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGroupFilterSearch("");
                                      setIsGroupFilterOpen(false);
                                    }}
                                    className={cn(
                                      "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
                                      isDarkMode
                                        ? "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                                        : "text-slate-400 hover:text-rose-500 hover:bg-slate-100",
                                    )}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-hide py-1">
                                <button
                                  onClick={() => {
                                    setGroupFilter("Tất cả");
                                    setIsGroupFilterOpen(false);
                                    setGroupFilterSearch("");
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap overflow-hidden text-ellipsis",
                                    groupFilter === "Tất cả"
                                      ? isDarkMode
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-50 text-blue-600"
                                      : isDarkMode
                                        ? "hover:bg-slate-800 text-slate-300"
                                        : "hover:bg-slate-50 text-slate-600",
                                  )}
                                >
                                  Tất cả nhóm thuốc
                                </button>
                                {sortedDrugGroups
                                  .filter(
                                    (g) =>
                                      !groupFilterSearch ||
                                      g.name
                                        .toLowerCase()
                                        .includes(
                                          groupFilterSearch.toLowerCase(),
                                        ),
                                  )
                                  .map((group) => (
                                    <button
                                      key={group.id}
                                      onClick={() => {
                                        setGroupFilter(group.id);
                                        setIsGroupFilterOpen(false);
                                        setGroupFilterSearch("");
                                      }}
                                      title={group.name}
                                      className={cn(
                                        "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center whitespace-nowrap",
                                        groupFilter === group.id
                                          ? isDarkMode
                                            ? "bg-blue-600 text-white"
                                            : "bg-blue-50 text-blue-600"
                                          : isDarkMode
                                            ? "hover:bg-slate-800 text-slate-300"
                                            : "hover:bg-slate-50 text-slate-600",
                                      )}
                                    >
                                      {!groupFilterSearch && (
                                        <span className="flex-shrink-0">
                                          {"\u00A0".repeat(group.level * 3)}
                                        </span>
                                      )}
                                      {!groupFilterSearch &&
                                        group.level > 0 && (
                                          <span className="text-slate-400 mr-1 flex-shrink-0">
                                            └─{" "}
                                          </span>
                                        )}
                                      <span className="truncate">
                                        {group.name}
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div
                        className="relative flex-1 sm:flex-none min-w-[140px] group"
                        ref={dosageFormFilterRef}
                      >
                        <div
                          onClick={() => {
                            setIsDosageFormFilterOpen(!isDosageFormFilterOpen);
                            if (!isDosageFormFilterOpen) {
                              setDosageFormFilterSearch("");
                              if (window.innerWidth < 768) {
                                setTimeout(() => {
                                  dosageFormFilterRef.current?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                                }, 300);
                              }
                            }
                          }}
                          className={cn(
                            "w-auto min-w-[160px] pl-9 lg:pl-11 pr-8 lg:pr-10 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl flex items-center cursor-pointer transition-all h-full min-h-[40px] lg:min-h-[56px]",
                            dosageFormFilter !== "all"
                              ? isDarkMode
                                ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/50"
                                : "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                              : isDarkMode
                                ? "bg-slate-800/50 text-slate-300"
                                : "bg-slate-50 text-slate-600",
                          )}
                        >
                          <Pill
                            className={cn(
                              "absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 transition-colors",
                              isDosageFormFilterOpen
                                ? "text-blue-500"
                                : "text-slate-400",
                            )}
                            size={14}
                          />
                          <span className="text-xs font-bold truncate">
                            {dosageFormFilter === "all"
                              ? "Tất cả bào chế"
                              : dosageFormFilter}
                          </span>
                          <ChevronRight
                            className={cn(
                              "absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform",
                              isDosageFormFilterOpen
                                ? "-rotate-90"
                                : "rotate-90",
                            )}
                            size={14}
                          />
                        </div>

                        <AnimatePresence>
                          {isDosageFormFilterOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className={cn(
                                "absolute top-full left-0 mt-2 z-50 rounded-2xl shadow-2xl border overflow-hidden min-w-[220px] sm:min-w-[300px]",
                                isDarkMode
                                  ? "bg-slate-900 border-slate-800"
                                  : "bg-white border-slate-100",
                              )}
                            >
                              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="relative">
                                  <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    size={14}
                                  />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Tìm dạng bào chế..."
                                    className={cn(
                                      "w-full pl-9 pr-10 py-2 bg-transparent border-none focus:ring-0 text-xs font-bold",
                                      isDarkMode
                                        ? "text-white"
                                        : "text-slate-900",
                                    )}
                                    value={dosageFormFilterSearch}
                                    onChange={(e) =>
                                      setDosageFormFilterSearch(e.target.value)
                                    }
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDosageFormFilterSearch("");
                                      setIsDosageFormFilterOpen(false);
                                    }}
                                    className={cn(
                                      "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
                                      isDarkMode
                                        ? "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                                        : "text-slate-400 hover:text-rose-500 hover:bg-slate-100",
                                    )}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                              <div className="max-h-[300px] overflow-y-auto scrollbar-hide py-1">
                                <button
                                  onClick={() => {
                                    setDosageFormFilter("all");
                                    setIsDosageFormFilterOpen(false);
                                    setDosageFormFilterSearch("");
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap",
                                    dosageFormFilter === "all"
                                      ? isDarkMode
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-50 text-blue-600"
                                      : isDarkMode
                                        ? "hover:bg-slate-800 text-slate-300"
                                        : "hover:bg-slate-50 text-slate-600",
                                  )}
                                >
                                  Tất cả bào chế
                                </button>
                                {uniqueDosageForms
                                  .filter(
                                    (form) =>
                                      !dosageFormFilterSearch ||
                                      form
                                        .toLowerCase()
                                        .includes(
                                          dosageFormFilterSearch.toLowerCase(),
                                        ),
                                  )
                                  .map((form) => (
                                    <button
                                      key={form}
                                      onClick={() => {
                                        setDosageFormFilter(form);
                                        setIsDosageFormFilterOpen(false);
                                        setDosageFormFilterSearch("");
                                      }}
                                      className={cn(
                                        "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap overflow-hidden text-ellipsis",
                                        dosageFormFilter === form
                                          ? isDarkMode
                                            ? "bg-blue-600 text-white"
                                            : "bg-blue-50 text-blue-600"
                                          : isDarkMode
                                            ? "hover:bg-slate-800 text-slate-300"
                                            : "hover:bg-slate-50 text-slate-600",
                                      )}
                                    >
                                      {form}
                                    </button>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {canSeeStatusColumn && (
                        <div className="relative flex-1 sm:flex-none min-w-[140px] group">
                          <Database
                            className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                            size={14}
                          />
                          <select
                            className={cn(
                              "w-full pl-9 lg:pl-11 pr-8 lg:pr-10 py-2.5 lg:py-4 border-none rounded-xl lg:rounded-2xl appearance-none focus:ring-0 cursor-pointer text-xs font-bold transition-all",
                              stockFilter !== "all"
                                ? isDarkMode
                                  ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/50"
                                  : "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                                : isDarkMode
                                  ? "bg-slate-800/50 text-slate-300"
                                  : "bg-slate-50 text-slate-600",
                            )}
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                          >
                            <option value="all">Tất cả tình trạng</option>
                            <option value="available">Còn hàng</option>
                            <option value="low">Sắp hết</option>
                            <option value="out">Hết hàng</option>
                          </select>
                          <ChevronRight
                            className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90"
                            size={14}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      {/* Mobile Filters Accordion Panel - Visible on mobile when showFilters is true */}
      <AnimatePresence>
        {showFilters && isMobile && viewMode === "drugs" && !isManageDirectory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden mb-3.5 touch-pan-y"
            data-prevent-swipe="true"
          >
            <div
              className={cn(
                "p-3.5 rounded-2xl border space-y-4 shadow-sm transition-all touch-pan-y",
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-blue-50/40 border-blue-100 text-slate-800",
              )}
              data-prevent-swipe="true"
            >
              {/* Reset active filters banner if any */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Bộ lọc đang hoạt động
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-600 text-white">
                      {activeFiltersCount}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("all");
                      setStatusFilters([]);
                      setGroupFilter("Tất cả");
                      setStockFilter("all");
                      setDosageFormFilter("all");
                      setSearchMode("all");
                      setFavoriteOnlyFilter(false);
                      setPatientAgeMin(0);
                      setPatientAgeMax(100);
                      setPatientAge(null);
                      setPatientAgeUnit("years");
                      setAgePreset("all");
                      setPatientWeightMin(0);
                      setPatientWeightMax(120);
                      setPatientWeight(null);
                      setWeightPreset("all");
                      setPatientCrclMin(0);
                      setPatientCrclMax(120);
                      setPatientEgfr(null);
                      setEgfrPreset("all");
                    }}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={12} />
                    Tắt nhanh lọc
                  </button>
                </div>
              )}

              {(canManage || userRole === "admin") && (
                <div className="flex items-center justify-between p-2.5 rounded-xl border transition-all bg-blue-500/10 border-blue-500/30 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                      <Plus size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Tạo thuốc mới</div>
                      <div className="text-[10px] text-slate-400">Thêm thuốc vào danh mục dữ liệu</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFilters(false);
                      handleOpenModal();
                    }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer active:scale-95"
                  >
                    Thêm thuốc
                  </button>
                </div>
              )}

              {/* 1. Search Scope / Chế độ tìm kiếm */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-blue-500 rounded-full" />
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isDarkMode ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Phạm vi tìm kiếm
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "name", label: "Tên thuốc" },
                    { id: "ingredient", label: "Hoạt chất" },
                  ].map((modeItem) => {
                    const isSelected = searchMode === modeItem.id;
                    return (
                      <button
                        key={modeItem.id}
                        type="button"
                        onClick={() => setSearchMode(modeItem.id as any)}
                        className={cn(
                          "py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center",
                          isSelected
                            ? "bg-blue-600 text-white shadow-sm"
                            : isDarkMode
                              ? "bg-slate-800 text-slate-400 hover:text-slate-200"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        {modeItem.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Status Filter if canManage */}
              {canManage && (
                <div
                  className={cn(
                    "flex flex-col gap-2 pt-2.5 border-t",
                    isDarkMode ? "border-slate-800" : "border-blue-100/60",
                  )}
                >
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isDarkMode ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      Trạng thái hiển thị
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: "all", label: "Tất cả" },
                      { id: "active", label: "Hoạt động" },
                      { id: "suspended", label: "Tạm ngưng" },
                      { id: "hidden", label: "Đang ẩn" },
                    ].map((item) => {
                      const isSelected = statusFilters.length > 0 ? (item.id === "all" ? statusFilters.length === 0 : statusFilters.includes(item.id)) : statusFilter === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setStatusFilter(item.id as any);
                            setStatusFilters(item.id === "all" ? [] : [item.id]);
                          }}
                          className={cn(
                            "py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center",
                            isSelected
                              ? "bg-indigo-600 text-white shadow-sm"
                              : isDarkMode
                                ? "bg-slate-800 text-slate-400 hover:text-slate-200"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Drug Group Filter */}
              <div
                className={cn(
                  "flex flex-col gap-2 pt-2.5 border-t",
                  isDarkMode ? "border-slate-800" : "border-blue-100/60",
                )}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-teal-500 rounded-full" />
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isDarkMode ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      Nhóm thuốc
                    </span>
                  </div>
                  {groupFilter !== "Tất cả" && (
                    <button
                      type="button"
                      onClick={() => setGroupFilter("Tất cả")}
                      className="text-[9px] font-bold text-rose-500 hover:underline"
                    >
                      Đặt lại
                    </button>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIsMobileGroupFilterSelectOpen(
                        !isMobileGroupFilterSelectOpen,
                      )
                    }
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between",
                      groupFilter !== "Tất cả"
                        ? isDarkMode
                          ? "bg-teal-600/20 text-teal-300 border-teal-500/40"
                          : "bg-teal-50 text-teal-700 border-teal-200"
                        : isDarkMode
                          ? "bg-slate-800 text-slate-300 border-slate-750"
                          : "bg-white text-slate-700 border-slate-200 shadow-xs",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder
                        size={14}
                        className={
                          groupFilter !== "Tất cả"
                            ? "text-teal-500"
                            : "text-slate-400"
                        }
                      />
                      <span className="truncate">
                        {groupFilter === "Tất cả"
                          ? "Tất cả nhóm thuốc"
                          : drugGroups.find((g) => g.id === groupFilter)
                              ?.name || "Tất cả"}
                      </span>
                    </div>
                    <ChevronRight
                      className={cn(
                        "text-slate-400 transition-transform shrink-0",
                        isMobileGroupFilterSelectOpen ? "rotate-90" : "",
                      )}
                      size={14}
                    />
                  </button>

                  <AnimatePresence>
                    {isMobileGroupFilterSelectOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          "mt-1.5 rounded-xl border overflow-hidden flex flex-col shadow-lg z-30",
                          isDarkMode
                            ? "bg-slate-850 border-slate-750"
                            : "bg-white border-slate-200",
                        )}
                      >
                        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center relative">
                          <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={12}
                          />
                          <input
                            type="text"
                            placeholder="Tìm nhanh nhóm..."
                            className={cn(
                              "w-full pl-7 pr-7 py-1 bg-transparent border-none focus:ring-0 text-xs font-bold",
                              isDarkMode ? "text-white" : "text-slate-900",
                            )}
                            value={groupFilterSearch}
                            onChange={(e) =>
                              setGroupFilterSearch(e.target.value)
                            }
                          />
                          {groupFilterSearch && (
                            <button
                              type="button"
                              onClick={() => setGroupFilterSearch("")}
                              className={cn(
                                "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors",
                                isDarkMode
                                  ? "text-slate-400 hover:text-slate-200"
                                  : "text-slate-400 hover:text-rose-500",
                              )}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <div className="max-h-[190px] overflow-y-auto no-scrollbar py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setGroupFilter("Tất cả");
                              setIsMobileGroupFilterSelectOpen(false);
                              setGroupFilterSearch("");
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs font-bold transition-all",
                              groupFilter === "Tất cả"
                                ? "bg-teal-600 text-white"
                                : isDarkMode
                                  ? "hover:bg-slate-800 text-slate-300"
                                  : "hover:bg-slate-100 text-slate-600",
                            )}
                          >
                            Tất cả nhóm thuốc
                          </button>
                          {sortedDrugGroups
                            .filter(
                              (g) =>
                                !groupFilterSearch ||
                                g.name
                                  .toLowerCase()
                                  .includes(groupFilterSearch.toLowerCase()),
                            )
                            .map((group) => (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() => {
                                  setGroupFilter(group.id);
                                  setIsMobileGroupFilterSelectOpen(false);
                                  setGroupFilterSearch("");
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-1.5 text-xs font-bold transition-all flex items-center whitespace-nowrap",
                                  groupFilter === group.id
                                    ? "bg-teal-600 text-white"
                                    : isDarkMode
                                      ? "hover:bg-slate-800 text-slate-300"
                                      : "hover:bg-slate-100 text-slate-600",
                                )}
                              >
                                {!groupFilterSearch && (
                                  <span className="shrink-0">
                                    {"\u00A0".repeat(group.level * 2)}
                                  </span>
                                )}
                                {!groupFilterSearch && group.level > 0 && (
                                  <span className="text-slate-400 mr-1 shrink-0">
                                    └─
                                  </span>
                                )}
                                <span className="truncate">{group.name}</span>
                              </button>
                            ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 4. Dosage Form Filter */}
              <div
                className={cn(
                  "flex flex-col gap-2 pt-2.5 border-t",
                  isDarkMode ? "border-slate-800" : "border-blue-100/60",
                )}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-violet-500 rounded-full" />
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isDarkMode ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      Dạng bào chế
                    </span>
                  </div>
                  {dosageFormFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setDosageFormFilter("all")}
                      className="text-[9px] font-bold text-rose-500 hover:underline"
                    >
                      Đặt lại
                    </button>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIsMobileDosageFormFilterSelectOpen(
                        !isMobileDosageFormFilterSelectOpen,
                      )
                    }
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between",
                      dosageFormFilter !== "all"
                        ? isDarkMode
                          ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                          : "bg-violet-50 text-violet-700 border-violet-200"
                        : isDarkMode
                          ? "bg-slate-800 text-slate-300 border-slate-750"
                          : "bg-white text-slate-700 border-slate-200 shadow-xs",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Pill
                        size={14}
                        className={
                          dosageFormFilter !== "all"
                            ? "text-violet-500"
                            : "text-slate-400"
                        }
                      />
                      <span className="truncate">
                        {dosageFormFilter === "all"
                          ? "Tất cả bào chế"
                          : dosageFormFilter}
                      </span>
                    </div>
                    <ChevronRight
                      className={cn(
                        "text-slate-400 transition-transform shrink-0",
                        isMobileDosageFormFilterSelectOpen ? "rotate-90" : "",
                      )}
                      size={14}
                    />
                  </button>

                  <AnimatePresence>
                    {isMobileDosageFormFilterSelectOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          "mt-1.5 rounded-xl border overflow-hidden flex flex-col shadow-lg z-30",
                          isDarkMode
                            ? "bg-slate-850 border-slate-750"
                            : "bg-white border-slate-200",
                        )}
                      >
                        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center relative">
                          <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={12}
                          />
                          <input
                            type="text"
                            placeholder="Tìm dạng bào chế..."
                            className={cn(
                              "w-full pl-7 pr-7 py-1 bg-transparent border-none focus:ring-0 text-xs font-bold",
                              isDarkMode ? "text-white" : "text-slate-900",
                            )}
                            value={dosageFormFilterSearch}
                            onChange={(e) =>
                              setDosageFormFilterSearch(e.target.value)
                            }
                          />
                          {dosageFormFilterSearch && (
                            <button
                              type="button"
                              onClick={() => setDosageFormFilterSearch("")}
                              className={cn(
                                "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors",
                                isDarkMode
                                  ? "text-slate-400 hover:text-slate-200"
                                  : "text-slate-400 hover:text-rose-500",
                              )}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <div className="max-h-[180px] overflow-y-auto no-scrollbar py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDosageFormFilter("all");
                              setIsMobileDosageFormFilterSelectOpen(false);
                              setDosageFormFilterSearch("");
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs font-bold transition-all",
                              dosageFormFilter === "all"
                                ? "bg-violet-600 text-white"
                                : isDarkMode
                                  ? "hover:bg-slate-800 text-slate-300"
                                  : "hover:bg-slate-100 text-slate-600",
                            )}
                          >
                            Tất cả bào chế
                          </button>
                          {uniqueDosageForms
                            .filter(
                              (form) =>
                                !dosageFormFilterSearch ||
                                form
                                  .toLowerCase()
                                  .includes(
                                    dosageFormFilterSearch.toLowerCase(),
                                  ),
                            )
                            .map((form) => (
                              <button
                                key={form}
                                type="button"
                                onClick={() => {
                                  setDosageFormFilter(form);
                                  setIsMobileDosageFormFilterSelectOpen(false);
                                  setDosageFormFilterSearch("");
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-1.5 text-xs font-bold transition-all truncate",
                                  dosageFormFilter === form
                                    ? "bg-violet-600 text-white"
                                    : isDarkMode
                                      ? "hover:bg-slate-800 text-slate-300"
                                      : "hover:bg-slate-100 text-slate-600",
                                )}
                              >
                                {form}
                              </button>
                            ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 5. Stock Filter if canSeeStatusColumn */}
              {canSeeStatusColumn && (
                <div
                  className={cn(
                    "flex flex-col gap-2 pt-2.5 border-t",
                    isDarkMode ? "border-slate-800" : "border-blue-100/60",
                  )}
                >
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-amber-500 rounded-full" />
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isDarkMode ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      Tình trạng hàng
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: "all", label: "Tất cả" },
                      { id: "available", label: "Còn hàng" },
                      { id: "low", label: "Sắp hết" },
                      { id: "out", label: "Hết hàng" },
                    ].map((item) => {
                      const isSelected = stockFilter === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setStockFilter(item.id)}
                          className={cn(
                            "py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center",
                            isSelected
                              ? "bg-amber-600 text-white shadow-sm"
                              : isDarkMode
                                ? "bg-slate-800 text-slate-400 hover:text-slate-200"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bộ lọc lâm sàng trên Mobile: Tuổi, Cân nặng, Mức lọc cầu thận */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                {/* 1. Tuổi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-3 bg-sky-500 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Tuổi bệnh nhân
                      </span>
                    </div>
                    {(patientAgeMin > 0 || patientAgeMax < 100 || patientAge !== null) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPatientAgeMin(0);
                          setPatientAgeMax(100);
                          setPatientAge(null);
                          setAgePreset("all");
                        }}
                        className="text-[9px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                  <DualAgeRangeSlider
                    minAge={patientAgeMin}
                    maxAge={patientAgeMax}
                    onChange={(min, max) => {
                      setPatientAgeMin(min);
                      setPatientAgeMax(max);
                      if (min === 0 && max === 100) {
                        setPatientAge(null);
                        setAgePreset("all");
                      } else {
                        setPatientAge(min === max ? min : null);
                        setAgePreset("custom");
                      }
                    }}
                    isDarkMode={isDarkMode}
                  />
                </div>

                {/* 2. Cân nặng */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-3 bg-amber-500 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Cân nặng (kg)
                      </span>
                    </div>
                    {(patientWeightMin > 0 || patientWeightMax < 120 || patientWeight !== null) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPatientWeightMin(0);
                          setPatientWeightMax(120);
                          setPatientWeight(null);
                          setWeightPreset("all");
                        }}
                        className="text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                  <DualWeightRangeSlider
                    minWeight={patientWeightMin}
                    maxWeight={patientWeightMax}
                    onChange={(min, max) => {
                      setPatientWeightMin(min);
                      setPatientWeightMax(max);
                      if (min === 0 && max === 120) {
                        setPatientWeight(null);
                        setWeightPreset("all");
                      } else {
                        setPatientWeight(min === max ? min : null);
                        setWeightPreset("custom");
                      }
                    }}
                    isDarkMode={isDarkMode}
                  />
                </div>

                {/* 3. Lọc cầu thận */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-3 bg-rose-500 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Mức lọc cầu thận (CrCl/eGFR)
                      </span>
                    </div>
                    {(patientCrclMin > 0 || patientCrclMax < 120 || patientEgfr !== null) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPatientCrclMin(0);
                          setPatientCrclMax(120);
                          setPatientEgfr(null);
                          setEgfrPreset("all");
                        }}
                        className="text-[9px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                  <DualCrclRangeSlider
                    minCrcl={patientCrclMin}
                    maxCrcl={patientCrclMax}
                    onChange={(min, max) => {
                      setPatientCrclMin(min);
                      setPatientCrclMax(max);
                      if (min === 0 && max === 120) {
                        setPatientEgfr(null);
                        setEgfrPreset("all");
                      } else {
                        setPatientEgfr(min === max ? min : null);
                        setEgfrPreset("custom");
                      }
                    }}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === "excipients" ? (
        <div className="space-y-4 lg:space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-start gap-2 lg:gap-6">
            <div
              className={cn(
                "flex items-center gap-1 p-1 rounded-2xl w-full lg:w-auto",
                isDarkMode ? "bg-slate-800/80" : "bg-slate-100",
              )}
            >
              <button
                type="button"
                onClick={() => setExcipientView("excipients")}
                className={cn(
                  "flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                  excipientView === "excipients"
                    ? isDarkMode
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-400",
                )}
              >
                <Database size={14} /> Danh sách tá dược
              </button>
              <button
                type="button"
                onClick={() => setExcipientView("categories")}
                className={cn(
                  "flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                  excipientView === "categories"
                    ? isDarkMode
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-400",
                )}
              >
                <FolderTree size={14} /> Danh mục phân loại
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
            <CatalogManagement
              type={
                excipientView === "excipients"
                  ? "excipient"
                  : "excipient_category"
              }
              isDarkMode={isDarkMode}
              onClose={() => setViewMode("drugs")}
              inline={true}
              externalTrigger={catalogAddTrigger}
              onDrugClick={handleShowDrugDetail}
            />
          </div>
        </div>
      ) : viewMode === "ingredients" ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3
              className={cn(
                "text-xl font-black",
                ingredientView === "search" && "hidden sm:block",
                isDarkMode ? "text-white" : "text-slate-900",
              )}
            >
              {ingredientView === "search"
                ? "Tra cứu theo hoạt chất"
                : ingredientView === "manage"
                  ? "Quản lý Hoạt chất"
                  : "Phân loại Hoạt chất"}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIngredientView("search")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs",
                  ingredientView === "search"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : isDarkMode
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm",
                )}
              >
                <Search size={14} /> Tra cứu
              </button>

              {isManageDirectory && canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => setIngredientView("manage")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs",
                      ingredientView === "manage"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        : isDarkMode
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm",
                    )}
                  >
                    <Activity size={14} /> Quản lý Hoạt chất
                  </button>

                  <button
                    type="button"
                    onClick={() => setIngredientView("categories")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs",
                      ingredientView === "categories"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        : isDarkMode
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm",
                    )}
                  >
                    <FolderTree size={14} /> Phân loại Hoạt chất
                  </button>
                </>
              )}

              {selectedIngredient && ingredientView === "search" && (
                <button
                  type="button"
                  onClick={() => setSelectedIngredient(null)}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {ingredientView === "search" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedIngredients.map((ing) => (
                  <div
                    key={ing.name}
                    onClick={() => {
                      setSelectedIngredient(ing.name);
                      setViewMode("drugs");
                    }}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-xl group",
                      selectedIngredient === ing.name
                        ? "border-primary bg-primary/5"
                        : isDarkMode
                          ? "bg-slate-900 border-slate-800 hover:border-blue-900"
                          : "bg-white border-slate-100 hover:border-blue-200",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            isDarkMode
                              ? "bg-slate-800 group-hover:bg-blue-900/30"
                              : "bg-blue-50 group-hover:bg-blue-100",
                          )}
                        >
                          <Activity size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <h4
                            className={cn(
                              "font-bold text-sm",
                              isDarkMode ? "text-white" : "text-slate-900",
                            )}
                          >
                            {ing.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {ing.drugCount} biệt dược
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-slate-300 group-hover:text-primary transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {totalIngredientPages > 1 && (
                <div
                  className={cn(
                    "mt-4 flex flex-wrap items-center justify-center gap-1.5 p-3 rounded-2xl border shadow-sm",
                    isDarkMode
                      ? "bg-slate-900 border-slate-800"
                      : "bg-white border-slate-100",
                  )}
                >
                  <button
                    type="button"
                    disabled={ingredientPage === 1}
                    onClick={() => {
                      setIngredientPage((prev) => Math.max(1, prev - 1));
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-400"
                        : "border-slate-100 hover:bg-slate-50 text-slate-500",
                    )}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: totalIngredientPages },
                      (_, i) => i + 1,
                    ).map((page) => {
                      const shouldShow =
                        page === 1 ||
                        page === totalIngredientPages ||
                        Math.abs(page - ingredientPage) <= 1;
                      const isBreak =
                        page !== 1 &&
                        page !== totalIngredientPages &&
                        !shouldShow &&
                        Math.abs(page - ingredientPage) === 2;

                      if (shouldShow) {
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => {
                              setIngredientPage(page);
                            }}
                            className={cn(
                              "w-8 h-8 rounded-lg text-[10px] font-black transition-all active:scale-90 flex items-center justify-center border",
                              ingredientPage === page
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : isDarkMode
                                  ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                  : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100",
                            )}
                          >
                            {page}
                          </button>
                        );
                      } else if (isBreak) {
                        return (
                          <span
                            key={page}
                            className="text-slate-400 font-bold px-1"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={ingredientPage === totalIngredientPages}
                    onClick={() => {
                      setIngredientPage((prev) =>
                        Math.min(totalIngredientPages, prev + 1),
                      );
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-400"
                        : "border-slate-100 hover:bg-slate-50 text-slate-500",
                    )}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
              <CatalogManagement
                type={
                  ingredientView === "manage"
                    ? "ingredient"
                    : "ingredient_category"
                }
                isDarkMode={isDarkMode}
                onClose={() => setIngredientView("search")}
                inline={true}
                externalTrigger={catalogAddTrigger}
              />
            </div>
          )}
        </div>
      ) : viewMode === "ingredient_categories" ? (
        <div className="space-y-4 lg:space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
            <CatalogManagement
              type="ingredient_category"
              isDarkMode={isDarkMode}
              onClose={() => setViewMode("drugs")}
              inline={true}
              externalTrigger={catalogAddTrigger}
            />
          </div>
        </div>
      ) : viewMode === "excipient_categories" ? (
        <div className="space-y-4 lg:space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
            <CatalogManagement
              type="excipient_category"
              isDarkMode={isDarkMode}
              onClose={() => setViewMode("drugs")}
              inline={true}
              externalTrigger={catalogAddTrigger}
            />
          </div>
        </div>
      ) : viewMode === "companies" ? (
        <div className="space-y-4 lg:space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
            <CatalogManagement
              type="company"
              isDarkMode={isDarkMode}
              onClose={() => setViewMode("drugs")}
              inline={true}
              externalTrigger={catalogAddTrigger}
            />
          </div>
        </div>
      ) : viewMode === "groups" ? (
        <div className={cn(
          "w-full rounded-3xl border shadow-sm overflow-hidden flex flex-col min-h-[680px]",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}>
          {/* HEADER BẢNG: Tìm kiếm, Bộ lọc Cấp 1, Nút Lựa chọn Biệt dược & Hoạt chất */}
          <div className={cn(
            "p-4 lg:p-5 border-b flex flex-col gap-4",
            isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-slate-50/70 border-slate-200"
          )}>
            {/* Top Toolbar Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className={cn(
                  "p-2.5 rounded-2xl",
                  isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-500/10 text-blue-600"
                )}>
                  <FolderTree size={20} />
                </div>
                <div>
                  <h3 className={cn("text-base font-black flex items-center gap-2", isDarkMode ? "text-white" : "text-slate-900")}>
                    Tra cứu theo Nhóm thuốc
                  </h3>
                  <p className={cn("text-xs font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {cap1Groups.length} Cấp 1 • {cap2GroupsFiltered.length} Cấp 2 • {cap3GroupsFiltered.length} Cấp 3
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Switch Phân loại: Điều trị vs Tương tác */}
                <div className={cn("p-1 rounded-xl flex items-center gap-1", isDarkMode ? "bg-slate-800" : "bg-slate-200/70")}>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupTypeTab("treatment");
                      setSelectedCap1Id("all");
                      setSelectedCap2Id("all");
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      groupTypeTab === "treatment"
                        ? (isDarkMode ? "bg-slate-700 text-blue-400 shadow-xs" : "bg-white text-blue-600 shadow-xs")
                        : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                    )}
                  >
                    Phân loại Điều trị
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupTypeTab("interaction");
                      setSelectedCap1Id("all");
                      setSelectedCap2Id("all");
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      groupTypeTab === "interaction"
                        ? (isDarkMode ? "bg-slate-700 text-blue-400 shadow-xs" : "bg-white text-blue-600 shadow-xs")
                        : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                    )}
                  >
                    Phân loại Tương tác
                  </button>
                </div>
              </div>
            </div>

            {/* Controls Bar: Tìm kiếm | Bộ lọc Cấp 1 | Nút Biệt dược & Hoạt chất */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* 1. Tim kiem */}
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhóm thuốc, biệt dược, hoạt chất..."
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-10 py-2.5 rounded-2xl border text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                  )}
                />
                {groupSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setGroupSearchTerm("")}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors",
                      isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                    )}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* 2. Bo loc Cap 1 */}
              <div className="md:col-span-4 relative">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold whitespace-nowrap hidden lg:inline", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Bộ lọc Cấp 1:
                  </span>
                  <div className="relative w-full">
                    <select
                      value={selectedCap1Id}
                      onChange={(e) => {
                        setSelectedCap1Id(e.target.value);
                        setSelectedCap2Id("all");
                      }}
                      className={cn(
                        "w-full pl-3.5 pr-8 py-2.5 rounded-2xl border text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-all appearance-none",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                      )}
                    >
                      <option value="all">📁 Tất cả Cấp 1 ({cap1Groups.length} nhóm)</option>
                      {cap1Groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({groupDrugCounts[g.id] || 0} thuốc)
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 3. Nut lua chon Biet duoc & Hoat chat */}
              <div className="md:col-span-3 flex items-center justify-end">
                <div className={cn(
                  "p-1 rounded-2xl border flex items-center gap-1 w-full sm:w-auto",
                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                )}>
                  <button
                    type="button"
                    onClick={() => setGroupDisplayMode("drugs")}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      groupDisplayMode === "drugs"
                        ? "bg-blue-600 text-white shadow-xs"
                        : (isDarkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100")
                    )}
                  >
                    <Pill size={14} />
                    <span>Biệt dược</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupDisplayMode("ingredients")}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      groupDisplayMode === "ingredients"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : (isDarkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100")
                    )}
                  >
                    <FlaskConical size={14} />
                    <span>Hoạt chất</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BODY BẢNG: Left Sidebar (Cấp 2) + Main Area (Cấp 3 & Danh sách Biệt dược / Hoạt chất) */}
          <div className="flex-1 flex flex-col md:flex-row min-h-[520px]">
            {/* LEFT SIDEBAR: Chứa Cấp 2 */}
            <div className={cn(
              "w-full md:w-80 border-b md:border-b-0 md:border-r flex flex-col shrink-0",
              isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50/50"
            )}>
              <div className={cn(
                "p-3 border-b flex items-center justify-between gap-2",
                isDarkMode ? "border-slate-800 bg-slate-800/60" : "border-slate-200 bg-slate-100/60"
              )}>
                <div className="flex items-center gap-2">
                  <Folder size={16} className="text-blue-500" />
                  <span className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    Nhóm Cấp 2 ({cap2GroupsFiltered.length})
                  </span>
                </div>
                {selectedCap2Id !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCap2Id("all")}
                    className={cn("text-[10px] font-bold hover:underline cursor-pointer", isDarkMode ? "text-blue-400" : "text-blue-600")}
                  >
                    Tất cả Cấp 2
                  </button>
                )}
              </div>

              {/* Quick filter input in sidebar */}
              <div className={cn("p-2 border-b", isDarkMode ? "border-slate-800/80" : "border-slate-200/80")}>
                <input
                  type="text"
                  placeholder="Lọc nhóm Cấp 2..."
                  value={sidebarCap2Search}
                  onChange={(e) => setSidebarCap2Search(e.target.value)}
                  className={cn(
                    "w-full px-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  )}
                />
              </div>

              {/* List of Cap 2 Items */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[400px] md:max-h-none">
                <button
                  type="button"
                  onClick={() => setSelectedCap2Id("all")}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border",
                    selectedCap2Id === "all"
                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                      : (isDarkMode ? "border-transparent text-slate-300 hover:bg-slate-800" : "border-transparent text-slate-700 hover:bg-slate-200/60")
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers size={14} />
                    <span className="truncate">Tất cả Nhóm Cấp 2</span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-extrabold",
                      selectedCap2Id === "all"
                        ? "bg-white/20 text-white"
                        : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600")
                    )}
                  >
                    {cap2GroupsFiltered.length}
                  </span>
                </button>

                {cap2GroupsFiltered.map((g2) => {
                  const isSelected = selectedCap2Id === g2.id;
                  const drugCount = groupSearchTerm.trim() ? getDrugsForGroup(g2.id).length : (groupDrugCounts[g2.id] || 0);
                  const parentCap1 = cap1Groups.find((p) => p.id === g2.parentId);

                  return (
                    <button
                      key={g2.id}
                      type="button"
                      onClick={() => setSelectedCap2Id(g2.id)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2 group cursor-pointer border",
                        isSelected
                          ? (isDarkMode ? "bg-blue-950/60 border-blue-800 text-blue-100 font-bold shadow-xs" : "bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-xs")
                          : (isDarkMode ? "border-transparent text-slate-300 hover:bg-slate-800/60" : "border-transparent text-slate-700 hover:bg-slate-200/50")
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Folder size={14} className={isSelected ? (isDarkMode ? "text-blue-400" : "text-blue-600") : "text-slate-400"} />
                          <span className="truncate font-bold">{g2.name}</span>
                        </div>
                        {selectedCap1Id === "all" && parentCap1 && (
                          <span className={cn("text-[9px] block truncate mt-0.5", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                            {parentCap1.name}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0",
                          isSelected
                            ? (isDarkMode ? "bg-blue-900 text-blue-200" : "bg-blue-200 text-blue-800")
                            : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200/70 text-slate-500")
                        )}
                      >
                        {drugCount}
                      </span>
                    </button>
                  );
                })}

                {cap2GroupsFiltered.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Không có nhóm Cấp 2 phù hợp
                  </div>
                )}
              </div>
            </div>

            {/* MAIN CONTENT AREA: Cấp 3 & Danh sách thuốc biệt dược hoặc hoạt chất */}
            <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
              {/* Breadcrumb Info Bar */}
              <div className={cn(
                "flex items-center justify-between gap-3 flex-wrap p-3 rounded-2xl border",
                isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-100/70 border-slate-200/60"
              )}>
                <div className={cn("flex items-center gap-2 text-xs font-bold flex-wrap", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                  <span className="text-slate-400">Phân cấp đang xem:</span>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg border shadow-2xs",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-blue-400" : "bg-white border-slate-200 text-blue-600"
                  )}>
                    Cấp 1: {selectedCap1Id === "all" ? "Tất cả Cấp 1" : cap1Groups.find((g) => g.id === selectedCap1Id)?.name}
                  </span>
                  <ChevronRight size={14} className="text-slate-400" />
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg border shadow-2xs",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-indigo-400" : "bg-white border-slate-200 text-indigo-600"
                  )}>
                    Cấp 2: {selectedCap2Id === "all" ? "Tất cả Cấp 2" : activeClassificationGroups.find((g) => g.id === selectedCap2Id)?.name}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <span>Hiển thị:</span>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-white font-black", groupDisplayMode === "drugs" ? "bg-blue-600" : "bg-emerald-600")}>
                    {groupDisplayMode === "drugs" ? "💊 Biệt dược" : "🧪 Hoạt chất"}
                  </span>
                </div>
              </div>

              {/* Sections for Cấp 2 & Cấp 3 groups */}
              {displayedCap2Groups.length > 0 ? (
                displayedCap2Groups.map((g2) => {
                  let c3Groups = activeClassificationGroups
                    .filter((g3) => groupLevelResolvedMap[g3.id] === 2 && g3.parentId === g2.id)
                    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));

                  if (groupSearchTerm.trim()) {
                    const q = groupSearchTerm.toLowerCase();
                    c3Groups = c3Groups.filter(
                      (g3) => g3.name.toLowerCase().includes(q) || getDrugsForGroup(g3.id).length > 0
                    );
                  }

                  const allDrugsInG2 = getDrugsForGroup(g2.id);

                  const renderGroupBlock = (
                    blockKey: string,
                    groupName: string,
                    levelTag: string,
                    groupDrugs: Drug[],
                    groupIdForIngredients: string
                  ) => {
                    const groupIngredients = groupDisplayMode === "ingredients" ? getIngredientsForGroup(groupIdForIngredients) : [];

                    return (
                      <div
                        key={blockKey}
                        className={cn(
                          "rounded-2xl border overflow-hidden shadow-xs",
                          isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"
                        )}
                      >
                        {/* Header */}
                        <div
                          className={cn(
                            "p-3.5 px-4 border-b flex items-center justify-between gap-3",
                            isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "p-1.5 rounded-lg",
                                isDarkMode ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-500/10 text-indigo-600"
                              )}
                            >
                              <FolderOpen size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                                    levelTag === "Cấp 2"
                                      ? (isDarkMode ? "bg-blue-950 text-blue-300" : "bg-blue-100 text-blue-700")
                                      : (isDarkMode ? "bg-indigo-950 text-indigo-300" : "bg-indigo-100 text-indigo-700")
                                  )}
                                >
                                  {levelTag}
                                </span>
                                <h4 className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                                  {groupName}
                                </h4>
                              </div>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "text-xs font-bold px-2.5 py-1 rounded-full",
                              isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
                            )}
                          >
                            {groupDisplayMode === "drugs" ? `${groupDrugs.length} biệt dược` : `${groupIngredients.length} hoạt chất`}
                          </span>
                        </div>

                        {/* Content Table */}
                        <div className="p-3 lg:p-4">
                          {groupDisplayMode === "drugs" ? (
                            groupDrugs.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr
                                      className={cn(
                                        "border-b text-[10px] font-black uppercase tracking-wider text-slate-400",
                                        isDarkMode ? "border-slate-800" : "border-slate-200"
                                      )}
                                    >
                                      <th className="py-2.5 px-3">Tên biệt dược</th>
                                      <th className="py-2.5 px-3">Hoạt chất</th>
                                      <th className="py-2.5 px-3">Dạng bào chế</th>
                                      <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-bold">Đơn giá</th>
                                      <th className="py-2.5 px-3 text-center">Trạng thái kho</th>
                                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                                    </tr>
                                  </thead>
                                  <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800/60" : "divide-slate-100")}>
                                    {groupDrugs.map((drug) => (
                                      <tr
                                        key={drug.id}
                                        className={cn(
                                          "transition-colors group cursor-pointer",
                                          isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                                        )}
                                        onClick={() => handleShowDrugDetail(drug)}
                                      >
                                        <td
                                          className={cn(
                                            "py-2.5 px-3 font-bold group-hover:underline",
                                            isDarkMode ? "text-blue-400" : "text-blue-600"
                                          )}
                                        >
                                          💊 {drug.name}
                                        </td>
                                        <td className={cn("py-2.5 px-3 font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                          {drug.activeIngredients && drug.activeIngredients.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                              {drug.activeIngredients.map((ing, ingIdx) => (
                                                <span
                                                  key={ingIdx}
                                                  className={cn(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md border inline-block",
                                                    isDarkMode
                                                      ? "bg-slate-800/80 border-slate-700 text-slate-300"
                                                      : "bg-slate-100 border-slate-200 text-slate-700"
                                                  )}
                                                >
                                                  {ing.name}
                                                  {ing.amount ? ` ${ing.amount}${ing.unit || ""}` : ""}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (drug as any).activeIngredient ? (
                                            <span>{(drug as any).activeIngredient}</span>
                                          ) : (
                                            <span className="text-slate-400">—</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span
                                            className={cn(
                                              "px-2 py-0.5 rounded-md font-bold",
                                              isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                                            )}
                                          >
                                            {drug.dosageForm || "—"}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {getDrugPriceDisplay(drug) ? (
                                            <span
                                              className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-md font-black border inline-flex items-center gap-0.5 shadow-2xs",
                                                isDarkMode
                                                  ? "bg-amber-950/40 text-amber-300 border-amber-800/60"
                                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                              )}
                                            >
                                              <Coins size={9} className="text-amber-500 shrink-0" />
                                              {getDrugPriceDisplay(drug)}
                                            </span>
                                          ) : (
                                            <span className="text-[9px] text-slate-400 italic">Chưa có giá</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          <span
                                            className={cn(
                                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                              drug.stockStatus === "out"
                                                ? isDarkMode
                                                  ? "bg-rose-950/60 text-rose-400"
                                                  : "bg-rose-100 text-rose-600"
                                                : drug.stockStatus === "low"
                                                ? isDarkMode
                                                  ? "bg-amber-950/60 text-amber-400"
                                                  : "bg-amber-100 text-amber-600"
                                                : isDarkMode
                                                ? "bg-emerald-950/60 text-emerald-400"
                                                : "bg-emerald-100 text-emerald-600"
                                            )}
                                          >
                                            {drug.stockStatus === "out" ? "Hết hàng" : drug.stockStatus === "low" ? "Sắp hết" : "Còn hàng"}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleShowDrugDetail(drug);
                                            }}
                                            className={cn(
                                              "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors",
                                              isDarkMode
                                                ? "bg-blue-950/50 text-blue-400 hover:bg-blue-900/60"
                                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                            )}
                                          >
                                            Xem
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="py-6 text-center text-slate-400 text-xs">
                                Chưa có thuốc biệt dược nào trong nhóm này
                              </div>
                            )
                          ) : groupIngredients.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr
                                    className={cn(
                                      "border-b text-[10px] font-black uppercase tracking-wider text-slate-400",
                                      isDarkMode ? "border-slate-800" : "border-slate-200"
                                    )}
                                  >
                                    <th className="py-2.5 px-3">Tên Hoạt chất</th>
                                    <th className="py-2.5 px-3 text-center">Số biệt dược chứa</th>
                                    <th className="py-2.5 px-3">Biệt dược tiêu biểu</th>
                                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800/60" : "divide-slate-100")}>
                                  {groupIngredients.map((ing, idx) => (
                                    <tr key={idx} className={cn("transition-colors", isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                                      <td className={cn("py-2.5 px-3 font-bold", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                                        🧪 {ing.name}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold">
                                        <span
                                          className={cn(
                                            "px-2 py-0.5 rounded-full",
                                            isDarkMode ? "bg-emerald-950 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                                          )}
                                        >
                                          {ing.count} thuốc
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {ing.sampleDrugs.map((dName, dIdx) => (
                                            <span
                                              key={dIdx}
                                              className={cn(
                                                "px-2 py-0.5 rounded-md text-[11px] font-medium",
                                                isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                                              )}
                                            >
                                              {dName}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setGroupSearchTerm(ing.name);
                                          }}
                                          className={cn(
                                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors",
                                            isDarkMode
                                              ? "bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/60"
                                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                          )}
                                        >
                                          Lọc biệt dược
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="py-6 text-center text-slate-400 text-xs">
                              Chưa có thông tin hoạt chất trong nhóm này
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  };

                  if (c3Groups.length > 0) {
                    const c3Cards = c3Groups.map((g3) => {
                      const drugsInG3 = getDrugsForGroup(g3.id);
                      return renderGroupBlock(g3.id, g3.name, "Cấp 3", drugsInG3, g3.id);
                    });

                    const c3DrugIds = new Set<string>();
                    c3Groups.forEach((g3) => {
                      const set = groupDrugIdSets[g3.id];
                      if (set) set.forEach((id) => c3DrugIds.add(id));
                    });

                    const directDrugsInG2 = allDrugsInG2.filter(
                      (d) => !c3DrugIds.has(d.id)
                    );

                    if (directDrugsInG2.length > 0) {
                      c3Cards.push(
                        renderGroupBlock(
                          `${g2.id}_direct`,
                          `${g2.name} (Chưa phân Cấp 3 / Trực thuộc)`,
                          "Cấp 2",
                          directDrugsInG2,
                          g2.id
                        )
                      );
                    }

                    return (
                      <div key={g2.id} className="space-y-6">
                        {c3Cards}
                      </div>
                    );
                  } else {
                    return (
                      <div key={g2.id} className="space-y-6">
                        {renderGroupBlock(g2.id, g2.name, "Cấp 2", allDrugsInG2, g2.id)}
                      </div>
                    );
                  }
                })
              ) : (
                <div className={cn(
                  "p-8 text-center rounded-2xl border border-dashed",
                  isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-300 bg-slate-50/50"
                )}>
                  <FolderTree size={40} className="mx-auto text-slate-300 mb-3" />
                  <h4 className={cn("text-sm font-bold", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    Không tìm thấy nhóm thuốc phù hợp
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Thử chọn nhóm Cấp 1 hoặc Cấp 2 khác từ bộ lọc bên trái hoặc điều chỉnh từ khóa tìm kiếm.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (appActiveTab === "manage_directory" || propActiveTab === "manage_directory") && viewMode === "drugs" ? (
        <DrugExcelManagement
          drugs={drugs}
          drugGroups={drugGroups}
          availableIngredients={availableIngredients}
          isDarkMode={isDarkMode}
          canManage={canManage || userRole === "admin"}
          userRole={userRole}
          onAddDrug={() => handleOpenModal()}
          onEditDrug={(drug) => handleOpenModal(drug)}
          onViewDrugDetail={(drug) => {
            handleShowDrugDetail(drug);
          }}
          onToggleClosed={handleToggleClosed}
          onDeleteDrug={(id, name) => handleDelete(id, name)}
          onBatchDelete={handleBatchDelete}
          onBatchToggleClosed={handleBatchToggleClosed}
          onBatchImport={handleBatchImport}
        />
      ) : (
        <div
          className={cn(
            "w-full flex flex-col gap-6 transition-all duration-500 min-h-screen drug-list-container",
          )}
        >
          <AnimatePresence>
            {showStickySearch && viewMode === "drugs" && isManageDirectory && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={cn(
                  "p-2 rounded-2xl border shadow-xl transition-all relative flex items-center group mb-1",
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-slate-100 shadow-slate-200/50",
                )}
              >
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Tìm thuốc..."
                  className={cn(
                    "w-full pl-10 pr-10 py-2.5 bg-transparent border-none focus:ring-0 text-xs font-black",
                    isDarkMode ? "text-white" : "text-slate-900",
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-500/10 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn("w-full p-1", "flex flex-col gap-3")}>
            {favoriteOnlyFilter && viewMode === "drugs" && (
              <div
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-all text-xs font-bold shadow-xs",
                  isDarkMode
                    ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                    : "bg-amber-50 border-amber-200 text-amber-800",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Star size={15} className="fill-amber-400 text-amber-500 shrink-0" />
                  <span className="truncate">
                    Đang lọc: <strong>Thuốc yêu thích</strong> ({filteredDrugs.length} thuốc)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFavoriteOnlyFilter(false)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 active:scale-95",
                    isDarkMode
                      ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/60",
                  )}
                >
                  Xem tất cả thuốc
                </button>
              </div>
            )}

            {/* Banner lọc lâm sàng (Tuổi, Cân nặng, Mức lọc cầu thận) */}
            {(patientAgeMin > 0 || patientAgeMax < 100 || patientAge !== null || patientWeightMin > 0 || patientWeightMax < 120 || patientWeight !== null || patientCrclMin > 0 || patientCrclMax < 120 || patientEgfr !== null) && viewMode === "drugs" && (
              <div
                className={cn(
                  "w-full flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-all text-xs shadow-xs",
                  isDarkMode
                    ? "bg-sky-950/20 border-sky-800/60 text-slate-200"
                    : "bg-sky-50/70 border-sky-200 text-slate-800",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">
                    Lọc lâm sàng:
                  </span>
                  {(patientAgeMin > 0 || patientAgeMax < 100 || patientAge !== null) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 text-xs font-bold">
                      <span>
                        Tuổi:{" "}
                        <strong>
                          {patientAgeMin === patientAgeMax
                            ? `${patientAgeMin} tuổi`
                            : patientAgeMax >= 100
                            ? `≥ ${patientAgeMin} tuổi`
                            : patientAgeMin === 0
                            ? `≤ ${patientAgeMax} tuổi`
                            : `${patientAgeMin} - ${patientAgeMax} tuổi`}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientAgeMin(0);
                          setPatientAgeMax(100);
                          setPatientAge(null);
                          setAgePreset("all");
                        }}
                        className="text-sky-600 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded cursor-pointer"
                        title="Bỏ lọc tuổi"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {(patientWeightMin > 0 || patientWeightMax < 120 || patientWeight !== null) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold">
                      <span>
                        Cân nặng:{" "}
                        <strong>
                          {patientWeightMin === patientWeightMax
                            ? `${patientWeightMin} kg`
                            : patientWeightMax >= 120
                            ? `≥ ${patientWeightMin} kg`
                            : patientWeightMin === 0
                            ? `≤ ${patientWeightMax} kg`
                            : `${patientWeightMin} - ${patientWeightMax} kg`}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientWeightMin(0);
                          setPatientWeightMax(120);
                          setPatientWeight(null);
                          setWeightPreset("all");
                        }}
                        className="text-amber-600 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded cursor-pointer"
                        title="Bỏ lọc cân nặng"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {(patientCrclMin > 0 || patientCrclMax < 120 || patientEgfr !== null) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 text-xs font-bold">
                      <span>
                        Lọc cầu thận:{" "}
                        <strong>
                          {patientCrclMin === patientCrclMax
                            ? `${patientCrclMin} mL/p`
                            : patientCrclMax >= 120
                            ? `≥ ${patientCrclMin} mL/p`
                            : patientCrclMin === 0
                            ? `≤ ${patientCrclMax} mL/p`
                            : `${patientCrclMin} - ${patientCrclMax} mL/p`}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientCrclMin(0);
                          setPatientCrclMax(120);
                          setPatientEgfr(null);
                          setEgfrPreset("all");
                        }}
                        className="text-rose-600 hover:text-rose-700 dark:hover:text-white p-0.5 rounded cursor-pointer"
                        title="Bỏ lọc cầu thận"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPatientAgeMin(0);
                    setPatientAgeMax(100);
                    setPatientAge(null);
                    setAgePreset("all");
                    setPatientWeightMin(0);
                    setPatientWeightMax(120);
                    setPatientWeight(null);
                    setWeightPreset("all");
                    setPatientCrclMin(0);
                    setPatientCrclMax(120);
                    setPatientEgfr(null);
                    setEgfrPreset("all");
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 active:scale-95",
                    isDarkMode
                      ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
                      : "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300/60",
                  )}
                >
                  Xóa lọc lâm sàng
                </button>
              </div>
            )}
                        {totalPages > 1 && (
              <div
                className={cn(
                  "w-full hidden lg:flex items-center justify-between gap-1.5 sm:gap-3 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2.5 rounded-xl sm:rounded-2xl lg:rounded-3xl border shadow-xs sm:shadow-sm mb-1.5 sm:mb-2",
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-slate-100",
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                  <span
                    className={cn(
                      "hidden sm:inline text-[10px] font-black uppercase tracking-widest text-slate-400",
                    )}
                  >
                    ({filteredDrugs.length} thuốc)
                  </span>

                  <div className="flex items-center gap-1 sm:gap-1.5 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-2.5">
                    <span
                      className={cn(
                        "hidden sm:inline text-[9px] font-bold uppercase tracking-wider",
                        isDarkMode ? "text-slate-500" : "text-slate-400",
                      )}
                    >
                      Hiển thị:
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className={cn(
                        "text-[10px] sm:text-xs font-bold py-1 px-1.5 sm:px-2 rounded-lg border appearance-none cursor-pointer outline-none transition-all",
                        isDarkMode
                          ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 shadow-2xs",
                      )}
                      title="Số lượng thuốc trên mỗi trang"
                    >
                      {[10, 20, 30, 50, 100].map((val) => (
                        <option key={val} value={val}>
                          {val}/trang
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Navigation controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Trang đầu << */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={validPage === 1}
                    title="Trang đầu"
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Trang trước < */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={validPage === 1}
                    title="Trang trước"
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Điền/Hiển thị trang hiện tại */}
                  <div
                    className={cn(
                      "flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg lg:rounded-xl border text-[11px] sm:text-xs font-bold transition-colors",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300"
                        : "bg-slate-50 border-slate-200 text-slate-700",
                    )}
                  >
                    <span className={cn("hidden xs:inline text-[10px] sm:text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Trang
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => {
                        setPageInput(e.target.value);
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }}
                      onBlur={() => {
                        const val = parseInt(pageInput, 10);
                        if (isNaN(val) || val < 1 || val > totalPages) {
                          setPageInput(validPage.toString());
                        } else {
                          setCurrentPage(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseInt(pageInput, 10);
                          if (!isNaN(val) && val >= 1 && val <= totalPages) {
                            setCurrentPage(val);
                          } else {
                            setPageInput(validPage.toString());
                          }
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className={cn(
                        "w-8 sm:w-11 text-center py-0.5 px-0.5 rounded-md sm:rounded-lg font-black focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-blue-500/40 border transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px] sm:text-xs",
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900 shadow-2xs",
                      )}
                    />
                    <span className={cn("text-[10px] sm:text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      /{totalPages}
                    </span>
                  </div>

                  {/* Trang sau > */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={validPage === totalPages}
                    title="Trang sau"
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Trang cuối >> */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validPage === totalPages}
                    title="Trang cuối"
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}
            {paginatedDrugs.length > 0 && (
              <div
                className={cn(
                  "w-full hidden md:flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                  isDarkMode ? "text-slate-500" : "text-slate-400",
                )}
              >
                <div className="w-10 lg:w-12 shrink-0"></div>
                <div
                  className={cn(
                    "flex-1 min-w-0 grid grid-cols-12 gap-2 lg:gap-4 items-center",
                    canSeeActionsColumn && "pr-16 md:pr-0"
                  )}
                >
                  <div
                    className={cn(
                      "text-blue-500",
                      !canSeeStatusColumn && !canSeeActionsColumn
                        ? "col-span-6"
                        : !canSeeStatusColumn
                          ? "col-span-5"
                          : !canSeeActionsColumn
                            ? "col-span-4"
                            : "col-span-3",
                    )}
                  >
                    Tên thuốc & Hoạt chất
                  </div>
                  <div className="col-span-2 text-indigo-500">
                    Nhóm dược lý
                  </div>
                  <div className="col-span-2 text-emerald-500">
                    Dạng bào chế
                  </div>
                  <div className="col-span-2 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <Coins size={12} className="text-amber-500 shrink-0" />
                    <span>Đơn giá</span>
                  </div>
                  {canSeeStatusColumn && (
                    <div className="col-span-2 text-amber-500">Cảnh báo</div>
                  )}
                  {canSeeActionsColumn && (
                    <div className="col-span-1 text-right pr-2">Thao tác</div>
                  )}
                </div>
              </div>
            )}

            {selectedIngredient && (
              <div
                className={cn(
                  "p-3 rounded-2xl border flex items-center justify-between mb-2",
                  isDarkMode
                    ? "bg-blue-900/20 border-blue-800"
                    : "bg-blue-50 border-blue-100",
                )}
              >
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 truncate">
                    Hoạt chất: {selectedIngredient}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIngredient(null)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {paginatedDrugs.length > 0 ? (
              paginatedDrugs.map((drug) => (
                <div
                  key={drug.id}
                  className={cn(
                    "w-full p-3 lg:p-4 rounded-xl lg:rounded-2xl border transition-all duration-300 relative group flex items-start lg:items-center gap-3 lg:gap-4",
                    drug.isClosed &&
                      (isDarkMode
                        ? "opacity-60 bg-slate-900/50"
                        : "opacity-75 bg-slate-50/50"),
                    selectedDrug?.id === drug.id
                      ? cn(
                          "border-primary ring-4 ring-primary/10 z-20 shadow-lg shadow-primary/10",
                          isDarkMode ? "bg-slate-900" : "bg-white",
                        )
                      : cn(
                          "hover:border-primary/30 shadow-sm hover:shadow-md",
                          isDarkMode
                            ? "bg-slate-900 border-slate-800 hover:bg-slate-800/50"
                            : "bg-white border-slate-100 hover:shadow-slate-100",
                        ),
                  )}
                >
                  {selectedDrug?.id === drug.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[2px_0_8px_rgba(59,130,246,0.5)] rounded-l-xl lg:rounded-l-2xl"></div>
                  )}

                  <div className="flex flex-col items-center shrink-0 gap-1.5 w-12 sm:w-14 lg:w-12">
                    <div
                      className={cn(
                        "w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0 border shadow-sm relative overflow-hidden",
                        selectedDrug?.id === drug.id
                          ? "bg-primary border-primary/50 text-white shadow-primary/20"
                          : cn(
                              "text-slate-400 group-hover:text-primary",
                              isDarkMode
                                ? "bg-slate-800 border-slate-700 group-hover:bg-primary/10 group-hover:border-primary/30"
                                : "bg-slate-50 border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/10",
                              drug.isClosed &&
                                (isDarkMode
                                  ? "bg-slate-900 border-slate-800 text-slate-600"
                                  : "bg-slate-200 border-slate-300 text-slate-400"),
                            ),
                      )}
                    >
                      {drug.avatarUrl ? (
                        <img
                          src={drug.avatarUrl}
                          alt={drug.name}
                          loading="lazy"
                          className={cn(
                            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                            drug.isClosed && "grayscale opacity-50",
                          )}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Pill
                          size={20}
                          className={cn(
                            "lg:size-6 transition-transform duration-500 group-hover:rotate-12",
                            drug.isClosed && "opacity-40",
                          )}
                        />
                      )}
                      {drug.isClosed && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px]">
                          <EyeOff size={14} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Mobile price and status below image */}
                    <div className="flex md:hidden flex-col items-center gap-1 w-full text-center">
                      {getDrugPriceDisplay(drug) ? (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center text-[8px] font-black px-1 py-0.5 rounded-md border shadow-2xs w-full truncate",
                            isDarkMode
                              ? "bg-amber-950/40 text-amber-300 border-amber-800/60"
                              : "bg-amber-50 text-amber-800 border-amber-200/80",
                          )}
                        >
                          <span className="truncate">{getDrugPriceDisplay(drug)}</span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "text-[8px] font-medium italic opacity-70 px-0.5 py-0.5 text-center leading-tight",
                            isDarkMode ? "text-slate-500" : "text-slate-400",
                          )}
                        >
                          Chưa có giá
                        </span>
                      )}

                      {canSeeStatusColumn && (
                        <div className="flex flex-col items-center gap-0.5 w-full">
                          {!isGuestUser && drug.isNew && (
                            <span className="inline-flex items-center justify-center gap-0.5 text-[7px] px-1 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md font-black border border-emerald-500/20 uppercase tracking-wider w-full truncate">
                              <Sparkles size={7} className="text-emerald-500 shrink-0" />
                              <span>Mới</span>
                            </span>
                          )}

                          {!isGuestUser && drug.isUpdated && (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center text-[7px] px-1 py-0.5 rounded-md font-black border uppercase tracking-wider w-full truncate",
                                drug.isUpdated === 'updating'
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                              )}
                            >
                              <span>{drug.isUpdated === 'updating' ? "Đang sửa" : "Hoàn thành"}</span>
                            </span>
                          )}

                          {drug.isClosed && (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center gap-0.5 text-[7px] px-1 py-0.5 rounded-md font-black border uppercase tracking-wider w-full truncate",
                                isDarkMode
                                  ? "bg-slate-800 text-slate-500 border-slate-700"
                                  : "bg-slate-50 text-slate-400 border-slate-200",
                              )}
                            >
                              <EyeOff size={7} className="shrink-0" />
                              <span>Đang ẩn</span>
                            </span>
                          )}

                          {drug.status === "suspended" && (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center gap-0.5 text-[7px] px-1 py-0.5 rounded-md font-black border uppercase tracking-wider w-full truncate",
                                "bg-amber-950/30 text-amber-400 border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                !isDarkMode && "bg-amber-50 text-amber-600 border-amber-100",
                              )}
                            >
                              <AlertTriangle size={7} className="shrink-0" />
                              <span>Tạm ngưng</span>
                            </span>
                          )}

                          {drug.stockStatus && drug.stockStatus !== "available" && (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center gap-0.5 text-[7px] px-1 py-0.5 rounded-md font-black border uppercase tracking-wider w-full truncate",
                                drug.stockStatus === "out"
                                  ? isDarkMode
                                    ? "bg-rose-950/30 text-rose-400 border-rose-900/50"
                                    : "bg-rose-50 text-rose-600 border-rose-100"
                                  : isDarkMode
                                    ? "bg-amber-950/30 text-amber-400 border-amber-900/50"
                                    : "bg-amber-50 text-amber-600 border-amber-100",
                              )}
                            >
                              <Database size={7} className="shrink-0" />
                              <span>{drug.stockStatus === "out" ? "Hết hàng" : "Sắp hết"}</span>
                            </span>
                          )}

                          {drug.expiryStatus &&
                            drug.expiryStatus !== "valid" &&
                            drug.stockStatus !== "out" && (
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center gap-0.5 text-[7px] px-1 py-0.5 rounded-md font-black border uppercase tracking-wider w-full truncate",
                                  drug.expiryStatus === "expired"
                                    ? isDarkMode
                                      ? "bg-rose-950/30 text-rose-400 border-rose-900/50"
                                      : "bg-rose-50 text-rose-600 border-rose-100"
                                    : drug.expiryStatus === "expiring"
                                      ? isDarkMode
                                        ? "bg-amber-950/30 text-amber-400 border-amber-900/50"
                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                      : isDarkMode
                                        ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50"
                                        : "bg-emerald-50 text-emerald-600 border-emerald-100",
                                )}
                              >
                                <Calendar size={7} className="shrink-0" />
                                <span>
                                  {drug.expiryStatus === "expired"
                                    ? "Hết hạn"
                                    : drug.expiryStatus === "expiring"
                                      ? "Sắp hết hạn"
                                      : ""}
                                </span>
                              </span>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-4 items-start lg:items-center",
                      (canSeeActionsColumn || canManage) && "pr-16 md:pr-0",
                    )}
                  >
                    <div
                      className={cn(
                        "min-w-0",
                        !canSeeStatusColumn && !canSeeActionsColumn
                          ? "md:col-span-6"
                          : !canSeeStatusColumn
                            ? "md:col-span-5"
                            : !canSeeActionsColumn
                              ? "md:col-span-4"
                              : "md:col-span-3",
                      )}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 lg:mb-1.5">
                        <h3
                          className={cn(
                            "font-black text-xs lg:text-sm truncate",
                            isDarkMode
                              ? "text-white group-hover:text-primary"
                              : "text-slate-900 group-hover:text-primary",
                          )}
                        >
                          {drug.name}
                        </h3>
                        {drug.isRx && (
                          <span className="shrink-0 text-[7px] lg:text-[8px] px-1 lg:px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-md font-black border border-rose-500/20">
                            Rx
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(drug.activeIngredients || [])
                          .slice(0, 3)
                          .map((ing, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "text-[8px] lg:text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-colors",
                                isDarkMode
                                  ? "bg-slate-800/30 border-slate-700 text-slate-400"
                                  : "bg-slate-50 border-slate-100 text-slate-500",
                              )}
                            >
                              {ing.name} {ing.amount}
                              {ing.unit}
                            </span>
                          ))}
                        {(drug.activeIngredients || []).length > 3 && (
                          <span className="text-[8px] text-slate-400 font-bold">
                            ...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      {(() => {
                        const directGroupIds =
                          drug.groupIds && drug.groupIds.length > 0
                            ? drug.groupIds
                            : drug.groupId
                              ? [drug.groupId]
                              : [];
                        const matchedGroups = drugGroups.filter((g) =>
                          directGroupIds.includes(g.id),
                        );
                        const hasGroups =
                          matchedGroups.length > 0 || !!drug.pharmacologicalGroup;

                        if (!hasGroups && !drug.atcCode) {
                          return (
                            <span className="text-[9px] lg:text-[10px] text-slate-400 italic">
                              Chưa phân nhóm
                            </span>
                          );
                        }

                        return (
                          <div className="flex flex-row flex-wrap md:flex-col gap-1 items-start">
                            {drug.atcCode && (
                              <span
                                className={cn(
                                  "hidden md:flex items-center gap-1 text-[8px] lg:text-[9px] font-bold px-1.5 lg:px-2 py-0.5 rounded-md border truncate max-w-[100px] lg:max-w-full",
                                  isDarkMode
                                    ? "bg-slate-800/50 border-slate-700 text-slate-400"
                                    : "bg-slate-100 border-slate-200 text-slate-500",
                                )}
                              >
                                <Activity size={8} className="shrink-0" />
                                ATC: {drug.atcCode}
                              </span>
                            )}
                            {matchedGroups.map((g, idx) => {
                              const tooltipId = `grp-${drug.id}-${g.id || idx}`;
                              const isOpen = openTooltipId === tooltipId;
                              return (
                                <div
                                  key={g.id || idx}
                                  className="relative info-tooltip-container inline-flex items-center max-w-full"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenTooltipId(isOpen ? null : tooltipId);
                                    }}
                                    className={cn(
                                      "flex items-center gap-1 text-[8px] lg:text-[9px] font-bold px-1.5 lg:px-2 py-0.5 rounded-md border cursor-pointer transition-colors text-left leading-tight break-words",
                                      isDarkMode
                                        ? "bg-indigo-900/10 border-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30"
                                        : "bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100/80",
                                      isOpen && (isDarkMode ? "ring-1 ring-indigo-500 bg-indigo-900/30" : "ring-1 ring-indigo-400 bg-indigo-100")
                                    )}
                                  >
                                    <span className="w-1 h-1 rounded-full bg-current opacity-60 shrink-0"></span>
                                    <span className="line-clamp-2">{g.name}</span>
                                  </button>
                                  {isOpen && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 flex flex-col items-center z-50 w-max max-w-[280px]">
                                      <div
                                        className={cn(
                                          "px-2.5 py-1.5 rounded-lg text-[11px] font-medium leading-tight shadow-xl border whitespace-normal text-left",
                                          isDarkMode
                                            ? "bg-slate-800 text-indigo-300 border-slate-700"
                                            : "bg-slate-900 text-indigo-200 border-slate-800",
                                        )}
                                      >
                                        <span className="font-bold text-indigo-400 block text-[10px] uppercase tracking-wider mb-0.5">
                                          Nhóm dược lý:
                                        </span>
                                        {getGroupFullPath(g)}
                                      </div>
                                      <div
                                        className={cn(
                                          "w-2 h-2 rotate-45 -mt-1",
                                          isDarkMode ? "bg-slate-800" : "bg-slate-900",
                                        )}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {matchedGroups.length === 0 && drug.pharmacologicalGroup && (() => {
                              const tooltipId = `grp-${drug.id}-custom`;
                              const isOpen = openTooltipId === tooltipId;
                              return (
                                <div className="relative info-tooltip-container inline-flex items-center max-w-full">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenTooltipId(isOpen ? null : tooltipId);
                                    }}
                                    className={cn(
                                      "flex items-center gap-1 text-[8px] lg:text-[9px] font-bold px-1.5 lg:px-2 py-0.5 rounded-md border text-left leading-tight break-words cursor-pointer transition-colors",
                                      isDarkMode
                                        ? "bg-indigo-900/10 border-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30"
                                        : "bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100/80",
                                      isOpen && (isDarkMode ? "ring-1 ring-indigo-500 bg-indigo-900/30" : "ring-1 ring-indigo-400 bg-indigo-100")
                                    )}
                                  >
                                    <span className="w-1 h-1 rounded-full bg-current opacity-60 shrink-0"></span>
                                    <span className="line-clamp-2">{drug.pharmacologicalGroup}</span>
                                  </button>
                                  {isOpen && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 flex flex-col items-center z-50 w-max max-w-[280px]">
                                      <div
                                        className={cn(
                                          "px-2.5 py-1.5 rounded-lg text-[11px] font-medium leading-tight shadow-xl border whitespace-normal text-left",
                                          isDarkMode
                                            ? "bg-slate-800 text-indigo-300 border-slate-700"
                                            : "bg-slate-900 text-indigo-200 border-slate-800",
                                        )}
                                      >
                                        <span className="font-bold text-indigo-400 block text-[10px] uppercase tracking-wider mb-0.5">
                                          Nhóm dược lý:
                                        </span>
                                        {drug.pharmacologicalGroup}
                                      </div>
                                      <div
                                        className={cn(
                                          "w-2 h-2 rotate-45 -mt-1",
                                          isDarkMode ? "bg-slate-800" : "bg-slate-900",
                                        )}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex flex-row md:flex-col items-center md:items-start gap-1.5 md:gap-1 justify-start md:justify-center flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[8px] lg:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0",
                            isDarkMode
                              ? "bg-blue-900/20 text-blue-400"
                              : "bg-blue-50 text-blue-600",
                          )}
                        >
                          <Activity size={8} />
                          {drug.dosageForm || "N/A"}
                        </span>
                        {(drug.administrationRoute ||
                          drug.generalAdministration) && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {drug.administrationRoute && (
                              <span
                                className={cn(
                                  "text-[8px] lg:text-[9px] font-bold italic",
                                  isDarkMode
                                    ? "text-emerald-400/80"
                                    : "text-emerald-600/80",
                                )}
                              >
                                {drug.administrationRoute}
                              </span>
                            )}
                            {drug.generalAdministration && (() => {
                              const tooltipId = `admin-${drug.id}`;
                              const isOpen = openTooltipId === tooltipId;
                              return (
                                <div className="relative info-tooltip-container inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenTooltipId(isOpen ? null : tooltipId);
                                    }}
                                    className={cn(
                                      "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black leading-none border transition-all cursor-pointer shrink-0 shadow-2xs",
                                      isDarkMode
                                        ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                                        : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300",
                                      isOpen && (isDarkMode ? "ring-2 ring-blue-400 bg-slate-700" : "ring-2 ring-blue-500 bg-slate-300")
                                    )}
                                    title="Nhấn để xem cách dùng"
                                  >
                                    ?
                                  </button>
                                  {isOpen && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 flex flex-col items-center z-50 w-max max-w-[240px]">
                                      <div
                                        className={cn(
                                          "px-2.5 py-1.5 rounded-lg text-[11px] font-normal leading-tight shadow-xl border whitespace-normal text-left",
                                          isDarkMode
                                            ? "bg-slate-800 text-slate-200 border-slate-700"
                                            : "bg-slate-900 text-white border-slate-800",
                                        )}
                                      >
                                        <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">
                                          Cách dùng:
                                        </span>
                                        {drug.generalAdministration}
                                      </div>
                                      <div
                                        className={cn(
                                          "w-2 h-2 rotate-45 -mt-1",
                                          isDarkMode ? "bg-slate-800" : "bg-slate-900",
                                        )}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="hidden md:flex md:col-span-2 items-center">
                      {getDrugPriceDisplay(drug) ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] lg:text-xs font-black px-2 py-0.5 rounded-lg border shadow-2xs",
                            isDarkMode
                              ? "bg-amber-950/40 text-amber-300 border-amber-800/60"
                              : "bg-amber-50 text-amber-800 border-amber-200/80",
                          )}
                        >
                          <Coins size={11} className="text-amber-500 shrink-0" />
                          <span>{getDrugPriceDisplay(drug)}</span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "text-[8px] lg:text-[9px] font-medium italic opacity-70 px-1 py-0.5",
                            isDarkMode ? "text-slate-500" : "text-slate-400",
                          )}
                        >
                          Chưa có giá
                        </span>
                      )}
                    </div>

                    {canSeeStatusColumn && (
                      <div className="hidden md:block md:col-span-2">
                        <div className="flex flex-row md:flex-col gap-1 items-center md:items-start text-xs">
                          {!isGuestUser && drug.isNew && (
                            <span className="inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md font-black border border-emerald-500/20 uppercase tracking-wider">
                              <Sparkles size={8} className="text-emerald-500" />
                              Mới
                            </span>
                          )}

                          {!isGuestUser && drug.isUpdated && (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                              drug.isUpdated === 'updating'
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                            )}>
                              <Sparkles size={8} className={drug.isUpdated === 'updating' ? "text-amber-500" : "text-indigo-500"} />
                              {drug.isUpdated === 'updating' ? "Đang cập nhật" : "Đã cập nhật"}
                            </span>
                          )}

                          {drug.isClosed && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                                isDarkMode
                                  ? "bg-slate-800 text-slate-500 border-slate-700"
                                  : "bg-slate-50 text-slate-400 border-slate-200",
                              )}
                            >
                              <EyeOff size={8} />
                              Đang ẩn
                            </span>
                          )}

                          {drug.status === "suspended" && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                                "bg-amber-950/30 text-amber-400 border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                !isDarkMode &&
                                  "bg-amber-50 text-amber-600 border-amber-100",
                              )}
                            >
                              <AlertTriangle size={8} />
                              Tạm ngưng
                            </span>
                          )}

                          {drug.stockStatus &&
                            drug.stockStatus !== "available" && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                                  drug.stockStatus === "out"
                                    ? isDarkMode
                                      ? "bg-rose-950/30 text-rose-400 border-rose-900/50"
                                      : "bg-rose-50 text-rose-600 border-rose-100"
                                    : isDarkMode
                                      ? "bg-amber-950/30 text-amber-400 border-amber-900/50"
                                      : "bg-amber-50 text-amber-600 border-amber-100",
                                )}
                              >
                                <Database size={8} />
                                {drug.stockStatus === "out"
                                  ? "Hết hàng"
                                  : "Sắp hết"}
                              </span>
                            )}

                          {drug.expiryStatus &&
                            drug.expiryStatus !== "valid" &&
                            drug.stockStatus !== "out" && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-[7px] lg:text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider",
                                  drug.expiryStatus === "expired"
                                    ? isDarkMode
                                      ? "bg-rose-950/30 text-rose-400 border-rose-900/50"
                                      : "bg-rose-50 text-rose-600 border-rose-100"
                                    : drug.expiryStatus === "expiring"
                                      ? isDarkMode
                                        ? "bg-amber-950/30 text-amber-400 border-amber-900/50"
                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                      : isDarkMode
                                        ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50"
                                        : "bg-emerald-50 text-emerald-600 border-emerald-100",
                                )}
                              >
                                <Calendar size={8} />
                                {drug.expiryStatus === "expired"
                                  ? "Hết hạn"
                                  : drug.expiryStatus === "expiring"
                                    ? "Sắp hết hạn"
                                    : ""}
                                {drug.expiryDate
                                  ? ` (${drug.expiryDate.split("-").reverse().join("/")})`
                                  : ""}
                              </span>
                            )}
                        </div>
                      </div>
                    )}

                    {canSeeActionsColumn && (
                      <div className="hidden md:flex md:col-span-1 justify-end p-1">
                        <div className="grid grid-cols-2 gap-1 items-center justify-items-center w-fit ml-auto">
                          {/* 1. Xem chi tiết thuốc */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDrugDetail(drug);
                            }}
                            title="Xem chi tiết thuốc"
                            className={cn(
                              "w-7 h-7 rounded-lg transition-all hover:scale-105 flex items-center justify-center cursor-pointer active:scale-95 border shadow-2xs",
                              isDarkMode
                                ? "text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
                                : "text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200",
                            )}
                          >
                            <Eye size={13} />
                          </button>

                          {/* 2. Chỉnh sửa nhanh (khi quản lý) hoặc Đánh dấu yêu thích (khi tra cứu) */}
                          {isManageDirectory ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(drug);
                              }}
                              title="Chỉnh sửa thông tin thuốc"
                              className={cn(
                                "w-7 h-7 rounded-lg transition-all hover:scale-105 flex items-center justify-center cursor-pointer active:scale-95 border shadow-2xs",
                                isDarkMode
                                  ? "text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30"
                                  : "text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200",
                              )}
                            >
                              <Edit2 size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const targetId = String(drug.id || (drug as any).docId || "").trim();
                                toggleFavorite(targetId);
                              }}
                              title={
                                isFavorite(drug.id)
                                  ? "Bỏ yêu thích thuốc này"
                                  : "Đánh dấu thuốc yêu thích"
                              }
                              className={cn(
                                "w-7 h-7 rounded-lg transition-all hover:scale-105 flex items-center justify-center cursor-pointer active:scale-95 border shadow-2xs",
                                isFavorite(drug.id)
                                  ? isDarkMode
                                    ? "bg-amber-950/40 border-amber-500/40 text-amber-400"
                                    : "bg-amber-50 border-amber-300 text-amber-500 shadow-amber-500/10"
                                  : isDarkMode
                                    ? "text-slate-400 hover:text-amber-400 bg-slate-800/80 hover:bg-slate-800 border-slate-700/60"
                                    : "text-slate-400 hover:text-amber-500 bg-slate-50 hover:bg-slate-100 border-slate-200",
                              )}
                            >
                              <Star
                                size={13}
                                className={cn(
                                  "pointer-events-none transition-transform",
                                  isFavorite(drug.id)
                                    ? "fill-amber-400 text-amber-500 scale-110"
                                    : ""
                                )}
                              />
                            </button>
                          )}

                          {/* 3. Xem HDSD / PDF */}
                          {drug.pdfUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPdfViewer(drug);
                              }}
                              title="Xem file HDSD (PDF)"
                              className={cn(
                                "w-7 h-7 rounded-lg transition-all hover:scale-105 flex items-center justify-center cursor-pointer active:scale-95 border shadow-2xs",
                                isDarkMode
                                  ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30"
                                  : "text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
                              )}
                            >
                              <FileText size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Chưa có file HDSD (PDF)"
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center border opacity-25 cursor-not-allowed",
                                isDarkMode
                                  ? "border-slate-800 text-slate-600 bg-slate-900/30"
                                  : "border-slate-200 text-slate-300 bg-slate-50/50",
                              )}
                            >
                              <FileText size={13} />
                            </button>
                          )}

                          {/* 4. Menu Quản lý */}
                          {canManage ? (
                            <div className="relative action-menu-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(
                                    openActionMenuId === drug.id
                                      ? null
                                      : drug.id,
                                  );
                                }}
                                title="Tùy chọn quản lý"
                                className={cn(
                                  "w-7 h-7 rounded-lg transition-all hover:scale-105 flex items-center justify-center cursor-pointer active:scale-95 border shadow-2xs",
                                  isDarkMode
                                    ? "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60"
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200",
                                  openActionMenuId === drug.id &&
                                    "ring-2 ring-primary border-primary text-primary",
                                )}
                              >
                                <MoreVertical size={13} />
                              </button>

                              <AnimatePresence>
                                {openActionMenuId === drug.id && (
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      scale: 0.95,
                                      y: -10,
                                    }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className={cn(
                                      "absolute right-0 top-full mt-2 z-50 rounded-xl shadow-2xl border overflow-hidden min-w-[160px]",
                                      isDarkMode
                                        ? "bg-slate-900 border-slate-800"
                                        : "bg-white border-slate-100",
                                    )}
                                  >
                                    <div className="p-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleClosed(drug);
                                          setOpenActionMenuId(null);
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors rounded-lg",
                                          isDarkMode
                                            ? "hover:bg-slate-800 text-slate-300"
                                            : "hover:bg-slate-50 text-slate-600",
                                        )}
                                      >
                                        {drug.isClosed ? (
                                          <Eye
                                            size={14}
                                            className="text-emerald-500"
                                          />
                                        ) : (
                                          <EyeOff
                                            size={14}
                                            className="text-amber-500"
                                          />
                                        )}
                                        {drug.isClosed
                                          ? "Hiện thuốc"
                                          : "Ẩn thuốc"}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleSuspended(drug);
                                          setOpenActionMenuId(null);
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors rounded-lg",
                                          isDarkMode
                                            ? "hover:bg-slate-800 text-slate-300"
                                            : "hover:bg-slate-50 text-slate-600",
                                        )}
                                      >
                                        <Pause
                                          size={14}
                                          className={
                                            drug.status === "suspended"
                                              ? "text-emerald-500"
                                              : "text-amber-500"
                                          }
                                        />
                                        {drug.status === "suspended"
                                          ? "Kích hoạt"
                                          : "Tạm ngưng"}
                                      </button>
                                      {(userRole === "admin" || canManage) && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenModal(drug);
                                            setOpenActionMenuId(null);
                                          }}
                                          className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors rounded-lg",
                                            isDarkMode
                                              ? "hover:bg-slate-800 text-slate-300"
                                              : "hover:bg-slate-50 text-slate-600",
                                          )}
                                        >
                                          <Edit2
                                            size={14}
                                            className="text-blue-500"
                                          />
                                          Chỉnh sửa
                                        </button>
                                      )}
                                      <div
                                        className={cn(
                                          "h-px my-1",
                                          isDarkMode
                                            ? "bg-slate-800"
                                            : "bg-slate-100",
                                        )}
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(
                                            drug.id,
                                            drug.name,
                                            drug.pdfUrl,
                                          );
                                          setOpenActionMenuId(null);
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors rounded-lg",
                                          isDarkMode
                                            ? "hover:bg-rose-900/20 text-rose-400"
                                            : "hover:bg-rose-50 text-rose-500",
                                        )}
                                      >
                                        <Trash2 size={14} />
                                        Xóa thuốc
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Chỉ Quản trị viên / Dược sĩ có quyền quản lý"
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center border opacity-20 cursor-not-allowed",
                                isDarkMode
                                  ? "border-slate-800 text-slate-600 bg-slate-900/30"
                                  : "border-slate-200 text-slate-300 bg-slate-50/50",
                              )}
                            >
                              <MoreVertical size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {canSeeActionsColumn && (
                    <div className="absolute top-2.5 right-2.5 grid grid-cols-2 gap-1 md:hidden z-10">
                      {/* 1. Xem chi tiết thuốc */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowDrugDetail(drug);
                        }}
                        title="Xem chi tiết thuốc"
                        className={cn(
                          "w-6.5 h-6.5 rounded-lg transition-all hover:scale-105 flex items-center justify-center border shadow-2xs active:scale-95 cursor-pointer",
                          isDarkMode
                            ? "bg-blue-950/50 border-blue-500/40 text-blue-400"
                            : "bg-blue-50 border-blue-200 text-blue-600",
                        )}
                      >
                        <Eye size={12} />
                      </button>

                      {/* 2. Chỉnh sửa nhanh (khi quản lý) hoặc Đánh dấu yêu thích (khi tra cứu) */}
                      {isManageDirectory ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(drug);
                          }}
                          title="Chỉnh sửa thông tin thuốc"
                          className={cn(
                            "w-6.5 h-6.5 rounded-lg transition-all hover:scale-105 flex items-center justify-center border shadow-2xs active:scale-95 cursor-pointer",
                            isDarkMode
                              ? "bg-amber-950/50 border-amber-500/40 text-amber-400"
                              : "bg-amber-50 border-amber-200 text-amber-600",
                          )}
                        >
                          <Edit2 size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const targetId = String(drug.id || (drug as any).docId || "").trim();
                            toggleFavorite(targetId);
                          }}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                          }}
                          title={
                            isFavorite(drug.id)
                              ? "Bỏ yêu thích thuốc này"
                              : "Đánh dấu thuốc yêu thích"
                          }
                          className={cn(
                            "w-6.5 h-6.5 rounded-lg transition-all hover:scale-105 flex items-center justify-center border shadow-2xs cursor-pointer active:scale-90",
                            isFavorite(drug.id)
                              ? isDarkMode
                                ? "bg-amber-950/40 border-amber-500/40 text-amber-400"
                                : "bg-amber-50 border-amber-200 text-amber-500"
                              : isDarkMode
                                ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-400"
                                : "bg-white border-slate-100 text-slate-400 hover:text-amber-500",
                          )}
                        >
                          <Star
                            size={12}
                            className={cn(
                              "pointer-events-none transition-transform",
                              isFavorite(drug.id)
                                ? "fill-amber-400 text-amber-500 scale-110"
                                : ""
                            )}
                          />
                        </button>
                      )}

                      {/* 3. Xem HDSD / PDF */}
                      {drug.pdfUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPdfViewer(drug);
                          }}
                          title="Xem file PDF"
                          className={cn(
                            "w-6.5 h-6.5 rounded-lg transition-all hover:scale-105 flex items-center justify-center border shadow-2xs cursor-pointer active:scale-95",
                            isDarkMode
                              ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400"
                              : "bg-emerald-50 border-emerald-200 text-emerald-600",
                          )}
                        >
                          <FileText size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Không có file HDSD (PDF)"
                          className={cn(
                            "w-6.5 h-6.5 rounded-lg flex items-center justify-center border opacity-25 cursor-not-allowed",
                            isDarkMode
                              ? "bg-slate-900/40 border-slate-800 text-slate-600"
                              : "bg-slate-100 border-slate-200 text-slate-300",
                          )}
                        >
                          <FileText size={12} />
                        </button>
                      )}

                      {/* 4. Menu Quản lý */}
                      {canManage ? (
                        <div className="relative action-menu-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(
                                openActionMenuId === drug.id ? null : drug.id,
                              );
                            }}
                            title="Tùy chọn quản lý"
                            className={cn(
                              "w-6.5 h-6.5 rounded-lg transition-all flex items-center justify-center border shadow-2xs cursor-pointer active:scale-95",
                              isDarkMode
                                ? "bg-slate-800 border-slate-700 text-slate-300"
                                : "bg-white border-slate-100 text-slate-600",
                              openActionMenuId === drug.id &&
                                "ring-2 ring-primary border-primary text-primary",
                            )}
                          >
                            <MoreVertical size={12} />
                          </button>

                          <AnimatePresence>
                            {openActionMenuId === drug.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className={cn(
                                  "absolute right-0 top-full mt-2 z-50 rounded-xl shadow-2xl border overflow-hidden min-w-[140px]",
                                  isDarkMode
                                    ? "bg-slate-900 border-slate-800"
                                    : "bg-white border-slate-100",
                                )}
                              >
                                <div className="p-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleClosed(drug);
                                      setOpenActionMenuId(null);
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors rounded-lg",
                                      isDarkMode
                                        ? "hover:bg-slate-800 text-slate-300"
                                        : "hover:bg-slate-50 text-slate-600",
                                    )}
                                  >
                                    {drug.isClosed ? (
                                      <Eye
                                        size={14}
                                        className="text-emerald-500"
                                      />
                                    ) : (
                                      <EyeOff
                                        size={14}
                                        className="text-amber-500"
                                      />
                                    )}
                                    {drug.isClosed ? "Hiện thuốc" : "Ẩn thuốc"}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleSuspended(drug);
                                      setOpenActionMenuId(null);
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors rounded-lg",
                                      isDarkMode
                                        ? "hover:bg-slate-800 text-slate-300"
                                        : "hover:bg-slate-50 text-slate-600",
                                    )}
                                  >
                                    <Pause
                                      size={14}
                                      className={
                                        drug.status === "suspended"
                                          ? "text-emerald-500"
                                          : "text-amber-500"
                                      }
                                    />
                                    {drug.status === "suspended"
                                      ? "Kích hoạt"
                                      : "Tạm ngưng"}
                                  </button>
                                  {(userRole === "admin" || canManage) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenModal(drug);
                                        setOpenActionMenuId(null);
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors rounded-lg",
                                        isDarkMode
                                          ? "hover:bg-slate-800 text-slate-300"
                                          : "hover:bg-slate-50 text-slate-600",
                                      )}
                                    >
                                      <Edit2
                                        size={14}
                                        className="text-blue-500"
                                      />
                                      Chỉnh sửa
                                    </button>
                                  )}
                                  <div
                                    className={cn(
                                      "h-px my-1",
                                      isDarkMode
                                        ? "bg-slate-800"
                                        : "bg-slate-100",
                                    )}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(
                                        drug.id,
                                        drug.name,
                                        drug.pdfUrl,
                                      );
                                      setOpenActionMenuId(null);
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors rounded-lg text-rose-500",
                                      isDarkMode
                                        ? "hover:bg-rose-900/20"
                                        : "hover:bg-rose-50",
                                    )}
                                  >
                                    <Trash2 size={14} />
                                    Xóa thuốc
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Chỉ Quản trị viên / Dược sĩ có quyền quản lý"
                          className={cn(
                            "w-6.5 h-6.5 rounded-lg flex items-center justify-center border opacity-20 cursor-not-allowed",
                            isDarkMode
                              ? "bg-slate-900/40 border-slate-800 text-slate-600"
                              : "bg-slate-100 border-slate-200 text-slate-300",
                          )}
                        >
                          <MoreVertical size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div
                className={cn(
                  "w-full text-center py-16 sm:py-20 rounded-3xl border shadow-sm transition-colors",
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-slate-100",
                )}
              >
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                    favoriteOnlyFilter
                      ? isDarkMode ? "bg-amber-950/40 text-amber-400" : "bg-amber-50 text-amber-500"
                      : isDarkMode ? "bg-slate-800" : "bg-white",
                  )}
                >
                  {favoriteOnlyFilter ? (
                    <Star size={30} className="fill-amber-400 text-amber-500" />
                  ) : (
                    <Search
                      size={32}
                      className={isDarkMode ? "text-slate-600" : "text-slate-300"}
                    />
                  )}
                </div>
                <p
                  className={cn(
                    "font-bold text-base",
                    isDarkMode ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {favoriteOnlyFilter
                    ? "Không có thuốc nào trong danh sách yêu thích"
                    : "Không tìm thấy thuốc phù hợp"}
                </p>
                {favoriteOnlyFilter && (
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto px-4">
                    Nhấn vào biểu tượng ngôi sao ở mỗi thuốc để lưu vào danh sách yêu thích cá nhân của bạn.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setGroupFilter("Tất cả");
                    setSelectedIngredient(null);
                    setStockFilter("all");
                    setDosageFormFilter("all");
                    setStatusFilter("all");
                    setStatusFilters([]);
                    setGroupFilterSearch("");
                    setDosageFormFilterSearch("");
                    setFavoriteOnlyFilter(false);
                  }}
                  className={cn(
                    "mt-4 font-bold text-sm hover:underline cursor-pointer active:scale-95",
                    isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700",
                  )}
                >
                  {favoriteOnlyFilter ? "Xem tất cả thuốc" : "Xóa bộ lọc"}
                </button>
                {(canManage || userRole === "admin") && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenModal()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus size={14} /> Thêm thuốc mới
                    </button>
                  </div>
                )}
              </div>
            )}
                        {totalPages > 1 && (
              <div
                className={cn(
                  "w-full hidden lg:flex mt-4 items-center justify-between gap-1.5 sm:gap-3 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2.5 rounded-xl sm:rounded-2xl lg:rounded-3xl border shadow-xs sm:shadow-sm",
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-slate-100",
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                  <span
                    className={cn(
                      "hidden sm:inline text-[10px] font-black uppercase tracking-widest text-slate-400",
                    )}
                  >
                    ({filteredDrugs.length} thuốc)
                  </span>

                  <div className="flex items-center gap-1 sm:gap-1.5 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-2.5">
                    <span
                      className={cn(
                        "hidden sm:inline text-[9px] font-bold uppercase tracking-wider",
                        isDarkMode ? "text-slate-500" : "text-slate-400",
                      )}
                    >
                      Mỗi trang:
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className={cn(
                        "text-[10px] sm:text-xs font-bold py-1 px-1.5 sm:px-2 rounded-lg border appearance-none cursor-pointer outline-none transition-all",
                        isDarkMode
                          ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 shadow-2xs",
                      )}
                      title="Số lượng thuốc trên mỗi trang"
                    >
                      {[10, 20, 30, 50, 100].map((val) => (
                        <option key={val} value={val}>
                          {val}/trang
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Trang đầu << */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={validPage === 1}
                    title="Trang đầu"
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Trang trước < */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={validPage === 1}
                    title="Trang trước"
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Điền/Hiển thị trang hiện tại */}
                  <div
                    className={cn(
                      "flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg lg:rounded-xl border text-[11px] sm:text-xs font-bold transition-colors",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300"
                        : "bg-slate-50 border-slate-200 text-slate-700",
                    )}
                  >
                    <span className={cn("hidden xs:inline text-[10px] sm:text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Trang
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => {
                        setPageInput(e.target.value);
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }}
                      onBlur={() => {
                        const val = parseInt(pageInput, 10);
                        if (isNaN(val) || val < 1 || val > totalPages) {
                          setPageInput(validPage.toString());
                        } else {
                          setCurrentPage(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseInt(pageInput, 10);
                          if (!isNaN(val) && val >= 1 && val <= totalPages) {
                            setCurrentPage(val);
                          } else {
                            setPageInput(validPage.toString());
                          }
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className={cn(
                        "w-8 sm:w-11 text-center py-0.5 px-0.5 rounded-md sm:rounded-lg font-black focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-blue-500/40 border transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px] sm:text-xs",
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900 shadow-2xs",
                      )}
                    />
                    <span className={cn("text-[10px] sm:text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      /{totalPages}
                    </span>
                  </div>

                  {/* Trang sau > */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={validPage === totalPages}
                    title="Trang sau"
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Trang cuối >> */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validPage === totalPages}
                    title="Trang cuối"
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg lg:rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}
            {isMobile && totalPages > 1 && (
              <div className="h-16 lg:hidden shrink-0" aria-hidden="true" />
            )}
          </div>
        </div>
      )}
      </motion.div>
      </div>
      {typeof document !== "undefined" && isModalOpen
        ? createPortal(
            <AnimatePresence>
              {isModalOpen && (
                <div
                  className={cn(
                    "fixed inset-0 z-[200] flex flex-col transition-all",
                    "p-0",
                  )}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => !uploading && handleAttemptCloseModal()}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{
                      type: "spring",
                      damping: 30,
                      stiffness: 300,
                      mass: 0.8,
                    }}
                    className={cn(
                      "relative w-full h-full shadow-2xl flex flex-col transition-colors overflow-hidden rounded-none pt-[max(env(safe-area-inset-top),0px)]",
                      isDarkMode ? "bg-slate-900" : "bg-white",
                    )}
                  >
                    {/* Mobile Pull Down / Swipe Down Dismiss Handle */}
                    <motion.div
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={{ top: 0, bottom: 0.6 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.y > 60 || info.velocity.y > 300) {
                          handleAttemptCloseModal();
                        }
                      }}
                      className="sm:hidden w-full flex flex-col items-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing bg-inherit shrink-0 touch-none select-none"
                    >
                      <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    </motion.div>

                    <div
                      className={cn(
                        "px-3.5 py-2 sm:px-6 sm:py-3 border-b flex items-center justify-between transition-colors shrink-0",
                        isDarkMode
                          ? "border-slate-800 bg-slate-900"
                          : "border-slate-100 bg-white",
                      )}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <h3
                          className={cn(
                            "text-sm sm:text-base font-black tracking-tight transition-colors",
                            isDarkMode ? "text-white" : "text-black",
                          )}
                        >
                          {editingDrug ? "Chỉnh sửa thuốc" : "Thêm thuốc mới"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          type="submit"
                          form="drug-form"
                          disabled={uploading}
                          className={cn(
                            "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg sm:rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 text-xs sm:text-sm font-bold cursor-pointer",
                            uploading && "animate-pulse",
                          )}
                        >
                          {uploading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span className="hidden sm:inline text-xs sm:text-sm font-bold">
                                Đang cập nhật... {uploadProgress > 0 ? `(${uploadProgress}%)` : ""}
                              </span>
                            </>
                          ) : (
                            <>
                              <Save size={16} />
                              <span className="hidden sm:inline text-xs sm:text-sm font-bold">
                                {editingDrug ? "Cập nhật" : "Lưu thuốc"}
                              </span>
                            </>
                          )}
                        </button>
                        <button
                          id="close-drug-modal-btn"
                          type="button"
                          onPointerDownCapture={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAttemptCloseModal();
                          }}
                          title="Đóng"
                          className={cn(
                            "min-w-[42px] min-h-[42px] p-2 rounded-full transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            isDarkMode
                              ? "text-slate-400 hover:bg-rose-900/30 hover:text-rose-400"
                              : "text-slate-500 hover:bg-rose-50 hover:text-rose-600",
                          )}
                        >
                          <X size={20} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

              <div
                className={cn(
                  "flex border-b px-4 sm:px-8 overflow-x-auto scrollbar-hide transition-colors shrink-0",
                  isDarkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-100 bg-white",
                )}
              >
                {[
                  {
                    id: "company",
                    label: "T.Tin",
                    fullLabel: "Thông tin",
                    icon: <Briefcase size={18} />,
                  },
                  {
                    id: "general",
                    label: "Chung",
                    fullLabel: "Thông tin chung",
                    icon: <Pill size={18} />,
                  },
                  {
                    id: "dosage",
                    label: "Liều dùng",
                    fullLabel: "Chỉ định & Liều dùng",
                    icon: <Clock size={18} />,
                  },
                  {
                    id: "warnings",
                    label: "Cảnh báo",
                    fullLabel: "Thận trọng & Cảnh báo",
                    icon: <ShieldAlert size={18} />,
                  },
                  {
                    id: "side_effects_tab",
                    label: "ADR",
                    fullLabel: "Tác dụng phụ & Xử trí",
                    icon: <AlertCircle size={18} />,
                  },
                  {
                    id: "interactions",
                    label: "Tương tác",
                    fullLabel: "Tương tác & Tương kỵ",
                    icon: <Zap size={18} />,
                  },
                  {
                    id: "overdose",
                    label: "Quá liều",
                    fullLabel: "Quá liều & Xử trí",
                    icon: <AlertTriangle size={18} />,
                  },
                  {
                    id: "pharmacology",
                    label: "Dược lý",
                    fullLabel: "Dược lý",
                    icon: <Activity size={18} />,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 py-3 sm:py-4 px-3 sm:px-4 border-b-2 transition-all font-bold text-xs sm:text-[13px] whitespace-nowrap",
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : cn(
                            "border-transparent",
                            isDarkMode
                              ? "text-slate-500 hover:text-slate-300 hover:border-slate-700"
                              : "text-slate-400 hover:text-slate-600 hover:border-slate-200",
                          ),
                    )}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.fullLabel}</span>
                  </button>
                ))}
              </div>

              {(SUB_TABS[activeTab] || []).length > 0 && (
                <div
                  className={cn(
                    "flex gap-1.5 px-4 sm:px-8 py-2 border-b overflow-x-auto scrollbar-hide transition-colors shrink-0",
                    isDarkMode
                      ? "border-slate-800 bg-slate-900/90"
                      : "border-slate-200 bg-slate-50/80",
                  )}
                >
                  {(SUB_TABS[activeTab] || []).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveSubTab(sub.id)}
                      className={cn(
                        "py-1.5 px-3.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap",
                        activeSubTab === sub.id
                          ? isDarkMode
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                          : isDarkMode
                            ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60",
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}

              <form
                id="drug-form"
                onSubmit={handleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const target = e.target as HTMLElement;
                    if (target && target.tagName !== "TEXTAREA") {
                      e.preventDefault();
                    }
                  }
                }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <div
                  className={cn(
                    "flex-1 overflow-y-auto overscroll-contain p-3 sm:p-8 space-y-6 sm:space-y-8 pb-32 sm:pb-12 transition-colors custom-scrollbar touch-pan-y",
                    isDarkMode ? "bg-slate-900" : "bg-white",
                  )}
                  style={{
                    WebkitOverflowScrolling: "touch",
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                >

                  {activeTab === "general" && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === "info" && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Tên thuốc{" "}
                                <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                disabled={uploading}
                                value={formData.name || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    name: e.target.value,
                                  })
                                }
                                className={cn(
                                  "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode
                                    ? "bg-slate-800 border-slate-700 text-white"
                                    : "bg-slate-50 border-slate-200",
                                )}
                              />
                            </div>
                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Mã ATC
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  disabled={uploading}
                                  value={formData.atcCode || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      atcCode: e.target.value,
                                    })
                                  }
                                  className={cn(
                                    "flex-1 px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                    isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-white"
                                      : "bg-slate-50 border-slate-200",
                                  )}
                                  placeholder="Ví dụ: N02BE01"
                                />
                                <label
                                  className={cn(
                                    "flex items-center gap-2 cursor-pointer px-4 rounded-xl border shadow-sm transition-all whitespace-nowrap",
                                    formData.isRx
                                      ? "bg-rose-500 border-rose-400 text-white"
                                      : isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-slate-500"
                                        : "bg-white border-slate-200 text-slate-400",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.isRx || false}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        isRx: e.target.checked,
                                      })
                                    }
                                    className="hidden"
                                  />
                                  <AlertTriangle
                                    size={14}
                                    className={
                                      formData.isRx ? "animate-pulse" : ""
                                    }
                                  />
                                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">
                                    Rx
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* Đơn vị tính (ĐVT) */}
                            <div className="md:col-span-2">
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Đơn vị tính (ĐVT)
                              </label>
                              <div className="space-y-2">
                                <div className="relative max-w-md">
                                  <input
                                    type="text"
                                    disabled={uploading}
                                    value={formData.unit || ""}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        unit: e.target.value,
                                      })
                                    }
                                    className={cn(
                                      "w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 pr-8",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white"
                                        : "bg-slate-50 border-slate-200",
                                    )}
                                    placeholder="Nhập hoặc chọn đơn vị tính (ví dụ: Viên, Gói, Ống, Lọ...)"
                                  />
                                  {formData.unit && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFormData({
                                          ...formData,
                                          unit: "",
                                        })
                                      }
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                      title="Xóa đơn vị tính"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {[
                                    "Viên",
                                    "Gói",
                                    "Ống",
                                    "Lọ",
                                    "Chai",
                                    "Hộp",
                                    "Tuýp",
                                    "Vỉ",
                                    "Túi",
                                    "Bình",
                                    "Bút tiêm",
                                    "Miếng dán",
                                    "Bơm tiêm",
                                    "Hũ",
                                    "Liều",
                                  ].map((u) => {
                                    const isSelected =
                                      (formData.unit || "").trim().toLowerCase() ===
                                      u.toLowerCase();
                                    return (
                                      <button
                                        key={u}
                                        type="button"
                                        onClick={() =>
                                          setFormData({
                                            ...formData,
                                            unit: isSelected ? "" : u,
                                          })
                                        }
                                        className={cn(
                                          "text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none",
                                          isSelected
                                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                            : isDarkMode
                                              ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                                        )}
                                      >
                                        {u}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Bổ sung lựa chọn nhóm theo tương tác */}
                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Nhóm thuốc theo tương tác
                              </label>
                              {formData.interactionGroupIds &&
                                formData.interactionGroupIds.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {formData.interactionGroupIds.map((id) => {
                                      const group = drugGroups.find(
                                        (g) => g.id === id,
                                      );
                                      if (!group) return null;
                                      return (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          key={id}
                                          className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border",
                                            isDarkMode
                                              ? "bg-emerald-990/30 border-emerald-800 text-emerald-400"
                                              : "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm",
                                          )}
                                        >
                                          <span>{group.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFormData((prev) => {
                                                const nextIds = (
                                                  prev.interactionGroupIds || []
                                                ).filter((gid) => gid !== id);
                                                return {
                                                  ...prev,
                                                  interactionGroupIds: nextIds,
                                                };
                                              });
                                            }}
                                            className={cn(
                                              "p-0.5 rounded-full transition-colors",
                                              isDarkMode
                                                ? "hover:bg-emerald-800"
                                                : "hover:bg-emerald-100",
                                            )}
                                          >
                                            <X size={12} />
                                          </button>
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                )}

                              <div className="mb-2">
                                <div className="relative">
                                  <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    size={14}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Tìm kiếm nhóm tương tác..."
                                    value={formInteractionGroupSearch}
                                    onChange={(e) =>
                                      setFormInteractionGroupSearch(e.target.value)
                                    }
                                    className={cn(
                                      "w-full pl-9 pr-4 py-2 border rounded-xl text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                      isDarkMode
                                        ? "bg-slate-900 border-slate-700 text-white"
                                        : "bg-white border-slate-200",
                                    )}
                                  />
                                  {formInteractionGroupSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setFormInteractionGroupSearch("")}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "border rounded-xl p-3 sm:p-4 max-h-[220px] overflow-y-auto custom-scrollbar space-y-2",
                                  isDarkMode
                                    ? "bg-slate-800 border-slate-700"
                                    : "bg-slate-50 border-slate-200",
                                )}
                              >
                                {sortedDrugGroups
                                  .filter(
                                    (group) =>
                                      group.classification === "interaction" &&
                                      (!formInteractionGroupSearch ||
                                        (group.name || "")
                                          .toLowerCase()
                                          .includes(
                                            (formInteractionGroupSearch || "").toLowerCase(),
                                          )),
                                  )
                                  .map((group) => {
                                    const isSelected = Array.isArray(formData.interactionGroupIds) &&
                                      formData.interactionGroupIds.includes(group.id);
                                    return (
                                      <label
                                        key={group.id}
                                        className={cn(
                                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border",
                                          isSelected
                                            ? isDarkMode
                                              ? "bg-emerald-600/20 border-emerald-500/50 text-white"
                                              : "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold"
                                            : isDarkMode
                                              ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                                              : "bg-white border-slate-100 text-slate-600 hover:bg-slate-100",
                                        )}
                                        style={{
                                          marginLeft: `${(group.level || 0) * 20}px`,
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          className="sr-only"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            const targetGroupId = group.id;
                                            setFormData((prev) => {
                                              let currentIds = Array.isArray(
                                                prev.interactionGroupIds,
                                              )
                                                ? prev.interactionGroupIds
                                                : [];
                                              let nextIds = [...currentIds];
                                              if (checked) {
                                                if (
                                                  !nextIds.includes(
                                                    targetGroupId,
                                                  )
                                                )
                                                  nextIds.push(targetGroupId);
                                              } else {
                                                nextIds = nextIds.filter(
                                                  (id) => id !== targetGroupId,
                                                );
                                              }
                                              return {
                                                ...prev,
                                                interactionGroupIds: nextIds,
                                              };
                                            });
                                          }}
                                        />
                                        <div
                                          className={cn(
                                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                            isSelected
                                              ? "bg-emerald-600 border-emerald-600"
                                              : isDarkMode
                                                ? "bg-slate-800 border-slate-700"
                                                : "bg-white border-slate-200",
                                          )}
                                        >
                                          {isSelected && (
                                            <Check
                                              size={14}
                                              className="text-white"
                                              strokeWidth={4}
                                            />
                                          )}
                                        </div>
                                        <span className="text-xs">
                                          {group.name}
                                        </span>
                                      </label>
                                    );
                                  })}
                              </div>
                            </div>
                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Đường dùng
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  "Uống",
                                  "Tiêm bắp (IM)",
                                  "Tiêm tĩnh mạch (IV)",
                                  "Truyền tĩnh mạch",
                                  "Đặt dưới lưỡi",
                                  "Dùng ngoài",
                                  "Đặt âm đạo",
                                  "Đặt trực tràng",
                                  "Hít",
                                  "Xịt mũi",
                                  "Nhỏ mắt",
                                  "Nhỏ mũi",
                                ].map((route) => (
                                  <button
                                    key={route}
                                    type="button"
                                    onClick={() =>
                                      setFormData({
                                        ...formData,
                                        administrationRoute: route,
                                      })
                                    }
                                    className={cn(
                                      "text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all",
                                      formData.administrationRoute === route
                                        ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                        : isDarkMode
                                          ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                                    )}
                                  >
                                    {route}
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                      {activeSubTab === "composition" && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Thành phần hoạt chất{" "}
                                <span className="text-rose-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = [
                                    ...(formData.activeIngredients || []),
                                  ];
                                  newList.push({
                                    name: "",
                                    amount: "",
                                    unit: "",
                                    equivalent: "",
                                    equivalentAmount: "",
                                    equivalentUnit: "",
                                    groupIds: [],
                                    groupId: "",
                                  });
                                  setFormData({
                                    ...formData,
                                    activeIngredients: newList,
                                  });
                                }}
                                className={cn(
                                  "flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all",
                                  isDarkMode
                                    ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100",
                                )}
                              >
                                <Plus size={12} /> Thêm
                              </button>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              {(formData.activeIngredients || []).map(
                                (ingredient, index) => (
                                  <div
                                    key={index}
                                    className={cn(
                                      "flex gap-2 sm:gap-3 items-start p-3 sm:p-4 rounded-xl border transition-colors",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700"
                                        : "bg-slate-50 border-slate-100",
                                    )}
                                  >
                                    <div className="flex-1 flex flex-col gap-3">
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                        <div className="sm:col-span-1">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                          Hoạt chất
                                        </label>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            required
                                            placeholder="Tên hoạt chất..."
                                            value={ingredient.name || ""}
                                            onKeyDown={(e) =>
                                              handleActiveIngredientKeyDown(
                                                e,
                                                index,
                                              )
                                            }
                                            onBlur={() => {
                                              setTimeout(() => {
                                                if (
                                                  activeIngredientRowIndex ===
                                                  index
                                                ) {
                                                  setShowIngredientSuggestions(
                                                    false,
                                                  );
                                                  setActiveIngredientRowIndex(
                                                    null,
                                                  );
                                                }
                                              }, 200);
                                            }}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const newList = [
                                                ...(formData.activeIngredients ||
                                                  []),
                                              ];
                                              newList[index] = {
                                                ...newList[index],
                                                name: val,
                                              };
                                              setFormData({
                                                ...formData,
                                                activeIngredients: newList,
                                              });

                                              setActiveIngredientRowIndex(
                                                index,
                                              );
                                              const trimVal = val
                                                .trim()
                                                .toLowerCase();
                                              if (trimVal) {
                                                const suggestionsList: any[] =
                                                  [];
                                                const addedNames =
                                                  new Set<string>();

                                                availableIngredients.forEach(
                                                  (ai) => {
                                                    const nameMatch = ai.name
                                                      .toLowerCase()
                                                      .includes(trimVal);
                                                    const aliasMatch =
                                                      ai.alias &&
                                                      ai.alias
                                                        .toLowerCase()
                                                        .includes(trimVal);
                                                    const aliasesMatch =
                                                      ai.aliases &&
                                                      ai.aliases.some(
                                                        (a: string) =>
                                                          a
                                                            .toLowerCase()
                                                            .includes(trimVal),
                                                      );

                                                    if (
                                                      nameMatch ||
                                                      aliasMatch ||
                                                      aliasesMatch
                                                    ) {
                                                      const uniqueAliasesList =
                                                        Array.from(
                                                          new Set(
                                                            [
                                                              ai.alias,
                                                              ...(ai.aliases ||
                                                                []),
                                                            ]
                                                              .filter(Boolean)
                                                              .map((a) =>
                                                                a.trim(),
                                                              ),
                                                          ),
                                                        ).filter(
                                                          (a) =>
                                                            a.toLowerCase() !==
                                                            ai.name.toLowerCase(),
                                                        );

                                                      // 1. Add the main name only
                                                      if (
                                                        ai.name &&
                                                        !addedNames.has(
                                                          ai.name.toLowerCase(),
                                                        )
                                                      ) {
                                                        suggestionsList.push({
                                                          id: `${ai.id}-main-only`,
                                                          name: ai.name,
                                                          displayName: ai.name,
                                                          subText: "Hoạt chất chính",
                                                        });
                                                        addedNames.add(
                                                          ai.name.toLowerCase(),
                                                        );
                                                      }

                                                      // 2. Add each unique alias individually
                                                      uniqueAliasesList.forEach(
                                                        (alias, k) => {
                                                          const aliasLower = alias.toLowerCase();
                                                          if (!addedNames.has(aliasLower)) {
                                                            suggestionsList.push({
                                                              id: `${ai.id}-alias-only-${k}`,
                                                              name: alias,
                                                              displayName: alias,
                                                              subText: `Tên gọi khác của: ${ai.name}`,
                                                            });
                                                            addedNames.add(aliasLower);
                                                          }
                                                        }
                                                      );

                                                      // 3. Add the combined name (Tên chính & Tên gọi khác)
                                                      if (
                                                        ai.name &&
                                                        uniqueAliasesList.length > 0
                                                      ) {
                                                        const combinedName = `${ai.name} (${uniqueAliasesList.join(", ")})`;
                                                        const combinedLower = combinedName.toLowerCase();
                                                        if (!addedNames.has(combinedLower)) {
                                                          suggestionsList.push({
                                                            id: `${ai.id}-combined`,
                                                            name: combinedName,
                                                            displayName: combinedName,
                                                            subText: "Tên chính & Tên gọi khác",
                                                          });
                                                          addedNames.add(combinedLower);
                                                        }
                                                      }
                                                    }
                                                  },
                                                );

                                                setIngredientSuggestions(
                                                  suggestionsList.slice(0, 15),
                                                );
                                                setShowIngredientSuggestions(
                                                  suggestionsList.length > 0,
                                                );
                                                setFocusedIngredientIndex(-1);
                                              } else {
                                                setIngredientSuggestions([]);
                                                setShowIngredientSuggestions(
                                                  false,
                                                );
                                                setFocusedIngredientIndex(-1);
                                              }
                                            }}
                                            className={cn(
                                              "w-full px-3 py-2.5 sm:py-3 border rounded-lg text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                                              isDarkMode
                                                ? "bg-slate-900 border-slate-700 text-white"
                                                : "bg-white border-slate-200",
                                            )}
                                          />

                                          {showIngredientSuggestions &&
                                            activeIngredientRowIndex ===
                                              index &&
                                            ingredientSuggestions.length >
                                              0 && (
                                              <div
                                                className={cn(
                                                  "absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border shadow-xl backdrop-blur-md transition-all divide-y",
                                                  isDarkMode
                                                    ? "bg-slate-900/95 border-slate-700 divide-slate-800"
                                                    : "bg-white/95 border-slate-200 divide-slate-100",
                                                )}
                                              >
                                                {ingredientSuggestions.map(
                                                  (item, idx) => (
                                                    <div
                                                      key={item.id || idx}
                                                      onMouseDown={(e) => {
                                                        e.preventDefault(); // prevents blur from firing before selection
                                                        handleSelectActiveIngredient(
                                                          index,
                                                          item.name,
                                                        );
                                                      }}
                                                      className={cn(
                                                        "px-4 py-2 text-xs sm:text-[13px] cursor-pointer transition-colors flex flex-col gap-0.5 text-left",
                                                        idx ===
                                                          focusedIngredientIndex
                                                          ? isDarkMode
                                                            ? "bg-indigo-600/30 text-white font-black"
                                                            : "bg-indigo-50 text-indigo-900 font-black"
                                                          : isDarkMode
                                                            ? "hover:bg-slate-800 text-slate-300"
                                                            : "hover:bg-slate-50 text-slate-700",
                                                      )}
                                                    >
                                                      <span className="font-bold">
                                                        {item.displayName}
                                                      </span>
                                                      {item.subText && (
                                                        <span className="text-[10px] text-slate-400">
                                                          {item.subText}
                                                        </span>
                                                      )}
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 sm:contents">
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                            Hàm lượng
                                          </label>
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            required
                                            value={ingredient.amount}
                                            onChange={(e) => {
                                              const numericVal = e.target.value.replace(/[^0-9.,]/g, "");
                                              const newList = [
                                                ...(formData.activeIngredients ||
                                                  []),
                                              ];
                                              newList[index] = {
                                                ...newList[index],
                                                amount: numericVal,
                                              };
                                              setFormData({
                                                ...formData,
                                                activeIngredients: newList,
                                              });
                                            }}
                                            className={cn(
                                              "w-full px-3 py-2.5 sm:py-3 border rounded-lg text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono",
                                              isDarkMode
                                                ? "bg-slate-900 border-slate-700 text-white"
                                                : "bg-white border-slate-200",
                                            )}
                                            placeholder="500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                            Đơn vị
                                          </label>
                                          <input
                                            type="text"
                                            required
                                            value={ingredient.unit}
                                            onChange={(e) => {
                                              const newList = [
                                                ...(formData.activeIngredients ||
                                                  []),
                                              ];
                                              newList[index] = {
                                                ...newList[index],
                                                unit: e.target.value,
                                              };
                                              setFormData({
                                                ...formData,
                                                activeIngredients: newList,
                                              });
                                            }}
                                            className={cn(
                                              "w-full px-3 py-2.5 sm:py-3 border rounded-lg text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                              isDarkMode
                                                ? "bg-slate-900 border-slate-700 text-white"
                                                : "bg-white border-slate-200",
                                            )}
                                            placeholder="mg"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div className="grid grid-cols-1 gap-1">
                                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                          Tương đương (nếu có)
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Nhập chất tương đương..."
                                          value={ingredient.equivalent || ""}
                                          onChange={(e) => {
                                            const newList = [
                                              ...(formData.activeIngredients || []),
                                            ];
                                            newList[index] = {
                                              ...newList[index],
                                              equivalent: e.target.value,
                                            };
                                            setFormData({
                                              ...formData,
                                              activeIngredients: newList,
                                            });
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                                            isDarkMode
                                              ? "bg-slate-900 border-slate-700 text-white placeholder-slate-655 focus:border-blue-500"
                                              : "bg-white border-slate-200 placeholder-slate-400 focus:border-blue-500",
                                          )}
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 gap-1">
                                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                          Hàm lượng tương đương
                                        </label>
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="Ví dụ: 500"
                                          value={ingredient.equivalentAmount || ""}
                                          onChange={(e) => {
                                            const numericVal = e.target.value.replace(/[^0-9.,]/g, "");
                                            const newList = [
                                              ...(formData.activeIngredients || []),
                                            ];
                                            newList[index] = {
                                              ...newList[index],
                                              equivalentAmount: numericVal,
                                            };
                                            setFormData({
                                              ...formData,
                                              activeIngredients: newList,
                                            });
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                                            isDarkMode
                                              ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-blue-500"
                                              : "bg-white border-slate-200 placeholder-slate-400 focus:border-blue-500",
                                          )}
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 gap-1">
                                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                          Đơn vị tương đương
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Ví dụ: mg"
                                          value={ingredient.equivalentUnit || ""}
                                          onChange={(e) => {
                                            const newList = [
                                              ...(formData.activeIngredients || []),
                                            ];
                                            newList[index] = {
                                              ...newList[index],
                                              equivalentUnit: e.target.value,
                                            };
                                            setFormData({
                                              ...formData,
                                              activeIngredients: newList,
                                            });
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                                            isDarkMode
                                              ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-blue-500"
                                              : "bg-white border-slate-200 placeholder-slate-400 focus:border-blue-500",
                                          )}
                                        />
                                      </div>
                                    </div>

                                    {/* Nhóm thuốc theo điều trị của hoạt chất này */}
                                    {(() => {
                                      const ingGroupIds = Array.isArray(ingredient.groupIds)
                                        ? ingredient.groupIds
                                        : ingredient.groupId
                                          ? [ingredient.groupId]
                                          : [];
                                      return (
                                        <div className="mt-1 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700/60 flex flex-col gap-2">
                                          <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                              <FolderTree size={13} className="text-blue-500" />
                                              <span>Nhóm thuốc theo điều trị</span>
                                            </label>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                                              {ingGroupIds.length > 0
                                                ? `${ingGroupIds.length} nhóm đã chọn`
                                                : "Chưa chọn nhóm"}
                                            </span>
                                          </div>

                                          {/* Badges danh sách nhóm đã chọn */}
                                          {ingGroupIds.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                              {ingGroupIds.map((gid) => {
                                                const group = drugGroups.find((g) => g.id === gid);
                                                if (!group) return null;
                                                return (
                                                  <span
                                                    key={gid}
                                                    className={cn(
                                                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                                                      isDarkMode
                                                        ? "bg-blue-900/30 border-blue-800 text-blue-300"
                                                        : "bg-blue-50 border-blue-200 text-blue-700 shadow-sm",
                                                    )}
                                                  >
                                                    <span>{getGroupFullPath(group)}</span>
                                                    <button
                                                      type="button"
                                                      onClick={() => removeGroupFromIngredient(index, gid)}
                                                      className={cn(
                                                        "p-0.5 rounded-full transition-colors",
                                                        isDarkMode ? "hover:bg-blue-800" : "hover:bg-blue-200",
                                                      )}
                                                      title="Xóa nhóm này"
                                                    >
                                                      <X size={12} />
                                                    </button>
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {/* Tìm kiếm và danh sách nhóm phân cấp */}
                                          <div className="space-y-1.5">
                                            <div className="relative">
                                              <Search
                                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={13}
                                              />
                                              <input
                                                type="text"
                                                placeholder="Tìm kiếm nhóm điều trị cho hoạt chất..."
                                                value={ingGroupSearches[index] || ""}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setIngGroupSearches((prev) => ({
                                                    ...prev,
                                                    [index]: val,
                                                  }));
                                                }}
                                                className={cn(
                                                  "w-full pl-8 pr-8 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                                                  isDarkMode
                                                    ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                                                    : "bg-white border-slate-200 placeholder-slate-400",
                                                )}
                                              />
                                              {ingGroupSearches[index] && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setIngGroupSearches((prev) => ({
                                                      ...prev,
                                                      [index]: "",
                                                    }))
                                                  }
                                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                  <X size={12} />
                                                </button>
                                              )}
                                            </div>

                                            <div
                                              className={cn(
                                                "border rounded-lg p-2 max-h-[160px] overflow-y-auto custom-scrollbar space-y-1",
                                                isDarkMode
                                                  ? "bg-slate-900/60 border-slate-700"
                                                  : "bg-white border-slate-200",
                                              )}
                                            >
                                              {sortedDrugGroups
                                                .filter(
                                                  (group) =>
                                                    (group.classification || "treatment") === "treatment" &&
                                                    (!ingGroupSearches[index] ||
                                                      (group.name || "")
                                                        .toLowerCase()
                                                        .includes(
                                                          (ingGroupSearches[index] || "").toLowerCase(),
                                                        )),
                                                )
                                                .map((group) => {
                                                  const isSelected = ingGroupIds.includes(group.id);
                                                  return (
                                                    <label
                                                      key={group.id}
                                                      className={cn(
                                                        "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-all border text-xs",
                                                        isSelected
                                                          ? isDarkMode
                                                            ? "bg-blue-600/20 border-blue-500/50 text-white font-bold"
                                                            : "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                                                          : isDarkMode
                                                            ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                                                            : "bg-white border-slate-100 text-slate-600 hover:bg-slate-100",
                                                      )}
                                                      style={{
                                                        marginLeft: `${(group.level || 0) * 14}px`,
                                                      }}
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={isSelected}
                                                        onChange={() => toggleGroupForIngredient(index, group.id)}
                                                      />
                                                      <div
                                                        className={cn(
                                                          "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                                                          isSelected
                                                            ? "bg-blue-600 border-blue-600"
                                                            : isDarkMode
                                                              ? "bg-slate-800 border-slate-700"
                                                              : "bg-white border-slate-200",
                                                        )}
                                                      >
                                                        {isSelected && (
                                                          <Check
                                                            size={11}
                                                            className="text-white"
                                                            strokeWidth={4}
                                                          />
                                                        )}
                                                      </div>
                                                      <span className="truncate">{group.name}</span>
                                                    </label>
                                                  );
                                                })}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="flex flex-col gap-1 p-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          moveArrayItem(
                                            "activeIngredients",
                                            index,
                                            "up",
                                          )
                                        }
                                        disabled={index === 0}
                                        className={cn(
                                          "p-1 rounded-md transition-all",
                                          index === 0
                                            ? "opacity-30 cursor-not-allowed"
                                            : isDarkMode
                                              ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400"
                                              : "hover:bg-slate-200 text-slate-400 hover:text-blue-600",
                                        )}
                                      >
                                        <ChevronUp size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          moveArrayItem(
                                            "activeIngredients",
                                            index,
                                            "down",
                                          )
                                        }
                                        disabled={
                                          index ===
                                          (formData.activeIngredients || [])
                                            .length -
                                            1
                                        }
                                        className={cn(
                                          "p-1 rounded-md transition-all",
                                          index ===
                                            (formData.activeIngredients || [])
                                              .length -
                                              1
                                            ? "opacity-30 cursor-not-allowed"
                                            : isDarkMode
                                              ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400"
                                              : "hover:bg-slate-200 text-slate-400 hover:text-blue-600",
                                        )}
                                      >
                                        <ChevronDown size={14} />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newList = (
                                          formData.activeIngredients || []
                                        ).filter((_, i) => i !== index);
                                        const allGroupIds = Array.from(
                                          new Set(
                                            newList.flatMap((ai: any) =>
                                              Array.isArray(ai.groupIds)
                                                ? ai.groupIds
                                                : ai.groupId
                                                  ? [ai.groupId]
                                                  : [],
                                            ),
                                          ),
                                        );
                                        setFormData({
                                          ...formData,
                                          activeIngredients: newList,
                                          groupIds: allGroupIds,
                                          groupId: allGroupIds[0] || "",
                                        });
                                      }}
                                      className={cn(
                                        "p-1.5 sm:p-2 mt-4 sm:mt-5 transition-colors rounded-lg",
                                        isDarkMode
                                          ? "text-rose-400 hover:bg-rose-900/20"
                                          : "text-rose-500 hover:bg-rose-50",
                                      )}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                          <div className="space-y-3 sm:space-y-4 relative">
                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest transition-colors mb-1.5",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Tá dược{" "}
                                <span className="text-slate-400 font-normal">
                                  (Excipients - các tá dược cách nhau bằng dấu
                                  phẩy ",")
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  ref={excipientInputRef}
                                  placeholder="Ví dụ: Lactose, Tinh bột sắn, Magnesi stearat..."
                                  disabled={uploading}
                                  value={formData.excipients || ""}
                                  onKeyDown={handleExcipientKeyDown}
                                  onBlur={() => {
                                    // Delay to let click on suggestions complete first
                                    setTimeout(() => {
                                      setShowExcipientSuggestions(false);
                                    }, 200);
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({
                                      ...formData,
                                      excipients: val,
                                    });

                                    const segments = val.split(",");
                                    const currentSegment =
                                      segments[segments.length - 1] || "";
                                    const trimSegment = currentSegment
                                      .trim()
                                      .toLowerCase();

                                    if (trimSegment) {
                                      const suggestionsList: any[] = [];
                                      const addedNames = new Set<string>();

                                      availableExcipients.forEach((ae) => {
                                        const gradesList = Array.from(
                                          new Set([
                                            ...(ae.grades || []),
                                            ...(ae.grade ? [ae.grade] : []),
                                          ]),
                                        ).filter(Boolean) as string[];

                                        const nameMatch = ae.name
                                          .toLowerCase()
                                          .includes(trimSegment);
                                        const aliasMatch =
                                          ae.alias &&
                                          ae.alias
                                            .toLowerCase()
                                            .includes(trimSegment);
                                        const aliasesMatch =
                                          ae.aliases &&
                                          ae.aliases.some((a: string) =>
                                            a
                                              .toLowerCase()
                                              .includes(trimSegment),
                                          );
                                        const gradeMatch = gradesList.some(
                                          (g) =>
                                            g
                                              .toLowerCase()
                                              .includes(trimSegment),
                                        );
                                        const combinedMatch = gradesList.some(
                                          (g) =>
                                            `${ae.name} ${g}`
                                              .toLowerCase()
                                              .includes(trimSegment),
                                        );

                                        if (
                                          nameMatch ||
                                          aliasMatch ||
                                          aliasesMatch ||
                                          gradeMatch ||
                                          combinedMatch
                                        ) {
                                          const uniqueAliasesList = Array.from(
                                            new Set(
                                              [ae.alias, ...(ae.aliases || [])]
                                                .filter(Boolean)
                                                .map((a) => a.trim()),
                                            ),
                                          ).filter(
                                            (a) =>
                                              a.toLowerCase() !==
                                              ae.name.toLowerCase(),
                                          );

                                          // Add the main name
                                          if (
                                            ae.name &&
                                            !addedNames.has(
                                              ae.name.toLowerCase(),
                                            )
                                          ) {
                                            suggestionsList.push({
                                              id: `${ae.id}-main`,
                                              name: ae.name,
                                              displayName: ae.name,
                                              subText:
                                                uniqueAliasesList.length > 0
                                                  ? `Tên chính (Khác: ${uniqueAliasesList.join(", ")})`
                                                  : "Tá dược",
                                            });
                                            addedNames.add(
                                              ae.name.toLowerCase(),
                                            );
                                          }

                                          // Add suggestions for each grade
                                          gradesList.forEach((g) => {
                                            const combinedName = `${ae.name} ${g}`;
                                            if (
                                              !addedNames.has(
                                                combinedName.toLowerCase(),
                                              )
                                            ) {
                                              suggestionsList.push({
                                                id: `${ae.id}-grade-${g}`,
                                                name: combinedName,
                                                displayName: combinedName,
                                                subText: `Tá dược (Grade: ${g})`,
                                              });
                                              addedNames.add(
                                                combinedName.toLowerCase(),
                                              );
                                            }
                                          });

                                          // Add the single alias if not identical to main name
                                          if (
                                            ae.alias &&
                                            ae.alias.toLowerCase() !==
                                              ae.name.toLowerCase() &&
                                            !addedNames.has(
                                              ae.alias.toLowerCase(),
                                            )
                                          ) {
                                            suggestionsList.push({
                                              id: `${ae.id}-alias`,
                                              name: ae.alias,
                                              displayName: ae.alias,
                                              subText: `Tên gọi khác của: ${ae.name}`,
                                            });
                                            addedNames.add(
                                              ae.alias.toLowerCase(),
                                            );
                                          }

                                          // Add aliases with grades if relevant
                                          uniqueAliasesList.forEach((alias) => {
                                            gradesList.forEach((g) => {
                                              const combinedAlias = `${alias} ${g}`;
                                              if (
                                                !addedNames.has(
                                                  combinedAlias.toLowerCase(),
                                                )
                                              ) {
                                                suggestionsList.push({
                                                  id: `${ae.id}-alias-grade-${alias}-${g}`,
                                                  name: combinedAlias,
                                                  displayName: combinedAlias,
                                                  subText: `Tên gọi khác (Grade: ${g})`,
                                                });
                                                addedNames.add(
                                                  combinedAlias.toLowerCase(),
                                                );
                                              }
                                            });
                                          });

                                          // Add multi aliases if not identical to main name
                                          if (
                                            ae.aliases &&
                                            ae.aliases.length > 0
                                          ) {
                                            ae.aliases.forEach(
                                              (a: string, k: number) => {
                                                if (
                                                  a &&
                                                  a.toLowerCase() !==
                                                    ae.name.toLowerCase() &&
                                                  !addedNames.has(
                                                    a.toLowerCase(),
                                                  )
                                                ) {
                                                  suggestionsList.push({
                                                    id: `${ae.id}-alias-${k}`,
                                                    name: a,
                                                    displayName: a,
                                                    subText: `Tên gọi khác của: ${ae.name}`,
                                                  });
                                                  addedNames.add(
                                                    a.toLowerCase(),
                                                  );
                                                }
                                              },
                                            );
                                          }
                                        }
                                      });

                                      setExcipientSuggestions(
                                        suggestionsList.slice(0, 15),
                                      );
                                      setShowExcipientSuggestions(
                                        suggestionsList.length > 0,
                                      );
                                      setFocusedExcipientIndex(-1);
                                    } else {
                                      setExcipientSuggestions([]);
                                      setShowExcipientSuggestions(false);
                                      setFocusedExcipientIndex(-1);
                                    }
                                  }}
                                  className={cn(
                                    "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 font-medium",
                                    isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-white"
                                      : "bg-white border-slate-200",
                                  )}
                                />

                                {showExcipientSuggestions &&
                                  excipientSuggestions.length > 0 && (
                                    <div
                                      className={cn(
                                        "absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border shadow-xl backdrop-blur-md transition-all divide-y",
                                        isDarkMode
                                          ? "bg-slate-900/95 border-slate-700 divide-slate-800"
                                          : "bg-white/95 border-slate-200 divide-slate-100",
                                      )}
                                    >
                                      {excipientSuggestions.map(
                                        (item, index) => (
                                          <div
                                            key={item.id || index}
                                            onMouseDown={(e) => {
                                              e.preventDefault(); // prevents blur from firing before selection
                                              handleSelectExcipient(item.name);
                                            }}
                                            className={cn(
                                              "px-4 py-2.5 text-xs sm:text-[13px] cursor-pointer transition-colors flex flex-col gap-0.5",
                                              index === focusedExcipientIndex
                                                ? isDarkMode
                                                  ? "bg-indigo-600/30 text-white font-black"
                                                  : "bg-indigo-50 text-indigo-900 font-black"
                                                : isDarkMode
                                                  ? "hover:bg-slate-800 text-slate-300"
                                                  : "hover:bg-slate-50 text-slate-700",
                                            )}
                                          >
                                            <span className="font-bold">
                                              {item.displayName}
                                            </span>
                                            {item.subText && (
                                              <span className="text-[10px] text-slate-400">
                                                {item.subText}
                                              </span>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Dạng bào chế
                              </label>
                              <input
                                type="text"
                                placeholder="Viên nén, siro,..."
                                disabled={uploading}
                                value={formData.dosageForm || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    dosageForm: e.target.value,
                                  })
                                }
                                className={cn(
                                  "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode
                                    ? "bg-slate-800 border-slate-700 text-white"
                                    : "bg-white border-slate-200",
                                )}
                              />
                            </div>
                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Khối lượng viên thuốc{" "}
                                <span className="text-slate-400 font-normal">
                                  (nếu có)
                                </span>
                              </label>
                              <input
                                type="text"
                                placeholder="Ví dụ: 650mg, 1.2g..."
                                disabled={uploading}
                                value={formData.tabletWeight || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    tabletWeight: e.target.value,
                                  })
                                }
                                className={cn(
                                  "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode
                                    ? "bg-slate-800 border-slate-700 text-white"
                                    : "bg-white border-slate-200",
                                )}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label
                              className={cn(
                                "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest transition-colors",
                                isDarkMode
                                  ? "text-slate-400"
                                  : "text-slate-500",
                              )}
                            >
                              Dạng bào chế chi tiết
                            </label>
                            <input
                              type="text"
                              placeholder="Ví dụ: Viên nén tròn, màu vàng nhạt, một mặt dập vạch, một mặt dập logo..."
                              disabled={uploading}
                              value={formData.detailedDosageForm || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  detailedDosageForm: e.target.value,
                                })
                              }
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode
                                  ? "bg-slate-800 border-slate-700 text-white"
                                  : "bg-white border-slate-200",
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "company" && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === "info" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                          <div className="relative group/manufacturer">
                            <div className="flex items-center justify-between mb-1.5">
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Nhà sản xuất
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsCompanyModalOpen(true)}
                                className="text-[9px] font-bold text-blue-500 hover:underline"
                              >
                                Quản lý
                              </button>
                            </div>
                            <input
                              type="text"
                              disabled={uploading}
                              list="company-list"
                              value={formData.manufacturer || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  manufacturer: e.target.value,
                                })
                              }
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode
                                  ? "bg-slate-800 border-slate-700 text-white"
                                  : "bg-slate-50 border-slate-200",
                              )}
                              placeholder="Chọn hoặc nhập tên công ty..."
                            />
                            <datalist id="company-list">
                              {availableCompanies.map((company) => (
                                <option key={company.id} value={company.name} />
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label
                              className={cn(
                                "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                isDarkMode
                                  ? "text-slate-400"
                                  : "text-slate-500",
                              )}
                            >
                              Số đăng ký (SĐK)
                            </label>
                            <input
                              type="text"
                              disabled={uploading}
                              value={formData.registrationNumber || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  registrationNumber: e.target.value,
                                })
                              }
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode
                                  ? "bg-slate-800 border-slate-700 text-white"
                                  : "bg-slate-50 border-slate-200",
                              )}
                              placeholder="Ví dụ: VD-12345-20"
                            />
                          </div>

                          <div className="md:col-span-2 border border-dashed rounded-2xl p-4 sm:p-5 space-y-4">
                            <label
                              className={cn(
                                "block text-xs sm:text-[13px] font-black uppercase tracking-widest transition-colors",
                                isDarkMode
                                  ? "text-slate-300"
                                  : "text-slate-700",
                              )}
                            >
                              Tiêu chuẩn chất lượng
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    isWHOGMP: !formData.isWHOGMP,
                                  })
                                }
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-xl text-xs sm:text-[13px] font-black transition-all shadow-sm active:scale-95",
                                  formData.isWHOGMP
                                    ? "bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600"
                                    : isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-755/20"
                                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50",
                                )}
                              >
                                {formData.isWHOGMP && <Check size={16} />}
                                Đạt WHO-GMP
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    isEUGMP: !formData.isEUGMP,
                                  })
                                }
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-xl text-xs sm:text-[13px] font-black transition-all shadow-sm active:scale-95",
                                  formData.isEUGMP
                                    ? "bg-purple-500 border-purple-400 text-white hover:bg-purple-600"
                                    : isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-755/20"
                                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50",
                                )}
                              >
                                {formData.isEUGMP && <Check size={16} />}
                                Đạt GMP Châu Âu
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    isTCCS: !formData.isTCCS,
                                  })
                                }
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-xl text-xs sm:text-[13px] font-black transition-all shadow-sm active:scale-95",
                                  formData.isTCCS
                                    ? "bg-blue-500 border-blue-400 text-white hover:bg-blue-600"
                                    : isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-755/20"
                                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50",
                                )}
                              >
                                {formData.isTCCS && <Check size={16} />}
                                Đạt TCCS
                              </button>
                            </div>
                          </div>

                          <div className="md:col-span-2 border border-dashed rounded-2xl p-4 sm:p-5 space-y-4">
                            <label
                              className={cn(
                                "block text-xs sm:text-[13px] font-black uppercase tracking-widest transition-colors",
                                isDarkMode
                                  ? "text-slate-300"
                                  : "text-slate-700",
                              )}
                            >
                              Bảo quản & Hạn dùng
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label
                                  className={cn(
                                    "block text-[9px] font-bold text-slate-400 uppercase mb-1",
                                  )}
                                >
                                  Điều kiện bảo quản
                                </label>
                                <input
                                  type="text"
                                  disabled={uploading}
                                  value={formData.storageCondition || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      storageCondition: e.target.value,
                                    })
                                  }
                                  className={cn(
                                    "w-full px-3 py-2 border rounded-xl text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                    isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-white"
                                      : "bg-white border-slate-200",
                                  )}
                                  placeholder="Ví dụ: Nơi khô ráo"
                                />
                              </div>
                              <div>
                                <label
                                  className={cn(
                                    "block text-[9px] font-bold text-slate-400 uppercase mb-1",
                                  )}
                                >
                                  Nhiệt độ bảo quản
                                </label>
                                <input
                                  type="text"
                                  disabled={uploading}
                                  value={formData.storageTemperature || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      storageTemperature: e.target.value,
                                    })
                                  }
                                  className={cn(
                                    "w-full px-3 py-2 border rounded-xl text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                    isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-white"
                                      : "bg-white border-slate-200",
                                  )}
                                  placeholder="Ví dụ: Dưới 30°C"
                                />
                              </div>
                              <div>
                                <label
                                  className={cn(
                                    "block text-[9px] font-bold text-slate-400 uppercase mb-1",
                                  )}
                                >
                                  Hạn dùng của thuốc
                                </label>
                                <input
                                  type="text"
                                  disabled={uploading}
                                  value={formData.shelfLife || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      shelfLife: e.target.value,
                                    })
                                  }
                                  className={cn(
                                    "w-full px-3 py-2 border rounded-xl text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                    isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-white"
                                      : "bg-white border-slate-200",
                                  )}
                                  placeholder="Ví dụ: 36 tháng"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 border border-dashed rounded-2xl p-4 sm:p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <label
                                className={cn(
                                  "block text-xs sm:text-[13px] font-black uppercase tracking-widest transition-colors",
                                  isDarkMode
                                    ? "text-slate-300"
                                    : "text-slate-700",
                                )}
                              >
                                Số lô & Hạn dùng của thuốc
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newLots = [...(formData.lots || [])];
                                  newLots.push({
                                    lotNumber: "",
                                    expiryDate: "",
                                    price: "",
                                  });
                                  setFormData({
                                    ...formData,
                                    lots: newLots,
                                    lotNumber: newLots[0]?.lotNumber || "",
                                    expiryDate: newLots[0]?.expiryDate || "",
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-md transition-all active:scale-95"
                              >
                                <Plus size={14} /> Thêm lô mới
                              </button>
                            </div>

                            {!formData.lots || formData.lots.length === 0 ? (
                              <div
                                className={cn(
                                  "text-center py-6 border border-dashed rounded-xl",
                                  isDarkMode
                                    ? "border-slate-800 text-slate-500"
                                    : "border-slate-200 text-slate-400",
                                )}
                              >
                                Chưa có thông tin số lô & hạn dùng nào. Vui lòng
                                bấm vào nút thêm lô mới.
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-60 overflow-y-auto">
                                {formData.lots.map((lot, idx) => (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border transition-all",
                                      isDarkMode
                                        ? "bg-slate-900/40 border-slate-800"
                                        : "bg-slate-50/50 border-slate-100",
                                    )}
                                  >
                                    <div className="flex-1">
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                        Số lô
                                      </label>
                                      <input
                                        type="text"
                                        disabled={uploading}
                                        value={lot.lotNumber || ""}
                                        onChange={(e) => {
                                          const newLots = [
                                            ...(formData.lots || []),
                                          ];
                                          newLots[idx] = {
                                            ...newLots[idx],
                                            lotNumber: e.target.value,
                                          };
                                          setFormData({
                                            ...formData,
                                            lots: newLots,
                                            lotNumber:
                                              newLots[0]?.lotNumber || "",
                                            expiryDate:
                                              newLots[0]?.expiryDate || "",
                                          });
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2 border rounded-lg text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                          isDarkMode
                                            ? "bg-slate-800 border-slate-700 text-white"
                                            : "bg-white border-slate-200",
                                        )}
                                        placeholder="Số lô (Ví dụ: Lô 12345)"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                        Hạn dùng
                                      </label>
                                      <input
                                        type="date"
                                        disabled={uploading}
                                        value={lot.expiryDate || ""}
                                        onChange={(e) => {
                                          const newLots = [
                                            ...(formData.lots || []),
                                          ];
                                          newLots[idx] = {
                                            ...newLots[idx],
                                            expiryDate: e.target.value,
                                          };
                                          setFormData({
                                            ...formData,
                                            lots: newLots,
                                            lotNumber:
                                              newLots[0]?.lotNumber || "",
                                            expiryDate:
                                              newLots[0]?.expiryDate || "",
                                          });
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2 border rounded-lg text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                          isDarkMode
                                            ? "bg-slate-800 border-slate-700 text-white"
                                            : "bg-white border-slate-200",
                                        )}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                        Giá tiền (₫)
                                      </label>
                                      <div className="relative flex items-center">
                                        <input
                                          type="text"
                                          disabled={uploading}
                                          value={formatLotPriceVN(lot.price)}
                                          onChange={(e) => {
                                            const rawNumStr = e.target.value.replace(/\D/g, "");
                                            const newLots = [
                                              ...(formData.lots || []),
                                            ];
                                            newLots[idx] = {
                                              ...newLots[idx],
                                              price: rawNumStr ? Number(rawNumStr) : "",
                                            };
                                            setFormData({
                                              ...formData,
                                              lots: newLots,
                                              lotNumber:
                                                newLots[0]?.lotNumber || "",
                                              expiryDate:
                                                newLots[0]?.expiryDate || "",
                                            });
                                          }}
                                          className={cn(
                                            "w-full pl-3 pr-7 py-2 border rounded-lg text-xs sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold",
                                            isDarkMode
                                              ? "bg-slate-800 border-slate-700 text-white"
                                              : "bg-white border-slate-200",
                                          )}
                                          placeholder="VD: 100.000"
                                        />
                                        <span className="absolute right-2.5 text-xs font-bold text-slate-400 pointer-events-none select-none">
                                          ₫
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-end h-full pt-4 sm:pt-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newLots = (
                                            formData.lots || []
                                          ).filter((_, i) => i !== idx);
                                          setFormData({
                                            ...formData,
                                            lots: newLots,
                                            lotNumber:
                                              newLots[0]?.lotNumber || "",
                                            expiryDate:
                                              newLots[0]?.expiryDate || "",
                                          });
                                        }}
                                        className={cn(
                                          "flex items-center justify-center p-2 rounded-lg text-rose-500 transition-all",
                                          isDarkMode
                                            ? "hover:bg-rose-950/20"
                                            : "hover:bg-rose-50",
                                        )}
                                        title="Xóa lô này"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label
                              className={cn(
                                "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                isDarkMode
                                  ? "text-slate-400"
                                  : "text-slate-500",
                              )}
                            >
                              Phiên bản tờ hướng dẫn
                            </label>
                            <input
                              type="text"
                              disabled={uploading}
                              value={formData.leafletVersion || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  leafletVersion: e.target.value,
                                })
                              }
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode
                                  ? "bg-slate-800 border-slate-700 text-white"
                                  : "bg-slate-50 border-slate-200",
                              )}
                              placeholder="Ví dụ: Phiên bản 02"
                            />
                          </div>

                          <div>
                            <label
                              className={cn(
                                "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                isDarkMode
                                  ? "text-slate-400"
                                  : "text-slate-500",
                              )}
                            >
                              Ngày cập nhật HDSD
                            </label>
                            <input
                              type="date"
                              disabled={uploading}
                              value={formData.leafletUpdateDate || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  leafletUpdateDate: e.target.value,
                                })
                              }
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                isDarkMode
                                  ? "bg-slate-800 border-slate-700 text-white"
                                  : "bg-slate-50 border-slate-200",
                              )}
                            />
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                URL Ảnh đại diện (Avatar)
                              </label>
                              <div className="flex gap-3 sm:gap-4">
                                {formData.avatarUrl && (
                                  <div className="relative group/img">
                                    <div
                                      className={cn(
                                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border shrink-0 transition-colors",
                                        isDarkMode
                                          ? "border-slate-700"
                                          : "border-slate-200",
                                      )}
                                    >
                                      <img
                                        src={formData.avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openImageEditor(
                                          formData.avatarUrl,
                                          "avatar",
                                        )
                                      }
                                      className="absolute inset-0 bg-blue-600/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl"
                                      title="Chỉnh sửa ảnh"
                                    >
                                      <Scissors size={12} />
                                    </button>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder="Dán URL ảnh đại diện..."
                                    value={formData.avatarUrl || ""}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        avatarUrl: e.target.value,
                                      })
                                    }
                                    className={cn(
                                      "w-full px-3 sm:px-4 py-3 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white"
                                        : "bg-white border-slate-200",
                                    )}
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest mb-1.5 transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                URL Ảnh bìa (Banner)
                              </label>
                              <div className="flex gap-3 sm:gap-4">
                                {formData.bannerUrl && (
                                  <div
                                    className={cn(
                                      "w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border shrink-0 transition-colors",
                                      isDarkMode
                                        ? "border-slate-700"
                                        : "border-slate-200",
                                    )}
                                  >
                                    <img
                                      src={formData.bannerUrl}
                                      alt="Banner"
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder="Dán URL ảnh bìa..."
                                    value={formData.bannerUrl || ""}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        bannerUrl: e.target.value,
                                      })
                                    }
                                    className={cn(
                                      "w-full px-3 sm:px-4 py-3 border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white"
                                        : "bg-white border-slate-200",
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSubTab === "settings" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                          <div
                            className={cn(
                              "md:col-span-2 group relative overflow-hidden rounded-[32px] border transition-all duration-500 mb-2",
                              isDarkMode
                                ? "bg-slate-900/40 border-slate-800 hover:border-indigo-500/50"
                                : "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xl shadow-sm shadow-indigo-100/20",
                            )}
                          >
                            {extracting && (
                              <div className="absolute inset-0 overflow-hidden">
                                <motion.div
                                  animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.1, 0.2, 0.1],
                                  }}
                                  transition={{ duration: 4, repeat: Infinity }}
                                  className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full blur-[80px]"
                                />
                                <motion.div
                                  animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.05, 0.15, 0.05],
                                  }}
                                  transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    delay: 1,
                                  }}
                                  className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500 rounded-full blur-[100px]"
                                />
                              </div>
                            )}

                            <div className="relative p-6 sm:p-10">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "p-2 rounded-xl transition-colors",
                                        isDarkMode
                                          ? "bg-indigo-500/20 text-indigo-400"
                                          : "bg-indigo-50 text-indigo-600",
                                      )}
                                    >
                                      <FileText size={20} />
                                    </div>
                                    <h3
                                      className={cn(
                                        "text-lg font-black transition-colors",
                                        isDarkMode
                                          ? "text-white"
                                          : "text-slate-900",
                                      )}
                                    >
                                      Tài liệu đính kèm
                                    </h3>
                                  </div>
                                  <p
                                    className={cn(
                                      "text-xs font-semibold opacity-60",
                                      isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-500",
                                    )}
                                  >
                                    Tải PDF hoặc dán URL để AI hỗ trợ điền dữ
                                    liệu tự động
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={uploading || extracting}
                                    onClick={() => handleAIExtract()}
                                    className={cn(
                                      "relative flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all overflow-hidden",
                                      extracting
                                        ? "bg-slate-800 text-indigo-400 cursor-wait"
                                        : isDarkMode
                                          ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
                                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 hover:shadow-indigo-200",
                                    )}
                                  >
                                    {extracting ? (
                                      <>
                                        <Loader2
                                          size={16}
                                          className="animate-spin"
                                        />
                                        <span>Đang đọc dữ liệu...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles
                                          size={16}
                                          className={
                                            selectedFile ? "animate-pulse" : ""
                                          }
                                        />
                                        <span>
                                          {selectedFile
                                            ? "Tiến hành trích xuất"
                                            : "AI Trích xuất"}
                                        </span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-8 group/input relative">
                                  <input
                                    type="text"
                                    disabled={uploading || extracting}
                                    placeholder="Dán liên kết PDF (https://...)"
                                    value={formData.pdfUrl}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        pdfUrl: e.target.value,
                                      }))
                                    }
                                    className={cn(
                                      "w-full pl-12 pr-4 py-4 rounded-2xl border text-[13px] font-bold transition-all focus:ring-4 focus:ring-indigo-500/10 focus:outline-none",
                                      isDarkMode
                                        ? "bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500"
                                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-400",
                                    )}
                                  />
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Link size={18} />
                                  </div>
                                </div>

                                <div className="md:col-span-4 flex gap-2">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    disabled={uploading || extracting}
                                    onClick={() =>
                                      fileInputRef.current?.click()
                                    }
                                    className={cn(
                                      "flex-1 px-4 py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                                    )}
                                  >
                                    <Plus size={16} />{" "}
                                    {selectedFile ? "Đổi file" : "Chọn file"}
                                  </button>
                                  {(formData.pdfUrl || selectedFile) && (
                                    <button
                                      type="button"
                                      disabled={uploading || extracting}
                                      onClick={handleRemoveFile}
                                      className={cn(
                                        "px-4 rounded-2xl border transition-all flex items-center justify-center",
                                        isDarkMode
                                          ? "text-rose-400 bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10"
                                          : "text-rose-500 bg-rose-50 border-rose-100 hover:bg-rose-100",
                                      )}
                                      title="Xóa tệp"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {selectedFile && (
                                <div
                                  className={cn(
                                    "mt-2 mb-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-2",
                                    isDarkMode
                                      ? "bg-slate-800/50 border-slate-700 text-slate-400"
                                      : "bg-slate-50 border-slate-100 text-slate-500",
                                  )}
                                >
                                  <FileText
                                    size={12}
                                    className="text-primary"
                                  />
                                  <span className="truncate flex-1">
                                    Tệp đã chọn: {selectedFile.name}
                                  </span>
                                  <span className="shrink-0">
                                    {(selectedFile.size / 1024 / 1024).toFixed(
                                      2,
                                    )}{" "}
                                    MB
                                  </span>
                                </div>
                              )}

                              {extracting && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10"
                                >
                                  <div className="flex gap-1.5">
                                    {[0, 1, 2].map((i) => (
                                      <motion.div
                                        key={i}
                                        animate={{ height: [8, 20, 8] }}
                                        transition={{
                                          duration: 0.8,
                                          repeat: Infinity,
                                          delay: i * 0.1,
                                        }}
                                        className="w-1 bg-indigo-500 rounded-full"
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">
                                    AI đang phân tích từng trang tài liệu...
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                          {/* 1. Chế độ hiển thị */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-blue-100 text-blue-600",
                                )}
                              >
                                <Eye size={20} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-[13px] font-black uppercase tracking-widest",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-700",
                                  )}
                                >
                                  Chế độ hiển thị
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  Quyết định thuốc có xuất hiện trong tìm kiếm không
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isClosed: false })
                                }
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                  !formData.isClosed
                                    ? isDarkMode
                                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                      : "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    !formData.isClosed
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Hiện
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    !formData.isClosed
                                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isClosed: true })
                                }
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.isClosed
                                    ? isDarkMode
                                      ? "bg-rose-500/10 border-rose-500 text-rose-400"
                                      : "bg-rose-50 border-rose-500 text-rose-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-rose-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    formData.isClosed
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Ẩn
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.isClosed
                                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>
                            </div>
                          </div>

                          {/* 2. Tình trạng hoạt động */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode
                                    ? "bg-teal-500/20 text-teal-400"
                                    : "bg-teal-100 text-teal-600",
                                )}
                              >
                                <Activity size={20} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-[13px] font-black uppercase tracking-widest",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-700",
                                  )}
                                >
                                  Tình trạng hoạt động
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  Trạng thái lưu hành và sử dụng của thuốc
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, status: "active" })
                                }
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.status === "active" || !formData.status
                                    ? isDarkMode
                                      ? "bg-teal-500/10 border-teal-500 text-teal-400"
                                      : "bg-teal-50 border-teal-500 text-teal-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-teal-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    formData.status === "active" || !formData.status
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Đang hoạt động
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.status === "active" || !formData.status
                                      ? "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, status: "suspended" })
                                }
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.status === "suspended"
                                    ? isDarkMode
                                      ? "bg-rose-500/10 border-rose-500 text-rose-400"
                                      : "bg-rose-50 border-rose-500 text-rose-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-rose-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    formData.status === "suspended"
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Tạm ngưng
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.status === "suspended"
                                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>
                            </div>
                          </div>

                          {/* 3. Tình trạng số lượng */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-blue-100 text-blue-600",
                                )}
                              >
                                <Layers size={20} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-[13px] font-black uppercase tracking-widest",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-700",
                                  )}
                                >
                                  Tình trạng số lượng
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  Tình trạng tồn kho thực tế của thuốc
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, stockStatus: "available" })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.stockStatus === "available" || !formData.stockStatus
                                    ? isDarkMode
                                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                      : "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.stockStatus === "available" || !formData.stockStatus
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Còn hàng
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.stockStatus === "available" || !formData.stockStatus
                                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, stockStatus: "low" })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.stockStatus === "low"
                                    ? isDarkMode
                                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                                      : "bg-amber-50 border-amber-500 text-amber-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-amber-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.stockStatus === "low"
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Sắp hết
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.stockStatus === "low"
                                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, stockStatus: "out" })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.stockStatus === "out"
                                    ? isDarkMode
                                      ? "bg-rose-500/10 border-rose-500 text-rose-400"
                                      : "bg-rose-50 border-rose-500 text-rose-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-rose-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.stockStatus === "out"
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Hết hàng
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.stockStatus === "out"
                                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>
                            </div>

                            {/* Báo cáo số lượng (Quantity Report Form & Lot Tracking) */}
                            <div
                              className={cn(
                                "mt-5 pt-5 border-t rounded-2xl p-4 transition-all",
                                isDarkMode
                                  ? "bg-slate-900/60 border-slate-700/60"
                                  : "bg-white border-slate-200/80 shadow-xs",
                              )}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={cn(
                                      "p-1.5 rounded-lg",
                                      isDarkMode
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "bg-blue-50 text-blue-600",
                                    )}
                                  >
                                    <ClipboardList size={16} />
                                  </div>
                                  <div>
                                    <h5
                                      className={cn(
                                        "text-xs font-bold uppercase tracking-wider",
                                        isDarkMode
                                          ? "text-slate-200"
                                          : "text-slate-800",
                                      )}
                                    >
                                      Báo cáo số lượng tồn kho
                                    </h5>
                                    <p className="text-[10px] text-slate-400">
                                      Cập nhật số lượng kiểm kê thực tế theo từng lô
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "text-[10px] font-bold px-2.5 py-1 rounded-lg border",
                                      isDarkMode
                                        ? "bg-slate-800/80 border-slate-700 text-blue-400"
                                        : "bg-blue-50 border-blue-100 text-blue-700",
                                    )}
                                  >
                                    Tổng tồn:{" "}
                                    <span className="font-extrabold">
                                      {formData.stockQuantity !== undefined &&
                                      formData.stockQuantity !== null
                                        ? formData.stockQuantity
                                        : (formData.lots || []).reduce(
                                            (acc, l) =>
                                              acc + (Number(l.quantity) || 0),
                                            0,
                                          )}
                                    </span>{" "}
                                    {formData.unit || "đơn vị"}
                                  </div>
                                </div>
                              </div>

                              {reportSuccessMsg && (
                                <motion.div
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mb-3.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2"
                                >
                                  <CheckCircle2 size={15} className="shrink-0" />
                                  <span>{reportSuccessMsg}</span>
                                </motion.div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label
                                    className={cn(
                                      "block text-[10px] font-bold uppercase tracking-wider mb-1",
                                      isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-600",
                                    )}
                                  >
                                    Chọn lô thuốc
                                  </label>
                                  <select
                                    value={selectedReportLotIndex}
                                    onChange={(e) =>
                                      setSelectedReportLotIndex(e.target.value)
                                    }
                                    className={cn(
                                      "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white"
                                        : "bg-slate-50 border-slate-200 text-slate-900",
                                    )}
                                  >
                                    {(formData.lots || []).map((lot, idx) => (
                                      <option key={idx} value={String(idx)}>
                                        Lô {idx + 1}: {lot.lotNumber || "Chưa có mã"} (SL:{" "}
                                        {lot.quantity ?? 0}
                                        {lot.expiryDate ? ` - HSD: ${lot.expiryDate}` : ""})
                                      </option>
                                    ))}
                                    <option value="new">+ Thêm báo cáo lô mới</option>
                                  </select>
                                </div>

                                <div>
                                  <label
                                    className={cn(
                                      "block text-[10px] font-bold uppercase tracking-wider mb-1",
                                      isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-600",
                                    )}
                                  >
                                    Mã số lô (Lot Number)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="VD: LOT20240101"
                                    value={reportLotNumber}
                                    onChange={(e) =>
                                      setReportLotNumber(e.target.value)
                                    }
                                    className={cn(
                                      "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400",
                                    )}
                                  />
                                </div>

                                <div>
                                  <label
                                    className={cn(
                                      "block text-[10px] font-bold uppercase tracking-wider mb-1",
                                      isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-600",
                                    )}
                                  >
                                    Số lượng tồn thực tế
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Nhập số lượng thực tế..."
                                    value={reportQuantity}
                                    onChange={(e) =>
                                      setReportQuantity(e.target.value)
                                    }
                                    className={cn(
                                      "w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-blue-400"
                                        : "bg-slate-50 border-slate-200 text-blue-600",
                                    )}
                                  />
                                </div>

                                <div>
                                  <label
                                    className={cn(
                                      "block text-[10px] font-bold uppercase tracking-wider mb-1",
                                      isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-600",
                                    )}
                                  >
                                    Hạn sử dụng lô (HSD)
                                  </label>
                                  <input
                                    type="date"
                                    value={reportExpiryDate}
                                    onChange={(e) =>
                                      setReportExpiryDate(e.target.value)
                                    }
                                    className={cn(
                                      "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white"
                                        : "bg-slate-50 border-slate-200 text-slate-900",
                                    )}
                                  />
                                </div>

                                <div>
                                  <label
                                    className={cn(
                                      "block text-[10px] font-bold uppercase tracking-wider mb-1",
                                      isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-600",
                                    )}
                                  >
                                    Ngày báo cáo kiểm kê
                                  </label>
                                  <input
                                    type="date"
                                    value={reportDate}
                                    onChange={(e) =>
                                      setReportDate(e.target.value)
                                    }
                                    className={cn(
                                      "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white"
                                        : "bg-slate-50 border-slate-200 text-slate-900",
                                    )}
                                  />
                                </div>

                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={handleSaveQuantityReport}
                                    className={cn(
                                      "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm",
                                      isDarkMode
                                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30"
                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200",
                                    )}
                                  >
                                    <Save size={14} />
                                    <span>Lưu báo cáo số lượng</span>
                                  </button>
                                </div>
                              </div>

                              {/* Danh sách các lô hiện có */}
                              {formData.lots && formData.lots.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                    Chi tiết các lô đang theo dõi ({formData.lots.length} lô):
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {formData.lots.map((lot, lIdx) => (
                                      <div
                                        key={lIdx}
                                        className={cn(
                                          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border",
                                          isDarkMode
                                            ? "bg-slate-800/60 border-slate-700 text-slate-300"
                                            : "bg-slate-50 border-slate-200 text-slate-700",
                                        )}
                                      >
                                        <span className="font-bold text-blue-500">
                                          {lot.lotNumber || `Lô ${lIdx + 1}`}:
                                        </span>
                                        <span>
                                          {lot.quantity ?? 0} {formData.unit || "đv"}
                                        </span>
                                        {lot.expiryDate && (
                                          <span className="text-[10px] text-slate-400">
                                            (HSD: {lot.expiryDate})
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 4. Tình trạng hạn dùng */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-amber-100 text-amber-600",
                                )}
                              >
                                <Clock size={20} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-[13px] font-black uppercase tracking-widest",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-700",
                                  )}
                                >
                                  Tình trạng hạn dùng
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  Theo dõi và cảnh báo hạn sử dụng của thuốc
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, expiryStatus: "valid" })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.expiryStatus === "valid" || !formData.expiryStatus
                                    ? isDarkMode
                                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                      : "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.expiryStatus === "valid" || !formData.expiryStatus
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Còn hạn
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.expiryStatus === "valid" || !formData.expiryStatus
                                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, expiryStatus: "expiring" })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.expiryStatus === "expiring"
                                    ? isDarkMode
                                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                                      : "bg-amber-50 border-amber-500 text-amber-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-amber-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.expiryStatus === "expiring"
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Sắp hết
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.expiryStatus === "expiring"
                                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, expiryStatus: "expired" })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.expiryStatus === "expired"
                                    ? isDarkMode
                                      ? "bg-rose-500/10 border-rose-500 text-rose-400"
                                      : "bg-rose-50 border-rose-500 text-rose-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-rose-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.expiryStatus === "expired"
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Hết hạn
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.expiryStatus === "expired"
                                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>
                            </div>
                          </div>

                          {/* 5. Đánh dấu Thuốc mới */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-emerald-100 text-emerald-600",
                                )}
                              >
                                <Sparkles size={20} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-[13px] font-black uppercase tracking-widest",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-700",
                                  )}
                                >
                                  Đánh dấu Thuốc mới
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  Hiển thị huy hiệu MỚI và ưu tiên lên đầu danh sách
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isNew: false })
                                }
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                  !formData.isNew
                                    ? isDarkMode
                                      ? "bg-slate-800 border-slate-600 text-slate-200"
                                      : "bg-white border-slate-300 text-slate-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-400",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    !formData.isNew
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Bình thường
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    !formData.isNew
                                      ? "bg-slate-400"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isNew: true })
                                }
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.isNew
                                    ? isDarkMode
                                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                      : "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    formData.isNew
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Thuốc mới (NEW)
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.isNew
                                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>
                            </div>
                          </div>

                          {/* 6. Đánh dấu Thuốc đã cập nhật */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode
                                    ? "bg-indigo-500/20 text-indigo-400"
                                    : "bg-indigo-100 text-indigo-600",
                                )}
                              >
                                <RefreshCw size={20} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-[13px] font-black uppercase tracking-widest",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-700",
                                  )}
                                >
                                  Đánh dấu Thuốc đã cập nhật
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  Gắn nhãn tiến độ cập nhật nội dung của thuốc
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isUpdated: false })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  !formData.isUpdated
                                    ? isDarkMode
                                      ? "bg-slate-800 border-slate-600 text-slate-200"
                                      : "bg-white border-slate-300 text-slate-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-400",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    !formData.isUpdated
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Không
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    !formData.isUpdated
                                      ? "bg-slate-400"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isUpdated: "updating" })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.isUpdated === "updating"
                                    ? isDarkMode
                                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                                      : "bg-amber-50 border-amber-500 text-amber-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-amber-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.isUpdated === "updating"
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Đang sửa
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.isUpdated === "updating"
                                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isUpdated: true })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.isUpdated === true || (formData.isUpdated && formData.isUpdated !== "updating")
                                    ? isDarkMode
                                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-400"
                                      : "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-indigo-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.isUpdated === true || (formData.isUpdated && formData.isUpdated !== "updating")
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Hoàn thành
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.isUpdated === true || (formData.isUpdated && formData.isUpdated !== "updating")
                                      ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>
                            </div>
                          </div>

                          {/* 7. Phân loại quản lý (Rx) */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all md:col-span-2",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode
                                    ? "bg-indigo-500/20 text-indigo-400"
                                    : "bg-indigo-100 text-indigo-600",
                                )}
                              >
                                <FileText size={20} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-[13px] font-black uppercase tracking-widest",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-700",
                                  )}
                                >
                                  Phân loại quản lý (Rx)
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  Quy định kê đơn hoặc không kê đơn
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isRx: false })
                                }
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                  !formData.isRx
                                    ? isDarkMode
                                      ? "bg-blue-500/10 border-blue-500 text-blue-400"
                                      : "bg-blue-50 border-blue-500 text-blue-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-blue-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    !formData.isRx
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Không kê đơn (OTC)
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    !formData.isRx
                                      ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, isRx: true })
                                }
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.isRx
                                    ? isDarkMode
                                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                                      : "bg-amber-50 border-amber-500 text-amber-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-amber-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    formData.isRx
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Thuốc kê đơn (Rx)
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.isRx
                                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSubTab === "reasoning" && (
                        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                          {/* Banner giới thiệu */}
                          <div
                            className={cn(
                              "p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700/80"
                                : "bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/30 border-blue-100 shadow-xs",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "p-2.5 rounded-2xl shrink-0",
                                  isDarkMode
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-blue-600 text-white shadow-md shadow-blue-500/20",
                                )}
                              >
                                <Scale size={22} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-xs sm:text-sm font-black uppercase tracking-wider",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-800",
                                  )}
                                >
                                  Lí luận & Lập luận chuẩn hóa y khoa
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  Cơ sở biện giải chuyên môn, căn cứ tài liệu và guideline chuẩn hóa điều trị
                                </p>
                              </div>
                            </div>

                            {/* Badge trạng thái hiện tại */}
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Trạng thái:</span>
                              <span
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                  formData.standardizationStatus === "approved"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : formData.standardizationStatus === "reviewed"
                                      ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                      : "bg-slate-500/10 text-slate-500 border-slate-500/30",
                                )}
                              >
                                {formData.standardizationStatus === "approved"
                                  ? "Đã chuẩn hóa"
                                  : formData.standardizationStatus === "reviewed"
                                    ? "Đang thẩm định"
                                    : "Bản nháp"}
                              </span>
                            </div>
                          </div>

                          {/* 1. Trạng thái chuẩn hóa */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl",
                                  isDarkMode
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-blue-100 text-blue-600",
                                )}
                              >
                                <FileCheck size={20} />
                              </div>
                              <div>
                                <h4
                                  className={cn(
                                    "text-[13px] font-black uppercase tracking-widest",
                                    isDarkMode
                                      ? "text-slate-200"
                                      : "text-slate-700",
                                  )}
                                >
                                  Trạng thái chuẩn hóa
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  Quy trình kiểm duyệt và phê duyệt dữ liệu chuyên môn
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    standardizationStatus: "draft",
                                  })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.standardizationStatus === "draft" ||
                                    !formData.standardizationStatus
                                    ? isDarkMode
                                      ? "bg-slate-700/50 border-slate-500 text-slate-200"
                                      : "bg-white border-slate-400 text-slate-800 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.standardizationStatus === "draft" ||
                                      !formData.standardizationStatus
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Bản nháp
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.standardizationStatus === "draft" ||
                                      !formData.standardizationStatus
                                      ? "bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    standardizationStatus: "reviewed",
                                  })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.standardizationStatus === "reviewed"
                                    ? isDarkMode
                                      ? "bg-blue-500/10 border-blue-500 text-blue-400"
                                      : "bg-blue-50 border-blue-500 text-blue-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-blue-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.standardizationStatus === "reviewed"
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Đang thẩm định
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.standardizationStatus === "reviewed"
                                      ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    standardizationStatus: "approved",
                                  })
                                }
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                                  formData.standardizationStatus === "approved"
                                    ? isDarkMode
                                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                      : "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md translate-y-[-2px]"
                                    : isDarkMode
                                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    formData.standardizationStatus === "approved"
                                      ? "opacity-100"
                                      : "opacity-40",
                                  )}
                                >
                                  Đã chuẩn hóa
                                </span>
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    formData.standardizationStatus === "approved"
                                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                      : "bg-slate-300",
                                  )}
                                />
                              </button>
                            </div>
                          </div>

                          {/* 2. Lí luận & Lập luận y khoa */}
                          <div
                            className={cn(
                              "p-4 sm:p-6 rounded-[24px] border transition-all",
                              isDarkMode
                                ? "bg-slate-800/40 border-slate-700"
                                : "bg-slate-50 border-slate-100 shadow-sm",
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <label
                                className={cn(
                                  "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest transition-colors",
                                  isDarkMode
                                    ? "text-slate-400"
                                    : "text-slate-500",
                                )}
                              >
                                Lí luận & Lập luận y khoa
                              </label>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {(formData.standardizationRationale || "").length} ký tự
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mb-3">
                              Nêu rõ lập luận lâm sàng, biện giải phối hợp thuốc, căn cứ hiệu chỉnh liều hoặc lý do lựa chọn phác đồ đặc biệt.
                            </p>
                            <textarea
                              rows={5}
                              value={formData.standardizationRationale || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  standardizationRationale: e.target.value,
                                })
                              }
                              placeholder="Ví dụ: Thuốc thuộc nhóm ức chế SGLT2 với cơ chế giảm tái hấp thu glucose tại ống lượn gần. Dựa trên bằng chứng thử nghiệm DAPA-CKD / EMPA-KIDNEY, thuốc chứng minh lợi ích bảo vệ thận và tim mạch độc lập với kiểm soát đường huyết..."
                              className={cn(
                                "w-full p-4 rounded-2xl border text-xs sm:text-sm font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y",
                                isDarkMode
                                  ? "bg-slate-900/80 border-slate-700 text-slate-200 placeholder-slate-500"
                                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-xs",
                              )}
                            />
                          </div>

                          {/* 3. Căn cứ tài liệu / Guideline & Ghi chú nội bộ */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            {/* Căn cứ tài liệu / Guideline */}
                            <div
                              className={cn(
                                "p-4 sm:p-6 rounded-[24px] border transition-all flex flex-col justify-between",
                                isDarkMode
                                  ? "bg-slate-800/40 border-slate-700"
                                  : "bg-slate-50 border-slate-100 shadow-sm",
                              )}
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <BookOpen size={16} className="text-blue-500" />
                                  <label
                                    className={cn(
                                      "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest transition-colors",
                                      isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-500",
                                    )}
                                  >
                                    Căn cứ tài liệu / Guideline
                                  </label>
                                </div>
                                <p className="text-[11px] text-slate-400 mb-3">
                                  Văn bản quy phạm, hướng dẫn điều trị của Bộ Y tế hoặc hiệp hội chuyên môn quốc tế.
                                </p>
                                <textarea
                                  rows={3}
                                  value={formData.standardizationBasis || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      standardizationBasis: e.target.value,
                                    })
                                  }
                                  placeholder="VD: Dược thư Quốc gia VN 2022, Quyết định 4845/QĐ-BYT, KDIGO 2024, ADA 2024..."
                                  className={cn(
                                    "w-full p-3.5 rounded-2xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y",
                                    isDarkMode
                                      ? "bg-slate-900/80 border-slate-700 text-blue-400 placeholder-slate-500"
                                      : "bg-white border-slate-200 text-blue-600 placeholder-slate-400 shadow-xs",
                                  )}
                                />
                              </div>

                              {/* Gợi ý nguồn tài liệu nhanh */}
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                  Gợi ý nhanh nguồn tài liệu:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    "Dược thư QG VN 2022",
                                    "Hướng dẫn BYT",
                                    "KDIGO 2024",
                                    "ADA Standards 2024",
                                    "AHA/ACC Guideline",
                                    "GINA 2024",
                                    "GOLD 2024",
                                  ].map((src) => (
                                    <button
                                      key={src}
                                      type="button"
                                      onClick={() => {
                                        const current = formData.standardizationBasis || "";
                                        if (!current.includes(src)) {
                                          const updated = current
                                            ? `${current}, ${src}`
                                            : src;
                                          setFormData({
                                            ...formData,
                                            standardizationBasis: updated,
                                          });
                                        }
                                      }}
                                      className={cn(
                                        "px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer",
                                        isDarkMode
                                          ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400"
                                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 shadow-2xs",
                                      )}
                                    >
                                      + {src}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Ghi chú nội bộ / Bổ sung */}
                            <div
                              className={cn(
                                "p-4 sm:p-6 rounded-[24px] border transition-all flex flex-col justify-between",
                                isDarkMode
                                  ? "bg-slate-800/40 border-slate-700"
                                  : "bg-slate-50 border-slate-100 shadow-sm",
                              )}
                            >
                              <div>
                                <label
                                  className={cn(
                                    "block text-[10px] sm:text-[13px] font-black uppercase tracking-widest transition-colors mb-2",
                                    isDarkMode
                                      ? "text-slate-400"
                                      : "text-slate-500",
                                  )}
                                >
                                  Ghi chú nội bộ & Lưu ý thẩm định
                                </label>
                                <p className="text-[11px] text-slate-400 mb-3">
                                  Lưu ý dành cho Hội đồng Dược & Điều trị, người duyệt hồ sơ hoặc các phân tích nội bộ.
                                </p>
                                <textarea
                                  rows={4}
                                  value={formData.standardizationNotes || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      standardizationNotes: e.target.value,
                                    })
                                  }
                                  placeholder="Nhập ghi chú nội bộ, ngày thẩm định dự kiến hoặc người phụ trách chuẩn hóa..."
                                  className={cn(
                                    "w-full p-3.5 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y",
                                    isDarkMode
                                      ? "bg-slate-900/80 border-slate-700 text-slate-300 placeholder-slate-500"
                                      : "bg-white border-slate-200 text-slate-700 placeholder-slate-400 shadow-xs",
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  <DrugDosageWarningsFormTabs
                    activeTab={activeTab}
                    activeSubTab={activeSubTab}
                    formData={formData}
                    setFormData={setFormData}
                    isDarkMode={isDarkMode}
                    icdList={icdList}
                    drugs={drugs}
                    drugGroups={drugGroups}
                    patientGroups={patientGroups}
                  />
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body,
    )
  : null}

      {/* Unsaved Changes Confirmation Dialog */}
      {typeof document !== "undefined" && isUnsavedConfirmOpen
        ? createPortal(
            <AnimatePresence>
              {isUnsavedConfirmOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsUnsavedConfirmOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={cn(
                      "relative w-full max-w-sm rounded-2xl p-5 shadow-2xl border flex flex-col gap-4",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-900",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                        <AlertTriangle size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-base">Bỏ thay đổi chưa lưu?</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Dữ liệu bạn vừa nhập sẽ không được lưu nếu bạn đóng bây giờ.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => setIsUnsavedConfirmOpen(false)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer",
                          isDarkMode
                            ? "bg-slate-700 hover:bg-slate-600 text-slate-200"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700",
                        )}
                      >
                        Tiếp tục chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUnsavedConfirmOpen(false);
                          setIsModalOpen(false);
                          setEditingDrug(null);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
                      >
                        Bỏ thay đổi & Đóng
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {/* Drug Detail Modal on Mobile */}
      {isMobile && isDetailModalOpen &&
        createPortal(
          <DrugDetailModal
            drug={detailDrug}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setDetailDrug(null);
              if (activeDrugTabId) {
                handleCloseDrugTab(activeDrugTabId);
              }
            }}
            isDarkMode={isDarkMode}
            userPowerPoints={userPowerPoints}
            canSeeIcdSuggestions={canSeeIcdSuggestions}
            canSeeCommonIndications={canSeeCommonIndications}
            canSeeDosageSuggestions={canSeeDosageSuggestions}
            canSeePrecautionType={canSeePrecautionType}
            canSeePrecautionSeverity={canSeePrecautionSeverity}
            canSeePregnancyTrimesters={canSeePregnancyTrimesters}
            canSeeQuickSelectTags={canSeeQuickSelectTags}
            canSeeIntakeTime={canSeeIntakeTime}
            canSeeAgeContraindications={canSeeAgeContraindications}
            canSeeInteractionSuggestions={canSeeInteractionSuggestions}
            userRole={userRole}
            onEdit={(drug) => {
              setIsDetailModalOpen(false);
              setDetailDrug(null);
              handleOpenModal(drug);
            }}
            drugGroups={drugGroups}
          />,
          document.body
        )}

      {/* Image Cropper Modal */}
      {isImageEditorOpen && (
        <ImageEditorModal
          isOpen={isImageEditorOpen}
          onClose={() => setIsImageEditorOpen(false)}
          imageSrc={imageToEdit}
          onConfirm={handleImageCropConfirm}
          aspect={1}
          isDarkMode={isDarkMode}
        />
      )}

      {/* PDF Viewer Modal */}
      {pdfViewerUrl && (
        <PdfViewerModal
          isOpen={!!pdfViewerUrl}
          onClose={handleClosePdfViewer}
          pdfUrl={pdfViewerUrl}
          drug={pdfViewerDrug}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Mobile Fixed Pagination Bar on Tra cứu thuốc (pinned above bottommobilenav) */}
      {typeof document !== "undefined" &&
      isMobile &&
      totalPages > 1 &&
      viewMode === "drugs" &&
      !isDetailModalOpen &&
      !isModalOpen &&
      !isImageEditorOpen &&
      !pdfViewerUrl
        ? createPortal(
            <div
              id="mobile-drug-fixed-pagination"
              data-prevent-swipe="true"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="lg:hidden fixed left-0 right-0 z-30 flex items-center justify-center px-2 py-1 pointer-events-auto transition-all duration-200"
              style={{
                bottom:
                  mobileBottomNavHeight > 0
                    ? `${mobileBottomNavHeight}px`
                    : "var(--mobile-bottom-nav-height, calc(3.5rem + env(safe-area-inset-bottom, 0px)))",
              }}
            >
              <div
                className={cn(
                  "w-full max-w-lg mx-auto flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-2xl border shadow-lg backdrop-blur-xl transition-all",
                  isDarkMode
                    ? "bg-slate-900/95 border-slate-800 text-slate-200 shadow-black/50"
                    : "bg-white/95 border-slate-200/90 text-slate-700 shadow-slate-900/10",
                )}
              >
                {/* Left: items per page select */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "hidden xs:inline text-[9px] font-bold uppercase tracking-wider",
                      isDarkMode ? "text-slate-500" : "text-slate-400",
                    )}
                  >
                    Hiển thị:
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className={cn(
                      "text-[10px] font-bold py-1 px-1.5 rounded-lg border appearance-none cursor-pointer outline-none transition-all",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 shadow-2xs",
                    )}
                    title="Số lượng thuốc trên mỗi trang"
                  >
                    {[10, 20, 30, 50, 100].map((val) => (
                      <option key={val} value={val}>
                        {val}/trang
                      </option>
                    ))}
                  </select>
                </div>

                {/* Right: navigation buttons & page input */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Trang đầu << */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={validPage === 1}
                    title="Trang đầu"
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Trang trước < */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={validPage === 1}
                    title="Trang trước"
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Input trang */}
                  <div
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[11px] font-bold transition-colors",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300"
                        : "bg-slate-50 border-slate-200 text-slate-700",
                    )}
                  >
                    <span className={cn("hidden xs:inline text-[10px]", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Trang
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => {
                        setPageInput(e.target.value);
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }}
                      onBlur={() => {
                        const val = parseInt(pageInput, 10);
                        if (isNaN(val) || val < 1 || val > totalPages) {
                          setPageInput(validPage.toString());
                        } else {
                          setCurrentPage(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseInt(pageInput, 10);
                          if (!isNaN(val) && val >= 1 && val <= totalPages) {
                            setCurrentPage(val);
                          } else {
                            setPageInput(validPage.toString());
                          }
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className={cn(
                        "w-8 text-center py-0.5 px-0.5 rounded font-black focus:outline-none focus:ring-1 focus:ring-blue-500/40 border transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px]",
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900 shadow-2xs",
                      )}
                    />
                    <span className={cn("text-[10px]", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      /{totalPages}
                    </span>
                  </div>

                  {/* Trang sau > */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={validPage === totalPages}
                    title="Trang sau"
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Trang cuối >> */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validPage === totalPages}
                    title="Trang cuối"
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border shrink-0 cursor-pointer active:scale-95",
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Mobile Floating Add Button */}
      {isManageDirectory && (canManage || userRole === "admin") && viewMode === "drugs" && (
        <div className="fixed right-4 bottom-20 z-40 sm:hidden">
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-600/50 flex items-center justify-center cursor-pointer active:scale-90 transition-all border-2 border-white dark:border-slate-900"
            title="Thêm thuốc mới"
          >
            <Plus size={22} />
          </button>
        </div>
      )}
    </div>
  );
};

export default DrugDirectory;
