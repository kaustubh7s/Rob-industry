import React, { useRef, useEffect, useState, useCallback } from "react";

interface TableWithTopScrollProps {
  children: React.ReactNode;
  className?: string;
  tableContainerClassName?: string;
}

export const TableWithTopScroll: React.FC<TableWithTopScrollProps> = ({
  children,
  className = "",
  tableContainerClassName = "overflow-x-auto",
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const isSyncing = useRef(false);

  const checkOverflow = useCallback(() => {
    if (mainScrollRef.current) {
      const el = mainScrollRef.current;
      const overflow = el.scrollWidth > el.clientWidth + 2;
      setHasOverflow(overflow);
      setScrollWidth(el.scrollWidth);
      if (topScrollRef.current && !isSyncing.current) {
        topScrollRef.current.scrollLeft = el.scrollLeft;
      }
    }
  }, []);

  useEffect(() => {
    checkOverflow();

    const el = mainScrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });
    resizeObserver.observe(el);

    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    const timer = setTimeout(checkOverflow, 150);

    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow, children]);

  const handleTopScroll = () => {
    if (isSyncing.current) return;
    if (topScrollRef.current && mainScrollRef.current) {
      isSyncing.current = true;
      mainScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    }
  };

  const handleMainScroll = () => {
    if (isSyncing.current) return;
    if (topScrollRef.current && mainScrollRef.current) {
      isSyncing.current = true;
      topScrollRef.current.scrollLeft = mainScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    }
  };

  return (
    <div className={`w-full relative ${className}`}>
      {/* Top horizontal scrollbar: rendered strictly when table overflows */}
      {hasOverflow && (
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 select-none z-10 [scrollbar-width:thin] [scrollbar-color:#94a3b8_transparent] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-200/50 dark:[&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 transition-opacity duration-200"
          style={{ height: "12px" }}
          title="Scroll table horizontally"
        >
          <div style={{ width: `${scrollWidth}px`, height: "1px" }} />
        </div>
      )}

      {/* Main table container */}
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
