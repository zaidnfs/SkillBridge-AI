export interface JobRoleSkillInsight {
  skill: string;
  count: number;
  in_this_job: boolean;
}

export interface JobHiringCityInsight {
  city: string;
  count: number;
}

export interface JobMarketInsights {
  role_title: string;
  matching_jobs_count: number;
  avg_salary_min: number | null;
  avg_salary_max: number | null;
  currency: string;
  top_role_skills: JobRoleSkillInsight[];
  top_hiring_cities: JobHiringCityInsight[];
}

export interface SimilarJobSummary {
  id: string;
  title: string;
  company: string;
  location_city: string;
  is_remote: boolean;
  salary_min: string | number | null;
  salary_max: string | number | null;
  currency: string;
  extracted_skills: string[];
  extracted_role: string;
  posted_date: string | null;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  description?: string;
  description_preview?: string;
  location_city: string;
  location_country: string;
  location_display?: string;
  location_area?: string[];
  is_remote: boolean;
  salary_min: string | number | null;
  salary_max: string | number | null;
  currency: string;
  salary_is_predicted?: boolean;
  contract_time?: string;
  contract_type?: string;
  category: string;
  posted_date: string | null;
  source_provider: string;
  source_id?: string;
  source_url: string;
  extracted_skills: string[];
  extracted_role: string;
  is_processed: boolean;
  processed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  market_insights?: JobMarketInsights;
  similar_jobs?: SimilarJobSummary[];
}

export interface JobMarketQueryResponse {
  query: string;
  strategy?: string;
  answer: string;
  evidence_sources?: Array<{
    type: string;
    description: string;
    details?: any;
  }>;
  suggested_followups?: string[];
}

export type JobSortOption = 'newest' | 'salary_high' | 'salary_low';

export interface JobFilterParams {
  q?: string;
  city?: string;
  remote?: boolean;
  category?: string;
  sort?: JobSortOption;
  page?: number;
  page_size?: number;
}
