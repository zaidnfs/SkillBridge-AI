"""
Django admin configuration for the skills app.
"""
from django.contrib import admin
from .models import LearningResource


@admin.register(LearningResource)
class LearningResourceAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "skill_name",
        "skill_category",
        "platform",
        "difficulty",
        "resource_type",
        "is_free",
        "is_active",
        "estimated_hours",
    ]
    list_filter = ["platform", "difficulty", "resource_type", "skill_category", "is_active", "is_free"]
    search_fields = ["title", "skill_name", "description"]
    list_editable = ["is_active"]
    ordering = ["skill_name", "difficulty"]
    readonly_fields = ["id", "created_at", "updated_at"]
