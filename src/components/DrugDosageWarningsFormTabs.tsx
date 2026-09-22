import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Search,
  ThumbsUp,
  AlertCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Baby,
  Heart,
  Car,
  Zap,
  Activity,
  Info,
  Layers,
  Sparkles,
  Tag,
  Check,
  MoveRight,
} from "lucide-react";
import { Drug, DrugGroup } from "../types";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface DrugDosageWarningsFormTabsProps {
  activeTab: string;
  activeSubTab: string;
  formData: Drug;
  setFormData: React.Dispatch<React.SetStateAction<Drug>>;
  isDarkMode: boolean;
  icdList: any[];
  drugs: Drug[];
  drugGroups: DrugGroup[];
  patientGroups?: any[];
}

export const DrugDosageWarningsFormTabs: React.FC<
  DrugDosageWarningsFormTabsProps
> = ({
  activeTab,
  activeSubTab,
  formData,
  setFormData,
  isDarkMode,
  icdList = [],
  drugs = [],
  drugGroups = [],
}) => {
  // State for ICD-10 search query per indication row
  const [indIcdQueries, setIndIcdQueries] = useState<Record<number, string>>({});
  // State for ICD-10 search query per contraindication row
  const [contraIcdQueries, setContraIcdQueries] = useState<Record<number, string>>({});
  // State for ICD-10 search query per precaution row
  const [precautionIcdQueries, setPrecautionIcdQueries] = useState<Record<number, string>>({});
  // State for Drug search query per precaution row
  const [precautionDrugQueries, setPrecautionDrugQueries] = useState<Record<number, string>>({});
  // State for active dropdown per row
  const [activeIcdSearchRow, setActiveIcdSearchRow] = useState<number | null>(null);
  const [activeContraIcdSearchRow, setActiveContraIcdSearchRow] = useState<number | null>(null);
  const [activePrecautionIcdSearchRow, setActivePrecautionIcdSearchRow] = useState<number | null>(null);
  const [activePrecautionDrugSearchRow, setActivePrecautionDrugSearchRow] = useState<number | null>(null);

  // Common quick ICD suggestions for indications
  const commonIcdSuggestions = useMemo(
    () => [
      { code: "I10", name: "Tăng huyết áp vô căn (nguyên phát)" },
      { code: "E11", name: "Bệnh đái tháo đường không phụ thuộc insulin" },
      { code: "I20", name: "Cơn đau thắt ngực" },
      { code: "I50", name: "Suy tim" },
      { code: "J06", name: "Nhiễm trùng đường hô hấp trên cấp tính" },
      { code: "J18", name: "Viêm phổi, không xác định vi sinh vật" },
      { code: "J45", name: "Hen (suyễn)" },
      { code: "K21", name: "Bệnh trào ngược dạ dày - thực quản" },
      { code: "K29", name: "Viêm dạ dày và tá tràng" },
      { code: "M79", name: "Đau cơ và các đau không xác định khác" },
      { code: "N39", name: "Rối loạn khác của hệ tiết niệu" },
    ],
    [],
  );

  // Helper: Get ICD name from icdList
  const getIcdName = (code: string) => {
    if (!code) return "";
    const cleanCode = code.split(" - ")[0].trim();
    const found = icdList.find(
      (item) => item.code?.toLowerCase() === cleanCode.toLowerCase(),
    );
    if (found) return found.name;
    if (code.includes(" - ")) return code.split(" - ").slice(1).join(" - ");
    return "";
  };

  // INDICATION HANDLERS
  const handleAddIndication = () => {
    const updated = [
      ...(formData.indications || []),
      {
        title: "",
        content: "",
        icd10s: [],
        defaultIcd10s: [],
        betterAlternativeIcd10s: [],
        notRecommendedIcd10s: [],
        isPrimary: (formData.indications || []).length === 0,
      },
    ];
    setFormData({ ...formData, indications: updated });
  };

  const handleRemoveIndication = (idx: number) => {
    const updated = (formData.indications || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, indications: updated });
  };

  const handleMoveIndication = (idx: number, direction: "up" | "down") => {
    const list = [...(formData.indications || [])];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setFormData({ ...formData, indications: list });
  };

  const handleAddIcdToIndication = (indIdx: number, code: string) => {
    const cleanCode = code.split(" - ")[0].trim();
    if (!cleanCode) return;
    const updated = [...(formData.indications || [])];
    const currentIcds = updated[indIdx]?.icd10s || [];
    if (!currentIcds.some((c) => c.split(" - ")[0].trim() === cleanCode)) {
      updated[indIdx] = {
        ...updated[indIdx],
        icd10s: [...currentIcds, cleanCode],
      };
      setFormData({ ...formData, indications: updated });
    }
    setIndIcdQueries((prev) => ({ ...prev, [indIdx]: "" }));
    setActiveIcdSearchRow(null);
  };

  const handleRemoveIcdFromIndication = (indIdx: number, code: string) => {
    const cleanCode = code.split(" - ")[0].trim();
    const updated = [...(formData.indications || [])];
    const current = updated[indIdx];
    if (!current) return;
    updated[indIdx] = {
      ...current,
      icd10s: (current.icd10s || []).filter(
        (c) => c.split(" - ")[0].trim() !== cleanCode,
      ),
      defaultIcd10s: (current.defaultIcd10s || []).filter(
        (c) => c.split(" - ")[0].trim() !== cleanCode,
      ),
      betterAlternativeIcd10s: (current.betterAlternativeIcd10s || []).filter(
        (c) => c.split(" - ")[0].trim() !== cleanCode,
      ),
      notRecommendedIcd10s: (current.notRecommendedIcd10s || []).filter(
        (c) => c.split(" - ")[0].trim() !== cleanCode,
      ),
    };
    setFormData({ ...formData, indications: updated });
  };

  const handleCycleIcdStatus = (indIdx: number, code: string) => {
    const cleanCode = code.split(" - ")[0].trim();
    const updated = [...(formData.indications || [])];
    const current = updated[indIdx];
    if (!current) return;

    const defaults = current.defaultIcd10s || [];
    const alts = current.betterAlternativeIcd10s || [];
    const notRecs = current.notRecommendedIcd10s || [];

    const isDef = defaults.some((c) => c.split(" - ")[0].trim() === cleanCode);
    const isAlt = alts.some((c) => c.split(" - ")[0].trim() === cleanCode);
    const isNotRec = notRecs.some(
      (c) => c.split(" - ")[0].trim() === cleanCode,
    );

    // Cycle: Normal -> Default (Ưu tiên) -> Alternative (Thay thế) -> NotRecommended (Không khuyến khích) -> Normal
    let nextDefaults = defaults.filter(
      (c) => c.split(" - ")[0].trim() !== cleanCode,
    );
    let nextAlts = alts.filter((c) => c.split(" - ")[0].trim() !== cleanCode);
    let nextNotRecs = notRecs.filter(
      (c) => c.split(" - ")[0].trim() !== cleanCode,
    );

    if (!isDef && !isAlt && !isNotRec) {
      nextDefaults.push(cleanCode);
    } else if (isDef) {
      nextAlts.push(cleanCode);
    } else if (isAlt) {
      nextNotRecs.push(cleanCode);
    } // else isNotRec -> all cleared (back to normal)

    updated[indIdx] = {
      ...current,
      defaultIcd10s: nextDefaults,
      betterAlternativeIcd10s: nextAlts,
      notRecommendedIcd10s: nextNotRecs,
    };
    setFormData({ ...formData, indications: updated });
  };

  // PRECAUTIONS HANDLERS
  const getNormalizedPrecautions = (): any[] => {
    if (Array.isArray(formData.precautions)) {
      return formData.precautions.map((p) =>
        typeof p === "string" ? { content: p } : { ...p },
      );
    }
    if (typeof formData.precautions === "string" && (formData.precautions as string).trim()) {
      return [{ content: formData.precautions }];
    }
    return [];
  };

  const handleAddPrecaution = () => {
    const current = getNormalizedPrecautions();
    setFormData({
      ...formData,
      precautions: [
        ...current,
        {
          title: "",
          content: "",
          type: "Other",
          severity: "Cần theo dõi người bệnh",
          icd10s: [],
          drugs: [],
        },
      ],
    });
  };

  const handleRemovePrecaution = (idx: number) => {
    const current = getNormalizedPrecautions();
    const updated = current.filter((_, i) => i !== idx);
    setFormData({ ...formData, precautions: updated });
  };

  const handleMovePrecaution = (idx: number, direction: "up" | "down") => {
    const list = [...getNormalizedPrecautions()];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setFormData({ ...formData, precautions: list });
  };

  const handleUpdatePrecaution = (idx: number, patch: Record<string, any>) => {
    const list = [...getNormalizedPrecautions()];
    list[idx] = { ...list[idx], ...patch };
    setFormData({ ...formData, precautions: list });
  };

  const handleAddIcdToPrecaution = (idx: number, code: string) => {
    const cleanCode = code.split(" - ")[0].trim();
    if (!cleanCode) return;
    const list = [...getNormalizedPrecautions()];
    const currentItem = list[idx] || { content: "" };
    const currentIcds = currentItem.icd10s || [];
    if (!currentIcds.some((c: string) => c.split(" - ")[0].trim() === cleanCode)) {
      list[idx] = {
        ...currentItem,
        icd10s: [...currentIcds, cleanCode],
      };
      setFormData({ ...formData, precautions: list });
    }
    setPrecautionIcdQueries((prev) => ({ ...prev, [idx]: "" }));
    setActivePrecautionIcdSearchRow(null);
  };

  const handleRemoveIcdFromPrecaution = (idx: number, code: string) => {
    const cleanCode = code.split(" - ")[0].trim();
    const list = [...getNormalizedPrecautions()];
    const currentItem = list[idx];
    if (!currentItem) return;
    list[idx] = {
      ...currentItem,
      icd10s: (currentItem.icd10s || []).filter(
        (c: string) => c.split(" - ")[0].trim() !== cleanCode,
      ),
    };
    setFormData({ ...formData, precautions: list });
  };

  const handleAddDrugToPrecaution = (idx: number, drugName: string) => {
    const cleanName = drugName.trim();
    if (!cleanName) return;
    const list = [...getNormalizedPrecautions()];
    const currentItem = list[idx] || { content: "" };
    const currentDrugs = currentItem.drugs || [];
    if (!currentDrugs.some((d: string) => d.toLowerCase() === cleanName.toLowerCase())) {
      list[idx] = {
        ...currentItem,
        drugs: [...currentDrugs, cleanName],
      };
      setFormData({ ...formData, precautions: list });
    }
    setPrecautionDrugQueries((prev) => ({ ...prev, [idx]: "" }));
    setActivePrecautionDrugSearchRow(null);
  };

  const handleRemoveDrugFromPrecaution = (idx: number, drugName: string) => {
    const cleanName = drugName.trim();
    const list = [...getNormalizedPrecautions()];
    const currentItem = list[idx];
    if (!currentItem) return;
    list[idx] = {
      ...currentItem,
      drugs: (currentItem.drugs || []).filter(
        (d: string) => d.toLowerCase() !== cleanName.toLowerCase(),
      ),
    };
    setFormData({ ...formData, precautions: list });
  };

  // ==========================================
  // DOSAGE TAB
  // ==========================================
  if (activeTab === "dosage") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 sm:space-y-8"
      >
        {/* SUBTAB 1: CHỈ ĐỊNH (INDICATIONS) */}
        {activeSubTab === "indications" && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Header / Intro banner */}
            <div
              className={cn(
                "p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                isDarkMode
                  ? "bg-slate-800/40 border-slate-700/80"
                  : "bg-gradient-to-r from-blue-50/80 via-sky-50/50 to-indigo-50/40 border-blue-100 shadow-xs",
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
                  <Tag size={20} />
                </div>
                <div>
                  <h4
                    className={cn(
                      "text-xs sm:text-sm font-black uppercase tracking-wider",
                      isDarkMode ? "text-slate-200" : "text-slate-800",
                    )}
                  >
                    Danh sách Chỉ định & Mã bệnh ICD-10
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Khai báo các bệnh lý / hội chứng chỉ định điều trị và liên
                    kết mã ICD-10 tương ứng
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-bold text-slate-500">
                  Tổng số:{" "}
                  <strong className="text-blue-600">
                    {(formData.indications || []).length}
                  </strong>{" "}
                  chỉ định
                </span>
                <button
                  type="button"
                  onClick={handleAddIndication}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Thêm chỉ định</span>
                </button>
              </div>
            </div>

            {/* List of Indications */}
            <div className="space-y-4">
              {(formData.indications || []).map((item, indIdx) => {
                const currentQuery = indIcdQueries[indIdx] || "";
                const isSearching = activeIcdSearchRow === indIdx;

                // Filter ICD suggestions
                const filteredIcds =
                  currentQuery.trim().length > 0
                    ? icdList
                        .filter((icd) => {
                          const q = currentQuery.toLowerCase().trim();
                          return (
                            icd.code?.toLowerCase().includes(q) ||
                            icd.name?.toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 12)
                    : [];

                return (
                  <div
                    key={indIdx}
                    className={cn(
                      "p-4 sm:p-5 rounded-2xl border transition-all space-y-4",
                      isDarkMode
                        ? "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                        : "bg-slate-50/70 border-slate-200 hover:border-blue-200 shadow-xs",
                    )}
                  >
                    {/* Top Row: Index + Tags Toggle + Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black">
                          #{indIdx + 1}
                        </span>

                        {/* Toggle: Chỉ định chính */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(formData.indications || [])];
                            updated[indIdx] = {
                              ...updated[indIdx],
                              isPrimary: !updated[indIdx].isPrimary,
                            };
                            setFormData({
                              ...formData,
                              indications: updated,
                            });
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1",
                            item.isPrimary
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-2xs"
                              : "bg-transparent border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-600",
                          )}
                        >
                          <span>Chỉ định chính</span>
                          {item.isPrimary && <Check size={11} />}
                        </button>

                        {/* Toggle: Khuyến khích chọn */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(formData.indications || [])];
                            updated[indIdx] = {
                              ...updated[indIdx],
                              isRecommended: !updated[indIdx].isRecommended,
                              isNotRecommended: false,
                            };
                            setFormData({
                              ...formData,
                              indications: updated,
                            });
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1",
                            item.isRecommended
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                              : "bg-transparent border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-600",
                          )}
                        >
                          <ThumbsUp size={10} />
                          <span>Khuyến khích</span>
                          {item.isRecommended && <Check size={11} />}
                        </button>

                        {/* Toggle: Không khuyến khích */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(formData.indications || [])];
                            updated[indIdx] = {
                              ...updated[indIdx],
                              isNotRecommended:
                                !updated[indIdx].isNotRecommended,
                              isRecommended: false,
                            };
                            setFormData({
                              ...formData,
                              indications: updated,
                            });
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1",
                            item.isNotRecommended
                              ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-2xs"
                              : "bg-transparent border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-600",
                          )}
                        >
                          <AlertTriangle size={10} />
                          <span>Không khuyến khích</span>
                          {item.isNotRecommended && <Check size={11} />}
                        </button>
                      </div>

                      {/* Move Up, Down, Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={indIdx === 0}
                          onClick={() => handleMoveIndication(indIdx, "up")}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-all cursor-pointer"
                          title="Di chuyển lên"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={
                            indIdx ===
                            (formData.indications || []).length - 1
                          }
                          onClick={() => handleMoveIndication(indIdx, "down")}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-all cursor-pointer"
                          title="Di chuyển xuống"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveIndication(indIdx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer ml-1"
                          title="Xóa chỉ định này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Inputs: Title & Content */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label
                          className={cn(
                            "block text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1",
                            isDarkMode ? "text-slate-400" : "text-slate-500",
                          )}
                        >
                          Tiêu đề chỉ định
                        </label>
                        <input
                          type="text"
                          value={item.title || ""}
                          onChange={(e) => {
                            const updated = [...(formData.indications || [])];
                            updated[indIdx] = {
                              ...updated[indIdx],
                              title: e.target.value,
                            };
                            setFormData({
                              ...formData,
                              indications: updated,
                            });
                          }}
                          placeholder="VD: Tăng huyết áp nguyên phát..."
                          className={cn(
                            "w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                            isDarkMode
                              ? "bg-slate-900/80 border-slate-700 text-white placeholder-slate-500"
                              : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                          )}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label
                          className={cn(
                            "block text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1",
                            isDarkMode ? "text-slate-400" : "text-slate-500",
                          )}
                        >
                          Nội dung chỉ định chi tiết{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={item.content || ""}
                          onChange={(e) => {
                            const updated = [...(formData.indications || [])];
                            updated[indIdx] = {
                              ...updated[indIdx],
                              content: e.target.value,
                            };
                            setFormData({
                              ...formData,
                              indications: updated,
                            });
                          }}
                          placeholder="Mô tả chi tiết chỉ định điều trị, giai đoạn bệnh, hoặc lưu ý điều trị..."
                          className={cn(
                            "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y",
                            isDarkMode
                              ? "bg-slate-900/80 border-slate-700 text-white placeholder-slate-500"
                              : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                          )}
                        />
                      </div>
                    </div>

                    {/* Linked ICD-10 Codes Section */}
                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Tag size={13} className="text-blue-500" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Mã ICD-10 liên kết ({item.icd10s?.length || 0})
                          </span>
                          <span className="text-[9px] text-slate-400 italic">
                            (Bấm vào thẻ mã để đổi trạng thái: Ưu tiên / Thay thế
                            / Không khuyến khích)
                          </span>
                        </div>
                      </div>

                      {/* Displayed ICD tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {(item.icd10s || []).map((icdCode, cIdx) => {
                          const codeOnly = icdCode.split(" - ")[0].trim();
                          const icdDesc =
                            getIcdName(codeOnly) ||
                            (icdCode.includes(" - ")
                              ? icdCode.split(" - ").slice(1).join(" - ")
                              : "");

                          const isDefault = (
                            item.defaultIcd10s || []
                          ).some(
                            (c) => c.split(" - ")[0].trim() === codeOnly,
                          );
                          const isAlt = (
                            item.betterAlternativeIcd10s || []
                          ).some(
                            (c) => c.split(" - ")[0].trim() === codeOnly,
                          );
                          const isNotRec = (
                            item.notRecommendedIcd10s || []
                          ).some(
                            (c) => c.split(" - ")[0].trim() === codeOnly,
                          );

                          return (
                            <div
                              key={cIdx}
                              className={cn(
                                "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all shadow-2xs",
                                isDefault
                                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                  : isAlt
                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400"
                                    : isNotRec
                                      ? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400"
                                      : isDarkMode
                                        ? "bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-500"
                                        : "bg-white border-slate-200 text-slate-700 hover:border-blue-400",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleCycleIcdStatus(indIdx, icdCode)
                                }
                                className="inline-flex items-center gap-1 cursor-pointer"
                                title="Bấm để chuyển trạng thái phân loại"
                              >
                                {isDefault && (
                                  <ThumbsUp
                                    size={11}
                                    className="fill-current text-emerald-500"
                                  />
                                )}
                                {isAlt && (
                                  <AlertCircle
                                    size={11}
                                    className="text-amber-500"
                                  />
                                )}
                                {isNotRec && (
                                  <AlertTriangle
                                    size={11}
                                    className="fill-current text-rose-500"
                                  />
                                )}
                                <span className="font-black text-blue-600 dark:text-blue-400">
                                  {codeOnly}
                                </span>
                                {icdDesc && (
                                  <span className="font-normal opacity-80 max-w-[180px] truncate text-[11px]">
                                    - {icdDesc}
                                  </span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveIcdFromIndication(
                                    indIdx,
                                    icdCode,
                                  )
                                }
                                className="text-slate-400 hover:text-rose-500 p-0.5 rounded-full transition-colors cursor-pointer"
                                title="Xóa mã này khỏi chỉ định"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}

                        {(item.icd10s || []).length === 0 && (
                          <span className="text-[11px] text-slate-400 italic py-0.5">
                            Chưa gán mã ICD-10 nào cho chỉ định này.
                          </span>
                        )}
                      </div>

                      {/* Add ICD-10 Search & Suggestion input */}
                      <div className="relative">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              type="text"
                              value={currentQuery}
                              onFocus={() => setActiveIcdSearchRow(indIdx)}
                              onChange={(e) => {
                                setIndIcdQueries((prev) => ({
                                  ...prev,
                                  [indIdx]: e.target.value,
                                }));
                                setActiveIcdSearchRow(indIdx);
                              }}
                              placeholder="Nhập mã ICD-10 hoặc tên bệnh để tìm & gán (VD: I10, E11, tăng huyết áp...)"
                              className={cn(
                                "w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                isDarkMode
                                  ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                              )}
                            />
                            {currentQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIndIcdQueries((prev) => ({
                                    ...prev,
                                    [indIdx]: "",
                                  }));
                                  setActiveIcdSearchRow(null);
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          {currentQuery.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAddIcdToIndication(
                                  indIdx,
                                  currentQuery.trim().toUpperCase(),
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                            >
                              + Thêm "{currentQuery.trim().toUpperCase()}"
                            </button>
                          )}
                        </div>

                        {/* Dropdown Suggestions */}
                        {isSearching && filteredIcds.length > 0 && (
                          <div
                            className={cn(
                              "absolute left-0 right-0 top-full mt-1.5 p-1.5 rounded-2xl border shadow-xl z-50 max-h-56 overflow-y-auto custom-scrollbar",
                              isDarkMode
                                ? "bg-slate-900 border-slate-700"
                                : "bg-white border-slate-200 shadow-blue-500/10",
                            )}
                          >
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                              Gợi ý mã ICD-10:
                            </div>
                            {filteredIcds.map((icd, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() =>
                                  handleAddIcdToIndication(indIdx, icd.code)
                                }
                                className={cn(
                                  "w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer",
                                  isDarkMode
                                    ? "hover:bg-slate-800 text-slate-200"
                                    : "hover:bg-blue-50 text-slate-800",
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-blue-600 dark:text-blue-400">
                                    {icd.code}
                                  </span>
                                  <span className="text-[11px] font-medium">
                                    {icd.name}
                                  </span>
                                </div>
                                {icd.chapter && (
                                  <span className="text-[9px] text-slate-400 opacity-60">
                                    {icd.chapter}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quick chips suggestions */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Mã phổ biến:
                        </span>
                        {commonIcdSuggestions.slice(0, 7).map((sug) => (
                          <button
                            key={sug.code}
                            type="button"
                            onClick={() =>
                              handleAddIcdToIndication(indIdx, sug.code)
                            }
                            className={cn(
                              "px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer",
                              (item.icd10s || []).some(
                                (c) =>
                                  c.split(" - ")[0].trim() === sug.code,
                              )
                                ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400"
                                : isDarkMode
                                  ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 shadow-2xs",
                            )}
                            disabled={(item.icd10s || []).some(
                              (c) => c.split(" - ")[0].trim() === sug.code,
                            )}
                          >
                            + {sug.code} ({sug.name.split(" ")[0]}...)
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {(formData.indications || []).length === 0 && (
                <div
                  className={cn(
                    "p-8 sm:p-12 rounded-3xl border text-center space-y-3",
                    isDarkMode
                      ? "bg-slate-800/20 border-slate-800"
                      : "bg-slate-50 border-slate-200/80",
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                    <Tag size={24} />
                  </div>
                  <h4
                    className={cn(
                      "text-sm font-bold",
                      isDarkMode ? "text-slate-300" : "text-slate-700",
                    )}
                  >
                    Chưa có chỉ định nào được tạo
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Khai báo chỉ định giúp bác sĩ và dược sĩ tra cứu phác đồ điều
                    trị, kiểm tra tương tác chỉ định và liên kết mã ICD-10 khi kê
                    đơn.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddIndication}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Thêm chỉ định đầu tiên</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 2: LIỀU DÙNG (ADMINISTRATION) */}
        {activeSubTab === "administration" && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Section 1: Hướng dẫn dùng chung */}
            <div
              className={cn(
                "p-4 sm:p-6 rounded-3xl border transition-all space-y-4",
                isDarkMode
                  ? "bg-slate-800/40 border-slate-700"
                  : "bg-slate-50 border-slate-100 shadow-sm",
              )}
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-700">
                <Clock className="text-blue-500" size={18} />
                <h4
                  className={cn(
                    "text-xs sm:text-sm font-black uppercase tracking-wider",
                    isDarkMode ? "text-slate-200" : "text-slate-800",
                  )}
                >
                  Thông tin dùng thuốc chung
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tuyến đường dùng */}
                <div>
                  <label
                    className={cn(
                      "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                      isDarkMode ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Đường dùng thuốc
                  </label>
                  <input
                    type="text"
                    list="administration-routes"
                    value={formData.administrationRoute || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        administrationRoute: e.target.value,
                      })
                    }
                    placeholder="VD: Đường uống, Tiêm tĩnh mạch, Tiêm bắp..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                    )}
                  />
                  <datalist id="administration-routes">
                    <option value="Đường uống" />
                    <option value="Tiêm tĩnh mạch (IV)" />
                    <option value="Tiêm bắp (IM)" />
                    <option value="Truyền tĩnh mạch" />
                    <option value="Tiêm dưới da (SC)" />
                    <option value="Ngậm dưới lưỡi" />
                    <option value="Khí dung / Hít" />
                    <option value="Đặt trực tràng" />
                    <option value="Nhỏ mắt" />
                    <option value="Nhỏ tai" />
                    <option value="Bôi ngoài da" />
                  </datalist>
                </div>

                {/* Thời điểm uống chung */}
                <div>
                  <label
                    className={cn(
                      "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                      isDarkMode ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Thời điểm dùng thuốc chung
                  </label>
                  <input
                    type="text"
                    list="administration-times"
                    value={formData.generalAdministrationTime || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAdministrationTime: e.target.value,
                      })
                    }
                    placeholder="VD: Sau bữa ăn no, Trước ăn 30 phút..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                    )}
                  />
                  <datalist id="administration-times">
                    <option value="Trước bữa ăn 30 phút" />
                    <option value="Sau bữa ăn no" />
                    <option value="Cùng với bữa ăn" />
                    <option value="Uống lúc đói (xa bữa ăn)" />
                    <option value="Trước khi đi ngủ" />
                    <option value="Bất kỳ thời điểm nào trong ngày" />
                  </datalist>
                </div>

                {/* Hướng dẫn dùng chung */}
                <div className="md:col-span-2">
                  <label
                    className={cn(
                      "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                      isDarkMode ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Hướng dẫn cách dùng chung (Lời khuyên khi dùng thuốc)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.generalAdministration || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAdministration: e.target.value,
                      })
                    }
                    placeholder="VD: Uống nguyên viên với một cốc nước đầy. Không được bẻ, nghiền hoặc nhai viên thuốc..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                    )}
                  />
                </div>

                {/* Tóm tắt liều dùng */}
                <div className="md:col-span-2">
                  <label
                    className={cn(
                      "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                      isDarkMode ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Tóm tắt liều dùng chung
                  </label>
                  <textarea
                    rows={3}
                    value={formData.dosage || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dosage: e.target.value,
                      })
                    }
                    placeholder="VD: Người lớn: 500mg x 2-3 lần/ngày. Trẻ em: 10-15 mg/kg/lần mỗi 4-6 giờ. Liều tối đa không quá 4000mg/ngày..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Phân nhóm đối tượng & Phác đồ liều dùng chuyên sâu */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className={cn(
                      "text-xs sm:text-sm font-black uppercase tracking-wider",
                      isDarkMode ? "text-slate-200" : "text-slate-800",
                    )}
                  >
                    Phác đồ liều chi tiết theo nhóm đối tượng
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Khai báo liều theo từng đối tượng: Người lớn, Trẻ em, Bệnh
                    nhân suy thận, Suy gan, Người cao tuổi...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentGroups =
                      formData.dosageAndAdministration || [];
                    setFormData({
                      ...formData,
                      dosageAndAdministration: [
                        ...currentGroups,
                        {
                          category: "Người lớn",
                          groupTitle: "Người lớn & Trẻ vị thành niên",
                          content: "",
                          administrationTime: "",
                          schedules: [],
                        },
                      ],
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Thêm nhóm đối tượng</span>
                </button>
              </div>

              {/* Group items */}
              {(formData.dosageAndAdministration || []).map((grp, gIdx) => (
                <div
                  key={gIdx}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border transition-all space-y-4",
                    isDarkMode
                      ? "bg-slate-800/40 border-slate-700"
                      : "bg-slate-50/70 border-slate-200 shadow-xs",
                  )}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black">
                        #{gIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={grp.groupTitle || grp.category || ""}
                        onChange={(e) => {
                          const updated = [
                            ...(formData.dosageAndAdministration || []),
                          ];
                          updated[gIdx] = {
                            ...updated[gIdx],
                            groupTitle: e.target.value,
                            category: e.target.value,
                          };
                          setFormData({
                            ...formData,
                            dosageAndAdministration: updated,
                          });
                        }}
                        placeholder="Tên nhóm đối tượng (VD: Người lớn, Suy thận CrCl < 30...)"
                        className={cn(
                          "px-2.5 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-800",
                        )}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = (
                          formData.dosageAndAdministration || []
                        ).filter((_, i) => i !== gIdx);
                        setFormData({
                          ...formData,
                          dosageAndAdministration: updated,
                        });
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Clinical parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Tuổi tối thiểu (tuổi)
                      </span>
                      <input
                        type="number"
                        value={grp.ageMin ?? ""}
                        onChange={(e) => {
                          const updated = [
                            ...(formData.dosageAndAdministration || []),
                          ];
                          updated[gIdx] = {
                            ...updated[gIdx],
                            ageMin:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          };
                          setFormData({
                            ...formData,
                            dosageAndAdministration: updated,
                          });
                        }}
                        placeholder="VD: 18"
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-lg border text-xs",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-800",
                        )}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Tuổi tối đa (tuổi)
                      </span>
                      <input
                        type="number"
                        value={grp.ageMax ?? ""}
                        onChange={(e) => {
                          const updated = [
                            ...(formData.dosageAndAdministration || []),
                          ];
                          updated[gIdx] = {
                            ...updated[gIdx],
                            ageMax:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          };
                          setFormData({
                            ...formData,
                            dosageAndAdministration: updated,
                          });
                        }}
                        placeholder="VD: 65"
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-lg border text-xs",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-800",
                        )}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        CrCl Min (ml/phút)
                      </span>
                      <input
                        type="number"
                        value={grp.crclMin ?? ""}
                        onChange={(e) => {
                          const updated = [
                            ...(formData.dosageAndAdministration || []),
                          ];
                          updated[gIdx] = {
                            ...updated[gIdx],
                            crclMin:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          };
                          setFormData({
                            ...formData,
                            dosageAndAdministration: updated,
                          });
                        }}
                        placeholder="VD: 30"
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-lg border text-xs",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-800",
                        )}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        CrCl Max (ml/phút)
                      </span>
                      <input
                        type="number"
                        value={grp.crclMax ?? ""}
                        onChange={(e) => {
                          const updated = [
                            ...(formData.dosageAndAdministration || []),
                          ];
                          updated[gIdx] = {
                            ...updated[gIdx],
                            crclMax:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          };
                          setFormData({
                            ...formData,
                            dosageAndAdministration: updated,
                          });
                        }}
                        placeholder="VD: 60"
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-lg border text-xs",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-800",
                        )}
                      />
                    </div>
                  </div>

                  {/* Content textarea */}
                  <div>
                    <label
                      className={cn(
                        "block text-[10px] font-black uppercase tracking-wider mb-1",
                        isDarkMode ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      Hướng dẫn liều chi tiết
                    </label>
                    <textarea
                      rows={3}
                      value={grp.content || ""}
                      onChange={(e) => {
                        const updated = [
                          ...(formData.dosageAndAdministration || []),
                        ];
                        updated[gIdx] = {
                          ...updated[gIdx],
                          content: e.target.value,
                        };
                        setFormData({
                          ...formData,
                          dosageAndAdministration: updated,
                        });
                      }}
                      placeholder="Hướng dẫn liều dùng, chỉnh liều hoặc khoảng cách liều cho nhóm đối tượng này..."
                      className={cn(
                        "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y",
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                          : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ==========================================
  // WARNINGS TAB
  // ==========================================
  if (activeTab === "warnings") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 sm:space-y-8"
      >
        {/* SUBTAB 1: CHỐNG CHỈ ĐỊNH (CONTRA) */}
        {activeSubTab === "contra" && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            <div
              className={cn(
                "p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                isDarkMode
                  ? "bg-slate-800/40 border-slate-700/80"
                  : "bg-gradient-to-r from-rose-50/80 via-red-50/50 to-orange-50/40 border-rose-100 shadow-xs",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2.5 rounded-2xl shrink-0",
                    isDarkMode
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-rose-600 text-white shadow-md shadow-rose-500/20",
                  )}
                >
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h4
                    className={cn(
                      "text-xs sm:text-sm font-black uppercase tracking-wider",
                      isDarkMode ? "text-slate-200" : "text-slate-800",
                    )}
                  >
                    Danh sách Chống chỉ định
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Các trường hợp tuyệt đối hoặc tương đối không được sử dụng
                    thuốc
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    contraindications: [
                      ...(formData.contraindications || []),
                      { content: "", type: "Other", icd10s: [] },
                    ],
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm chống chỉ định</span>
              </button>
            </div>

            <div className="space-y-4">
              {(formData.contraindications || []).map((contra, cIdx) => (
                <div
                  key={cIdx}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border transition-all space-y-3",
                    isDarkMode
                      ? "bg-slate-800/40 border-slate-700"
                      : "bg-slate-50/70 border-slate-200 shadow-xs",
                  )}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-black">
                        #{cIdx + 1}
                      </span>
                      <select
                        value={contra.type || "Other"}
                        onChange={(e) => {
                          const updated = [
                            ...(formData.contraindications || []),
                          ];
                          updated[cIdx] = {
                            ...updated[cIdx],
                            type: e.target.value as any,
                          };
                          setFormData({
                            ...formData,
                            contraindications: updated,
                          });
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-500",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-800",
                        )}
                      >
                        <option value="Other">Chung / Khác</option>
                        <option value="ICD-10">Bệnh lý (ICD-10)</option>
                        <option value="Drug">Dị ứng / Thành phần</option>
                        <option value="Age">Độ tuổi</option>
                        <option value="Weight">Cân nặng</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = (
                          formData.contraindications || []
                        ).filter((_, i) => i !== cIdx);
                        setFormData({
                          ...formData,
                          contraindications: updated,
                        });
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <label
                      className={cn(
                        "block text-[10px] font-black uppercase tracking-wider mb-1",
                        isDarkMode ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      Nội dung chống chỉ định
                    </label>
                    <textarea
                      rows={2}
                      value={contra.content || ""}
                      onChange={(e) => {
                        const updated = [
                          ...(formData.contraindications || []),
                        ];
                        updated[cIdx] = {
                          ...updated[cIdx],
                          content: e.target.value,
                        };
                        setFormData({
                          ...formData,
                          contraindications: updated,
                        });
                      }}
                      placeholder="Mô tả chi tiết trường hợp chống chỉ định..."
                      className={cn(
                        "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-y",
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                          : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                      )}
                    />
                  </div>
                </div>
              ))}

              {(formData.contraindications || []).length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                  Chưa có chống chỉ định nào. Bấm nút "+ Thêm chống chỉ định" để
                  bổ sung.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 2: THẬN TRỌNG (SPECIAL) */}
        {activeSubTab === "special" && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Header Banner */}
            <div
              className={cn(
                "p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                isDarkMode
                  ? "bg-slate-800/40 border-slate-700/80"
                  : "bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-yellow-50/40 border-amber-100 shadow-xs",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2.5 rounded-2xl shrink-0",
                    isDarkMode
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-amber-600 text-white shadow-md shadow-amber-500/20",
                  )}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4
                    className={cn(
                      "text-xs sm:text-sm font-black uppercase tracking-wider",
                      isDarkMode ? "text-slate-200" : "text-slate-800",
                    )}
                  >
                    Danh sách Cảnh báo & Thận trọng khi dùng thuốc
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Các lưu ý đặc biệt, theo dõi chức năng gan/thận/điện giải đồ, nguy cơ tiềm ẩn hoặc phân loại theo bệnh lý ICD-10, độ tuổi, cân nặng
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddPrecaution}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Thêm thận trọng</span>
              </button>
            </div>

            {/* Quick suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Sparkles size={12} className="text-amber-500" />
                Gợi ý nhanh:
              </span>
              {[
                { title: "Theo dõi chức năng gan", content: "Cần định kỳ xét nghiệm men gan (ALT, AST) trước và trong quá trình điều trị.", type: "Other", severity: "Cần theo dõi điều trị" },
                { title: "Theo dõi chức năng thận", content: "Đánh giá mức lọc cầu thận (eGFR) và creatinin huyết thanh, điều chỉnh liều nếu suy giảm chức năng thận.", type: "Other", severity: "Cần theo dõi điều trị" },
                { title: "Nguy cơ kéo dài khoảng QT", content: "Thận trọng khi dùng cho bệnh nhân có tiền sử rối loạn nhịp tim hoặc phối hợp với thuốc làm kéo dài khoảng QT.", type: "Other", severity: "Cần cân nhắc lợi, hại" },
                { title: "Bệnh nhân đái tháo đường", content: "Nguy cơ ảnh hưởng đường huyết, cần theo dõi đường huyết chặt chẽ.", type: "ICD-10", severity: "Cần theo dõi người bệnh", icd10s: ["E11"] },
                { title: "Người cao tuổi (≥ 65 tuổi)", content: "Người cao tuổi thường nhạy cảm hơn với tác dụng phụ, nên bắt đầu bằng liều thấp nhất có hiệu quả.", type: "Age", severity: "Cần theo dõi người bệnh", ageConfig: { operator: "≥", value: 65, unit: "years" } },
              ].map((sug, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => {
                    const current = getNormalizedPrecautions();
                    setFormData({
                      ...formData,
                      precautions: [
                        ...current,
                        {
                          title: sug.title,
                          content: sug.content,
                          type: sug.type as any,
                          severity: sug.severity as any,
                          icd10s: (sug as any).icd10s || [],
                          ageConfig: (sug as any).ageConfig || undefined,
                        },
                      ],
                    });
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer",
                    isDarkMode
                      ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-400"
                      : "bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-700 shadow-2xs",
                  )}
                >
                  <Plus size={10} className="text-amber-500" />
                  <span>{sug.title}</span>
                </button>
              ))}
            </div>

            {/* List of Precautions */}
            <div className="space-y-4">
              {getNormalizedPrecautions().map((prec, pIdx) => {
                const pType = prec.type || "Other";
                const pSeverity = prec.severity || "";
                const icdQuery = precautionIcdQueries[pIdx] || "";
                const drugQuery = precautionDrugQueries[pIdx] || "";

                // Filter ICDs for this row
                const filteredIcds = icdQuery.trim()
                  ? icdList
                      .filter((item) => {
                        const q = icdQuery.toLowerCase();
                        return (
                          item.code?.toLowerCase().includes(q) ||
                          item.name?.toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 8)
                  : [];

                // Filter Drugs for this row
                const filteredDrugs = drugQuery.trim()
                  ? drugs
                      .filter((d) => {
                        const q = drugQuery.toLowerCase();
                        return (
                          d.name?.toLowerCase().includes(q) ||
                          (d.activeIngredients || []).some((ing) =>
                            ing.name?.toLowerCase().includes(q),
                          )
                        );
                      })
                      .slice(0, 8)
                  : [];

                return (
                  <div
                    key={pIdx}
                    className={cn(
                      "p-4 sm:p-5 rounded-2xl border transition-all space-y-4",
                      isDarkMode
                        ? "bg-slate-800/40 border-slate-700"
                        : "bg-slate-50/70 border-slate-200 shadow-xs",
                    )}
                  >
                    {/* Item Top Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-black">
                          #{pIdx + 1}
                        </span>

                        {/* Precaution Type Selector */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">
                            Loại:
                          </label>
                          <select
                            value={pType}
                            onChange={(e) =>
                              handleUpdatePrecaution(pIdx, {
                                type: e.target.value,
                              })
                            }
                            className={cn(
                              "px-2.5 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500",
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-800",
                            )}
                          >
                            <option value="Other">Chung / Lâm sàng</option>
                            <option value="ICD-10">Bệnh lý (ICD-10)</option>
                            <option value="Drug">Tương tác / Hoạt chất</option>
                            <option value="Age">Độ tuổi</option>
                            <option value="Weight">Cân nặng</option>
                          </select>
                        </div>

                        {/* Severity Selector */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">
                            Mức độ:
                          </label>
                          <select
                            value={pSeverity}
                            onChange={(e) =>
                              handleUpdatePrecaution(pIdx, {
                                severity: e.target.value,
                              })
                            }
                            className={cn(
                              "px-2.5 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500",
                              pSeverity === "Cần theo dõi điều trị"
                                ? "text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800"
                                : pSeverity === "Cần theo dõi người bệnh"
                                  ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                                  : pSeverity === "Cần cân nhắc lợi, hại"
                                    ? "text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800"
                                    : pSeverity === "Phối hợp nguy hiểm"
                                      ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                                      : pSeverity === "Chống chỉ định"
                                        ? "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
                                        : isDarkMode
                                          ? "bg-slate-900 border-slate-700 text-white"
                                          : "bg-white border-slate-200 text-slate-800",
                            )}
                          >
                            <option value="">-- Chọn mức độ --</option>
                            <option value="Cần theo dõi điều trị">
                              Cần theo dõi điều trị
                            </option>
                            <option value="Cần theo dõi người bệnh">
                              Cần theo dõi người bệnh
                            </option>
                            <option value="Cần cân nhắc lợi, hại">
                              Cần cân nhắc lợi, hại
                            </option>
                            <option value="Phối hợp nguy hiểm">
                              Phối hợp nguy hiểm
                            </option>
                            <option value="Chống chỉ định">
                              Chống chỉ định
                            </option>
                          </select>
                        </div>
                      </div>

                      {/* Action buttons: Move Up/Down, Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={pIdx === 0}
                          onClick={() => handleMovePrecaution(pIdx, "up")}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          title="Di chuyển lên"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={pIdx === getNormalizedPrecautions().length - 1}
                          onClick={() => handleMovePrecaution(pIdx, "down")}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          title="Di chuyển xuống"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePrecaution(pIdx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer ml-1"
                          title="Xóa thận trọng này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Precaution Title */}
                    <div>
                      <label
                        className={cn(
                          "block text-[10px] font-black uppercase tracking-wider mb-1",
                          isDarkMode ? "text-slate-400" : "text-slate-500",
                        )}
                      >
                        Tiêu đề thận trọng / cảnh báo
                      </label>
                      <input
                        type="text"
                        value={prec.title || ""}
                        onChange={(e) =>
                          handleUpdatePrecaution(pIdx, {
                            title: e.target.value,
                          })
                        }
                        placeholder="VD: Suy giảm chức năng gan/thận, Kéo dài khoảng QT, Bệnh nhân đái tháo đường..."
                        className={cn(
                          "w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                            : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                        )}
                      />
                    </div>

                    {/* Precaution Content */}
                    <div>
                      <label
                        className={cn(
                          "block text-[10px] font-black uppercase tracking-wider mb-1",
                          isDarkMode ? "text-slate-400" : "text-slate-500",
                        )}
                      >
                        Nội dung chi tiết cảnh báo & thận trọng
                      </label>
                      <textarea
                        rows={2}
                        value={prec.content || ""}
                        onChange={(e) =>
                          handleUpdatePrecaution(pIdx, {
                            content: e.target.value,
                          })
                        }
                        placeholder="Mô tả chi tiết nội dung thận trọng, chỉ số xét nghiệm cần theo dõi, triệu chứng lâm sàng cần chú ý và cách phòng ngừa/xử trí..."
                        className={cn(
                          "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-y",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                            : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
                        )}
                      />
                    </div>

                    {/* CONDITIONAL: ICD-10 SECTION */}
                    {(pType === "ICD-10" || (prec.icd10s && prec.icd10s.length > 0)) && (
                      <div
                        className={cn(
                          "p-3 rounded-xl border space-y-2",
                          isDarkMode
                            ? "bg-slate-900/60 border-slate-700"
                            : "bg-amber-50/40 border-amber-200/60",
                        )}
                      >
                        <label className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Tag size={12} />
                          Mã bệnh lý ICD-10 cần thận trọng
                        </label>

                        {/* Selected ICD Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {(prec.icd10s || []).map((code: string, cIdx: number) => {
                            const name = getIcdName(code);
                            return (
                              <span
                                key={cIdx}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border",
                                  isDarkMode
                                    ? "bg-amber-950/40 text-amber-300 border-amber-800"
                                    : "bg-amber-100/80 text-amber-800 border-amber-300",
                                )}
                              >
                                <span>{code}</span>
                                {name && (
                                  <span className="text-[10px] font-normal opacity-80 max-w-[150px] truncate">
                                    - {name}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveIcdFromPrecaution(pIdx, code)
                                  }
                                  className="ml-0.5 hover:text-rose-500 cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })}
                        </div>

                        {/* ICD Search Input */}
                        <div className="relative">
                          <div className="relative flex items-center">
                            <Search
                              size={14}
                              className="absolute left-2.5 text-slate-400 pointer-events-none"
                            />
                            <input
                              type="text"
                              value={icdQuery}
                              onFocus={() =>
                                setActivePrecautionIcdSearchRow(pIdx)
                              }
                              onChange={(e) =>
                                setPrecautionIcdQueries((prev) => ({
                                  ...prev,
                                  [pIdx]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (icdQuery.trim()) {
                                    handleAddIcdToPrecaution(
                                      pIdx,
                                      icdQuery.trim(),
                                    );
                                  }
                                }
                              }}
                              placeholder="Tìm kiếm mã hoặc tên bệnh ICD-10 (nhấn Enter để thêm)..."
                              className={cn(
                                "w-full pl-8 pr-16 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500",
                                isDarkMode
                                  ? "bg-slate-900 border-slate-700 text-white"
                                  : "bg-white border-slate-200 text-slate-800",
                              )}
                            />
                            {icdQuery.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddIcdToPrecaution(
                                    pIdx,
                                    icdQuery.trim(),
                                  )
                                }
                                className="absolute right-1 px-2 py-1 rounded bg-amber-600 text-white text-[10px] font-bold cursor-pointer hover:bg-amber-700"
                              >
                                Thêm
                              </button>
                            )}
                          </div>

                          {/* Dropdown suggestions */}
                          {activePrecautionIcdSearchRow === pIdx &&
                            filteredIcds.length > 0 && (
                              <div
                                className={cn(
                                  "absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-lg divide-y",
                                  isDarkMode
                                    ? "bg-slate-900 border-slate-700 divide-slate-800"
                                    : "bg-white border-slate-200 divide-slate-100",
                                )}
                              >
                                {filteredIcds.map((item, dIdx) => (
                                  <button
                                    key={dIdx}
                                    type="button"
                                    onClick={() =>
                                      handleAddIcdToPrecaution(
                                        pIdx,
                                        item.code,
                                      )
                                    }
                                    className={cn(
                                      "w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer",
                                      isDarkMode
                                        ? "text-slate-200"
                                        : "text-slate-800",
                                    )}
                                  >
                                    <span className="font-bold text-amber-600 dark:text-amber-400">
                                      {item.code}
                                    </span>
                                    <span className="truncate flex-1 text-slate-500">
                                      {item.name}
                                    </span>
                                    <Plus size={12} className="text-amber-500 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {/* CONDITIONAL: DRUG / ACTIVE INGREDIENT SECTION */}
                    {(pType === "Drug" || (prec.drugs && prec.drugs.length > 0)) && (
                      <div
                        className={cn(
                          "p-3 rounded-xl border space-y-2",
                          isDarkMode
                            ? "bg-slate-900/60 border-slate-700"
                            : "bg-orange-50/40 border-orange-200/60",
                        )}
                      >
                        <label className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                          <Zap size={12} />
                          Thuốc / Hoạt chất cần lưu ý thận trọng khi phối hợp
                        </label>

                        {/* Selected Drugs */}
                        <div className="flex flex-wrap gap-1.5">
                          {(prec.drugs || []).map((dName: string, dIdx: number) => (
                            <span
                              key={dIdx}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border",
                                isDarkMode
                                  ? "bg-orange-950/40 text-orange-300 border-orange-800"
                                  : "bg-orange-100/80 text-orange-800 border-orange-300",
                              )}
                            >
                              <span>{dName}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveDrugFromPrecaution(pIdx, dName)
                                }
                                className="ml-0.5 hover:text-rose-500 cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Drug Search Input */}
                        <div className="relative">
                          <div className="relative flex items-center">
                            <Search
                              size={14}
                              className="absolute left-2.5 text-slate-400 pointer-events-none"
                            />
                            <input
                              type="text"
                              value={drugQuery}
                              onFocus={() =>
                                setActivePrecautionDrugSearchRow(pIdx)
                              }
                              onChange={(e) =>
                                setPrecautionDrugQueries((prev) => ({
                                  ...prev,
                                  [pIdx]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (drugQuery.trim()) {
                                    handleAddDrugToPrecaution(
                                      pIdx,
                                      drugQuery.trim(),
                                    );
                                  }
                                }
                              }}
                              placeholder="Tìm tên thuốc hoặc hoạt chất (nhấn Enter để thêm)..."
                              className={cn(
                                "w-full pl-8 pr-16 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500",
                                isDarkMode
                                  ? "bg-slate-900 border-slate-700 text-white"
                                  : "bg-white border-slate-200 text-slate-800",
                              )}
                            />
                            {drugQuery.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddDrugToPrecaution(
                                    pIdx,
                                    drugQuery.trim(),
                                  )
                                }
                                className="absolute right-1 px-2 py-1 rounded bg-orange-600 text-white text-[10px] font-bold cursor-pointer hover:bg-orange-700"
                              >
                                Thêm
                              </button>
                            )}
                          </div>

                          {/* Dropdown suggestions */}
                          {activePrecautionDrugSearchRow === pIdx &&
                            filteredDrugs.length > 0 && (
                              <div
                                className={cn(
                                  "absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-lg divide-y",
                                  isDarkMode
                                    ? "bg-slate-900 border-slate-700 divide-slate-800"
                                    : "bg-white border-slate-200 divide-slate-100",
                                )}
                              >
                                {filteredDrugs.map((item, dIdx) => (
                                  <button
                                    key={dIdx}
                                    type="button"
                                    onClick={() =>
                                      handleAddDrugToPrecaution(
                                        pIdx,
                                        item.name,
                                      )
                                    }
                                    className={cn(
                                      "w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors cursor-pointer",
                                      isDarkMode
                                        ? "text-slate-200"
                                        : "text-slate-800",
                                    )}
                                  >
                                    <span className="font-bold text-orange-600 dark:text-orange-400">
                                      {item.name}
                                    </span>
                                    <span className="truncate flex-1 text-slate-500">
                                      {(item.activeIngredients || [])
                                        .map((i) => i.name)
                                        .join(", ")}
                                    </span>
                                    <Plus size={12} className="text-orange-500 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {/* CONDITIONAL: AGE CONFIG SECTION */}
                    {pType === "Age" && (
                      <div
                        className={cn(
                          "p-3 rounded-xl border space-y-2",
                          isDarkMode
                            ? "bg-slate-900/60 border-slate-700"
                            : "bg-sky-50/40 border-sky-200/60",
                        )}
                      >
                        <label className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                          <Baby size={12} />
                          Cấu hình độ tuổi cần thận trọng
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={prec.ageConfig?.operator || "<"}
                            onChange={(e) =>
                              handleUpdatePrecaution(pIdx, {
                                ageConfig: {
                                  ...prec.ageConfig,
                                  operator: e.target.value,
                                },
                              })
                            }
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg border text-xs font-bold",
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-800",
                            )}
                          >
                            <option value="<">Nhỏ hơn (&lt;)</option>
                            <option value="≤">Nhỏ hơn hoặc bằng (≤)</option>
                            <option value=">">Lớn hơn (&gt;)</option>
                            <option value="≥">Lớn hơn hoặc bằng (≥)</option>
                          </select>

                          <input
                            type="number"
                            value={prec.ageConfig?.value ?? ""}
                            onChange={(e) =>
                              handleUpdatePrecaution(pIdx, {
                                ageConfig: {
                                  ...prec.ageConfig,
                                  value: e.target.value
                                    ? Number(e.target.value)
                                    : "",
                                },
                              })
                            }
                            placeholder="Số tuổi"
                            className={cn(
                              "w-24 px-2.5 py-1.5 rounded-lg border text-xs font-bold",
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-800",
                            )}
                          />

                          <select
                            value={prec.ageConfig?.unit || "years"}
                            onChange={(e) =>
                              handleUpdatePrecaution(pIdx, {
                                ageConfig: {
                                  ...prec.ageConfig,
                                  unit: e.target.value,
                                },
                              })
                            }
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg border text-xs font-bold",
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-800",
                            )}
                          >
                            <option value="years">Tuổi (Năm)</option>
                            <option value="months">Tháng tuổi</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* CONDITIONAL: WEIGHT CONFIG SECTION */}
                    {pType === "Weight" && (
                      <div
                        className={cn(
                          "p-3 rounded-xl border space-y-2",
                          isDarkMode
                            ? "bg-slate-900/60 border-slate-700"
                            : "bg-emerald-50/40 border-emerald-200/60",
                        )}
                      >
                        <label className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Activity size={12} />
                          Cấu hình cân nặng cần thận trọng
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={prec.weightConfig?.operator || "<"}
                            onChange={(e) =>
                              handleUpdatePrecaution(pIdx, {
                                weightConfig: {
                                  ...prec.weightConfig,
                                  operator: e.target.value,
                                },
                              })
                            }
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg border text-xs font-bold",
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-800",
                            )}
                          >
                            <option value="<">Nhỏ hơn (&lt;)</option>
                            <option value="≤">Nhỏ hơn hoặc bằng (≤)</option>
                            <option value=">">Lớn hơn (&gt;)</option>
                            <option value="≥">Lớn hơn hoặc bằng (≥)</option>
                          </select>

                          <input
                            type="number"
                            value={prec.weightConfig?.value ?? ""}
                            onChange={(e) =>
                              handleUpdatePrecaution(pIdx, {
                                weightConfig: {
                                  ...prec.weightConfig,
                                  value: e.target.value
                                    ? Number(e.target.value)
                                    : "",
                                },
                              })
                            }
                            placeholder="Số cân nặng"
                            className={cn(
                              "w-28 px-2.5 py-1.5 rounded-lg border text-xs font-bold",
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-800",
                            )}
                          />

                          <select
                            value={prec.weightConfig?.unit || "kg"}
                            onChange={(e) =>
                              handleUpdatePrecaution(pIdx, {
                                weightConfig: {
                                  ...prec.weightConfig,
                                  unit: e.target.value,
                                },
                              })
                            }
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg border text-xs font-bold",
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-800",
                            )}
                          >
                            <option value="kg">Kilogram (kg)</option>
                            <option value="g">Gram (g)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {getNormalizedPrecautions().length === 0 && (
                <div
                  className={cn(
                    "p-8 sm:p-12 text-center rounded-2xl sm:rounded-3xl border border-dashed flex flex-col items-center justify-center gap-3",
                    isDarkMode
                      ? "bg-slate-800/20 border-slate-700 text-slate-400"
                      : "bg-slate-50/50 border-slate-200 text-slate-500",
                  )}
                >
                  <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                    <AlertTriangle size={28} />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Chưa có mục thận trọng hoặc cảnh báo nào
                    </p>
                    <p className="text-xs text-slate-400">
                      Bấm nút bên dưới hoặc chọn gợi ý nhanh phía trên để thêm các lưu ý lâm sàng, theo dõi gan/thận hoặc cảnh báo bệnh lý.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPrecaution}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer mt-1"
                  >
                    <Plus size={14} />
                    <span>+ Thêm thận trọng đầu tiên</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 3: ĐỐI TƯỢNG ĐẶC BIỆT (SPECIAL_SUBJECTS) */}
        {activeSubTab === "special_subjects" && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Phụ nữ có thai */}
            <div
              className={cn(
                "p-4 sm:p-6 rounded-3xl border transition-all space-y-4",
                isDarkMode
                  ? "bg-slate-800/40 border-slate-700"
                  : "bg-slate-50 border-slate-100 shadow-sm",
              )}
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-700">
                <Baby className="text-pink-500" size={18} />
                <h4
                  className={cn(
                    "text-xs sm:text-sm font-black uppercase tracking-wider",
                    isDarkMode ? "text-slate-200" : "text-slate-800",
                  )}
                >
                  Phụ nữ trong thời kỳ mang thai
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    3 tháng đầu
                  </span>
                  <select
                    value={formData.pregnancyStatus1 || "Cân nhắc lợi hại"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pregnancyStatus1: e.target.value,
                      })
                    }
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-bold",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-800",
                    )}
                  >
                    <option value="Có thể dùng">Có thể dùng</option>
                    <option value="Cân nhắc lợi hại">Cân nhắc lợi hại</option>
                    <option value="Không nên dùng">Không nên dùng</option>
                    <option value="Chống chỉ định">Chống chỉ định</option>
                    <option value="Không có dữ liệu">Không có dữ liệu</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    3 tháng giữa
                  </span>
                  <select
                    value={formData.pregnancyStatus2 || "Cân nhắc lợi hại"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pregnancyStatus2: e.target.value,
                      })
                    }
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-bold",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-800",
                    )}
                  >
                    <option value="Có thể dùng">Có thể dùng</option>
                    <option value="Cân nhắc lợi hại">Cân nhắc lợi hại</option>
                    <option value="Không nên dùng">Không nên dùng</option>
                    <option value="Chống chỉ định">Chống chỉ định</option>
                    <option value="Không có dữ liệu">Không có dữ liệu</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    3 tháng cuối
                  </span>
                  <select
                    value={formData.pregnancyStatus3 || "Cân nhắc lợi hại"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pregnancyStatus3: e.target.value,
                      })
                    }
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-bold",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-800",
                    )}
                  >
                    <option value="Có thể dùng">Có thể dùng</option>
                    <option value="Cân nhắc lợi hại">Cân nhắc lợi hại</option>
                    <option value="Không nên dùng">Không nên dùng</option>
                    <option value="Chống chỉ định">Chống chỉ định</option>
                    <option value="Không có dữ liệu">Không có dữ liệu</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <textarea
                    rows={2}
                    value={formData.pregnancyNotes || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pregnancyNotes: e.target.value,
                      })
                    }
                    placeholder="Ghi chú chi tiết ảnh hưởng thai kỳ (phân loại FDA thai kỳ A/B/C/D/X nếu có)..."
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-800",
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Phụ nữ cho con bú & Lái xe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cho con bú */}
              <div
                className={cn(
                  "p-4 sm:p-5 rounded-3xl border space-y-3",
                  isDarkMode
                    ? "bg-slate-800/40 border-slate-700"
                    : "bg-slate-50 border-slate-100",
                )}
              >
                <div className="flex items-center gap-2">
                  <Heart className="text-rose-500" size={16} />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Phụ nữ cho con bú
                  </span>
                </div>
                <select
                  value={formData.lactationStatus || "Cân nhắc lợi hại"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lactationStatus: e.target.value,
                    })
                  }
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-bold",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-800",
                  )}
                >
                  <option value="Có thể dùng">Có thể dùng</option>
                  <option value="Cân nhắc lợi hại">Cân nhắc lợi hại</option>
                  <option value="Không nên dùng">Không nên dùng</option>
                  <option value="Chống chỉ định">Chống chỉ định</option>
                </select>
                <textarea
                  rows={2}
                  value={formData.lactationNotes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lactationNotes: e.target.value,
                    })
                  }
                  placeholder="Ghi chú về việc bài tiết qua sữa mẹ..."
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-medium",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-800",
                  )}
                />
              </div>

              {/* Lái xe & Vận hành máy móc */}
              <div
                className={cn(
                  "p-4 sm:p-5 rounded-3xl border space-y-3",
                  isDarkMode
                    ? "bg-slate-800/40 border-slate-700"
                    : "bg-slate-50 border-slate-100",
                )}
              >
                <div className="flex items-center gap-2">
                  <Car className="text-blue-500" size={16} />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Lái xe & Vận hành máy móc
                  </span>
                </div>
                <select
                  value={formData.drivingStatus || "Có thể dùng"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      drivingStatus: e.target.value,
                    })
                  }
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-bold",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-800",
                  )}
                >
                  <option value="Có thể dùng">Có thể dùng</option>
                  <option value="Cân nhắc lợi hại">Cân nhắc lợi hại (thận trọng buồn ngủ/chóng mặt)</option>
                  <option value="Không nên dùng">Không nên dùng</option>
                  <option value="Chống chỉ định">Chống chỉ định</option>
                </select>
                <textarea
                  rows={2}
                  value={formData.drivingNotes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      drivingNotes: e.target.value,
                    })
                  }
                  placeholder="Lưu ý về tác động lên hệ thần kinh trung ương, chóng mặt, buồn ngủ..."
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-medium",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-800",
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ==========================================
  // SIDE EFFECTS (ADR) TAB
  // ==========================================
  if (activeTab === "side_effects_tab") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 sm:space-y-8"
      >
        {activeSubTab === "adr" && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h4
                  className={cn(
                    "text-xs sm:text-sm font-black uppercase tracking-wider",
                    isDarkMode ? "text-slate-200" : "text-slate-800",
                  )}
                >
                  Tác dụng không mong muốn (ADR)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Phân loại ADR theo tần suất xuất hiện và cơ quan bị ảnh hưởng
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = (
                    Array.isArray(formData.sideEffects)
                      ? formData.sideEffects.map((se) =>
                          typeof se === "string"
                            ? { frequency: "Thường gặp", content: se }
                            : se,
                        )
                      : []
                  ) as { frequency: string; content: string; ingredient?: string }[];
                  setFormData({
                    ...formData,
                    sideEffects: [
                      ...current,
                      { frequency: "Thường gặp", content: "" },
                    ],
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm tác dụng phụ</span>
              </button>
            </div>

            <div className="space-y-3">
              {(Array.isArray(formData.sideEffects)
                ? (formData.sideEffects as any[])
                : []
              ).map((se: any, seIdx: number) => (
                <div
                  key={seIdx}
                  className={cn(
                    "p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center gap-3",
                    isDarkMode
                      ? "bg-slate-800/40 border-slate-700"
                      : "bg-slate-50/70 border-slate-200 shadow-2xs",
                  )}
                >
                  <select
                    value={se.frequency || "Thường gặp"}
                    onChange={(e) => {
                      const updated = (
                        Array.isArray(formData.sideEffects)
                          ? formData.sideEffects.map((item) =>
                              typeof item === "string"
                                ? { frequency: "Thường gặp", content: item }
                                : { ...item },
                            )
                          : []
                      ) as { frequency: string; content: string; ingredient?: string }[];
                      updated[seIdx] = {
                        ...(typeof se === "string" ? { content: se } : se),
                        frequency: e.target.value,
                      };
                      setFormData({ ...formData, sideEffects: updated });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-800",
                    )}
                  >
                    <option value="Rất thường gặp (≥ 1/10)">Rất thường gặp (≥ 1/10)</option>
                    <option value="Thường gặp (≥ 1/100 đến < 1/10)">Thường gặp (1/100 - 1/10)</option>
                    <option value="Ít gặp (≥ 1/1000 đến < 1/100)">Ít gặp (1/1000 - 1/100)</option>
                    <option value="Hiếm gặp (< 1/1000)">Hiếm gặp (&lt; 1/1000)</option>
                    <option value="Chưa rõ tần suất">Chưa rõ tần suất</option>
                  </select>

                  <input
                    type="text"
                    value={typeof se === "string" ? se : se.content || ""}
                    onChange={(e) => {
                      const updated = (
                        Array.isArray(formData.sideEffects)
                          ? formData.sideEffects.map((item) =>
                              typeof item === "string"
                                ? { frequency: "Thường gặp", content: item }
                                : { ...item },
                            )
                          : []
                      ) as { frequency: string; content: string; ingredient?: string }[];
                      updated[seIdx] = {
                        ...(typeof se === "string" ? { frequency: "Thường gặp" } : se),
                        content: e.target.value,
                      };
                      setFormData({ ...formData, sideEffects: updated });
                    }}
                    placeholder="Mô tả tác dụng phụ (VD: Buồn nôn, chóng mặt, nổi mày đay...)"
                    className={cn(
                      "flex-1 w-full px-3 py-1.5 rounded-xl border text-xs font-medium",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-800",
                    )}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const updated = (
                        Array.isArray(formData.sideEffects)
                          ? formData.sideEffects.map((item) =>
                              typeof item === "string"
                                ? { frequency: "Thường gặp", content: item }
                                : { ...item },
                            )
                          : []
                      ).filter((_, i) => i !== seIdx) as { frequency: string; content: string; ingredient?: string }[];
                      setFormData({ ...formData, sideEffects: updated });
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer self-end sm:self-auto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Ghi chú chung về ADR */}
            <div>
              <label
                className={cn(
                  "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                  isDarkMode ? "text-slate-400" : "text-slate-500",
                )}
              >
                Ghi chú thêm về tác dụng phụ
              </label>
              <textarea
                rows={3}
                value={formData.sideEffectsNote || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sideEffectsNote: e.target.value,
                  })
                }
                placeholder="Ghi chú thêm về các biện pháp giảm thiểu ADR hoặc cảnh báo quan trọng..."
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y",
                  isDarkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-200 text-slate-800",
                )}
              />
            </div>
          </div>
        )}

        {activeSubTab === "adr_management" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h4
                className={cn(
                  "text-xs sm:text-sm font-black uppercase tracking-wider",
                  isDarkMode ? "text-slate-200" : "text-slate-800",
                )}
              >
                Hướng dẫn Xử trí phản ứng có hại (ADR)
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mb-3">
                Biện pháp cấp cứu, xử trí ngừng thuốc hoặc điều trị triệu chứng
                khi xảy ra phản ứng không mong muốn
              </p>
            </div>
            <textarea
              rows={6}
              value={formData.adrManagement || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  adrManagement: e.target.value,
                })
              }
              placeholder="Nhập phác đồ xử trí ADR (VD: Ngừng thuốc ngay lập tức, tiêm kháng histamin hoặc corticoid nếu dị ứng nhẹ; sốc phản vệ cần tiêm adrenalin...)"
              className={cn(
                "w-full px-4 py-3 rounded-2xl border text-xs font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y",
                isDarkMode
                  ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs",
              )}
            />
          </div>
        )}
      </motion.div>
    );
  }

  // ==========================================
  // INTERACTIONS TAB
  // ==========================================
  if (activeTab === "interactions") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 sm:space-y-8"
      >
        {activeSubTab === "interactions" && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h4
                  className={cn(
                    "text-xs sm:text-sm font-black uppercase tracking-wider",
                    isDarkMode ? "text-slate-200" : "text-slate-800",
                  )}
                >
                  Tương tác thuốc chuyên sâu
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Khai báo các cặp tương tác với hoạt chất, nhóm thuốc hoặc thức
                  ăn
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = formData.specificInteractions || [];
                  setFormData({
                    ...formData,
                    specificInteractions: [
                      ...current,
                      {
                        target: "",
                        severity: "Thận trọng khi phối hợp",
                        content: "",
                      },
                    ],
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm tương tác</span>
              </button>
            </div>

            <div className="space-y-4">
              {(formData.specificInteractions || []).map((inter, iIdx) => (
                <div
                  key={iIdx}
                  className={cn(
                    "p-4 rounded-2xl border space-y-3",
                    isDarkMode
                      ? "bg-slate-800/40 border-slate-700"
                      : "bg-slate-50/70 border-slate-200 shadow-2xs",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Zap size={16} className="text-amber-500 shrink-0" />
                      <input
                        type="text"
                        value={inter.target || ""}
                        onChange={(e) => {
                          const updated = [
                            ...(formData.specificInteractions || []),
                          ];
                          updated[iIdx] = {
                            ...updated[iIdx],
                            target: e.target.value,
                          };
                          setFormData({
                            ...formData,
                            specificInteractions: updated,
                          });
                        }}
                        placeholder="Tên thuốc / Hoạt chất / Nhóm tương tác (VD: Warfarin, NSAIDs...)"
                        className={cn(
                          "w-full px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-800",
                        )}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={inter.severity || "Thận trọng khi phối hợp"}
                        onChange={(e) => {
                          const updated = [
                            ...(formData.specificInteractions || []),
                          ];
                          updated[iIdx] = {
                            ...updated[iIdx],
                            severity: e.target.value,
                          };
                          setFormData({
                            ...formData,
                            specificInteractions: updated,
                          });
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl border text-xs font-bold",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-800",
                        )}
                      >
                        <option value="Chống chỉ định phối hợp">Chống chỉ định phối hợp</option>
                        <option value="Thận trọng khi phối hợp">Thận trọng khi phối hợp</option>
                        <option value="Cân nhắc hiệu chỉnh liều">Cân nhắc hiệu chỉnh liều</option>
                        <option value="Tương tác nhẹ">Tương tác nhẹ</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = (
                            formData.specificInteractions || []
                          ).filter((_, i) => i !== iIdx);
                          setFormData({
                            ...formData,
                            specificInteractions: updated,
                          });
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={inter.content || ""}
                    onChange={(e) => {
                      const updated = [
                        ...(formData.specificInteractions || []),
                      ];
                      updated[iIdx] = {
                        ...updated[iIdx],
                        content: e.target.value,
                      };
                      setFormData({
                        ...formData,
                        specificInteractions: updated,
                      });
                    }}
                    placeholder="Cơ chế tương tác, hậu quả lâm sàng và cách xử trí..."
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-200 text-slate-800",
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Tóm tắt tương tác */}
            <div>
              <label
                className={cn(
                  "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                  isDarkMode ? "text-slate-400" : "text-slate-500",
                )}
              >
                Tóm tắt tương tác thuốc chung
              </label>
              <textarea
                rows={3}
                value={formData.interactions || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    interactions: e.target.value,
                  })
                }
                placeholder="Tóm tắt tương tác thuốc từ tờ hướng dẫn sử dụng..."
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium resize-y",
                  isDarkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-200 text-slate-800",
                )}
              />
            </div>
          </div>
        )}

        {activeSubTab === "incompatibilities" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h4
                className={cn(
                  "text-xs sm:text-sm font-black uppercase tracking-wider",
                  isDarkMode ? "text-slate-200" : "text-slate-800",
                )}
              >
                Tương kỵ thuốc & Dung dịch tiêm truyền
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mb-3">
                Các dung dịch pha truyền, tá dược hoặc thuốc tuyệt đối không được
                pha trộn chung
              </p>
            </div>
            <textarea
              rows={5}
              value={formData.incompatibilities || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  incompatibilities: e.target.value,
                })
              }
              placeholder="VD: Không được pha trộn thuốc với dung dịch kiềm hoặc các dung dịch chứa canxi..."
              className={cn(
                "w-full px-4 py-3 rounded-2xl border text-xs font-medium leading-relaxed resize-y",
                isDarkMode
                  ? "bg-slate-900 border-slate-700 text-white"
                  : "bg-white border-slate-200 text-slate-800",
              )}
            />
          </div>
        )}
      </motion.div>
    );
  }

  // ==========================================
  // OVERDOSE TAB
  // ==========================================
  if (activeTab === "overdose") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 animate-in fade-in duration-300"
      >
        <div
          className={cn(
            "p-4 sm:p-6 rounded-3xl border transition-all space-y-4",
            isDarkMode
              ? "bg-slate-800/40 border-slate-700"
              : "bg-slate-50 border-slate-100 shadow-sm",
          )}
        >
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-700">
            <AlertTriangle className="text-rose-500" size={18} />
            <h4
              className={cn(
                "text-xs sm:text-sm font-black uppercase tracking-wider",
                isDarkMode ? "text-slate-200" : "text-slate-800",
              )}
            >
              Triệu chứng & Biện pháp Xử trí quá liều
            </h4>
          </div>

          <div>
            <label
              className={cn(
                "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                isDarkMode ? "text-slate-400" : "text-slate-500",
              )}
            >
              Dấu hiệu & Triệu chứng quá liều
            </label>
            <textarea
              rows={3}
              value={formData.overdose || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  overdose: e.target.value,
                })
              }
              placeholder="Mô tả dấu hiệu ngộ độc, triệu chứng lâm sàng khi dùng quá liều..."
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium resize-y",
                isDarkMode
                  ? "bg-slate-900 border-slate-700 text-white"
                  : "bg-white border-slate-200 text-slate-800",
              )}
            />
          </div>

          <div>
            <label
              className={cn(
                "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                isDarkMode ? "text-slate-400" : "text-slate-500",
              )}
            >
              Biện pháp xử trí & Thuốc giải độc đặc hiệu (Antidote)
            </label>
            <textarea
              rows={4}
              value={formData.overdoseManagement || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  overdoseManagement: e.target.value,
                })
              }
              placeholder="Rửa dạ dày, than hoạt, thuốc giải độc đặc hiệu (nếu có), điều trị hỗ trợ và theo dõi dấu hiệu sinh tồn..."
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium resize-y",
                isDarkMode
                  ? "bg-slate-900 border-slate-700 text-white"
                  : "bg-white border-slate-200 text-slate-800",
              )}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // PHARMACOLOGY TAB
  // ==========================================
  if (activeTab === "pharmacology") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 animate-in fade-in duration-300"
      >
        {activeSubTab === "pharmacodynamics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className={cn(
                    "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                    isDarkMode ? "text-slate-400" : "text-slate-500",
                  )}
                >
                  Nhóm dược lý
                </label>
                <input
                  type="text"
                  value={formData.pharmacologicalGroup || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pharmacologicalGroup: e.target.value,
                    })
                  }
                  placeholder="VD: Thuốc hạ huyết áp, chẹn thụ thể Angiotensin II..."
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-800",
                  )}
                />
              </div>

              <div>
                <label
                  className={cn(
                    "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                    isDarkMode ? "text-slate-400" : "text-slate-500",
                  )}
                >
                  Cơ chế tác dụng
                </label>
                <input
                  type="text"
                  value={formData.mechanismOfAction || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mechanismOfAction: e.target.value,
                    })
                  }
                  placeholder="VD: Ức chế cạnh tranh chọn lọc men khử HMG-CoA..."
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-800",
                  )}
                />
              </div>
            </div>

            <div>
              <label
                className={cn(
                  "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                  isDarkMode ? "text-slate-400" : "text-slate-500",
                )}
              >
                Dược lực học chi tiết
              </label>
              <textarea
                rows={5}
                value={
                  typeof formData.pharmacodynamics === "string"
                    ? formData.pharmacodynamics
                    : Array.isArray(formData.pharmacodynamics)
                      ? formData.pharmacodynamics
                          .map((p: any) => p.content || "")
                          .join("\n")
                      : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pharmacodynamics: e.target.value,
                  })
                }
                placeholder="Mô tả tác dụng dược lý, hiệu quả kháng khuẩn/hạ áp, phổ tác dụng..."
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium resize-y",
                  isDarkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-200 text-slate-800",
                )}
              />
            </div>
          </div>
        )}

        {activeSubTab === "pharmacokinetics" && (
          <div className="space-y-4">
            <div>
              <label
                className={cn(
                  "block text-[10px] sm:text-[12px] font-black uppercase tracking-wider mb-1.5",
                  isDarkMode ? "text-slate-400" : "text-slate-500",
                )}
              >
                Dược động học (Hấp thu - Phân bố - Chuyển hóa - Thải trừ)
              </label>
              <textarea
                rows={6}
                value={
                  typeof formData.pharmacokinetics === "string"
                    ? formData.pharmacokinetics
                    : Array.isArray(formData.pharmacokinetics)
                      ? formData.pharmacokinetics
                          .map((p: any) => p.content || "")
                          .join("\n")
                      : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pharmacokinetics: e.target.value,
                  })
                }
                placeholder="Hấp thu: Sinh khả dụng qua đường uống...\nPhân bố: Liên kết protein huyết tương...\nChuyển hóa: Qua gan bởi enzyme CYP3A4...\nThải trừ: Qua nước tiểu và phân, T1/2..."
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-2xl border text-xs font-medium leading-relaxed resize-y",
                  isDarkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-200 text-slate-800",
                )}
              />
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return null;
};
