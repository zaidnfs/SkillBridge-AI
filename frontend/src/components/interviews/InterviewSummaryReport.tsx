import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Briefcase,
} from 'lucide-react';
import { InterviewSession, SessionSummary } from '@/types/interview';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { cn } from '@/lib/utils';

interface InterviewSummaryReportProps {
  session: InterviewSession;
  onRetake: () => void;
  className?: string;
}

export const InterviewSummaryReport: React.FC<InterviewSummaryReportProps> = ({
  session,
  onRetake,
  className,
}) => {
  const navigate = useNavigate();
  const summary = (session.summary_feedback as SessionSummary) || {};
  const score = Math.round(session.overall_score ?? summary.overall_score ?? 0);

  const readiness = summary.readiness_level || (score >= 75 ? 'Ready for Interviews' : score >= 55 ? 'Promising with Minor Gaps' : 'Foundational Study Needed');
  let readinessBadge = 'bg-[#EEF7F1] text-[#004D2F] border-[#D6E8DD]';
  if (readiness === 'Foundational Study Needed' || score < 55) {
    readinessBadge = 'bg-red-50 text-red-700 border-red-200';
  } else if (readiness === 'Promising with Minor Gaps' || score < 75) {
    readinessBadge = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  const strengths = summary.key_strengths || [];
  const growthAreas = summary.areas_for_growth || [];
  const recommendedSkills = summary.recommended_skills_to_review || [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Top Banner: Score & Readiness Verdict */}
      <div className="rounded-3xl border border-[#D5E5DC] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <ScoreGauge score={score} size={140} showLabel={false} />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider',
                    readinessBadge
                  )}
                >
                  {readiness}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  {session.total_questions} Questions Evaluated
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-[#0A1A12] tracking-tight">
                {session.role_title} Mock Interview Assessment
              </h2>

              <p className="text-xs sm:text-sm text-neutral-600 max-w-xl leading-relaxed">
                {summary.summary_verdict ||
                  `Completed ${session.questions.length} technical interview questions evaluated on depth, system architecture, and practical engineering trade-offs.`}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex sm:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onRetake}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#008855] hover:bg-[#007044] shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>New Interview</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/resumes')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#004D2F] bg-[#EEF7F1] hover:bg-[#E1EFE7] border border-[#D6E8DD] transition-colors cursor-pointer"
            >
              <BookOpen size={15} />
              <span>Skill Gaps & Resources</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Breakdown: Strengths vs Growth Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="rounded-3xl border border-[#D5E5DC] bg-white p-6 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0A1A12]">Key Technical Strengths</h3>
              <p className="text-[11px] text-neutral-400">Where your responses excelled</p>
            </div>
          </div>

          {strengths.length > 0 ? (
            <ul className="space-y-2.5">
              {strengths.map((str, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-neutral-700 p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E8F0EB]"
                >
                  <span className="text-[#008855] font-bold mt-0.5">•</span>
                  <span className="leading-relaxed">{str}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-neutral-500 italic">No specific strengths recorded.</p>
          )}
        </div>

        {/* Growth Areas */}
        <div className="rounded-3xl border border-[#D5E5DC] bg-white p-6 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0A1A12]">Priority Growth Areas</h3>
              <p className="text-[11px] text-neutral-400">Topics to study for placement interviews</p>
            </div>
          </div>

          {growthAreas.length > 0 ? (
            <ul className="space-y-2.5">
              {growthAreas.map((area, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-neutral-700 p-2.5 rounded-xl bg-[#FAF9F5] border border-[#F0ECE1]"
                >
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span className="leading-relaxed">{area}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-neutral-500 italic">No critical growth areas identified.</p>
          )}
        </div>
      </div>

      {/* Recommended Skills to Review (Connecting to Phase 3.1) */}
      {recommendedSkills.length > 0 && (
        <div className="rounded-3xl border border-[#D5E5DC] bg-[#EEF7F1]/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#008855]" />
              <h4 className="text-sm font-bold text-[#004D2F]">Recommended Skills to Deepen</h4>
            </div>
            <p className="text-xs text-neutral-600">
              Curated free courses and tutorials are available for these topics in your skill roadmap.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {recommendedSkills.map((sk) => (
                <span
                  key={sk}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#BBDDCB] text-[#004D2F] shadow-2xs"
                >
                  {sk}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/resumes')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#004D2F] bg-white border border-[#BBDDCB] hover:bg-[#EEF7F1] transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <span>Explore Free Resources</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
