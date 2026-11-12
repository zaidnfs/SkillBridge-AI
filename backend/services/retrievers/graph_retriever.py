"""
Graph Retriever for SkillBridge AI (TASK-024).
Executes targeted Cypher queries on the Neo4j Knowledge Graph to retrieve
structured facts regarding skill requirements, co-occurrences, role demand,
and hiring companies, and formats them into grounded LLM context documents.
"""
import logging
from typing import Any

from services.graph_service import GraphService, get_graph_service

logger = logging.getLogger(__name__)


class GraphRetriever:
    """
    Retriever extracting structured graph knowledge from Neo4j
    to ground LLM reasoning in verified career market data.
    """

    def __init__(self, graph_service: GraphService | None = None):
        self._graph_service = graph_service

    @property
    def graph_service(self) -> GraphService:
        if self._graph_service is None:
            self._graph_service = get_graph_service()
        return self._graph_service

    def retrieve_skills_by_role(
        self, role_name: str, limit: int = 15
    ) -> list[dict[str, Any]]:
        """
        Retrieve high-frequency skills required for a canonical role.
        """
        try:
            return self.graph_service.get_skills_for_role(role_name=role_name, limit=limit)
        except Exception as exc:
            logger.warning(f"Failed to retrieve skills for role '{role_name}': {exc}")
            return []

    def retrieve_related_skills(
        self, skill_name: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        """
        Retrieve skills that frequently co-occur with the target skill.
        """
        try:
            return self.graph_service.get_related_skills(skill_name=skill_name, limit=limit)
        except Exception as exc:
            logger.warning(f"Failed to retrieve related skills for '{skill_name}': {exc}")
            return []

    def retrieve_top_demanded_skills(self, limit: int = 20) -> list[dict[str, Any]]:
        """
        Retrieve globally top demanded skills across the platform.
        """
        try:
            return self.graph_service.get_top_demanded_skills(limit=limit)
        except Exception as exc:
            logger.warning(f"Failed to retrieve top demanded skills: {exc}")
            return []

    def retrieve_role_summary(self, role_name: str) -> dict[str, Any]:
        """
        Aggregate a multi-dimensional summary for a role: top skills, hiring companies, and locations.
        """
        norm_role = " ".join(role_name.lower().split())
        query = """
        MATCH (r:Role)
        WHERE toLower(r.title) CONTAINS toLower($norm_role)
           OR r.normalized_title CONTAINS toLower($norm_role)
        MATCH (j:JobPosting)-[:BELONGS_TO]->(r)
        OPTIONAL MATCH (j)-[:REQUIRES]->(s:Skill)
        OPTIONAL MATCH (j)-[:POSTED_BY]->(c:Company)
        OPTIONAL MATCH (j)-[:LOCATED_IN]->(l:Location)
        RETURN
            r.title AS canonical_role,
            count(DISTINCT j) AS total_jobs,
            collect(DISTINCT s.name)[..15] AS top_skills,
            collect(DISTINCT c.name)[..10] AS top_companies,
            collect(DISTINCT l.city)[..10] AS top_locations
        LIMIT 1
        """
        try:
            results = self.graph_service.execute_query(
                query, {"norm_role": norm_role}, read_only=True
            )
            if results:
                return results[0]
            return {
                "canonical_role": role_name,
                "total_jobs": 0,
                "top_skills": [],
                "top_companies": [],
                "top_locations": [],
            }
        except Exception as exc:
            logger.warning(f"Failed to retrieve role summary for '{role_name}': {exc}")
            return {
                "canonical_role": role_name,
                "total_jobs": 0,
                "top_skills": [],
                "top_companies": [],
                "top_locations": [],
            }

    def format_for_context(
        self,
        skills_data: list[dict[str, Any]] | None = None,
        role_summary: dict[str, Any] | None = None,
        related_skills: list[dict[str, Any]] | None = None,
    ) -> str:
        """
        Format retrieved graph facts into a structured text document for LLM prompts.
        """
        lines = []

        if role_summary and role_summary.get("total_jobs", 0) > 0:
            lines.append(f"### Role Overview: {role_summary.get('canonical_role')}")
            lines.append(f"- Total Tracked Job Listings: {role_summary.get('total_jobs')}")
            if role_summary.get("top_companies"):
                lines.append(f"- Active Hiring Companies: {', '.join(role_summary['top_companies'])}")
            if role_summary.get("top_locations"):
                lines.append(f"- Hiring Locations: {', '.join(role_summary['top_locations'])}")

        if skills_data:
            lines.append("### Demanded Skills Breakdown (from Knowledge Graph):")
            for item in skills_data:
                name = item.get("skill") or item.get("name")
                freq = item.get("frequency") or item.get("job_count") or 1
                cat = item.get("category", "General")
                lines.append(f"- **{name}** ({cat}): required in {freq} job posting(s)")

        if related_skills:
            lines.append("### Associated & Co-occurring Technologies:")
            for item in related_skills:
                rel_name = item.get("related_skill")
                count = item.get("co_occurrence_count", 1)
                lines.append(f"- Frequently pairs with **{rel_name}** (observed together {count} times)")

        if not lines:
            return "No specific structured Knowledge Graph entities found matching the query criteria."

        return "\n".join(lines)


# Singleton instance
_graph_retriever_instance: GraphRetriever | None = None


def get_graph_retriever() -> GraphRetriever:
    """Return the global singleton GraphRetriever instance."""
    global _graph_retriever_instance
    if _graph_retriever_instance is None:
        _graph_retriever_instance = GraphRetriever()
    return _graph_retriever_instance
