import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Star,
  Pill,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Table,
  LayoutGrid,
  FileText,
  ChevronRight,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ICD10_CHAPTERS, ICD10ChapterDef } from '../lib/icdChapters';

interface ICD10DirectorySidebarProps {
  isDarkMode?: boolean;
  activeTab?: string;
  totalIcd: number;
  selectedChapterId: string; // 'all' or 'I', 'II', ..., 'XXII'
  onSelectChapter: (chapterId: string) => void;
  chapterCounts: Record<string, number>;
  favoriteOnlyFilter: boolean;
  setFavoriteOnlyFilter: (val: boolean | ((prev: boolean) => boolean)) => void;
  favoriteCount: number;
  guideCount?: number;
  guideOnlyFilter?: boolean;
  onToggleGuideFilter?: () => void;
  suggestionCount?: number;
  suggestionOnlyFilter?: boolean;
  onToggleSuggestionFilter?: () => void;
  viewStyle?: 'excel' | 'card';
  onToggleViewStyle?: (style: 'excel' | 'card') => void;
  canManage?: boolean;
  onOpenAddModal?: () => void;
}

const STORAGE_KEY = 'icd_directory_sidebar_collapsed';

export const ICD10DirectorySidebar: React.FC<ICD10DirectorySidebarProps> = ({
  isDarkMode = false,
  activeTab,
  totalIcd,
  selectedChapterId,
  onSelectChapter,
  chapterCounts,
  favoriteOnlyFilter,
  setFavoriteOnlyFilter,
  favoriteCount,
  guideCount = 0,
  guideOnlyFilter = false,
  onToggleGuideFilter,
  suggestionCount = 0,
  suggestionOnlyFilter = false,
  onToggleSuggestionFilter,
  viewStyle = 'card',
  onToggleViewStyle,
  canManage = false,
  onOpenAddModal
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [chapterSearch, setChapterSearch] = useState('');

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isManage = activeTab === 'manage_icd10';

  // Filter chapters list based on chapterSearch
  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return ICD10_CHAPTERS;
    const query = chapterSearch.trim().toLowerCase();
    return ICD10_CHAPTERS.filter(chap => {
      return (
        chap.roman.toLowerCase() === query ||
        chap.name.toLowerCase().includes(query) ||
        chap.shortName.toLowerCase().includes(query) ||
        chap.codeRange.toLowerCase().includes(query) ||
        `chương ${chap.roman}`.toLowerCase().includes(query)
      );
    });
  }, [chapterSearch]);

  const isAllActive = selectedChapterId === 'all' && !favoriteOnlyFilter && !guideOnlyFilter && !suggestionOnlyFilter;

  return (
    <aside
      id="icd-directory-left-sidebar"
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
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-black uppercase tracking-wider truncate text-slate-900 dark:text-white leading-tight">
                {isManage ? "Quản lý ICD-10" : "Tra cứu ICD-10"}
              </h2>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                {totalIcd.toLocaleString('vi-VN')} mã bệnh
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
          title={isCollapsed ? "Mở rộng thanh phân loại (PC)" : "Thu gọn thanh phân loại (PC)"}
          aria-label={isCollapsed ? "Mở rộng thanh phân loại" : "Thu gọn thanh phân loại"}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Main Body List - Scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-2 space-y-3">
        {/* Quick Filters */}
        <div>
          {!isCollapsed && (
            <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 block mb-1.5">
              Danh mục tra cứu
            </span>
          )}

          <div className="space-y-1">
            {/* Tất cả mã ICD */}
            <button
              type="button"
              onClick={() => {
                onSelectChapter('all');
                setFavoriteOnlyFilter(false);
                if (guideOnlyFilter && onToggleGuideFilter) onToggleGuideFilter();
                if (suggestionOnlyFilter && onToggleSuggestionFilter) onToggleSuggestionFilter();
              }}
              className={cn(
                "w-full flex items-center rounded-lg transition-all text-xs font-bold group cursor-pointer relative select-none",
                isCollapsed ? "justify-center p-2.5 min-h-[44px]" : "justify-between px-2.5 py-2",
                isAllActive
                  ? isDarkMode
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-black shadow-2xs"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200 font-black shadow-2xs"
                  : isDarkMode
                    ? "text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
              )}
              title="Tất cả mã bệnh ICD-10"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen
                  size={16}
                  className={cn(
                    "shrink-0 transition-transform group-hover:scale-105",
                    isAllActive
                      ? isDarkMode ? "text-emerald-400" : "text-emerald-600"
                      : "text-slate-400 group-hover:text-current"
                  )}
                />
                {!isCollapsed && <span className="truncate">Tất cả mã bệnh</span>}
              </div>

              {!isCollapsed && (
                <span className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5",
                  isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                )}>
                  {totalIcd}
                </span>
              )}

              {isAllActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full" />
              )}
            </button>

            {/* Mã yêu thích / đã ghim */}
            <button
              type="button"
              onClick={() => setFavoriteOnlyFilter(prev => !prev)}
              className={cn(
                "w-full flex items-center rounded-lg transition-all text-xs font-bold group cursor-pointer relative select-none",
                isCollapsed ? "justify-center p-2.5 min-h-[44px]" : "justify-between px-2.5 py-2",
                favoriteOnlyFilter
                  ? isDarkMode
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black shadow-2xs"
                    : "bg-amber-50 text-amber-800 border border-amber-200 font-black shadow-2xs"
                  : isDarkMode
                    ? "text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
              )}
              title="Mã ICD-10 đã ghim / yêu thích"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Star
                  size={16}
                  className={cn(
                    "shrink-0 transition-transform group-hover:scale-105",
                    favoriteOnlyFilter
                      ? "text-amber-500 fill-amber-500"
                      : "text-slate-400 group-hover:text-amber-500"
                  )}
                />
                {!isCollapsed && <span className="truncate">Đã ghim / Yêu thích</span>}
              </div>

              {!isCollapsed && favoriteCount > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {favoriteCount}
                </span>
              )}

              {favoriteOnlyFilter && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-500 rounded-r-full" />
              )}
            </button>

            {/* Có hướng dẫn điều trị */}
            {onToggleGuideFilter && (
              <button
                type="button"
                onClick={onToggleGuideFilter}
                className={cn(
                  "w-full flex items-center rounded-lg transition-all text-xs font-bold group cursor-pointer relative select-none",
                  isCollapsed ? "justify-center p-2.5 min-h-[44px]" : "justify-between px-2.5 py-2",
                  guideOnlyFilter
                    ? isDarkMode
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black shadow-2xs"
                      : "bg-blue-50 text-blue-700 border border-blue-200 font-black shadow-2xs"
                    : isDarkMode
                      ? "text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                )}
                title="Có phác đồ / hướng dẫn chẩn đoán và điều trị"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText
                    size={16}
                    className={cn(
                      "shrink-0 transition-transform group-hover:scale-105",
                      guideOnlyFilter
                        ? "text-blue-500"
                        : "text-slate-400 group-hover:text-blue-500"
                    )}
                  />
                  {!isCollapsed && <span className="truncate">Có phác đồ điều trị</span>}
                </div>

                {!isCollapsed && guideCount > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                    {guideCount}
                  </span>
                )}

                {guideOnlyFilter && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />
                )}
              </button>
            )}

            {/* Có gợi ý thuốc điều trị */}
            {onToggleSuggestionFilter && (
              <button
                type="button"
                onClick={onToggleSuggestionFilter}
                className={cn(
                  "w-full flex items-center rounded-lg transition-all text-xs font-bold group cursor-pointer relative select-none",
                  isCollapsed ? "justify-center p-2.5 min-h-[44px]" : "justify-between px-2.5 py-2",
                  suggestionOnlyFilter
                    ? isDarkMode
                      ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 font-black shadow-2xs"
                      : "bg-purple-50 text-purple-700 border border-purple-200 font-black shadow-2xs"
                    : isDarkMode
                      ? "text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                )}
                title="Có thuốc gợi ý điều trị liên kết"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Pill
                    size={16}
                    className={cn(
                      "shrink-0 transition-transform group-hover:scale-105",
                      suggestionOnlyFilter
                        ? "text-purple-500"
                        : "text-slate-400 group-hover:text-purple-500"
                    )}
                  />
                  {!isCollapsed && <span className="truncate">Có gợi ý thuốc</span>}
                </div>

                {!isCollapsed && suggestionCount > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                    {suggestionCount}
                  </span>
                )}

                {suggestionOnlyFilter && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-purple-600 rounded-r-full" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Section: PHÂN LOẠI THEO CHƯƠNG ICD-10 */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {!isCollapsed ? (
            <div className="space-y-2 mb-2">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Chương ICD-10
                  </span>
                </div>
                {selectedChapterId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => onSelectChapter('all')}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Bỏ lọc
                  </button>
                )}
              </div>

              {/* Tìm kiếm chương */}
              <div className="relative px-1">
                <Search
                  size={12}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Tìm theo tên/mã chương..."
                  className={cn(
                    "w-full pl-7 pr-6 py-1.5 text-[11px] rounded-lg border outline-none transition-all",
                    isDarkMode
                      ? "bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50"
                      : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500"
                  )}
                />
                {chapterSearch && (
                  <button
                    type="button"
                    onClick={() => setChapterSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <div
                className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[10px]"
                title="Phân loại theo Chương ICD-10"
              >
                <Filter size={13} />
              </div>
            </div>
          )}

          {/* List of Chapters */}
          <div className="space-y-1">
            {filteredChapters.map((chap) => {
              const isSelected = selectedChapterId === chap.id;
              const count = chapterCounts[chap.id] || 0;

              if (isCollapsed) {
                return (
                  <button
                    key={`collapsed-chap-${chap.id}`}
                    type="button"
                    onClick={() => {
                      onSelectChapter(isSelected ? 'all' : chap.id);
                    }}
                    className={cn(
                      "w-full flex items-center justify-center py-2 rounded-lg transition-all cursor-pointer relative group",
                      isSelected
                        ? "bg-emerald-600 text-white shadow-xs font-black"
                        : isDarkMode
                          ? "text-slate-400 hover:bg-slate-900 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    title={`Chương ${chap.roman}: ${chap.name} (${chap.codeRange}) - ${count.toLocaleString('vi-VN')} mã`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-tight">
                      {chap.roman}
                    </span>
                    {isSelected && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-r-full" />
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={`expanded-chap-${chap.id}`}
                  type="button"
                  onClick={() => {
                    onSelectChapter(isSelected ? 'all' : chap.id);
                  }}
                  className={cn(
                    "w-full flex items-start gap-2 px-2.5 py-2 rounded-xl text-left transition-all group cursor-pointer relative select-none",
                    isSelected
                      ? isDarkMode
                        ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 shadow-xs"
                        : "bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-xs"
                      : isDarkMode
                        ? "hover:bg-slate-900 text-slate-300 border border-transparent"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                  )}
                  title={`Chương ${chap.roman}: ${chap.name} (${chap.codeRange})`}
                >
                  {/* Roman Badge */}
                  <span
                    className={cn(
                      "w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black uppercase tracking-tight transition-colors mt-0.5",
                      isSelected
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : isDarkMode
                          ? "bg-slate-800 text-slate-300 group-hover:bg-slate-700"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    )}
                  >
                    {chap.roman}
                  </span>

                  {/* Chapter Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn(
                        "text-[11px] font-bold truncate leading-tight",
                        isSelected
                          ? isDarkMode ? "text-emerald-300 font-black" : "text-emerald-900 font-black"
                          : isDarkMode ? "text-slate-200" : "text-slate-800"
                      )}>
                        {chap.shortName}
                      </span>
                      {count > 0 && (
                        <span className={cn(
                          "text-[9.5px] font-bold px-1.5 py-0.2 rounded-md shrink-0",
                          isSelected
                            ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300"
                            : isDarkMode ? "bg-slate-800/80 text-slate-400" : "bg-slate-100 text-slate-500"
                        )}>
                          {count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn(
                        "text-[9.5px] font-mono tracking-tight",
                        isSelected
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-slate-400 dark:text-slate-500"
                      )}>
                        {chap.codeRange}
                      </span>
                    </div>
                  </div>

                  {/* Active Indicator bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full" />
                  )}
                </button>
              );
            })}

            {filteredChapters.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400">
                Không tìm thấy chương phù hợp
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Sidebar: Chế độ xem & Thêm mới (Chỉ hiển thị ở Quản lý ICD-10) */}
      {isManage && (
        <div
          className={cn(
            "p-2 border-t shrink-0 space-y-1.5",
            isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-slate-100 bg-slate-50/70"
          )}
        >
          {/* View Mode Switcher: Card vs Table */}
          {onToggleViewStyle && !isCollapsed && (
            <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => onToggleViewStyle('card')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
                  viewStyle === 'card'
                    ? isDarkMode
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <LayoutGrid size={13} />
                <span>Dạng thẻ</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleViewStyle('excel')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
                  viewStyle === 'excel'
                    ? isDarkMode
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Table size={13} />
                <span>Dạng bảng</span>
              </button>
            </div>
          )}

          {/* Add ICD Button if manager */}
          {canManage && onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-white shadow-xs",
                "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]",
                isCollapsed && "px-0"
              )}
              title="Thêm mã ICD-10 mới"
            >
              <Plus size={15} />
              {!isCollapsed && <span>Thêm mã ICD-10</span>}
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

export default ICD10DirectorySidebar;
