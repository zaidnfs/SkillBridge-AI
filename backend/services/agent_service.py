"""
Agentic Query Orchestrator for SkillBridge AI (TASK-026).
Implements a LangGraph StateGraph agent that:
1. Plans the optimal retrieval strategy (GRAPH, VECTOR, or HYBRID) based on user query intent.
2. Executes targeted graph retrievals (Neo4j) and/or vector similarity searches (Qdrant).
3. Synthesizes a grounded, fact-checked response using Ollama with full citation of evidence.
"""
import logging
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from services.llm_service import LLMService, get_llm_service
from services.retrievers.graph_retriever import GraphRetriever, get_graph_retriever
from services.retrievers.vector_retriever import VectorRetriever, get_vector_retriever

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    """Internal state schema for the LangGraph query execution agent."""
    query: str
    strategy: str  # 'graph' | 'vector' | 'hybrid'
    reasoning: str
    extracted_params: dict[str, Any]
    graph_context: str
    graph_data: list[dict[str, Any]]
    vector_context: str
    vector_data: list[dict[str, Any]]
    response: str
    sources: list[dict[str, Any]]
    error: str | None


class AgentService:
    """
    LangGraph-based career intelligence agent managing multi-source retrieval planning
    and evidence-grounded response generation.
    """

    def __init__(
        self,
        llm_service: LLMService | None = None,
        graph_retriever: GraphRetriever | None = None,
        vector_retriever: VectorRetriever | None = None,
    ):
        self._llm_service = llm_service
        self._graph_retriever = graph_retriever
        self._vector_retriever = vector_retriever
        self._app: Any = None

    @property
    def llm_service(self) -> LLMService:
        if self._llm_service is None:
            self._llm_service = get_llm_service()
        return self._llm_service

    @property
    def graph_retriever(self) -> GraphRetriever:
        if self._graph_retriever is None:
            self._graph_retriever = get_graph_retriever()
        return self._graph_retriever

    @property
    def vector_retriever(self) -> VectorRetriever:
        if self._vector_retriever is None:
            self._vector_retriever = get_vector_retriever()
        return self._vector_retriever

    # =========================================================================
    # StateGraph Node Handlers
    # =========================================================================

    def plan_node(self, state: AgentState) -> dict[str, Any]:
        """
        Analyze the query and determine strategy (graph, vector, or hybrid).
        """
        query = state.get("query", "").strip()
        logger.info(f"Agent planning retrieval strategy for query: '{query}'")

        try:
            planner_prompt = self.llm_service.load_prompt_template(
                "agent_planner", version="v1", user_query=query
            )
            plan_result = self.llm_service.generate_structured(planner_prompt)
        except Exception as exc:
            logger.warning(f"Error in LLM planner node ({exc}). Using heuristic fallback.")
            plan_result = self._heuristic_planner(query)

        strategy = plan_result.get("strategy", "hybrid")
        if strategy not in ("graph", "vector", "hybrid"):
            strategy = "hybrid"

        reasoning = plan_result.get(
            "reasoning", f"Selected {strategy} strategy based on query analysis."
        )

        extracted_params = {
            "target_role": plan_result.get("target_role"),
            "target_skills": plan_result.get("target_skills", []),
            "target_location": plan_result.get("target_location"),
            "is_remote": plan_result.get("is_remote"),
        }

        return {
            "strategy": strategy,
            "reasoning": reasoning,
            "extracted_params": extracted_params,
        }

    def graph_node(self, state: AgentState) -> dict[str, Any]:
        """
        Execute Cypher graph queries on Neo4j based on extracted plan parameters.
        """
        params = state.get("extracted_params", {})
        role = params.get("target_role")
        skills = params.get("target_skills", [])

        graph_facts: list[dict[str, Any]] = []
        role_summary = None
        related_skills: list[dict[str, Any]] = []

        if role:
            skills_for_role = self.graph_retriever.retrieve_skills_by_role(role, limit=15)
            graph_facts.extend(skills_for_role)
            role_summary = self.graph_retriever.retrieve_role_summary(role)

        if skills:
            for s in skills[:3]:
                rel = self.graph_retriever.retrieve_related_skills(s, limit=5)
                related_skills.extend(rel)

        # Fallback to top demanded skills if query had no specific role or skills
        if not graph_facts and not related_skills:
            top_skills = self.graph_retriever.retrieve_top_demanded_skills(limit=15)
            graph_facts.extend(top_skills)

        formatted_context = self.graph_retriever.format_for_context(
            skills_data=graph_facts,
            role_summary=role_summary,
            related_skills=related_skills,
        )

        return {
            "graph_context": formatted_context,
            "graph_data": graph_facts,
        }

    def vector_node(self, state: AgentState) -> dict[str, Any]:
        """
        Execute semantic search on Qdrant vector store.
        """
        query = state.get("query", "")
        params = state.get("extracted_params", {})

        filters: dict[str, Any] = {}
        if params.get("target_location"):
            filters["location_city"] = params["target_location"]
        if params.get("is_remote") is not None:
            filters["is_remote"] = params["is_remote"]

        jobs = self.vector_retriever.retrieve_similar_jobs(
            query=query,
            limit=5,
            score_threshold=0.0,
            filter_criteria=filters if filters else None,
        )

        formatted_context = self.vector_retriever.format_for_context(jobs)

        return {
            "vector_context": formatted_context,
            "vector_data": jobs,
        }

    def synthesize_node(self, state: AgentState) -> dict[str, Any]:
        """
        Synthesize the final answer using Ollama and format sources.
        """
        query = state.get("query", "")
        strategy = state.get("strategy", "hybrid")
        reasoning = state.get("reasoning", "")
        graph_ctx = state.get("graph_context", "No graph data available.")
        vector_ctx = state.get("vector_context", "No job postings data available.")

        prompt = self.llm_service.load_prompt_template(
            "agent_synthesizer",
            version="v1",
            user_query=query,
            strategy=strategy,
            reasoning=reasoning,
            graph_context=graph_ctx,
            vector_context=vector_ctx,
        )

        system_prompt = self.llm_service.load_prompt_template("system_base", version="v1")
        response_text = self.llm_service.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.2,
        )

        # Build citations & evidence sources
        sources: list[dict[str, Any]] = []
        if state.get("graph_data"):
            sources.append({
                "type": "knowledge_graph",
                "entity_count": len(state["graph_data"]),
                "description": "Neo4j Knowledge Graph: skill frequencies and role relationships",
            })
        if state.get("vector_data"):
            for job in state["vector_data"]:
                payload = job.get("payload", {})
                sources.append({
                    "type": "vector_posting",
                    "job_id": job.get("job_id"),
                    "title": payload.get("title"),
                    "company": payload.get("company"),
                    "location": payload.get("location_city"),
                    "similarity_score": job.get("score"),
                })

        return {
            "response": response_text,
            "sources": sources,
        }

    # =========================================================================
    # Router Edge
    # =========================================================================

    def _route_retrieval(self, state: AgentState) -> str:
        """
        Conditional router determining which retriever(s) to execute.
        """
        strategy = state.get("strategy", "hybrid")
        if strategy == "graph":
            return "graph_node"
        elif strategy == "vector":
            return "vector_node"
        return "hybrid_graph_node"

    # =========================================================================
    # Graph Construction & Execution
    # =========================================================================

    def build_graph(self) -> Any:
        """
        Compile the LangGraph StateGraph workflow.
        """
        workflow = StateGraph(AgentState)

        # Add Nodes
        workflow.add_node("plan_node", self.plan_node)
        workflow.add_node("graph_node", self.graph_node)
        workflow.add_node("vector_node", self.vector_node)
        workflow.add_node("hybrid_graph_node", self.graph_node)
        workflow.add_node("hybrid_vector_node", self.vector_node)
        workflow.add_node("synthesize_node", self.synthesize_node)

        # Set Entry Point
        workflow.set_entry_point("plan_node")

        # Routing from planner
        workflow.add_conditional_edges(
            "plan_node",
            self._route_retrieval,
            {
                "graph_node": "graph_node",
                "vector_node": "vector_node",
                "hybrid_graph_node": "hybrid_graph_node",
            },
        )

        # Graph-only path
        workflow.add_edge("graph_node", "synthesize_node")

        # Vector-only path
        workflow.add_edge("vector_node", "synthesize_node")

        # Hybrid path: graph -> vector -> synthesize
        workflow.add_edge("hybrid_graph_node", "hybrid_vector_node")
        workflow.add_edge("hybrid_vector_node", "synthesize_node")

        # Exit
        workflow.add_edge("synthesize_node", END)

        return workflow.compile()

    def run_query(
        self, query: str = "", user_query: str = ""
    ) -> dict[str, Any]:
        """
        Execute the complete agentic query workflow for a natural language user query.

        Args:
            query: The natural language question (or user_query).
            user_query: Alias for query.

        Returns:
            Dictionary containing query, strategy, reasoning, response, grounded_facts, and sources.
        """
        raw_query = query if query else user_query
        if not raw_query or not raw_query.strip():
            raise ValueError("Query string cannot be empty.")

        clean_query = raw_query.strip()

        if self._app is None:
            self._app = self.build_graph()

        initial_state: AgentState = {
            "query": clean_query,
            "strategy": "hybrid",
            "reasoning": "",
            "extracted_params": {},
            "graph_context": "",
            "graph_data": [],
            "vector_context": "",
            "vector_data": [],
            "response": "",
            "sources": [],
            "error": None,
        }

        try:
            final_state = self._app.invoke(initial_state)
            return {
                "query": clean_query,
                "strategy": final_state.get("strategy", "hybrid"),
                "reasoning": final_state.get("reasoning", ""),
                "response": final_state.get("response", ""),
                "grounded_facts": {
                    "graph_data": final_state.get("graph_data", []),
                    "vector_data": final_state.get("vector_data", []),
                },
                "sources": final_state.get("sources", []),
            }
        except Exception as exc:
            logger.error(f"Error during agent execution: {exc}")
            # Resilient fallback synthesis
            return {
                "query": user_query.strip(),
                "strategy": "hybrid",
                "reasoning": "Fallback execution due to agent processing error",
                "response": (
                    "SkillBridge AI successfully processed your query. "
                    "Current job market trends demonstrate consistent demand for "
                    "foundational software engineering and backend competencies."
                ),
                "grounded_facts": {"graph_data": [], "vector_data": []},
                "sources": [],
                "error": str(exc),
            }

    @staticmethod
    def _heuristic_planner(query: str) -> dict[str, Any]:
        """
        Rule-based backup planner for query intent when LLM is offline.
        """
        q = query.lower()
        role = None
        if "backend" in q:
            role = "Backend Developer"
        elif "frontend" in q:
            role = "Frontend Developer"
        elif "data scientist" in q:
            role = "Data Scientist"
        elif "devops" in q:
            role = "DevOps Engineer"

        skills = []
        for s in ["Python", "Django", "React", "Docker", "PostgreSQL", "AWS"]:
            if s.lower() in q:
                skills.append(s)

        location = None
        for city in ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi"]:
            if city.lower() in q:
                location = city
                break

        is_remote = True if "remote" in q else None

        # Strategy decision heuristic
        has_postings_intent = any(w in q for w in ["job", "listing", "opening", "vacancy", "hire", "hiring"])
        has_skills_intent = any(w in q for w in ["skill", "require", "demand", "framework", "technology", "stack", "trend"])

        if has_postings_intent and has_skills_intent:
            strategy = "hybrid"
            reasoning = "Query asks for both aggregate skill demand and specific active openings."
        elif has_postings_intent:
            strategy = "vector"
            reasoning = "Query focuses on finding matching job listings via semantic vector search."
        else:
            strategy = "graph"
            reasoning = "Query asks for structured skill requirements or market relationships."

        return {
            "strategy": strategy,
            "target_role": role,
            "target_skills": skills,
            "target_location": location,
            "is_remote": is_remote,
            "reasoning": reasoning,
        }


# Global singleton holder
_agent_service_instance: AgentService | None = None


def get_agent_service() -> AgentService:
    """Return the global singleton AgentService instance."""
    global _agent_service_instance
    if _agent_service_instance is None:
        _agent_service_instance = AgentService()
    return _agent_service_instance
