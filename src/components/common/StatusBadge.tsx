import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = (status || '').toLowerCase().trim();

  let badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700';
  let dotStyle = 'bg-slate-400';

  if (s === 'completed' || s === 'approved' || s === 'delivered' || s === 'passed' || s === 'running' || s === 'paid' || s === 'awarded' || s === 'available') {
    badgeStyle = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
    dotStyle = 'bg-emerald-400';
  } else if (
    s === 'in production' ||
    s === 'production' ||
    s === 'dispatched' ||
    s === 'in progress' ||
    s === 'sent' ||
    s === 'sales order'
  ) {
    badgeStyle = 'bg-blue-950/60 text-blue-300 border-blue-800/80';
    dotStyle = 'bg-blue-400';
  } else if (
    s === 'qc' ||
    s === 'quality check' ||
    s === 'qc pending' ||
    s === 'planning' ||
    s === 'material ready' ||
    s === 'ready for dispatch' ||
    s === 'ready' ||
    s === 'submitted' ||
    s === 'partial' ||
    s === 'partial available'
  ) {
    badgeStyle = 'bg-amber-950/60 text-amber-300 border-amber-800/80';
    dotStyle = 'bg-amber-400';
  } else if (s === 'pending' || s === 'new' || s === 'material procurement' || s === 'draft' || s === 'enquiry') {
    badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700';
    dotStyle = 'bg-slate-400';
  } else if (
    s === 'rejected' ||
    s === 'rework' ||
    s === 'high' ||
    s === 'maintenance' ||
    s === 'critical' ||
    s === 'cancelled' ||
    s === 'returned' ||
    s === 'purchase required' ||
    s === 'shortage'
  ) {
    badgeStyle = 'bg-rose-950/60 text-rose-300 border-rose-800/80';
    dotStyle = 'bg-rose-400';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-xs px-3 py-1 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono uppercase tracking-wider font-semibold ${badgeStyle} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} />
      {status}
    </span>
  );
};
