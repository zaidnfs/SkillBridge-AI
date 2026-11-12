import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resumeService } from '@/services/resumeService';
import { jobService } from '@/services/jobService';
import { ResumeSummary, FitScoreResult } from '@/types/resumes';
import { JobPosting } from '@/types/jobs';
import { ResumeUploadZone } from '@/components/resumes/ResumeUploadZone';
import { TargetJobPicker } from '@/components/resumes/TargetJobPicker';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorRetryCard } from '@/components/shared/ErrorRetryCard';
import { ReiconAtsDoc } from '@/components/icons/Reicon';
import { KoboyoSparkle } from '@/components/icons/Koboyo';
import { SkillGapRecommendations } from '@/components/skills/SkillGapRecommendations';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';
import { AILoadingState } from '@/components/shared/AILoadingState';
import { cn } from '@/lib/utils';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Plus,
  Clock,
  Trash2,
  MessageSquare,
  AlertCircle,
  X,
} from 'lucide-react';

export const ResumeAnalyzerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedJobId = searchParams.get('jobId');

  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  // Target selection mode ('listing' or 'custom')
  const [targetMode, setTargetMode] = useState<'listing' | 'custom'>('listing');
  const [customRoleTitle, setCustomRoleTitle] = useState('Backend Developer');
  const [customSkills, setCustomSkills] = useState<string[]>(['Python', 'Django', 'PostgreSQL', 'Docker']);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAts, setIsGeneratingAts] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const [fitResult, setFitResult] = useState<FitScoreResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);

  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Load initial resumes and preselected job (if any) or first available job
  const loadData = async () => {
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const resumesPromise = resumeService.getResumes();
      const jobPromise = preselectedJobId
        ? jobService.getJobDetail(preselectedJobId).catch(() => null)
        : jobService.getJobsPaginated({ page: 1, page_size: 1 }).then((res) => res.results[0] ?? null);

      const [resumesData, initialJob] = await Promise.all([resumesPromise, jobPromise]);

      setResumes(resumesData);

      if (resumesData.length > 0 && !selectedResumeId) {
        setSelectedResumeId(resumesData[0].id);
      }

      if (initialJob) {
        setSelectedJob(initialJob);
      } else if (!selectedJob) {
        const fallbackJobs = await jobService.getJobs({ page_size: 1 });
        if (fallbackJobs.length > 0) {
          setSelectedJob(fallbackJobs[0]);
        }
      }
    } catch (err: any) {
      setLoadError(
        err.response?.data?.detail ||
          'Failed to load resume or job data. Please check connection to backend.'
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadSuccess = (newResume: ResumeSummary) => {
    setResumes((prev) => [newResume, ...prev]);
    setSelectedResumeId(newResume.id);
    setShowUploadZone(false);
    setFitResult(null);
    setActionError(null);
  };

  const handleDeleteResume = async (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    setDeletingResumeId(resumeId);
    setActionError(null);
    try {
      await resumeService.deleteResume(resumeId);
      const remaining = resumes.filter((r) => r.id !== resumeId);
      setResumes(remaining);
      if (selectedResumeId === resumeId) {
        setSelectedResumeId(remaining[0]?.id || '');
        setFitResult(null);
      }
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to delete resume. Please try again.');
    } finally {
      setDeletingResumeId(null);
    }
  };

  const canAnalyze =
    Boolean(selectedResumeId) &&
    (targetMode === 'listing'
      ? Boolean(selectedJob?.id)
      : customSkills.length > 0 && customRoleTitle.trim().length > 0);

  const handleAnalyze = async () => {
    if (!canAnalyze || !selectedResumeId) return;

    setIsAnalyzing(true);
    setActionError(null);

    try {
      const result =
        targetMode === 'listing' && selectedJob
          ? await resumeService.analyzeResume(selectedResumeId, selectedJob.id)
          : await resumeService.analyzeResume(
              selectedResumeId,
              undefined,
              customSkills,
              customRoleTitle.trim()
            );

      setFitResult(result);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setActionError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          'Failed to run fit analysis against the selected target.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadAts = async () => {
    if (!selectedResumeId) return;
    setIsGeneratingAts(true);
    setActionError(null);

    try {
      const targetJobId = targetMode === 'listing' ? selectedJob?.id : undefined;
      const blob = await resumeService.downloadAtsResume(selectedResumeId, targetJobId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ATS_Tailored_Resume_${Date.now()}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setActionError('Failed to generate ATS DOCX resume. Please try again.');
    } finally {
      setIsGeneratingAts(false);
    }
  };

  const handlePracticeInterview = () => {
    const roleTitle =
      fitResult?.job_title ||
      (targetMode === 'listing' ? selectedJob?.extracted_role || selectedJob?.title : customRoleTitle) ||
      'Software Engineer';
    const skillsList =
      fitResult?.missing_skills && fitResult.missing_skills.length > 0
        ? [...fitResult.missing_skills, ...(fitResult.matched_skills || [])].slice(0, 8)
        : targetMode === 'listing'
        ? (selectedJob?.extracted_skills || []).slice(0, 8)
        : customSkills.slice(0, 8);

    const roleParam = encodeURIComponent(roleTitle);
    const skillsParam = encodeURIComponent(skillsList.join(','));
    navigate(`/interviews?role=${roleParam}${skillsParam ? `&skills=${skillsParam}` : ''}`);
  };

  const selectedResume = resumes.find((r) => r.id === selectedResumeId);
  const targetDisplayLabel =
    targetMode === 'listing'
      ? selectedJob
        ? `${selectedJob.title} at ${selectedJob.company}`
        : 'No target job selected'
      : `${customRoleTitle || 'Custom Role'} (${customSkills.length} skills)`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD] font-mono mb-2">
            <ReiconAtsDoc size={13} strokeWidth={2} />
            <span>ATS Engine v2.3</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0A1A12]">
            Resume Analyzer &amp; ATS Engine
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Compute job-fit calibration, uncover skill gaps, and export optimized ATS DOCX resumes
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadZone(!showUploadZone)}
          className="self-start sm:self-auto h-9 px-4 rounded-lg text-xs font-semibold text-[#004D2F] bg-white border border-[#E2E8E5] hover:bg-[#EEF7F1] hover:border-[#00A264]/40 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          {showUploadZone ? (
            'Hide Uploader'
          ) : (
            <>
              <Plus className="h-4 w-4 text-[#008855]" />
              <span>Upload New Resume</span>
            </>
          )}
        </button>
      </div>

      {/* Upload Zone (collapsible) */}
      {(showUploadZone || resumes.length === 0) && (
        <div className="p-6 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#0A1A12]">Upload Candidate Resume</h2>
            <p className="text-xs text-[#475569]">
              Upload your resume in PDF or DOCX format to parse skills and experience
            </p>
          </div>
          <ResumeUploadZone onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Main Analyzer Workflow */}
      {isLoadingData ? (
        <AILoadingState
          state="searching"
          title="Loading Resumes & Live Job Listings"
          description="Connecting to knowledge graph data store to retrieve candidate profiles and active industry roles..."
        />
      ) : loadError ? (
        <ErrorRetryCard message={loadError} onRetry={loadData} />
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes uploaded yet"
          description="Upload your first resume in PDF or DOCX format to start comparing against live market jobs."
          actionLabel="Upload Resume"
          onAction={() => setShowUploadZone(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Non-blocking Action Error Banner */}
          {actionError && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                aria-label="Dismiss error"
                className="text-red-600 hover:text-red-900 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step-by-Step Workbench */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs space-y-6">
            {/* Step 1: Resume Selection */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-[#004D2F] text-white text-xs font-mono font-bold inline-flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-sm font-bold text-[#0A1A12]">Select Your Resume</h2>
                </div>
                <span className="text-[11px] font-mono text-[#475569]">
                  {resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'} stored
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {resumes.map((res) => {
                  const isActive = res.id === selectedResumeId;
                  return (
                    <div
                      key={res.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedResumeId(res.id);
                        setFitResult(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedResumeId(res.id);
                          setFitResult(null);
                        }
                      }}
                      className={cn(
                        'rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#00A264]',
                        isActive
                          ? 'bg-[#EEF7F1] border-[#008855] shadow-xs'
                          : 'bg-[#F8FAF8] border-[#E2E8E5] hover:bg-white hover:border-[#008855]/45'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-[#008855] shrink-0" />
                            <span className="text-xs font-bold text-[#0A1A12] truncate">
                              {res.original_filename}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#475569] flex items-center gap-1.5 font-mono">
                            <span className="uppercase">{res.file_type}</span>
                            <span>•</span>
                            <span>{(res.file_size / 1024).toFixed(0)} KB</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(res.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteResume(e, res.id)}
                          disabled={deletingResumeId === res.id}
                          aria-label={`Delete ${res.original_filename}`}
                          className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-white transition-colors shrink-0 cursor-pointer disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Parsed Skills Preview */}
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-neutral-200/70">
                        {(res.skills || []).slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#D6E8DD] text-[#004D2F] font-mono"
                          >
                            {skill}
                          </span>
                        ))}
                        {(res.skills?.length || 0) > 4 && (
                          <span className="text-[10px] font-mono text-[#475569] self-center pl-0.5">
                            +{res.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Searchable Target Job Picker */}
            <section className="pt-5 border-t border-neutral-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-[#004D2F] text-white text-xs font-mono font-bold inline-flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-[#0A1A12]">
                    Choose Target Job Listing or Custom Skills
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#475569]">
                  Search across all live postings by role, company, city, or skill
                </span>
              </div>

              <TargetJobPicker
                selectedJob={selectedJob}
                onSelectJob={(job) => {
                  setSelectedJob(job);
                  setFitResult(null);
                }}
                resumeSkills={selectedResume?.skills || []}
                mode={targetMode}
                onModeChange={(nextMode) => {
                  setTargetMode(nextMode);
                  setFitResult(null);
                }}
                customRoleTitle={customRoleTitle}
                onCustomRoleTitleChange={setCustomRoleTitle}
                customSkills={customSkills}
                onCustomSkillsChange={setCustomSkills}
                initiallyExpanded={!preselectedJobId}
              />
            </section>

            {/* Action Bar */}
            <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#475569] min-w-0">
                <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400 block">
                  Ready to compare
                </span>
                <span className="font-medium text-[#0A1A12] truncate block">
                  {selectedResume?.original_filename || 'No resume'} → {targetDisplayLabel}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadAts}
                  disabled={!selectedResumeId || isGeneratingAts}
                  className="h-10 px-4 rounded-lg text-xs font-semibold text-[#004D2F] bg-white border border-[#00A264]/40 hover:bg-[#EEF7F1] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#008855]" />
                  <span>{isGeneratingAts ? 'Generating DOCX...' : 'Export ATS DOCX'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze || isAnalyzing}
                  className="h-10 px-6 rounded-lg text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm shadow-[#008855]/20 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <div className="flex items-center gap-2">
                      <AIThinkingOrb state="searching" size={18} color="#FFFFFF" />
                      <span>Analyzing Fit...</span>
                    </div>
                  ) : (
                    <>
                      <KoboyoSparkle size={14} strokeWidth={2.2} />
                      <span>Analyze Fit Score</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Active AI Analysis Loading Stage Card */}
          {isAnalyzing && (
            <div className="p-8 rounded-2xl border border-[#D5E5DC] bg-white shadow-xs animate-in fade-in-50 duration-300">
              <AILoadingState
                state="searching"
                size="md"
                title="Calibrating Role Fit Against Knowledge Graph"
                description="Parsing candidate skills, querying job listing embeddings, and identifying competency alignment..."
                stages={[
                  { label: 'Extracting candidate skills and experience entities' },
                  { label: 'Computing vector distance against target job specifications' },
                  { label: 'Formulating ATS compatibility rating and skill gap insights' },
                ]}
                activeStageIndex={1}
                card={false}
              />
            </div>
          )}

          {/* Analysis Results View */}
          {fitResult && (
            <div ref={resultsRef} className="space-y-6 animate-in fade-in-50 duration-300">
              {/* Score & Summary Card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Gauge Card */}
                <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-[#E2E8E5] bg-white shadow-xs">
                  <div className="pb-3 text-center">
                    <h3 className="text-base font-semibold text-[#0A1A12]">Match Score</h3>
                    <p className="text-xs text-[#475569]">Objective calibration against listing</p>
                  </div>
                  <ScoreGauge score={Math.round(fitResult.fit_score)} size={140} />
                  <p className="text-xs text-[#475569] mt-4 font-mono">
                    {fitResult.total_matched_skills} of {fitResult.total_required_skills} required skills matched
                  </p>
                </div>

                {/* Analysis Summary & ATS Action */}
                <div className="lg:col-span-2 p-6 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                      <div>
                        <h3 className="text-lg font-bold text-[#0A1A12]">Executive Evaluation</h3>
                        <p className="text-xs text-[#475569]">
                          Algorithmically evaluated by SkillBridge Resume Engine
                        </p>
                      </div>
                      <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
                        {fitResult.job_title}
                      </span>
                    </div>

                    <p className="text-sm text-[#0F291B] leading-relaxed bg-[#F8FAF8] p-4 rounded-xl border border-[#E2E8E5]">
                      {fitResult.summary}
                    </p>

                    {fitResult.recommendations && fitResult.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Recommendations for ATS Optimization
                        </h4>
                        <ul className="space-y-1.5 text-xs text-[#1C3829]">
                          {fitResult.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#008855] mt-1.5 shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-[#475569]">
                      Tailor your DOCX resume or rehearse interview questions for this target role.
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handlePracticeInterview}
                        className="h-10 px-4 rounded-lg text-xs font-semibold text-[#004D2F] bg-white border border-[#00A264]/40 hover:bg-[#EEF7F1] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#008855]" />
                        <span>Practice Interview</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadAts}
                        disabled={isGeneratingAts}
                        className="h-10 px-5 rounded-lg text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-[#008855]/20 disabled:opacity-50"
                      >
                        {isGeneratingAts ? (
                          <div className="flex items-center gap-2">
                            <AIThinkingOrb state="composing" size={18} color="#FFFFFF" />
                            <span>Generating ATS DOCX...</span>
                          </div>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span>Download ATS Resume (.docx)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched & Missing Skills Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Matched Skills */}
                <div className="p-5 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#008855]" />
                      <h3 className="text-base font-semibold text-[#0A1A12]">Matched Skills</h3>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
                      {fitResult.matched_skills.length} Present
                    </span>
                  </div>

                  <p className="text-xs text-[#475569]">
                    Skills found in both your resume and the target job posting
                  </p>

                  {fitResult.matched_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {fitResult.matched_skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD] flex items-center gap-1 font-mono"
                        >
                          <CheckCircle2 className="h-3 w-3 text-[#008855]" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#475569] italic">
                      No direct required skills matched for this listing yet.
                    </p>
                  )}
                </div>

                {/* Missing Skills (Skill Gaps) */}
                <div className="p-5 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h3 className="text-base font-semibold text-[#0A1A12]">Missing Skills (Skill Gaps)</h3>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#FFFBEB] text-[#78350F] border border-[#FCD34D]">
                      {fitResult.missing_skills.length} Gaps
                    </span>
                  </div>

                  <p className="text-xs text-[#475569]">
                    Target requirements missing from your resume — curated learning resources shown below
                  </p>

                  {fitResult.missing_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {fitResult.missing_skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#FFFBEB] text-[#78350F] border border-[#FCD34D] flex items-center gap-1 font-mono"
                        >
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#008855] font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Great job! You match all listed requirements.
                    </p>
                  )}
                </div>
              </div>

              {/* Skill-Gap Curated Learning Recommendations (Phase 3.1) */}
              {fitResult.missing_skills.length > 0 && (
                <SkillGapRecommendations missingSkills={fitResult.missing_skills} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
