"""
Vector Retriever for SkillBridge AI (TASK-025).
Generates dense query embeddings via EmbeddingService, executes similarity search
against the Qdrant vector collection, applies metadata filters, and formats matching
job postings into grounded LLM context documents.
"""
import logging
from typing import Any

from services.embedding_service import EmbeddingService, get_embedding_service
from services.vector_service import VectorService, get_vector_service

logger = logging.getLogger(__name__)


class VectorRetriever:
    """
    Retriever performing semantic search over 384-dimensional job posting embeddings
    in Qdrant to find concrete matching opportunities.
    """

    def __init__(
        self,
        vector_service: VectorService | None = None,
        embedding_service: EmbeddingService | None = None,
    ):
        self._vector_service = vector_service
        self._embedding_service = embedding_service

    @property
    def vector_service(self) -> VectorService:
        if self._vector_service is None:
            self._vector_service = get_vector_service()
        return self._vector_service

    @property
    def embedding_service(self) -> EmbeddingService:
        if self._embedding_service is None:
            self._embedding_service = get_embedding_service()
        return self._embedding_service

    def retrieve_similar_jobs(
        self,
        query: str,
        limit: int = 5,
        score_threshold: float = 0.0,
        filter_criteria: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Embed user query text and search Qdrant for top matching job postings.
        """
        if not query or not query.strip():
            return []

        try:
            # 1. Generate query embedding
            query_vector = self.embedding_service.generate_embedding(query.strip())

            # 2. Search Qdrant
            results = self.vector_service.search(
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
                filter_criteria=filter_criteria,
            )
            return results
        except Exception as exc:
            logger.warning(f"Vector search failed for query '{query}': {exc}")
            return []

    def format_for_context(self, search_results: list[dict[str, Any]]) -> str:
        """
        Format retrieved job postings into clean markdown cards for LLM grounding.
        """
        if not search_results:
            return "No matching active job postings retrieved from the vector store."

        cards = []
        for i, hit in enumerate(search_results, 1):
            payload = hit.get("payload", {})
            title = payload.get("title", "Untitled Posting")
            company = payload.get("company", "Company Undisclosed")
            city = payload.get("location_city") or "Remote"
            score = hit.get("score", 0.0)
            skills = payload.get("skills") or payload.get("extracted_skills", [])
            salary_min = payload.get("salary_min")
            salary_max = payload.get("salary_max")

            sal_str = ""
            if salary_min and salary_max:
                sal_str = f" | Salary: ₹{salary_min:,.0f} - ₹{salary_max:,.0f}"
            elif salary_min:
                sal_str = f" | Salary from: ₹{salary_min:,.0f}"

            skills_str = ", ".join(skills[:8]) if skills else "Not specified"

            card = (
                f"[{i}] **{title}** at **{company}**\n"
                f"    - Location: {city}{sal_str}\n"
                f"    - Key Skills: {skills_str}\n"
                f"    - Semantic Match Score: {score:.2f}"
            )
            cards.append(card)

        return "\n\n".join(cards)


# Singleton instance
_vector_retriever_instance: VectorRetriever | None = None


def get_vector_retriever() -> VectorRetriever:
    """Return the global singleton VectorRetriever instance."""
    global _vector_retriever_instance
    if _vector_retriever_instance is None:
        _vector_retriever_instance = VectorRetriever()
    return _vector_retriever_instance
