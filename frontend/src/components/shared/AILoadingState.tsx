import React from 'react';
import { AIThinkingOrb, type OrbState } from './AIThinkingOrb';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AILoadingStage {
  label: string;
  detail?: string;
}

export interface AILoadingStateProps {
  /** Shipped semantic animation state: 'working' | 'searching' | 'solving' | 'connecting' | 'weaving' etc. */
  state?: OrbState;
  /** Primary title heading */
  title: string;
  /** Explanatory description */
  description?: string;
  /** Optional multi-step progress stages */
  stages?: (string | AILoadingStage)[];
  /** Currently active stage index (0-indexed) */
  activeStageIndex?: number;
  /** Wrap in glassmorphic card container */
  card?: boolean;
  /** Compact sizing */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AILoadingState: React.FC<AILoadingStateProps> = ({
  state = 'working',
  title,
  description,
  stages,
  activeStageIndex = 0,
  card = true,
  size = 'md',
  className,
}) => {
  const orbSize =
    size === 'sm' ? 44 : size === 'lg' ? 110 : size === 'xl' ? 130 : 80;

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center text-center space-y-4 max-w-lg mx-auto', className)}
    >
      <AIThinkingOrb
        state={state}
        size={orbSize}
        color="#008855"
        speed={1.1}
      />

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-[#0A1A12] tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {stages && stages.length > 0 && (
        <div className="w-full pt-3 space-y-2 text-left">
          {stages.map((stage, idx) => {
            const label = typeof stage === 'string' ? stage : stage.label;
            const detail = typeof stage === 'string' ? undefined : stage.detail;
            const isCompleted = idx < activeStageIndex;
            const isCurrent = idx === activeStageIndex;

            return (
              <div
                key={idx}
                className={cn(
                  'flex items-start gap-2.5 p-2 rounded-xl text-xs transition-all',
                  isCurrent
                    ? 'bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD] font-semibold shadow-2xs'
                    : isCompleted
                    ? 'text-neutral-500 opacity-80'
                    : 'text-neutral-400 opacity-50'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 size={15} className="text-[#008855] shrink-0 mt-0.5" />
                ) : isCurrent ? (
                  <Loader2 size={15} className="text-[#008855] animate-spin shrink-0 mt-0.5" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-neutral-300 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="truncate">{label}</div>
                  {detail && isCurrent && (
                    <div className="text-[11px] font-normal text-[#007044] pt-0.5">
                      {detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (card) {
    return (
      <div className="rounded-2xl border border-[#D5E5DC] bg-white/95 backdrop-blur-sm p-8 shadow-xs">
        {content}
      </div>
    );
  }

  return content;
};
