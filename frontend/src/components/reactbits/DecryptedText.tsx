import React, { useEffect, useState, useRef, useCallback } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  parentClassName?: string;
  animateOn?: 'view' | 'hover' | 'mount';
  triggerKey?: number | string;
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 40,
  maxIterations = 10,
  sequential = true,
  characters = DEFAULT_CHARS,
  className = '',
  encryptedClassName = 'opacity-65 font-mono',
  parentClassName = '',
  animateOn = 'mount',
  triggerKey,
}) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isScrambling, setIsScrambling] = useState<boolean>(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLSpanElement>(null);

  const startAnimation = useCallback(() => {
    let iteration = 0;
    const len = text.length;
    const revealed = new Set<number>();
    setIsScrambling(true);

    const interval = setInterval(() => {
      iteration++;

      if (sequential) {
        // Sequentially reveal characters from start to end
        const charsToReveal = Math.floor((iteration / maxIterations) * len);
        for (let i = 0; i <= charsToReveal && i < len; i++) {
          revealed.add(i);
        }
      } else {
        // Random reveals
        for (let i = 0; i < len; i++) {
          if (Math.random() < iteration / maxIterations) {
            revealed.add(i);
          }
        }
      }

      setRevealedIndices(new Set(revealed));

      const scrambled = text
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' ';
          if (revealed.has(index)) return char;
          const randomIndex = Math.floor(Math.random() * characters.length);
          return characters[randomIndex];
        })
        .join('');

      setDisplayText(scrambled);

      if (revealed.size >= len || iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(text);
        setIsScrambling(false);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, maxIterations, sequential, characters]);

  useEffect(() => {
    if (animateOn === 'mount' || triggerKey !== undefined) {
      const cleanup = startAnimation();
      return cleanup;
    }
  }, [animateOn, triggerKey, startAnimation]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' && !isScrambling) {
      setIsHovering(true);
      startAnimation();
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-block ${parentClassName}`}
    >
      {displayText.split('').map((char, i) => {
        const isRevealed = revealedIndices.has(i) || !isScrambling;
        return (
          <span
            key={i}
            className={isRevealed ? className : encryptedClassName}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
};
