"""
Unit tests for Celery ingestion tasks and management commands (TASK-012).
"""
from unittest.mock import MagicMock, patch
import pytest
from django.core.management import call_command

from apps.jobs.models import JobPosting
from services.job_providers.exceptions import ProviderRateLimitError, ProviderUnavailableError
from services.job_providers.schemas import JobListing
from tasks.ingestion import fetch_and_store_jobs
from tasks.processing import process_unprocessed_jobs


@pytest.fixture
def mock_job_listings():
    return [
        JobListing(
            title="Senior Python Developer",
            company="Tech Corp",
            url="https://example.com/jobs/1",
            source_provider="adzuna",
            source_id="mock-1",
            description="Looking for Python, Django, and PostgreSQL experience.",
            location_city="Bengaluru",
            location_country="IN",
            salary_min=1000000.0,
            salary_max=1500000.0,
        ),
        JobListing(
            title="Data Scientist",
            company="AI Labs",
            url="https://example.com/jobs/2",
            source_provider="adzuna",
            source_id="mock-2",
            description="Machine learning, PyTorch, Pandas.",
            location_city="Hyderabad",
            location_country="IN",
            salary_min=1200000.0,
            salary_max=1800000.0,
        ),
    ]


@pytest.mark.django_db
class TestIngestionTask:
    """Tests for the fetch_and_store_jobs Celery task."""

    @patch("tasks.ingestion.get_job_service")
    def test_fetch_and_store_jobs_success(self, mock_get_service, mock_job_listings):
        """Test fetching and creating new job postings."""
        mock_service = MagicMock()
        mock_service.search_jobs.return_value = mock_job_listings
        mock_get_service.return_value = mock_service

        summary = fetch_and_store_jobs(
            keywords=["Python Developer"],
            locations=["Bengaluru"],
            max_pages_per_query=1,
            auto_trigger_processing=False,
        )

        assert summary["status"] == "completed"
        assert summary["total_fetched"] == 2
        assert summary["total_created"] == 2
        assert summary["total_duplicates"] == 0
        assert JobPosting.objects.count() == 2

    @patch("tasks.ingestion.get_job_service")
    def test_fetch_and_store_jobs_deduplication(
        self, mock_get_service, mock_job_listings
    ):
        """Test that re-running ingestion detects duplicates and skips them."""
        mock_service = MagicMock()
        mock_service.search_jobs.return_value = mock_job_listings
        mock_get_service.return_value = mock_service

        # First run: 2 created
        fetch_and_store_jobs(
            keywords=["Python Developer"],
            locations=["Bengaluru"],
            max_pages_per_query=1,
            auto_trigger_processing=False,
        )
        assert JobPosting.objects.count() == 2

        # Second run: identical listings returned -> 2 duplicates skipped
        summary2 = fetch_and_store_jobs(
            keywords=["Python Developer"],
            locations=["Bengaluru"],
            max_pages_per_query=1,
            auto_trigger_processing=False,
        )
        assert summary2["total_created"] == 0
        assert summary2["total_duplicates"] == 2
        assert JobPosting.objects.count() == 2

    @patch("tasks.ingestion.get_job_service")
    def test_fetch_and_store_jobs_provider_rate_limit(self, mock_get_service):
        """Test graceful recovery when a provider raises rate limit error."""
        mock_service = MagicMock()
        mock_service.search_jobs.side_effect = ProviderRateLimitError(
            provider="adzuna", message="Rate limit exceeded"
        )
        mock_get_service.return_value = mock_service

        summary = fetch_and_store_jobs(
            keywords=["Python Developer"],
            locations=["Bengaluru"],
            max_pages_per_query=1,
            auto_trigger_processing=False,
        )

        assert summary["status"] == "completed"
        assert summary["total_created"] == 0
        assert summary["errors_count"] > 0
        assert any("Rate limit" in err for err in summary["errors"])

    @patch("tasks.ingestion.get_job_service")
    def test_fetch_and_store_jobs_provider_unavailable(self, mock_get_service):
        """Test graceful handling when provider is temporarily unavailable."""
        mock_service = MagicMock()
        mock_service.search_jobs.side_effect = ProviderUnavailableError(
            provider="adzuna", message="503 Service Unavailable"
        )
        mock_get_service.return_value = mock_service

        summary = fetch_and_store_jobs(
            keywords=["Backend Developer"],
            locations=["Pune"],
            max_pages_per_query=1,
            auto_trigger_processing=False,
        )

        assert summary["status"] == "completed"
        assert summary["total_created"] == 0
        assert summary["errors_count"] > 0


@pytest.mark.django_db
class TestProcessingTask:
    """Tests for the process_unprocessed_jobs Celery task."""

    def test_process_unprocessed_jobs(self):
        """Test entity extraction processing on pending JobPosting records."""
        job = JobPosting.objects.create(
            title="Senior Python Backend Developer",
            company="ScaleWorks",
            description="Must know Python, Django, Docker, and PostgreSQL.",
            location_city="Bengaluru",
            source_url="https://example.com/proc/1",
            source_provider="adzuna",
            source_id="proc-1",
            is_processed=False,
        )

        result = process_unprocessed_jobs(batch_size=10, populate_graph=False)
        assert result["status"] == "completed"
        assert result["processed_count"] == 1

        job.refresh_from_db()
        assert job.is_processed is True
        assert job.processed_at is not None
        assert "Python" in job.extracted_skills
        assert "Django" in job.extracted_skills
        assert job.extracted_role == "Backend Developer"

    def test_process_when_no_unprocessed_jobs(self):
        """Test processing task when there are no pending records."""
        result = process_unprocessed_jobs()
        assert result["status"] == "idle"
        assert result["processed_count"] == 0


@pytest.mark.django_db
class TestIngestJobsCommand:
    """Tests for the ingest_jobs management command."""

    @patch("tasks.ingestion.get_job_service")
    def test_ingest_jobs_command_execution(
        self, mock_get_service, mock_job_listings
    ):
        """Test calling manage.py ingest_jobs."""
        mock_service = MagicMock()
        mock_service.search_jobs.return_value = mock_job_listings
        mock_get_service.return_value = mock_service

        call_command(
            "ingest_jobs",
            keywords="Python Developer",
            locations="Bengaluru",
            pages=1,
            no_process=True,
        )

        assert JobPosting.objects.count() == 2
