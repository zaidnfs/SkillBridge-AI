import api from './api';
import { FitScoreResult, ResumeDetail, ResumeSummary } from '../types/resumes';

export const resumeService = {
  async uploadResume(file: File): Promise<ResumeSummary> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ResumeSummary>('/resumes/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getResumes(): Promise<ResumeSummary[]> {
    const response = await api.get<ResumeSummary[]>('/resumes/');
    return response.data;
  },

  async getResumeDetail(id: string): Promise<ResumeDetail> {
    const response = await api.get<ResumeDetail>(`/resumes/${id}/`);
    return response.data;
  },

  async deleteResume(id: string): Promise<void> {
    await api.delete(`/resumes/${id}/`);
  },

  async analyzeResume(
    resumeId: string,
    jobId?: string,
    requiredSkills?: string[],
    jobTitle?: string
  ): Promise<FitScoreResult> {
    const payload: {
      job_id?: string;
      job_title?: string;
      job_required_skills?: string[];
    } = {};
    if (jobId) payload.job_id = jobId;
    if (jobTitle) payload.job_title = jobTitle;
    if (requiredSkills && requiredSkills.length > 0) payload.job_required_skills = requiredSkills;

    const response = await api.post<FitScoreResult>(`/resumes/${resumeId}/analyze/`, payload);
    return response.data;
  },

  async downloadAtsResume(resumeId: string, jobId?: string): Promise<Blob> {
    const payload: { job_id?: string } = {};
    if (jobId) payload.job_id = jobId;

    const response = await api.post(`/resumes/${resumeId}/generate-ats/`, payload, {
      responseType: 'blob',
    });
    return response.data;
  },
};
