export type InterviewDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type InterviewSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface InterviewEvaluation {
  score: number;
  technical_accuracy: string;
  depth: string;
  strengths: string[];
  improvements: string[];
  ideal_answer: string;
}

export interface InterviewQuestion {
  id: string;
  order: number;
  skill_focus: string;
  difficulty: InterviewDifficulty;
  question_text: string;
  expected_points: string[];
  user_answer: string;
  answered_at: string | null;
  score: number | null;
  evaluation: InterviewEvaluation;
  created_at: string;
}

export interface SessionSummary {
  readiness_level: string;
  summary_verdict: string;
  overall_score?: number;
  key_strengths: string[];
  areas_for_growth: string[];
  recommended_skills_to_review: string[];
}

export interface InterviewSession {
  id: string;
  role_title: string;
  target_skills: string[];
  status: InterviewSessionStatus;
  total_questions: number;
  current_question_index: number;
  overall_score: number | null;
  summary_feedback: SessionSummary | Record<string, unknown>;
  questions: InterviewQuestion[];
  created_at: string;
  updated_at: string;
}

export interface InterviewSessionListItem {
  id: string;
  role_title: string;
  target_skills: string[];
  status: InterviewSessionStatus;
  total_questions: number;
  current_question_index: number;
  questions_answered: number;
  overall_score: number | null;
  summary_feedback: SessionSummary | Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionPayload {
  role_title: string;
  target_skills?: string[];
  num_questions?: number;
  difficulty?: InterviewDifficulty;
}

export interface SubmitAnswerPayload {
  question_id: string;
  answer: string;
}

export interface SubmitAnswerResponse {
  session: InterviewSession;
  evaluated_question: InterviewQuestion;
  is_completed: boolean;
}

export interface RoleSuggestion {
  role_title: string;
  top_skills: string[];
}

export interface SuggestedRolesResponse {
  roles: RoleSuggestion[];
}

export interface AudioTranscriptionResponse {
  text: string;
  duration: number;
  language: string;
  confidence?: number;
}

export interface SpeechSynthesisPayload {
  text: string;
  voice?: string;
}

