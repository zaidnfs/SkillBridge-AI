"""
End-to-End Ingestion Integration Test (TASK-022).
Validates the entire data lifecycle:
Adzuna API Fetch → Relational DB Storage → spaCy NER Extraction →
Neo4j Knowledge Graph Population → Qdrant Vector Store Indexing.
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest

from apps.jobs.models import JobPosting
from services.embedding_service import get_embedding_service
from services.graph_service import GraphService
from services.job_providers.schemas import JobListing
from services.vector_service import VectorService
from tasks.ingestion import fetch_and_store_jobs


@pytest.fixture
def mock_graph_service():
    """Provides a mocked GraphService that captures graph operations."""
    service = GraphService()
    queries = []

    def fake_execute(query, parameters=None, read_only=False):
        queries.append({"query": query, "parameters": parameters or {}})
        if "COMMON_FOR" in query:
            return [
                {"skill": "Python", "category": "Languages", "frequency": 1},
                {"skill": "Django", "category": "Frameworks", "frequency": 1},
                {"skill": "PostgreSQL", "category": "Databases", "frequency": 1},
            ]
        if "RELATED_TO" in query:
            return [
                {"related_skill": "Django", "category": "Frameworks", "co_occurrence_count": 1}
            ]
        return [{"updated_count": 1}]

    service.execute_query = MagicMock(side_effect=fake_execute)
    service.captured_queries = queries
    return service


@pytest.fixture
def in_memory_vector_service():
    """Provides an isolated, in-memory VectorService for the end-to-end test."""
    service = VectorService(
        collection_name=f"test_e2e_{uuid.uuid4().hex[:8]}",
        in_memory=True,
    )
    yield service
    service.clear_collection()


@pytest.mark.django_db
class TestEndToEndIngestionPipeline:
    """End-to-end test suite for TASK-022."""

    def test_e2e_adzuna_to_graph_and_vector_store(
        self, mock_graph_service, in_memory_vector_service
    ):
        """
        Execute full flow:
        1. Mock Adzuna provider returning a realistic job listing
        2. Celery fetch_and_store_jobs runs and triggers process_unprocessed_jobs
        3. Verify relational DB record has extracted entities
        4. Verify Knowledge Graph received nodes and relationships
        5. Verify Vector Store indexed embedding and supports semantic search
        """
        # 1. Prepare synthetic Adzuna job listing
        sample_listing = JobListing(
            source_id="adzuna-e2e-101",
            source_provider="adzuna",
            title="Senior Python Backend Engineer",
            company="ScaleNova Technologies",
            description=(
                "We are hiring a Senior Backend Developer. "
                "The candidate must be proficient in Python, Django, PostgreSQL, "
                "Docker, and Redis to build scalable RESTful APIs."
            ),
            location_city="Bengaluru",
            location_country="IN",
            salary_min=1800000.0,
            salary_max=2600000.0,
            currency="INR",
            posted_date="2026-09-29T08:30:00Z",
            url="https://adzuna.in/details/e2e-101",
            category="IT Jobs",
        )

        mock_job_service = MagicMock()
        mock_job_service.search_jobs.return_value = [sample_listing]

        # 2. Run fetch_and_store_jobs with auto_trigger_processing=True
        with patch("tasks.ingestion.get_job_service", return_value=mock_job_service), \
             patch("tasks.processing.get_graph_service", return_value=mock_graph_service), \
             patch("tasks.processing.get_vector_service", return_value=in_memory_vector_service):

            summary = fetch_and_store_jobs(
                keywords=["Python Developer"],
                locations=["Bengaluru"],
                country="in",
                max_pages_per_query=1,
                auto_trigger_processing=True,
            )

            # Assert ingestion task summary
            assert summary["status"] == "completed"
            assert summary["total_created"] == 1
            assert summary["total_duplicates"] == 0

            # 3. Assert PostgreSQL relational record
            job = JobPosting.objects.get(source_id="adzuna-e2e-101")
            assert job.title == "Senior Python Backend Engineer"
            assert job.company == "ScaleNova Technologies"
            assert job.location_city == "Bengaluru"
            assert job.is_processed is True
            assert job.processed_at is not None
            assert job.extracted_role == "Backend Developer"

            # Check extracted skills identified by spaCy NER
            skills = job.extracted_skills
            assert "Python" in skills
            assert "Django" in skills
            assert "PostgreSQL" in skills
            assert "Docker" in skills
            assert "Redis" in skills

            # 4. Assert Neo4j Knowledge Graph operations
            assert len(mock_graph_service.captured_queries) >= 1
            primary_cypher = mock_graph_service.captured_queries[0]
            params = primary_cypher["parameters"]

            assert params["job_id"] == str(job.id)
            assert params["company"] == "ScaleNova Technologies"
            assert params["city"] == "Bengaluru"
            assert params["role"] == "Backend Developer"
            assert any(s["name"] == "Python" for s in params["skills"])
            assert any(s["name"] == "Django" for s in params["skills"])

            # Verify analytical query on graph
            skills_in_graph = mock_graph_service.get_skills_for_role("Backend Developer")
            assert len(skills_in_graph) == 3
            assert skills_in_graph[0]["skill"] == "Python"

            related_in_graph = mock_graph_service.get_related_skills("Python")
            assert len(related_in_graph) == 1
            assert related_in_graph[0]["related_skill"] == "Django"

            # 5. Assert Qdrant Vector Store indexing and semantic retrieval
            assert in_memory_vector_service.count_vectors() == 1
            stored_vector = in_memory_vector_service.get_job_vector(job.id)
            assert stored_vector is not None
            assert stored_vector["payload"]["title"] == "Senior Python Backend Engineer"
            assert stored_vector["payload"]["role"] == "Backend Developer"
            assert stored_vector["payload"]["location_city"] == "Bengaluru"

            # Perform semantic similarity search with query
            embedding_svc = get_embedding_service()
            search_query = "Looking for experienced Python Django developer in Bengaluru"
            query_vector = embedding_svc.generate_embedding(search_query)

            search_results = in_memory_vector_service.search(query_vector=query_vector, limit=1)
            assert len(search_results) == 1
            top_hit = search_results[0]
            assert top_hit["job_id"] == str(job.id)
            assert top_hit["score"] > 0.2
            assert top_hit["payload"]["company"] == "ScaleNova Technologies"
