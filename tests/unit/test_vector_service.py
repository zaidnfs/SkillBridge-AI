"""
Unit tests for Qdrant VectorService.
Validates test cases U-25 through U-28 from Docs/TEST_PLAN.md:
- U-25: Store an embedding with metadata
- U-26: Similarity search returns top-k results
- U-27: Similarity search with threshold filtering
- U-28: Handle vector store connection failure
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest

from services.vector_service import (
    VectorConnectionError,
    VectorService,
    VectorServiceError,
    get_vector_service,
)


@pytest.fixture
def in_memory_vector_service():
    """Provides an isolated, in-memory VectorService instance for tests."""
    service = VectorService(
        collection_name=f"test_jobs_{uuid.uuid4().hex[:8]}",
        in_memory=True,
    )
    yield service
    service.clear_collection()


class TestVectorServiceOperations:
    """Tests vector creation, upsert, search, and filtering."""

    def test_u25_store_embedding_with_metadata(self, in_memory_vector_service):
        """U-25: Store an embedding with metadata and retrieve it."""
        service = in_memory_vector_service
        job_id = str(uuid.uuid4())
        # 4-dimensional vector for quick test
        dummy_vector = [0.1, 0.2, 0.3, 0.4]
        payload = {
            "title": "Backend Engineer",
            "company": "ScaleWorks",
            "location_city": "Bengaluru",
            "extracted_skills": ["Python", "Django"],
        }

        # Upsert
        success = service.upsert_job(job_id=job_id, vector=dummy_vector, payload=payload)
        assert success is True

        # Retrieve
        record = service.get_job_vector(job_id=job_id)
        assert record is not None
        assert record["job_id"] == job_id
        assert record["payload"]["title"] == "Backend Engineer"
        assert record["payload"]["company"] == "ScaleWorks"
        assert record["payload"]["extracted_skills"] == ["Python", "Django"]

    def test_u26_similarity_search_returns_top_k(self, in_memory_vector_service):
        """U-26: Verify similarity search returns top-k most similar points."""
        service = in_memory_vector_service

        # Point 1: perfectly aligned with query [1.0, 0.0, 0.0, 0.0]
        id1 = str(uuid.uuid4())
        v1 = [1.0, 0.0, 0.0, 0.0]
        # Point 2: partially aligned
        id2 = str(uuid.uuid4())
        v2 = [0.8, 0.6, 0.0, 0.0]
        # Point 3: orthogonal
        id3 = str(uuid.uuid4())
        v3 = [0.0, 1.0, 0.0, 0.0]

        service.upsert_job(id1, v1, {"title": "Exact Match"})
        service.upsert_job(id2, v2, {"title": "Partial Match"})
        service.upsert_job(id3, v3, {"title": "Orthogonal"})

        query_vec = [1.0, 0.0, 0.0, 0.0]
        results = service.search(query_vector=query_vec, limit=2)

        assert len(results) == 2
        # Exact match should have cosine score ~ 1.0
        assert results[0]["job_id"] == id1
        assert results[0]["score"] > 0.99
        # Second should be partial match
        assert results[1]["job_id"] == id2
        assert results[1]["score"] > 0.7

    def test_u27_similarity_search_with_threshold_filtering(self, in_memory_vector_service):
        """U-27: Low similarity results below score_threshold are excluded."""
        service = in_memory_vector_service

        id_high = str(uuid.uuid4())
        v_high = [0.99, 0.01, 0.0, 0.0]
        id_low = str(uuid.uuid4())
        v_low = [0.1, 0.9, 0.0, 0.0]

        service.upsert_job(id_high, v_high, {"title": "High Similarity"})
        service.upsert_job(id_low, v_low, {"title": "Low Similarity"})

        query_vec = [1.0, 0.0, 0.0, 0.0]
        # Threshold 0.8: should exclude the low similarity point
        results = service.search(query_vector=query_vec, limit=10, score_threshold=0.8)

        assert len(results) == 1
        assert results[0]["job_id"] == id_high

    def test_search_with_metadata_filter(self, in_memory_vector_service):
        """Verify metadata exact-match filtering in vector search."""
        service = in_memory_vector_service

        id_bengaluru = str(uuid.uuid4())
        id_pune = str(uuid.uuid4())

        service.upsert_job(
            id_bengaluru,
            [1.0, 0.0, 0.0, 0.0],
            {"title": "Python Dev", "location_city": "Bengaluru"},
        )
        service.upsert_job(
            id_pune,
            [1.0, 0.0, 0.0, 0.0],
            {"title": "Python Dev", "location_city": "Pune"},
        )

        query_vec = [1.0, 0.0, 0.0, 0.0]
        results = service.search(
            query_vector=query_vec,
            limit=5,
            filter_criteria={"location_city": "Bengaluru"},
        )

        assert len(results) == 1
        assert results[0]["job_id"] == id_bengaluru
        assert results[0]["payload"]["location_city"] == "Bengaluru"

    def test_batch_upsert_and_count(self, in_memory_vector_service):
        """Verify batch upserting multiple vector points."""
        service = in_memory_vector_service
        batch = [
            {
                "job_id": str(uuid.uuid4()),
                "vector": [0.1 * i, 0.2, 0.3, 0.4],
                "payload": {"index": i},
            }
            for i in range(5)
        ]

        count = service.upsert_jobs_batch(batch)
        assert count == 5
        assert service.count_vectors() == 5

    def test_delete_job_vector(self, in_memory_vector_service):
        """Verify vector point deletion."""
        service = in_memory_vector_service
        job_id = str(uuid.uuid4())
        service.upsert_job(job_id, [0.5, 0.5, 0.0, 0.0], {"title": "ToDelete"})
        assert service.count_vectors() == 1

        deleted = service.delete_job_vector(job_id)
        assert deleted is True
        assert service.count_vectors() == 0
        assert service.get_job_vector(job_id) is None


class TestVectorServiceConnectionAndResilience:
    """Tests connection failures, fallback, and health check (U-28)."""

    def test_u28_handle_vector_store_connection_failure(self):
        """U-28: Graceful fallback when remote Qdrant is unreachable."""
        service = VectorService(
            url="http://nonexistent-host:9999",
            in_memory=False,
        )

        with patch("services.vector_service.QdrantClient") as mock_client_cls:
            # First attempt to connect to remote fails
            mock_client_cls.side_effect = [
                Exception("Connection refused"),  # Remote connection failure
                MagicMock(),  # Fallback to in-memory succeeds
            ]
            client = service.client
            assert client is not None
            # Verified fallback to in-memory was triggered
            assert mock_client_cls.call_count == 2
            mock_client_cls.assert_called_with(location=":memory:")

    def test_health_check_failure(self):
        """Verify health_check returns False when get_collections raises."""
        service = VectorService(in_memory=True)
        with patch.object(service, "client") as mock_client:
            mock_client.get_collections.side_effect = Exception("Service Down")
            assert service.health_check() is False

    def test_singleton_get_vector_service(self):
        """Verify get_vector_service returns a singleton instance."""
        s1 = get_vector_service()
        s2 = get_vector_service()
        assert s1 is s2
