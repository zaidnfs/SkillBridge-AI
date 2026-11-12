import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  colors = ['#004D2F', '#008855', '#00A264', '#4CD681', '#008855'],
  animationSpeed = 6,
  showBorder = false,
}) => {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
    animationDuration: `${animationSpeed}s`,
  };

  return (
    <span className={`relative inline-flex max-w-fit flex-row items-center justify-center font-bold ${className}`}>
      {showBorder && (
        <span
          className="absolute inset-0 block h-full w-full animate-gradient bg-cover bg-[length:300%_100%] rounded-lg p-[1px] opacity-70"
          style={gradientStyle}
        >
          <span className="block h-full w-full rounded-lg bg-white dark:bg-[#060B08]" />
        </span>
      )}
      <span
        className="relative z-10 inline-block bg-cover bg-[length:300%_100%] bg-clip-text text-transparent animate-gradient"
        style={gradientStyle}
      >
        {children}
      </span>
    </span>
  );
};
