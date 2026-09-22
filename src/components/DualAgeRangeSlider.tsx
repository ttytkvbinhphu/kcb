import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "../lib/utils";
import { RotateCcw } from "lucide-react";

export interface DualAgeRangeSliderProps {
  minAge: number;
  maxAge: number;
  onChange: (min: number, max: number) => void;
  isDarkMode?: boolean;
  minLimit?: number; // default 0
  maxLimit?: number; // default 100
  className?: string;
  showCategoryLabel?: boolean;
}

export const DualAgeRangeSlider: React.FC<DualAgeRangeSliderProps> = ({
  minAge,
  maxAge,
  onChange,
  isDarkMode = false,
  minLimit = 0,
  maxLimit = 100,
  className,
  showCategoryLabel = true,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);

  const range = maxLimit - minLimit;
  const minPercent = Math.max(0, Math.min(100, ((minAge - minLimit) / range) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((maxAge - minLimit) / range) * 100));

  const isFiltered = minAge > minLimit || maxAge < maxLimit;

  // Helper tính giá trị tuổi từ vị trí con trỏ
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
        const clamped = Math.min(newVal, maxAge);
        onChange(Math.max(minLimit, clamped), maxAge);
      } else {
        const clamped = Math.max(newVal, minAge);
        onChange(minAge, Math.min(maxLimit, clamped));
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
  }, [activeThumb, maxAge, minAge, minLimit, maxLimit, onChange, getValueFromPointer, emitSwipeLock]);

  // Click vào thanh ngang để nhảy mốc gần nhất
  const handleTrackClick = (e: React.MouseEvent) => {
    if (activeThumb) return;
    const newVal = getValueFromPointer(e.clientX);
    const distToMin = Math.abs(newVal - minAge);
    const distToMax = Math.abs(newVal - maxAge);

    if (distToMin <= distToMax) {
      const clamped = Math.min(newVal, maxAge);
      onChange(Math.max(minLimit, clamped), maxAge);
    } else {
      const clamped = Math.max(newVal, minAge);
      onChange(minAge, Math.min(maxLimit, clamped));
    }
  };

  // Tên nhóm tuổi tương ứng
  const getCategoryLabel = () => {
    if (!isFiltered) return "Tất cả độ tuổi";
    if (minAge === maxAge) return `Bệnh nhân đúng ${minAge} tuổi`;
    if (maxAge <= 1) return "Trẻ sơ sinh / nhũ nhi";
    if (maxAge <= 12 && minAge <= 2) return "Trẻ em";
    if (minAge >= 12 && maxAge <= 18) return "Vị thành niên";
    if (minAge >= 18 && maxAge <= 65) return "Người trưởng thành";
    if (minAge >= 65) return "Người cao tuổi (≥65)";
    if (maxAge <= 18) return "Trẻ em & Thiếu niên";
    return `Từ ${minAge} đến ${maxAge >= maxLimit ? `${maxLimit}+` : maxAge} tuổi`;
  };

  return (
    <div
      className={cn("w-full select-none touch-pan-y", className)}
      data-prevent-swipe="true"
      style={{ touchAction: "pan-y" }}
    >
      {/* Header trạng thái hiển thị khoảng tuổi */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-black transition-colors shrink-0",
              isFiltered
                ? "bg-sky-600 text-white shadow-2xs"
                : isDarkMode
                ? "bg-slate-800 text-slate-400"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {isFiltered ? (
              minAge === maxAge ? (
                `${minAge} tuổi`
              ) : maxAge >= maxLimit ? (
                `≥ ${minAge} tuổi`
              ) : minAge === minLimit ? (
                `≤ ${maxAge} tuổi`
              ) : (
                `${minAge} - ${maxAge} tuổi`
              )
            ) : (
              "0 - 100+ tuổi"
            )}
          </span>

          {showCategoryLabel && (
            <span
              className={cn(
                "text-[10px] font-bold truncate",
                isFiltered
                  ? "text-sky-600 dark:text-sky-400 font-extrabold"
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
            className="flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 shrink-0"
            title="Đặt lại về tất cả tuổi (0 - 100)"
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
          {/* Vạch mốc tham chiếu nhỏ (0, 18, 65, 100) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: "0%" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: "18%" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: "65%" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: "100%" }}
          />

          {/* Dải sáng màu giữa 2 dấu chấm */}
          <div
            className={cn(
              "absolute top-0 bottom-0 rounded-full transition-all",
              isFiltered ? "bg-sky-500 shadow-xs" : "bg-sky-500/50"
            )}
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(0, maxPercent - minPercent)}%`,
            }}
          />

          {/* DẤU CHẤM ĐẦU (Left Thumb - Min Age) */}
          <div
            role="slider"
            aria-label="Tuổi bắt đầu"
            aria-valuemin={minLimit}
            aria-valuemax={maxLimit}
            aria-valuenow={minAge}
            tabIndex={0}
            data-prevent-swipe="true"
            onPointerDown={(e) => handlePointerDown("min", e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") onChange(Math.max(minLimit, minAge - 1), maxAge);
              if (e.key === "ArrowRight") onChange(Math.min(maxAge, minAge + 1), maxAge);
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-sky-400 touch-none select-none",
              activeThumb === "min"
                ? "scale-125 border-sky-600 ring-4 ring-sky-400/30 z-30"
                : "border-sky-500 hover:scale-115 hover:border-sky-600 z-20"
            )}
            style={{ left: `${minPercent}%`, touchAction: "none" }}
          >
            {/* Lõi chấm bên trong */}
            <div className="w-2 h-2 rounded-full bg-sky-600 group-hover:scale-110 transition-transform" />

            {/* Tooltip nhỏ hiển thị số tuổi ngay trên dấu chấm khi kéo */}
            <div
              className={cn(
                "absolute -top-6 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black tracking-tight whitespace-nowrap pointer-events-none shadow-sm transition-opacity",
                activeThumb === "min" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {minAge}t
            </div>
          </div>

          {/* DẤU CHẤM CUỐI (Right Thumb - Max Age) */}
          <div
            role="slider"
            aria-label="Tuổi kết thúc"
            aria-valuemin={minLimit}
            aria-valuemax={maxLimit}
            aria-valuenow={maxAge}
            tabIndex={0}
            data-prevent-swipe="true"
            onPointerDown={(e) => handlePointerDown("max", e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") onChange(minAge, Math.max(minAge, maxAge - 1));
              if (e.key === "ArrowRight") onChange(minAge, Math.min(maxLimit, maxAge + 1));
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-sky-400 touch-none select-none",
              activeThumb === "max"
                ? "scale-125 border-sky-600 ring-4 ring-sky-400/30 z-30"
                : "border-sky-500 hover:scale-115 hover:border-sky-600 z-20"
            )}
            style={{ left: `${maxPercent}%`, touchAction: "none" }}
          >
            {/* Lõi chấm bên trong */}
            <div className="w-2 h-2 rounded-full bg-sky-600 group-hover:scale-110 transition-transform" />

            {/* Tooltip nhỏ hiển thị số tuổi ngay trên dấu chấm khi kéo */}
            <div
              className={cn(
                "absolute -top-6 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black tracking-tight whitespace-nowrap pointer-events-none shadow-sm transition-opacity",
                activeThumb === "max" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {maxAge >= maxLimit ? `${maxLimit}+` : `${maxAge}t`}
            </div>
          </div>
        </div>
      </div>

      {/* Thước mốc tuổi bên dưới thanh ngang */}
      <div className="flex items-center justify-between px-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
        <span
          onClick={() => onChange(minLimit, 12)}
          className="cursor-pointer hover:text-sky-500 transition-colors"
          title="Lọc: Trẻ em (0 - 12t)"
        >
          0t
        </span>
        <span
          onClick={() => onChange(18, 65)}
          className="cursor-pointer hover:text-sky-500 transition-colors"
          title="Lọc: Người lớn (18 - 65t)"
        >
          18t
        </span>
        <span
          onClick={() => onChange(65, maxLimit)}
          className="cursor-pointer hover:text-sky-500 transition-colors"
          title="Lọc: Cao tuổi (≥65t)"
        >
          65t
        </span>
        <span
          onClick={() => onChange(minLimit, maxLimit)}
          className="cursor-pointer hover:text-sky-500 transition-colors"
          title="Tất cả (0 - 100t)"
        >
          100t+
        </span>
      </div>
    </div>
  );
};
