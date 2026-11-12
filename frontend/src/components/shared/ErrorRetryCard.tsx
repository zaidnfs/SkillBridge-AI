import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorRetryCardProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export const ErrorRetryCard: React.FC<ErrorRetryCardProps> = ({
  message = 'An unexpected error occurred while loading this data.',
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center flex flex-col items-center justify-center space-y-3 ${className || ''}`}
    >
      <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-semibold text-foreground text-sm">Failed to load content</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
};
