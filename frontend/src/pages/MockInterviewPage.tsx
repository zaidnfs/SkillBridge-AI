import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  Trash2,
  History,
  TrendingUp,
} from 'lucide-react';
import { interviewService } from '@/services/interviewService';
import {
  InterviewSession,
  InterviewSessionListItem,
  CreateSessionPayload,
} from '@/types/interview';
import { InterviewSetupModal } from '@/components/interviews/InterviewSetupModal';
import { InterviewChatView } from '@/components/interviews/InterviewChatView';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorRetryCard } from '@/components/shared/ErrorRetryCard';
import { AILoadingState } from '@/components/shared/AILoadingState';
import { KoboyoBrain, KoboyoSparkle } from '@/components/icons/Koboyo';
import { cn } from '@/lib/utils';

export const MockInterviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const prefillRole = searchParams.get('role') || undefined;
  const prefillSkillsParam = searchParams.get('skills');
  const prefillSkills = prefillSkillsParam
    ? prefillSkillsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const [sessions, setSessions] = useState<InterviewSessionListItem[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(Boolean(prefillRole || prefillSkills?.length));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session list on mount
  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await interviewService.listSessions();
      setSessions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load interview history.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Start new session
  const handleStartSession = async (payload: CreateSessionPayload) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const newSession = await interviewService.createSession(payload);
      setActiveSession(newSession);
      setIsSetupOpen(false);
      // Refresh background list
      loadSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not generate interview questions.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open an existing session for review or continuation
  const handleOpenSession = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await interviewService.getSession(sessionId);
      setActiveSession(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load interview session.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit candidate answer
  const handleSubmitAnswer = async (answer: string) => {
    if (!activeSession) return;
    const currentQ =
      activeSession.questions.find((q) => !q.answered_at) ||
      activeSession.questions[activeSession.current_question_index];
    if (!currentQ) return;

    setIsSubmitting(true);
    try {
      const response = await interviewService.submitAnswer(activeSession.id, {
        question_id: currentQ.id,
        answer,
      });
      setActiveSession(response.session);
      loadSessions();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalize session early
  const handleCompleteSession = async () => {
    if (!activeSession) return;
    setIsSubmitting(true);
    try {
      const completed = await interviewService.completeSession(activeSession.id);
      setActiveSession(completed);
      loadSessions();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this interview session?')) return;
    try {
      await interviewService.deleteSession(sessionId);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: unknown) {
      alert('Failed to delete session.');
    }
  };

  // Metric stats
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const scoredSessions = completedSessions.filter((s) => s.overall_score !== null);
  const avgScore = scoredSessions.length
    ? Math.round(
        scoredSessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) /
          scoredSessions.length
      )
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D5E5DC] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#008855] uppercase tracking-wider mb-1 font-mono">
            <KoboyoSparkle size={14} />
            <span>Placement Preparation • GraphRAG Driven</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0A1A12] tracking-tight flex items-center gap-2.5">
            AI Mock Interview
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            Practice role-specific technical questions synthesized from real live job postings in the Knowledge Graph. Receive instant LLM scoring, trade-off analysis, and model answers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {activeSession ? (
            <button
              type="button"
              onClick={() => setActiveSession(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-700 bg-white border border-[#D5E5DC] hover:bg-[#F4F9F6] transition-colors cursor-pointer"
            >
              ← Back to Sessions
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsSetupOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#008855] hover:bg-[#007044] shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>New Mock Interview</span>
          </button>
        </div>
      </div>

      {/* Main View: Active Interview vs Overview History */}
      {error ? (
        <ErrorRetryCard message={error} onRetry={loadSessions} />
      ) : activeSession ? (
        /* Active Interview View */
        <InterviewChatView
          session={activeSession}
          onSubmitAnswer={handleSubmitAnswer}
          onCompleteSession={handleCompleteSession}
          onNewInterview={() => {
            setActiveSession(null);
            setIsSetupOpen(true);
          }}
          isSubmitting={isSubmitting}
        />
      ) : (
        /* Overview Dashboard & Session History */
        <div className="space-y-8">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#D5E5DC] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold text-neutral-400 block mb-1 uppercase tracking-wider font-mono">
                Total Sessions
              </span>
              <span className="text-2xl font-bold text-[#0A1A12] font-mono">
                {sessions.length}
              </span>
            </div>

            <div className="rounded-2xl border border-[#D5E5DC] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold text-neutral-400 block mb-1 uppercase tracking-wider font-mono">
                Completed
              </span>
              <span className="text-2xl font-bold text-[#008855] font-mono">
                {completedSessions.length}
              </span>
            </div>

            <div className="rounded-2xl border border-[#D5E5DC] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold text-neutral-400 block mb-1 uppercase tracking-wider font-mono">
                Average Score
              </span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-2xl font-bold text-[#0A1A12]">{avgScore}</span>
                <span className="text-xs text-neutral-400">/100</span>
              </div>
            </div>
          </div>

          {/* Quick Start Hero Card */}
          <div className="rounded-3xl border border-[#D5E5DC] bg-gradient-to-r from-[#EEF7F1] via-white to-[#F4F9F6] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-1.5 max-w-xl text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-white border border-[#BBDDCB] text-[#004D2F] shadow-2xs">
                  <KoboyoSparkle size={13} />
                  Knowledge Graph Grounded
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0A1A12] tracking-tight">
                  Ready to practice for your target placement role?
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Choose roles like <span className="font-semibold text-[#004D2F]">Backend Developer</span> or <span className="font-semibold text-[#004D2F]">Frontend Developer</span>. The AI interviewer generates authentic, scenario-based questions tested against live industry expectations.
                </p>
            </div>

            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-bold text-white bg-[#008855] hover:bg-[#007044] shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Play size={16} fill="white" />
              <span>Start an Interview</span>
            </button>
          </div>

          {/* Past Sessions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#008855]" />
                <h3 className="text-sm font-bold text-[#0A1A12]">Your Interview Sessions</h3>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 bg-white rounded-2xl border border-[#D5E5DC]">
                <AILoadingState
                  state="working"
                  title="Loading Interview History"
                  description="Retrieving your past interview sessions and telemetry from the knowledge graph..."
                  card={false}
                />
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No interview sessions yet"
                description="Start your first AI mock interview to practice role-specific technical questions and get instant feedback."
                actionLabel="Start First Interview"
                onAction={() => setIsSetupOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map((item) => {
                  const isDone = item.status === 'completed';
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenSession(item.id)}
                      className="group rounded-2xl border border-[#D5E5DC] bg-white p-5 shadow-2xs hover:border-[#008855] hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-[#0A1A12] group-hover:text-[#008855] transition-colors">
                              {item.role_title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                              <Calendar size={12} />
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>
                                {item.questions_answered} of {item.total_questions} answered
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.overall_score !== null ? (
                              <div className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
                                {Math.round(item.overall_score)}/100
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-neutral-400 px-2 py-0.5 rounded bg-neutral-100">
                                In Progress
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(item.id, e)}
                              className="text-neutral-300 hover:text-red-500 p-1 rounded-md transition-colors"
                              title="Delete session"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Skill Tags */}
                        {item.target_skills && item.target_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.target_skills.slice(0, 4).map((sk) => (
                              <span
                                key={sk}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-[#F8FAF9] border border-[#E2ECE5] text-neutral-600"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Action */}
                      <div className="pt-4 border-t border-[#F0F5F2] mt-4 flex items-center justify-between text-xs font-semibold text-[#008855]">
                        <span>{isDone ? 'Review Evaluation & Report' : 'Resume Interview'}</span>
                        <ArrowRight
                          size={14}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Setup Modal */}
      <InterviewSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onStartSession={handleStartSession}
        isLoading={isSubmitting}
        initialRole={prefillRole}
        initialSkills={prefillSkills}
      />
    </div>
  );
};
