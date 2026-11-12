"""
Unit and integration tests for Phase 3.1: Skills & Learning Resources.
Covers:
- LearningResource model
- SkillRecommendationService (exact match, alias matching, difficulty filtering, fallbacks)
- POST /api/skills/recommendations/ endpoint (auth, validation, response format)
- seed_learning_resources management command idempotency
"""
import uuid
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.skills.models import LearningResource
from services.skill_recommendation_service import SkillRecommendationService, get_skill_recommendation_service

User = get_user_model()


class LearningResourceModelTestCase(TestCase):
    """Tests for LearningResource model fields and methods."""

    def test_create_learning_resource(self):
        resource = LearningResource.objects.create(
            skill_name="python",
            skill_category="Programming Language",
            title="Python Tutorial",
            description="A comprehensive guide to Python.",
            url="https://docs.python.org/3/tutorial/",
            platform="official_docs",
            resource_type="tutorial",
            difficulty="beginner",
            estimated_hours=8.0,
            is_free=True,
            is_active=True,
        )
        self.assertIsInstance(resource.id, uuid.UUID)
        self.assertEqual(resource.skill_name, "python")
        self.assertEqual(str(resource), "Python Tutorial (python - official_docs)")

    def test_default_values(self):
        resource = LearningResource.objects.create(
            skill_name="docker",
            title="Docker Overview",
            url="https://docs.docker.com/get-started/",
        )
        self.assertTrue(resource.is_free)
        self.assertTrue(resource.is_active)
        self.assertEqual(resource.platform, "other")
        self.assertEqual(resource.resource_type, "tutorial")
        self.assertEqual(resource.difficulty, "beginner")


class SkillRecommendationServiceTestCase(TestCase):
    """Tests for SkillRecommendationService business logic."""

    def setUp(self):
        self.service = SkillRecommendationService()

        # Seed sample resources
        LearningResource.objects.create(
            skill_name="javascript",
            title="MDN JavaScript Guide",
            url="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
            platform="mdn",
            resource_type="documentation",
            difficulty="beginner",
            is_active=True,
        )
        LearningResource.objects.create(
            skill_name="javascript",
            title="Advanced JavaScript & Event Loop",
            url="https://dev.to/js-event-loop",
            platform="other",
            resource_type="article",
            difficulty="advanced",
            is_active=True,
        )
        LearningResource.objects.create(
            skill_name="kubernetes",
            title="Kubernetes Interactive Basics",
            url="https://kubernetes.io/docs/tutorials/",
            platform="official_docs",
            resource_type="interactive",
            difficulty="intermediate",
            is_active=True,
        )

    def test_exact_match_lookup(self):
        results = self.service.get_recommendations_for_skill("javascript")
        self.assertEqual(len(results), 2)
        titles = [r.title for r in results]
        self.assertIn("MDN JavaScript Guide", titles)

    def test_alias_lookup(self):
        # "js" should resolve to "javascript"
        results = self.service.get_recommendations_for_skill("js")
        self.assertEqual(len(results), 2)

        # "k8s" should resolve to "kubernetes"
        k8s_results = self.service.get_recommendations_for_skill("k8s")
        self.assertEqual(len(k8s_results), 1)
        self.assertEqual(k8s_results[0].title, "Kubernetes Interactive Basics")

    def test_case_and_whitespace_insensitivity(self):
        results = self.service.get_recommendations_for_skill("  JavaScript  ")
        self.assertEqual(len(results), 2)

    def test_difficulty_filtering(self):
        beginner_results = self.service.get_recommendations_for_skill("javascript", difficulty="beginner")
        self.assertEqual(len(beginner_results), 1)
        self.assertEqual(beginner_results[0].difficulty, "beginner")

        advanced_results = self.service.get_recommendations_for_skill("javascript", difficulty="advanced")
        self.assertEqual(len(advanced_results), 1)
        self.assertEqual(advanced_results[0].difficulty, "advanced")

    def test_unknown_skill_returns_empty(self):
        results = self.service.get_recommendations_for_skill("nonexistent_skill_xyz")
        self.assertEqual(len(results), 0)

    def test_get_recommendations_for_skills_grouped(self):
        response_dict = self.service.get_recommendations_for_skills(
            skill_names=["js", "k8s", "nonexistent_skill"],
            max_per_skill=4,
        )
        self.assertEqual(response_dict["total_skills_queried"], 3)
        self.assertEqual(response_dict["total_resources_found"], 3)
        self.assertIn("js", response_dict["recommendations"])
        self.assertIn("k8s", response_dict["recommendations"])
        self.assertIn("nonexistent_skill", response_dict["skills_without_resources"])


class SkillRecommendationsAPITestCase(TestCase):
    """Integration tests for POST /api/skills/recommendations/ endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword123",
        )
        self.url = reverse("skills:skill-recommendations")

        # Seed sample resource
        LearningResource.objects.create(
            skill_name="docker",
            title="Docker Getting Started",
            url="https://docs.docker.com/get-started/",
            platform="official_docs",
            resource_type="documentation",
            difficulty="beginner",
            is_active=True,
        )

    def test_endpoint_requires_authentication(self):
        response = self.client.post(self.url, {"skills": ["docker"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_recommendations_request(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "skills": ["docker"],
            "difficulty": "beginner",
            "max_per_skill": 2,
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["total_skills_queried"], 1)
        self.assertEqual(data["total_resources_found"], 1)
        self.assertIn("docker", data["recommendations"])
        self.assertEqual(len(data["recommendations"]["docker"]), 1)
        resource = data["recommendations"]["docker"][0]
        self.assertEqual(resource["title"], "Docker Getting Started")
        self.assertEqual(resource["platform_display"], "Official Documentation")

    def test_invalid_payload_returns_400(self):
        self.client.force_authenticate(user=self.user)
        # Empty skills list should fail validation
        response = self.client.post(self.url, {"skills": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SeedLearningResourcesCommandTestCase(TestCase):
    """Tests for seed_learning_resources management command."""

    def test_seed_command_runs_idempotently(self):
        # Run 1
        call_command("seed_learning_resources")
        initial_count = LearningResource.objects.count()
        self.assertGreater(initial_count, 30)

        # Run 2 (should not duplicate)
        call_command("seed_learning_resources")
        after_count = LearningResource.objects.count()
        self.assertEqual(initial_count, after_count)
