"""
URL routes for the jobs app.
"""
from django.urls import path
from .views import JobPostingListView, JobPostingDetailView, JobMarketQueryView

app_name = "jobs"

urlpatterns = [
    path("", JobPostingListView.as_view(), name="job-list"),
    path("query/", JobMarketQueryView.as_view(), name="job-market-query"),
    path("<uuid:id>/", JobPostingDetailView.as_view(), name="job-detail"),
]
