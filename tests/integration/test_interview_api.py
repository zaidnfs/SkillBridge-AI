"""
Integration tests for Interview API endpoints (TASK-054).
Validates session creation, answer submissions, LLM evaluations, session summaries,
and user-level access isolation (I-09 to I-15).
"""
import uuid
from unittest.mock import MagicMock, patch
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.interviews.models import InterviewSession, InterviewQuestion


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        email="interview.candidate@example.com",
        password="SecureCandidatePass123!",
        first_name="Candidate",
        last_name="One",
    )


@pytest.fixture
def other_user():
    return User.objects.create_user(
        email="other.student@example.com",
        password="SecureOtherPass123!",
        first_name="Candidate",
        last_name="Two",
    )


@pytest.fixture
def authenticated_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


@pytest.fixture(autouse=True)
def mock_graph_environment():
    """Mock graph service skills for role retrieval so tests run instantly without Neo4j network timeout."""
    with patch(
        "services.graph_service.GraphService.get_skills_for_role",
        return_value=[
            {"skill": "Python", "category": "Languages", "frequency": 42},
            {"skill": "Django", "category": "Frameworks", "frequency": 35},
            {"skill": "PostgreSQL", "category": "Databases", "frequency": 28},
            {"skill": "Docker", "category": "DevOps", "frequency": 22},
        ],
    ):
        yield


@pytest.mark.django_db
class TestInterviewAPIEndpoints:
    """Integration test suite for /api/interviews/ endpoints."""

    def test_i09_create_interview_session(self, authenticated_client, auth_user):
        """I-09: Create session generates questions and hides expected points until answered."""
        payload = {
            "role_title": "Backend Developer",
            "target_skills": ["Python", "PostgreSQL"],
            "num_questions": 3,
            "difficulty": "intermediate",
        }

        response = authenticated_client.post("/api/interviews/sessions/", payload, format="json")
        assert response.status_code == 201
        data = response.data

        assert "id" in data
        assert data["role_title"] == "Backend Developer"
        assert data["status"] == "in_progress"
        assert data["total_questions"] == 3
        assert len(data["questions"]) == 3

        # Security check: expected_points must be redacted before answering
        for q in data["questions"]:
            assert q["expected_points"] == []
            assert q["score"] is None
            assert q["user_answer"] == ""

        # Verify database record
        session = InterviewSession.objects.get(id=data["id"])
        assert session.user == auth_user
        assert session.questions.count() == 3

    def test_i10_submit_answer_and_evaluate(self, authenticated_client, auth_user):
        """I-10: Submitting an answer triggers evaluation and updates session progress."""
        # Create session
        create_res = authenticated_client.post(
            "/api/interviews/sessions/",
            {"role_title": "Backend Developer", "num_questions": 2},
            format="json",
        )
        assert create_res.status_code == 201
        session_id = create_res.data["id"]
        q1_id = create_res.data["questions"][0]["id"]

        # Submit answer
        answer_payload = {
            "question_id": q1_id,
            "answer": (
                "The Global Interpreter Lock prevents multiple native threads from executing "
                "Python bytecode at once. For I/O-bound operations threading is fine because the GIL is released, "
                "while for CPU-bound tasks multiprocessing should be used."
            ),
        }

        answer_res = authenticated_client.post(
            f"/api/interviews/sessions/{session_id}/answer/",
            answer_payload,
            format="json",
        )
        assert answer_res.status_code == 200
        data = answer_res.data

        # Verify evaluated question details
        evaluated_q = data["evaluated_question"]
        assert evaluated_q["id"] == q1_id
        assert evaluated_q["score"] is not None
        assert evaluated_q["score"] >= 20
        assert "strengths" in evaluated_q["evaluation"]
        assert "improvements" in evaluated_q["evaluation"]
        # Expected points now visible because question is answered
        assert len(evaluated_q["expected_points"]) >= 1

        # Verify session state advanced
        session_data = data["session"]
        assert session_data["current_question_index"] == 1
        assert session_data["overall_score"] is not None
        assert data["is_completed"] is False

    def test_i11_complete_all_questions_completes_session(self, authenticated_client):
        """I-11: Answering all questions automatically completes session and generates summary."""
        create_res = authenticated_client.post(
            "/api/interviews/sessions/",
            {"role_title": "Frontend Developer", "num_questions": 1},
            format="json",
        )
        assert create_res.status_code == 201
        session_id = create_res.data["id"]
        q_id = create_res.data["questions"][0]["id"]

        # Answer the only question
        ans_res = authenticated_client.post(
            f"/api/interviews/sessions/{session_id}/answer/",
            {
                "question_id": q_id,
                "answer": (
                    "React uses Virtual DOM diffing to reconcile UI changes efficiently with keys. "
                    "To prevent unnecessary renders, use useCallback, useMemo, and avoid inline function declarations."
                ),
            },
            format="json",
        )
        assert ans_res.status_code == 200
        assert ans_res.data["is_completed"] is True
        assert ans_res.data["session"]["status"] == "completed"

        summary = ans_res.data["session"]["summary_feedback"]
        assert "readiness_level" in summary
        assert "summary_verdict" in summary
        assert "recommended_skills_to_review" in summary

    def test_i12_user_isolation_prevent_idor(self, api_client, auth_user, other_user):
        """I-12: User B cannot access or answer User A's interview session."""
        # Create session as User A
        api_client.force_authenticate(user=auth_user)
        res = api_client.post(
            "/api/interviews/sessions/",
            {"role_title": "Data Scientist", "num_questions": 2},
            format="json",
        )
        session_id = res.data["id"]
        q_id = res.data["questions"][0]["id"]

        # Attempt to access as User B
        api_client.force_authenticate(user=other_user)
        get_res = api_client.get(f"/api/interviews/sessions/{session_id}/")
        assert get_res.status_code == 404

        # Attempt to submit answer as User B
        ans_res = api_client.post(
            f"/api/interviews/sessions/{session_id}/answer/",
            {"question_id": q_id, "answer": "Unauthorized answer attempt"},
            format="json",
        )
        assert ans_res.status_code == 404

        # Attempt to delete as User B
        del_res = api_client.delete(f"/api/interviews/sessions/{session_id}/")
        assert del_res.status_code == 404

    def test_i13_validation_rules(self, authenticated_client):
        """I-13: Rejects invalid payloads, duplicate answers, and completed session mutations."""
        # Test creation with missing role_title
        bad_create = authenticated_client.post("/api/interviews/sessions/", {}, format="json")
        assert bad_create.status_code == 400

        # Create session with 1 question
        session_res = authenticated_client.post(
            "/api/interviews/sessions/",
            {"role_title": "Backend Developer", "num_questions": 1},
            format="json",
        )
        session_id = session_res.data["id"]
        q_id = session_res.data["questions"][0]["id"]

        # Test answer with answer < 10 chars
        bad_answer = authenticated_client.post(
            f"/api/interviews/sessions/{session_id}/answer/",
            {"question_id": q_id, "answer": "short"},
            format="json",
        )
        assert bad_answer.status_code == 400

        # Submit valid answer
        valid_answer = authenticated_client.post(
            f"/api/interviews/sessions/{session_id}/answer/",
            {
                "question_id": q_id,
                "answer": "This is a comprehensive response meeting the 10 character minimum rule.",
            },
            format="json",
        )
        assert valid_answer.status_code == 200

        # Attempt duplicate answer to same question
        dup_answer = authenticated_client.post(
            f"/api/interviews/sessions/{session_id}/answer/",
            {
                "question_id": q_id,
                "answer": "Attempting to overwrite my answer for a higher score.",
            },
            format="json",
        )
        assert dup_answer.status_code == 400

    def test_i14_suggested_roles_endpoint(self, authenticated_client):
        """I-14: Suggested roles endpoint returns role list with skills."""
        res = authenticated_client.get("/api/interviews/roles/")
        assert res.status_code == 200
        roles = res.data.get("roles", [])
        assert len(roles) >= 4
        assert any(r["role_title"] == "Backend Developer" for r in roles)

    def test_i15_unauthenticated_request_rejected(self, api_client):
        """I-15: Anonymous requests to protected interview endpoints return 401."""
        res = api_client.get("/api/interviews/sessions/")
        assert res.status_code == 401
