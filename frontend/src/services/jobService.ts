import api from './api';
import { JobFilterParams, JobMarketQueryResponse, JobPosting } from '../types/jobs';
import { PaginatedResponse } from '../types/api';

export const jobService = {
  async getJobsPaginated(params?: JobFilterParams): Promise<PaginatedResponse<JobPosting>> {
    const response = await api.get<JobPosting[] | PaginatedResponse<JobPosting>>('/jobs/', {
      params: {
        q: params?.q || undefined,
        city: params?.city || undefined,
        remote: params?.remote !== undefined ? params.remote : undefined,
        category: params?.category || undefined,
        sort: params?.sort || undefined,
        page: params?.page || undefined,
        page_size: params?.page_size || undefined,
      },
    });

    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        page: 1,
        page_size: response.data.length || 12,
        total_pages: 1,
        results: response.data,
      };
    }

    return {
      count: response.data.count ?? response.data.results?.length ?? 0,
      next: response.data.next ?? null,
      previous: response.data.previous ?? null,
      page: response.data.page ?? params?.page ?? 1,
      page_size: response.data.page_size ?? params?.page_size ?? 12,
      total_pages:
        response.data.total_pages ??
        Math.max(
          1,
          Math.ceil(
            (response.data.count ?? 0) / (response.data.page_size ?? params?.page_size ?? 12)
          )
        ),
      results: response.data.results || [],
    };
  },

  async getJobs(params?: JobFilterParams): Promise<JobPosting[]> {
    const paginated = await this.getJobsPaginated(params);
    return paginated.results;
  },

  async getJobDetail(id: string): Promise<JobPosting> {
    const response = await api.get<JobPosting>(`/jobs/${id}/`);
    return response.data;
  },

  async queryJobMarket(query: string): Promise<JobMarketQueryResponse> {
    const response = await api.post<JobMarketQueryResponse>('/jobs/query/', {
      query,
    });
    return response.data;
  },
};
