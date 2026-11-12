import api from './api';
import {
  InterviewSession,
  InterviewSessionListItem,
  CreateSessionPayload,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
  SuggestedRolesResponse,
  AudioTranscriptionResponse,
} from '../types/interview';

export const interviewService = {
  /**
   * Initiate a new AI mock interview session.
   */
  async createSession(payload: CreateSessionPayload): Promise<InterviewSession> {
    const response = await api.post<InterviewSession>('/interviews/sessions/', payload);
    return response.data;
  },

  /**
   * List all past interview sessions for the authenticated candidate.
   */
  async listSessions(): Promise<InterviewSessionListItem[]> {
    const response = await api.get<InterviewSessionListItem[]>('/interviews/sessions/');
    return response.data;
  },

  /**
   * Fetch full details of an interview session, including questions and evaluations.
   */
  async getSession(sessionId: string): Promise<InterviewSession> {
    const response = await api.get<InterviewSession>(`/interviews/sessions/${sessionId}/`);
    return response.data;
  },

  /**
   * Submit an answer to a question in an active interview session.
   */
  async submitAnswer(
    sessionId: string,
    payload: SubmitAnswerPayload
  ): Promise<SubmitAnswerResponse> {
    const response = await api.post<SubmitAnswerResponse>(
      `/interviews/sessions/${sessionId}/answer/`,
      payload
    );
    return response.data;
  },

  /**
   * Transcribe recorded candidate audio into text via backend faster-whisper (TASK-055).
   */
  async transcribeAudio(
    audioBlob: Blob,
    sessionId?: string,
    language: string = 'en'
  ): Promise<AudioTranscriptionResponse> {
    const formData = new FormData();
    const filename = audioBlob.type.includes('wav') ? 'answer.wav' : 'answer.webm';
    formData.append('audio', audioBlob, filename);
    formData.append('language', language);

    const url = sessionId
      ? `/interviews/sessions/${sessionId}/transcribe/`
      : '/interviews/transcribe/';

    const response = await api.post<AudioTranscriptionResponse>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Synthesize question or feedback text to spoken audio stream via Piper TTS (TASK-056).
   */
  async synthesizeSpeech(text: string, voice?: string, sessionId?: string): Promise<Blob> {
    const url = sessionId
      ? `/interviews/sessions/${sessionId}/synthesize/`
      : '/interviews/synthesize/';

    const response = await api.post(
      url,
      { text, voice: voice || '' },
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  /**
   * Finalize a session and calculate overall readiness summary.
   */
  async completeSession(sessionId: string): Promise<InterviewSession> {
    const response = await api.post<InterviewSession>(
      `/interviews/sessions/${sessionId}/complete/`
    );
    return response.data;
  },

  /**
   * Delete an interview session.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/interviews/sessions/${sessionId}/`);
  },

  /**
   * Fetch standard canonical roles with top skills from the knowledge graph.
   */
  async getSuggestedRoles(): Promise<SuggestedRolesResponse> {
    const response = await api.get<SuggestedRolesResponse>('/interviews/roles/');
    return response.data;
  },
};

