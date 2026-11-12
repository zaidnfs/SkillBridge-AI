import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { JobPosting } from '@/types/jobs';
import { jobService } from '@/services/jobService';
import { JobDetailModal } from '@/components/jobs/JobDetailModal';
import { formatInrLpaHint, formatSalaryRange } from '@/lib/jobFormatters';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  MapPin,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

const CITIES = ['All Cities', 'Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi', 'Chennai', 'Gurgaon', 'Noida'];

const ROLE_CHIPS = [
  'All Roles',
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'DevOps Engineer',
  'Software Engineer',
];

const QUICK_CUSTOM_SKILLS = ['Python', 'Django', 'React', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'Kubernetes'];

interface TargetJobPickerProps {
  selectedJob: JobPosting | null;
  onSelectJob: (job: JobPosting) => void;
  resumeSkills: string[];
  mode: 'listing' | 'custom';
  onModeChange: (mode: 'listing' | 'custom') => void;
  customRoleTitle: string;
  onCustomRoleTitleChange: (title: string) => void;
  customSkills: string[];
  onCustomSkillsChange: (skills: string[]) => void;
  initiallyExpanded?: boolean;
}

function computeSkillOverlap(resumeSkills: string[], jobSkills: string[]) {
  const normalizedResume = new Set(resumeSkills.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jobSkills) {
    if (normalizedResume.has(skill.trim().toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return { matched, missing };
}

export const TargetJobPicker: React.FC<TargetJobPickerProps> = ({
  selectedJob,
  onSelectJob,
  resumeSkills,
  mode,
  onModeChange,
  customRoleTitle,
  onCustomRoleTitleChange,
  customSkills,
  onCustomSkillsChange,
  initiallyExpanded = true,
}) => {
  const [isBrowserOpen, setIsBrowserOpen] = useState(initiallyExpanded);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [isRemoteOnly, setIsRemoteOnly] = useState(false);

  // Paginated results state
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Custom skill input
  const [skillDraft, setSkillDraft] = useState('');

  const pageSize = 6;

  const fetchCandidateJobs = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await jobService.getJobsPaginated({
        q: searchQuery || undefined,
        city: selectedCity !== 'All Cities' ? selectedCity : undefined,
        category: selectedRole !== 'All Roles' ? selectedRole : undefined,
        remote: isRemoteOnly || undefined,
        page,
        page_size: pageSize,
      });
      setJobs(response.results);
      setTotalCount(response.count);
      setTotalPages(response.total_pages ?? Math.max(1, Math.ceil(response.count / pageSize)));
    } catch (err: any) {
      setFetchError(err.response?.data?.detail || 'Unable to search job listings.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCity, selectedRole, isRemoteOnly, page]);

  useEffect(() => {
    if (mode !== 'listing' || !isBrowserOpen) return;
    const timer = setTimeout(() => {
      fetchCandidateJobs();
    }, 250);
    return () => clearTimeout(timer);
  }, [mode, isBrowserOpen, fetchCandidateJobs]);

  const selectedOverlap = useMemo(() => {
    if (!selectedJob) return { matched: [], missing: [] };
    return computeSkillOverlap(resumeSkills, selectedJob.extracted_skills || []);
  }, [resumeSkills, selectedJob]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('All Cities');
    setSelectedRole('All Roles');
    setIsRemoteOnly(false);
    setPage(1);
  };

  const hasFilters =
    searchQuery !== '' ||
    selectedCity !== 'All Cities' ||
    selectedRole !== 'All Roles' ||
    isRemoteOnly;

  const handleAddCustomSkills = (rawInput: string) => {
    const incoming = rawInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;

    const existingLower = new Set(customSkills.map((s) => s.toLowerCase()));
    const next = [...customSkills];
    for (const skill of incoming) {
      if (!existingLower.has(skill.toLowerCase())) {
        next.push(skill);
        existingLower.add(skill.toLowerCase());
      }
    }
    onCustomSkillsChange(next);
    setSkillDraft('');
  };

  const handleRemoveCustomSkill = (skillToRemove: string) => {
    onCustomSkillsChange(customSkills.filter((s) => s !== skillToRemove));
  };

  return (
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-[#E2E8E5] bg-[#F8FAF8] p-1 self-start">
          <button
            type="button"
            onClick={() => onModeChange('listing')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              mode === 'listing'
                ? 'bg-white text-[#004D2F] shadow-xs border border-[#D6E8DD]'
                : 'text-[#475569] hover:text-[#0A1A12]'
            )}
          >
            <Briefcase className="h-3.5 w-3.5 text-[#008855]" />
            <span>Pick from Job Market</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('custom')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              mode === 'custom'
                ? 'bg-white text-[#004D2F] shadow-xs border border-[#D6E8DD]'
                : 'text-[#475569] hover:text-[#0A1A12]'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#008855]" />
            <span>Custom Role &amp; Skills</span>
          </button>
        </div>

        {mode === 'listing' && (
          <button
            type="button"
            onClick={() => setIsBrowserOpen((prev) => !prev)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#008855] border border-[#007347] hover:bg-[#007347] transition-colors cursor-pointer shadow-xs"
          >
            <Search className="h-3.5 w-3.5 text-white" />
            <span>{isBrowserOpen ? 'Hide Job Search' : 'Browse & Search Jobs'}</span>
            {isBrowserOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {mode === 'listing' ? (
        <div className="space-y-4">
          {/* Selected Target Job Summary Card */}
          {selectedJob ? (
            <div className="rounded-xl border border-[#00A264]/45 bg-[#F2FAF5] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#008855] text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      Target Selected
                    </span>
                    {selectedJob.extracted_role && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-white text-[#004D2F] border border-[#D6E8DD]">
                        {selectedJob.extracted_role}
                      </span>
                    )}
                    {selectedJob.is_remote && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-white text-[#004D2F] border border-[#D6E8DD]">
                        Remote
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#0A1A12] leading-snug">
                    {selectedJob.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#475569]">
                    <span className="flex items-center gap-1 font-semibold text-[#0F291B]">
                      <Building2 className="h-3.5 w-3.5 text-[#008855]" />
                      {selectedJob.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      {selectedJob.location_city || 'India'}
                    </span>
                    {(selectedJob.salary_min || selectedJob.salary_max) && (
                      <span className="font-mono font-semibold text-[#004D2F]">
                        {formatInrLpaHint(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency) ||
                          formatSalaryRange(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDetailOpen(true)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-[#004D2F] bg-white border border-[#D6E8DD] hover:bg-[#EEF7F1] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#008855]" />
                    <span>Inspect Job</span>
                  </button>
                </div>
              </div>

              {/* Instant Skill Overlap Preview */}
              {(selectedJob.extracted_skills?.length || 0) > 0 && (
                <div className="pt-2.5 border-t border-[#D6E8DD] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-[#004D2F] font-semibold">
                      Quick Skill Preview: {selectedOverlap.matched.length} of{' '}
                      {selectedJob.extracted_skills.length} job skills detected in your resume
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOverlap.matched.map((skill) => (
                      <span
                        key={`match-${skill}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-white text-[#004D2F] border border-[#00A264]/40"
                      >
                        <Check className="h-3 w-3 text-[#008855]" />
                        {skill}
                      </span>
                    ))}
                    {selectedOverlap.missing.slice(0, 6).map((skill) => (
                      <span
                        key={`miss-${skill}`}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#FFFBEB] text-[#78350F] border border-[#FCD34D]"
                      >
                        {skill}
                      </span>
                    ))}
                    {selectedOverlap.missing.length > 6 && (
                      <span className="text-[11px] font-mono text-[#475569] self-center">
                        +{selectedOverlap.missing.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#D6E8DD] bg-[#F8FAF8] p-4 text-xs text-[#475569]">
              Search and select a target job below to preview skill alignment and run ATS analysis.
            </div>
          )}

          {/* Expandable Searchable Job Browser */}
          {isBrowserOpen && (
            <div className="rounded-xl border border-[#E2E8E5] bg-[#F8FAF8] p-4 space-y-3.5">
              {/* Search + City + Remote Controls */}
              <div className="flex flex-col md:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    aria-label="Search target job postings"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by job title, company, role, or keyword (e.g. Python, React, Pune)..."
                    className="w-full h-10 pl-9 pr-8 rounded-lg text-sm border border-[#E2E8E5] bg-white text-[#0A1A12] placeholder:text-neutral-400 focus:outline-none focus:border-[#008855] focus:ring-2 focus:ring-[#00A264]/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setPage(1);
                      }}
                      aria-label="Clear search query"
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    aria-label="Filter target jobs by city"
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      setPage(1);
                    }}
                    leadingIcon={<MapPin className="h-3.5 w-3.5" />}
                    className="h-10 text-xs"
                  >
                    {CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </Select>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRemoteOnly((prev) => !prev);
                      setPage(1);
                    }}
                    aria-pressed={isRemoteOnly}
                    className={cn(
                      'h-10 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                      isRemoteOnly
                        ? 'bg-[#008855] text-white'
                        : 'bg-white border border-[#E2E8E5] text-[#0A1A12] hover:bg-[#EEF7F1]'
                    )}
                  >
                    Remote Only
                  </button>

                  {hasFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="h-10 px-2.5 rounded-lg text-xs text-[#475569] hover:text-[#0A1A12] hover:bg-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Role Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {ROLE_CHIPS.map((role) => {
                  const active = selectedRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role);
                        setPage(1);
                      }}
                      className={cn(
                        'shrink-0 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer',
                        active
                          ? 'bg-[#004D2F] text-white'
                          : 'bg-white border border-[#E2E8E5] text-[#475569] hover:text-[#004D2F] hover:border-[#00A264]/40'
                      )}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>

              {/* Results Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-24 rounded-xl border border-[#E2E8E5] bg-white animate-pulse p-3.5"
                    />
                  ))}
                </div>
              ) : fetchError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between gap-2">
                  <span>{fetchError}</span>
                  <button
                    type="button"
                    onClick={fetchCandidateJobs}
                    className="font-semibold underline cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-xl border border-[#E2E8E5] bg-white p-6 text-center space-y-2">
                  <p className="text-sm font-semibold text-[#0A1A12]">No matching jobs found</p>
                  <p className="text-xs text-[#475569]">
                    Try a different keyword, city, or clear active filters.
                  </p>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-1 h-8 px-3 rounded-lg text-xs font-semibold text-[#004D2F] bg-[#EEF7F1] border border-[#D6E8DD] hover:bg-[#E2F2E8] cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {jobs.map((job) => {
                    const isSelected = selectedJob?.id === job.id;
                    const jobSkills = job.extracted_skills || [];
                    const overlap = computeSkillOverlap(resumeSkills, jobSkills);
                    const compactSalary =
                      formatInrLpaHint(job.salary_min, job.salary_max, job.currency) ||
                      formatSalaryRange(job.salary_min, job.salary_max, job.currency);

                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => {
                          onSelectJob(job);
                          setIsBrowserOpen(false);
                        }}
                        className={cn(
                          'text-left rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#00A264]',
                          isSelected
                            ? 'bg-[#EEF7F1] border-[#008855] shadow-xs'
                            : 'bg-white border-[#E2E8E5] hover:border-[#008855]/45 hover:shadow-xs'
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-[#0A1A12] line-clamp-1">
                              {job.title}
                            </span>
                            {jobSkills.length > 0 && (
                              <span
                                className={cn(
                                  'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border',
                                  overlap.matched.length > 0
                                    ? 'bg-[#EEF7F1] text-[#004D2F] border-[#D6E8DD]'
                                    : 'bg-[#F8FAF8] text-[#475569] border-[#E2E8E5]'
                                )}
                              >
                                {overlap.matched.length}/{jobSkills.length} match
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#475569]">
                            <span className="font-medium text-[#0F291B] truncate max-w-[160px]">
                              {job.company}
                            </span>
                            <span>•</span>
                            <span>{job.location_city || 'India'}</span>
                            {job.is_remote && (
                              <>
                                <span>•</span>
                                <span className="text-[#008855] font-semibold">Remote</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                          <div className="flex flex-wrap gap-1 min-w-0">
                            {jobSkills.slice(0, 3).map((sk) => (
                              <span
                                key={sk}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[#F8FAF8] border border-[#E2E8E5] text-[#1C3829] font-mono"
                              >
                                {sk}
                              </span>
                            ))}
                            {jobSkills.length > 3 && (
                              <span className="text-[10px] font-mono text-neutral-400 self-center">
                                +{jobSkills.length - 3}
                              </span>
                            )}
                          </div>

                          {compactSalary && (
                            <span className="shrink-0 text-[10px] font-mono font-semibold text-[#004D2F]">
                              {compactSalary}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Compact Pagination Bar inside Picker */}
              {totalCount > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8E5] text-xs text-[#475569]">
                  <span className="font-mono">
                    {totalCount} jobs found · Page {page} of {totalPages}
                  </span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || isLoading}
                        className="h-8 px-2.5 rounded-lg border border-[#E2E8E5] bg-white text-xs font-medium text-[#0A1A12] hover:bg-[#EEF7F1] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Prev</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || isLoading}
                        className="h-8 px-2.5 rounded-lg border border-[#E2E8E5] bg-white text-xs font-medium text-[#0A1A12] hover:bg-[#EEF7F1] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Custom Role & Required Skills Mode */
        <div className="rounded-xl border border-[#E2E8E5] bg-[#F8FAF8] p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="custom-role-title"
                className="text-xs font-semibold text-[#0A1A12] block"
              >
                Target Role Title
              </label>
              <input
                id="custom-role-title"
                type="text"
                value={customRoleTitle}
                onChange={(e) => onCustomRoleTitleChange(e.target.value)}
                placeholder="e.g. Python Backend Engineer"
                className="w-full h-10 px-3 rounded-lg text-sm border border-[#E2E8E5] bg-white text-[#0A1A12] focus:outline-none focus:border-[#008855] focus:ring-2 focus:ring-[#00A264]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="custom-skill-input"
                className="text-xs font-semibold text-[#0A1A12] block"
              >
                Add Required Skills (comma-separated or Enter)
              </label>
              <div className="flex gap-2">
                <input
                  id="custom-skill-input"
                  type="text"
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSkills(skillDraft);
                    }
                  }}
                  placeholder="e.g. FastAPI, Docker, Redis"
                  className="flex-1 h-10 px-3 rounded-lg text-sm border border-[#E2E8E5] bg-white text-[#0A1A12] focus:outline-none focus:border-[#008855] focus:ring-2 focus:ring-[#00A264]/20"
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomSkills(skillDraft)}
                  className="h-10 px-3 rounded-lg text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick-add popular skill chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#475569] mr-1">Quick add:</span>
            {QUICK_CUSTOM_SKILLS.map((skill) => {
              const added = customSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
              return (
                <button
                  key={skill}
                  type="button"
                  disabled={added}
                  onClick={() => handleAddCustomSkills(skill)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-[#E2E8E5] text-[#004D2F] hover:bg-[#EEF7F1] disabled:opacity-40 cursor-pointer"
                >
                  + {skill}
                </button>
              );
            })}
          </div>

          {/* Active Custom Skills */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-[#475569]">
              Target Skills ({customSkills.length})
            </span>
            {customSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {customSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomSkill(skill)}
                      aria-label={`Remove ${skill}`}
                      className="text-[#004D2F]/70 hover:text-[#004D2F] cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#475569] italic">
                Add at least one required skill above to compare against your resume.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Inspect Full Job Modal without leaving the Resume Analyzer */}
      <JobDetailModal
        job={selectedJob}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};

