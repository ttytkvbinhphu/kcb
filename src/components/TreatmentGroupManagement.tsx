import React, { useState, useEffect } from 'react';
import {
  Heart,
  Activity,
  Stethoscope,
  Wind,
  Brain,
  Zap,
  ShieldAlert,
  Flame,
  Baby,
  Droplet,
  Bone,
  Thermometer,
  Pill,
  Sparkles,
  Eye,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCw,
  Layers,
  Check,
  Palette,
  FileText
} from 'lucide-react';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from '../firebase';
import { TreatmentGroup, TreatmentGuideline } from '../types';
import { MATERIAL_DESIGN_COLORS, AVAILABLE_GROUP_ICONS, DEFAULT_TREATMENT_GROUPS } from '../lib/treatmentSeedData';
import { cn } from '../lib/utils';

interface TreatmentGroupManagementProps {
  isDarkMode: boolean;
  onClose?: () => void;
  onSelectGroupForFilter?: (groupId: string) => void;
}

export const renderMedicalGroupIcon = (iconName: string, size = 18, className = '') => {
  switch (iconName) {
    case 'Heart':
      return <Heart size={size} className={className} />;
    case 'Activity':
      return <Activity size={size} className={className} />;
    case 'Stethoscope':
      return <Stethoscope size={size} className={className} />;
    case 'Wind':
      return <Wind size={size} className={className} />;
    case 'Brain':
      return <Brain size={size} className={className} />;
    case 'Zap':
      return <Zap size={size} className={className} />;
    case 'ShieldAlert':
      return <ShieldAlert size={size} className={className} />;
    case 'Flame':
      return <Flame size={size} className={className} />;
    case 'Baby':
      return <Baby size={size} className={className} />;
    case 'Droplet':
      return <Droplet size={size} className={className} />;
    case 'Bone':
      return <Bone size={size} className={className} />;
    case 'Thermometer':
      return <Thermometer size={size} className={className} />;
    case 'Pill':
      return <Pill size={size} className={className} />;
    case 'Sparkles':
      return <Sparkles size={size} className={className} />;
    case 'Eye':
      return <Eye size={size} className={className} />;
    default:
      return <Stethoscope size={size} className={className} />;
  }
};

export const TreatmentGroupManagement: React.FC<TreatmentGroupManagementProps> = ({
  isDarkMode,
  onClose,
  onSelectGroupForFilter,
}) => {
  const [groups, setGroups] = useState<TreatmentGroup[]>([]);
  const [guidelines, setGuidelines] = useState<TreatmentGuideline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TreatmentGroup | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('Stethoscope');
  const [formColor, setFormColor] = useState(MATERIAL_DESIGN_COLORS[0].hex);
  const [formBgColor, setFormBgColor] = useState(MATERIAL_DESIGN_COLORS[0].lightHex);
  const [formOrder, setFormOrder] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Subscribe to treatment_groups in Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubGroups = onSnapshot(collection(db, 'treatment_groups'), (snap) => {
      if (!snap.empty) {
        const loaded: TreatmentGroup[] = [];
        snap.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        loaded.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setGroups(loaded);
      } else {
        // Fallback to default
        setGroups(DEFAULT_TREATMENT_GROUPS);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error loading treatment groups:", err);
      setGroups(DEFAULT_TREATMENT_GROUPS);
      setIsLoading(false);
    });

    const unsubGuides = onSnapshot(collection(db, 'treatment_guidelines'), (snap) => {
      const loadedGuides: TreatmentGuideline[] = [];
      snap.forEach((docSnap) => {
        loadedGuides.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setGuidelines(loadedGuides);
    });

    return () => {
      unsubGroups();
      unsubGuides();
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormIcon('Stethoscope');
    setFormColor(MATERIAL_DESIGN_COLORS[0].hex);
    setFormBgColor(MATERIAL_DESIGN_COLORS[0].lightHex);
    setFormOrder(groups.length + 1);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: TreatmentGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormCode(group.code || '');
    setFormDescription(group.description || '');
    setFormIcon(group.icon || 'Stethoscope');
    setFormColor(group.color || MATERIAL_DESIGN_COLORS[0].hex);
    setFormBgColor(group.bgColor || MATERIAL_DESIGN_COLORS[0].lightHex);
    setFormOrder(group.order ?? 1);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSelectColor = (c: typeof MATERIAL_DESIGN_COLORS[0]) => {
    setFormColor(c.hex);
    setFormBgColor(c.lightHex);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Vui lòng nhập tên nhóm điều trị');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const id = editingGroup ? editingGroup.id : `grp_${Date.now()}`;
      const payload: Partial<TreatmentGroup> = {
        id,
        name: formName.trim(),
        code: formCode.trim().toUpperCase() || undefined,
        description: formDescription.trim() || undefined,
        icon: formIcon,
        color: formColor,
        bgColor: formBgColor,
        order: Number(formOrder) || 1,
        isActive: editingGroup ? (editingGroup.isActive ?? true) : true,
        updatedAt: new Date().toISOString()
      };

      if (!editingGroup) {
        payload.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, 'treatment_groups', id), payload, { merge: true });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving treatment group:", err);
      setErrorMsg('Lỗi khi lưu nhóm điều trị: ' + (err.message || 'Thử lại sau'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const count = guidelines.filter(g => g.groupId === groupId).length;
    const confirmMsg = count > 0
      ? `Nhóm "${groupName}" đang có ${count} phác đồ điều trị. Bạn có chắc chắn muốn xóa nhóm này không?`
      : `Bạn có chắc chắn muốn xóa nhóm điều trị "${groupName}" không?`;

    if (window.confirm(confirmMsg)) {
      try {
        await deleteDoc(doc(db, 'treatment_groups', groupId));
      } catch (err: any) {
        alert('Lỗi xóa nhóm: ' + err.message);
      }
    }
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm('Khôi phục danh sách nhóm điều trị chuẩn theo khuyến cáo Bộ Y tế? Dữ liệu nhóm tùy chỉnh sẽ được cập nhật.')) {
      try {
        const batch = writeBatch(db);
        for (const g of DEFAULT_TREATMENT_GROUPS) {
          const ref = doc(db, 'treatment_groups', g.id);
          batch.set(ref, {
            ...g,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        await batch.commit();
      } catch (err: any) {
        alert('Lỗi khôi phục: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers size={20} />
            </div>
            <div>
              <h3 className={cn("text-base sm:text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                Quản lý Nhóm điều trị (Bộ Y tế)
              </h3>
              <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Tạo mới, đổi tên, phân màu Material Design và biểu tượng trực quan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            title="Khôi phục danh mục nhóm mặc định của Bộ Y tế"
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border",
              isDarkMode
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            <RefreshCw size={14} />
            <span>Khôi phục chuẩn BYT</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Thêm nhóm điều trị</span>
          </button>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {groups.map((group) => {
          const guidelineCount = guidelines.filter(g => g.groupId === group.id).length;
          const groupColor = group.color || '#2196F3';

          return (
            <div
              key={group.id}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between group/card relative overflow-hidden",
                isDarkMode
                  ? "bg-slate-800/40 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/70"
                  : "bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-md"
              )}
            >
              {/* Colored top indicator line */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: groupColor }}
              />

              <div>
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 transition-transform group-hover/card:scale-105"
                      style={{ backgroundColor: groupColor }}
                    >
                      {renderMedicalGroupIcon(group.icon, 20)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                          {group.name}
                        </h4>
                        {group.code && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{
                              backgroundColor: `${groupColor}20`,
                              color: groupColor
                            }}
                          >
                            {group.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[10px] font-medium flex items-center gap-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          <FileText size={11} className="shrink-0" />
                          <span>{guidelineCount} phác đồ</span>
                        </span>
                        {onSelectGroupForFilter && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectGroupForFilter(group.id);
                            }}
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.2 rounded hover:underline transition-colors cursor-pointer",
                              isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                            )}
                            title="Lọc và xem danh sách phác đồ theo nhóm này"
                          >
                            (Xem phác đồ)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(group)}
                      title="Sửa / Đổi tên nhóm"
                      className={cn(
                        "p-1.5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors",
                        isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                      )}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      title="Xóa nhóm"
                      className={cn(
                        "p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors",
                        isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {group.description && (
                  <p className={cn("mt-2.5 text-xs line-clamp-2 leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    {group.description}
                  </p>
                )}
              </div>

              {/* Bottom bar with color indicator & order */}
              <div className={cn("mt-3 pt-2.5 border-t flex items-center justify-between text-[11px]", isDarkMode ? "border-slate-700/60" : "border-slate-100")}>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: groupColor }}
                  />
                  <span className={cn("font-mono text-[10px]", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {groupColor}
                  </span>
                </div>
                <span className={cn("text-[10px] font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                  Thứ tự: {group.order ?? 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Create/Edit Group */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div
            className={cn(
              "w-full max-w-lg rounded-3xl border p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto",
              isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            )}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: formColor }}
                >
                  {renderMedicalGroupIcon(formIcon, 18)}
                </div>
                <div>
                  <h4 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                    {editingGroup ? 'Chỉnh sửa Nhóm điều trị' : 'Tạo mới Nhóm điều trị'}
                  </h4>
                  <p className={cn("text-[11px]", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Chuẩn hóa phân loại phác đồ Bộ Y tế
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveGroup} className="mt-4 space-y-4">
              {/* Tên nhóm & Mã nhóm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Tên nhóm điều trị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Tim mạch, Hô hấp, Cấp cứu..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Mã code
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="CARDIO"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Mô tả phạm vi điều trị
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Các bệnh lý thuộc nhóm này (ví dụ: Tăng huyết áp, suy tim, bệnh mạch vành...)"
                  className={cn(
                    "w-full px-3.5 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              {/* Chọn Biểu tượng (Icon) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Chọn Biểu tượng (Icon)
                </label>
                <div className="grid grid-cols-5 gap-2 p-2.5 rounded-2xl border bg-slate-500/5 max-h-40 overflow-y-auto">
                  {AVAILABLE_GROUP_ICONS.map((ic) => {
                    const isSelected = formIcon === ic.id;
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setFormIcon(ic.id)}
                        className={cn(
                          "p-2.5 rounded-xl flex flex-col items-center gap-1 border transition-all text-center",
                          isSelected
                            ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black shadow-sm ring-1 ring-blue-500"
                            : isDarkMode
                              ? "border-slate-800 hover:bg-slate-800 text-slate-400"
                              : "border-slate-200 hover:bg-white text-slate-600"
                        )}
                        title={ic.label}
                      >
                        {renderMedicalGroupIcon(ic.id, 20)}
                        <span className="text-[9px] truncate max-w-full">{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chọn Màu Material Design */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette size={14} />
                    Bảng màu Material Design
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">Mã màu: {formColor}</span>
                </label>
                <div className="grid grid-cols-7 gap-2 p-2.5 rounded-2xl border bg-slate-500/5">
                  {MATERIAL_DESIGN_COLORS.map((c) => {
                    const isSelected = formColor === c.hex;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectColor(c)}
                        title={c.name}
                        className={cn(
                          "h-9 rounded-xl flex items-center justify-center transition-all relative",
                          isSelected ? "scale-110 shadow-md ring-2 ring-offset-2 ring-blue-500" : "hover:scale-105"
                        )}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && <Check size={16} className="text-white drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thứ tự & Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value) || 1)}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                {/* Preview Badge */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Xem trước hiển thị
                  </label>
                  <div
                    className="p-2.5 rounded-xl border flex items-center gap-2.5"
                    style={{
                      borderColor: `${formColor}40`,
                      backgroundColor: isDarkMode ? `${formColor}15` : `${formColor}10`
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: formColor }}
                    >
                      {renderMedicalGroupIcon(formIcon, 15)}
                    </div>
                    <span className="text-xs font-black truncate" style={{ color: formColor }}>
                      {formName || 'Tên nhóm'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-colors",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  )}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Đang lưu...' : editingGroup ? 'Cập nhật nhóm' : 'Tạo nhóm mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
