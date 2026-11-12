import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | 'ellipsis-left' | 'ellipsis-right'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [1];

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push('ellipsis-left');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis-right');
  }

  pages.push(totalPages);
  return pages;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48],
  itemLabel = 'listings',
}) => {
  if (totalCount === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-[#E2E8E5] bg-white px-4 py-3 shadow-xs"
    >
      {/* Left summary + page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569]">
        <span className="font-mono">
          Showing <strong className="text-[#0A1A12]">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-[#0A1A12]">{totalCount}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5 text-xs text-[#475569]">
            <span className="sr-only sm:not-sr-only">Per page:</span>
            <Select
              aria-label="Results per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 text-xs font-mono"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      {/* Right page controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="h-8 px-2.5 rounded-lg border border-[#E2E8E5] bg-white text-xs font-medium text-[#0A1A12] hover:bg-[#EEF7F1] hover:border-[#00A264]/40 disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A264]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="hidden sm:flex items-center gap-1">
            {visiblePages.map((item) => {
              if (item === 'ellipsis-left' || item === 'ellipsis-right') {
                return (
                  <span
                    key={item}
                    className="h-8 w-7 inline-flex items-center justify-center text-xs font-mono text-neutral-400 select-none"
                  >
                    ...
                  </span>
                );
              }

              const isActive = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'h-8 min-w-8 px-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A264]',
                    isActive
                      ? 'bg-[#008855] text-white shadow-xs'
                      : 'bg-white border border-[#E2E8E5] text-[#0A1A12] hover:bg-[#EEF7F1] hover:border-[#00A264]/40'
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Mobile compact indicator */}
          <span className="sm:hidden px-2.5 text-xs font-mono font-semibold text-[#0A1A12]">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="h-8 px-2.5 rounded-lg border border-[#E2E8E5] bg-white text-xs font-medium text-[#0A1A12] hover:bg-[#EEF7F1] hover:border-[#00A264]/40 disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A264]"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </nav>
  );
};

