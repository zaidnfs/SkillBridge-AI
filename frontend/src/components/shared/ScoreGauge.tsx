import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number; // 0 - 100
  size?: number; // width/height in px (default 120)
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 130,
  strokeWidth = 10,
  showLabel = true,
  className,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate count-up over 800ms
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = score / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Determine color and category label based on thresholds
  let strokeColor = '#EF4444'; // Low match (<40)
  let categoryLabel = 'Low Match';
  let badgeStyle = 'bg-red-50 text-red-700 border-red-200';

  if (score >= 80) {
    strokeColor = '#008855'; // Excellent match (>=80) - Jade Emerald
    categoryLabel = 'Excellent Match';
    badgeStyle = 'bg-[#EEF7F1] text-[#004D2F] border-[#D6E8DD]';
  } else if (score >= 60) {
    strokeColor = '#0284C7'; // Good match (60-79) - Cyan/Teal
    categoryLabel = 'Good Match';
    badgeStyle = 'bg-sky-50 text-sky-800 border-sky-200';
  } else if (score >= 40) {
    strokeColor = '#D97706'; // Partial match (40-59) - Amber
    categoryLabel = 'Partial Match';
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated score stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Centered score number */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight text-[#0A1A12] font-mono">
            {animatedScore}
          </span>
          <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
            Fit Score
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className={cn(
            'mt-3 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border',
            badgeStyle
          )}
        >
          {categoryLabel}
        </span>
      )}
    </div>
  );
};
