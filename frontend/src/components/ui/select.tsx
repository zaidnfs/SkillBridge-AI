import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  leadingIcon?: React.ReactNode;
  wrapperClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, leadingIcon, children, ...props }, ref) => {
    return (
      <div className={cn('relative inline-flex items-center', wrapperClassName)}>
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-white/90">
            {leadingIcon}
          </span>
        )}
        <select
          ref={ref}
          className={cn(
            'h-10 appearance-none rounded-lg border border-[#007347] bg-[#008855] text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#007347] focus:outline-none focus:ring-2 focus:ring-[#00A264] focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer pr-8 [&>option]:bg-white [&>option]:text-[#0A1A12] [&>option]:font-normal',
            leadingIcon ? 'pl-8' : 'pl-3',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-white/90"
        />
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };

