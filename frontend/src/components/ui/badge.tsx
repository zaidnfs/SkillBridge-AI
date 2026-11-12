import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary border border-primary/20',
        secondary:
          'bg-secondary/10 text-secondary border border-secondary/20',
        success:
          'bg-success/10 text-success border border-success/30 font-semibold',
        warning:
          'bg-warning/10 text-warning border border-warning/30 font-semibold',
        danger:
          'bg-danger/10 text-danger border border-danger/30 font-semibold',
        info:
          'bg-info/10 text-info border border-info/30',
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/20',
        outline:
          'text-foreground border border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
