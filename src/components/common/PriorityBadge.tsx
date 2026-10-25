import React from 'react';
import { IncidentPriority } from '../../types';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, HelpCircle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: IncidentPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showIcon = true
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold'
  }[size];

  switch (priority) {
    case 'CRITICAL':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}
        >
          {showIcon && <AlertCircle className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5 text-red-600'} />}
          <span>Critical</span>
        </span>
      );
    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-orange-50 text-orange-700 border border-orange-200 ${sizeClasses}`}
        >
          {showIcon && <AlertTriangle className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5 text-orange-600'} />}
          <span>High</span>
        </span>
      );
    case 'MEDIUM':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}
        >
          {showIcon && <Info className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5 text-amber-600'} />}
          <span>Medium</span>
        </span>
      );
    case 'LOW':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
        >
          {showIcon && <CheckCircle2 className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5 text-slate-500'} />}
          <span>Low</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded-md bg-slate-50 text-slate-500 border border-slate-200 ${sizeClasses}`}
        >
          {showIcon && <HelpCircle className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5 text-slate-400'} />}
          <span>Unassessed</span>
        </span>
      );
  }
};
