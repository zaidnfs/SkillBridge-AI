import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[#D6E8DD] bg-white shadow-xs',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-[#0A1A12] mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="h-10 px-5 rounded-full text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all shadow-sm shadow-[#008855]/20 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
