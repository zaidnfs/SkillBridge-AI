import React, { useEffect, useState, useCallback } from 'react';
import { JobPosting, SimilarJobSummary } from '@/types/jobs';
import { jobService } from '@/services/jobService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Briefcase,
  IndianRupee,
  Globe,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  MessageSquare,
  Layers,
} from 'lucide-react';
import { ReiconAtsDoc, ReiconGraph, ReiconShieldCheck } from '@/components/icons/Reicon';
import { useNavigate } from 'react-router-dom';
import {
  formatFullDate,
  formatInrLpaHint,
  formatRelativeDate,
  formatSalaryRange,
  isSafeHttpUrl,
  parseJobDescriptionSections,
} from '@/lib/jobFormatters';

interface JobDetailModalProps {
  job: JobPosting | null;
  isOpen: boolean;
  onClose: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, isOpen, onClose }) => {
  const navigate = useNavigate();

  const [detailJob, setDetailJob] = useState<JobPosting | null>(job);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const loadJobDetail = useCallback(async (jobId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const fullData = await jobService.getJobDetail(jobId);
      setDetailJob(fullData);
    } catch (err: any) {
      setDetailError(
        err.response?.data?.detail ||
          'Unable to load full job intelligence right now. Showing summary details.'
      );
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && job) {
      setDetailJob(job);
      setCopiedUrl(false);
      loadJobDetail(job.id);
    }
  }, [isOpen, job, loadJobDetail]);

  if (!job) return null;

  const activeJob = detailJob ?? job;
  const salaryText = formatSalaryRange(
    activeJob.salary_min,
    activeJob.salary_max,
    activeJob.currency
  );
  const lpaHint = formatInrLpaHint(
    activeJob.salary_min,
    activeJob.salary_max,
    activeJob.currency
  );
  const postedRelative = formatRelativeDate(activeJob.posted_date);
  const postedFull = formatFullDate(activeJob.posted_date);
  const processedFull = formatFullDate(activeJob.processed_at);
  const safeExternalUrl = isSafeHttpUrl(activeJob.source_url) ? activeJob.source_url : null;

  const parsedSections = parseJobDescriptionSections(activeJob.description);
  const isExcerptTruncated =
    Boolean(activeJob.description) &&
    (activeJob.description!.trim().endsWith('…') || activeJob.description!.trim().endsWith('...'));

  const marketInsights = activeJob.market_insights;
  const complementaryMarketSkills =
    marketInsights?.top_role_skills?.filter((item) => !item.in_this_job) ?? [];
  const benchmarkSalary = marketInsights
    ? formatSalaryRange(
        marketInsights.avg_salary_min,
        marketInsights.avg_salary_max,
        marketInsights.currency
      )
    : null;
  const benchmarkLpa = marketInsights
    ? formatInrLpaHint(
        marketInsights.avg_salary_min,
        marketInsights.avg_salary_max,
        marketInsights.currency
      )
    : null;

  const handleAnalyze = () => {
    onClose();
    navigate(`/resumes?jobId=${activeJob.id}`);
  };

  const handlePracticeInterview = () => {
    const roleParam = encodeURIComponent(activeJob.extracted_role || activeJob.title);
    const skillsParam = encodeURIComponent((activeJob.extracted_skills || []).slice(0, 8).join(','));
    onClose();
    navigate(`/interviews?role=${roleParam}${skillsParam ? `&skills=${skillsParam}` : ''}`);
  };

  const handleCopyLink = async () => {
    const shareTarget = safeExternalUrl || `${window.location.origin}/resumes?jobId=${activeJob.id}`;
    try {
      await navigator.clipboard.writeText(shareTarget);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  const handleSelectSimilarJob = (similar: SimilarJobSummary) => {
    const stub: JobPosting = {
      id: similar.id,
      title: similar.title,
      company: similar.company,
      location_city: similar.location_city,
      location_country: activeJob.location_country || 'IN',
      is_remote: similar.is_remote,
      salary_min: similar.salary_min,
      salary_max: similar.salary_max,
      currency: similar.currency,
      category: activeJob.category,
      posted_date: similar.posted_date,
      source_provider: activeJob.source_provider,
      source_url: '',
      extracted_skills: similar.extracted_skills || [],
      extracted_role: similar.extracted_role || '',
      is_processed: true,
    };
    setDetailJob(stub);
    loadJobDetail(similar.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border border-[#E2E8E5] bg-white rounded-2xl shadow-2xl p-0">
        {/* Top Header Banner */}
        <DialogHeader className="space-y-3 border-b border-[#E2E8E5] bg-[#F8FAF8] px-6 pt-6 pb-5">
          {/* Taxonomy & Status Badges */}
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
              {activeJob.extracted_role || activeJob.category || 'Job Posting'}
            </span>
            {activeJob.category && activeJob.extracted_role && activeJob.category !== activeJob.extracted_role && (
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-white text-[#475569] border border-[#E2E8E5]">
                {activeJob.category}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold border ${
                activeJob.is_remote
                  ? 'bg-[#EEF7F1] text-[#004D2F] border-[#D6E8DD]'
                  : 'bg-white text-[#475569] border-[#E2E8E5]'
              }`}
            >
              {activeJob.is_remote ? 'Remote Friendly' : 'On-site'}
            </span>
            {activeJob.contract_time && (
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-white text-[#475569] border border-[#E2E8E5]">
                {activeJob.contract_time}
              </span>
            )}
            {activeJob.contract_type && (
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-white text-[#475569] border border-[#E2E8E5]">
                {activeJob.contract_type}
              </span>
            )}
            {activeJob.is_processed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#EEF7F1] text-[#004D2F] border border-[#00A264]/35">
                <ReiconShieldCheck size={12} strokeWidth={2} />
                NER Verified
              </span>
            )}
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold text-[#0A1A12] leading-snug">
            {activeJob.title}
          </DialogTitle>

          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#475569]">
              <span className="flex items-center gap-1.5 text-[#0A1A12] font-semibold">
                <Building2 className="h-3.5 w-3.5 text-[#008855]" />
                {activeJob.company}
              </span>

              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#008855]" />
                <span>
                  {activeJob.location_area && activeJob.location_area.length > 0
                    ? activeJob.location_area.join(' › ')
                    : activeJob.location_display || activeJob.location_city || 'India'}
                </span>
              </span>

              {(postedRelative || postedFull) && (
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  <span>
                    Posted {postedRelative}
                    {postedFull ? ` (${postedFull})` : ''}
                  </span>
                </span>
              )}

              {activeJob.source_id && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-neutral-400">
                  <Globe className="h-3 w-3" />
                  <span className="capitalize">{activeJob.source_provider}</span> #{activeJob.source_id}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Main Scrollable Content */}
        <div className="p-6 space-y-6">
          {/* Non-blocking error notice if rich detail fetch failed */}
          {detailError && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                <span>{detailError}</span>
              </div>
              <button
                type="button"
                onClick={() => loadJobDetail(activeJob.id)}
                className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline shrink-0 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}

          {/* 4-Card Key Highlights Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Compensation */}
            <div className="rounded-xl border border-[#E2E8E5] bg-[#F8FAF8] p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                <IndianRupee className="h-3.5 w-3.5 text-[#008855]" />
                <span>Compensation</span>
              </div>
              {salaryText ? (
                <>
                  <p className="text-sm font-bold text-[#004D2F] font-mono">
                    {lpaHint || salaryText}
                  </p>
                  <p className="text-[11px] text-[#475569] truncate" title={salaryText}>
                    {lpaHint ? salaryText : 'Annual range'}
                    {activeJob.salary_is_predicted ? ' · Est.' : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#0A1A12]">Not Disclosed</p>
                  <p className="text-[11px] text-[#475569]">
                    {benchmarkLpa || benchmarkSalary
                      ? `Role avg: ${benchmarkLpa || benchmarkSalary}`
                      : 'Check provider listing'}
                  </p>
                </>
              )}
            </div>

            {/* Work Mode & Contract */}
            <div className="rounded-xl border border-[#E2E8E5] bg-[#F8FAF8] p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                <Briefcase className="h-3.5 w-3.5 text-[#008855]" />
                <span>Arrangement</span>
              </div>
              <p className="text-sm font-bold text-[#0A1A12]">
                {activeJob.contract_time || (activeJob.is_remote ? 'Remote Role' : 'Standard')}
              </p>
              <p className="text-[11px] text-[#475569]">
                {[
                  activeJob.is_remote ? 'Remote eligible' : 'On-site',
                  activeJob.contract_type,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            {/* Location */}
            <div className="rounded-xl border border-[#E2E8E5] bg-[#F8FAF8] p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                <MapPin className="h-3.5 w-3.5 text-[#008855]" />
                <span>Location</span>
              </div>
              <p className="text-sm font-bold text-[#0A1A12] truncate">
                {activeJob.location_city || activeJob.location_display || 'India'}
              </p>
              <p className="text-[11px] text-[#475569] truncate">
                {activeJob.location_display || activeJob.location_country || 'India'}
              </p>
            </div>

            {/* Role Demand */}
            <div className="rounded-xl border border-[#E2E8E5] bg-[#EEF7F1] p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#004D2F]">
                <TrendingUp className="h-3.5 w-3.5 text-[#008855]" />
                <span>Market Demand</span>
              </div>
              {isLoadingDetail && !marketInsights ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <>
                  <p className="text-sm font-bold text-[#004D2F] font-mono">
                    {marketInsights?.matching_jobs_count ?? 1}{' '}
                    {(marketInsights?.matching_jobs_count ?? 1) === 1 ? 'listing' : 'listings'}
                  </p>
                  <p className="text-[11px] text-[#1C3829] truncate">
                    for {marketInsights?.role_title || activeJob.extracted_role || 'this category'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Extracted Skills & Complementary Market Skills */}
          <section className="space-y-3 rounded-xl border border-[#E2E8E5] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#004D2F] font-mono flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#008855]" />
                Required &amp; Extracted Skills (spaCy NER)
              </h4>
              {processedFull && (
                <span className="text-[11px] font-mono text-neutral-400">
                  Indexed {processedFull}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {activeJob.extracted_skills && activeJob.extracted_skills.length > 0 ? (
                activeJob.extracted_skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD] font-mono"
                  >
                    <CheckCircle2 className="h-3 w-3 text-[#008855]" />
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#475569] italic">
                  No specific technical skills were tagged by NER for this posting.
                </span>
              )}
            </div>

            {complementaryMarketSkills.length > 0 && (
              <div className="pt-3 mt-2 border-t border-neutral-100 space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                  <ReiconGraph size={13} strokeWidth={2} />
                  Frequently paired skills for {marketInsights?.role_title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {complementaryMarketSkills.slice(0, 6).map((item) => (
                    <span
                      key={item.skill}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[#F8FAF8] text-[#1C3829] border border-[#E2E8E5] font-mono"
                    >
                      <span>{item.skill}</span>
                      <span className="text-[10px] text-neutral-400">({item.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Job Description Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#004D2F] font-mono flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#008855]" />
                Job Description &amp; Responsibilities
              </h4>
              {activeJob.description && (
                <span className="text-[11px] font-mono text-neutral-400">
                  {activeJob.description.trim().split(/\s+/).length} words
                </span>
              )}
            </div>

            {isLoadingDetail && !activeJob.description ? (
              <div className="space-y-2.5 p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E5]">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : parsedSections.length > 0 ? (
              <div className="space-y-4 p-4 sm:p-5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E5]">
                {parsedSections.map((section, idx) => (
                  <div key={`${section.heading || 'intro'}-${idx}`} className="space-y-1.5">
                    {section.heading && (
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#004D2F] font-mono">
                        {section.heading}
                      </h5>
                    )}
                    <p className="text-sm text-[#0F291B] whitespace-pre-line leading-relaxed">
                      {section.body}
                    </p>
                  </div>
                ))}

                {isExcerptTruncated && safeExternalUrl && (
                  <div className="pt-3 border-t border-[#E2E8E5] flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569]">
                    <span>
                      This is a summarized preview from {activeJob.source_provider || 'the job board'}.
                    </span>
                    <a
                      href={safeExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#008855] hover:underline"
                    >
                      <span>Read full posting</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E5] text-sm text-[#475569] italic">
                No detailed description provided by the job provider.
              </div>
            )}
          </section>

          {/* Market Benchmark & Hiring Hubs */}
          {marketInsights && (benchmarkSalary || marketInsights.top_hiring_cities.length > 0) && (
            <section className="rounded-xl border border-[#E2E8E5] bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#004D2F] font-mono flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#008855]" />
                Role Market Benchmark ({marketInsights.role_title})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {benchmarkSalary && (
                  <div className="rounded-lg bg-[#F8FAF8] border border-[#E2E8E5] p-3 space-y-1">
                    <span className="text-[11px] font-mono text-[#475569]">
                      Average Compensation Across Tracked Roles
                    </span>
                    <p className="text-sm font-bold text-[#004D2F] font-mono">
                      {benchmarkLpa || benchmarkSalary}
                    </p>
                    {benchmarkLpa && (
                      <p className="text-[11px] text-[#475569] font-mono">{benchmarkSalary}</p>
                    )}
                  </div>
                )}

                {marketInsights.top_hiring_cities.length > 0 && (
                  <div className="rounded-lg bg-[#F8FAF8] border border-[#E2E8E5] p-3 space-y-1.5">
                    <span className="text-[11px] font-mono text-[#475569]">
                      Top Hiring Cities for This Role
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {marketInsights.top_hiring_cities.map((hub) => (
                        <span
                          key={hub.city}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#E2E8E5] text-[11px] font-mono text-[#0A1A12]"
                        >
                          {hub.city}
                          <span className="text-[#008855] font-semibold">· {hub.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Similar Jobs */}
          {activeJob.similar_jobs && activeJob.similar_jobs.length > 0 && (
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#004D2F] font-mono">
                Similar Opportunities
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeJob.similar_jobs.map((similar) => {
                  const simSalary =
                    formatInrLpaHint(similar.salary_min, similar.salary_max, similar.currency) ||
                    formatSalaryRange(similar.salary_min, similar.salary_max, similar.currency);
                  return (
                    <button
                      key={similar.id}
                      type="button"
                      onClick={() => handleSelectSimilarJob(similar)}
                      className="text-left rounded-xl border border-[#E2E8E5] bg-[#F8FAF8] hover:bg-white hover:border-[#008855]/45 p-3 transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A264]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-semibold text-[#0A1A12] group-hover:text-[#008855] truncate">
                            {similar.title}
                          </p>
                          <p className="text-[11px] text-[#475569] truncate">
                            {similar.company} · {similar.location_city || 'India'}
                            {similar.is_remote ? ' · Remote' : ''}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-[#008855] shrink-0 mt-0.5" />
                      </div>
                      {simSalary && (
                        <p className="text-[11px] font-mono font-semibold text-[#004D2F] mt-1.5">
                          {simSalary}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t border-[#E2E8E5] bg-[#F8FAF8]">
          <div className="flex flex-wrap items-center gap-2">
            {safeExternalUrl && (
              <a
                href={safeExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3 rounded-lg text-xs font-semibold text-[#004D2F] bg-white border border-[#00A264]/40 hover:bg-[#EEF7F1] transition-colors inline-flex items-center gap-1.5"
              >
                <span className="capitalize">View on {activeJob.source_provider || 'Provider'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 px-3 rounded-lg text-xs font-medium text-[#475569] bg-white border border-[#E2E8E5] hover:text-[#0A1A12] hover:bg-neutral-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#008855]" />
                  <span className="text-[#004D2F]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={handlePracticeInterview}
              className="h-9 px-4 rounded-lg text-xs font-semibold text-[#004D2F] bg-white border border-[#00A264]/40 hover:bg-[#EEF7F1] active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#008855]" />
              <span>Practice Interview</span>
            </button>

            <button
              type="button"
              onClick={handleAnalyze}
              className="h-9 px-5 rounded-lg text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ReiconAtsDoc size={14} strokeWidth={2} />
              <span>Compare with My Resume</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
