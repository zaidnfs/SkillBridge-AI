"""
Root URL Configuration for SkillBridge AI.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny


class HealthCheckView(APIView):
    """Public health check endpoint."""
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({"status": "ok", "service": "skillbridge-backend"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health-check"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/jobs/", include("apps.jobs.urls")),
    path("api/resumes/", include("apps.resumes.urls")),
    path("api/skills/", include("apps.skills.urls")),
    path("api/interviews/", include("apps.interviews.urls")),
]
