import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 36, className }) => {
  const uid = React.useId().replace(/:/g, '');
  const bgId = `sb-bg-${uid}`;
  const arcId = `sb-arc-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={bgId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#005F3B" />
          <stop offset="100%" stopColor="#003822" />
        </linearGradient>
        <linearGradient id={arcId} x1="14" y1="42" x2="50" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4CD681" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#4CD681" />
        </linearGradient>
      </defs>

      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill={`url(#${bgId})`}
        stroke="#00A264"
        strokeWidth="2.5"
      />
      <path
        d="M16 43H48"
        stroke="#4CD681"
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M16 43C21 24 43 24 48 43"
        stroke={`url(#${arcId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="43" r="5" fill="#4CD681" stroke="#003822" strokeWidth="1.5" />
      <circle cx="48" cy="43" r="5" fill="#4CD681" stroke="#003822" strokeWidth="1.5" />
      <path
        d="M32 12L34.4 18.6L41 21L34.4 23.4L32 30L29.6 23.4L23 21L29.6 18.6L32 12Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};

