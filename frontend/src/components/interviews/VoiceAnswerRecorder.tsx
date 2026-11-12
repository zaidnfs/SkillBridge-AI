import React, { useState } from 'react';
import { Mic, Square, RotateCcw, X, Sparkles, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { interviewService } from '@/services/interviewService';
import { AudioWaveVisualizer } from './AudioWaveVisualizer';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';
import { VoiceBeam } from 'voice-glow';
import { cn } from '@/lib/utils';

interface VoiceAnswerRecorderProps {
  sessionId?: string;
  onTranscriptionComplete: (transcribedText: string) => void;
  disabled?: boolean;
}

export const VoiceAnswerRecorder: React.FC<VoiceAnswerRecorderProps> = ({
  sessionId,
  onTranscriptionComplete,
  disabled = false,
}) => {
  const {
    isRecording,
    formattedDuration,
    volumeLevel,
    stream,
    error: recordError,
    startRecording,
    stopRecording,
    cancelRecording,
    resetAudio,
  } = useAudioRecorder();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const handleStart = async () => {
    setTranscribeError(null);
    await startRecording();
  };

  const handleStopAndTranscribe = async () => {
    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      const blob = await stopRecording();
      if (!blob || blob.size === 0) {
        throw new Error('Recorded audio was empty. Please try speaking again.');
      }

      // Transcribe via backend faster-whisper service
      const result = await interviewService.transcribeAudio(blob, sessionId);

      if (result.text && result.text.trim()) {
        onTranscriptionComplete(result.text.trim());
      } else {
        setTranscribeError('No clear speech detected. Please speak closer to your microphone or type your answer.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transcription failed. Please try again.';
      setTranscribeError(msg);
    } finally {
      setIsTranscribing(false);
      resetAudio();
    }
  };

  const handleCancel = () => {
    cancelRecording();
    setTranscribeError(null);
  };

  const activeError = recordError || transcribeError;

  const cardContent = (
    <div className="w-full bg-[#FAFCFB] border border-[#D5E5DC] rounded-xl p-3.5 transition-all">
      {/* Active Recording View */}
      {isRecording ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AIThinkingOrb state="listening" size={42} color="#008855" dotSize={1.25} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-xs font-bold text-neutral-800">
                    Listening to your response...
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">Speak clearly, sound-reactive glow active</p>
              </div>
              <span className="font-mono text-xs font-bold text-[#008855] bg-[#E6F4ED] px-2 py-0.5 rounded-md ml-auto sm:ml-2">
                {formattedDuration}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Cancel recording"
            >
              <X size={16} />
            </button>
          </div>

          {/* Dynamic Audio Wave Visualizer */}
          <AudioWaveVisualizer isRecording={isRecording} volumeLevel={volumeLevel} barsCount={30} />

          {/* Action controls while recording */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Cancel</span>
            </button>

            <button
              type="button"
              onClick={handleStopAndTranscribe}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#008855] hover:bg-[#007044] shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Square size={13} className="fill-white" />
              <span>Finish & Transcribe</span>
            </button>
          </div>
        </div>
      ) : isTranscribing ? (
        /* Transcribing Loading State with ThinkingOrb */
        <div className="py-2 px-1">
          <AIThinkingOrb
            state="weaving"
            size={44}
            color="#008855"
            dotSize={1.25}
            inline={true}
            label={<span className="text-xs font-bold text-[#004D2F]">Transcribing speech with faster-whisper...</span>}
            sublabel="CTranslate2 INT8 optimized neural speech recognition"
          />
        </div>
      ) : (
        /* Idle Prompt State */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#E6F4ED] text-[#008855]">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900">
                Voice Answer Mode
              </p>
              <p className="text-[11px] text-neutral-500">
                Speak your answer naturally. Transcribed text will appear in the box for your review.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer shadow-xs',
              disabled
                ? 'bg-neutral-300 cursor-not-allowed opacity-60'
                : 'bg-[#008855] hover:bg-[#007044] active:scale-95 hover:shadow-sm'
            )}
          >
            <Mic size={14} />
            <span>Click to Speak Answer</span>
          </button>
        </div>
      )}

      {/* Error Banner */}
      {activeError && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2.5">
          <AlertCircle size={14} className="shrink-0" />
          <span className="leading-tight">{activeError}</span>
        </div>
      )}
    </div>
  );

  if (isRecording && stream) {
    return (
      <VoiceBeam stream={stream} colorVariant="forest" theme="light">
        {cardContent}
      </VoiceBeam>
    );
  }

  return cardContent;
};
