import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  theme?: 'light' | 'dark';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
  theme = 'dark',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full ${maxWidthClasses} ${
          isLight
            ? 'bg-white border border-slate-200 text-slate-900 shadow-2xl rounded-2xl'
            : 'bg-slate-900 border border-slate-700/80 text-slate-100 shadow-2xl rounded-2xl'
        } overflow-hidden my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLight
              ? 'border-slate-200 bg-slate-50/90 text-slate-900'
              : 'border-slate-800 bg-slate-900/50 text-slate-100'
          }`}
        >
          <div>
            <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              {title}
            </h3>
            {subtitle && (
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className={`p-6 max-h-[calc(85vh-120px)] overflow-y-auto ${
            isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-200'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
