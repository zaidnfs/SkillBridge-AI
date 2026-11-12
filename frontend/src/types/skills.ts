export type ResourceDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type ResourcePlatform =
  | 'youtube'
  | 'freecodecamp'
  | 'mdn'
  | 'w3schools'
  | 'geeksforgeeks'
  | 'roadmap_sh'
  | 'realpython'
  | 'official_docs'
  | 'github'
  | 'other';

export type ResourceType =
  | 'course'
  | 'tutorial'
  | 'documentation'
  | 'video'
  | 'article'
  | 'interactive'
  | 'project';

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  url: string;
  platform: ResourcePlatform | string;
  platform_display: string;
  resource_type: ResourceType | string;
  resource_type_display: string;
  difficulty: ResourceDifficulty;
  difficulty_display: string;
  estimated_hours?: number | null;
  skill_name?: string;
  skill_category?: string;
}

export interface SkillRecommendationRequest {
  skills: string[];
  difficulty?: ResourceDifficulty;
  max_per_skill?: number;
}

export interface SkillRecommendationResponse {
  total_skills_queried: number;
  total_resources_found: number;
  recommendations: Record<string, LearningResource[]>;
  skills_without_resources: string[];
}
