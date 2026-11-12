"""
Django AppConfig for the interviews app (TASK-049).
"""
from django.apps import AppConfig


class InterviewsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.interviews"
    verbose_name = "AI Mock Interviews"
