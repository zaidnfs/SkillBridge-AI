import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 4,
  className = '',
}) => {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent font-semibold ${
        disabled ? '' : 'animate-gradient'
      } ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(120deg, rgba(255, 255, 255, 0.4) 20%, rgba(76, 214, 129, 1) 50%, rgba(255, 255, 255, 0.4) 80%)',
        backgroundSize: '200% 100%',
        animationDuration: `${speed}s`,
      }}
    >
      {text}
    </span>
  );
};
