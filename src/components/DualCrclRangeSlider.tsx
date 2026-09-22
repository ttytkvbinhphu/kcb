import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "../lib/utils";
import { RotateCcw } from "lucide-react";

export interface DualCrclRangeSliderProps {
  minCrcl: number;
  maxCrcl: number;
  onChange: (min: number, max: number) => void;
  isDarkMode?: boolean;
  minLimit?: number; // default 0
  maxLimit?: number; // default 120
  className?: string;
  showCategoryLabel?: boolean;
}

export const DualCrclRangeSlider: React.FC<DualCrclRangeSliderProps> = ({
  minCrcl,
  maxCrcl,
  onChange,
  isDarkMode = false,
  minLimit = 0,
  maxLimit = 120,
  className,
  showCategoryLabel = true,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);

  const range = maxLimit - minLimit;
  const minPercent = Math.max(0, Math.min(100, ((minCrcl - minLimit) / range) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((maxCrcl - minLimit) / range) * 100));

  const isFiltered = minCrcl > minLimit || maxCrcl < maxLimit;

  // Helper tính giá trị CrCl từ vị trí con trỏ
  const getValueFromPointer = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return minLimit;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percentage = clickX / rect.width;
      const rawValue = minLimit + percentage * range;
      return Math.round(rawValue);
    },
    [minLimit, range]
  );

  // Helper dispatch khóa vuốt chuyển tab của toàn app
  const emitSwipeLock = useCallback((locked: boolean) => {
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("set-tab-swipe-lock", { detail: { locked } }));
        window.dispatchEvent(new CustomEvent("lock-app-swipe", { detail: { locked } }));
      }
    } catch {}
  }, []);

  // Xử lý kéo thumb bằng Pointer Events (ngăn xung đột vuốt tab trên mobile)
  const handlePointerDown = (thumb: "min" | "max", e: React.PointerEvent) => {
    if ("cancelable" in e && e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();
    emitSwipeLock(true);
    setActiveThumb(thumb);
  };

  // Quản lý kéo mượt trên toàn cửa sổ khi thumb đang active
  useEffect(() => {
    if (!activeThumb) return;

    emitSwipeLock(true);

    const handleWindowMove = (ev: MouseEvent | TouchEvent | PointerEvent) => {
      ev.preventDefault?.();
      ev.stopPropagation?.();
      const clientX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      const newVal = getValueFromPointer(clientX);

      if (activeThumb === "min") {
        const clamped = Math.min(newVal, maxCrcl);
        onChange(Math.max(minLimit, clamped), maxCrcl);
      } else {
        const clamped = Math.max(newVal, minCrcl);
        onChange(minCrcl, Math.min(maxLimit, clamped));
      }
    };

    const handleWindowUp = (ev: MouseEvent | TouchEvent | PointerEvent) => {
      ev.stopPropagation?.();
      setActiveThumb(null);
      emitSwipeLock(false);
    };

    window.addEventListener("pointermove", handleWindowMove, { passive: false });
    window.addEventListener("pointerup", handleWindowUp);
    window.addEventListener("pointercancel", handleWindowUp);
    window.addEventListener("touchmove", handleWindowMove, { passive: false });
    window.addEventListener("touchend", handleWindowUp);
    window.addEventListener("touchcancel", handleWindowUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowMove);
      window.removeEventListener("pointerup", handleWindowUp);
      window.removeEventListener("pointercancel", handleWindowUp);
      window.removeEventListener("touchmove", handleWindowMove);
      window.removeEventListener("touchend", handleWindowUp);
      window.removeEventListener("touchcancel", handleWindowUp);
      emitSwipeLock(false);
    };
  }, [activeThumb, maxCrcl, minCrcl, minLimit, maxLimit, onChange, getValueFromPointer, emitSwipeLock]);

  // Click vào thanh ngang để nhảy mốc gần nhất
  const handleTrackClick = (e: React.MouseEvent) => {
    if (activeThumb) return;
    const newVal = getValueFromPointer(e.clientX);
    const distToMin = Math.abs(newVal - minCrcl);
    const distToMax = Math.abs(newVal - maxCrcl);

    if (distToMin <= distToMax) {
      const clamped = Math.min(newVal, maxCrcl);
      onChange(Math.max(minLimit, clamped), maxCrcl);
    } else {
      const clamped = Math.max(newVal, minCrcl);
      onChange(minCrcl, Math.min(maxLimit, clamped));
    }
  };

  // Tên phân độ suy thận tương ứng theo KDIGO / Cockcroft-Gault
  const getCategoryLabel = () => {
    if (!isFiltered) return "Tất cả mức lọc";
    if (minCrcl === maxCrcl) return `Đúng ${minCrcl} mL/phút`;
    if (maxCrcl <= 15) return "Suy thận GĐ cuối (< 15 mL/phút)";
    if (minCrcl >= 15 && maxCrcl <= 30) return "Suy thận nặng (15 - 29 mL/phút)";
    if (minCrcl >= 30 && maxCrcl <= 60) return "Suy thận vừa (30 - 59 mL/phút)";
    if (minCrcl >= 60 && maxCrcl <= 90) return "Suy thận nhẹ (60 - 89 mL/phút)";
    if (minCrcl >= 90) return "Chức năng thận bình thường (≥ 90)";
    return `Từ ${minCrcl} đến ${maxCrcl >= maxLimit ? `${maxLimit}+` : maxCrcl} mL/phút`;
  };

  return (
    <div
      className={cn("w-full select-none touch-pan-y", className)}
      data-prevent-swipe="true"
      style={{ touchAction: "pan-y" }}
    >
      {/* Header trạng thái hiển thị khoảng CrCl */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-black transition-colors shrink-0",
              isFiltered
                ? "bg-rose-600 text-white shadow-2xs"
                : isDarkMode
                ? "bg-slate-800 text-slate-400"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {isFiltered ? (
              minCrcl === maxCrcl ? (
                `${minCrcl} mL/p`
              ) : maxCrcl >= maxLimit ? (
                `≥ ${minCrcl} mL/p`
              ) : minCrcl === minLimit ? (
                `≤ ${maxCrcl} mL/p`
              ) : (
                `${minCrcl} - ${maxCrcl} mL/p`
              )
            ) : (
              "0 - 120+ mL/p"
            )}
          </span>

          {showCategoryLabel && (
            <span
              className={cn(
                "text-[10px] font-bold truncate",
                isFiltered
                  ? "text-rose-600 dark:text-rose-400 font-extrabold"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              {getCategoryLabel()}
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={() => onChange(minLimit, maxLimit)}
            className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-slate-800 shrink-0"
            title="Đặt lại về tất cả mức lọc (0 - 120+ mL/phút)"
          >
            <RotateCcw size={10} />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* THANH NGANG VÀ 2 DẤU CHẤM ĐẦU - CUỐI */}
      <div
        className="relative py-3.5 px-2 cursor-pointer touch-pan-y select-none"
        onClick={handleTrackClick}
        data-prevent-swipe="true"
        style={{ touchAction: "pan-y" }}
      >
        {/* Track nền mờ */}
        <div
          ref={trackRef}
          className={cn(
            "relative w-full h-2 rounded-full transition-colors",
            isDarkMode ? "bg-slate-800" : "bg-slate-200"
          )}
        >
          {/* Vạch mốc tham chiếu nhỏ (0, 15, 30, 60, 90, 120) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: "0%" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: `${(15 / range) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: `${(30 / range) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: `${(60 / range) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: `${(90 / range) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: "100%" }}
          />

          {/* Dải sáng màu giữa 2 dấu chấm */}
          <div
            className={cn(
              "absolute top-0 bottom-0 rounded-full transition-all",
              isFiltered ? "bg-rose-500 shadow-xs" : "bg-rose-500/50"
            )}
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(0, maxPercent - minPercent)}%`,
            }}
          />

          {/* DẤU CHẤM ĐẦU (Left Thumb - Min CrCl) */}
          <div
            role="slider"
            aria-label="Mức lọc cầu thận bắt đầu"
            aria-valuemin={minLimit}
            aria-valuemax={maxLimit}
            aria-valuenow={minCrcl}
            tabIndex={0}
            data-prevent-swipe="true"
            onPointerDown={(e) => handlePointerDown("min", e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") onChange(Math.max(minLimit, minCrcl - 1), maxCrcl);
              if (e.key === "ArrowRight") onChange(Math.min(maxCrcl, minCrcl + 1), maxCrcl);
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-rose-400 touch-none select-none",
              activeThumb === "min"
                ? "scale-125 border-rose-600 ring-4 ring-rose-400/30 z-30"
                : "border-rose-500 hover:scale-115 hover:border-rose-600 z-20"
            )}
            style={{ left: `${minPercent}%`, touchAction: "none" }}
          >
            {/* Lõi chấm bên trong */}
            <div className="w-2 h-2 rounded-full bg-rose-600 group-hover:scale-110 transition-transform" />

            {/* Tooltip nhỏ hiển thị số CrCl ngay trên dấu chấm khi kéo */}
            <div
              className={cn(
                "absolute -top-6 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black tracking-tight whitespace-nowrap pointer-events-none shadow-sm transition-opacity",
                activeThumb === "min" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {minCrcl} mL/p
            </div>
          </div>

          {/* DẤU CHẤM CUỐI (Right Thumb - Max CrCl) */}
          <div
            role="slider"
            aria-label="Mức lọc cầu thận kết thúc"
            aria-valuemin={minLimit}
            aria-valuemax={maxLimit}
            aria-valuenow={maxCrcl}
            tabIndex={0}
            data-prevent-swipe="true"
            onPointerDown={(e) => handlePointerDown("max", e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") onChange(minCrcl, Math.max(minCrcl, maxCrcl - 1));
              if (e.key === "ArrowRight") onChange(minCrcl, Math.min(maxLimit, maxCrcl + 1));
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-rose-400 touch-none select-none",
              activeThumb === "max"
                ? "scale-125 border-rose-600 ring-4 ring-rose-400/30 z-30"
                : "border-rose-500 hover:scale-115 hover:border-rose-600 z-20"
            )}
            style={{ left: `${maxPercent}%`, touchAction: "none" }}
          >
            {/* Lõi chấm bên trong */}
            <div className="w-2 h-2 rounded-full bg-rose-600 group-hover:scale-110 transition-transform" />

            {/* Tooltip nhỏ hiển thị số CrCl ngay trên dấu chấm khi kéo */}
            <div
              className={cn(
                "absolute -top-6 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black tracking-tight whitespace-nowrap pointer-events-none shadow-sm transition-opacity",
                activeThumb === "max" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {maxCrcl >= maxLimit ? `${maxLimit}+` : `${maxCrcl} mL/p`}
            </div>
          </div>
        </div>
      </div>

      {/* Thước mốc lâm sàng bên dưới thanh ngang */}
      <div className="flex items-center justify-between px-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
        <span
          onClick={() => onChange(minLimit, 15)}
          className="cursor-pointer hover:text-rose-500 transition-colors"
          title="Lọc: < 15 mL/phút (Giai đoạn cuối)"
        >
          0
        </span>
        <span
          onClick={() => onChange(15, 29)}
          className="cursor-pointer hover:text-rose-500 transition-colors"
          title="Lọc: 15 - 29 mL/phút (Suy nặng)"
        >
          15
        </span>
        <span
          onClick={() => onChange(30, 59)}
          className="cursor-pointer hover:text-rose-500 transition-colors"
          title="Lọc: 30 - 59 mL/phút (Suy vừa)"
        >
          30
        </span>
        <span
          onClick={() => onChange(60, 89)}
          className="cursor-pointer hover:text-rose-500 transition-colors"
          title="Lọc: 60 - 89 mL/phút (Suy nhẹ)"
        >
          60
        </span>
        <span
          onClick={() => onChange(90, maxLimit)}
          className="cursor-pointer hover:text-rose-500 transition-colors"
          title="Lọc: ≥ 90 mL/phút (Bình thường)"
        >
          90
        </span>
        <span
          onClick={() => onChange(minLimit, maxLimit)}
          className="cursor-pointer hover:text-rose-500 transition-colors"
          title="Tất cả (0 - 120+ mL/phút)"
        >
          120+
        </span>
      </div>
    </div>
  );
};
