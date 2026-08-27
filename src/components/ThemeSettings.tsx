import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  Image as ImageIcon, 
  Layout, 
  Palette, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Pill, 
  LogIn, 
  Search, 
  Zap, 
  ClipboardList, 
  MessageSquare, 
  Sparkles,
  Sliders,
  Timer,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Flame,
  Clock,
  Gauge,
  Smartphone,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  Layers,
  Settings,
  HelpCircle,
  FolderTree,
  LayoutGrid,
  Menu,
  ShieldCheck,
  Check,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SystemSettings, MobileNavButtonConfig, MobileBottomNavSettings } from '../types';
import { 
  DEFAULT_MOBILE_NAV_BUTTONS, 
  DEFAULT_MOBILE_BOTTOM_NAV_SETTINGS, 
  AVAILABLE_NAV_ICONS, 
  AVAILABLE_TARGET_TABS, 
  NAV_HIGHLIGHT_COLORS,
  getNavIconComponent 
} from '../lib/mobileNavDefaults';

interface ThemeSettingsProps {
  isDarkMode: boolean;
  editSettings: SystemSettings;
  setEditSettings: (settings: SystemSettings) => void;
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

const SPEED_PRESETS = [
  { value: 3, label: '3s (Nhanh)', desc: 'Phù hợp lướt nhanh tin' },
  { value: 5, label: '5s (Chuẩn)', desc: 'Thời gian tối ưu đọc thông tin' },
  { value: 8, label: '8s (Vừa)', desc: 'Dễ quan sát & nắm bắt' },
  { value: 12, label: '12s (Chậm)', desc: 'Đọc kỹ thông số & hoạt chất' },
];

const MOCK_PREVIEW_DRUGS = [
  { id: '1', name: 'Paracetamol 500mg', active: 'Paracetamol', form: 'Viên nén', badge: 'Mới cập nhật', color: 'from-blue-500/20 to-indigo-500/20', border: 'border-blue-500/30' },
  { id: '2', name: 'Amoxicillin + Clavulanate 1g', active: 'Amoxicillin, Acid clavulanic', form: 'Viên bao phim', badge: 'Kháng sinh', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30' },
  { id: '3', name: 'Atorvastatin 20mg', active: 'Atorvastatin calcium', form: 'Viên nén bao phim', badge: 'Tim mạch', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30' },
  { id: '4', name: 'Pantoprazole 40mg', active: 'Pantoprazole sodium', form: 'Viên kháng dịch dạ dày', badge: 'Tiêu hóa', color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30' },
];

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ 
  isDarkMode, 
  editSettings, 
  setEditSettings, 
  onSave, 
  isSaving, 
  saveSuccess 
}) => {
  const [previewTab, setPreviewTab] = useState<'workspace' | 'login' | 'mobile_nav'>('workspace');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
  const [simulatedActiveButtonId, setSimulatedActiveButtonId] = useState<string>('btn_workspace');

  const currentSlideSpeed = editSettings.workspaceSlideSpeed ?? 5;
  const isAutoPlay = editSettings.workspaceSlideAutoPlay !== false;

  // Mobile Bottom Nav Settings extraction
  const navSettings: MobileBottomNavSettings = editSettings.mobileBottomNav || DEFAULT_MOBILE_BOTTOM_NAV_SETTINGS;
  const navButtons: MobileNavButtonConfig[] = navSettings.buttons && navSettings.buttons.length > 0 
    ? navSettings.buttons 
    : DEFAULT_MOBILE_NAV_BUTTONS;

  const updateNavSettings = (newNavSettings: MobileBottomNavSettings) => {
    setEditSettings({
      ...editSettings,
      mobileBottomNav: newNavSettings
    });
  };

  const handleUpdateButton = (buttonId: string, updates: Partial<MobileNavButtonConfig>) => {
    const updatedButtons = navButtons.map(b => b.id === buttonId ? { ...b, ...updates } : b);
    updateNavSettings({
      ...navSettings,
      buttons: updatedButtons
    });
  };

  const handleToggleVisibility = (buttonId: string) => {
    const updatedButtons = navButtons.map(b => b.id === buttonId ? { ...b, isVisible: !b.isVisible } : b);
    updateNavSettings({
      ...navSettings,
      buttons: updatedButtons
    });
  };

  const handleMoveButton = (index: number, direction: 'up' | 'down') => {
    const newButtons = [...navButtons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newButtons.length) return;

    const temp = newButtons[index];
    newButtons[index] = newButtons[targetIndex];
    newButtons[targetIndex] = temp;

    // re-assign order property
    const reordered = newButtons.map((b, i) => ({ ...b, order: i + 1 }));
    updateNavSettings({
      ...navSettings,
      buttons: reordered
    });
  };

  const handleDeleteButton = (buttonId: string) => {
    if (navButtons.length <= 1) return;
    const updatedButtons = navButtons.filter(b => b.id !== buttonId).map((b, i) => ({ ...b, order: i + 1 }));
    if (editingButtonId === buttonId) setEditingButtonId(null);
    updateNavSettings({
      ...navSettings,
      buttons: updatedButtons
    });
  };

  const handleAddButton = () => {
    const newId = `btn_${Date.now()}`;
    const newButton: MobileNavButtonConfig = {
      id: newId,
      label: 'Tính năng mới',
      icon: 'Sparkles',
      actionType: 'tab',
      targetTab: 'dashboard',
      isVisible: true,
      order: navButtons.length + 1,
      highlightColor: 'primary'
    };
    updateNavSettings({
      ...navSettings,
      buttons: [...navButtons, newButton]
    });
    setEditingButtonId(newId);
  };

  const handleResetDefaultNav = () => {
    updateNavSettings({
      enabled: true,
      navStyle: 'default',
      showLabels: 'always',
      buttons: DEFAULT_MOBILE_NAV_BUTTONS
    });
    setEditingButtonId(null);
  };

  // Simulator for Slide in Live Preview
  useEffect(() => {
    if (!isAutoPlay) {
      setSlideProgress(0);
      return;
    }

    const intervalMs = 50;
    const totalMs = Math.max(1, currentSlideSpeed) * 1000;
    const step = (intervalMs / totalMs) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setActiveSlideIndex((curr) => (curr + 1) % MOCK_PREVIEW_DRUGS.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentSlideSpeed, isAutoPlay]);

  return (
    <div id="theme-settings-container" className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Editor Panel */}
      <div className="xl:col-span-7 space-y-8">
        
        {/* 1. Mobile Bottom Navigation Customization Section */}
        <div className={cn(
          "p-6 sm:p-8 rounded-[32px] border transition-all space-y-6 shadow-sm",
          isDarkMode ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
        )}>
          <div className={cn(
            "flex items-center justify-between pb-4 border-b",
            isDarkMode ? "border-slate-800" : "border-slate-100"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                <Smartphone size={22} />
              </div>
              <div>
                <h3 className={cn("text-base font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                  Tùy chỉnh Nút Mobile Bottom Nav
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cấu hình các nút điều hướng phía dưới cùng trên ứng dụng di động
                </p>
              </div>
            </div>

            <button
              id="btn-reset-default-mobile-nav"
              type="button"
              onClick={handleResetDefaultNav}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                isDarkMode 
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
              title="Khôi phục 5 nút mặc định"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Khôi phục mặc định</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* General Nav Styles & Behavior */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Style preset */}
              <div className="space-y-2">
                <label className={cn("text-[11px] font-black uppercase tracking-wider ml-1", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                  Kiểu dáng thanh điều hướng
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'default', label: 'Chuẩn mờ viền', desc: 'Bo viền mờ' },
                    { key: 'glass', label: 'Kính mờ (Glass)', desc: 'Hiệu ứng bóng' },
                    { key: 'floating', label: 'Dock nổi bo tròn', desc: 'Cách đáy 12px' },
                    { key: 'solid', label: 'Nền phẳng đặc', desc: 'Không mờ' }
                  ].map((styleItem, sIdx) => {
                    const isSelected = (navSettings.navStyle || 'default') === styleItem.key;
                    return (
                      <button
                        key={`nav-style-opt-${styleItem.key}-${sIdx}`}
                        id={`btn-nav-style-${styleItem.key}`}
                        type="button"
                        onClick={() => updateNavSettings({ ...navSettings, navStyle: styleItem.key as any })}
                        className={cn(
                          "p-2.5 rounded-2xl border text-left transition-all",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                            : isDarkMode 
                              ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200" 
                              : "bg-slate-50 border-slate-200 hover:bg-white text-slate-700"
                        )}
                      >
                        <p className={cn("text-xs font-black", isSelected ? "text-white" : (isDarkMode ? "text-white" : "text-slate-900"))}>
                          {styleItem.label}
                        </p>
                        <p className={cn("text-[10px] font-medium", isSelected ? "text-white/80" : "text-slate-400")}>
                          {styleItem.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Labels Mode */}
              <div className="space-y-2">
                <label className={cn("text-[11px] font-black uppercase tracking-wider ml-1", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                  Hiển thị nhãn văn bản
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'always', label: 'Luôn hiển thị chữ', desc: 'Hiện Icon kèm tiêu đề nút' },
                    { key: 'active_only', label: 'Chỉ hiện chữ khi chọn', desc: 'Thu gọn các nút không hoạt động' },
                    { key: 'hidden', label: 'Chỉ hiện Icon tối giản', desc: 'Ẩn hoàn toàn chữ, chỉ giữ icon' }
                  ].map((labelItem, lIdx) => {
                    const isSelected = (navSettings.showLabels || 'always') === labelItem.key;
                    return (
                      <button
                        key={`nav-label-opt-${labelItem.key}-${lIdx}`}
                        id={`btn-nav-labels-${labelItem.key}`}
                        type="button"
                        onClick={() => updateNavSettings({ ...navSettings, showLabels: labelItem.key as any })}
                        className={cn(
                          "p-2.5 px-3 rounded-2xl border text-left transition-all flex items-center justify-between",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                            : isDarkMode 
                              ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200" 
                              : "bg-slate-50 border-slate-200 hover:bg-white text-slate-700"
                        )}
                      >
                        <div>
                          <p className={cn("text-xs font-black", isSelected ? "text-white" : (isDarkMode ? "text-white" : "text-slate-900"))}>
                            {labelItem.label}
                          </p>
                          <p className={cn("text-[10px] font-medium", isSelected ? "text-white/80" : "text-slate-400")}>
                            {labelItem.desc}
                          </p>
                        </div>
                        {isSelected && <Check size={16} className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* List of Custom Navigation Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  <span>Danh sách các nút điều hướng ({navButtons.length} nút)</span>
                </label>
                
                <button
                  id="btn-add-mobile-nav-button"
                  type="button"
                  onClick={handleAddButton}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Thêm nút mới</span>
                </button>
              </div>

              {/* Reorderable buttons list */}
              <div className="space-y-2.5">
                {navButtons.map((button, index) => {
                  const IconComp = getNavIconComponent(button.icon);
                  const isExpanded = editingButtonId === button.id;
                  const highlightObj = NAV_HIGHLIGHT_COLORS.find(c => c.key === (button.highlightColor || 'primary')) || NAV_HIGHLIGHT_COLORS[0];

                  return (
                    <div
                      key={`theme-btn-card-${button.id}-${index}`}
                      id={`nav-button-card-${button.id}`}
                      className={cn(
                        "rounded-2xl border transition-all overflow-hidden",
                        isDarkMode ? "bg-slate-800/50 border-slate-700/80" : "bg-slate-50/80 border-slate-200/90",
                        isExpanded && (isDarkMode ? "ring-2 ring-blue-500/50 bg-slate-800" : "ring-2 ring-blue-500/30 bg-white shadow-md"),
                        !button.isVisible && "opacity-60"
                      )}
                    >
                      {/* Summary Row */}
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Order index */}
                          <span className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                            isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-700"
                          )}>
                            #{index + 1}
                          </span>

                          {/* Icon preview */}
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                            isDarkMode ? "bg-slate-700 text-white" : "bg-white text-slate-800 border border-slate-200"
                          )}>
                            <IconComp size={18} />
                          </div>

                          {/* Button label & action info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={cn("text-xs font-black truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                                {button.label || 'Không tên'}
                              </h4>
                              <span className={cn(
                                "w-2.5 h-2.5 rounded-full shrink-0",
                                highlightObj.bgClass
                              )} title={`Màu highlight: ${highlightObj.label}`} />
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                              {button.actionType === 'sheet_lookup' && 'Mở Sheet Tra cứu'}
                              {button.actionType === 'sheet_tools' && 'Mở Sheet Tiện ích'}
                              {button.actionType === 'sheet_menu' && 'Mở Menu Tất cả'}
                              {button.actionType === 'admin' && 'Bật/Tắt AdminCP'}
                              {button.actionType === 'tab' && `Mở tab: ${AVAILABLE_TARGET_TABS.find(t => t.id === button.targetTab)?.label || button.targetTab || 'Workspace'}`}
                            </p>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move up */}
                          <button
                            id={`btn-move-up-${button.id}`}
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveButton(index, 'up')}
                            className={cn(
                              "p-1.5 rounded-lg disabled:opacity-20 transition-colors cursor-pointer",
                              isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                            )}
                            title="Di chuyển lên"
                          >
                            <ArrowUp size={14} />
                          </button>

                          {/* Move down */}
                          <button
                            id={`btn-move-down-${button.id}`}
                            type="button"
                            disabled={index === navButtons.length - 1}
                            onClick={() => handleMoveButton(index, 'down')}
                            className={cn(
                              "p-1.5 rounded-lg disabled:opacity-20 transition-colors cursor-pointer",
                              isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                            )}
                            title="Di chuyển xuống"
                          >
                            <ArrowDown size={14} />
                          </button>

                          {/* Toggle visibility */}
                          <button
                            id={`btn-toggle-vis-${button.id}`}
                            type="button"
                            onClick={() => handleToggleVisibility(button.id)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors cursor-pointer",
                              button.isVisible 
                                ? (isDarkMode ? "text-emerald-400 hover:bg-emerald-500/20" : "text-emerald-600 hover:bg-emerald-50")
                                : (isDarkMode ? "text-slate-500 hover:bg-slate-700" : "text-slate-400 hover:bg-slate-200")
                            )}
                            title={button.isVisible ? "Đang hiện (Bấm để ẩn)" : "Đang ẩn (Bấm để hiện)"}
                          >
                            {button.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                          </button>

                          {/* Expand settings */}
                          <button
                            id={`btn-expand-button-${button.id}`}
                            type="button"
                            onClick={() => setEditingButtonId(isExpanded ? null : button.id)}
                            className={cn(
                              "p-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                              isExpanded 
                                ? "bg-blue-600 text-white" 
                                : (isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100")
                            )}
                          >
                            <Sliders size={13} />
                            <span className="text-[11px]">{isExpanded ? 'Đóng' : 'Sửa'}</span>
                          </button>

                          {/* Delete button */}
                          {navButtons.length > 1 && (
                            <button
                              id={`btn-delete-button-${button.id}`}
                              type="button"
                              onClick={() => handleDeleteButton(button.id)}
                              className={cn(
                                "p-1.5 rounded-lg transition-colors cursor-pointer",
                                isDarkMode ? "text-rose-400 hover:bg-rose-500/20" : "text-rose-500 hover:bg-rose-500/10"
                              )}
                              title="Xóa nút này"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Editing Panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              "border-t p-4 space-y-4",
                              isDarkMode ? "border-slate-700/80 bg-slate-900/40" : "border-slate-200 bg-white/70"
                            )}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Label text */}
                              <div className="space-y-1.5">
                                <label className={cn("text-[10px] font-black uppercase tracking-wider ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                  Tên nhãn hiển thị (Label)
                                </label>
                                <input
                                  id={`input-label-${button.id}`}
                                  type="text"
                                  value={button.label}
                                  onChange={(e) => handleUpdateButton(button.id, { label: e.target.value })}
                                  placeholder="Ví dụ: Tra cứu, Tiện ích, Workspace..."
                                  className={cn(
                                    "w-full px-3.5 py-2 text-xs font-bold rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                  )}
                                />
                              </div>

                              {/* Action Type */}
                              <div className="space-y-1.5">
                                <label className={cn("text-[10px] font-black uppercase tracking-wider ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                  Hành động khi nhấn nút
                                </label>
                                <select
                                  id={`select-action-${button.id}`}
                                  value={button.actionType}
                                  onChange={(e) => handleUpdateButton(button.id, { actionType: e.target.value as any })}
                                  className={cn(
                                    "w-full px-3 py-2 text-xs font-bold rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                  )}
                                >
                                  <option value="tab">Mở Tab/Tính năng cụ thể</option>
                                  <option value="sheet_lookup">Mở Sheet Tra cứu chuyên khoa (Drawer)</option>
                                  <option value="sheet_tools">Mở Sheet Tiện ích lâm sàng (Drawer)</option>
                                  <option value="sheet_menu">Mở Menu Tất cả tính năng (Drawer)</option>
                                  <option value="admin">Bật / Tắt chế độ AdminCP</option>
                                </select>
                              </div>
                            </div>

                            {/* If Action Type is 'tab', choose Target Tab */}
                            {button.actionType === 'tab' && (
                              <div className="space-y-1.5">
                                <label className={cn("text-[10px] font-black uppercase tracking-wider ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                  Tính năng đích cần mở (Target Tab)
                                </label>
                                <select
                                  id={`select-target-tab-${button.id}`}
                                  value={button.targetTab || 'dashboard'}
                                  onChange={(e) => handleUpdateButton(button.id, { targetTab: e.target.value })}
                                  className={cn(
                                    "w-full px-3 py-2 text-xs font-bold rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                  )}
                                >
                                  {AVAILABLE_TARGET_TABS.map((tab, tabIdx) => (
                                    <option key={`nav-tab-opt-${tab.id}-${tabIdx}`} value={tab.id}>
                                      [{tab.group}] - {tab.label} ({tab.id})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Icon selection picker */}
                            <div className="space-y-1.5">
                              <label className={cn("text-[10px] font-black uppercase tracking-wider ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Chọn Biểu tượng (Icon)
                              </label>
                              <div className={cn(
                                "grid grid-cols-6 sm:grid-cols-8 gap-2 p-2 rounded-xl border max-h-36 overflow-y-auto custom-scrollbar",
                                isDarkMode ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50 border-slate-200"
                              )}>
                                {AVAILABLE_NAV_ICONS.map((iconItem, iconIdx) => {
                                  const IconComponent = iconItem.icon;
                                  const isIconSelected = button.icon === iconItem.key;
                                  return (
                                    <button
                                      key={`nav-icon-opt-${iconItem.key}-${iconIdx}`}
                                      type="button"
                                      onClick={() => handleUpdateButton(button.id, { icon: iconItem.key })}
                                      className={cn(
                                        "p-2 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer",
                                        isIconSelected
                                          ? "bg-blue-600 text-white shadow-md scale-105"
                                          : isDarkMode 
                                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700" 
                                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                      )}
                                      title={iconItem.label}
                                    >
                                      <IconComponent size={18} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Highlight Color Picker */}
                            <div className="space-y-1.5">
                              <label className={cn("text-[10px] font-black uppercase tracking-wider ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Màu sắc nổi bật khi Active
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {NAV_HIGHLIGHT_COLORS.map((color, colorIdx) => {
                                  const isColorSelected = (button.highlightColor || 'primary') === color.key;
                                  return (
                                    <button
                                      key={`nav-hl-color-${color.key}-${colorIdx}`}
                                      type="button"
                                      onClick={() => handleUpdateButton(button.id, { highlightColor: color.key as any })}
                                      className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                                        isColorSelected 
                                          ? (isDarkMode ? "bg-slate-700 border-white text-white shadow-sm" : "bg-white border-slate-900 text-slate-900 shadow-sm")
                                          : (isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")
                                      )}
                                    >
                                      <span className={cn("w-3 h-3 rounded-full", color.bgClass)} />
                                      <span>{color.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Workspace Slide Speed Section */}
        <div className={cn(
          "p-6 sm:p-8 rounded-[32px] border transition-all space-y-6 shadow-sm",
          isDarkMode ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
        )}>
          <div className={cn(
            "flex items-center justify-between pb-4 border-b",
            isDarkMode ? "border-slate-800" : "border-slate-100"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                <Gauge size={22} />
              </div>
              <div>
                <h3 className={cn("text-base font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                  Tốc độ Slide Workspace
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cấu hình trình chiếu tự động cho danh sách thuốc & bản tin ở Trang chủ
                </p>
              </div>
            </div>
            
            <span className={cn(
              "px-3 py-1 text-xs font-black rounded-xl",
              isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
            )}>
              {currentSlideSpeed}s / lượt
            </span>
          </div>

          <div className="space-y-6">
            {/* Autoplay Toggle */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-2xl border transition-all",
              isDarkMode ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50 border-slate-100"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  isAutoPlay 
                    ? (isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600")
                    : (isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-500")
                )}>
                  {isAutoPlay ? <Play size={18} /> : <Pause size={18} />}
                </div>
                <div>
                  <p className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-900")}>
                    Tự động chạy Slide (Auto-play)
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isAutoPlay ? "Bật tự động cuộn thuốc & điểm tin" : "Tạm dừng tự động cuộn, chỉ cuộn khi bấm nút"}
                  </p>
                </div>
              </div>

              <button
                id="toggle-workspace-slide-autoplay"
                type="button"
                onClick={() => setEditSettings({ ...editSettings, workspaceSlideAutoPlay: !isAutoPlay })}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-all flex items-center shadow-inner cursor-pointer",
                  isAutoPlay ? "bg-blue-600 justify-end" : (isDarkMode ? "bg-slate-700 justify-start" : "bg-slate-300 justify-start")
                )}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {/* Slider Speed Range & Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-1.5", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                  <Timer size={14} className="text-blue-500" />
                  Thời gian chuyển Slide (2 - 30 giây)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="input-workspace-slide-speed-number"
                    type="number"
                    min="2"
                    max="30"
                    step="1"
                    disabled={!isAutoPlay}
                    value={currentSlideSpeed}
                    onChange={(e) => {
                      const val = Math.max(2, Math.min(30, parseInt(e.target.value) || 2));
                      setEditSettings({ ...editSettings, workspaceSlideSpeed: val });
                    }}
                    className={cn(
                      "w-16 px-2.5 py-1 text-center font-black text-xs rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900",
                      !isAutoPlay && "opacity-40 cursor-not-allowed"
                    )}
                  />
                  <span className="text-xs font-bold text-slate-500">giây</span>
                </div>
              </div>

              <input
                id="input-workspace-slide-speed-range"
                type="range"
                min="2"
                max="30"
                step="1"
                disabled={!isAutoPlay}
                value={currentSlideSpeed}
                onChange={(e) => setEditSettings({ ...editSettings, workspaceSlideSpeed: parseInt(e.target.value) })}
                className={cn(
                  "w-full h-2.5 rounded-lg appearance-none cursor-pointer transition-all",
                  isDarkMode ? "bg-slate-800" : "bg-slate-200",
                  "accent-blue-600 focus:outline-none",
                  !isAutoPlay && "opacity-40 cursor-not-allowed"
                )}
              />

              <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                <span>2s (Rất nhanh)</span>
                <span>15s</span>
                <span>30s (Chậm)</span>
              </div>
            </div>

            {/* Speed Presets Buttons */}
            <div className="space-y-2">
              <label className={cn("text-[11px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Mức cài đặt nhanh gợi ý
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPEED_PRESETS.map((preset, pIdx) => {
                  const isSelected = currentSlideSpeed === preset.value;
                  return (
                    <button
                      key={`preset-speed-${preset.value}-${pIdx}`}
                      id={`preset-speed-${preset.value}s`}
                      type="button"
                      disabled={!isAutoPlay}
                      onClick={() => setEditSettings({ ...editSettings, workspaceSlideSpeed: preset.value })}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                          : isDarkMode
                            ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200"
                            : "bg-slate-50 border-slate-200 hover:bg-white text-slate-700",
                        !isAutoPlay && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <span className={cn("text-xs font-black", isSelected ? "text-white" : "text-slate-900 dark:text-white")}>
                        {preset.label}
                      </span>
                      <span className={cn("text-[9px] line-clamp-1 font-medium", isSelected ? "text-white/80" : "text-slate-400")}>
                        {preset.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Login Screen Customization Section */}
        <div className={cn(
          "p-6 sm:p-8 rounded-[32px] border transition-all space-y-6 shadow-sm",
          isDarkMode ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
        )}>
          <div className={cn(
            "flex items-center gap-3 pb-4 border-b",
            isDarkMode ? "border-slate-800" : "border-slate-100"
          )}>
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
              <Layout size={22} />
            </div>
            <div>
              <h3 className={cn("text-base font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                Tùy chỉnh Giao diện Đăng nhập
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Logo, hình nền, màu chủ đạo và hiệu ứng thẻ đăng nhập
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Logo URL (Mặc định icon viên thuốc)
              </label>
              <input
                id="input-login-logo-url"
                type="text"
                placeholder="https://example.com/logo.png"
                className={cn(
                  "w-full px-5 py-3 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-sm",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                )}
                value={editSettings.loginLogoUrl || ''}
                onChange={(e) => setEditSettings({ ...editSettings, loginLogoUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Ảnh nền Login URL
              </label>
              <input
                id="input-login-bg-url"
                type="text"
                placeholder="https://images.unsplash.com/..."
                className={cn(
                  "w-full px-5 py-3 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-sm",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                )}
                value={editSettings.loginBgUrl || ''}
                onChange={(e) => setEditSettings({ ...editSettings, loginBgUrl: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Độ mờ nền (Blur: {editSettings.loginBgBlur || 0}px)
                </label>
                <input
                  id="input-login-bg-blur"
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  className={cn(
                    "w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-primary",
                    isDarkMode ? "bg-slate-800" : "bg-slate-200"
                  )}
                  value={editSettings.loginBgBlur || 0}
                  onChange={(e) => setEditSettings({ ...editSettings, loginBgBlur: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Độ tối nền ({editSettings.loginBgOpacity || 0}%)
                </label>
                <input
                  id="input-login-bg-opacity"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className={cn(
                    "w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-primary",
                    isDarkMode ? "bg-slate-800" : "bg-slate-200"
                  )}
                  value={editSettings.loginBgOpacity || 0}
                  onChange={(e) => setEditSettings({ ...editSettings, loginBgOpacity: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={cn("text-xs font-black uppercase tracking-widest ml-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Màu chủ đạo Login
              </label>
              <div className="flex gap-4 items-center">
                <input
                  id="input-login-primary-color-picker"
                  type="color"
                  className="w-12 h-12 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                  value={editSettings.loginPrimaryColor || '#3b82f6'}
                  onChange={(e) => setEditSettings({ ...editSettings, loginPrimaryColor: e.target.value })}
                />
                <input
                  id="input-login-primary-color-text"
                  type="text"
                  className={cn(
                    "flex-1 px-5 py-3 border-2 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all font-bold outline-none text-sm",
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                  )}
                  value={editSettings.loginPrimaryColor || '#3b82f6'}
                  onChange={(e) => setEditSettings({ ...editSettings, loginPrimaryColor: e.target.value })}
                />
              </div>
            </div>

            <div className={cn(
              "flex items-center justify-between p-4 rounded-2xl border transition-all",
              isDarkMode ? "border-slate-700/60 bg-slate-800/40" : "border-slate-100 bg-slate-50"
            )}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <Palette size={18} />
                </div>
                <div>
                  <p className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-900")}>Chế độ Glassmorphism</p>
                  <p className="text-[10px] text-slate-500 font-medium">Làm trong suốt thẻ đăng nhập với hiệu ứng kính mờ</p>
                </div>
              </div>
              <button
                id="toggle-login-glass-mode"
                type="button"
                onClick={() => setEditSettings({ ...editSettings, loginCardGlassMode: !editSettings.loginCardGlassMode })}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-all flex items-center shadow-inner cursor-pointer",
                  editSettings.loginCardGlassMode ? "bg-primary justify-end" : (isDarkMode ? "bg-slate-700 justify-start" : "bg-slate-200 justify-start")
                )}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className={cn(
          "sticky bottom-4 z-20 flex justify-between items-center p-4 sm:p-5 rounded-3xl border shadow-2xl backdrop-blur-xl transition-all",
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200"
        )}>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm"
                >
                  <CheckCircle2 size={18} />
                  Đã lưu cấu hình thành công!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            id="btn-save-theme-settings"
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg cursor-pointer",
              saveSuccess 
                ? "bg-emerald-500 text-white shadow-emerald-500/30" 
                : "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700 active:scale-95"
            )}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : (saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />)}
            {saveSuccess ? 'Đã lưu' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="xl:col-span-5 space-y-4">
        {/* Preview Selector Tabs */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-1">
            Bản xem trước trực tiếp
          </h3>
          <div className={cn(
            "p-1 rounded-2xl flex items-center gap-1 border flex-wrap sm:flex-nowrap",
            isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-200"
          )}>
            <button
              id="preview-tab-mobile-nav"
              type="button"
              onClick={() => setPreviewTab('mobile_nav')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                previewTab === 'mobile_nav'
                  ? (isDarkMode ? "bg-slate-900 text-white shadow-sm" : "bg-white text-blue-600 shadow-sm")
                  : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800")
              )}
            >
              <Smartphone size={14} />
              Mobile Nav
            </button>
            <button
              id="preview-tab-workspace"
              type="button"
              onClick={() => setPreviewTab('workspace')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                previewTab === 'workspace'
                  ? (isDarkMode ? "bg-slate-900 text-white shadow-sm" : "bg-white text-blue-600 shadow-sm")
                  : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800")
              )}
            >
              <Monitor size={14} />
              Slide Workspace
            </button>
            <button
              id="preview-tab-login"
              type="button"
              onClick={() => setPreviewTab('login')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                previewTab === 'login'
                  ? (isDarkMode ? "bg-slate-900 text-white shadow-sm" : "bg-white text-blue-600 shadow-sm")
                  : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800")
              )}
            >
              <LogIn size={14} />
              Đăng nhập
            </button>
          </div>
        </div>

        {/* Preview Screen Container */}
        <div className={cn(
          "relative w-full rounded-[36px] overflow-hidden border-4 sm:border-8 border-slate-900/5 shadow-2xl transition-all p-4",
          isDarkMode ? "bg-slate-950 border-slate-800/50" : "bg-slate-100 border-slate-200"
        )}>
          {previewTab === 'mobile_nav' ? (
            /* Mobile Bottom Nav Interactive Live Simulator */
            <div className="space-y-3 py-1">
              {/* Simulated Phone Top Bar */}
              <div className={cn(
                "flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-bold text-slate-400",
                isDarkMode ? "border-slate-800" : "border-slate-200"
              )}>
                <span className="font-mono">9:41 AM</span>
                <span className={cn("text-[11px] font-black", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  {editSettings.appName || 'KCB PB'} Mobile
                </span>
                <span>100% 🔋</span>
              </div>

              {/* Simulated Screen Content Body */}
              <div className={cn(
                "rounded-2xl p-4 min-h-[220px] flex flex-col justify-between border transition-all",
                isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200/80"
              )}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-lg text-[10px] font-black",
                      isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-500/10 text-blue-600"
                    )}>
                      Mô phỏng Giao diện Di động
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {navButtons.filter(b => b.isVisible).length} nút hiển thị
                    </span>
                  </div>

                  {/* Active feature title simulated */}
                  <div>
                    <h4 className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                      {(() => {
                        const activeBtn = navButtons.find(b => b.id === simulatedActiveButtonId);
                        if (!activeBtn) return 'Workspace';
                        return activeBtn.label;
                      })()}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {(() => {
                        const activeBtn = navButtons.find(b => b.id === simulatedActiveButtonId);
                        if (!activeBtn) return 'Trang tổng quan Workspace';
                        if (activeBtn.actionType === 'sheet_lookup') return 'Bảng Tra cứu nhanh chuyên khoa (Sheet)';
                        if (activeBtn.actionType === 'sheet_tools') return 'Bảng Tiện ích lâm sàng (Sheet)';
                        if (activeBtn.actionType === 'sheet_menu') return 'Menu Tất cả tính năng (Drawer)';
                        if (activeBtn.actionType === 'admin') return 'Chuyển sang chế độ AdminCP';
                        return `Đang hiển thị nội dung tab: ${activeBtn.targetTab || 'dashboard'}`;
                      })()}
                    </p>
                  </div>

                  {/* Mock content blocks */}
                  <div className="space-y-2 pt-1">
                    <div className={cn(
                      "h-9 rounded-xl flex items-center px-3 gap-2",
                      isDarkMode ? "bg-slate-800" : "bg-slate-100"
                    )}>
                      <Search size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-400">Chạm các nút bên dưới để thử nghiệm...</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-center text-slate-400 italic pt-2">
                  Kiểu hiển thị: <span className="font-bold">{navSettings.navStyle || 'default'}</span> • Nhãn: <span className="font-bold">{navSettings.showLabels || 'always'}</span>
                </p>
              </div>

              {/* Simulated Mobile Bottom Nav Bar */}
              <div className="pt-2">
                <div
                  className={cn(
                    "transition-all duration-300 border flex items-center justify-around px-1 py-1.5",
                    // Style Presets
                    navSettings.navStyle === 'floating' 
                      ? (isDarkMode ? "bg-slate-900/95 border-slate-700/80 rounded-3xl shadow-xl" : "bg-white/95 border-slate-200 rounded-3xl shadow-xl")
                      : navSettings.navStyle === 'glass'
                        ? (isDarkMode ? "bg-slate-900/70 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-lg" : "bg-white/70 backdrop-blur-xl border-slate-200/60 rounded-2xl shadow-lg")
                        : navSettings.navStyle === 'solid'
                          ? (isDarkMode ? "bg-slate-900 border-slate-800 rounded-2xl" : "bg-white border-slate-200 rounded-2xl")
                          : (isDarkMode ? "bg-slate-950/95 border-slate-800 rounded-2xl" : "bg-white/95 border-slate-200 rounded-2xl")
                  )}
                >
                  {navButtons.filter(b => b.isVisible).map((btn, btnIdx) => {
                    const IconComp = getNavIconComponent(btn.icon);
                    const isSimActive = simulatedActiveButtonId === btn.id;
                    const highlightObj = NAV_HIGHLIGHT_COLORS.find(c => c.key === (btn.highlightColor || 'primary')) || NAV_HIGHLIGHT_COLORS[0];
                    const showLabels = navSettings.showLabels || 'always';
                    const isLabelVisible = showLabels === 'always' || (showLabels === 'active_only' && isSimActive);

                    return (
                      <button
                        key={`preview-nav-btn-${btn.id}-${btnIdx}`}
                        type="button"
                        onClick={() => setSimulatedActiveButtonId(btn.id)}
                        className={cn(
                          "flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative cursor-pointer",
                          isSimActive 
                            ? cn("font-black scale-105", highlightObj.textClass)
                            : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-xl transition-all",
                          isSimActive 
                            ? (isDarkMode ? highlightObj.activeDarkBg : highlightObj.activeLightBg)
                            : (isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100")
                        )}>
                          <IconComp size={18} strokeWidth={isSimActive ? 2.5 : 2} />
                        </div>
                        {isLabelVisible && (
                          <span className="text-[9px] tracking-tight mt-0.5 whitespace-nowrap truncate max-w-[56px]">
                            {btn.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={cn(
                "p-3 rounded-xl border text-[11px] font-medium flex items-center gap-2",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
              )}>
                <Sparkles size={14} className="text-amber-500 shrink-0" />
                <span>
                  Bấm trực tiếp vào các nút trên thanh mô phỏng để kiểm tra phản hồi màu sắc và nhãn.
                </span>
              </div>
            </div>
          ) : previewTab === 'workspace' ? (
            /* Workspace Slide Live Simulator */
            <div className="space-y-4 py-2">
              {/* Header simulation */}
              <div className={cn(
                "flex items-center justify-between pb-3 border-b",
                isDarkMode ? "border-slate-800" : "border-slate-200"
              )}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className={cn("text-xs font-black", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                    Thanh trượt Thuốc mới cập nhật
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                    isDarkMode ? "text-slate-400 bg-slate-800" : "text-slate-600 bg-slate-200"
                  )}>
                    {isAutoPlay ? `Chuyển mỗi ${currentSlideSpeed}s` : 'Đang tạm dừng'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              {isAutoPlay && (
                <div className={cn(
                  "w-full h-1.5 rounded-full overflow-hidden",
                  isDarkMode ? "bg-slate-800" : "bg-slate-200"
                )}>
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-75"
                    style={{ width: `${slideProgress}%` }}
                  />
                </div>
              )}

              {/* Slide Card Simulated Carousel */}
              <div className="relative overflow-hidden rounded-2xl min-h-[220px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlideIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.35 }}
                    className={cn(
                      "p-5 rounded-2xl border flex flex-col justify-between h-full bg-gradient-to-br transition-all shadow-md",
                      MOCK_PREVIEW_DRUGS[activeSlideIndex].color,
                      MOCK_PREVIEW_DRUGS[activeSlideIndex].border,
                      isDarkMode ? "bg-slate-900" : "bg-white"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                          {MOCK_PREVIEW_DRUGS[activeSlideIndex].badge}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          #{activeSlideIndex + 1} / {MOCK_PREVIEW_DRUGS.length}
                        </span>
                      </div>

                      <h4 className={cn("text-base font-black line-clamp-1", isDarkMode ? "text-white" : "text-slate-900")}>
                        {MOCK_PREVIEW_DRUGS[activeSlideIndex].name}
                      </h4>

                      <p className={cn("text-xs font-semibold line-clamp-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        Hoạt chất: {MOCK_PREVIEW_DRUGS[activeSlideIndex].active}
                      </p>

                      <div className={cn(
                        "inline-block px-2 py-0.5 rounded-md text-[10px] font-bold",
                        isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                      )}>
                        {MOCK_PREVIEW_DRUGS[activeSlideIndex].form}
                      </div>
                    </div>

                    <div className={cn(
                      "pt-4 mt-2 border-t flex items-center justify-between",
                      isDarkMode ? "border-slate-800" : "border-slate-200/50"
                    )}>
                      <span className="text-[10px] text-slate-400 font-medium">BHYT 100% chi trả</span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setActiveSlideIndex((prev) => (prev - 1 + MOCK_PREVIEW_DRUGS.length) % MOCK_PREVIEW_DRUGS.length)}
                          className={cn(
                            "p-1 rounded-lg transition-colors cursor-pointer",
                            isDarkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600"
                          )}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button 
                          onClick={() => setActiveSlideIndex((prev) => (prev + 1) % MOCK_PREVIEW_DRUGS.length)}
                          className={cn(
                            "p-1 rounded-lg transition-colors cursor-pointer",
                            isDarkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600"
                          )}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Dots navigation simulator */}
              <div className="flex justify-center items-center gap-1.5 pt-2">
                {MOCK_PREVIEW_DRUGS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveSlideIndex(i);
                      setSlideProgress(0);
                    }}
                    className={cn(
                      "h-2 rounded-full transition-all cursor-pointer",
                      activeSlideIndex === i 
                        ? "w-6 bg-blue-600" 
                        : (isDarkMode ? "w-2 bg-slate-700" : "w-2 bg-slate-300")
                    )}
                  />
                ))}
              </div>

              <div className={cn(
                "p-3 rounded-xl border text-[11px] font-medium flex items-center gap-2",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
              )}>
                <Sparkles size={14} className="text-amber-500 shrink-0" />
                <span>
                  Trình mô phỏng hiển thị đúng tốc độ trượt thực tế {currentSlideSpeed}s mà bạn đang thiết lập.
                </span>
              </div>
            </div>
          ) : (
            /* Login Preview */
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden flex items-center justify-center p-2">
              {/* Background */}
              <div className="absolute inset-0 z-0">
                {editSettings.loginBgUrl ? (
                  <img 
                    src={editSettings.loginBgUrl || undefined} 
                    className="w-full h-full object-cover" 
                    alt="Background preview" 
                    style={{ filter: `blur(${editSettings.loginBgBlur || 0}px)` }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-900/5" />
                )}
                <div 
                  className="absolute inset-0 bg-black" 
                  style={{ opacity: (editSettings.loginBgOpacity || 0) / 100 }} 
                />
              </div>

              {/* Login Card Preview */}
              <div className="w-full max-w-sm grid grid-cols-1 gap-4 items-center relative z-10 scale-[0.75]">
                <div className={cn(
                  "p-6 rounded-[32px] border transition-all text-center",
                  editSettings.loginCardGlassMode 
                    ? "bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl" 
                    : "bg-white border-transparent shadow-2xl"
                )}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md" style={{ backgroundColor: editSettings.loginPrimaryColor || '#3b82f6' }}>
                    {editSettings.loginLogoUrl ? (
                      <img src={editSettings.loginLogoUrl || undefined} className="w-8 h-8 object-contain" alt="Logo preview" referrerPolicy="no-referrer" />
                    ) : (
                      <Pill size={24} className="text-white" />
                    )}
                  </div>
                  <h1 className={cn("text-xl font-black mb-1", editSettings.loginCardGlassMode ? "text-white" : "text-slate-900")}>
                    {editSettings.appName || 'KCB Portal'}
                  </h1>
                  <p className={cn("text-[9px] font-bold mb-6", editSettings.loginCardGlassMode ? "text-white/60" : "text-slate-500")}>
                    {editSettings.loginSubtitle || 'Hệ thống Quản lý Y tế'}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-white" style={{ backgroundColor: '#111827' }}>
                      Đăng nhập <LogIn size={12} />
                    </div>
                    <div className={cn("h-0.5 w-1/2 mx-auto", isDarkMode ? "bg-slate-700" : "bg-slate-200")} />
                    <p className="text-[8px] text-slate-400">Bảo mật bởi Google</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
