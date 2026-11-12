import React from 'react';
import {
  BotAvatar,
  type BotAvatarType,
  type BotAvatarState,
  type BotAvatarFace,
  type BotAvatarGlasses,
  type BotAvatarHat,
  type BotAvatarShading,
} from 'bot-avatars';
import { cn } from '@/lib/utils';

export type {
  BotAvatarType,
  BotAvatarState,
  BotAvatarFace,
  BotAvatarGlasses,
  BotAvatarHat,
  BotAvatarShading,
};

export interface AIBotAvatarProps {
  /** 18 3D character forms: 'droid' | 'clover' | 'blob' | 'ghost' | 'alien' | 'cat' | 'mech' | etc. */
  type?: BotAvatarType;
  /** Active animation state: 'default' (idle watching) | 'working' (hopping, calculating) | 'sleeping' */
  state?: BotAvatarState;
  /** Living facial feature: 'eyes' (default) | 'mouth' */
  face?: BotAvatarFace;
  /** Avatar dimension in pixels or CSS units (e.g. 40, 48, 64) */
  size?: number | string;
  /** Brand color of the bot, defaults to emerald #008855 */
  color?: string;
  /** Audio interview headphones accessory */
  headphones?: boolean;
  /** Glasses accessory */
  glasses?: BotAvatarGlasses;
  /** Hat accessory */
  hat?: BotAvatarHat;
  /** Surface material: 'fabric' (plush fur) | 'plastic' (glossy 3D) | 'crisp' | 'smooth' */
  shading?: BotAvatarShading;
  /** Interactive mouse follow and click-to-flip */
  interactive?: boolean;
  /** Optional status pill or dot badge */
  statusIndicator?: 'online' | 'speaking' | 'thinking' | 'idle' | 'none';
  /** Extra container classes */
  className?: string;
  style?: React.CSSProperties;
}

export const AIBotAvatar: React.FC<AIBotAvatarProps> = ({
  type = 'droid',
  state = 'default',
  face = 'eyes',
  size = 40,
  color = '#008855',
  headphones = true,
  glasses = 'none',
  hat = 'none',
  shading = 'fabric',
  interactive = true,
  statusIndicator = 'none',
  className,
  style,
}) => {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 select-none group',
        className
      )}
      style={{ width: size, height: size, ...style }}
    >
      {/* Dynamic ambient shadow */}
      <div
        className="absolute inset-0 rounded-2xl blur-md opacity-25 scale-90 -bottom-1 pointer-events-none transition-opacity"
        style={{ backgroundColor: color }}
      />

      <div className="relative w-full h-full flex items-center justify-center overflow-visible">
        <BotAvatar
          type={type}
          state={state}
          face={face}
          size={size}
          color={color}
          headphones={headphones}
          glasses={glasses}
          hat={hat}
          shading={shading}
          interactive={interactive}
          className="transition-transform group-hover:scale-105"
        />
      </div>

      {/* Optional Status Indicator Badge */}
      {statusIndicator !== 'none' && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
            statusIndicator === 'online' && 'bg-emerald-500',
            statusIndicator === 'speaking' && 'bg-emerald-500 animate-pulse',
            statusIndicator === 'thinking' && 'bg-amber-400 animate-ping',
            statusIndicator === 'idle' && 'bg-neutral-400'
          )}
          title={`Status: ${statusIndicator}`}
        />
      )}
    </div>
  );
};
