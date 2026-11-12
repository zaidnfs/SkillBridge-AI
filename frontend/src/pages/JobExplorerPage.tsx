import React, { useEffect, useState, useCallback, useRef } from 'react';
import { jobService } from '@/services/jobService';
import { JobPosting, JobSortOption } from '@/types/jobs';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailModal } from '@/components/jobs/JobDetailModal';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorRetryCard } from '@/components/shared/ErrorRetryCard';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';
import { AILoadingState } from '@/components/shared/AILoadingState';
import { ReiconRadar } from '@/components/icons/Reicon';
import { Select } from '@/components/ui/select';
import { Search, Briefcase, RefreshCw, X, ArrowUpDown, MapPin } from 'lucide-react';

const CITIES = ['All Cities', 'Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi', 'Chennai', 'Gurgaon', 'Noida'];

const SORT_OPTIONS: Array<{ value: JobSortOption; label: string }> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'salary_high', label: 'Highest Salary' },
  { value: 'salary_low', label: 'Lowest Salary' },
];

export const JobExplorerPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [isRemoteOnly, setIsRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<JobSortOption>('newest');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected job for modal
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const feedTopRef = useRef<HTMLDivElement | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await jobService.getJobsPaginated({
        q: searchQuery || undefined,
        city: selectedCity !== 'All Cities' ? selectedCity : undefined,
        remote: isRemoteOnly || undefined,
        sort: sortBy,
        page: currentPage,
        page_size: pageSize,
      });
      setJobs(data.results);
      setTotalCount(data.count);
      setTotalPages(data.total_pages ?? Math.max(1, Math.ceil(data.count / pageSize)));
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to load job listings. Please verify that the backend API is running.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCity, isRemoteOnly, sortBy, currentPage, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchJobs]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setCurrentPage(1);
  };

  const handleToggleRemote = () => {
    setIsRemoteOnly((prev) => !prev);
    setCurrentPage(1);
  };

  const handleSortChange = (nextSort: JobSortOption) => {
    setSortBy(nextSort);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setCurrentPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
    setCurrentPage(nextPage);
    feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenModal = (job: JobPosting) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCity('All Cities');
    setIsRemoteOnly(false);
    setSortBy('newest');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' || selectedCity !== 'All Cities' || isRemoteOnly || sortBy !== 'newest';

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-6" ref={feedTopRef}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD] font-mono mb-2">
            <ReiconRadar size={13} strokeWidth={2} />
            <span>Market Feed</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0A1A12]">
            Job Explorer
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Browse and filter live placement opportunities with spaCy-extracted requirements
          </p>
        </div>

        <button
          type="button"
          onClick={fetchJobs}
          disabled={isLoading}
          className="self-start sm:self-auto h-9 px-4 rounded-lg text-xs font-semibold text-[#004D2F] bg-white border border-[#E2E8E5] hover:bg-[#EEF7F1] hover:border-[#00A264]/40 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <AIThinkingOrb state="searching" size={18} color="#008855" />
              <span>Querying...</span>
            </div>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 text-[#008855]" />
              <span>Refresh Listings</span>
            </>
          )}
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl border border-[#E2E8E5] bg-white shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              aria-label="Search jobs by title, company, skills, or role"
              placeholder="Search by title, company, skills, or role..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg text-sm border border-[#E2E8E5] bg-[#F8FAF8] text-[#0A1A12] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-[#008855] focus:ring-2 focus:ring-[#00A264]/20 transition-all shadow-xs"
            />
          </div>

          {/* City, Sort & Remote Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Filter by city"
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              leadingIcon={<MapPin className="h-3.5 w-3.5" />}
              className="h-11 text-xs"
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Sort job listings"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as JobSortOption)}
              leadingIcon={<ArrowUpDown className="h-3.5 w-3.5" />}
              className="h-11 text-xs"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            {/* Remote Filter Toggle */}
            <button
              type="button"
              onClick={handleToggleRemote}
              aria-pressed={isRemoteOnly}
              className={`h-11 px-4 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs ${
                isRemoteOnly
                  ? 'bg-[#008855] text-white'
                  : 'bg-white border border-[#E2E8E5] text-[#0A1A12] hover:bg-[#EEF7F1]'
              }`}
            >
              Remote Only
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-11 px-3 rounded-lg text-xs font-medium text-[#475569] hover:text-[#0A1A12] hover:bg-neutral-50 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Count Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569] pt-2.5 border-t border-neutral-100 font-mono">
          <span>
            {totalCount > 0 ? (
              <>
                Showing <strong className="text-[#0A1A12] font-bold">{startIndex}–{endIndex}</strong> of{' '}
                <strong className="text-[#0A1A12] font-bold">{totalCount}</strong> available job listings
                {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}
              </>
            ) : (
              <>
                Showing <strong className="text-[#0A1A12] font-bold">0</strong> job listings
              </>
            )}
          </span>
          {hasActiveFilters && (
            <span className="text-[#008855] font-semibold">Filters Active</span>
          )}
        </div>
      </div>

      {/* Content Feed */}
      {isLoading ? (
        <AILoadingState
          state="searching"
          size="md"
          title="Querying Live Job Market & Knowledge Graph"
          description="Fetching verified placement roles, filtering location preferences, and matching skill requirements..."
          card={true}
        />
      ) : error ? (
        <ErrorRetryCard message={error} onRetry={fetchJobs} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job listings found"
          description="We couldn't find any job postings matching your current search or filter criteria. Try adjusting your search query or clearing filters."
          actionLabel={hasActiveFilters ? 'Clear All Filters' : undefined}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onSelect={handleOpenModal} />
            ))}
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="job listings"
          />
        </div>
      )}

      {/* Rich Job Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
