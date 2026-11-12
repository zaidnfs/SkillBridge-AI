"""
Admin registration for the interviews app.
"""
from django.contrib import admin
from apps.interviews.models import InterviewSession, InterviewQuestion


class InterviewQuestionInline(admin.TabularInline):
    model = InterviewQuestion
    extra = 0
    fields = ("order", "skill_focus", "difficulty", "score", "answered_at")
    readonly_fields = ("answered_at",)


@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ("role_title", "user", "status", "overall_score", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("role_title", "user__email")
    inlines = [InterviewQuestionInline]


@admin.register(InterviewQuestion)
class InterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ("session", "order", "skill_focus", "difficulty", "score", "answered_at")
    list_filter = ("difficulty", "score")
    search_fields = ("question_text", "skill_focus", "session__role_title")
