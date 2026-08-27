import React, { useState, useEffect } from "react";
import {
  X,
  MessageSquarePlus,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
  User,
  Building,
  Phone,
  Mail,
  HelpCircle,
  Pill,
  ShieldAlert,
  ClipboardList,
  AlertTriangle,
  Flame,
  Users,
  RefreshCw,
  BookOpen,
  Info,
  Layers,
  History,
  Tag,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { Drug, DrugFeedback } from "../types";
import {
  db,
  auth,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from "../firebase";

interface DrugFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  drug: Drug;
  initialSection?: string;
  isDarkMode: boolean;
}

const SECTION_OPTIONS = [
  { id: "general", label: "Thông tin chung & Dạng bào chế", icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "indications", label: "Chỉ định điều trị", icon: ClipboardList, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "contraindications", label: "Chống chỉ định", icon: ShieldAlert, color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "dosage", label: "Liều lượng & Cách dùng", icon: Clock, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "warnings", label: "Cảnh báo & Thận trọng", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "interactions", label: "Tương tác thuốc", icon: RefreshCw, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "side_effects", label: "Tác dụng phụ (ADR)", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "special_populations", label: "Đối tượng đặc biệt (Phụ nữ có thai, Cho con bú, Trẻ em, Suy gan/thận)", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: "overdose", label: "Quá liều & Xử trí", icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
  { id: "pharmacology", label: "Dược lý & Cơ chế tác dụng", icon: BookOpen, color: "text-teal-500", bg: "bg-teal-500/10" },
  { id: "other", label: "Khác / Đề xuất bổ sung", icon: Layers, color: "text-slate-500", bg: "bg-slate-500/10" },
];

const FEEDBACK_TYPES = [
  { id: "correction", label: "Sửa lỗi / Đính chính thông tin", desc: "Thông tin hiện tại chưa chính xác" },
  { id: "addition", label: "Bổ sung dữ liệu còn thiếu", desc: "Thêm chỉ định, liều dùng, tương tác, ICD-10..." },
  { id: "update_guideline", label: "Cập nhật theo HDSD / Dược thư mới", desc: "Thay đổi theo quy định hoặc tài liệu mới ban hành" },
  { id: "suggestion", label: "Đề xuất & Ý kiến đóng góp khác", desc: "Cải tiến giao diện, cách ghi nhớ, hiển thị..." },
];

const PRIORITIES = [
  { id: "normal", label: "Bình thường", color: "text-emerald-500", border: "border-emerald-300 dark:border-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { id: "high", label: "Quan trọng", color: "text-amber-500", border: "border-amber-300 dark:border-amber-800", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "urgent", label: "Khẩn cấp (Sai sót chuyên môn)", color: "text-rose-500", border: "border-rose-300 dark:border-rose-800", bg: "bg-rose-50 dark:bg-rose-950/30" },
];

const QUICK_PROMPTS = [
  "Bổ sung mã ICD-10 chống chỉ định",
  "Cần hiệu chỉnh liều cho bệnh nhân suy thận eGFR < 30",
  "Cập nhật chống chỉ định phụ nữ mang thai 3 tháng đầu",
  "Bổ sung tương tác nguy cơ cao với thuốc khác",
  "Sai hàm lượng / đường dùng của thuốc",
  "Bổ sung tờ hướng dẫn sử dụng (HDSD) mới nhất",
];

export const DrugFeedbackModal: React.FC<DrugFeedbackModalProps> = ({
  isOpen,
  onClose,
  drug,
  initialSection = "general",
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [targetSection, setTargetSection] = useState<string>(initialSection);
  const [feedbackType, setFeedbackType] = useState<string>("correction");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [content, setContent] = useState("");
  const [referenceSource, setReferenceSource] = useState("");

  // Sender info
  const [authorName, setAuthorName] = useState("");
  const [authorDepartment, setAuthorDepartment] = useState("");
  const [authorPhone, setAuthorPhone] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Past feedbacks for this drug
  const [historyList, setHistoryList] = useState<DrugFeedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sync initialSection whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSection && initialSection !== "info") {
        setTargetSection(initialSection);
      } else {
        setTargetSection("general");
      }
      setIsSuccess(false);
      setErrorMsg("");

      // Try prefilling user info
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        setAuthorName(firebaseUser.displayName || "");
        setAuthorEmail(firebaseUser.email || "");
      } else {
        try {
          const localUser = localStorage.getItem("currentUser") || localStorage.getItem("activeStaff");
          if (localUser) {
            const parsed = JSON.parse(localUser);
            setAuthorName(parsed.name || parsed.displayName || parsed.fullName || "");
            setAuthorDepartment(parsed.department || parsed.khoa || "");
            setAuthorEmail(parsed.email || "");
            setAuthorPhone(parsed.phone || "");
          }
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen, initialSection]);

  // Subscribe to history of feedbacks for this drug
  useEffect(() => {
    if (!isOpen || !drug?.id) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "drug_feedbacks"),
        where("drugId", "==", drug.id),
        orderBy("createdAt", "desc")
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: DrugFeedback[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as any) });
          });
          setHistoryList(list);
          setLoadingHistory(false);
        },
        (err) => {
          console.warn("Could not load feedback history:", err);
          setLoadingHistory(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setLoadingHistory(false);
    }
  }, [isOpen, drug?.id]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg("Vui lòng nhập nội dung góp ý hoặc mô tả chi tiết.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const now = new Date().toISOString();
      const activeIngredientsStr = drug.activeIngredients
        ? drug.activeIngredients
            .map((ai) => `${ai.name}${ai.amount ? ` ${ai.amount}` : ""}${ai.unit ? `${ai.unit}` : ""}`)
            .join(", ")
        : "";

      const feedbackData: Omit<DrugFeedback, "id"> = {
        drugId: drug.id || drug.name,
        drugName: drug.name,
        drugAvatarUrl: drug.avatarUrl || "",
        activeIngredients: activeIngredientsStr,
        targetSection,
        feedbackType: feedbackType as any,
        priority,
        content: content.trim(),
        referenceSource: referenceSource.trim() || undefined,
        authorName: authorName.trim() || "Người dùng ẩn danh",
        authorEmail: authorEmail.trim() || undefined,
        authorDepartment: authorDepartment.trim() || undefined,
        authorPhone: authorPhone.trim() || undefined,
        authorUid: auth.currentUser?.uid || undefined,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };

      // 1. Save feedback record
      await addDoc(collection(db, "drug_feedbacks"), feedbackData);

      // 2. Create notification for Admin / Clinicians
      try {
        const secObj = SECTION_OPTIONS.find((s) => s.id === targetSection);
        await addDoc(collection(db, "notifications"), {
          userId: "admin",
          title: `Góp ý thuốc: ${drug.name}`,
          message: `${authorName.trim() || "Thành viên"} đã gửi góp ý mục "${secObj?.label || targetSection}": ${content.trim().slice(0, 100)}...`,
          type: priority === "urgent" ? "warning" : "info",
          isRead: false,
          createdAt: now,
          link: `/drugs?id=${drug.id || drug.name}&feedback=true`,
        });
      } catch (notifErr) {
        console.warn("Could not create admin notification:", notifErr);
      }

      setIsSuccess(true);
      setIsSubmitting(false);
      setContent("");
      setReferenceSource("");
    } catch (err: any) {
      console.error("Error submitting drug feedback:", err);
      handleFirestoreError(err, OperationType.WRITE, "drug_feedbacks");
      setErrorMsg("Không thể gửi góp ý vào lúc này. Vui lòng kiểm tra lại kết nối mạng.");
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Check size={10} /> Đã cập nhật
          </span>
        );
      case "reviewed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock size={10} /> Đã tiếp nhận
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <X size={10} /> Chưa phù hợp
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock size={10} /> Chờ xem xét
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="drug-feedback-overlay-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[250] flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden"
        >
          <motion.div
            key="drug-feedback-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          />

          <motion.div
            key="drug-feedback-dialog-content"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className={cn(
              "relative w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] sm:rounded-2xl shadow-2xl border-0 sm:border flex flex-col overflow-hidden z-10",
              isDarkMode
                ? "bg-slate-900 border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            )}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Top Banner & Header */}
          <div
            className={cn(
              "shrink-0 p-4 sm:p-5 border-b relative",
              isDarkMode
                ? "bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/50 border-slate-800"
                : "bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border-slate-100"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-xs overflow-hidden",
                    isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                  )}
                >
                  {drug.avatarUrl ? (
                    <img
                      src={drug.avatarUrl}
                      alt={drug.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Pill size={22} className="text-blue-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      <MessageSquarePlus size={11} /> Góp ý chi tiết thuốc
                    </span>
                    {drug.registrationNumber && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        SĐK: {drug.registrationNumber}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black truncate mt-0.5">{drug.name}</h3>
                  {drug.activeIngredients && drug.activeIngredients.length > 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {drug.activeIngredients
                        .map((ai) => `${ai.name}${ai.amount ? ` ${ai.amount}` : ""}${ai.unit ? `${ai.unit}` : ""}`)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0",
                  isDarkMode
                    ? "text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-slate-200"
                )}
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs (Form / History) */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === "form"
                    ? isDarkMode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : isDarkMode
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Send size={12} />
                <span>Gửi góp ý mới</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === "history"
                    ? isDarkMode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : isDarkMode
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <History size={12} />
                <span>Lịch sử góp ý của thuốc</span>
                {historyList.length > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                      activeTab === "history"
                        ? "bg-white/20 text-white"
                        : isDarkMode
                        ? "bg-slate-800 text-blue-400"
                        : "bg-blue-100 text-blue-600"
                    )}
                  >
                    {historyList.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
            {activeTab === "form" ? (
              isSuccess ? (
                <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4 animate-bounce">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="text-lg font-black mb-1.5">Gửi góp ý thành công!</h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                    Cảm ơn bạn đã đóng góp thông tin cho thuốc <strong className="text-slate-800 dark:text-slate-200 font-bold">{drug.name}</strong>. Ban biên tập chuyên môn & Dược sĩ sẽ kiểm duyệt và đối chiếu tài liệu để hoàn thiện dữ liệu sớm nhất.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSuccess(false);
                        setContent("");
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                        isDarkMode
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                      )}
                    >
                      Gửi thêm góp ý khác
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-sm"
                    >
                      Đóng cửa sổ
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* 1. Chọn mục cần góp ý */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      1. Mục cần góp ý / bổ sung: <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SECTION_OPTIONS.map((sec, sIdx) => {
                        const Icon = sec.icon;
                        const isSelected = targetSection === sec.id;
                        return (
                          <button
                            key={`fb-sec-${sec.id}-${sIdx}`}
                            type="button"
                            onClick={() => setTargetSection(sec.id)}
                            className={cn(
                              "flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer",
                              isSelected
                                ? isDarkMode
                                  ? "bg-blue-950/40 border-blue-500/60 text-blue-300 font-bold shadow-xs ring-1 ring-blue-500/30"
                                  : "bg-blue-50/80 border-blue-400 text-blue-700 font-bold shadow-xs ring-1 ring-blue-400/30"
                                : isDarkMode
                                ? "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <div className={cn("p-1.5 rounded-lg shrink-0", sec.bg, sec.color)}>
                              <Icon size={14} />
                            </div>
                            <span className="truncate">{sec.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Loại góp ý & Mức độ ưu tiên */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        2. Phân loại góp ý:
                      </label>
                      <div className="space-y-1.5">
                        {FEEDBACK_TYPES.map((ft, ftIdx) => (
                          <label
                            key={`fb-type-${ft.id}-${ftIdx}`}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition-colors",
                              feedbackType === ft.id
                                ? isDarkMode
                                  ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-300 font-bold"
                                  : "bg-indigo-50/80 border-indigo-300 text-indigo-800 font-bold"
                                : isDarkMode
                                ? "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/70"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <input
                              type="radio"
                              name="feedbackType"
                              value={ft.id}
                              checked={feedbackType === ft.id}
                              onChange={(e) => setFeedbackType(e.target.value)}
                              className="w-3.5 h-3.5 text-blue-600 focus:ring-0"
                            />
                            <div className="min-w-0">
                              <div className="truncate">{ft.label}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        3. Mức độ ưu tiên:
                      </label>
                      <div className="space-y-1.5">
                        {PRIORITIES.map((p, pIdx) => (
                          <label
                            key={`fb-prio-${p.id}-${pIdx}`}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition-colors",
                              priority === p.id
                                ? cn(p.bg, p.border, p.color, "font-bold shadow-2xs")
                                : isDarkMode
                                ? "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/70"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <input
                              type="radio"
                              name="priority"
                              value={p.id}
                              checked={priority === p.id}
                              onChange={(e) => setPriority(e.target.value as any)}
                              className="w-3.5 h-3.5 text-blue-600 focus:ring-0"
                            />
                            <span className="truncate">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Suggestions / Tags */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Gợi ý nhanh (nhấn để thêm vào nội dung):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PROMPTS.map((prompt, pIdx) => (
                        <button
                          key={`prompt-${pIdx}`}
                          type="button"
                          onClick={() => {
                            setContent((prev) => (prev ? `${prev}\n- ${prompt}` : `- ${prompt}`));
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10.5px] border font-medium transition-all text-left cursor-pointer",
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50"
                          )}
                        >
                          + {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Nội dung chi tiết */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        4. Nội dung góp ý chi tiết: <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">{content.length} ký tự</span>
                    </div>
                    <textarea
                      rows={4}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Mô tả cụ thể nội dung cần đính chính, thông tin cần bổ sung hoặc câu hỏi liên quan đến thuốc này..."
                      className={cn(
                        "w-full p-3 rounded-xl border text-xs leading-relaxed transition-colors outline-none focus:ring-2 focus:ring-blue-500/40 resize-y min-h-[90px]",
                        isDarkMode
                          ? "bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                          : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                      )}
                      required
                    />
                  </div>

                  {/* 5. Căn cứ / Nguồn tài liệu tham khảo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      5. Căn cứ / Nguồn tài liệu tham khảo (Tùy chọn):
                    </label>
                    <div className="relative">
                      <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={referenceSource}
                        onChange={(e) => setReferenceSource(e.target.value)}
                        placeholder="Ví dụ: Dược thư QGVN 2022, Tờ HDSD Bộ Y tế phê duyệt, AHFS, Uptodate..."
                        className={cn(
                          "w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500/40",
                          isDarkMode
                            ? "bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                        )}
                      />
                    </div>
                  </div>

                  {/* 6. Thông tin người gửi */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      6. Thông tin người gửi (Để phản hồi kết quả):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="relative">
                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          placeholder="Họ và tên bác sĩ / dược sĩ..."
                          className={cn(
                            "w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500/40",
                            isDarkMode
                              ? "bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                          )}
                        />
                      </div>

                      <div className="relative">
                        <Building size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={authorDepartment}
                          onChange={(e) => setAuthorDepartment(e.target.value)}
                          placeholder="Khoa / Phòng / Đơn vị công tác..."
                          className={cn(
                            "w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500/40",
                            isDarkMode
                              ? "bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                          )}
                        />
                      </div>

                      <div className="relative">
                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={authorPhone}
                          onChange={(e) => setAuthorPhone(e.target.value)}
                          placeholder="Số điện thoại..."
                          className={cn(
                            "w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500/40",
                            isDarkMode
                              ? "bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                          )}
                        />
                      </div>

                      <div className="relative">
                        <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={authorEmail}
                          onChange={(e) => setAuthorEmail(e.target.value)}
                          placeholder="Email nhận thông báo..."
                          className={cn(
                            "w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500/40",
                            isDarkMode
                              ? "bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="pt-3 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                        isDarkMode
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                      )}
                    >
                      Hủy bỏ
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md",
                        isSubmitting
                          ? "bg-blue-400 text-white cursor-not-allowed opacity-75"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white active:scale-95"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Gửi góp ý ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )
            ) : (
              /* Tab History */
              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <RefreshCw size={20} className="animate-spin text-blue-500" />
                    <span className="text-xs">Đang tải lịch sử góp ý...</span>
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <MessageSquarePlus size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Chưa có góp ý nào cho thuốc này.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Hãy là người đầu tiên đóng góp để hoàn thiện cơ sở dữ liệu!
                    </p>
                  </div>
                ) : (
                  historyList.map((item, hIdx) => {
                    const sec = SECTION_OPTIONS.find((s) => s.id === item.targetSection);
                    return (
                      <div
                        key={`${item.id || 'feedback'}-${hIdx}`}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all flex flex-col gap-2",
                          isDarkMode ? "bg-slate-800/50 border-slate-700/70" : "bg-white border-slate-200 shadow-2xs"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {sec?.label || item.targetSection}
                            </span>
                            {item.priority === "urgent" && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/30">
                                Khẩn cấp
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(item.status)}
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                          {item.content}
                        </div>

                        {item.referenceSource && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            <FileText size={11} className="shrink-0 text-blue-500" />
                            <span className="font-semibold">Nguồn:</span>
                            <span className="truncate">{item.referenceSource}</span>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>
                            Người gửi: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{item.authorName || "Ẩn danh"}</strong>
                            {item.authorDepartment && ` (${item.authorDepartment})`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
