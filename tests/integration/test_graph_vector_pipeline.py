"""
Integration tests for the Knowledge Graph and Vector Store pipelines (TASK-021).
Validates cross-service interaction between Django models, spaCy NER,
Neo4j GraphService, and Qdrant VectorService during background processing.
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.jobs.models import JobPosting
from services.embedding_service import get_embedding_service
from services.graph_service import GraphService
from services.vector_service import VectorService
from tasks.processing import process_unprocessed_jobs


@pytest.fixture
def mock_graph_service():
    """Provides a mocked GraphService that captures all Cypher executions."""
    service = GraphService()
    executed_queries = []

    def fake_execute(query, parameters=None, read_only=False):
        executed_queries.append({"query": query, "parameters": parameters or {}})
        return [{"updated_count": 1}]

    service.execute_query = MagicMock(side_effect=fake_execute)
    service.captured_queries = executed_queries
    return service


@pytest.fixture
def in_memory_vector_service():
    """Provides an isolated, in-memory VectorService for integration testing."""
    service = VectorService(
        collection_name=f"test_integration_{uuid.uuid4().hex[:8]}",
        in_memory=True,
    )
    yield service
    service.clear_collection()


@pytest.mark.django_db
class TestGraphAndVectorPipelineIntegration:
    """Integration test suite for the unified graph and vector processing pipeline."""

    def test_pipeline_transforms_job_into_graph_and_vector(
        self, mock_graph_service, in_memory_vector_service
    ):
        """
        Verify that processing an unprocessed JobPosting record:
        1. Identifies skills via NER
        2. Populates graph nodes and relationships via GraphService
        3. Generates embedding and stores it in VectorService
        4. Updates JobPosting is_processed to True
        """
        job = JobPosting.objects.create(
            title="Senior Backend Engineer",
            company="FinTech Corp",
            description="We are looking for a Python and Django expert with PostgreSQL and Docker experience.",
            location_city="Bengaluru",
            location_country="IN",
            salary_min=1500000.00,
            salary_max=2200000.00,
            source_url="https://adzuna.in/job/pipe-1",
            source_provider="adzuna",
            source_id="pipe-1",
            is_processed=False,
        )

        with patch("tasks.processing.get_graph_service", return_value=mock_graph_service), \
             patch("tasks.processing.get_vector_service", return_value=in_memory_vector_service):

            result = process_unprocessed_jobs(batch_size=10)

            assert result["status"] == "completed"
            assert result["processed_count"] == 1
            assert result["graph_ingested_count"] == 1
            assert result["vector_ingested_count"] == 1
            assert result["errors_count"] == 0

            # 1. Verify DB record state
            job.refresh_from_db()
            assert job.is_processed is True
            assert job.processed_at is not None
            assert "Python" in job.extracted_skills
            assert "Django" in job.extracted_skills
            assert "PostgreSQL" in job.extracted_skills
            assert "Docker" in job.extracted_skills
            assert job.extracted_role == "Backend Developer"

            # 2. Verify GraphService captured queries
            assert len(mock_graph_service.captured_queries) >= 1
            main_query_call = mock_graph_service.captured_queries[0]
            params = main_query_call["parameters"]
            assert params["job_id"] == str(job.id)
            assert params["company"] == "FinTech Corp"
            assert params["city"] == "Bengaluru"
            assert params["role"] == "Backend Developer"

            # 3. Verify VectorStore populated
            assert in_memory_vector_service.count_vectors() == 1
            record = in_memory_vector_service.get_job_vector(job.id)
            assert record is not None
            assert record["payload"]["title"] == "Senior Backend Engineer"
            assert record["payload"]["company"] == "FinTech Corp"
            assert record["payload"]["role"] == "Backend Developer"
            assert "Python" in record["payload"]["skills"]

            # 4. Verify vector similarity search retrieves this job
            embedding_svc = get_embedding_service()
            query_vector = embedding_svc.generate_embedding("Python Django backend developer")
            hits = in_memory_vector_service.search(query_vector=query_vector, limit=1)
            assert len(hits) == 1
            assert hits[0]["job_id"] == str(job.id)
            assert hits[0]["score"] > 0.2

    def test_pipeline_multi_role_differentiation(
        self, mock_graph_service, in_memory_vector_service
    ):
        """
        Verify pipeline differentiates between multiple job profiles (Backend vs Frontend)
        in both graph entities and vector semantic retrieval.
        """
        job_backend = JobPosting.objects.create(
            title="Backend Python Developer",
            company="BackendLabs",
            description="Build scalable microservices with Python, Django, Redis, PostgreSQL.",
            location_city="Bengaluru",
            source_url="https://example.com/b1",
            source_provider="adzuna",
            source_id="b-1",
            is_processed=False,
        )

        job_frontend = JobPosting.objects.create(
            title="Frontend React Specialist",
            company="FrontendLabs",
            description="Create rich reactive user interfaces using React, TypeScript, Tailwind CSS, Redux.",
            location_city="Pune",
            source_url="https://example.com/f1",
            source_provider="adzuna",
            source_id="f-1",
            is_processed=False,
        )

        with patch("tasks.processing.get_graph_service", return_value=mock_graph_service), \
             patch("tasks.processing.get_vector_service", return_value=in_memory_vector_service):

            summary = process_unprocessed_jobs(batch_size=10)
            assert summary["processed_count"] == 2
            assert summary["vector_ingested_count"] == 2

            # Perform semantic search for frontend skills
            embedding_svc = get_embedding_service()
            fe_query = embedding_svc.generate_embedding("React UI components and TypeScript state management")
            fe_hits = in_memory_vector_service.search(query_vector=fe_query, limit=1)

            assert len(fe_hits) == 1
            # Top match must be the Frontend job
            assert fe_hits[0]["job_id"] == str(job_frontend.id)
            assert fe_hits[0]["payload"]["title"] == "Frontend React Specialist"

            # Perform semantic search for backend skills
            be_query = embedding_svc.generate_embedding("Python PostgreSQL database queries and backend APIs")
            be_hits = in_memory_vector_service.search(query_vector=be_query, limit=1)

            assert len(be_hits) == 1
            # Top match must be the Backend job
            assert be_hits[0]["job_id"] == str(job_backend.id)
            assert be_hits[0]["payload"]["title"] == "Backend Python Developer"

    def test_pipeline_graceful_on_graph_failure(
        self, in_memory_vector_service
    ):
        """
        Verify that if the Knowledge Graph service encounters an error,
        the vector store indexing and database processing still succeed gracefully.
        """
        job = JobPosting.objects.create(
            title="DevOps Engineer",
            company="CloudNative Inc",
            description="Kubernetes, Docker, Terraform, CI/CD pipeline automation.",
            location_city="Hyderabad",
            source_url="https://example.com/devops/1",
            source_provider="adzuna",
            source_id="d-1",
            is_processed=False,
        )

        failing_graph_service = MagicMock()
        failing_graph_service.ingest_job_posting.side_effect = Exception("Neo4j node creation timed out")

        with patch("tasks.processing.get_graph_service", return_value=failing_graph_service), \
             patch("tasks.processing.get_vector_service", return_value=in_memory_vector_service):

            summary = process_unprocessed_jobs(batch_size=10)

            # Processing still completes
            assert summary["status"] == "completed"
            assert summary["processed_count"] == 1
            assert summary["graph_ingested_count"] == 0
            assert summary["vector_ingested_count"] == 1

            # Job is marked processed and vector is saved
            job.refresh_from_db()
            assert job.is_processed is True
            assert in_memory_vector_service.count_vectors() == 1
