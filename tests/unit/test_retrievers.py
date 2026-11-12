"""
Unit tests for GraphRetriever and VectorRetriever (TASK-024, TASK-025, TASK-028).
"""
import pytest
from unittest.mock import MagicMock

from services.retrievers.graph_retriever import GraphRetriever, get_graph_retriever
from services.retrievers.vector_retriever import VectorRetriever, get_vector_retriever


@pytest.fixture
def mock_graph_service():
    """Mock GraphService for testing GraphRetriever queries."""
    service = MagicMock()
    return service


@pytest.fixture
def mock_vector_service():
    """Mock VectorService for testing VectorRetriever similarity queries."""
    service = MagicMock()
    return service


@pytest.fixture
def mock_embedding_service():
    """Mock EmbeddingService for generating test query vectors."""
    service = MagicMock()
    service.dimension = 384
    service.generate_embedding.return_value = [0.05] * 384
    return service


class TestGraphRetriever:
    """Unit tests for GraphRetriever Neo4j querying and formatting."""

    def test_get_skills_for_role(self, mock_graph_service):
        """
        Verify GraphRetriever executes GraphService.get_skills_for_role.
        """
        mock_graph_service.get_skills_for_role.return_value = [
            {"skill": "Python", "frequency": 45, "importance": "high"},
            {"skill": "Django", "frequency": 30, "importance": "medium"},
            {"skill": "Docker", "frequency": 25, "importance": "medium"},
        ]

        retriever = GraphRetriever(graph_service=mock_graph_service)
        results = retriever.retrieve_skills_by_role("Backend Developer", limit=10)

        assert len(results) == 3
        assert results[0]["skill"] == "Python"
        assert results[0]["frequency"] == 45
        mock_graph_service.get_skills_for_role.assert_called_once_with(
            role_name="Backend Developer", limit=10
        )

    def test_get_related_skills(self, mock_graph_service):
        """
        Verify GraphRetriever calls GraphService.get_related_skills.
        """
        mock_graph_service.get_related_skills.return_value = [
            {"related_skill": "PostgreSQL", "co_occurrence_count": 18},
            {"related_skill": "FastAPI", "co_occurrence_count": 12},
        ]

        retriever = GraphRetriever(graph_service=mock_graph_service)
        results = retriever.retrieve_related_skills("Python", limit=5)

        assert len(results) == 2
        assert results[0]["related_skill"] == "PostgreSQL"
        assert results[0]["co_occurrence_count"] == 18
        mock_graph_service.get_related_skills.assert_called_once_with(
            skill_name="Python", limit=5
        )

    def test_retrieve_top_demanded_skills(self, mock_graph_service):
        """
        Verify GraphRetriever calls GraphService.get_top_demanded_skills.
        """
        mock_graph_service.get_top_demanded_skills.return_value = [
            {"skill": "Python", "job_count": 90},
            {"skill": "SQL", "job_count": 80},
        ]

        retriever = GraphRetriever(graph_service=mock_graph_service)
        results = retriever.retrieve_top_demanded_skills(limit=10)

        assert len(results) == 2
        assert results[0]["skill"] == "Python"
        mock_graph_service.get_top_demanded_skills.assert_called_once_with(limit=10)

    def test_get_role_summary(self, mock_graph_service):
        """
        Verify GraphRetriever aggregates role demand and top skills into a summary.
        """
        mock_graph_service.execute_query.return_value = [
            {
                "canonical_role": "Data Scientist",
                "total_jobs": 82,
                "top_skills": ["Python", "PyTorch"],
                "top_companies": ["Google", "Meta"],
                "top_locations": ["Bengaluru"],
            }
        ]

        retriever = GraphRetriever(graph_service=mock_graph_service)
        summary = retriever.retrieve_role_summary("Data Scientist")

        assert summary["canonical_role"] == "Data Scientist"
        assert summary["total_jobs"] == 82
        assert len(summary["top_skills"]) == 2
        assert summary["top_skills"][0] == "Python"

    def test_format_for_context(self, mock_graph_service):
        """
        Verify format_for_context converts structured graph data to readable text.
        """
        retriever = GraphRetriever(graph_service=mock_graph_service)
        data = [
            {"skill": "Python", "frequency": 50, "category": "Backend"},
            {"skill": "Django", "frequency": 35, "category": "Framework"},
        ]
        context = retriever.format_for_context(skills_data=data)

        assert "Demanded Skills Breakdown" in context
        assert "Python" in context
        assert "50 job posting(s)" in context
        assert "Django" in context

    def test_format_for_context_empty(self, mock_graph_service):
        """
        Verify format_for_context handles empty data gracefully.
        """
        retriever = GraphRetriever(graph_service=mock_graph_service)
        context = retriever.format_for_context(skills_data=[])
        assert "No specific structured Knowledge Graph entities found" in context

    def test_get_graph_retriever_singleton(self):
        """
        Verify factory get_graph_retriever returns a working instance.
        """
        r1 = get_graph_retriever()
        r2 = get_graph_retriever()
        assert r1 is r2


class TestVectorRetriever:
    """Unit tests for VectorRetriever Qdrant querying and formatting."""

    def test_retrieve_similar_jobs(self, mock_vector_service, mock_embedding_service):
        """
        Verify VectorRetriever embeds user query and calls VectorService.search.
        """
        mock_vector_service.search.return_value = [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "score": 0.88,
                "payload": {
                    "title": "Senior Python Architect",
                    "company": "Tech Innovations",
                    "skills": ["Python", "Django", "AWS"],
                    "location_city": "Bengaluru",
                },
            },
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "score": 0.81,
                "payload": {
                    "title": "Backend Python Developer",
                    "company": "DataCorp",
                    "skills": ["Python", "FastAPI"],
                    "location_city": "Hyderabad",
                },
            },
        ]

        retriever = VectorRetriever(
            vector_service=mock_vector_service,
            embedding_service=mock_embedding_service,
        )
        results = retriever.retrieve_similar_jobs(
            query="Python backend engineer working with Django or FastAPI",
            limit=5,
            score_threshold=0.75,
        )

        assert len(results) == 2
        assert results[0]["payload"]["title"] == "Senior Python Architect"
        assert results[0]["score"] == 0.88
        assert "Python" in results[0]["payload"]["skills"]

        mock_embedding_service.generate_embedding.assert_called_once()
        mock_vector_service.search.assert_called_once()
        _, kwargs = mock_vector_service.search.call_args
        assert kwargs["limit"] == 5
        assert kwargs["score_threshold"] == 0.75

    def test_format_for_context(self, mock_vector_service, mock_embedding_service):
        """
        Verify format_for_context converts vector search results into LLM readable text.
        """
        retriever = VectorRetriever(
            vector_service=mock_vector_service,
            embedding_service=mock_embedding_service,
        )
        results = [
            {
                "id": "abc-123",
                "score": 0.91,
                "payload": {
                    "title": "Lead DevOps Engineer",
                    "company": "CloudNine",
                    "location_city": "Pune",
                    "skills": ["Terraform", "Kubernetes", "AWS"],
                },
            }
        ]
        context = retriever.format_for_context(results)

        assert "Lead DevOps Engineer" in context
        assert "CloudNine" in context
        assert "0.91" in context
        assert "Terraform" in context

    def test_format_for_context_empty(self, mock_vector_service, mock_embedding_service):
        """
        Verify format_for_context handles empty search hits gracefully.
        """
        retriever = VectorRetriever(
            vector_service=mock_vector_service,
            embedding_service=mock_embedding_service,
        )
        context = retriever.format_for_context([])
        assert "No matching active job postings" in context

    def test_get_vector_retriever_singleton(self):
        """
        Verify factory get_vector_retriever returns a working instance.
        """
        r1 = get_vector_retriever()
        r2 = get_vector_retriever()
        assert r1 is r2
