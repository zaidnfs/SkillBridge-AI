import React from 'react';
import { JobPosting } from '@/types/jobs';
import { ReiconAtsDoc } from '@/components/icons/Reicon';
import { Building2, MapPin, ArrowRight, Clock, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeDate, formatSalaryRange, formatInrLpaHint } from '@/lib/jobFormatters';

interface JobCardProps {
  job: JobPosting;
  onSelect: (job: JobPosting) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onSelect }) => {
  const navigate = useNavigate();

  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/resumes?jobId=${job.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(job);
    }
  };

  const salaryText = formatSalaryRange(job.salary_min, job.salary_max, job.currency);
  const lpaHint = formatInrLpaHint(job.salary_min, job.salary_max, job.currency);
  const postedLabel = formatRelativeDate(job.posted_date);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(job)}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${job.title} at ${job.company}`}
      className="cursor-pointer rounded-xl border border-[#E2E8E5] bg-white p-5 flex flex-col justify-between group transition-all shadow-xs hover:border-[#008855]/45 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#00A264]"
    >
      <div className="space-y-3">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-block text-[11px] font-semibold text-[#004D2F] bg-[#EEF7F1] border border-[#D6E8DD] px-2 py-0.5 rounded uppercase tracking-wider font-mono truncate max-w-[200px]">
                {job.extracted_role || job.category || 'Software Role'}
              </span>
              {job.contract_time && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#F8FAF8] text-[#475569] border border-[#E2E8E5]">
                  <Briefcase className="h-2.5 w-2.5 text-[#008855]" />
                  {job.contract_time}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-base text-[#0A1A12] group-hover:text-[#008855] transition-colors line-clamp-1">
              {job.title}
            </h3>
            <p className="text-xs text-[#475569] flex items-center gap-1.5 font-medium">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-[#008855]" />
              <span className="truncate">{job.company}</span>
            </p>
          </div>

          {job.is_remote && (
            <span className="shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
              Remote
            </span>
          )}
        </div>

        {/* Location, Salary & Posted Date */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#475569]">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="truncate max-w-[140px]">{job.location_city || 'India'}</span>
          </span>

          {salaryText && (
            <span className="font-mono text-[#004D2F] font-semibold flex items-center" title={salaryText}>
              {lpaHint || salaryText}
            </span>
          )}

          {postedLabel && (
            <span className="flex items-center gap-1 text-[11px] text-neutral-400 ml-auto font-mono">
              <Clock className="h-3 w-3" />
              {postedLabel}
            </span>
          )}
        </div>

        {/* Concise Description Preview */}
        {job.description_preview && (
          <p className="text-xs text-[#475569] leading-relaxed line-clamp-2">
            {job.description_preview}
          </p>
        )}

        {/* Extracted Skill Badges */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {job.extracted_skills?.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-[11px] px-2 py-0.5 rounded bg-[#F8FAF8] text-[#1C3829] border border-[#E2E8E5] group-hover:border-[#008855]/30 transition-colors font-mono"
            >
              {skill}
            </span>
          ))}
          {(job.extracted_skills?.length || 0) > 4 && (
            <span className="text-[10px] text-neutral-500 self-center px-1 font-mono">
              +{(job.extracted_skills?.length || 0) - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="pt-3.5 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
        <span className="text-[#475569] group-hover:text-[#008855] font-medium transition-colors flex items-center gap-1">
          View rich details <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>

        <button
          type="button"
          onClick={handleAnalyze}
          className="text-xs h-8 px-3 rounded-lg font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A264]"
        >
          <ReiconAtsDoc size={13} strokeWidth={2} />
          <span>Analyze Fit</span>
        </button>
      </div>
    </article>
  );
};
