"""
Unit tests for InterviewService (TASK-054).
Validates question generation, answer evaluation, session summary synthesis,
and offline fallback modes (U-42 to U-48).
"""
from unittest.mock import MagicMock, patch
import pytest

from apps.interviews.models import InterviewQuestion
from services.interview_service import InterviewService


@pytest.fixture
def mock_graph_service():
    """Mock GraphService returning simulated role skills."""
    service = MagicMock()
    service.get_skills_for_role.return_value = [
        {"skill": "Python", "category": "Languages", "frequency": 45},
        {"skill": "Django", "category": "Frameworks", "frequency": 38},
        {"skill": "PostgreSQL", "category": "Databases", "frequency": 30},
        {"skill": "Docker", "category": "DevOps", "frequency": 25},
    ]
    return service


@pytest.fixture
def mock_llm_service():
    """Mock LLMService simulating Ollama responses and fallback conditions."""
    service = MagicMock()
    service.fallback_mode = False
    service.is_available.return_value = True
    service.load_prompt.return_value = "Formatted prompt"
    return service


@pytest.fixture
def interview_service(mock_graph_service, mock_llm_service):
    """InterviewService initialized with mocked dependencies."""
    return InterviewService(graph_service=mock_graph_service, llm_service=mock_llm_service)


class TestInterviewServiceQuestionGeneration:
    """Test suite for role question generation and graph grounding."""

    def test_u42_get_skills_for_role_from_graph(self, interview_service, mock_graph_service):
        """U-42: Verifies skills are retrieved from knowledge graph for role."""
        skills = interview_service.get_skills_for_role("Backend Developer", limit=4)
        assert len(skills) == 4
        assert "Python" in skills
        assert "Django" in skills
        assert mock_graph_service.get_skills_for_role.called

    def test_u42_generate_questions_with_llm(self, interview_service, mock_llm_service):
        """U-42: Generates structured questions when LLM returns valid JSON array."""
        mock_llm_service.generate.return_value = """
        [
            {
                "order": 1,
                "skill_focus": "Python",
                "difficulty": "intermediate",
                "question_text": "Explain how Python handles memory management and reference counting.",
                "expected_points": ["Reference counting", "Cyclic garbage collector", "Generational GC"]
            },
            {
                "order": 2,
                "skill_focus": "Django",
                "difficulty": "intermediate",
                "question_text": "What is the difference between select_related and prefetch_related in Django ORM?",
                "expected_points": ["select_related does SQL JOIN", "prefetch_related executes separate queries", "M2M vs ForeignKey"]
            }
        ]
        """

        questions = interview_service.generate_questions("Backend Developer", num_questions=2)
        assert len(questions) == 2
        assert questions[0]["order"] == 1
        assert questions[0]["skill_focus"] == "Python"
        assert "reference counting" in questions[0]["question_text"].lower()
        assert len(questions[0]["expected_points"]) == 3

    def test_u43_fallback_questions_when_llm_offline(self, interview_service, mock_llm_service):
        """U-43: Generates deterministic fallback questions when LLM is unavailable."""
        mock_llm_service.is_available.return_value = False
        mock_llm_service.fallback_mode = True

        questions = interview_service.generate_questions("Backend Developer", num_questions=3)
        assert len(questions) == 3
        assert questions[0]["order"] == 1
        assert questions[0]["skill_focus"] != ""
        assert len(questions[0]["expected_points"]) >= 2

    def test_u47_graph_failure_resilience(self, mock_llm_service):
        """U-47: Gracefully falls back to default role skills if graph query fails."""
        failing_graph = MagicMock()
        failing_graph.get_skills_for_role.side_effect = Exception("Neo4j connection dropped")

        svc = InterviewService(graph_service=failing_graph, llm_service=mock_llm_service)
        skills = svc.get_skills_for_role("Backend Developer", limit=5)
        assert len(skills) >= 3
        assert "Python" in skills


class TestInterviewServiceAnswerEvaluation:
    """Test suite for candidate response evaluation."""

    def test_u44_evaluate_answer_with_llm(self, interview_service, mock_llm_service):
        """U-44: Evaluates candidate answer and parses score, accuracy, and feedback."""
        mock_llm_service.generate.return_value = """
        {
            "score": 88,
            "technical_accuracy": "Accurate explanation of GIL and threading constraints.",
            "depth": "Strong understanding of I/O versus CPU bottlenecks.",
            "strengths": ["Correctly identified that I/O operations release GIL", "Suggested multiprocessing for CPU tasks"],
            "improvements": ["Could mention subinterpreters (PEP 554)"],
            "ideal_answer": "In Python, the GIL restricts bytecode execution to one native thread at a time."
        }
        """

        evaluation = interview_service.evaluate_answer(
            role_title="Backend Developer",
            question_text="Explain Python GIL.",
            skill_focus="Python",
            expected_points=["GIL prevents true multithreading for CPU tasks"],
            user_answer="The GIL is a mutex in CPython that prevents multiple native threads from executing Python bytecodes at once.",
        )

        assert evaluation["score"] == 88
        assert "strengths" in evaluation
        assert "improvements" in evaluation
        assert "ideal_answer" in evaluation

    def test_u45_empty_or_trivial_answer_scores_zero(self, interview_service):
        """U-45: Empty or trivial answers (<10 chars) immediately receive score 0 without LLM call."""
        eval1 = interview_service.evaluate_answer("Backend", "Q", "Python", [], "")
        assert eval1["score"] == 0
        assert "No substantive response" in eval1["technical_accuracy"]

        eval2 = interview_service.evaluate_answer("Backend", "Q", "Python", [], "i dunno")
        assert eval2["score"] == 0

    def test_u45_fallback_answer_evaluation(self, interview_service, mock_llm_service):
        """U-45: Evaluates answer via heuristic fallback when LLM is unavailable."""
        mock_llm_service.is_available.return_value = False
        mock_llm_service.fallback_mode = True

        eval_res = interview_service.evaluate_answer(
            role_title="Backend Developer",
            question_text="Explain Python GIL.",
            skill_focus="Python",
            expected_points=["multiprocessing", "bytecode", "threads", "mutex"],
            user_answer=(
                "The Global Interpreter Lock is a mutex in CPython ensuring only one thread executes bytecode. "
                "For CPU-heavy tasks, you should use multiprocessing to bypass the GIL."
            ),
        )

        assert 50 <= eval_res["score"] <= 100
        assert len(eval_res["strengths"]) >= 1
        assert len(eval_res["improvements"]) >= 1


class TestInterviewServiceSummarySynthesis:
    """Test suite for session summary and readiness scoring."""

    def test_u46_generate_session_summary(self, interview_service, mock_llm_service):
        """U-46: Generates overall readiness score and synthesis report."""
        q1 = MagicMock(spec=InterviewQuestion)
        q1.skill_focus = "Python"
        q1.score = 85
        q1.evaluation = {"strengths": ["Clear explanation"]}

        q2 = MagicMock(spec=InterviewQuestion)
        q2.skill_focus = "PostgreSQL"
        q2.score = 75
        q2.evaluation = {"strengths": ["Indexed queries"]}

        mock_llm_service.generate.return_value = """
        {
            "readiness_level": "Ready for Interviews",
            "summary_verdict": "Candidate demonstrated strong engineering grasp of backend systems.",
            "key_strengths": ["Clean concurrency explanation", "Solid indexing strategy"],
            "areas_for_growth": ["Add deeper discussion of distributed caching"],
            "recommended_skills_to_review": ["Redis", "Kafka"]
        }
        """

        summary = interview_service.generate_session_summary("Backend Developer", [q1, q2])
        assert summary["readiness_level"] == "Ready for Interviews"
        assert summary["overall_score"] == 80.0
        assert "key_strengths" in summary
        assert "areas_for_growth" in summary

    def test_u46_empty_session_summary(self, interview_service):
        """U-46: Generates empty session warning when no questions answered."""
        summary = interview_service.generate_session_summary("Backend Developer", [])
        assert summary["readiness_level"] == "Foundational Study Needed"
        assert summary["overall_score"] == 0.0
