"""
Unit tests for LangGraph AgentService (TASK-026, TASK-028).
Tests state graph compilation, planning logic, retriever dispatch, and response synthesis.
"""
import pytest
from unittest.mock import MagicMock

from services.agent_service import AgentService, get_agent_service


@pytest.fixture
def mock_llm_service():
    service = MagicMock()
    service.load_prompt_template.return_value = "Synthesized prompt template"
    service.generate.return_value = "Based on our analysis, Python and Django are essential skills."
    service.generate_structured.return_value = {
        "strategy": "graph",
        "reasoning": "User asks for skills required by a specific role.",
        "target_role": "Backend Engineer",
        "target_skills": ["Python", "Django"],
        "target_location": None,
        "is_remote": None,
    }
    return service


@pytest.fixture
def mock_graph_retriever():
    retriever = MagicMock()
    retriever.retrieve_skills_by_role.return_value = [
        {"skill": "Python", "frequency": 40, "importance": "high"},
        {"skill": "Django", "frequency": 25, "importance": "medium"},
    ]
    retriever.retrieve_role_summary.return_value = {
        "canonical_role": "Backend Engineer",
        "total_jobs": 45,
        "top_skills": ["Python", "Django"],
    }
    retriever.retrieve_related_skills.return_value = [
        {"related_skill": "PostgreSQL", "co_occurrence_count": 15}
    ]
    retriever.format_for_context.return_value = "### Demanded Skills:\n- Python: 40\n- Django: 25"
    return retriever


@pytest.fixture
def mock_vector_retriever():
    retriever = MagicMock()
    retriever.retrieve_similar_jobs.return_value = [
        {
            "job_id": "11111111-1111-1111-1111-111111111111",
            "score": 0.89,
            "payload": {
                "title": "Backend Python Engineer",
                "company": "Tech Corp",
                "location_city": "Bengaluru",
                "skills": ["Python", "Django"],
            },
        }
    ]
    retriever.format_for_context.return_value = "[1] Backend Python Engineer at Tech Corp"
    return retriever


@pytest.fixture
def agent_service(mock_llm_service, mock_graph_retriever, mock_vector_retriever):
    return AgentService(
        llm_service=mock_llm_service,
        graph_retriever=mock_graph_retriever,
        vector_retriever=mock_vector_retriever,
    )


class TestAgentService:
    """Unit tests for AgentService workflow and node behavior."""

    def test_plan_node_structured_llm(self, agent_service, mock_llm_service):
        """
        Verify plan_node parses structured strategy output from LLM.
        """
        state = {"query": "What are the most required skills for a Backend Engineer?"}
        plan_output = agent_service.plan_node(state)

        assert plan_output["strategy"] == "graph"
        assert plan_output["extracted_params"]["target_role"] == "Backend Engineer"
        assert "Python" in plan_output["extracted_params"]["target_skills"]
        mock_llm_service.generate_structured.assert_called_once()

    def test_plan_node_heuristic_fallback(self, agent_service, mock_llm_service):
        """
        Verify plan_node falls back to deterministic heuristic planner if LLM fails.
        """
        mock_llm_service.generate_structured.side_effect = Exception("Ollama server unavailable")

        state = {"query": "What are the most demanded skills for Python Backend Developer?"}
        plan_output = agent_service.plan_node(state)

        # Heuristic planner should recognize "demanded skills" as graph strategy
        assert plan_output["strategy"] == "graph"
        assert "skill" in plan_output["reasoning"].lower() or "graph" in plan_output["reasoning"].lower()

    def test_route_retrieval_conditional_edges(self, agent_service):
        """
        Verify _route_retrieval directs execution based on planned strategy.
        """
        assert agent_service._route_retrieval({"strategy": "graph"}) == "graph_node"
        assert agent_service._route_retrieval({"strategy": "vector"}) == "vector_node"
        assert agent_service._route_retrieval({"strategy": "hybrid"}) == "hybrid_graph_node"
        assert agent_service._route_retrieval({"strategy": "unknown"}) == "hybrid_graph_node"

    def test_graph_node_execution(self, agent_service, mock_graph_retriever):
        """
        Verify graph_node invokes GraphRetriever methods and populates graph_context.
        """
        state = {
            "query": "Backend skills",
            "extracted_params": {
                "target_role": "Backend Engineer",
                "target_skills": ["Python"],
            },
        }
        output = agent_service.graph_node(state)

        assert "graph_context" in output
        assert "graph_data" in output
        assert len(output["graph_data"]) > 0
        mock_graph_retriever.retrieve_skills_by_role.assert_called_once_with(
            "Backend Engineer", limit=15
        )
        mock_graph_retriever.format_for_context.assert_called_once()

    def test_vector_node_execution(self, agent_service, mock_vector_retriever):
        """
        Verify vector_node invokes VectorRetriever methods and populates vector_context.
        """
        state = {
            "query": "Find remote backend jobs",
            "extracted_params": {
                "target_location": "Bengaluru",
                "is_remote": True,
            },
        }
        output = agent_service.vector_node(state)

        assert "vector_context" in output
        assert "vector_data" in output
        assert len(output["vector_data"]) == 1
        mock_vector_retriever.retrieve_similar_jobs.assert_called_once()
        _, kwargs = mock_vector_retriever.retrieve_similar_jobs.call_args
        assert kwargs["filter_criteria"] == {"location_city": "Bengaluru", "is_remote": True}

    def test_synthesize_node_execution(self, agent_service, mock_llm_service):
        """
        Verify synthesize_node renders prompt template, calls LLM, and formats citations.
        """
        state = {
            "query": "Which skills should I learn for Backend development?",
            "strategy": "hybrid",
            "reasoning": "Requires skills demand and active job listings.",
            "graph_context": "Top skills: Python, Django",
            "graph_data": [{"skill": "Python"}, {"skill": "Django"}],
            "vector_context": "[1] Backend Engineer at Tech Corp",
            "vector_data": [
                {
                    "job_id": "11111111-1111-1111-1111-111111111111",
                    "score": 0.89,
                    "payload": {
                        "title": "Backend Engineer",
                        "company": "Tech Corp",
                        "location_city": "Bengaluru",
                    },
                }
            ],
        }
        output = agent_service.synthesize_node(state)

        assert "response" in output
        assert "sources" in output
        assert len(output["sources"]) == 2  # 1 graph source + 1 vector source
        assert output["sources"][0]["type"] == "knowledge_graph"
        assert output["sources"][1]["type"] == "vector_posting"
        assert output["sources"][1]["title"] == "Backend Engineer"
        mock_llm_service.generate.assert_called_once()

    def test_run_query_validation(self, agent_service):
        """
        Verify run_query rejects empty and whitespace queries.
        """
        with pytest.raises(ValueError, match="Query string cannot be empty"):
            agent_service.run_query("")

        with pytest.raises(ValueError, match="Query string cannot be empty"):
            agent_service.run_query("    ")

    def test_run_query_end_to_end(self, agent_service):
        """
        Verify end-to-end execution of run_query through the LangGraph StateGraph.
        """
        result = agent_service.run_query("What are the key skills for Backend Engineer?")

        assert result["query"] == "What are the key skills for Backend Engineer?"
        assert result["strategy"] == "graph"
        assert "Python" in result["response"]
        assert len(result["sources"]) > 0
        assert "grounded_facts" in result
        assert "graph_data" in result["grounded_facts"]

    def test_get_agent_service_singleton(self):
        """
        Verify factory get_agent_service returns a singleton instance.
        """
        a1 = get_agent_service()
        a2 = get_agent_service()
        assert a1 is a2
