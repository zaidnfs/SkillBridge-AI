import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, AlertCircle, CheckCircle2, Mic, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceAnswerRecorder } from './VoiceAnswerRecorder';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';

interface AnswerInputBoxProps {
  onSubmit: (answer: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  questionOrder: number;
  voiceMode?: boolean;
  sessionId?: string;
}

export const AnswerInputBox: React.FC<AnswerInputBoxProps> = ({
  onSubmit,
  isLoading,
  disabled = false,
  questionOrder,
  voiceMode = false,
  sessionId,
}) => {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [transcribedBanner, setTranscribedBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>(voiceMode ? 'voice' : 'text');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync activeTab when voiceMode prop toggles
  useEffect(() => {
    setActiveTab(voiceMode ? 'voice' : 'text');
  }, [voiceMode]);

  // Auto-focus on new question
  useEffect(() => {
    if (!disabled && !isLoading && activeTab === 'text') {
      textareaRef.current?.focus();
    }
  }, [questionOrder, disabled, isLoading, activeTab]);

  const charCount = answer.trim().length;
  const isTooShort = charCount > 0 && charCount < 10;
  const isValid = charCount >= 10;

  const handleVoiceTranscription = (text: string) => {
    setAnswer((prev) => (prev ? `${prev} ${text}` : text));
    setTranscribedBanner(true);
    setError(null);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async () => {
    if (!isValid || isLoading || disabled) {
      if (charCount === 0) {
        setError('Please speak or type your answer before submitting.');
      } else if (isTooShort) {
        setError('Answers must be at least 10 characters long.');
      }
      return;
    }

    setError(null);
    try {
      await onSubmit(answer.trim());
      setAnswer('');
      setTranscribedBanner(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit answer. Please try again.';
      setError(msg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Optional Mode Switch Tabs when in Voice Mode */}
      {voiceMode && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-100 border border-neutral-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('voice')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer',
                activeTab === 'voice'
                  ? 'bg-white text-[#008855] shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              <Mic size={13} />
              <span>Voice Answer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer',
                activeTab === 'text'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              <Keyboard size={13} />
              <span>Type Answer</span>
            </button>
          </div>

          <span className="text-[11px] text-neutral-400">
            {activeTab === 'voice' ? 'Speak naturally, then review below' : 'Standard keyboard input'}
          </span>
        </div>
      )}

      {/* Voice Recorder Station (when Voice Mode or Voice Tab active) */}
      {voiceMode && activeTab === 'voice' && (
        <VoiceAnswerRecorder
          sessionId={sessionId}
          onTranscriptionComplete={handleVoiceTranscription}
          disabled={disabled || isLoading}
        />
      )}

      {/* Transcribed Banner */}
      {transcribedBanner && (
        <div className="flex items-center justify-between text-xs text-[#008855] bg-[#E6F4ED] border border-[#008855]/30 rounded-xl px-3.5 py-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>
              <strong>Speech transcribed successfully!</strong> You can review or edit technical terms below before submitting.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTranscribedBanner(false)}
            aria-label="Dismiss speech transcription notification"
            className="text-neutral-400 hover:text-neutral-600 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Text Area Card */}
      <div className="w-full bg-white border border-[#D5E5DC] rounded-2xl p-4 shadow-sm focus-within:border-[#008855] focus-within:ring-2 focus-within:ring-[#008855]/10 transition-all">
        {/* Input Area */}
        <textarea
          ref={textareaRef}
          id="interview-answer-input"
          aria-label="Your technical answer to this interview question"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder="Explain your thought process, architecture decisions, trade-offs, and concrete examples..."
          rows={3}
          className="w-full resize-none border-none bg-transparent p-0 text-sm text-[#0A1A12] placeholder:text-neutral-400 focus:outline-none focus:ring-0 leading-relaxed"
        />

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 mt-2 mb-1">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer toolbar */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0F5F2] mt-2">
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className={cn('font-mono', isTooShort ? 'text-amber-600 font-semibold' : '')}>
              {charCount} characters {isTooShort && '(min 10)'}
            </span>
            <span className="hidden sm:inline-block text-[11px] text-neutral-400">
              Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-600 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-600 font-mono text-[10px]">Enter</kbd> to submit
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isLoading || disabled}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer',
              isValid && !isLoading && !disabled
                ? 'bg-[#008855] hover:bg-[#007044] shadow-xs hover:shadow-sm active:scale-95'
                : 'bg-neutral-300 cursor-not-allowed opacity-70'
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <AIThinkingOrb state="solving" size={20} color="#FFFFFF" />
                <span>Evaluating Response...</span>
              </div>
            ) : (
              <>
                <span>Submit Answer</span>
                <CornerDownLeft size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
