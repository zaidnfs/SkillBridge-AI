"""
DRF Views for JobPostings.
Provides public listing, pagination, searching, filtering, and retrieval endpoints.
"""
import logging

from django.db.models import F, Q
from rest_framework import generics, status, views
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from services import get_agent_service
from .models import JobPosting
from .serializers import (
    JobMarketQuerySerializer,
    JobPostingDetailSerializer,
    JobPostingListSerializer,
)

logger = logging.getLogger(__name__)


class JobPostingPagination(PageNumberPagination):
    """
    Standard page-number pagination for job listings.
    Default page_size=12 aligns with 1/2/3-column responsive card grids.
    """

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "page": self.page.number,
                "page_size": self.get_page_size(self.request),
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )


SORT_ORDER_MAP = {
    "newest": ("-posted_date", "-created_at"),
    "salary_high": (
        F("salary_max").desc(nulls_last=True),
        F("salary_min").desc(nulls_last=True),
        "-posted_date",
    ),
    "salary_low": (
        F("salary_min").asc(nulls_last=True),
        F("salary_max").asc(nulls_last=True),
        "-posted_date",
    ),
}


class JobPostingListView(generics.ListAPIView):
    """
    Public endpoint to search, filter, sort, and paginate job postings.
    Query parameters:
    - `q`: Search keyword across title, company, description, extracted_role, or category
    - `city`: Filter by city (e.g. "Bengaluru")
    - `remote`: Filter by remote status ("true"/"1")
    - `category`: Filter by category or extracted role
    - `sort`: Sort order ("newest", "salary_high", "salary_low")
    - `page`: Page number (default 1)
    - `page_size`: Results per page (default 12, max 100)
    """

    permission_classes = [AllowAny]
    serializer_class = JobPostingListSerializer
    pagination_class = JobPostingPagination

    def get_queryset(self):
        queryset = JobPosting.objects.all()

        q = self.request.query_params.get("q")
        if q:
            q = q.strip()[:200]
            if q:
                queryset = queryset.filter(
                    Q(title__icontains=q)
                    | Q(company__icontains=q)
                    | Q(description__icontains=q)
                    | Q(extracted_role__icontains=q)
                    | Q(category__icontains=q)
                )

        city = self.request.query_params.get("city")
        if city:
            city = city.strip()[:100]
            if city:
                queryset = queryset.filter(location_city__icontains=city)

        remote = self.request.query_params.get("remote")
        if remote in ("true", "1", "True"):
            queryset = queryset.filter(is_remote=True)

        category = self.request.query_params.get("category")
        if category:
            category = category.strip()[:100]
            if category:
                queryset = queryset.filter(
                    Q(category__icontains=category) | Q(extracted_role__icontains=category)
                )

        sort_key = (self.request.query_params.get("sort") or "newest").strip().lower()
        ordering = SORT_ORDER_MAP.get(sort_key, SORT_ORDER_MAP["newest"])
        return queryset.order_by(*ordering)


class JobPostingDetailView(generics.RetrieveAPIView):
    """
    Public endpoint to retrieve the full details of a specific job posting.
    """

    permission_classes = [AllowAny]
    serializer_class = JobPostingDetailSerializer
    queryset = JobPosting.objects.all()
    lookup_field = "id"


class JobMarketQueryView(views.APIView):
    """
    Protected endpoint to query the job market using the LangGraph agent.
    Requires JWT authentication.
    POST /api/v1/jobs/query/
    Body: {"query": "What are the most demanded skills for Python Backend Developer?"}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = JobMarketQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data["query"]
        agent = get_agent_service()

        try:
            result = agent.run_query(query=query)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error("JobMarketQueryView error processing query '%s': %s", query, exc)
            return Response(
                {"error": "Agent query processing failed.", "details": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
