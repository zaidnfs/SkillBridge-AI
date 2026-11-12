"""
Vector Store service for SkillBridge AI.
Interfaces with Qdrant to manage dense vector collections (384-dimensional sentence embeddings)
for semantic job search, similarity retrieval, and resume-to-job matching.
Includes automatic collection initialization and native in-memory test fallback.
"""
import logging
import uuid
from typing import Any

from django.conf import settings
from qdrant_client import QdrantClient, models

logger = logging.getLogger(__name__)

DEFAULT_COLLECTION_NAME = "job_postings"
DEFAULT_VECTOR_SIZE = 384


class VectorServiceError(Exception):
    """Base exception for vector store operations."""
    pass


class VectorConnectionError(VectorServiceError):
    """Raised when connecting to Qdrant fails."""
    pass


class VectorService:
    """
    Qdrant vector store service managing collections, embedding upserts,
    payload filtering, and semantic similarity search.
    """

    def __init__(
        self,
        url: str | None = None,
        api_key: str | None = None,
        collection_name: str | None = None,
        in_memory: bool | None = None,
    ):
        self.url = url or getattr(settings, "QDRANT_URL", "http://localhost:6333")
        self.api_key = api_key or getattr(settings, "QDRANT_API_KEY", "")
        self.collection_name = collection_name or getattr(
            settings, "QDRANT_COLLECTION_NAME", DEFAULT_COLLECTION_NAME
        )
        self.in_memory = (
            in_memory
            if in_memory is not None
            else getattr(settings, "QDRANT_IN_MEMORY", False)
        )
        self._client: QdrantClient | None = None

    @property
    def client(self) -> QdrantClient:
        """
        Lazily initialize and return the Qdrant client instance.
        Uses in-memory mode when in_memory is True or if configured for tests.
        """
        if self._client is None:
            if self.in_memory:
                logger.info("Initializing Qdrant client in in-memory mode (:memory:)")
                self._client = QdrantClient(location=":memory:")
            else:
                try:
                    logger.info(f"Connecting to Qdrant at {self.url}")
                    self._client = QdrantClient(
                        url=self.url,
                        api_key=self.api_key or None,
                        timeout=5.0,
                    )
                except Exception as exc:
                    logger.warning(
                        f"Failed to connect to Qdrant at {self.url} ({exc}). "
                        "Falling back to in-memory mode."
                    )
                    self._client = QdrantClient(location=":memory:")
        return self._client

    @client.setter
    def client(self, value: QdrantClient | None) -> None:
        """Allow setting or mocking the Qdrant client instance."""
        self._client = value

    @client.deleter
    def client(self) -> None:
        """Allow deleting or resetting the client instance."""
        self._client = None

    def health_check(self) -> bool:
        """
        Check whether the vector store is accessible.
        """
        try:
            # Query collections list as a health ping
            self.client.get_collections()
            return True
        except Exception as exc:
            logger.warning(f"Qdrant health check failed: {exc}")
            return False

    def ensure_collection(
        self,
        collection_name: str | None = None,
        vector_size: int = DEFAULT_VECTOR_SIZE,
        distance: str = "Cosine",
    ) -> bool:
        """
        Ensure the target collection exists. If not, creates it with the given vector configuration.
        """
        col = collection_name or self.collection_name
        try:
            if not self.client.collection_exists(collection_name=col):
                distance_enum = (
                    models.Distance.COSINE
                    if distance.lower() == "cosine"
                    else models.Distance.DOT
                )
                logger.info(f"Creating Qdrant collection: {col} (dim={vector_size}, distance={distance})")
                self.client.create_collection(
                    collection_name=col,
                    vectors_config=models.VectorParams(
                        size=vector_size,
                        distance=distance_enum,
                    ),
                )
            return True
        except Exception as exc:
            logger.error(f"Error ensuring collection {col}: {exc}")
            raise VectorServiceError(f"Failed to ensure collection {col}: {exc}") from exc

    def _normalize_point_id(self, point_id: str | uuid.UUID) -> str:
        """
        Ensure point ID is formatted as a valid string representation.
        If not a valid UUID string, generates a deterministic UUID from the string.
        """
        if isinstance(point_id, uuid.UUID):
            return str(point_id)
        raw_id = str(point_id)
        try:
            return str(uuid.UUID(raw_id))
        except ValueError:
            # Generate deterministic UUID from non-UUID string
            return str(uuid.uuid5(uuid.NAMESPACE_DNS, raw_id))

    def upsert_job(
        self,
        job_id: str | uuid.UUID,
        vector: list[float],
        payload: dict[str, Any],
        collection_name: str | None = None,
    ) -> bool:
        """
        Insert or update a single job embedding with metadata payload in Qdrant.
        """
        col = collection_name or self.collection_name
        self.ensure_collection(col, vector_size=len(vector))

        point_id = self._normalize_point_id(job_id)
        point = models.PointStruct(
            id=point_id,
            vector=vector,
            payload=payload,
        )

        try:
            self.client.upsert(
                collection_name=col,
                points=[point],
                wait=True,
            )
            return True
        except Exception as exc:
            logger.error(f"Failed to upsert job {job_id} into vector store: {exc}")
            raise VectorServiceError(f"Failed to upsert job {job_id}: {exc}") from exc

    def upsert_jobs_batch(
        self,
        points_data: list[dict[str, Any]],
        collection_name: str | None = None,
    ) -> int:
        """
        Batch upsert multiple jobs into Qdrant.

        Args:
            points_data: List of dicts, each with keys:
                - 'job_id': str | UUID
                - 'vector': list[float]
                - 'payload': dict[str, Any]
            collection_name: Target collection name

        Returns:
            Number of points successfully upserted.
        """
        if not points_data:
            return 0

        col = collection_name or self.collection_name
        sample_dim = len(points_data[0]["vector"])
        self.ensure_collection(col, vector_size=sample_dim)

        points = [
            models.PointStruct(
                id=self._normalize_point_id(item["job_id"]),
                vector=item["vector"],
                payload=item.get("payload", {}),
            )
            for item in points_data
        ]

        try:
            self.client.upsert(
                collection_name=col,
                points=points,
                wait=True,
            )
            return len(points)
        except Exception as exc:
            logger.error(f"Failed to batch upsert {len(points_data)} points: {exc}")
            raise VectorServiceError(f"Failed to batch upsert points: {exc}") from exc

    def search(
        self,
        query_vector: list[float],
        limit: int = 10,
        score_threshold: float = 0.0,
        filter_criteria: dict[str, Any] | None = None,
        collection_name: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Search for most similar job vectors in Qdrant.

        Args:
            query_vector: Dense embedding vector representing the search query or resume.
            limit: Maximum number of results to return.
            score_threshold: Minimum similarity score (Cosine range: -1.0 to 1.0).
            filter_criteria: Optional dictionary of exact match filters (e.g. {'location_city': 'Bengaluru'}).
            collection_name: Target collection name.

        Returns:
            List of dicts: [{'job_id': str, 'score': float, 'payload': dict}]
        """
        col = collection_name or self.collection_name
        self.ensure_collection(col, vector_size=len(query_vector))

        query_filter = None
        if filter_criteria:
            conditions = []
            for key, val in filter_criteria.items():
                if val is not None:
                    conditions.append(
                        models.FieldCondition(
                            key=key,
                            match=models.MatchValue(value=val),
                        )
                    )
            if conditions:
                query_filter = models.Filter(must=conditions)

        try:
            res = self.client.query_points(
                collection_name=col,
                query=query_vector,
                limit=limit,
                score_threshold=score_threshold if score_threshold > 0.0 else None,
                query_filter=query_filter,
                with_payload=True,
            )

            results: list[dict[str, Any]] = []
            for hit in res.points:
                results.append(
                    {
                        "job_id": str(hit.id),
                        "score": float(hit.score),
                        "payload": hit.payload or {},
                    }
                )
            return results
        except Exception as exc:
            logger.error(f"Search query failed in collection {col}: {exc}")
            raise VectorServiceError(f"Vector search failed: {exc}") from exc

    def get_job_vector(
        self,
        job_id: str | uuid.UUID,
        collection_name: str | None = None,
    ) -> dict[str, Any] | None:
        """
        Retrieve payload and vector for a specific job ID.
        """
        col = collection_name or self.collection_name
        self.ensure_collection(col)

        point_id = self._normalize_point_id(job_id)
        try:
            records = self.client.retrieve(
                collection_name=col,
                ids=[point_id],
                with_payload=True,
                with_vectors=True,
            )
            if not records:
                return None
            record = records[0]
            return {
                "job_id": str(record.id),
                "payload": record.payload or {},
                "vector": record.vector,
            }
        except Exception as exc:
            logger.error(f"Failed to retrieve vector for job {job_id}: {exc}")
            raise VectorServiceError(f"Failed to retrieve vector: {exc}") from exc

    def delete_job_vector(
        self,
        job_id: str | uuid.UUID,
        collection_name: str | None = None,
    ) -> bool:
        """
        Delete a single job vector by ID from the vector collection.
        """
        col = collection_name or self.collection_name
        self.ensure_collection(col)

        point_id = self._normalize_point_id(job_id)
        try:
            self.client.delete(
                collection_name=col,
                points_selector=models.PointIdsList(points=[point_id]),
                wait=True,
            )
            return True
        except Exception as exc:
            logger.error(f"Failed to delete vector for job {job_id}: {exc}")
            raise VectorServiceError(f"Failed to delete vector: {exc}") from exc

    def count_vectors(self, collection_name: str | None = None) -> int:
        """
        Return the total number of vectors in the collection.
        """
        col = collection_name or self.collection_name
        self.ensure_collection(col)
        try:
            res = self.client.count(collection_name=col)
            return res.count
        except Exception as exc:
            logger.error(f"Failed to count vectors in collection {col}: {exc}")
            return 0

    def clear_collection(self, collection_name: str | None = None) -> bool:
        """
        Delete all points from the collection (recreates the collection).
        """
        col = collection_name or self.collection_name
        try:
            if self.client.collection_exists(collection_name=col):
                self.client.delete_collection(collection_name=col)
            return self.ensure_collection(col)
        except Exception as exc:
            logger.error(f"Failed to clear collection {col}: {exc}")
            raise VectorServiceError(f"Failed to clear collection: {exc}") from exc


# Global singleton holder
_vector_service_instance: VectorService | None = None


def get_vector_service() -> VectorService:
    """
    Return the global singleton VectorService instance.
    """
    global _vector_service_instance
    if _vector_service_instance is None:
        _vector_service_instance = VectorService()
    return _vector_service_instance
