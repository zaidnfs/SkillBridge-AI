"""
Knowledge Graph service for SkillBridge AI.
Interfaces with Neo4j to manage the graph schema (Roles, Skills, Companies, Locations, JobPostings)
and execute graph queries, analytics, and ingestion pipelines.
"""
import logging
import time
from typing import Any

from django.conf import settings
from neo4j import Driver, GraphDatabase, exceptions as neo4j_exceptions

logger = logging.getLogger(__name__)


class GraphServiceError(Exception):
    """Base exception for graph service errors."""
    pass


class GraphConnectionError(GraphServiceError):
    """Raised when connecting or authenticating to Neo4j fails."""
    pass


class GraphQueryError(GraphServiceError):
    """Raised when Cypher query execution fails."""
    pass


class GraphService:
    """
    Neo4j Knowledge Graph service handling schema initialization,
    parameterized Cypher queries, graph analytics, and entity ingestion.
    """

    def __init__(
        self,
        uri: str | None = None,
        user: str | None = None,
        password: str | None = None,
        database: str | None = None,
        max_connection_pool_size: int | None = None,
        connection_timeout: float | None = None,
        max_transaction_retry_time: float | None = None,
    ):
        self.uri = uri or getattr(settings, "NEO4J_URI", "bolt://localhost:7687")
        self.user = user or getattr(settings, "NEO4J_USER", "neo4j")
        self.password = password or getattr(settings, "NEO4J_PASSWORD", "neo4j_dev_pass")
        self.database = database or getattr(settings, "NEO4J_DATABASE", "neo4j")
        self.max_pool_size = max_connection_pool_size or getattr(
            settings, "NEO4J_MAX_CONNECTION_POOL_SIZE", 50
        )
        self.connection_timeout = connection_timeout or getattr(
            settings, "NEO4J_CONNECTION_TIMEOUT", 1.5
        )
        self.max_transaction_retry_time = max_transaction_retry_time or getattr(
            settings, "NEO4J_MAX_RETRY_TIME", 1.0
        )
        self._driver: Driver | None = None
        self._offline_until: float = 0.0

    @property
    def driver(self) -> Driver:
        """
        Lazily initialize and return the Neo4j driver instance.
        """
        if self._driver is None:
            try:
                auth = (self.user, self.password) if self.user and self.password else None
                self._driver = GraphDatabase.driver(
                    self.uri,
                    auth=auth,
                    max_connection_pool_size=self.max_pool_size,
                    connection_timeout=self.connection_timeout,
                    max_transaction_retry_time=self.max_transaction_retry_time,
                )
            except Exception as exc:
                logger.error(f"Failed to initialize Neo4j driver at {self.uri}: {exc}")
                raise GraphConnectionError(f"Cannot initialize Neo4j driver: {exc}") from exc
        return self._driver

    @driver.setter
    def driver(self, value: Driver | None) -> None:
        """Allow setting or mocking the driver instance."""
        self._driver = value

    @driver.deleter
    def driver(self) -> None:
        """Allow deleting or resetting the driver instance."""
        self._driver = None

    def is_available(self) -> bool:
        """
        Fast non-blocking connectivity check protected by a circuit breaker.
        Returns False immediately if Neo4j is known to be offline.
        """
        if time.time() < self._offline_until:
            return False

        try:
            self.driver.verify_connectivity()
            return True
        except Exception as exc:
            self._offline_until = time.time() + 60.0  # 60 second cooldown
            logger.info(f"Neo4j offline ({exc}); circuit breaker active for 60s.")
            return False

    def verify_connectivity(self) -> bool:
        """
        Verify connection to the Neo4j database.
        Returns True if reachable and authenticated, False otherwise.
        """
        return self.is_available()

    def close(self) -> None:
        """
        Close the driver and release active connections.
        """
        if self._driver is not None:
            try:
                self._driver.close()
            except Exception as exc:
                logger.warning(f"Error closing Neo4j driver: {exc}")
            finally:
                self._driver = None

    def execute_query(
        self,
        query: str,
        parameters: dict[str, Any] | None = None,
        read_only: bool = False,
    ) -> list[dict[str, Any]]:
        """
        Execute a parameterized Cypher query and return results as a list of dicts.
        Parameterization is strictly enforced to prevent Cypher injection.
        """
        if time.time() < self._offline_until:
            raise GraphConnectionError("Neo4j database is unreachable (circuit breaker active)")

        parameters = parameters or {}
        try:
            with self.driver.session(database=self.database) as session:
                if read_only:
                    result = session.execute_read(
                        lambda tx: [record.data() for record in tx.run(query, parameters)]
                    )
                else:
                    result = session.execute_write(
                        lambda tx: [record.data() for record in tx.run(query, parameters)]
                    )
                return result
        except (neo4j_exceptions.ServiceUnavailable, neo4j_exceptions.AuthError) as exc:
            self._offline_until = time.time() + 60.0
            logger.error(f"Neo4j connection error during query execution: {exc}")
            raise GraphConnectionError(f"Neo4j connection error: {exc}") from exc
        except (
            neo4j_exceptions.CypherSyntaxError,
            neo4j_exceptions.CypherTypeError,
            neo4j_exceptions.ClientError,
            neo4j_exceptions.ConstraintError,
        ) as exc:
            logger.error(f"Cypher execution error: {exc} | Query: {query}")
            raise GraphQueryError(f"Cypher query error: {exc}") from exc
        except Exception as exc:
            logger.error(f"Unexpected error executing Cypher query: {exc}")
            raise GraphServiceError(f"Unexpected graph error: {exc}") from exc

    # =========================================================================
    # Schema Initialization & Constraints (TASK-017)
    # =========================================================================

    def initialize_schema(self) -> bool:
        """
        Initialize schema constraints and indexes for nodes and relationships.
        Creates unique constraints for JobPosting, Skill, Role, Company, Location.
        """
        constraints = [
            (
                "constraint_job_id",
                "CREATE CONSTRAINT constraint_job_id IF NOT EXISTS "
                "FOR (j:JobPosting) REQUIRE j.id IS UNIQUE",
            ),
            (
                "constraint_skill_norm",
                "CREATE CONSTRAINT constraint_skill_norm IF NOT EXISTS "
                "FOR (s:Skill) REQUIRE s.normalized_name IS UNIQUE",
            ),
            (
                "constraint_role_norm",
                "CREATE CONSTRAINT constraint_role_norm IF NOT EXISTS "
                "FOR (r:Role) REQUIRE r.normalized_title IS UNIQUE",
            ),
            (
                "constraint_company_name",
                "CREATE CONSTRAINT constraint_company_name IF NOT EXISTS "
                "FOR (c:Company) REQUIRE c.name IS UNIQUE",
            ),
            (
                "constraint_location_city",
                "CREATE CONSTRAINT constraint_location_city IF NOT EXISTS "
                "FOR (l:Location) REQUIRE l.city IS UNIQUE",
            ),
        ]

        indexes = [
            (
                "index_job_city",
                "CREATE INDEX index_job_city IF NOT EXISTS "
                "FOR (j:JobPosting) ON (j.location_city)",
            ),
            (
                "index_job_posted_date",
                "CREATE INDEX index_job_posted_date IF NOT EXISTS "
                "FOR (j:JobPosting) ON (j.posted_date)",
            ),
            (
                "index_skill_category",
                "CREATE INDEX index_skill_category IF NOT EXISTS "
                "FOR (s:Skill) ON (s.category)",
            ),
            (
                "index_role_category",
                "CREATE INDEX index_role_category IF NOT EXISTS "
                "FOR (r:Role) ON (r.category)",
            ),
        ]

        try:
            for name, statement in constraints:
                logger.info(f"Applying constraint: {name}")
                self.execute_query(statement)

            for name, statement in indexes:
                logger.info(f"Applying index: {name}")
                self.execute_query(statement)

            logger.info("Knowledge Graph schema and indexes successfully initialized.")
            return True
        except Exception as exc:
            logger.error(f"Failed to initialize Knowledge Graph schema: {exc}")
            raise GraphServiceError(f"Schema initialization failed: {exc}") from exc

    # =========================================================================
    # Ingestion Pipeline: Ingest Entities & Relationships (TASK-018)
    # =========================================================================

    def ingest_job_posting(self, job_data: dict[str, Any]) -> bool:
        """
        Ingest a single job posting and its extracted entities into Neo4j.
        Merges JobPosting, Company, Location, Role, Skills, and creates/updates
        co-occurrence (RELATED_TO) and role-frequency (COMMON_FOR) edges.

        Args:
            job_data: Dictionary containing:
                - id: str (UUID)
                - title: str
                - description: str (optional)
                - company: str
                - location_city: str
                - location_country: str (default 'IN')
                - salary_min: float (optional)
                - salary_max: float (optional)
                - posted_date: str (ISO)
                - source_url: str
                - source_provider: str
                - extracted_role: str
                - extracted_skills: list[str]
                - skill_categories: dict[str, str] (optional mapping skill -> category)
        """
        job_id = str(job_data.get("id"))
        if not job_id:
            raise ValueError("Job data must include a valid 'id'")

        title = job_data.get("title", "").strip()
        company = (job_data.get("company") or "Unknown Company").strip()
        city = (job_data.get("location_city") or "Remote").strip()
        country = (job_data.get("location_country") or "IN").strip()
        role = (job_data.get("extracted_role") or "General Software Engineer").strip()
        skills = [s.strip() for s in job_data.get("extracted_skills", []) if s and s.strip()]
        skill_categories = job_data.get("skill_categories", {})

        # Prepare normalized values
        normalized_role = " ".join(role.lower().split())
        normalized_skills = [
            {
                "name": s,
                "normalized_name": " ".join(s.lower().split()),
                "category": skill_categories.get(s, "General"),
            }
            for s in skills
        ]

        query = """
        // 1. Merge JobPosting node
        MERGE (j:JobPosting {id: $job_id})
        ON CREATE SET
            j.title = $title,
            j.description = $description,
            j.salary_min = $salary_min,
            j.salary_max = $salary_max,
            j.posted_date = $posted_date,
            j.source_url = $source_url,
            j.source_provider = $source_provider,
            j.location_city = $city,
            j.created_at = datetime()
        ON MATCH SET
            j.title = $title,
            j.salary_min = $salary_min,
            j.salary_max = $salary_max,
            j.updated_at = datetime()

        // 2. Merge Company and link POSTED_BY
        MERGE (c:Company {name: $company})
        MERGE (j)-[:POSTED_BY]->(c)

        // 3. Merge Location and link LOCATED_IN
        MERGE (l:Location {city: $city})
        ON CREATE SET l.country = $country
        MERGE (j)-[:LOCATED_IN]->(l)

        // 4. Merge Role and link BELONGS_TO
        MERGE (r:Role {normalized_title: $normalized_role})
        ON CREATE SET r.title = $role, r.category = 'Engineering'
        MERGE (j)-[:BELONGS_TO]->(r)

        // 5. Merge Skills and link REQUIRES
        WITH j, r
        UNWIND $skills AS skillData
        MERGE (s:Skill {normalized_name: skillData.normalized_name})
        ON CREATE SET s.name = skillData.name, s.category = skillData.category
        MERGE (j)-[:REQUIRES {importance: 'required'}]->(s)

        // 6. Update COMMON_FOR relationship (Skill -> Role)
        MERGE (s)-[cfr:COMMON_FOR]->(r)
        ON CREATE SET cfr.frequency = 1, cfr.trend = 'stable'
        ON MATCH SET cfr.frequency = cfr.frequency + 1

        RETURN count(j) AS updated_count
        """

        params = {
            "job_id": job_id,
            "title": title,
            "description": (job_data.get("description") or "")[:2000],
            "salary_min": job_data.get("salary_min"),
            "salary_max": job_data.get("salary_max"),
            "posted_date": job_data.get("posted_date"),
            "source_url": job_data.get("source_url", ""),
            "source_provider": job_data.get("source_provider", "adzuna"),
            "company": company,
            "city": city,
            "country": country,
            "role": role,
            "normalized_role": normalized_role,
            "skills": normalized_skills,
        }

        self.execute_query(query, params)

        # 7. Update pairwise skill co-occurrence (RELATED_TO)
        if len(normalized_skills) > 1:
            co_occurrence_query = """
            UNWIND $pairs AS pair
            MATCH (s1:Skill {normalized_name: pair[0]})
            MATCH (s2:Skill {normalized_name: pair[1]})
            WHERE id(s1) < id(s2)
            MERGE (s1)-[rel:RELATED_TO]-(s2)
            ON CREATE SET rel.co_occurrence_count = 1
            ON MATCH SET rel.co_occurrence_count = rel.co_occurrence_count + 1
            """
            unique_norm_skills = sorted(list({s["normalized_name"] for s in normalized_skills}))
            pairs = [
                [unique_norm_skills[i], unique_norm_skills[j]]
                for i in range(len(unique_norm_skills))
                for j in range(i + 1, len(unique_norm_skills))
            ]
            self.execute_query(co_occurrence_query, {"pairs": pairs})

        return True

    def ingest_job_postings_batch(self, job_batch: list[dict[str, Any]]) -> dict[str, int]:
        """
        Ingest a batch of job postings into the knowledge graph.
        Returns statistics on successful and failed ingestions.
        """
        success_count = 0
        error_count = 0

        for job_data in job_batch:
            try:
                self.ingest_job_posting(job_data)
                success_count += 1
            except Exception as exc:
                logger.error(f"Error ingesting job {job_data.get('id')} into Neo4j: {exc}")
                error_count += 1

        return {
            "success": success_count,
            "errors": error_count,
            "total": len(job_batch),
        }

    # =========================================================================
    # Knowledge Graph Retrieval & Analytics Queries
    # =========================================================================

    def get_skills_for_role(self, role_name: str, limit: int = 20) -> list[dict[str, Any]]:
        """
        Retrieve the most frequently demanded skills for a given canonical role.
        """
        query = """
        MATCH (r:Role)
        WHERE toLower(r.title) CONTAINS toLower($role_name)
           OR r.normalized_title CONTAINS toLower($role_name)
        MATCH (s:Skill)-[cfr:COMMON_FOR]->(r)
        RETURN s.name AS skill, s.category AS category, cfr.frequency AS frequency
        ORDER BY cfr.frequency DESC
        LIMIT $limit
        """
        return self.execute_query(query, {"role_name": role_name, "limit": limit}, read_only=True)

    def get_related_skills(self, skill_name: str, limit: int = 10) -> list[dict[str, Any]]:
        """
        Find skills that most frequently co-occur with the target skill.
        """
        norm_skill = " ".join(skill_name.lower().split())
        query = """
        MATCH (s1:Skill {normalized_name: $norm_skill})-[rel:RELATED_TO]-(s2:Skill)
        RETURN s2.name AS related_skill, s2.category AS category, rel.co_occurrence_count AS co_occurrence_count
        ORDER BY rel.co_occurrence_count DESC
        LIMIT $limit
        """
        return self.execute_query(query, {"norm_skill": norm_skill, "limit": limit}, read_only=True)

    def get_top_demanded_skills(self, limit: int = 25) -> list[dict[str, Any]]:
        """
        Get the most required skills across all job postings in the graph.
        """
        query = """
        MATCH (j:JobPosting)-[:REQUIRES]->(s:Skill)
        RETURN s.name AS skill, s.category AS category, count(j) AS job_count
        ORDER BY job_count DESC
        LIMIT $limit
        """
        return self.execute_query(query, {"limit": limit}, read_only=True)

    def count_nodes_and_relationships(self) -> dict[str, int]:
        """
        Return the count of all nodes and relationships in the knowledge graph.
        """
        query = """
        CALL {
            MATCH (j:JobPosting) RETURN count(j) AS jobs
        }
        CALL {
            MATCH (s:Skill) RETURN count(s) AS skills
        }
        CALL {
            MATCH (r:Role) RETURN count(r) AS roles
        }
        CALL {
            MATCH (c:Company) RETURN count(c) AS companies
        }
        CALL {
            MATCH (l:Location) RETURN count(l) AS locations
        }
        CALL {
            MATCH ()-[rel]->() RETURN count(rel) AS total_relationships
        }
        RETURN jobs, skills, roles, companies, locations, total_relationships
        """
        res = self.execute_query(query, read_only=True)
        if res:
            return res[0]
        return {
            "jobs": 0, "skills": 0, "roles": 0,
            "companies": 0, "locations": 0, "total_relationships": 0
        }

    def clear_database(self) -> None:
        """
        Clears all nodes and relationships in the graph.
        Primarily intended for testing environments.
        """
        query = "MATCH (n) DETACH DELETE n"
        self.execute_query(query)


# Global singleton holder
_graph_service_instance: GraphService | None = None


def get_graph_service() -> GraphService:
    """
    Return the global singleton GraphService instance.
    """
    global _graph_service_instance
    if _graph_service_instance is None:
        _graph_service_instance = GraphService()
    return _graph_service_instance
