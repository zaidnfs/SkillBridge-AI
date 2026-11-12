"""
End-to-End User Journey Integration Test (TASK-058).

Validates the complete critical user flow through the API layer:
1. Signup & JWT Authentication
2. Resume Upload & Parsing (NER Skill Extraction)
3. Job Search & Filtering
4. Resume-to-Job Fit Scoring & Skill Gap Identification
5. Curated Learning Resource Recommendations for Skill Gaps
6. ATS-Optimized Resume Generation & Download
7. AI Mock Interview Session Creation (with redacted rubrics)
8. Candidate Answer Submission & Rubric Evaluation
9. Interview Completion & Session Summary Generation
10. Strict Cross-User Data Isolation (IDOR Defense on Resumes, ATS files, and Interviews)
"""
import io
import uuid
from unittest.mock import patch
import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
import docx

from apps.accounts.models import User
from apps.jobs.models import JobPosting
from apps.resumes.models import Resume
from apps.interviews.models import InterviewSession
from tests.e2e.fixtures import create_sample_docx_bytes


@pytest.fixture
def api_client():
    """Unauthenticated DRF API client."""
    return APIClient()


@pytest.fixture(autouse=True)
def mock_graph_environment():
    """Mock graph service skills for role retrieval so tests run deterministically."""
    with patch(
        "services.graph_service.GraphService.get_skills_for_role",
        return_value=[
            {"skill": "Python", "category": "Languages", "frequency": 50},
            {"skill": "Django", "category": "Frameworks", "frequency": 45},
            {"skill": "PostgreSQL", "category": "Databases", "frequency": 35},
            {"skill": "Docker", "category": "DevOps", "frequency": 30},
            {"skill": "Kubernetes", "category": "DevOps", "frequency": 25},
        ],
    ):
        yield


@pytest.mark.e2e
@pytest.mark.django_db
class TestFullUserJourney:
    """Complete E2E validation of the SkillBridge AI core user journey."""

    def test_complete_user_lifecycle_and_cross_user_isolation(self, api_client):
        # ---------------------------------------------------------------------
        # 01. User Registration & Login
        # ---------------------------------------------------------------------
        user_email = "zaid.candidate@skillbridge.ai"
        user_password = "SecurePassword2026!"
        
        register_url = reverse("accounts:register")
        register_payload = {
            "email": user_email,
            "password": user_password,
            "password_confirm": user_password,
            "first_name": "Zaid",
            "last_name": "Alam",
        }
        reg_resp = api_client.post(register_url, register_payload, format="json")
        assert reg_resp.status_code == status.HTTP_201_CREATED, reg_resp.data
        assert "access" in reg_resp.data
        assert "refresh" in reg_resp.data
        assert reg_resp.data["user"]["email"] == user_email

        # Duplicate registration rejection
        dup_resp = api_client.post(register_url, register_payload, format="json")
        assert dup_resp.status_code == status.HTTP_400_BAD_REQUEST

        # Login with valid credentials
        login_url = reverse("accounts:login")
        login_resp = api_client.post(
            login_url,
            {"email": user_email, "password": user_password},
            format="json",
        )
        assert login_resp.status_code == status.HTTP_200_OK
        assert "access" in login_resp.data
        assert "refresh" in login_resp.data
        access_token = login_resp.data["access"]

        # Authenticate client for User A
        client_user_a = APIClient()
        client_user_a.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Verify profile endpoint
        me_resp = client_user_a.get(reverse("accounts:user-profile"))
        assert me_resp.status_code == status.HTTP_200_OK
        assert me_resp.data["email"] == user_email

        # ---------------------------------------------------------------------
        # 02. Resume Upload & Parsing
        # ---------------------------------------------------------------------
        docx_bytes = create_sample_docx_bytes()
        upload_file = SimpleUploadedFile(
            "zaid_alam_resume.docx",
            docx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        upload_url = reverse("resumes:resume-upload")
        upload_resp = client_user_a.post(
            upload_url,
            {"file": upload_file},
            format="multipart",
        )
        assert upload_resp.status_code == status.HTTP_201_CREATED, upload_resp.data
        resume_id = upload_resp.data["id"]
        assert upload_resp.data["is_parsed"] is True
        extracted_skills = upload_resp.data["skills"]
        assert "Python" in extracted_skills
        assert "Django" in extracted_skills

        # Verify resume appears in list
        list_resp = client_user_a.get(reverse("resumes:resume-list"))
        assert list_resp.status_code == status.HTTP_200_OK
        resumes_data = list_resp.data if isinstance(list_resp.data, list) else list_resp.data.get("results", [])
        assert any(r["id"] == resume_id for r in resumes_data)

        # ---------------------------------------------------------------------
        # 03. Job Market Search & Filtering
        # ---------------------------------------------------------------------
        job_target = JobPosting.objects.create(
            title="Senior Backend Python Engineer",
            company="CloudScale Innovations",
            description="Seeking an experienced Python and Django developer. Must know PostgreSQL, Docker, and Kubernetes.",
            location_city="Bengaluru",
            location_country="India",
            is_remote=True,
            source_provider="adzuna",
            source_id="job-e2e-001",
            source_url="https://cloudscale.example.com/jobs/001",
            extracted_skills=["Python", "Django", "PostgreSQL", "Docker", "Kubernetes", "AWS"],
            extracted_role="Backend Developer",
            is_processed=True,
        )

        # Search for jobs
        jobs_url = reverse("jobs:job-list")
        search_resp = client_user_a.get(f"{jobs_url}?q=Backend")
        assert search_resp.status_code == status.HTTP_200_OK
        search_items = search_resp.data if isinstance(search_resp.data, list) else search_resp.data.get("results", [])
        job_ids = [j["id"] for j in search_items]
        assert str(job_target.id) in job_ids

        # Filter by remote
        remote_resp = client_user_a.get(f"{jobs_url}?remote=true")
        assert remote_resp.status_code == status.HTTP_200_OK
        remote_items = remote_resp.data if isinstance(remote_resp.data, list) else remote_resp.data.get("results", [])
        assert len(remote_items) >= 1

        # Retrieve job details
        detail_resp = client_user_a.get(reverse("jobs:job-detail", kwargs={"id": job_target.id}))
        assert detail_resp.status_code == status.HTTP_200_OK
        assert detail_resp.data["title"] == "Senior Backend Python Engineer"

        # ---------------------------------------------------------------------
        # 04. Resume-to-Job Fit Scoring & Skill Gap Analysis
        # ---------------------------------------------------------------------
        analyze_url = reverse("resumes:resume-analyze", kwargs={"id": resume_id})
        analyze_resp = client_user_a.post(
            analyze_url,
            {"job_id": str(job_target.id)},
            format="json",
        )
        assert analyze_resp.status_code == status.HTTP_200_OK, analyze_resp.data
        analysis_data = analyze_resp.data
        assert "fit_score" in analysis_data
        assert 0 <= analysis_data["fit_score"] <= 100
        assert "matched_skills" in analysis_data
        assert "missing_skills" in analysis_data
        assert "Python" in analysis_data["matched_skills"]
        missing_skills = analysis_data["missing_skills"]

        # ---------------------------------------------------------------------
        # 05. Curated Learning Resources for Skill Gaps
        # ---------------------------------------------------------------------
        from django.core.management import call_command
        call_command("seed_learning_resources")

        skills_to_query = missing_skills if missing_skills else ["Docker", "Kubernetes"]
        skills_recommend_url = reverse("skills:skill-recommendations")
        rec_resp = client_user_a.post(
            skills_recommend_url,
            {"skills": skills_to_query, "max_per_skill": 3},
            format="json",
        )
        assert rec_resp.status_code == status.HTTP_200_OK, rec_resp.data
        rec_data = rec_resp.data
        assert "recommendations" in rec_data
        assert "total_skills_queried" in rec_data
        assert rec_data["total_skills_queried"] == len(skills_to_query)
        # Verify recommended resources exist in the dict
        assert len(rec_data["recommendations"]) > 0
        first_skill_key = next(iter(rec_data["recommendations"].keys()))
        first_resources = rec_data["recommendations"][first_skill_key]
        assert len(first_resources) >= 1
        assert "title" in first_resources[0]
        assert "url" in first_resources[0]

        # ---------------------------------------------------------------------
        # 06. ATS Resume Generation & Download
        # ---------------------------------------------------------------------
        generate_ats_url = reverse("resumes:resume-generate-ats", kwargs={"id": resume_id})
        ats_resp = client_user_a.post(
            generate_ats_url,
            {"job_id": str(job_target.id)},
            format="json",
        )
        assert ats_resp.status_code == status.HTTP_200_OK
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in ats_resp["Content-Type"]
        
        # Verify valid docx file content
        ats_docx_stream = io.BytesIO(ats_resp.content)
        parsed_ats_doc = docx.Document(ats_docx_stream)
        paragraphs_text = " ".join(p.text for p in parsed_ats_doc.paragraphs)
        assert "Zaid Alam" in paragraphs_text
        assert "Python" in paragraphs_text

        # ---------------------------------------------------------------------
        # 07. Mock Interview Session Creation
        # ---------------------------------------------------------------------
        interview_create_url = reverse("interviews:session-list-create")
        interview_payload = {
            "role_title": "Backend Developer",
            "target_skills": ["Python", "Django", "PostgreSQL", "Docker"],
            "num_questions": 3,
            "difficulty": "intermediate",
        }
        interview_resp = client_user_a.post(interview_create_url, interview_payload, format="json")
        assert interview_resp.status_code == status.HTTP_201_CREATED, interview_resp.data
        session_id = interview_resp.data["id"]
        assert interview_resp.data["status"] == "in_progress"
        assert interview_resp.data["total_questions"] == 3
        questions = interview_resp.data["questions"]
        assert len(questions) == 3

        # Anti-cheating security validation: expected rubric points must be hidden
        for q in questions:
            assert q["expected_points"] == []
            assert q["score"] is None
            assert q["user_answer"] == ""

        # ---------------------------------------------------------------------
        # 08. Candidate Answer Submission & Rubric Evaluation
        # ---------------------------------------------------------------------
        first_q = questions[0]
        answer_url = reverse("interviews:submit-answer", kwargs={"session_id": session_id})
        candidate_answer = (
            "In Django, the ORM translates Python code to SQL queries. "
            "To prevent N+1 queries, we use select_related for single-valued relationships "
            "and prefetch_related for multi-valued relationships. We can also inspect "
            "execution using django-debug-toolbar and add database indexes."
        )
        ans_resp = client_user_a.post(
            answer_url,
            {"question_id": first_q["id"], "answer": candidate_answer},
            format="json",
        )
        assert ans_resp.status_code == status.HTTP_200_OK, ans_resp.data
        eval_data = ans_resp.data
        assert "evaluated_question" in eval_data
        evaluated_q = eval_data["evaluated_question"]
        assert evaluated_q["id"] == first_q["id"]
        assert evaluated_q["score"] is not None
        assert evaluated_q["score"] >= 0
        assert "evaluation" in evaluated_q
        assert len(evaluated_q["expected_points"]) > 0

        # Duplicate answer submission rejection
        dup_ans_resp = client_user_a.post(
            answer_url,
            {"question_id": first_q["id"], "answer": "Duplicate answer with enough characters"},
            format="json",
        )
        assert dup_ans_resp.status_code == status.HTTP_400_BAD_REQUEST

        # ---------------------------------------------------------------------
        # 09. Complete Interview Session & Summary Generation
        # ---------------------------------------------------------------------
        complete_url = reverse("interviews:complete-session", kwargs={"session_id": session_id})
        complete_resp = client_user_a.post(complete_url, format="json")
        assert complete_resp.status_code == status.HTTP_200_OK, complete_resp.data
        summary_data = complete_resp.data
        assert summary_data["status"] == "completed"
        assert summary_data["overall_score"] is not None
        assert "summary_feedback" in summary_data
        assert "readiness_level" in summary_data["summary_feedback"]
        assert "recommended_skills_to_review" in summary_data["summary_feedback"]

        # ---------------------------------------------------------------------
        # 10. Cross-User Isolation (IDOR Defense Verification)
        # ---------------------------------------------------------------------
        # Register and login User B
        user_b = User.objects.create_user(
            email="attacker.b@skillbridge.ai",
            password="SecureAttackerPassword2026!",
            first_name="Attacker",
            last_name="User",
        )
        client_user_b = APIClient()
        client_user_b.force_authenticate(user=user_b)

        # User B attempts to access User A's resume detail
        idor_resume_resp = client_user_b.get(
            reverse("resumes:resume-detail", kwargs={"id": resume_id})
        )
        assert idor_resume_resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

        # User B attempts to analyze User A's resume
        idor_analyze_resp = client_user_b.post(
            reverse("resumes:resume-analyze", kwargs={"id": resume_id}),
            {"job_id": str(job_target.id)},
            format="json",
        )
        assert idor_analyze_resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

        # User B attempts to generate ATS resume for User A
        idor_ats_resp = client_user_b.post(
            reverse("resumes:resume-generate-ats", kwargs={"id": resume_id}),
            {"job_id": str(job_target.id)},
            format="json",
        )
        assert idor_ats_resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

        # User B attempts to view User A's interview session
        idor_interview_resp = client_user_b.get(
            reverse("interviews:session-detail", kwargs={"session_id": session_id})
        )
        assert idor_interview_resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

        # User B attempts to answer User A's interview session
        idor_answer_resp = client_user_b.post(
            reverse("interviews:submit-answer", kwargs={"session_id": session_id}),
            {"question_id": questions[1]["id"], "answer": "Malicious answer attempting IDOR attack"},
            format="json",
        )
        assert idor_answer_resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

        # User B attempts to complete User A's session
        idor_complete_resp = client_user_b.post(
            reverse("interviews:complete-session", kwargs={"session_id": session_id}),
            format="json",
        )
        assert idor_complete_resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

        # User B attempts to delete User A's session
        idor_delete_resp = client_user_b.delete(
            reverse("interviews:session-detail", kwargs={"session_id": session_id})
        )
        assert idor_delete_resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

        # Verify User A's session still exists safely
        assert InterviewSession.objects.filter(id=session_id).exists()
