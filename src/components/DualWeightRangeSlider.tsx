import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "../lib/utils";
import { RotateCcw } from "lucide-react";

export interface DualWeightRangeSliderProps {
  minWeight: number;
  maxWeight: number;
  onChange: (min: number, max: number) => void;
  isDarkMode?: boolean;
  minLimit?: number; // default 0
  maxLimit?: number; // default 120
  className?: string;
  showCategoryLabel?: boolean;
}

export const DualWeightRangeSlider: React.FC<DualWeightRangeSliderProps> = ({
  minWeight,
  maxWeight,
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
  const minPercent = Math.max(0, Math.min(100, ((minWeight - minLimit) / range) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((maxWeight - minLimit) / range) * 100));

  const isFiltered = minWeight > minLimit || maxWeight < maxLimit;

  // Helper tính giá trị cân nặng từ vị trí con trỏ
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
        const clamped = Math.min(newVal, maxWeight);
        onChange(Math.max(minLimit, clamped), maxWeight);
      } else {
        const clamped = Math.max(newVal, minWeight);
        onChange(minWeight, Math.min(maxLimit, clamped));
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
  }, [activeThumb, maxWeight, minWeight, minLimit, maxLimit, onChange, getValueFromPointer, emitSwipeLock]);

  // Click vào thanh ngang để nhảy mốc gần nhất
  const handleTrackClick = (e: React.MouseEvent) => {
    if (activeThumb) return;
    const newVal = getValueFromPointer(e.clientX);
    const distToMin = Math.abs(newVal - minWeight);
    const distToMax = Math.abs(newVal - maxWeight);

    if (distToMin <= distToMax) {
      const clamped = Math.min(newVal, maxWeight);
      onChange(Math.max(minLimit, clamped), maxWeight);
    } else {
      const clamped = Math.max(newVal, minWeight);
      onChange(minWeight, Math.min(maxLimit, clamped));
    }
  };

  // Tên phân nhóm cân nặng tương ứng
  const getCategoryLabel = () => {
    if (!isFiltered) return "Tất cả cân nặng";
    if (minWeight === maxWeight) return `Bệnh nhân đúng ${minWeight} kg`;
    if (maxWeight <= 10) return "Sơ sinh / nhũ nhi (< 10 kg)";
    if (minWeight <= 10 && maxWeight <= 20) return "Trẻ nhỏ (10 - 20 kg)";
    if (minWeight >= 20 && maxWeight <= 40) return "Trẻ em (20 - 40 kg)";
    if (minWeight >= 40 && maxWeight <= 60) return "Thiếu niên / nhẹ cân";
    if (minWeight >= 50 && maxWeight <= 90) return "Trưởng thành (50 - 90 kg)";
    if (minWeight >= 90) return "Bệnh nhân béo phì (≥ 90 kg)";
    return `Từ ${minWeight} đến ${maxWeight >= maxLimit ? `${maxLimit}+` : maxWeight} kg`;
  };

  return (
    <div
      className={cn("w-full select-none touch-pan-y", className)}
      data-prevent-swipe="true"
      style={{ touchAction: "pan-y" }}
    >
      {/* Header trạng thái hiển thị khoảng cân nặng */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-black transition-colors shrink-0",
              isFiltered
                ? "bg-amber-600 text-white shadow-2xs"
                : isDarkMode
                ? "bg-slate-800 text-slate-400"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {isFiltered ? (
              minWeight === maxWeight ? (
                `${minWeight} kg`
              ) : maxWeight >= maxLimit ? (
                `≥ ${minWeight} kg`
              ) : minWeight === minLimit ? (
                `≤ ${maxWeight} kg`
              ) : (
                `${minWeight} - ${maxWeight} kg`
              )
            ) : (
              "0 - 120+ kg"
            )}
          </span>

          {showCategoryLabel && (
            <span
              className={cn(
                "text-[10px] font-bold truncate",
                isFiltered
                  ? "text-amber-600 dark:text-amber-400 font-extrabold"
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
            className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-amber-50 dark:hover:bg-slate-800 shrink-0"
            title="Đặt lại về tất cả cân nặng (0 - 120+ kg)"
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
          {/* Vạch mốc tham chiếu nhỏ (0kg, 10kg, 30kg, 60kg, 120kg) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: "0%" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none"
            style={{ left: `${(10 / range) * 100}%` }}
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
            style={{ left: "100%" }}
          />

          {/* Dải sáng màu giữa 2 dấu chấm */}
          <div
            className={cn(
              "absolute top-0 bottom-0 rounded-full transition-all",
              isFiltered ? "bg-amber-500 shadow-xs" : "bg-amber-500/50"
            )}
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(0, maxPercent - minPercent)}%`,
            }}
          />

          {/* DẤU CHẤM ĐẦU (Left Thumb - Min Weight) */}
          <div
            role="slider"
            aria-label="Cân nặng bắt đầu"
            aria-valuemin={minLimit}
            aria-valuemax={maxLimit}
            aria-valuenow={minWeight}
            tabIndex={0}
            data-prevent-swipe="true"
            onPointerDown={(e) => handlePointerDown("min", e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") onChange(Math.max(minLimit, minWeight - 1), maxWeight);
              if (e.key === "ArrowRight") onChange(Math.min(maxWeight, minWeight + 1), maxWeight);
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-amber-400 touch-none select-none",
              activeThumb === "min"
                ? "scale-125 border-amber-600 ring-4 ring-amber-400/30 z-30"
                : "border-amber-500 hover:scale-115 hover:border-amber-600 z-20"
            )}
            style={{ left: `${minPercent}%`, touchAction: "none" }}
          >
            {/* Lõi chấm bên trong */}
            <div className="w-2 h-2 rounded-full bg-amber-600 group-hover:scale-110 transition-transform" />

            {/* Tooltip nhỏ hiển thị số cân nặng ngay trên dấu chấm khi kéo */}
            <div
              className={cn(
                "absolute -top-6 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black tracking-tight whitespace-nowrap pointer-events-none shadow-sm transition-opacity",
                activeThumb === "min" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {minWeight}kg
            </div>
          </div>

          {/* DẤU CHẤM CUỐI (Right Thumb - Max Weight) */}
          <div
            role="slider"
            aria-label="Cân nặng kết thúc"
            aria-valuemin={minLimit}
            aria-valuemax={maxLimit}
            aria-valuenow={maxWeight}
            tabIndex={0}
            data-prevent-swipe="true"
            onPointerDown={(e) => handlePointerDown("max", e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") onChange(minWeight, Math.max(minWeight, maxWeight - 1));
              if (e.key === "ArrowRight") onChange(minWeight, Math.min(maxLimit, maxWeight + 1));
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-amber-400 touch-none select-none",
              activeThumb === "max"
                ? "scale-125 border-amber-600 ring-4 ring-amber-400/30 z-30"
                : "border-amber-500 hover:scale-115 hover:border-amber-600 z-20"
            )}
            style={{ left: `${maxPercent}%`, touchAction: "none" }}
          >
            {/* Lõi chấm bên trong */}
            <div className="w-2 h-2 rounded-full bg-amber-600 group-hover:scale-110 transition-transform" />

            {/* Tooltip nhỏ hiển thị số cân nặng ngay trên dấu chấm khi kéo */}
            <div
              className={cn(
                "absolute -top-6 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black tracking-tight whitespace-nowrap pointer-events-none shadow-sm transition-opacity",
                activeThumb === "max" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {maxWeight >= maxLimit ? `${maxLimit}+` : `${maxWeight}kg`}
            </div>
          </div>
        </div>
      </div>

      {/* Thước mốc cân nặng bên dưới thanh ngang */}
      <div className="flex items-center justify-between px-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
        <span
          onClick={() => onChange(minLimit, 10)}
          className="cursor-pointer hover:text-amber-500 transition-colors"
          title="Lọc: < 10 kg (sơ sinh / nhũ nhi)"
        >
          0kg
        </span>
        <span
          onClick={() => onChange(10, 20)}
          className="cursor-pointer hover:text-amber-500 transition-colors"
          title="Lọc: 10 - 20 kg (trẻ nhỏ)"
        >
          10kg
        </span>
        <span
          onClick={() => onChange(20, 40)}
          className="cursor-pointer hover:text-amber-500 transition-colors"
          title="Lọc: 20 - 40 kg (trẻ em)"
        >
          30kg
        </span>
        <span
          onClick={() => onChange(50, 80)}
          className="cursor-pointer hover:text-amber-500 transition-colors"
          title="Lọc: 50 - 80 kg (người lớn)"
        >
          60kg
        </span>
        <span
          onClick={() => onChange(minLimit, maxLimit)}
          className="cursor-pointer hover:text-amber-500 transition-colors"
          title="Tất cả (0 - 120+ kg)"
        >
          120kg+
        </span>
      </div>
    </div>
  );
};
