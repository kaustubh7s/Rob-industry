import React, { useRef, useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";

interface TableWithTopScrollProps {
  children: React.ReactNode;
  className?: string;
  tableContainerClassName?: string;
}

export const TableWithTopScroll: React.FC<TableWithTopScrollProps> = ({
  children,
  className = "",
  tableContainerClassName = "overflow-x-auto custom-table-scrollbar",
}) => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrollInfo, setScrollInfo] = useState({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startScrollLeft: number }>({
    startX: 0,
    startScrollLeft: 0,
  });

  const updateScrollInfo = useCallback(() => {
    if (mainScrollRef.current) {
      const el = mainScrollRef.current;
      const overflow = el.scrollWidth > el.clientWidth + 4;
      setHasOverflow(overflow);
      setScrollInfo({
        scrollLeft: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    }
  }, []);

  useEffect(() => {
    updateScrollInfo();
    const el = mainScrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScrollInfo();
    });
    resizeObserver.observe(el);

    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    const t1 = setTimeout(updateScrollInfo, 100);
    const t2 = setTimeout(updateScrollInfo, 400);

    window.addEventListener("resize", updateScrollInfo);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollInfo);
    };
  }, [updateScrollInfo, children]);

  // Handle scrolling of the main table
  const handleScroll = () => {
    if (mainScrollRef.current) {
      setScrollInfo((prev) => ({
        ...prev,
        scrollLeft: mainScrollRef.current!.scrollLeft,
      }));
    }
  };

  // Button scroll handlers
  const scrollByDelta = (delta: number) => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  // Drag handlers for custom thumb
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startScrollLeft: mainScrollRef.current ? mainScrollRef.current.scrollLeft : 0,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainScrollRef.current || !trackRef.current) return;
      const trackWidth = trackRef.current.clientWidth;
      const { scrollWidth, clientWidth } = scrollInfo;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll <= 0 || trackWidth <= 0) return;

      const thumbWidth = Math.max(48, trackWidth * (clientWidth / scrollWidth));
      const maxThumbTravel = trackWidth - thumbWidth;
      if (maxThumbTravel <= 0) return;

      const deltaX = e.clientX - dragStartRef.current.startX;
      const scrollDelta = deltaX * (maxScroll / maxThumbTravel);
      mainScrollRef.current.scrollLeft = dragStartRef.current.startScrollLeft + scrollDelta;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, scrollInfo]);

  // Click on track to jump
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainScrollRef.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackWidth = rect.width;
    const { scrollWidth, clientWidth } = scrollInfo;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0 || trackWidth <= 0) return;

    const thumbWidth = Math.max(48, trackWidth * (clientWidth / scrollWidth));
    const targetScrollLeft = ((clickX - thumbWidth / 2) / (trackWidth - thumbWidth)) * maxScroll;
    mainScrollRef.current.scrollTo({
      left: Math.max(0, Math.min(maxScroll, targetScrollLeft)),
      behavior: "smooth",
    });
  };

  // Wheel horizontal scroll on the top bar
  const handleTopBarWheel = (e: React.WheelEvent) => {
    if (mainScrollRef.current) {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      mainScrollRef.current.scrollLeft += delta;
    }
  };

  // Compute thumb dimensions and position
  const { scrollLeft, scrollWidth, clientWidth } = scrollInfo;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  const thumbWidthPct = scrollWidth > 0 ? Math.min(100, Math.max(10, (clientWidth / scrollWidth) * 100)) : 100;
  const thumbLeftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - thumbWidthPct) : 0;

  const canScrollLeft = scrollLeft > 2;
  const canScrollRight = scrollLeft < maxScroll - 2;

  return (
    <div className={`w-full relative ${className}`}>
      {/* Scoped CSS ensuring high-contrast visible scrollbar for mouse users */}
      <style>{`
        .custom-table-scrollbar::-webkit-scrollbar {
          height: 12px !important;
        }
        .custom-table-scrollbar::-webkit-scrollbar-track {
          background: #e2e8f0 !important;
          border-radius: 6px;
        }
        .custom-table-scrollbar::-webkit-scrollbar-thumb {
          background: #64748b !important;
          border-radius: 6px;
          border: 2px solid #e2e8f0;
        }
        .custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155 !important;
        }
      `}</style>

      {/* High-Visibility Interactive Top Horizontal Scrollbar (Shown strictly when table overflows) */}
      {hasOverflow && (
        <div
          onWheel={handleTopBarWheel}
          className="bg-slate-100 border-b border-slate-300 py-1.5 px-3 flex items-center gap-2.5 select-none z-20 shadow-2xs"
        >
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => scrollByDelta(-350)}
            disabled={!canScrollLeft}
            className={`p-1 rounded-md border flex items-center justify-center transition-colors ${
              canScrollLeft
                ? "bg-white border-slate-300 text-slate-800 hover:bg-slate-200 active:bg-slate-300 shadow-2xs cursor-pointer"
                : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50"
            }`}
            title="Scroll Table Left"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Interactive Scrollbar Track */}
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="flex-1 h-3.5 bg-slate-200 hover:bg-slate-250 rounded-full border border-slate-300 relative cursor-pointer overflow-hidden p-0.5 transition-colors"
            title="Click or drag to scroll table horizontally"
          >
            {/* Draggable Thumb */}
            <div
              onMouseDown={handleMouseDown}
              style={{
                left: `${thumbLeftPct}%`,
                width: `${thumbWidthPct}%`,
              }}
              className={`absolute top-0.5 bottom-0.5 rounded-full transition-colors ${
                isDragging
                  ? "bg-blue-600 shadow-md cursor-grabbing"
                  : "bg-slate-600 hover:bg-blue-600 shadow-2xs cursor-grab"
              }`}
            />
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => scrollByDelta(350)}
            disabled={!canScrollRight}
            className={`p-1 rounded-md border flex items-center justify-center transition-colors ${
              canScrollRight
                ? "bg-white border-slate-300 text-slate-800 hover:bg-slate-200 active:bg-slate-300 shadow-2xs cursor-pointer"
                : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50"
            }`}
            title="Scroll Table Right"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Helpful Indicator Badge for Mouse Users */}
          <div className="hidden sm:flex items-center gap-1 pl-1 text-[11px] font-bold text-slate-600 font-mono shrink-0">
            <MoveHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>Scroll Columns</span>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div
        ref={mainScrollRef}
        onScroll={handleScroll}
        className={tableContainerClassName}
      >
        {children}
      </div>
    </div>
  );
};
