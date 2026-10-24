import React, { useRef, useEffect, useState, useCallback } from 'react';

interface TableWithTopScrollProps {
  children: React.ReactNode;
  className?: string;
  tableContainerClassName?: string;
}

export const TableWithTopScroll: React.FC<TableWithTopScrollProps> = ({
  children,
  className = '',
  tableContainerClassName = 'overflow-x-auto',
}) => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

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

  const updateScroll = useCallback(() => {
    if (mainScrollRef.current) {
      const el = mainScrollRef.current;
      setScrollInfo({
        scrollLeft: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    }
  }, []);

  useEffect(() => {
    updateScroll();
    const el = mainScrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScroll();
    });
    resizeObserver.observe(el);

    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    const t1 = setTimeout(updateScroll, 50);
    const t2 = setTimeout(updateScroll, 250);

    window.addEventListener('resize', updateScroll);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScroll);
    };
  }, [updateScroll, children]);

  const handleMainScroll = () => {
    if (mainScrollRef.current) {
      setScrollInfo((prev) => ({
        ...prev,
        scrollLeft: mainScrollRef.current!.scrollLeft,
      }));
    }
  };

  // Dragging the thumb with mouse
  const handleThumbMouseDown = (e: React.MouseEvent) => {
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

      const thumbWidth = Math.max(60, trackWidth * (clientWidth / scrollWidth));
      const maxThumbTravel = trackWidth - thumbWidth;
      if (maxThumbTravel <= 0) return;

      const deltaX = e.clientX - dragStartRef.current.startX;
      const scrollDelta = deltaX * (maxScroll / maxThumbTravel);
      mainScrollRef.current.scrollLeft = dragStartRef.current.startScrollLeft + scrollDelta;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
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

    const thumbWidth = Math.max(60, trackWidth * (clientWidth / scrollWidth));
    const targetScrollLeft = ((clickX - thumbWidth / 2) / (trackWidth - thumbWidth)) * maxScroll;
    mainScrollRef.current.scrollTo({
      left: Math.max(0, Math.min(maxScroll, targetScrollLeft)),
      behavior: 'smooth',
    });
  };

  // Wheel horizontal scroll on the top track
  const handleTrackWheel = (e: React.WheelEvent) => {
    if (mainScrollRef.current) {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      mainScrollRef.current.scrollLeft += delta;
    }
  };

  // Dimensions & positions
  const { scrollLeft, scrollWidth, clientWidth } = scrollInfo;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  const thumbWidthPct = scrollWidth > 0 ? Math.min(100, Math.max(8, (clientWidth / scrollWidth) * 100)) : 100;
  const thumbLeftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - thumbWidthPct) : 0;

  return (
    <div className={`w-full relative ${className}`}>
      {/* 100% ALWAYS VISIBLE Top Horizontal Scrollbar - Pure DOM element (never hidden by macOS overlay behavior) */}
      <div
        onWheel={handleTrackWheel}
        className="w-full bg-slate-100 dark:bg-slate-800/90 border-b border-slate-300 dark:border-slate-700 p-1.5 z-20 select-none shadow-2xs"
        title="Horizontal scrollbar: drag or click anywhere to scroll"
      >
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="w-full h-3 bg-slate-200 hover:bg-slate-250 dark:bg-slate-700 rounded-full border border-slate-300 dark:border-slate-600 relative cursor-pointer overflow-hidden p-0.5 transition-colors"
        >
          {/* Permanent Draggable Thumb */}
          <div
            onMouseDown={handleThumbMouseDown}
            style={{
              left: `${thumbLeftPct}%`,
              width: `${thumbWidthPct}%`,
            }}
            className={`absolute top-0.5 bottom-0.5 rounded-full transition-colors ${
              isDragging
                ? 'bg-blue-600 shadow-md cursor-grabbing'
                : 'bg-slate-600 hover:bg-slate-700 dark:bg-slate-400 dark:hover:bg-slate-300 shadow-xs cursor-grab'
            }`}
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div
        ref={mainScrollRef}
        onScroll={handleMainScroll}
        className={tableContainerClassName}
      >
        {children}
      </div>
    </div>
  );
};
