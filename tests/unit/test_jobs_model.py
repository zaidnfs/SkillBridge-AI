"""
Unit tests for the jobs app: JobPosting model and DRF endpoints (TASK-011).
"""
import uuid
from datetime import datetime, timezone
import pytest
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status

from apps.jobs.models import JobPosting
from services.job_providers.schemas import JobListing


@pytest.fixture
def sample_listing():
    return JobListing(
        title="Senior Python Backend Developer",
        company="TechCorp India",
        url="https://example.com/jobs/123",
        source_provider="adzuna",
        source_id="adzuna-12345",
        description="Looking for a Python and Django expert with PostgreSQL skills.",
        location_city="Bengaluru",
        location_country="IN",
        salary_min=1200000.0,
        salary_max=1800000.0,
        currency="INR",
        posted_date=datetime(2026, 9, 20, 10, 0, 0, tzinfo=timezone.utc),
        category="IT Jobs",
        raw_data={"raw_id": "12345", "source": "adzuna"},
    )


@pytest.mark.django_db
class TestJobPostingModel:
    """Tests for the JobPosting relational model."""

    def test_create_job_posting_direct(self):
        """Test creating a JobPosting directly with required fields."""
        job = JobPosting.objects.create(
            title="Full Stack Engineer",
            company="Innovatech",
            description="Build modern web applications with React and Django.",
            location_city="Hyderabad",
            location_country="IN",
            source_url="https://innovatech.com/jobs/1",
            source_provider="adzuna",
            source_id="inno-001",
        )

        assert job.id is not None
        assert isinstance(job.id, uuid.UUID)
        assert job.title == "Full Stack Engineer"
        assert job.company == "Innovatech"
        assert job.dedup_hash != ""
        assert job.is_processed is False
        assert str(job) == "Full Stack Engineer at Innovatech (Hyderabad)"

    def test_from_job_listing_factory(self, sample_listing):
        """Test converting normalized JobListing dataclass into a JobPosting model."""
        job = JobPosting.from_job_listing(sample_listing)
        job.save()

        assert job.title == sample_listing.title
        assert job.company == sample_listing.company
        assert job.source_provider == "adzuna"
        assert job.source_id == "adzuna-12345"
        assert job.salary_min == 1200000.0
        assert job.salary_max == 1800000.0
        assert job.location_city == "Bengaluru"
        assert job.dedup_hash == JobPosting.compute_dedup_hash(
            sample_listing.title, sample_listing.company, sample_listing.location_city
        )

    def test_remote_job_detection(self):
        """Test automatic remote detection from title or description."""
        job_remote = JobPosting.objects.create(
            title="Remote Python Developer",
            company="GlobalWorks",
            location_city="Bengaluru",
            source_url="https://example.com/2",
            source_provider="adzuna",
            source_id="gw-002",
        )
        assert job_remote.is_remote is True

        job_onsite = JobPosting.objects.create(
            title="Systems Engineer",
            company="OnsiteCorp",
            description="Work at our physical office in Pune.",
            location_city="Pune",
            source_url="https://example.com/3",
            source_provider="adzuna",
            source_id="oc-003",
        )
        assert job_onsite.is_remote is False

    def test_unique_source_provider_and_id_constraint(self):
        """Test that duplicate (source_provider, source_id) raises IntegrityError."""
        JobPosting.objects.create(
            title="Dev 1",
            company="Corp A",
            source_url="https://example.com/1",
            source_provider="adzuna",
            source_id="dup-999",
        )

        with pytest.raises(IntegrityError):
            JobPosting.objects.create(
                title="Dev 2",
                company="Corp B",
                source_url="https://example.com/2",
                source_provider="adzuna",
                source_id="dup-999",
            )

    def test_compute_dedup_hash_normalization(self):
        """Test that dedup hash is case-insensitive and whitespace-agnostic."""
        hash1 = JobPosting.compute_dedup_hash(
            "Software   Engineer", "Acme  Corp", "Bengaluru"
        )
        hash2 = JobPosting.compute_dedup_hash(
            "software engineer", "acme corp", "bengaluru"
        )
        hash3 = JobPosting.compute_dedup_hash(
            "SOFTWARE ENGINEER", "ACME CORP", "BENGALURU"
        )
        assert hash1 == hash2 == hash3


@pytest.mark.django_db
class TestJobPostingEndpoints:
    """Tests for DRF job listing, pagination, sorting, and rich detail endpoints."""

    def test_list_jobs_empty(self, api_client):
        """Test listing jobs when table is empty returns paginated empty results."""
        url = reverse("jobs:job-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
        assert response.data["total_pages"] == 1
        assert response.data["results"] == []

    def test_list_jobs_with_filtering(self, api_client):
        """Test searching and filtering job postings."""
        j1 = JobPosting.objects.create(
            title="Senior Python Developer",
            company="PyCorp",
            description="Django REST Framework, PostgreSQL",
            location_city="Bengaluru",
            source_url="https://pycorp.com/1",
            source_provider="adzuna",
            source_id="p1",
            is_remote=False,
        )
        JobPosting.objects.create(
            title="Remote Frontend Engineer",
            company="ReactDevs",
            description="React, TypeScript, Tailwind",
            location_city="Remote",
            source_url="https://react.com/2",
            source_provider="adzuna",
            source_id="p2",
            is_remote=True,
        )

        url = reverse("jobs:job-list")

        # 1. Search keyword "Python"
        res_q = api_client.get(url, {"q": "Python"})
        assert res_q.data["count"] == 1
        assert len(res_q.data["results"]) == 1
        assert res_q.data["results"][0]["title"] == j1.title

        # 2. Filter by city "Bengaluru"
        res_city = api_client.get(url, {"city": "Bengaluru"})
        assert res_city.data["count"] == 1
        assert res_city.data["results"][0]["company"] == "PyCorp"

        # 3. Filter by remote
        res_remote = api_client.get(url, {"remote": "true"})
        assert res_remote.data["count"] == 1
        assert res_remote.data["results"][0]["company"] == "ReactDevs"

    def test_list_jobs_pagination_and_sorting(self, api_client):
        """Test pagination slicing, page_size bounds, and salary sorting."""
        for idx in range(15):
            JobPosting.objects.create(
                title=f"Software Engineer {idx}",
                company=f"Company {idx}",
                description="Python and Django backend systems.",
                location_city="Bengaluru",
                salary_min=500000 + idx * 100000,
                salary_max=900000 + idx * 100000,
                source_url=f"https://example.com/job/{idx}",
                source_provider="adzuna",
                source_id=f"pag-{idx}",
            )

        url = reverse("jobs:job-list")

        # Default page size = 12
        page_1 = api_client.get(url)
        assert page_1.status_code == status.HTTP_200_OK
        assert page_1.data["count"] == 15
        assert page_1.data["page"] == 1
        assert page_1.data["page_size"] == 12
        assert page_1.data["total_pages"] == 2
        assert len(page_1.data["results"]) == 12
        assert page_1.data["next"] is not None
        assert page_1.data["previous"] is None

        # Page 2 returns remaining 3
        page_2 = api_client.get(url, {"page": 2})
        assert page_2.status_code == status.HTTP_200_OK
        assert page_2.data["page"] == 2
        assert len(page_2.data["results"]) == 3
        assert page_2.data["next"] is None
        assert page_2.data["previous"] is not None

        # Custom page_size and salary sorting
        sorted_high = api_client.get(url, {"page_size": 5, "sort": "salary_high"})
        assert sorted_high.status_code == status.HTTP_200_OK
        assert len(sorted_high.data["results"]) == 5
        salaries = [float(item["salary_max"]) for item in sorted_high.data["results"]]
        assert salaries == sorted(salaries, reverse=True)

        # Max page_size capped at 100
        capped = api_client.get(url, {"page_size": 500})
        assert capped.status_code == status.HTTP_200_OK
        assert capped.data["page_size"] == 100

    def test_retrieve_job_detail_rich_metadata_without_internal_leaks(self, api_client):
        """Test retrieving rich details, market insights, similar jobs, and safe metadata."""
        job = JobPosting.objects.create(
            title="DevOps Lead",
            company="CloudTech",
            description="Manage Kubernetes clusters on AWS.",
            location_city="Pune",
            location_country="IN",
            salary_min=1500000,
            salary_max=2500000,
            currency="INR",
            category="IT Jobs",
            source_url="https://cloudtech.com/1",
            source_provider="adzuna",
            source_id="ct-100",
            extracted_skills=["AWS", "Kubernetes", "Docker"],
            extracted_role="DevOps Engineer",
            is_processed=True,
            raw_data={
                "__CLASS__": "Adzuna::API::Response::Job",
                "adref": "secret-tracking-token",
                "contract_time": "full_time",
                "contract_type": "permanent",
                "salary_is_predicted": "1",
                "location": {
                    "display_name": "Pune, Maharashtra",
                    "area": ["India", "Maharashtra", "Pune"],
                },
            },
        )
        JobPosting.objects.create(
            title="Platform DevOps Engineer",
            company="ScaleOps",
            description="Terraform, Kubernetes, AWS CI/CD.",
            location_city="Bengaluru",
            salary_min=1200000,
            salary_max=2000000,
            category="IT Jobs",
            source_url="https://scaleops.com/2",
            source_provider="adzuna",
            source_id="so-200",
            extracted_skills=["AWS", "Kubernetes", "Terraform"],
            extracted_role="DevOps Engineer",
            is_processed=True,
        )

        url = reverse("jobs:job-detail", kwargs={"id": job.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(job.id)
        assert response.data["title"] == "DevOps Lead"
        assert response.data["extracted_skills"] == ["AWS", "Kubernetes", "Docker"]
        assert response.data["extracted_role"] == "DevOps Engineer"
        assert response.data["location_display"] == "Pune, Maharashtra"
        assert response.data["location_area"] == ["India", "Maharashtra", "Pune"]
        assert response.data["contract_time"] == "Full-time"
        assert response.data["contract_type"] == "Permanent"
        assert response.data["salary_is_predicted"] is True

        # Market insights & similar jobs
        insights = response.data["market_insights"]
        assert insights["role_title"] == "DevOps Engineer"
        assert insights["matching_jobs_count"] == 2
        assert insights["avg_salary_min"] == 1350000.0
        assert any(item["skill"] == "Terraform" and not item["in_this_job"] for item in insights["top_role_skills"])
        assert len(response.data["similar_jobs"]) == 1
        assert response.data["similar_jobs"][0]["title"] == "Platform DevOps Engineer"

        # Ensure raw provider tracking internals are not exposed
        assert "raw_data" not in response.data
        assert "adref" not in response.data
