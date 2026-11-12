import React, { useRef, useEffect, useState } from 'react';
import {
  Sparkles,
  User as UserIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flag,
  Volume2,
  VolumeX,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { InterviewSession, InterviewQuestion } from '@/types/interview';
import { KoboyoBrain, KoboyoSparkle } from '@/components/icons/Koboyo';
import { QuestionFeedbackCard } from './QuestionFeedbackCard';
import { AnswerInputBox } from './AnswerInputBox';
import { InterviewSummaryReport } from './InterviewSummaryReport';
import { VoiceModeToggle } from './VoiceModeToggle';
import { useVoicePlayer } from '@/hooks/useVoicePlayer';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';
import { cn } from '@/lib/utils';

interface InterviewChatViewProps {
  session: InterviewSession;
  onSubmitAnswer: (answer: string) => Promise<void>;
  onCompleteSession: () => Promise<void>;
  onNewInterview: () => void;
  isSubmitting: boolean;
}

export const InterviewChatView: React.FC<InterviewChatViewProps> = ({
  session,
  onSubmitAnswer,
  onCompleteSession,
  onNewInterview,
  isSubmitting,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const questions = session.questions || [];
  const currentIdx = session.current_question_index;
  const isCompleted = session.status === 'completed';

  // Voice Mode persistent state
  const [voiceMode, setVoiceMode] = useState<boolean>(() => {
    return localStorage.getItem('skillbridge_voice_mode') === 'true';
  });

  const handleToggleVoiceMode = (enabled: boolean) => {
    setVoiceMode(enabled);
    localStorage.setItem('skillbridge_voice_mode', String(enabled));
    if (!enabled) {
      stopSpeech();
    }
  };

  const { isPlaying, isLoading: isAudioLoading, playSpeech, stopSpeech } = useVoicePlayer();
  const [speakingQuestionId, setSpeakingQuestionId] = useState<string | null>(null);

  // Auto-scroll to active message or input box
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentIdx, questions.length, isCompleted]);

  const activeQuestion = questions.find((q) => !q.answered_at) || questions[currentIdx];

  // Auto-read question if voice mode is enabled when active question advances
  useEffect(() => {
    if (voiceMode && activeQuestion && !activeQuestion.answered_at && !isCompleted) {
      setSpeakingQuestionId(activeQuestion.id);
      playSpeech(activeQuestion.question_text, session.id);
    }
    // Cleanup on unmount or question change
    return () => {
      stopSpeech();
    };
  }, [activeQuestion?.id, voiceMode, isCompleted]);

  const handlePlayQuestion = (q: InterviewQuestion) => {
    if (isPlaying && speakingQuestionId === q.id) {
      stopSpeech();
      setSpeakingQuestionId(null);
    } else {
      setSpeakingQuestionId(q.id);
      playSpeech(q.question_text, session.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Progress Header */}
      <div className="bg-white border border-[#D5E5DC] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#EEF7F1] border border-[#D6E8DD] text-[#008855] flex items-center justify-center shrink-0">
            <KoboyoBrain size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#0A1A12]">{session.role_title}</h2>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider',
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]'
                )}
              >
                {session.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {session.target_skills.slice(0, 4).join(' • ') || 'Core Engineering Competencies'}
            </p>
          </div>
        </div>

        {/* Header Right Controls: Stepper, Voice Mode Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-1.5">
            {questions.map((q, idx) => {
              const isAnswered = q.answered_at !== null;
              const isCurrent = idx === currentIdx && !isCompleted;
              return (
                <div
                  key={q.id || idx}
                  className={cn(
                    'h-7 px-2.5 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all',
                    isAnswered
                      ? 'bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD]'
                      : isCurrent
                      ? 'bg-[#008855] text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-400'
                  )}
                  title={`Question ${idx + 1}: ${q.skill_focus}`}
                >
                  <span>Q{idx + 1}</span>
                  {isAnswered && q.score !== null && (
                    <span className="ml-1 text-[10px] font-semibold opacity-80">({q.score})</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Voice Mode Toggle Switch */}
          {!isCompleted && (
            <VoiceModeToggle
              voiceMode={voiceMode}
              onToggle={handleToggleVoiceMode}
            />
          )}

          {!isCompleted && (
            <button
              type="button"
              onClick={onCompleteSession}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Finalize interview early"
            >
              <Flag size={13} />
              <span className="hidden sm:inline">Finish Early</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="space-y-6">
        {questions.map((q, idx) => {
          // Render answered questions and the active unanswered question
          if (idx > currentIdx && !isCompleted) return null;

          const isAnswered = q.answered_at !== null;
          const isCurrentActive = idx === currentIdx && !isCompleted;
          const isThisQuestionSpeaking = isPlaying && speakingQuestionId === q.id;

          return (
            <div key={q.id || idx} className="space-y-4 animate-in fade-in-50 duration-300">
              {/* Interviewer Message Bubble */}
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#004D2F] text-[#4CD681] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <KoboyoBrain size={18} strokeWidth={2} />
                </div>

                <div className="flex-1 max-w-3xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#004D2F]">AI Interviewer</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F1F6F3] border border-[#D5E5DC] text-[#004D2F] font-mono">
                        Question {q.order} of {session.total_questions}
                      </span>
                      {q.skill_focus && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-[#D5E5DC] text-neutral-600 font-semibold">
                          {q.skill_focus}
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-400 capitalize">{q.difficulty}</span>
                    </div>

                    {/* Question Audio Read Button */}
                    <button
                      type="button"
                      onClick={() => handlePlayQuestion(q)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer',
                        isThisQuestionSpeaking
                          ? 'bg-[#E6F4ED] text-[#008855] border-[#008855]/40 shadow-xs'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900'
                      )}
                      title={isThisQuestionSpeaking ? 'Stop speaking' : 'Listen to question'}
                    >
                      {isAudioLoading && speakingQuestionId === q.id ? (
                        <div className="flex items-center gap-1.5">
                          <AIThinkingOrb state="breathing" size={20} color="#008855" />
                          <span className="text-[11px] font-medium text-[#008855]">Synthesizing...</span>
                        </div>
                      ) : isThisQuestionSpeaking ? (
                        <>
                          <Volume2 size={13} className="text-[#008855] animate-pulse" />
                          <span className="text-[11px] font-semibold text-[#008855]">Speaking...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={13} />
                          <span className="text-[11px]">Listen</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="rounded-2xl rounded-tl-sm bg-white border border-[#D5E5DC] p-5 shadow-xs text-sm text-[#0A1A12] leading-relaxed">
                    <p className="font-medium">{q.question_text}</p>
                  </div>
                </div>
              </div>

              {/* Candidate Submitted Response Bubble (if answered) */}
              {isAnswered && (
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 max-w-2xl space-y-1.5 flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-500">Your Response</span>
                      {q.answered_at && (
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {new Date(q.answered_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="rounded-2xl rounded-tr-sm bg-[#EEF7F1] border border-[#D6E8DD] p-4 text-xs sm:text-sm text-[#0A1A12] leading-relaxed whitespace-pre-wrap">
                      {q.user_answer}
                    </div>
                  </div>

                  <div className="h-9 w-9 rounded-xl bg-[#DDEEE4] text-[#004D2F] border border-[#BBDDCB] flex items-center justify-center font-bold text-xs shrink-0 font-mono mt-0.5">
                    <UserIcon size={16} />
                  </div>
                </div>
              )}

              {/* Instant Evaluation Card for answered questions */}
              {isAnswered && q.evaluation && (
                <div className="pl-12 max-w-3xl">
                  <QuestionFeedbackCard
                    evaluation={q.evaluation}
                    score={q.score}
                    expectedPoints={q.expected_points}
                  />
                </div>
              )}

              {/* Active Input Box & Evaluation Loading Card */}
              {isCurrentActive && (
                <div className="pl-12 max-w-3xl pt-2 space-y-4">
                  {isSubmitting && (
                    <div className="rounded-2xl border border-[#D5E5DC] bg-white/95 backdrop-blur-sm p-4 sm:p-5 shadow-xs flex items-center gap-4 animate-in fade-in-50 duration-300">
                      <AIThinkingOrb state="solving" size={84} color="#008855" dotSize={1.3} />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#004D2F] font-mono uppercase tracking-wider">
                            GraphRAG Evaluation Pipeline Active
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-[#008855] animate-ping" />
                        </div>
                        <p className="text-sm font-semibold text-[#0A1A12]">
                          CarrierGraph AI is evaluating your response...
                        </p>
                        <p className="text-xs text-neutral-500">
                          Aligning explanation with knowledge graph concepts & calibrating objective rubric score
                        </p>
                      </div>
                    </div>
                  )}

                  <AnswerInputBox
                    onSubmit={onSubmitAnswer}
                    isLoading={isSubmitting}
                    questionOrder={q.order}
                    voiceMode={voiceMode}
                    sessionId={session.id}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* If session is finished, render final summary report */}
        {isCompleted && (
          <div className="pt-4 border-t border-[#D5E5DC]">
            <InterviewSummaryReport session={session} onRetake={onNewInterview} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
