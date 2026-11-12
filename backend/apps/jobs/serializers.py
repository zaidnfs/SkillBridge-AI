"""
DRF Serializers for the jobs app.
"""
from typing import Any

from rest_framework import serializers

from .models import JobPosting
from .services import (
    extract_provider_metadata,
    get_job_market_insights,
    get_similar_jobs,
)


class JobPostingListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing and searching job postings.
    """

    description_preview = serializers.SerializerMethodField()
    contract_time = serializers.SerializerMethodField()
    contract_type = serializers.SerializerMethodField()

    class Meta:
        model = JobPosting
        fields = [
            "id",
            "title",
            "company",
            "location_city",
            "location_country",
            "is_remote",
            "salary_min",
            "salary_max",
            "currency",
            "category",
            "posted_date",
            "source_provider",
            "source_url",
            "extracted_skills",
            "extracted_role",
            "is_processed",
            "description_preview",
            "contract_time",
            "contract_type",
        ]

    def _get_meta(self, obj: JobPosting) -> dict[str, Any]:
        cache = getattr(obj, "_provider_meta_cache", None)
        if cache is None:
            cache = extract_provider_metadata(obj)
            setattr(obj, "_provider_meta_cache", cache)
        return cache

    def get_description_preview(self, obj: JobPosting) -> str:
        text = " ".join((obj.description or "").split())
        if len(text) <= 150:
            return text
        return f"{text[:147].rstrip()}..."

    def get_contract_time(self, obj: JobPosting) -> str:
        return self._get_meta(obj)["contract_time"]

    def get_contract_type(self, obj: JobPosting) -> str:
        return self._get_meta(obj)["contract_type"]


class JobPostingDetailSerializer(serializers.ModelSerializer):
    """
    Full detail serializer including complete job description, normalized provider
    metadata, role-level market benchmarks, and similar job recommendations.
    """

    location_display = serializers.SerializerMethodField()
    location_area = serializers.SerializerMethodField()
    contract_time = serializers.SerializerMethodField()
    contract_type = serializers.SerializerMethodField()
    salary_is_predicted = serializers.SerializerMethodField()
    market_insights = serializers.SerializerMethodField()
    similar_jobs = serializers.SerializerMethodField()

    class Meta:
        model = JobPosting
        fields = [
            "id",
            "title",
            "company",
            "description",
            "location_city",
            "location_country",
            "location_display",
            "location_area",
            "is_remote",
            "salary_min",
            "salary_max",
            "currency",
            "salary_is_predicted",
            "contract_time",
            "contract_type",
            "category",
            "posted_date",
            "source_provider",
            "source_id",
            "source_url",
            "extracted_skills",
            "extracted_role",
            "is_processed",
            "processed_at",
            "created_at",
            "updated_at",
            "market_insights",
            "similar_jobs",
        ]

    def _get_meta(self, obj: JobPosting) -> dict[str, Any]:
        cache = getattr(obj, "_provider_meta_cache", None)
        if cache is None:
            cache = extract_provider_metadata(obj)
            setattr(obj, "_provider_meta_cache", cache)
        return cache

    def get_location_display(self, obj: JobPosting) -> str:
        return self._get_meta(obj)["location_display"]

    def get_location_area(self, obj: JobPosting) -> list[str]:
        return self._get_meta(obj)["location_area"]

    def get_contract_time(self, obj: JobPosting) -> str:
        return self._get_meta(obj)["contract_time"]

    def get_contract_type(self, obj: JobPosting) -> str:
        return self._get_meta(obj)["contract_type"]

    def get_salary_is_predicted(self, obj: JobPosting) -> bool:
        return self._get_meta(obj)["salary_is_predicted"]

    def get_market_insights(self, obj: JobPosting) -> dict[str, Any]:
        return get_job_market_insights(obj)

    def get_similar_jobs(self, obj: JobPosting) -> list[dict[str, Any]]:
        return get_similar_jobs(obj, limit=4)


class JobMarketQuerySerializer(serializers.Serializer):
    """
    Serializer for natural language queries directed at the agentic query system.
    """

    query = serializers.CharField(
        required=True,
        max_length=500,
        allow_blank=False,
        error_messages={
            "blank": "Query string cannot be empty.",
            "required": "Query string is required.",
        },
    )


class JobMarketQueryResponseSerializer(serializers.Serializer):
    """
    Serializer for the agentic query response payload.
    """

    query = serializers.CharField()
    strategy = serializers.CharField()
    response = serializers.CharField()
    sources = serializers.ListField(child=serializers.DictField(), required=False)
    entities = serializers.DictField(required=False)
    confidence = serializers.FloatField(required=False)
