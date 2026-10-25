import React from 'react';
import { IncidentCategory } from '../../types';
import { Car, Flame, Waves, HeartPulse, ShieldAlert, CloudLightning, HelpCircle } from 'lucide-react';

interface CategoryBadgeProps {
  category: IncidentCategory;
  showIcon?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, showIcon = true }) => {
  const getIcon = () => {
    switch (category) {
      case 'ROAD_ACCIDENT':
        return <Car className="w-3.5 h-3.5 text-blue-600" />;
      case 'FIRE_INCIDENT':
        return <Flame className="w-3.5 h-3.5 text-orange-600" />;
      case 'FLOOD':
        return <Waves className="w-3.5 h-3.5 text-cyan-600" />;
      case 'MEDICAL_EMERGENCY':
        return <HeartPulse className="w-3.5 h-3.5 text-rose-600" />;
      case 'PUBLIC_SAFETY':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />;
      case 'NATURAL_DISASTER':
        return <CloudLightning className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const formatName = (cat: string) => {
    return cat.replace(/_/g, ' ');
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
      {showIcon && getIcon()}
      <span className="capitalize">{formatName(category).toLowerCase()}</span>
    </span>
  );
};
