"""
Interview Service for SkillBridge AI (TASK-050 & TASK-051).
Coordinates role skill discovery from the Neo4j Knowledge Graph,
role-specific question generation via Ollama LLM, candidate answer evaluation,
and interview session summary synthesis with offline resilience.
"""
import json
import logging
import re
from typing import Any

from services.graph_service import GraphService, get_graph_service
from services.llm_service import LLMService, get_llm_service

logger = logging.getLogger(__name__)

DEFAULT_ROLE_SKILLS: dict[str, list[str]] = {
    "backend developer": ["Python", "Django", "PostgreSQL", "Docker", "REST API", "Redis"],
    "frontend developer": ["JavaScript", "TypeScript", "React", "CSS", "Tailwind CSS", "HTML5"],
    "full stack developer": ["Python", "React", "Node.js", "PostgreSQL", "Docker", "REST API"],
    "data scientist": ["Python", "Pandas", "NumPy", "Scikit-Learn", "SQL", "Machine Learning"],
    "data engineer": ["Python", "SQL", "Apache Spark", "Airflow", "Kafka", "Data Modeling"],
    "devops engineer": ["Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "AWS"],
    "software engineer": ["Python", "Data Structures", "Algorithms", "System Design", "Git", "SQL"],
}

NON_ANSWER_PATTERNS: list[str] = [
    r"^(i\s*)?(do\s*not|don'?t)\s*know",
    r"^(i\s*have\s*)?no\s*(idea|clue)",
    r"^(not\s*sure|unsure)",
    r"^(idk|dunno|pass|skip)",
    r"^i\s*(can\s*not|can'?t)\s*answer",
    r"^i\s*am\s*not\s*(sure|familiar|aware)",
    r"^(nothing|none|n/a|na|no|nope)$",
    r"^not\s*aware",
    r"^(no\s*answer|blank|skip\s*this)",
]

FALLBACK_QUESTIONS: dict[str, list[dict[str, Any]]] = {
    "backend developer": [
        {
            "order": 1,
            "skill_focus": "Python & Concurrency",
            "difficulty": "intermediate",
            "question_text": (
                "Explain the Global Interpreter Lock (GIL) in Python. How does it impact CPU-bound "
                "versus I/O-bound multi-threaded applications, and what architectural strategies "
                "would you use to achieve true parallelism?"
            ),
            "expected_points": [
                "GIL prevents multiple native threads from executing Python bytecode simultaneously",
                "I/O-bound tasks release the GIL during I/O wait, making threading beneficial",
                "CPU-bound tasks require multiprocessing or C-extensions to bypass the GIL",
                "Asyncio provides single-threaded cooperative multitasking for high-concurrency I/O",
            ],
        },
        {
            "order": 2,
            "skill_focus": "PostgreSQL & Database Optimization",
            "difficulty": "intermediate",
            "question_text": (
                "In a high-traffic web application, you notice a critical API endpoint experiencing "
                "slow database query execution. What systematic steps would you take to diagnose "
                "and resolve the performance bottleneck in PostgreSQL?"
            ),
            "expected_points": [
                "Use EXPLAIN (ANALYZE, BUFFERS) to inspect the query execution plan",
                "Identify missing or suboptimal B-tree/GIN indexes and sequential scans",
                "Resolve ORM N+1 query patterns using select_related or prefetch_related",
                "Evaluate connection pooling, vacuuming, and caching layer (e.g. Redis)",
            ],
        },
        {
            "order": 3,
            "skill_focus": "System Design & REST API",
            "difficulty": "intermediate",
            "question_text": (
                "How would you design an idempotent payment processing or webhook ingestion endpoint? "
                "What headers, database constraints, and state transitions ensure duplicate requests "
                "never cause double processing?"
            ),
            "expected_points": [
                "Use an Idempotency-Key header stored in an atomic cache or database table",
                "Enforce unique database constraints and transactional state updates",
                "Implement distributed locking (e.g. Redis Redlock) during in-flight processing",
                "Return the exact cached response on duplicate attempts with a 200 OK",
            ],
        },
    ],
    "frontend developer": [
        {
            "order": 1,
            "skill_focus": "React & State Management",
            "difficulty": "intermediate",
            "question_text": (
                "Explain how React's reconciliation algorithm and Virtual DOM diffing work. "
                "What causes unnecessary re-renders in a component tree, and what techniques do you "
                "use to optimize rendering performance?"
            ),
            "expected_points": [
                "Virtual DOM creates an in-memory representation reconciled with actual DOM",
                "Key prop uniquely identifies elements across renders to minimize reordering overhead",
                "useMemo, useCallback, and React.memo prevent recomputing and rerendering unchanged children",
                "Colocate state and avoid lifting state higher than necessary",
            ],
        },
        {
            "order": 2,
            "skill_focus": "TypeScript & Type Safety",
            "difficulty": "intermediate",
            "question_text": (
                "What is the difference between 'unknown', 'any', and 'never' in TypeScript? "
                "Provide an example where using type narrowing and discriminated unions provides "
                "compile-time safety for API responses."
            ),
            "expected_points": [
                "'any' turns off type checking, whereas 'unknown' requires explicit type checking/narrowing",
                "'never' represents values that never occur (e.g. exhaustive switch cases)",
                "Discriminated unions use a common literal tag to narrow types safely",
            ],
        },
        {
            "order": 3,
            "skill_focus": "Web Performance & Core Web Vitals",
            "difficulty": "intermediate",
            "question_text": (
                "How do you optimize Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) "
                "in a modern client-heavy web application?"
            ),
            "expected_points": [
                "LCP: Preload hero assets, compress images (WebP/AVIF), prioritize critical CSS",
                "CLS: Set explicit width and height on images/embeds, reserve space for dynamic content",
                "Code-splitting via dynamic imports to reduce initial JavaScript bundle size",
            ],
        },
    ],
    "general": [
        {
            "order": 1,
            "skill_focus": "Software Architecture",
            "difficulty": "intermediate",
            "question_text": (
                "Describe a situation where you had to refactor a monolithic component or script "
                "into modular, testable units. What design patterns or principles (such as SOLID) guided you?"
            ),
            "expected_points": [
                "Single Responsibility Principle: each module handles one discrete task",
                "Dependency Inversion: depending on abstractions rather than concrete implementations",
                "Writing unit tests before or during refactoring to prevent regressions",
            ],
        },
        {
            "order": 2,
            "skill_focus": "Debugging & Production Incidents",
            "difficulty": "intermediate",
            "question_text": (
                "Walk through your step-by-step methodology when troubleshooting an intermittent production "
                "error that cannot be reproduced locally."
            ),
            "expected_points": [
                "Inspect structured application logs, error monitoring (Sentry), and APM metrics",
                "Isolate system boundaries: database connections, external APIs, rate limits",
                "Reproduce under simulated production load or with sanitized production data snapshot",
            ],
        },
        {
            "order": 3,
            "skill_focus": "Git & CI/CD",
            "difficulty": "intermediate",
            "question_text": (
                "How do you design a robust CI/CD pipeline to ensure zero-downtime releases and high code quality?"
            ),
            "expected_points": [
                "Automated linting, unit testing, and security scanning on every pull request",
                "Database migrations executed before or in lockstep with backwards-compatible deployments",
                "Rolling updates or blue-green deployments to ensure zero service disruption",
            ],
        },
    ],
}


class InterviewService:
    """
    Coordinates question generation, response evaluation, and summary synthesis.
    """

    def __init__(
        self,
        graph_service: GraphService | None = None,
        llm_service: LLMService | None = None,
    ):
        self._graph_service = graph_service
        self._llm_service = llm_service

    @property
    def graph_service(self) -> GraphService:
        if self._graph_service is None:
            self._graph_service = get_graph_service()
        return self._graph_service

    @property
    def llm_service(self) -> LLMService:
        if self._llm_service is None:
            self._llm_service = get_llm_service()
        return self._llm_service

    def get_skills_for_role(
        self,
        role_title: str,
        candidate_skills: list[str] | None = None,
        limit: int = 8,
    ) -> list[str]:
        """
        Retrieve high-demand skills for a given role from the Neo4j Knowledge Graph.
        Falls back to curated industry mappings if the graph has insufficient data.
        """
        role_clean = role_title.strip()
        matched_skills: list[str] = []

        # Fast circuit-breaker check before attempting network query
        if self.graph_service.is_available():
            try:
                records = self.graph_service.get_skills_for_role(role_clean, limit=limit)
                if records:
                    for rec in records:
                        s_name = rec.get("skill")
                        if s_name and s_name not in matched_skills:
                            matched_skills.append(s_name)
            except Exception as exc:
                logger.warning(f"Failed to query knowledge graph for role '{role_clean}': {exc}")
        else:
            logger.debug(f"Knowledge Graph offline; utilizing curated default skills for role '{role_clean}'.")

        # If graph yielded few or no skills, augment with default role skills
        if len(matched_skills) < 3:
            role_lower = role_clean.lower()
            for key, skills in DEFAULT_ROLE_SKILLS.items():
                if key in role_lower or role_lower in key:
                    for s in skills:
                        if s not in matched_skills:
                            matched_skills.append(s)
                    break

        if not matched_skills:
            matched_skills = ["Problem Solving", "System Design", "Algorithms", "Testing", "Git"]

        # Prioritize candidate skills / gaps if specified
        if candidate_skills:
            combined = [s for s in candidate_skills if s in matched_skills]
            for s in matched_skills:
                if s not in combined:
                    combined.append(s)
            matched_skills = combined

        return matched_skills[:limit]

    def generate_questions(
        self,
        role_title: str,
        target_skills: list[str] | None = None,
        num_questions: int = 3,
        difficulty: str = "intermediate",
    ) -> list[dict[str, Any]]:
        """
        Generate structured interview questions grounded in knowledge graph skills and role.
        """
        num_questions = max(1, min(num_questions, 5))
        skills_to_test = target_skills or self.get_skills_for_role(role_title, limit=6)
        skills_str = ", ".join(skills_to_test) if skills_to_test else "General Software Engineering"

        # Check if LLM fallback mode is active or LLM is unreachable
        if getattr(self.llm_service, "fallback_mode", False) and not self.llm_service.is_available():
            return self._fallback_questions(role_title, num_questions, difficulty)

        try:
            prompt = self.llm_service.load_prompt(
                "interview_question_generator",
                version="v1",
                role_title=role_title,
                target_skills=skills_str,
                difficulty=difficulty,
                num_questions=num_questions,
            )
            system_prompt = (
                "You are a Senior Principal Technical Interviewer. "
                "Respond with valid JSON array of questions only."
            )
            response_text = self.llm_service.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=1500,
            )

            parsed = self._extract_json_array(response_text)
            if parsed and isinstance(parsed, list) and len(parsed) >= 1:
                # Sanitize and re-number orders
                validated = []
                for idx, item in enumerate(parsed[:num_questions]):
                    validated.append({
                        "order": idx + 1,
                        "skill_focus": item.get("skill_focus", skills_to_test[idx % len(skills_to_test)]),
                        "difficulty": item.get("difficulty", difficulty),
                        "question_text": item.get("question_text", f"Explain core concepts of {role_title}."),
                        "expected_points": item.get("expected_points", ["Conceptual correctness", "Practical trade-offs"]),
                    })
                return validated

            logger.warning(f"Could not parse valid question array from LLM: {response_text[:200]}")
            return self._fallback_questions(role_title, num_questions, difficulty)

        except Exception as exc:
            logger.error(f"Error generating interview questions with LLM: {exc}")
            return self._fallback_questions(role_title, num_questions, difficulty)

    @classmethod
    def _is_non_answer(cls, user_answer: str) -> bool:
        """Check if candidate's response is an admission of not knowing or a non-answer."""
        ans = user_answer.strip().lower()
        if not ans:
            return False
        for pat in NON_ANSWER_PATTERNS:
            if re.search(pat, ans):
                return True
        return False

    def evaluate_answer(
        self,
        role_title: str,
        question_text: str,
        skill_focus: str,
        expected_points: list[str],
        user_answer: str,
    ) -> dict[str, Any]:
        """
        Evaluate candidate's answer with constructive feedback and scoring rubric.
        """
        cleaned_answer = (user_answer or "").strip()

        # Handle empty, trivial (<10 chars), or explicit non-answers ("I don't know", "no idea", "pass")
        is_non_ans = self._is_non_answer(cleaned_answer)
        if len(cleaned_answer) < 10 or is_non_ans:
            ideal = (
                f"A comprehensive answer for {skill_focus} should directly cover: "
                + "; ".join(expected_points[:3])
                if expected_points
                else "A strong answer should define core mechanisms, cite relevant examples, and explain trade-offs."
            )
            accuracy_msg = (
                "No substantive response was provided to evaluate. The candidate stated they do not know the answer."
                if is_non_ans
                else "No substantive response was provided to evaluate."
            )
            return {
                "score": 0,
                "technical_accuracy": accuracy_msg,
                "depth": "No technical explanation or architectural concepts were discussed.",
                "strengths": [],
                "improvements": [
                    f"Study foundational principles and core concepts of {skill_focus}.",
                    "Review the key expected criteria and model answer below to prepare for technical interview questions on this topic.",
                ],
                "ideal_answer": ideal,
            }

        # Check if LLM fallback mode is active or LLM is unreachable
        if getattr(self.llm_service, "fallback_mode", False) and not self.llm_service.is_available():
            return self._fallback_evaluate_answer(cleaned_answer, expected_points, skill_focus)

        try:
            prompt = self.llm_service.load_prompt(
                "interview_evaluator",
                version="v1",
                role_title=role_title,
                question_text=question_text,
                skill_focus=skill_focus,
                expected_points=json.dumps(expected_points, indent=2),
                user_answer=cleaned_answer,
            )
            system_prompt = (
                "You are an expert technical hiring manager evaluating candidate answers. "
                "Respond with valid JSON object only."
            )
            response_text = self.llm_service.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.2,
                max_tokens=1000,
            )

            parsed = self._extract_json_object(response_text)
            if parsed and "score" in parsed:
                # Clamp score between 0 and 100
                score = max(0, min(int(parsed.get("score", 50)), 100))
                return {
                    "score": score,
                    "technical_accuracy": parsed.get("technical_accuracy", "Technically grounded response."),
                    "depth": parsed.get("depth", "Good coverage of key engineering concepts."),
                    "strengths": parsed.get("strengths", ["Addressed core technical question"]),
                    "improvements": parsed.get("improvements", ["Could elaborate more on operational trade-offs"]),
                    "ideal_answer": parsed.get("ideal_answer", "Refer to standard engineering documentation."),
                }

            logger.warning(f"Could not parse valid evaluation from LLM: {response_text[:200]}")
            return self._fallback_evaluate_answer(cleaned_answer, expected_points, skill_focus)

        except Exception as exc:
            logger.error(f"Error evaluating interview answer: {exc}")
            return self._fallback_evaluate_answer(cleaned_answer, expected_points, skill_focus)

    def generate_session_summary(
        self,
        role_title: str,
        questions: list[Any],
    ) -> dict[str, Any]:
        """
        Generate overall interview performance summary across all answered questions.
        """
        answered_q = [q for q in questions if getattr(q, "score", None) is not None]
        if not answered_q:
            return {
                "readiness_level": "Foundational Study Needed",
                "summary_verdict": f"The candidate has not completed any questions for the {role_title} interview.",
                "overall_score": 0.0,
                "key_strengths": [],
                "areas_for_growth": ["Complete all interview questions to receive comprehensive feedback."],
                "recommended_skills_to_review": self.get_skills_for_role(role_title, limit=3),
            }

        avg_score = round(sum(q.score for q in answered_q) / len(answered_q), 1)

        # Prepare question summary for LLM prompt
        q_summaries = []
        for q in answered_q:
            q_summaries.append({
                "skill": q.skill_focus,
                "score": q.score,
                "evaluation": q.evaluation,
            })

        if getattr(self.llm_service, "fallback_mode", False) and not self.llm_service.is_available():
            return self._fallback_session_summary(role_title, avg_score, answered_q)

        try:
            prompt = self.llm_service.load_prompt(
                "interview_summary",
                version="v1",
                role_title=role_title,
                overall_score=avg_score,
                total_answered=len(answered_q),
                question_evaluations=json.dumps(q_summaries, indent=2),
            )
            system_prompt = (
                "You are a Senior Engineering Director synthesizing candidate performance. "
                "Respond with valid JSON object only."
            )
            response_text = self.llm_service.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.2,
                max_tokens=800,
            )

            parsed = self._extract_json_object(response_text)
            if parsed and "readiness_level" in parsed:
                parsed["overall_score"] = avg_score
                return parsed

            return self._fallback_session_summary(role_title, avg_score, answered_q)

        except Exception as exc:
            logger.error(f"Error generating session summary: {exc}")
            return self._fallback_session_summary(role_title, avg_score, answered_q)

    # =========================================================================
    # Fallback Generators (Offline / Test Execution)
    # =========================================================================

    def _fallback_questions(
        self,
        role_title: str,
        num_questions: int,
        difficulty: str,
    ) -> list[dict[str, Any]]:
        """
        Deterministic, high-quality question fallback when LLM is unavailable.
        """
        role_key = "general"
        role_lower = role_title.lower()
        for key in FALLBACK_QUESTIONS:
            if key in role_lower:
                role_key = key
                break

        bank = FALLBACK_QUESTIONS[role_key]
        selected = []
        for idx in range(num_questions):
            template = bank[idx % len(bank)]
            selected.append({
                "order": idx + 1,
                "skill_focus": template["skill_focus"],
                "difficulty": difficulty,
                "question_text": template["question_text"],
                "expected_points": template["expected_points"],
            })
        return selected

    def _fallback_evaluate_answer(
        self,
        user_answer: str,
        expected_points: list[str],
        skill_focus: str,
    ) -> dict[str, Any]:
        """
        Deterministic heuristic evaluator for offline testing and dev.
        """
        ans_lower = user_answer.lower()
        word_count = len(user_answer.split())

        # Check overlap with expected criteria keywords
        matched_criteria = 0
        for pt in expected_points:
            words = [w.lower() for w in re.findall(r"\b\w{4,}\b", pt)]
            if any(w in ans_lower for w in words):
                matched_criteria += 1

        ratio = matched_criteria / max(1, len(expected_points))

        if matched_criteria == 0:
            score = 0 if word_count < 25 else min(15, int(word_count / 10))
            strengths = [] if score == 0 else [f"Attempted to formulate response for {skill_focus}"]
            technical_accuracy = "Candidate did not address any of the expected technical criteria."
        else:
            base_score = int(ratio * 70)
            depth_bonus = min(25, int((word_count / 60) * 25))
            score = max(20, min(95, base_score + depth_bonus))
            strengths = [
                f"Demonstrated awareness of {skill_focus}",
                f"Addressed {matched_criteria} key architectural criteria",
            ]
            technical_accuracy = (
                f"Candidate addressed {matched_criteria} of {len(expected_points)} core criteria "
                f"for {skill_focus}."
            )

        return {
            "score": score,
            "technical_accuracy": technical_accuracy,
            "depth": (
                f"Response length ({word_count} words) provides "
                f"{'solid' if word_count >= 50 else 'moderate' if word_count >= 20 else 'minimal'} technical detail."
            ),
            "strengths": strengths,
            "improvements": [
                "Mention concrete production trade-offs and edge cases",
                "Elaborate on real-world system architecture context",
            ],
            "ideal_answer": (
                f"A comprehensive answer for {skill_focus} should directly cover: "
                + "; ".join(expected_points[:3])
                if expected_points
                else f"Review core engineering principles and architecture patterns for {skill_focus}."
            ),
        }

    def _fallback_session_summary(
        self,
        role_title: str,
        avg_score: float,
        questions: list[Any],
    ) -> dict[str, Any]:
        """
        Deterministic session summary fallback for offline / test execution.
        """
        if avg_score >= 75:
            readiness = "Ready for Interviews"
            verdict = (
                f"Candidate demonstrated strong technical competencies across core {role_title} requirements."
            )
        elif avg_score >= 55:
            readiness = "Promising with Minor Gaps"
            verdict = (
                f"Candidate exhibits a solid foundational grasp of {role_title} concepts, with specific "
                "areas benefiting from additional depth."
            )
        else:
            readiness = "Foundational Study Needed"
            verdict = (
                f"Candidate needs targeted study on core architectural principles and technical depth for {role_title}."
            )

        # Identify skills with lower scores
        skills_to_review = []
        for q in sorted(questions, key=lambda x: x.score or 0):
            if q.skill_focus and q.skill_focus not in skills_to_review:
                skills_to_review.append(q.skill_focus)
            if len(skills_to_review) >= 3:
                break

        return {
            "readiness_level": readiness,
            "summary_verdict": verdict,
            "overall_score": avg_score,
            "key_strengths": [
                f"Articulated fundamental concepts for {role_title}",
                "Completed technical interview questions under time constraints",
            ],
            "areas_for_growth": [
                "Deepen discussion of scalability, latency, and fault tolerance",
                "Include concrete examples from personal or open-source projects",
            ],
            "recommended_skills_to_review": skills_to_review or ["System Design", "Database Optimization"],
        }

    # =========================================================================
    # Helpers
    # =========================================================================

    @staticmethod
    def _extract_json_array(text: str) -> list[dict[str, Any]] | None:
        """Extract a JSON array [...] from string response."""
        match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
                if isinstance(data, list):
                    return data
            except json.JSONDecodeError:
                pass
        return None

    @staticmethod
    def _extract_json_object(text: str) -> dict[str, Any] | None:
        """Extract a JSON object {...} from string response."""
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
                if isinstance(data, dict):
                    return data
            except json.JSONDecodeError:
                pass
        return None


# Global singleton holder
_interview_service_instance: InterviewService | None = None


def get_interview_service() -> InterviewService:
    """
    Return global singleton InterviewService instance.
    """
    global _interview_service_instance
    if _interview_service_instance is None:
        _interview_service_instance = InterviewService()
    return _interview_service_instance
