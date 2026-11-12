import React from 'react';
import { IconProps } from './Reicon';

// Koboyo Icons (koboyo.com/icons) - Hand-drawn organic SVG icons

export const KoboyoSparkle: React.FC<IconProps> = ({
  size = 20,
  strokeWidth = 1.75,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 2.5C12.4 7.2 16.5 11.2 21.5 12C16.8 12.6 12.5 16.6 12 21.5C11.4 16.8 7.3 12.5 2.5 12C7.2 11.4 11.5 7.3 12 2.5Z" />
  </svg>
);

export const KoboyoBrain: React.FC<IconProps> = ({
  size = 20,
  strokeWidth = 1.75,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9.5 4.5C7.2 4.5 5.5 6.2 5.5 8.5C4.2 9.2 3.5 10.6 3.5 12.2C3.5 13.9 4.4 15.3 5.8 16C5.9 18 7.5 19.5 9.5 19.5C10.5 19.5 11.4 19.1 12 18.5C12.6 19.1 13.5 19.5 14.5 19.5C16.5 19.5 18.1 18 18.2 16C19.6 15.3 20.5 13.9 20.5 12.2C20.5 10.6 19.8 9.2 18.5 8.5C18.5 6.2 16.8 4.5 14.5 4.5C13.5 4.5 12.6 4.9 12 5.5C11.4 4.9 10.5 4.5 9.5 4.5Z" />
    <path d="M12 6V18" />
    <path d="M8.5 9.5C9.5 10.5 9.5 11.5 8.5 12.5" />
    <path d="M15.5 9.5C14.5 10.5 14.5 11.5 15.5 12.5" />
  </svg>
);

export const KoboyoTarget: React.FC<IconProps> = ({
  size = 20,
  strokeWidth = 1.75,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9.2" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
  </svg>
);

export const KoboyoBadge: React.FC<IconProps> = ({
  size = 20,
  strokeWidth = 1.75,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="9" r="6.5" />
    <path d="M8.5 14.5L7 21.5L12 18.5L17 21.5L15.5 14.5" />
  </svg>
);

export const KoboyoCheck: React.FC<IconProps> = ({
  size = 20,
  strokeWidth = 2,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4.5 12.8L9.2 17.5L19.5 6.8" />
  </svg>
);

export const KoboyoPerson: React.FC<IconProps> = ({
  size = 24,
  strokeWidth = 1.75,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Head */}
    <circle cx="12" cy="7.2" r="4.2" />
    {/* Torso & Shoulders with organic soft curve */}
    <path d="M4.8 20.5C4.8 16.3 8 13.2 12 13.2C16 13.2 19.2 16.3 19.2 20.5" />
    {/* Subtle collar touch */}
    <path d="M10 13.5L12 16L14 13.5" />
  </svg>
);

export const KoboyoStudent: React.FC<IconProps> = ({
  size = 64,
  strokeWidth = 1.5,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Ambient aura ring */}
    <circle cx="32" cy="32" r="30" strokeOpacity="0.15" strokeDasharray="3 3" />
    {/* Student Head */}
    <circle cx="32" cy="22" r="10" />
    {/* Face friendly eyes & smile */}
    <circle cx="28.5" cy="21" r="1.2" fill="currentColor" />
    <circle cx="35.5" cy="21" r="1.2" fill="currentColor" />
    <path d="M29.5 25.5C30.5 27 33.5 27 34.5 25.5" />
    {/* Shoulders / Upper Body */}
    <path d="M14 52C14 41.5 22 36 32 36C42 36 50 41.5 50 52" />
    {/* Modern Hoodie / Collar line */}
    <path d="M26 36.8L32 44L38 36.8" />
    {/* Sparkle star near head */}
    <path d="M47 13C47.3 15 48.8 16.5 51 17C48.8 17.5 47.3 19 47 21C46.7 19 45.2 17.5 43 17C45.2 16.5 46.7 15 47 13Z" fill="currentColor" fillOpacity="0.8" />
  </svg>
);

export const KoboyoEditorialPerson: React.FC<IconProps> = ({
  size = 80,
  strokeWidth = 1.5,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Minimalist Head */}
    <circle cx="40" cy="24" r="11" />
    {/* Torso & Shoulders */}
    <path d="M21 62C21 48 30 42 40 42C50 42 59 48 59 62" />
    {/* Minimalist Work folio / Notebook line */}
    <path d="M31 62V51H49V62" />
    {/* Hand-drawn organic spark accent */}
    <path d="M58 17L59.5 21L63.5 22.5L59.5 24L58 28L56.5 24L52.5 22.5L56.5 21Z" fill="currentColor" fillOpacity="0.6" />
  </svg>
);


