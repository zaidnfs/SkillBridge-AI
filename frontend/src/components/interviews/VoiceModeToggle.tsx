import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceModeToggleProps {
  voiceMode: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceModeToggle: React.FC<VoiceModeToggleProps> = ({
  voiceMode,
  onToggle,
  disabled = false,
  className,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={voiceMode}
      aria-label={voiceMode ? 'Voice Mode Active, click to turn off' : 'Voice Mode Off, click to turn on'}
      onClick={() => !disabled && onToggle(!voiceMode)}
      disabled={disabled}
      className={cn(
        'group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008855]',
        voiceMode
          ? 'bg-[#E6F4ED] text-[#008855] border-[#008855]/40 shadow-xs'
          : 'bg-white text-neutral-600 border-[#D5E5DC] hover:border-neutral-300 hover:text-neutral-900',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={
        voiceMode
          ? 'Voice Mode is ON: AI questions will be read aloud and microphone input is ready.'
          : 'Voice Mode is OFF: Click to enable voice answers and spoken questions.'
      }
    >
      {/* Icon with animated pulse in active mode */}
      <div className="relative flex items-center justify-center">
        {voiceMode ? (
          <>
            <span className="absolute -inset-1 rounded-full bg-[#008855]/20 animate-ping" />
            <Mic size={14} className="text-[#008855] relative z-10" />
          </>
        ) : (
          <MicOff size={14} className="text-neutral-400 group-hover:text-neutral-600" />
        )}
      </div>

      <span className="font-semibold tracking-tight">
        {voiceMode ? 'Voice Mode Active' : 'Voice Mode Off'}
      </span>

      {/* Mode Indicator Dot */}
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full transition-colors',
          voiceMode ? 'bg-[#008855]' : 'bg-neutral-300'
        )}
      />
    </button>
  );
};
