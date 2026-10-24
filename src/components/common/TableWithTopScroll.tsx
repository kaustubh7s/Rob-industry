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
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const isSyncing = useRef(false);

  const syncWidth = useCallback(() => {
    if (mainScrollRef.current) {
      const sw = mainScrollRef.current.scrollWidth;
      setScrollWidth(sw);
      if (topScrollRef.current && !isSyncing.current) {
        topScrollRef.current.scrollLeft = mainScrollRef.current.scrollLeft;
      }
    }
  }, []);

  useEffect(() => {
    syncWidth();
    const el = mainScrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      syncWidth();
    });
    resizeObserver.observe(el);

    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    const t1 = setTimeout(syncWidth, 100);
    const t2 = setTimeout(syncWidth, 300);

    window.addEventListener('resize', syncWidth);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncWidth);
    };
  }, [syncWidth, children]);

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
      <style>{`
        .always-visible-top-scroll {
          overflow-x: scroll !important;
          overflow-y: hidden !important;
          height: 14px !important;
          background-color: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
          scrollbar-width: thin;
          scrollbar-color: #64748b #f1f5f9;
        }
        .always-visible-top-scroll::-webkit-scrollbar {
          height: 12px !important;
          display: block !important;
        }
        .always-visible-top-scroll::-webkit-scrollbar-track {
          background: #f1f5f9 !important;
        }
        .always-visible-top-scroll::-webkit-scrollbar-thumb {
          background: #64748b !important;
          border-radius: 6px;
          border: 2px solid #f1f5f9;
        }
        .always-visible-top-scroll::-webkit-scrollbar-thumb:hover {
          background: #334155 !important;
        }
      `}</style>

      {/* Clean, Always-Visible Top Horizontal Scrollbar */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="always-visible-top-scroll"
      >
        <div style={{ width: scrollWidth ? `${scrollWidth}px` : '100%', height: '1px' }} />
      </div>

      {/* Main Table */}
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
