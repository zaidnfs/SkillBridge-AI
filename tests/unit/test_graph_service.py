"""
Unit tests for Neo4j GraphService.
Validates test cases U-19 through U-24 from Docs/TEST_PLAN.md:
- U-19: Create a Skill node
- U-20: Create a Role node
- U-21: Create a REQUIRES relationship
- U-22: Query skills for a role
- U-23: Parameterized Cypher queries (immune to injection)
- U-24: Graceful handling of Neo4j connection failure
"""
from unittest.mock import MagicMock, patch

import pytest
from neo4j.exceptions import AuthError, CypherSyntaxError, ServiceUnavailable

from services.graph_service import (
    GraphConnectionError,
    GraphQueryError,
    GraphService,
    GraphServiceError,
    get_graph_service,
)


class TestGraphServiceConnection:
    """Tests connection management, driver initialization, and health checks."""

    def test_u24_handle_connection_failure(self):
        """U-24: Verify graceful error handling when Neo4j is unavailable."""
        service = GraphService(
            uri="bolt://invalid-host:7687",
            user="neo4j",
            password="wrong_password",
            connection_timeout=0.1,
        )

        with patch.object(service, "driver") as mock_driver:
            mock_driver.verify_connectivity.side_effect = ServiceUnavailable("Unable to connect")
            is_connected = service.verify_connectivity()
            assert is_connected is False

    def test_u24_query_execution_connection_error(self):
        """U-24: Verify GraphConnectionError is raised when session execution fails."""
        service = GraphService(connection_timeout=0.1)

        with patch.object(service, "driver") as mock_driver:
            mock_driver.session.side_effect = ServiceUnavailable("Connection lost")
            with pytest.raises(GraphConnectionError) as exc_info:
                service.execute_query("MATCH (n) RETURN n")
            assert "Neo4j connection error" in str(exc_info.value)

    def test_auth_error_handling(self):
        """Verify AuthError raises GraphConnectionError."""
        service = GraphService(connection_timeout=0.1)

        with patch.object(service, "driver") as mock_driver:
            mock_driver.session.side_effect = AuthError("Unauthorized")
            with pytest.raises(GraphConnectionError):
                service.execute_query("MATCH (n) RETURN n")

    def test_cypher_syntax_error_handling(self):
        """Verify CypherSyntaxError raises GraphQueryError."""
        service = GraphService(connection_timeout=0.1)
        mock_session = MagicMock()
        mock_session.execute_write.side_effect = CypherSyntaxError("Syntax error in query")

        with patch.object(service, "driver") as mock_driver:
            mock_driver.session.return_value.__enter__.return_value = mock_session
            with pytest.raises(GraphQueryError):
                service.execute_query("INVALID CYPHER SYNTAX")

    def test_singleton_get_graph_service(self):
        """Verify get_graph_service returns a singleton instance."""
        s1 = get_graph_service()
        s2 = get_graph_service()
        assert s1 is s2


class TestGraphServiceSchemaAndInjection:
    """Tests schema constraints, indexes, and Cypher parameterization."""

    def test_initialize_schema(self):
        """Verify schema constraints and indexes statements are executed."""
        service = GraphService()
        executed_queries = []

        def fake_execute(query, parameters=None, read_only=False):
            executed_queries.append(query)
            return []

        with patch.object(service, "execute_query", side_effect=fake_execute):
            success = service.initialize_schema()
            assert success is True
            assert len(executed_queries) >= 9  # 5 constraints + 4 indexes
            assert any("FOR (j:JobPosting) REQUIRE j.id IS UNIQUE" in q for q in executed_queries)
            assert any("FOR (s:Skill) REQUIRE s.normalized_name IS UNIQUE" in q for q in executed_queries)
            assert any("FOR (r:Role) REQUIRE r.normalized_title IS UNIQUE" in q for q in executed_queries)

    def test_u23_parameterized_query_cypher_injection_safety(self):
        """
        U-23: Verify queries use parameter dicts rather than raw string concatenation.
        Even inputs containing malicious Cypher fragments must be safely passed as parameters.
        """
        service = GraphService()
        malicious_input = "Python' OR 1=1 DETACH DELETE n //"
        executed_calls = []

        def fake_execute(query, parameters=None, read_only=False):
            executed_calls.append({"query": query, "parameters": parameters})
            return [{"skill": "Python", "frequency": 5}]

        with patch.object(service, "execute_query", side_effect=fake_execute):
            service.get_skills_for_role(malicious_input)

            assert len(executed_calls) == 1
            call = executed_calls[0]
            # Verify the query itself does NOT contain the injected string directly
            assert malicious_input not in call["query"]
            # Verify the malicious string is strictly confined inside parameters
            assert call["parameters"]["role_name"] == malicious_input


class TestGraphServiceIngestionAndQueries:
    """Tests nodes and relationship ingestion (U-19, U-20, U-21, U-22)."""

    def test_u19_u20_u21_ingest_job_posting(self):
        """
        U-19, U-20, U-21: Ingest a job posting and verify nodes (JobPosting, Role,
        Skill, Company, Location) and relationships (REQUIRES, POSTED_BY, LOCATED_IN,
        BELONGS_TO, COMMON_FOR, RELATED_TO) are created via Cypher.
        """
        service = GraphService()
        queries_run = []

        def fake_execute(query, parameters=None, read_only=False):
            queries_run.append({"query": query, "parameters": parameters})
            return [{"updated_count": 1}]

        with patch.object(service, "execute_query", side_effect=fake_execute):
            job_payload = {
                "id": "11111111-2222-3333-4444-555555555555",
                "title": "Senior Backend Engineer",
                "description": "Looking for Python, Django, PostgreSQL expert.",
                "company": "TechNova",
                "location_city": "Bengaluru",
                "location_country": "IN",
                "salary_min": 1800000.0,
                "salary_max": 2500000.0,
                "posted_date": "2026-09-29T10:00:00Z",
                "source_url": "https://adzuna.in/jobs/123",
                "source_provider": "adzuna",
                "extracted_role": "Backend Developer",
                "extracted_skills": ["Python", "Django", "PostgreSQL"],
                "skill_categories": {
                    "Python": "Languages",
                    "Django": "Frameworks",
                    "PostgreSQL": "Databases",
                },
            }

            result = service.ingest_job_posting(job_payload)
            assert result is True

            # Must have executed main ingestion query + co-occurrence query
            assert len(queries_run) == 2

            # Check primary query parameters
            main_call = queries_run[0]
            params = main_call["parameters"]
            assert params["job_id"] == "11111111-2222-3333-4444-555555555555"
            assert params["company"] == "TechNova"
            assert params["city"] == "Bengaluru"
            assert params["role"] == "Backend Developer"
            assert params["normalized_role"] == "backend developer"
            assert len(params["skills"]) == 3
            assert any(s["name"] == "Python" for s in params["skills"])

            # Check co-occurrence query for pairwise RELATED_TO edges
            cooccur_call = queries_run[1]
            pairs = cooccur_call["parameters"]["pairs"]
            # 3 skills -> 3 unique pairs: (django, postgresql), (django, python), (postgresql, python)
            assert len(pairs) == 3

    def test_u22_query_skills_for_role(self):
        """U-22: Retrieve the most frequently required skills for a role."""
        service = GraphService()
        expected_skills = [
            {"skill": "Python", "category": "Languages", "frequency": 42},
            {"skill": "Django", "category": "Frameworks", "frequency": 38},
            {"skill": "PostgreSQL", "category": "Databases", "frequency": 30},
        ]

        def fake_execute(query, parameters=None, read_only=False):
            assert "MATCH (s:Skill)-[cfr:COMMON_FOR]->(r)" in query
            assert parameters["role_name"] == "Backend Developer"
            return expected_skills

        with patch.object(service, "execute_query", side_effect=fake_execute):
            skills = service.get_skills_for_role("Backend Developer", limit=10)
            assert len(skills) == 3
            assert skills[0]["skill"] == "Python"
            assert skills[0]["frequency"] == 42

    def test_get_related_skills(self):
        """Test retrieving co-occurring skills for a target skill."""
        service = GraphService()
        expected = [
            {"related_skill": "Django", "category": "Frameworks", "co_occurrence_count": 25},
            {"related_skill": "FastAPI", "category": "Frameworks", "co_occurrence_count": 18},
        ]

        def fake_execute(query, parameters=None, read_only=False):
            assert "RELATED_TO" in query
            assert parameters["norm_skill"] == "python"
            return expected

        with patch.object(service, "execute_query", side_effect=fake_execute):
            related = service.get_related_skills("Python", limit=5)
            assert len(related) == 2
            assert related[0]["related_skill"] == "Django"

    def test_ingest_job_postings_batch(self):
        """Test batch ingestion error resilience and count reporting."""
        service = GraphService()
        calls = []

        def fake_ingest(item):
            calls.append(item)
            if item.get("id") == "bad-id":
                raise ValueError("Simulated ingestion error")
            return True

        with patch.object(service, "ingest_job_posting", side_effect=fake_ingest):
            batch = [
                {"id": "job-1", "title": "Dev 1"},
                {"id": "bad-id", "title": "Dev 2"},
                {"id": "job-3", "title": "Dev 3"},
            ]
            summary = service.ingest_job_postings_batch(batch)
            assert summary["total"] == 3
            assert summary["success"] == 2
            assert summary["errors"] == 1
