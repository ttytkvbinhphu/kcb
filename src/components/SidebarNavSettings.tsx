import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  ChevronsUp, 
  ChevronsDown, 
  Search, 
  Sparkles, 
  Check, 
  Compass, 
  ShieldCheck, 
  Database, 
  Sliders, 
  Eye, 
  Info,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SystemSettings, SidebarNavOrderSettings } from '../types';
import { 
  ALL_SIDEBAR_DEFINITIONS, 
  DEFAULT_SIDEBAR_GENERAL_ORDER, 
  DEFAULT_SIDEBAR_ADMIN_ORDER, 
  DEFAULT_SIDEBAR_DATA_ORDER, 
  getSidebarIconComponent,
  getSidebarItemDefinition
} from '../lib/sidebarNavDefaults';

interface SidebarNavSettingsProps {
  isDarkMode: boolean;
  editSettings: SystemSettings;
  setEditSettings: (settings: SystemSettings) => void;
  featureSettings?: Record<string, any>;
  onSwitchPreview?: (previewTab: 'sidebar' | 'mobile_nav' | 'workspace' | 'login') => void;
}

export const SidebarNavSettings: React.FC<SidebarNavSettingsProps> = ({
  isDarkMode,
  editSettings,
  setEditSettings,
  featureSettings = {},
  onSwitchPreview
}) => {
  const [activeSection, setActiveSection] = useState<'general' | 'admin' | 'data'>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMovedId, setLastMovedId] = useState<string | null>(null);

  const sidebarNavOrder: SidebarNavOrderSettings = editSettings.sidebarNavOrder || {};

  // Retrieve current order for the active section, falling back to defaults if not customized
  const getCurrentOrder = (section: 'general' | 'admin' | 'data'): string[] => {
    if (section === 'admin') {
      const custom = sidebarNavOrder.admin;
      if (custom && custom.length > 0) {
        // Ensure all default admin items are present
        const customSet = new Set(custom);
        const missing = DEFAULT_SIDEBAR_ADMIN_ORDER.filter(id => !customSet.has(id));
        return [...custom, ...missing];
      }
      return DEFAULT_SIDEBAR_ADMIN_ORDER;
    }

    if (section === 'data') {
      const custom = sidebarNavOrder.data;
      if (custom && custom.length > 0) {
        const customSet = new Set(custom);
        const missing = DEFAULT_SIDEBAR_DATA_ORDER.filter(id => !customSet.has(id));
        return [...custom, ...missing];
      }
      return DEFAULT_SIDEBAR_DATA_ORDER;
    }

    // general section
    const custom = sidebarNavOrder.general;
    if (custom && custom.length > 0) {
      const customSet = new Set(custom);
      const missing = DEFAULT_SIDEBAR_GENERAL_ORDER.filter(id => !customSet.has(id));
      return [...custom, ...missing];
    }
    return DEFAULT_SIDEBAR_GENERAL_ORDER;
  };

  const currentOrder = getCurrentOrder(activeSection);

  const updateSectionOrder = (section: 'general' | 'admin' | 'data', newOrder: string[]) => {
    const updated = {
      ...(editSettings.sidebarNavOrder || {}),
      [section]: newOrder
    };
    setEditSettings({
      ...editSettings,
      sidebarNavOrder: updated
    });

    // Also dispatch event for instant feedback across components
    window.dispatchEvent(new CustomEvent('sidebar-order-updated', { 
      detail: { section, order: newOrder } 
    }));
  };

  const handleMove = (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const list = [...currentOrder];
    const index = list.indexOf(id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    } else if (direction === 'top' && index > 0) {
      const [item] = list.splice(index, 1);
      list.unshift(item);
    } else if (direction === 'bottom' && index < list.length - 1) {
      const [item] = list.splice(index, 1);
      list.push(item);
    }

    setLastMovedId(id);
    setTimeout(() => setLastMovedId(null), 1000);
    updateSectionOrder(activeSection, list);
  };

  const handleReset = () => {
    const defaultList = activeSection === 'admin' 
      ? DEFAULT_SIDEBAR_ADMIN_ORDER 
      : activeSection === 'data' 
        ? DEFAULT_SIDEBAR_DATA_ORDER 
        : DEFAULT_SIDEBAR_GENERAL_ORDER;
    updateSectionOrder(activeSection, defaultList);
  };

  const handleReorder = (newOrder: string[]) => {
    updateSectionOrder(activeSection, newOrder);
  };

  // Filter items for search
  const filteredOrder = currentOrder.filter(id => {
    if (!searchQuery.trim()) return true;
    const def = getSidebarItemDefinition(id);
    const customTitle = featureSettings[id]?.customTitle || '';
    const q = searchQuery.toLowerCase().trim();
    return def.defaultLabel.toLowerCase().includes(q) || 
           customTitle.toLowerCase().includes(q) || 
           def.category.toLowerCase().includes(q) ||
           def.description.toLowerCase().includes(q);
  });

  const sectionTabs = [
    { 
      id: 'general' as const, 
      label: 'Mục Thành viên & Lâm sàng', 
      desc: 'Menu chính dùng hàng ngày',
      icon: Compass, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      count: DEFAULT_SIDEBAR_GENERAL_ORDER.length 
    },
    { 
      id: 'admin' as const, 
      label: 'Quản trị hệ thống (AdminCP)', 
      desc: 'Cài đặt và quản lý app',
      icon: ShieldCheck, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10',
      count: DEFAULT_SIDEBAR_ADMIN_ORDER.length 
    },
    { 
      id: 'data' as const, 
      label: 'Kho Dữ liệu chuyên môn', 
      desc: 'Cơ sở dữ liệu thuốc & phác đồ',
      icon: Database, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      count: DEFAULT_SIDEBAR_DATA_ORDER.length 
    },
  ];

  return (
    <div className={cn(
      "p-6 sm:p-8 rounded-[32px] border transition-all space-y-6 shadow-sm",
      isDarkMode ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
    )}>
      {/* Header */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b",
        isDarkMode ? "border-slate-800" : "border-slate-100"
      )}>
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl shrink-0">
            <Sliders size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={cn("text-base font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                Thiết kế Thứ tự Mục Nav ở Left Sidebar
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Tự sắp xếp
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tự do kéo thả hoặc dùng nút mũi tên để thiết kế thứ tự điều hướng thanh bên PC theo ý muốn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {onSwitchPreview && (
            <button
              type="button"
              onClick={() => onSwitchPreview('sidebar')}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm",
                isDarkMode 
                  ? "bg-slate-800 border-slate-700 text-blue-400 hover:text-white hover:bg-slate-700" 
                  : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
              )}
              title="Xem trước Left Sidebar"
            >
              <Eye size={13} />
              <span>Xem Sidebar</span>
            </button>
          )}

          <button
            id="btn-reset-sidebar-nav-order"
            type="button"
            onClick={handleReset}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              isDarkMode 
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700" 
                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
            title="Khôi phục thứ tự chuẩn của phân hệ này"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Khôi phục mặc định</span>
          </button>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sectionTabs.map((tab) => {
          const isSelected = activeSection === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={`sidebar-sec-tab-${tab.id}`}
              type="button"
              onClick={() => {
                setActiveSection(tab.id);
                setSearchQuery('');
              }}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3 cursor-pointer group",
                isSelected
                  ? (isDarkMode 
                      ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25" 
                      : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20")
                  : (isDarkMode 
                      ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300 hover:border-slate-600" 
                      : "bg-slate-50/80 border-slate-200/90 hover:bg-white text-slate-700 hover:border-slate-300")
              )}
            >
              <div className={cn(
                "p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105",
                isSelected 
                  ? "bg-white/20 text-white" 
                  : cn(tab.bg, tab.color)
              )}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className={cn("text-xs font-black truncate", isSelected ? "text-white" : (isDarkMode ? "text-white" : "text-slate-900"))}>
                    {tab.label}
                  </p>
                  <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.2 rounded-md shrink-0",
                    isSelected ? "bg-white/25 text-white" : (isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-700")
                  )}>
                    {tab.count}
                  </span>
                </div>
                <p className={cn("text-[10.5px] font-medium truncate mt-0.5", isSelected ? "text-white/80" : "text-slate-400")}>
                  {tab.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Statistics Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm nhanh mục điều hướng (tên, chức năng, chuyên khoa)..."
            className={cn(
              "w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border outline-none transition-all",
              isDarkMode 
                ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500" 
                : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500"
            )}
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-200"
            >
              Xóa
            </button>
          )}
        </div>

        <div className={cn(
          "px-3 py-2 rounded-xl border text-[11px] font-medium flex items-center gap-2 shrink-0",
          isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
        )}>
          <Info size={13} className="text-blue-500 shrink-0" />
          <span>Vị trí đầu tiên:</span>
          <span className="font-black text-blue-600 dark:text-blue-400">
            {getSidebarItemDefinition(currentOrder[0])?.defaultLabel || 'Chưa thiết lập'}
          </span>
        </div>
      </div>

      {/* Nav Items List */}
      <div className="space-y-2">
        <Reorder.Group 
          axis="y" 
          values={searchQuery ? filteredOrder : currentOrder} 
          onReorder={searchQuery ? () => {} : handleReorder} 
          className="space-y-2"
        >
          {filteredOrder.map((id, index) => {
            const def = getSidebarItemDefinition(id);
            const IconComp = getSidebarIconComponent(def.iconName);
            const customTitle = featureSettings[id]?.customTitle;
            const displayTitle = customTitle || def.defaultLabel;
            const fullIndex = currentOrder.indexOf(id);
            const isFirst = fullIndex === 0;
            const isLast = fullIndex === currentOrder.length - 1;
            const isRecentlyMoved = lastMovedId === id;

            return (
              <Reorder.Item
                key={`sidebar-item-${id}`}
                value={id}
                dragListener={!searchQuery}
                className={cn(
                  "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group select-none",
                  isDarkMode 
                    ? "bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/80 hover:border-slate-600" 
                    : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300 shadow-sm",
                  isRecentlyMoved && "ring-2 ring-blue-500 bg-blue-500/10",
                  !searchQuery ? "cursor-grab active:cursor-grabbing" : ""
                )}
              >
                {/* Left: Drag Handle, Number, Icon, Title, Category */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Drag Handle */}
                  <div 
                    className="text-slate-400 group-hover:text-blue-500 p-1 shrink-0 transition-colors"
                    title={searchQuery ? "Xóa tìm kiếm để kéo thả" : "Kéo thả để đổi thứ tự"}
                  >
                    <GripVertical size={16} />
                  </div>

                  {/* Order Index */}
                  <span className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                    isFirst 
                      ? "bg-blue-600 text-white font-black shadow-sm" 
                      : (isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-700")
                  )}>
                    #{fullIndex + 1}
                  </span>

                  {/* Icon Box */}
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                    isDarkMode ? "bg-slate-700 text-white" : "bg-white text-slate-800 border border-slate-200"
                  )}>
                    <IconComp size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>

                  {/* Text Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <h4 className={cn("text-xs font-black truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                        {displayTitle}
                      </h4>
                      {customTitle && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Đã đổi tên
                        </span>
                      )}
                      <span className={cn(
                        "text-[9.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline-block",
                        def.badgeColor || "bg-slate-500/10 text-slate-600"
                      )}>
                        {def.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      {def.description}
                    </p>
                  </div>
                </div>

                {/* Right: Actions (Top, Up, Down, Bottom) */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Move to Top */}
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMove(id, 'top')}
                    className={cn(
                      "p-1.5 rounded-lg disabled:opacity-20 transition-all cursor-pointer",
                      isDarkMode 
                        ? "text-slate-400 hover:text-white hover:bg-slate-700" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                    )}
                    title="Đưa lên đầu danh sách (#1)"
                  >
                    <ChevronsUp size={15} />
                  </button>

                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMove(id, 'up')}
                    className={cn(
                      "p-1.5 rounded-lg disabled:opacity-20 transition-all cursor-pointer",
                      isDarkMode 
                        ? "text-slate-400 hover:text-white hover:bg-slate-700" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                    )}
                    title="Lên 1 vị trí"
                  >
                    <ArrowUp size={15} />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => handleMove(id, 'down')}
                    className={cn(
                      "p-1.5 rounded-lg disabled:opacity-20 transition-all cursor-pointer",
                      isDarkMode 
                        ? "text-slate-400 hover:text-white hover:bg-slate-700" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                    )}
                    title="Xuống 1 vị trí"
                  >
                    <ArrowDown size={15} />
                  </button>

                  {/* Move to Bottom */}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => handleMove(id, 'bottom')}
                    className={cn(
                      "p-1.5 rounded-lg disabled:opacity-20 transition-all cursor-pointer",
                      isDarkMode 
                        ? "text-slate-400 hover:text-white hover:bg-slate-700" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                    )}
                    title="Đưa xuống cuối danh sách"
                  >
                    <ChevronsDown size={15} />
                  </button>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {filteredOrder.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-xs">
            Không tìm thấy mục nào khớp với từ khóa "{searchQuery}"
          </div>
        )}
      </div>

      {/* Helpful footer info */}
      <div className={cn(
        "p-3.5 rounded-2xl border text-xs flex items-start gap-2.5",
        isDarkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-100 text-blue-700"
      )}>
        <Sparkles size={16} className="shrink-0 text-blue-500 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Lưu ý sau khi sắp xếp:</p>
          <p className="text-[11px] opacity-90">
            Thứ tự bạn thiết kế tại đây sẽ trở thành thứ tự mặc định cho toàn bộ thành viên và phân hệ tương ứng. Sau khi sắp xếp xong, hãy nhấn nút <strong>"Lưu cấu hình"</strong> ở cuối trang để áp dụng toàn diện vào hệ thống.
          </p>
        </div>
      </div>
    </div>
  );
};
export default SidebarNavSettings;
