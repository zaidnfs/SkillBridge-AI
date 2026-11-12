"""
DRF Views for the skills app (TASK-047).
Provides learning resource recommendations for identified skill gaps.
"""
import logging

from rest_framework import status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import (
    SkillRecommendationRequestSerializer,
    SkillRecommendationResponseSerializer,
)
from services import get_skill_recommendation_service

logger = logging.getLogger(__name__)


class SkillRecommendationsView(views.APIView):
    """
    POST /api/skills/recommendations/

    Given a list of skill names (typically from resume skill-gap analysis),
    return curated free learning resources for each skill, grouped by skill name.
    Supports optional difficulty filtering and per-skill result limits.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = SkillRecommendationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        service = get_skill_recommendation_service()
        result = service.get_recommendations_for_skills(
            skill_names=serializer.validated_data["skills"],
            difficulty=serializer.validated_data.get("difficulty"),
            max_per_skill=serializer.validated_data.get("max_per_skill", 4),
        )

        response_serializer = SkillRecommendationResponseSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
