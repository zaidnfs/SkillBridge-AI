"""
DRF Serializers for the skills app (TASK-047).
Handles skill recommendation request validation and learning resource output formatting.
"""
from rest_framework import serializers
from .models import LearningResource


class LearningResourceSerializer(serializers.ModelSerializer):
    """
    Serializer for individual learning resource entries.
    Includes human-readable display values for choice fields.
    """

    platform_display = serializers.CharField(source="get_platform_display", read_only=True)
    resource_type_display = serializers.CharField(source="get_resource_type_display", read_only=True)
    difficulty_display = serializers.CharField(source="get_difficulty_display", read_only=True)

    class Meta:
        model = LearningResource
        fields = [
            "id",
            "title",
            "description",
            "url",
            "platform",
            "platform_display",
            "resource_type",
            "resource_type_display",
            "difficulty",
            "difficulty_display",
            "estimated_hours",
            "skill_name",
            "skill_category",
        ]


class SkillRecommendationRequestSerializer(serializers.Serializer):
    """
    Validates incoming requests for skill-gap learning resource recommendations.
    Accepts a list of skill names with optional difficulty filter and per-skill limit.
    """

    skills = serializers.ListField(
        child=serializers.CharField(max_length=100, allow_blank=False),
        min_length=1,
        max_length=20,
        help_text="List of skill names to get learning resource recommendations for.",
    )
    difficulty = serializers.ChoiceField(
        choices=["beginner", "intermediate", "advanced"],
        required=False,
        allow_null=True,
        default=None,
        help_text="Optional difficulty filter (beginner, intermediate, advanced).",
    )
    max_per_skill = serializers.IntegerField(
        min_value=1,
        max_value=10,
        default=4,
        required=False,
        help_text="Maximum number of resources to return per skill (1-10, default 4).",
    )


class SkillRecommendationResponseSerializer(serializers.Serializer):
    """
    Formats the grouped skill recommendation response with summary metadata.
    """

    total_skills_queried = serializers.IntegerField()
    total_resources_found = serializers.IntegerField()
    recommendations = serializers.DictField(
        child=LearningResourceSerializer(many=True),
    )
    skills_without_resources = serializers.ListField(
        child=serializers.CharField(),
    )
