import api from './api';
import {
  SkillRecommendationRequest,
  SkillRecommendationResponse,
} from '../types/skills';

export const skillService = {
  /**
   * Fetch curated free learning resources for a list of skill gaps.
   */
  async getRecommendations(
    payload: SkillRecommendationRequest
  ): Promise<SkillRecommendationResponse> {
    const response = await api.post<SkillRecommendationResponse>(
      '/skills/recommendations/',
      payload
    );
    return response.data;
  },
};
