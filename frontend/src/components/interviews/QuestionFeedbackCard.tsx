import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { InterviewEvaluation } from '@/types/interview';
import { cn } from '@/lib/utils';

interface QuestionFeedbackCardProps {
  evaluation: InterviewEvaluation;
  score: number | null;
  expectedPoints?: string[];
  className?: string;
}

export const QuestionFeedbackCard: React.FC<QuestionFeedbackCardProps> = ({
  evaluation,
  score,
  expectedPoints = [],
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayScore = score ?? evaluation.score ?? 0;

  // Color mapping based on score tiers
  let scoreBadgeColor = 'bg-red-50 text-red-700 border-red-200';
  let scoreBarColor = 'bg-red-500';
  if (displayScore >= 75) {
    scoreBadgeColor = 'bg-[#EEF7F1] text-[#004D2F] border-[#D6E8DD]';
    scoreBarColor = 'bg-[#008855]';
  } else if (displayScore >= 55) {
    scoreBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    scoreBarColor = 'bg-amber-500';
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-[#D5E5DC] bg-white p-5 shadow-xs transition-all',
        className
      )}
    >
      {/* Header: Score and Summary Header */}
      <div className="flex items-center justify-between gap-4 border-b border-[#EAF2ED] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#EAF5EF] text-[#008855] flex items-center justify-center shrink-0">
            <Sparkles size={17} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#0A1A12] leading-tight">AI Evaluation & Rubric</h4>
            <p className="text-[11px] text-neutral-500">Constructive feedback on technical depth and accuracy</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-bold font-mono border flex items-center gap-1.5',
              scoreBadgeColor
            )}
          >
            <span>Score:</span>
            <span className="text-sm">{displayScore}</span>
            <span className="text-[10px] text-neutral-400 font-normal">/100</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-3 overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500 ease-out', scoreBarColor)}
          style={{ width: `${displayScore}%` }}
        />
      </div>

      {/* Accuracy & Depth Critiques */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {evaluation.technical_accuracy && (
          <div className="rounded-lg bg-[#F8FAF9] border border-[#E5EFE9] p-3 text-xs">
            <span className="font-semibold text-[#004D2F] block mb-1">Technical Accuracy</span>
            <p className="text-neutral-700 leading-relaxed">{evaluation.technical_accuracy}</p>
          </div>
        )}
        {evaluation.depth && (
          <div className="rounded-lg bg-[#F8FAF9] border border-[#E5EFE9] p-3 text-xs">
            <span className="font-semibold text-[#004D2F] block mb-1">Depth & Trade-offs</span>
            <p className="text-neutral-700 leading-relaxed">{evaluation.depth}</p>
          </div>
        )}
      </div>

      {/* Strengths & Improvements */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {evaluation.strengths && evaluation.strengths.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1 mb-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              What you did well:
            </span>
            <ul className="space-y-1.5">
              {evaluation.strengths.map((str, idx) => (
                <li key={idx} className="text-xs text-neutral-700 flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {evaluation.improvements && evaluation.improvements.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-2">
              <AlertCircle size={14} className="text-amber-600" />
              Areas to sharpen:
            </span>
            <ul className="space-y-1.5">
              {evaluation.improvements.map((imp, idx) => (
                <li key={idx} className="text-xs text-neutral-700 flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Expected Points Rubric */}
      {expectedPoints && expectedPoints.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#EAF2ED]">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
            Rubric Criteria Expected by Interviewer
          </span>
          <div className="flex flex-wrap gap-1.5">
            {expectedPoints.map((pt, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2.5 py-1 rounded-md bg-[#F1F6F3] border border-[#D5E5DC] text-[#004D2F]"
              >
                ✓ {pt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Accordion: Model / Ideal Answer */}
      {evaluation.ideal_answer && (
        <div className="mt-4 pt-3 border-t border-[#EAF2ED]">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-xs font-semibold text-[#004D2F] hover:text-[#008855] transition-colors py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} />
              {isExpanded ? 'Hide Model Reference Answer' : 'View Model Reference Answer'}
            </span>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {isExpanded && (
            <div className="mt-2.5 p-3 rounded-lg bg-[#EEF7F1]/60 border border-[#D6E8DD] text-xs text-neutral-800 leading-relaxed whitespace-pre-line animate-in fade-in-50 duration-200">
              {evaluation.ideal_answer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
