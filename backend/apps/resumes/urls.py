"""
URL routes for the resumes app.
"""
from django.urls import path
from .views import (
    ResumeUploadView,
    ResumeListView,
    ResumeDetailView,
    ResumeAnalyzeView,
    ResumeGenerateATSView,
)

app_name = "resumes"

urlpatterns = [
    path("upload/", ResumeUploadView.as_view(), name="resume-upload"),
    path("", ResumeListView.as_view(), name="resume-list"),
    path("<uuid:id>/", ResumeDetailView.as_view(), name="resume-detail"),
    path("<uuid:id>/analyze/", ResumeAnalyzeView.as_view(), name="resume-analyze"),
    path("<uuid:id>/generate-ats/", ResumeGenerateATSView.as_view(), name="resume-generate-ats"),
]
