export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page?: number;
  page_size?: number;
  total_pages?: number;
  results: T[];
}

export interface ApiErrorResponse {
  error?: string;
  detail?: string;
  details?: string | Record<string, any>;
  [key: string]: any;
}
