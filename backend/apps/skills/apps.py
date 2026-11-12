"""
Django AppConfig for the skills app.
"""
from django.apps import AppConfig


class SkillsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.skills"
    verbose_name = "Skills & Learning Resources"
