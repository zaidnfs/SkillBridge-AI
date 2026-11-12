import React from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveVisualizerProps {
  isRecording: boolean;
  volumeLevel?: number; // 0 to 100
  barsCount?: number;
  className?: string;
}

export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({
  isRecording,
  volumeLevel = 0,
  barsCount = 20,
  className,
}) => {
  // Generate pseudo-frequency bars centered around the current volumeLevel
  const bars = Array.from({ length: barsCount }, (_, index) => {
    if (!isRecording) return 15; // idle resting line

    // Center bars peak higher than edge bars
    const centerFactor = 1 - Math.abs(index - (barsCount - 1) / 2) / (barsCount / 2);
    // Combine volume with index variance
    const variance = ((index * 37) % 30) / 30;
    const heightPercent = Math.max(
      15,
      Math.min(100, Math.round(volumeLevel * 0.8 * centerFactor + variance * 25))
    );
    return heightPercent;
  });

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1 h-8 px-2 py-1 rounded-lg bg-[#E6F4ED]/50 transition-all',
        className
      )}
      aria-label="Audio level visualizer"
    >
      {bars.map((height, i) => (
        <span
          key={i}
          style={{ height: `${height}%` }}
          className={cn(
            'w-1 rounded-full transition-all duration-75 ease-out',
            isRecording
              ? 'bg-[#008855]'
              : 'bg-[#D5E5DC]'
          )}
        />
      ))}
    </div>
  );
};
