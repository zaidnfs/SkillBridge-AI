"""
Integration tests for the Agentic Query System endpoint (TASK-027, TASK-028).
Covers test plan cases I-04, I-05, and I-06, along with authentication and validation checks.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse


@pytest.fixture
def mock_retrieval_environment():
    """
    Mock external Neo4j and Qdrant retrieval services to provide predictable test data
    for integration testing through the DRF endpoint.
    """
    mock_graph_data = [
        {"skill": "Python", "frequency": 42, "category": "Backend"},
        {"skill": "Django", "frequency": 28, "category": "Framework"},
        {"skill": "PostgreSQL", "frequency": 22, "category": "Database"},
    ]
    mock_vector_data = [
        {
            "job_id": "99999999-9999-9999-9999-999999999999",
            "score": 0.89,
            "payload": {
                "title": "Junior Python Developer",
                "company": "NextGen Systems",
                "location_city": "Bengaluru",
                "is_remote": False,
                "skills": ["Python", "Django"],
            },
        }
    ]

    with patch(
        "services.retrievers.graph_retriever.GraphRetriever.retrieve_skills_by_role",
        return_value=mock_graph_data,
    ), patch(
        "services.retrievers.graph_retriever.GraphRetriever.retrieve_top_demanded_skills",
        return_value=mock_graph_data,
    ), patch(
        "services.retrievers.graph_retriever.GraphRetriever.retrieve_related_skills",
        return_value=[{"related_skill": "PostgreSQL", "co_occurrence_count": 12}],
    ), patch(
        "services.retrievers.graph_retriever.GraphRetriever.retrieve_role_summary",
        return_value={
            "canonical_role": "Python Backend Developer",
            "total_jobs": 42,
            "top_skills": ["Python", "Django", "PostgreSQL"],
            "top_companies": ["NextGen Systems"],
            "top_locations": ["Bengaluru"],
        },
    ), patch(
        "services.retrievers.vector_retriever.VectorRetriever.retrieve_similar_jobs",
        return_value=mock_vector_data,
    ):
        yield


@pytest.mark.django_db
class TestAgentQueryIntegration:
    """Integration test suite for POST /api/v1/jobs/query/."""

    endpoint_url = reverse("jobs:job-market-query")

    def test_i04_skill_demand_query(self, auth_client, mock_retrieval_environment):
        """
        I-04: Skill demand query triggers Graph Retriever and returns grounded response.
        """
        payload = {
            "query": "What are the most demanded skills for a Python Backend Developer?"
        }
        response = auth_client.post(self.endpoint_url, data=payload, format="json")

        assert response.status_code == 200
        data = response.json()
        assert data["query"] == payload["query"]
        assert data["strategy"] in ("graph", "hybrid")
        assert len(data["response"]) > 0
        assert "sources" in data
        assert "grounded_facts" in data

    def test_i05_similarity_query(self, auth_client, mock_retrieval_environment):
        """
        I-05: Job similarity query triggers Vector Retriever and returns matching positions.
        """
        payload = {
            "query": "Find job openings for junior developers in Bengaluru working with Django"
        }
        response = auth_client.post(self.endpoint_url, data=payload, format="json")

        assert response.status_code == 200
        data = response.json()
        assert data["query"] == payload["query"]
        assert data["strategy"] in ("vector", "hybrid")
        assert len(data["response"]) > 0
        assert "sources" in data

    def test_i06_hybrid_query(self, auth_client, mock_retrieval_environment):
        """
        I-06: Hybrid query executes multi-step graph + vector retrieval with synthesis.
        """
        payload = {
            "query": "What skills are required for Python engineers and are there active job openings in Bengaluru?"
        }
        response = auth_client.post(self.endpoint_url, data=payload, format="json")

        assert response.status_code == 200
        data = response.json()
        assert data["query"] == payload["query"]
        assert data["strategy"] == "hybrid"
        assert len(data["response"]) > 0
        assert len(data["sources"]) > 0

    def test_unauthenticated_request_rejected(self, api_client):
        """
        Verify that requests without JWT authorization header receive 401 Unauthorized.
        """
        payload = {"query": "What skills are required for Data Science?"}
        response = api_client.post(self.endpoint_url, data=payload, format="json")

        assert response.status_code == 401

    def test_empty_query_validation(self, auth_client):
        """
        Verify that blank or missing query strings return 400 Bad Request.
        """
        response_blank = auth_client.post(self.endpoint_url, data={"query": ""}, format="json")
        assert response_blank.status_code == 400
        assert "query" in response_blank.json()

        response_missing = auth_client.post(self.endpoint_url, data={}, format="json")
        assert response_missing.status_code == 400
        assert "query" in response_missing.json()

    def test_query_too_long_validation(self, auth_client):
        """
        Verify that queries exceeding the maximum length (500 characters) return 400 Bad Request.
        """
        long_query = "Python developer skills " * 30
        assert len(long_query) > 500

        response = auth_client.post(self.endpoint_url, data={"query": long_query}, format="json")
        assert response.status_code == 400
        assert "query" in response.json()
