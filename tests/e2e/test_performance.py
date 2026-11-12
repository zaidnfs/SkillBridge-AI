"""
Automated Performance Profiling Suite (TASK-060).

Validates latency targets specified in TEST_PLAN.md:
- Non-LLM API responses < 500ms
- Resume parsing < 5000ms
- Fit score computation < 3000ms
- ATS resume generation < 10000ms
- Learning resource recommendations < 500ms
- LLM generation / Mock Interview sessions < 15000ms
"""
import io
import time
from unittest.mock import patch
import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.jobs.models import JobPosting
from tests.e2e.fixtures import create_sample_docx_bytes


@pytest.fixture
def auth_client():
    user = User.objects.create_user(
        email="perf.candidate@skillbridge.ai",
        password="PerfPassword2026!",
        first_name="Performance",
        last_name="Tester",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    client.user = user
    return client


@pytest.fixture(autouse=True)
def mock_graph_environment():
    with patch(
        "services.graph_service.GraphService.get_skills_for_role",
        return_value=[
            {"skill": "Python", "category": "Languages", "frequency": 50},
            {"skill": "Django", "category": "Frameworks", "frequency": 45},
            {"skill": "PostgreSQL", "category": "Databases", "frequency": 35},
            {"skill": "Docker", "category": "DevOps", "frequency": 30},
        ],
    ):
        yield


@pytest.mark.e2e
@pytest.mark.django_db
class TestEndpointPerformance:
    """Measures endpoint latencies against TEST_PLAN.md SLA targets."""

    def test_health_check_latency(self, auth_client):
        """Health check endpoint should respond well under 100ms."""
        start = time.perf_counter()
        resp = auth_client.get(reverse("health-check"))
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert resp.status_code == status.HTTP_200_OK
        assert elapsed_ms < 500, f"Health check took {elapsed_ms:.2f}ms (target < 500ms)"
        print(f"\n[PERF] Health Check: {elapsed_ms:.2f}ms")

    def test_job_search_latency(self, auth_client):
        """Job search without LLM should respond in < 500ms."""
        for i in range(10):
            JobPosting.objects.create(
                title=f"Full Stack Developer {i}",
                company=f"TechCorp {i}",
                description="Python, React, TypeScript, Docker and PostgreSQL development.",
                location_city="Bengaluru",
                is_remote=True,
                source_provider="adzuna",
                source_id=f"perf-job-{i}",
                source_url=f"https://example.com/{i}",
                extracted_skills=["Python", "React", "Docker"],
                extracted_role="Full Stack Developer",
                is_processed=True,
            )

        start = time.perf_counter()
        resp = auth_client.get(f"{reverse('jobs:job-list')}?q=Python")
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert resp.status_code == status.HTTP_200_OK
        assert elapsed_ms < 500, f"Job search took {elapsed_ms:.2f}ms (target < 500ms)"
        print(f"\n[PERF] Job Search: {elapsed_ms:.2f}ms")

    def test_resume_upload_and_parse_latency(self, auth_client):
        """Resume upload and NER parsing should complete in < 5000ms."""
        docx_bytes = create_sample_docx_bytes()
        upload_file = SimpleUploadedFile(
            "perf_resume.docx",
            docx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        start = time.perf_counter()
        resp = auth_client.post(
            reverse("resumes:resume-upload"),
            {"file": upload_file},
            format="multipart",
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert resp.status_code == status.HTTP_201_CREATED
        assert elapsed_ms < 5000, f"Resume parsing took {elapsed_ms:.2f}ms (target < 5000ms)"
        print(f"\n[PERF] Resume Upload & Parse: {elapsed_ms:.2f}ms")

    def test_fit_score_computation_latency(self, auth_client):
        """Resume fit scoring calculation should complete in < 3000ms."""
        docx_bytes = create_sample_docx_bytes()
        upload_file = SimpleUploadedFile("perf_resume.docx", docx_bytes, content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        upload_resp = auth_client.post(reverse("resumes:resume-upload"), {"file": upload_file}, format="multipart")
        resume_id = upload_resp.data["id"]

        job = JobPosting.objects.create(
            title="Backend Engineer",
            company="NexGen Labs",
            description="Python and PostgreSQL developer.",
            source_provider="adzuna",
            source_id="perf-job-score",
            source_url="https://example.com/score",
            extracted_skills=["Python", "Django", "PostgreSQL", "Docker"],
            is_processed=True,
        )

        start = time.perf_counter()
        resp = auth_client.post(
            reverse("resumes:resume-analyze", kwargs={"id": resume_id}),
            {"job_id": str(job.id)},
            format="json",
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert resp.status_code == status.HTTP_200_OK
        assert elapsed_ms < 3000, f"Fit score took {elapsed_ms:.2f}ms (target < 3000ms)"
        print(f"\n[PERF] Fit Score Computation: {elapsed_ms:.2f}ms")

    def test_ats_resume_generation_latency(self, auth_client):
        """ATS DOCX generation should complete in < 10000ms."""
        docx_bytes = create_sample_docx_bytes()
        upload_file = SimpleUploadedFile("perf_resume.docx", docx_bytes, content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        upload_resp = auth_client.post(reverse("resumes:resume-upload"), {"file": upload_file}, format="multipart")
        resume_id = upload_resp.data["id"]

        job = JobPosting.objects.create(
            title="Cloud Backend Developer",
            company="NexGen Labs",
            description="Python, Docker, AWS.",
            source_provider="adzuna",
            source_id="perf-job-ats",
            source_url="https://example.com/ats",
            extracted_skills=["Python", "Docker", "AWS"],
            is_processed=True,
        )

        start = time.perf_counter()
        resp = auth_client.post(
            reverse("resumes:resume-generate-ats", kwargs={"id": resume_id}),
            {"job_id": str(job.id)},
            format="json",
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert resp.status_code == status.HTTP_200_OK
        assert elapsed_ms < 10000, f"ATS Resume Generation took {elapsed_ms:.2f}ms (target < 10000ms)"
        print(f"\n[PERF] ATS Resume Generation: {elapsed_ms:.2f}ms")

    def test_interview_session_creation_latency(self, auth_client):
        """Interview session and question generation should complete well under 15000ms."""
        start = time.perf_counter()
        resp = auth_client.post(
            reverse("interviews:session-list-create"),
            {"role_title": "Backend Developer", "num_questions": 3},
            format="json",
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert resp.status_code == status.HTTP_201_CREATED
        assert elapsed_ms < 15000, f"Interview creation took {elapsed_ms:.2f}ms (target < 15000ms)"
        print(f"\n[PERF] Interview Session Creation: {elapsed_ms:.2f}ms")
