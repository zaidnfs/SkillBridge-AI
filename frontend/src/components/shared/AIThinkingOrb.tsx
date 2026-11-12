import React from 'react';
import { ThinkingOrb, type OrbState, type OrbSize, type ThinkingOrbProps } from 'thinking-orbs';
import { cn } from '@/lib/utils';

export type { OrbState, OrbSize, ThinkingOrbProps };

export type AIThinkingOrbNamedSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type AIThinkingOrbSize = OrbSize | AIThinkingOrbNamedSize | number;

export interface AIThinkingOrbProps {
  /**
   * Shipped semantic animation state:
   * - 'working'    - particles on tilted orbits (general AI processing)
   * - 'searching'  - scan meridian sweeps dotted globe (retrieval / parsing)
   * - 'solving'    - bands scramble in quarter turns (evaluation / scoring)
   * - 'listening'  - rolling waveform through rings (audio / speech input)
   * - 'connecting' - constellation wires itself (knowledge graph traversing)
   * - 'weaving'    - three strands plait around sphere (synthesis / code gen)
   * - 'composing'  - undulating multi-band sash (generating text / documents)
   * - 'breathing'  - face-on ring morphing (standby / idle ready)
   * - 'shaping'    - morphing circle -> triangle -> square (ATS structuring)
   */
  state?: OrbState;
  /**
   * Size can be:
   * - Preset px: 64, 32, 20
   * - Named size: 'xs' (20px), 'sm' (32px), 'md' (48px), 'lg' (74px), 'xl' (100px), '2xl' (132px), '3xl' (170px)
   * - Custom number: e.g. 80, 110, 130, 140, 160
   */
  size?: AIThinkingOrbSize;
  /**
   * Additional scale factor (e.g. 1.5, 2.0) applied on top of the chosen size
   */
  scale?: number;
  /** Custom particle ink color, defaults to CarrierGraph brand emerald #008855 */
  color?: string;
  /** Theme mode: auto | light | dark */
  theme?: 'auto' | 'light' | 'dark';
  /** Animation speed multiplier (default 1) */
  speed?: number;
  /** Freeze animation on current frame */
  paused?: boolean;
  /** Radius multiplier for every particle dot (e.g. 1.2, 1.4 for bolder visibility) */
  dotSize?: number;
  /** Particle density multiplier (default 1) */
  dots?: number;
  /** Render vibrant ambient radial glow and subtle pulse halo behind the orb (default true) */
  glow?: boolean;
  /** Primary label displayed below or alongside the orb */
  label?: React.ReactNode;
  /** Secondary contextual hint or status subtitle */
  sublabel?: React.ReactNode;
  /** Display inside an elevated, glassmorphism card */
  card?: boolean;
  /** Inline layout: places orb and label horizontally */
  inline?: boolean;
  /** Additional wrapper CSS classes */
  className?: string;
  'aria-label'?: string;
}

function resolveOrbDimensions(
  sizeProp: AIThinkingOrbSize | undefined,
  scaleProp: number | undefined
): {
  baseSize: OrbSize;
  computedScale: number;
  finalPx: number;
} {
  const userScale = typeof scaleProp === 'number' && scaleProp > 0 ? scaleProp : 1;

  if (typeof sizeProp === 'string') {
    switch (sizeProp) {
      case 'xs':
        return { baseSize: 20, computedScale: 1 * userScale, finalPx: Math.round(20 * userScale) };
      case 'sm':
        return { baseSize: 32, computedScale: 1 * userScale, finalPx: Math.round(32 * userScale) };
      case 'md':
        return { baseSize: 32, computedScale: 1.5 * userScale, finalPx: Math.round(48 * userScale) };
      case 'lg':
        return { baseSize: 64, computedScale: 1.15 * userScale, finalPx: Math.round(74 * userScale) };
      case 'xl':
        return { baseSize: 64, computedScale: 1.55 * userScale, finalPx: Math.round(100 * userScale) };
      case '2xl':
        return { baseSize: 64, computedScale: 2.05 * userScale, finalPx: Math.round(132 * userScale) };
      case '3xl':
        return { baseSize: 64, computedScale: 2.65 * userScale, finalPx: Math.round(170 * userScale) };
      default:
        return { baseSize: 64, computedScale: 1.15 * userScale, finalPx: Math.round(74 * userScale) };
    }
  }

  const rawSize = typeof sizeProp === 'number' ? sizeProp : 64;

  if (rawSize <= 24) {
    const scale = (rawSize / 20) * userScale;
    return { baseSize: 20, computedScale: scale, finalPx: Math.round(20 * scale) };
  }
  if (rawSize <= 48) {
    const scale = (rawSize / 32) * userScale;
    return { baseSize: 32, computedScale: scale, finalPx: Math.round(32 * scale) };
  }

  // rawSize > 48, base preset 64
  const scale = (rawSize / 64) * userScale;
  return { baseSize: 64, computedScale: scale, finalPx: Math.round(64 * scale) };
}

export const AIThinkingOrb: React.FC<AIThinkingOrbProps> = ({
  state = 'working',
  size = 64,
  scale,
  color = '#008855',
  theme = 'auto',
  speed = 1,
  paused = false,
  dotSize,
  dots,
  glow = true,
  label,
  sublabel,
  card = false,
  inline = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const { baseSize, computedScale, finalPx } = resolveOrbDimensions(size, scale);

  // Automatically calibrate dot thickness so scaled orbs are bold and unmistakably visible
  const effectiveDotSize =
    dotSize ?? (computedScale >= 1.8 ? 1.4 : computedScale >= 1.2 ? 1.25 : 1.1);

  const content = (
    <div
      className={cn(
        'flex items-center justify-center transition-all',
        inline ? 'flex-row gap-3 text-left' : 'flex-col gap-3 text-center',
        className
      )}
      role="status"
      aria-label={ariaLabel || (typeof label === 'string' ? label : 'AI processing')}
    >
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: `${finalPx}px`, height: `${finalPx}px` }}
      >
        {/* Vibrant ambient radial glow matching ink color */}
        {glow && (
          <>
            <div
              aria-hidden="true"
              className="absolute rounded-full pointer-events-none transition-all duration-700"
              style={{
                width: `${Math.round(finalPx * 1.55)}px`,
                height: `${Math.round(finalPx * 1.55)}px`,
                background: `radial-gradient(circle, ${color}38 0%, ${color}14 48%, transparent 75%)`,
                filter: 'blur(20px)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute rounded-full pointer-events-none transition-all duration-500 animate-pulse"
              style={{
                width: `${Math.round(finalPx * 1.18)}px`,
                height: `${Math.round(finalPx * 1.18)}px`,
                border: `1px solid ${color}24`,
                background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
                animationDuration: '3.5s',
              }}
            />
          </>
        )}

        {/* Scaled canvas container */}
        <div
          className="flex items-center justify-center origin-center select-none"
          style={{
            width: `${baseSize}px`,
            height: `${baseSize}px`,
            transform: computedScale !== 1 ? `scale(${computedScale})` : undefined,
            transformOrigin: 'center center',
          }}
        >
          <ThinkingOrb
            state={state}
            size={baseSize}
            color={color}
            theme={theme}
            speed={speed}
            paused={paused}
            dotSize={effectiveDotSize}
            dots={dots}
            aria-label={ariaLabel || (typeof label === 'string' ? label : `${state} orb`)}
          />
        </div>
      </div>

      {(label || sublabel) && (
        <div className={cn('space-y-1', inline ? 'min-w-0' : 'max-w-md')}>
          {label && (
            <div className="text-sm font-semibold text-[#0A1A12] tracking-tight">
              {label}
            </div>
          )}
          {sublabel && (
            <div className="text-xs text-neutral-500 font-normal leading-relaxed">
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (card) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#D5E5DC] bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-xs">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#E6F4ED] to-transparent opacity-60 pointer-events-none -mr-10 -mt-10 rounded-full blur-2xl" />
        {content}
      </div>
    );
  }

  return content;
};
