"""
Integration tests for the Resume Module API endpoints (TASK-030, TASK-035, TASK-036).
Covers test plan cases I-07, I-08, user data isolation, authentication, and file validation.
"""
import io
import pytest
import docx
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.jobs.models import JobPosting
from apps.resumes.models import Resume


@pytest.fixture
def valid_docx_file():
    """Generate a valid DOCX file for testing uploads."""
    doc = docx.Document()
    doc.add_paragraph("Alice Walker - Senior Python Architect")
    doc.add_paragraph("Email: alice.walker@example.com | Phone: 9876543210")
    doc.add_paragraph("Summary: Cloud architect specializing in Python, Django, Docker, and PostgreSQL.")
    doc.add_paragraph("Technical Skills: Python, Django, Docker, PostgreSQL, Redis, AWS")
    doc.add_paragraph("Experience: Architected microservices at CloudScale.")
    doc.add_paragraph("Education: BS in Computer Science.")

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return SimpleUploadedFile(
        "alice_walker_resume.docx",
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@pytest.fixture
def user_b_client(create_user, default_password):
    """An authenticated API client for a separate user (User B)."""
    user_b = create_user(
        email="user_b@example.com",
        password=default_password,
        first_name="User",
        last_name="B",
    )
    client = APIClient()
    refresh = RefreshToken.for_user(user_b)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    client.user = user_b
    return client


@pytest.fixture
def sample_job_posting():
    """Create a sample JobPosting in the database for fit scoring."""
    return JobPosting.objects.create(
        title="Backend Python Developer",
        company="NexTech Solutions",
        description="Looking for an experienced Python developer skilled in Django, Docker, and PostgreSQL.",
        location_city="Bengaluru",
        location_country="India",
        is_remote=True,
        source_provider="adzuna",
        source_id="test-job-resume-001",
        source_url="https://example.com/job/001",
        extracted_skills=["Python", "Django", "Docker", "PostgreSQL"],
        extracted_role="Backend Developer",
        is_processed=True,
    )


@pytest.mark.django_db
class TestResumeAPIIntegration:
    """Integration test suite for the Resume module REST API."""

    upload_url = reverse("resumes:resume-upload")
    list_url = reverse("resumes:resume-list")

    def test_i07_upload_parse_and_fit_score(
        self, auth_client, valid_docx_file, sample_job_posting
    ):
        """
        I-07: Upload resume -> Parse -> Select job -> Fit score returned via API.
        """
        # 1. Upload resume
        upload_resp = auth_client.post(
            self.upload_url,
            {"file": valid_docx_file},
            format="multipart",
        )
        assert upload_resp.status_code == status.HTTP_201_CREATED
        resume_id = upload_resp.data["id"]
        assert upload_resp.data["is_parsed"] is True
        assert "Python" in upload_resp.data["skills"]

        # 2. Select job and analyze fit score
        analyze_url = reverse("resumes:resume-analyze", kwargs={"id": resume_id})
        analyze_resp = auth_client.post(
            analyze_url,
            {"job_id": str(sample_job_posting.id)},
            format="json",
        )

        assert analyze_resp.status_code == status.HTTP_200_OK
        data = analyze_resp.data
        assert data["resume_id"] == resume_id
        assert data["job_id"] == str(sample_job_posting.id)
        assert data["fit_score"] >= 80.0  # Alice has Python, Django, Docker, PostgreSQL
        assert "Python" in data["matched_skills"]
        assert "Django" in data["matched_skills"]
        assert len(data["missing_skills"]) == 0
        assert "recommendations" in data

    def test_i08_upload_and_generate_ats_resume_download(
        self, auth_client, valid_docx_file, sample_job_posting
    ):
        """
        I-08: Upload resume -> Generate ATS resume -> Download valid DOCX.
        """
        # 1. Upload resume
        upload_resp = auth_client.post(
            self.upload_url,
            {"file": valid_docx_file},
            format="multipart",
        )
        assert upload_resp.status_code == status.HTTP_201_CREATED
        resume_id = upload_resp.data["id"]

        # 2. Generate ATS resume
        ats_url = reverse("resumes:resume-generate-ats", kwargs={"id": resume_id})
        ats_resp = auth_client.post(
            ats_url,
            {"job_id": str(sample_job_posting.id)},
            format="json",
        )

        assert ats_resp.status_code == status.HTTP_200_OK
        assert (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            in ats_resp["Content-Type"]
        )
        assert "attachment;" in ats_resp["Content-Disposition"]

        # Verify returned byte stream is a valid DOCX file
        doc = docx.Document(io.BytesIO(ats_resp.content))
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "PROFESSIONAL SUMMARY" in full_text
        assert "TECHNICAL SKILLS" in full_text
        assert "Python" in full_text

    def test_unauthenticated_requests_rejected(self, api_client, valid_docx_file):
        """
        Verify unauthenticated requests return 401 Unauthorized across all endpoints.
        """
        assert api_client.post(self.upload_url, {"file": valid_docx_file}).status_code == 401
        assert api_client.get(self.list_url).status_code == 401

    def test_user_data_isolation(self, auth_client, user_b_client, valid_docx_file):
        """
        Verify strict user data isolation: User B cannot view, analyze, delete,
        or download User A's resume.
        """
        # User A uploads a resume
        upload_resp = auth_client.post(
            self.upload_url,
            {"file": valid_docx_file},
            format="multipart",
        )
        resume_id = upload_resp.data["id"]

        detail_url = reverse("resumes:resume-detail", kwargs={"id": resume_id})
        analyze_url = reverse("resumes:resume-analyze", kwargs={"id": resume_id})
        ats_url = reverse("resumes:resume-generate-ats", kwargs={"id": resume_id})

        # User B attempts to access User A's resume
        assert user_b_client.get(detail_url).status_code == 404
        assert user_b_client.post(analyze_url, {"job_required_skills": ["Python"]}).status_code == 404
        assert user_b_client.post(ats_url, {}).status_code == 404
        assert user_b_client.delete(detail_url).status_code == 404

        # User B's list should be empty
        list_resp = user_b_client.get(self.list_url)
        assert list_resp.status_code == 200
        assert len(list_resp.data["results"]) == 0 if "results" in list_resp.data else len(list_resp.data) == 0

    def test_oversized_file_rejected(self, auth_client):
        """
        Verify that files exceeding the 5MB size limit are rejected with 400 Bad Request.
        """
        large_content = b"x" * (6 * 1024 * 1024)  # 6 MB
        oversized_file = SimpleUploadedFile("large_resume.pdf", large_content, content_type="application/pdf")

        response = auth_client.post(self.upload_url, {"file": oversized_file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "file" in response.data
        assert "5MB" in str(response.data["file"])

    def test_unsupported_extension_rejected(self, auth_client):
        """
        Verify that unsupported file types (e.g. .txt, .exe) return 400 Bad Request.
        """
        txt_file = SimpleUploadedFile("resume.txt", b"plain text resume", content_type="text/plain")
        response = auth_client.post(self.upload_url, {"file": txt_file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "file" in response.data

    def test_corrupted_file_upload_rejected(self, auth_client):
        """
        Verify that corrupted PDF files are caught and return 400 Bad Request without crashing.
        """
        corrupted_file = SimpleUploadedFile(
            "broken_resume.pdf",
            b"not a valid pdf header",
            content_type="application/pdf",
        )
        response = auth_client.post(self.upload_url, {"file": corrupted_file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data
