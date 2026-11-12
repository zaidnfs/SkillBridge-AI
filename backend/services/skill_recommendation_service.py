"""
Skill Recommendation Service for SkillBridge AI (TASK-046).
Maps identified skill gaps to curated free learning resources.
Supports exact matching on normalized skill names, alias resolution,
difficulty filtering, and category-based fallbacks.
"""
from __future__ import annotations

import logging
from typing import Any

from django.db.models import QuerySet

logger = logging.getLogger(__name__)

# Common abbreviations and aliases mapped to standard skill names
SKILL_ALIASES: dict[str, str] = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "react.js": "react",
    "reactjs": "react",
    "react native": "react native",
    "vue": "vue.js",
    "vuejs": "vue.js",
    "node": "node.js",
    "nodejs": "node.js",
    "express": "express.js",
    "expressjs": "express.js",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "psql": "postgresql",
    "mongo": "mongodb",
    "k8s": "kubernetes",
    "tf": "tensorflow",
    "sklearn": "scikit-learn",
    "cpp": "c++",
    "c#": "c#",
    "csharp": "c#",
    "dotnet": ".net",
    ".net core": ".net",
    "aws": "aws",
    "gcp": "google cloud",
    "azure": "azure",
    "docker": "docker",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "dl": "deep learning",
    "nlp": "natural language processing",
    "rest": "rest api",
    "restful": "rest api",
    "graphql": "graphql",
    "tailwind": "tailwind css",
    "tailwindcss": "tailwind css",
    "git": "git",
    "github": "git",
    "ci/cd": "ci/cd",
    "cicd": "ci/cd",
}


class SkillRecommendationService:
    """
    Business logic service for resolving skill gaps to learning resources.
    """

    def __init__(self, aliases: dict[str, str] | None = None) -> None:
        self.aliases = aliases if aliases is not None else SKILL_ALIASES

    def resolve_skill_alias(self, skill_name: str) -> str:
        """
        Normalize and resolve common aliases/abbreviations for a skill name.
        """
        cleaned = skill_name.strip().lower()
        return self.aliases.get(cleaned, cleaned)

    def get_recommendations_for_skill(
        self,
        skill_name: str,
        difficulty: str | None = None,
        max_results: int = 4,
    ) -> list[Any]:
        """
        Look up active LearningResources for a single skill name.
        1. Exact match on normalized/aliased skill_name.
        2. Direct match on original lowercase skill_name.
        3. icontains match if exact match finds nothing.
        """
        # Lazy import to avoid circular dependency / premature model load
        from apps.skills.models import LearningResource

        cleaned = skill_name.strip().lower()
        resolved = self.resolve_skill_alias(cleaned)

        base_qs = LearningResource.objects.filter(is_active=True)
        if difficulty:
            base_qs = base_qs.filter(difficulty=difficulty.lower())

        # 1. Try exact match on resolved alias
        results = list(base_qs.filter(skill_name__iexact=resolved)[:max_results])

        # 2. If no results and resolved != cleaned, try exact on cleaned
        if not results and resolved != cleaned:
            results = list(base_qs.filter(skill_name__iexact=cleaned)[:max_results])

        # 3. Fallback: contains lookup
        if not results:
            results = list(base_qs.filter(skill_name__icontains=resolved)[:max_results])

        # 4. Fallback: if resolved is in skill_category
        if not results:
            results = list(base_qs.filter(skill_category__icontains=resolved)[:max_results])

        return results

    def get_recommendations_for_skills(
        self,
        skill_names: list[str],
        difficulty: str | None = None,
        max_per_skill: int = 4,
    ) -> dict[str, Any]:
        """
        Given a list of skill names, return curated resources grouped by skill.
        Returns a dict suitable for SkillRecommendationResponseSerializer:
        {
            "total_skills_queried": int,
            "total_resources_found": int,
            "recommendations": { skill_name: [LearningResource, ...] },
            "skills_without_resources": [skill_name, ...]
        }
        """
        recommendations: dict[str, list[Any]] = {}
        skills_without_resources: list[str] = []
        total_resources_found = 0

        # Deduplicate while preserving order
        seen = set()
        unique_skills = []
        for s in skill_names:
            norm = s.strip()
            if norm and norm.lower() not in seen:
                seen.add(norm.lower())
                unique_skills.append(norm)

        for skill in unique_skills:
            resources = self.get_recommendations_for_skill(
                skill_name=skill,
                difficulty=difficulty,
                max_results=max_per_skill,
            )
            if resources:
                recommendations[skill] = resources
                total_resources_found += len(resources)
            else:
                skills_without_resources.append(skill)

        return {
            "total_skills_queried": len(unique_skills),
            "total_resources_found": total_resources_found,
            "recommendations": recommendations,
            "skills_without_resources": skills_without_resources,
        }


# Singleton instance
_skill_recommendation_service_instance: SkillRecommendationService | None = None


def get_skill_recommendation_service() -> SkillRecommendationService:
    """
    Get or initialize the singleton SkillRecommendationService instance.
    """
    global _skill_recommendation_service_instance
    if _skill_recommendation_service_instance is None:
        _skill_recommendation_service_instance = SkillRecommendationService()
    return _skill_recommendation_service_instance
