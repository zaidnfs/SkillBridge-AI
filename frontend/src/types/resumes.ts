export interface ResumeSummary {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  is_parsed: boolean;
  skills: string[];
  created_at: string;
}

export interface ResumeDetail extends ResumeSummary {
  extracted_text: string;
  parsed_data: Record<string, any>;
  contact_info: {
    emails?: string[];
    phones?: string[];
    links?: string[];
  };
  sections: Record<string, string>;
  parsed_at: string | null;
  updated_at: string;
}

export interface FitScoreResult {
  resume_id: string;
  job_id?: string | null;
  job_title: string;
  fit_score: number;
  fit_category: 'Low' | 'Partial' | 'Good' | 'Strong' | 'Excellent';
  matched_skills: string[];
  missing_skills: string[];
  matched_preferred_skills?: string[];
  missing_preferred_skills?: string[];
  total_required_skills: number;
  total_matched_skills: number;
  summary: string;
  recommendations?: string[];
}
