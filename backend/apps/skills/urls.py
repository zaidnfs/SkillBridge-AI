"""
URL routes for the skills app.
"""
from django.urls import path
from .views import SkillRecommendationsView

app_name = "skills"

urlpatterns = [
    path("recommendations/", SkillRecommendationsView.as_view(), name="skill-recommendations"),
]
