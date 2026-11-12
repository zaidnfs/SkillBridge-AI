"""
Django models for the interviews app (TASK-049).
Tracks AI mock interview sessions, questions, candidate answers, evaluations, and overall summaries.
"""
import uuid
from typing import Any
from django.conf import settings
from django.db import models


class InterviewSession(models.Model):
    """
    Candidate interview session scoped to a user and target role.
    Maintains session progression, overall score, and evaluation summary.
    """

    STATUS_CHOICES = [
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("abandoned", "Abandoned"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="interview_sessions",
        db_index=True,
    )
    role_title = models.CharField(max_length=150, help_text="Target job role (e.g., 'Backend Developer')")
    target_skills = models.JSONField(
        default=list,
        blank=True,
        help_text="List of skills focused on during the interview session",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="in_progress",
        db_index=True,
    )
    total_questions = models.PositiveSmallIntegerField(
        default=3,
        help_text="Total number of questions in this interview session",
    )
    current_question_index = models.PositiveSmallIntegerField(
        default=0,
        help_text="0-indexed position of the active question",
    )
    overall_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Average or weighted session score (0 - 100)",
    )
    summary_feedback = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured feedback: readiness, strengths, improvements, recommended_skills",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "interview_sessions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"], name="is_user_created_idx"),
            models.Index(fields=["status"], name="is_status_idx"),
        ]
        verbose_name = "Interview Session"
        verbose_name_plural = "Interview Sessions"

    def __str__(self) -> str:
        return f"InterviewSession({self.role_title} - {self.user.email} - {self.status})"

    def update_overall_score(self) -> float | None:
        """
        Recalculate overall score based on all answered questions.
        """
        answered = self.questions.filter(score__isnull=False)
        if not answered.exists():
            self.overall_score = None
        else:
            total = sum(q.score for q in answered if q.score is not None)
            self.overall_score = round(total / answered.count(), 1)
        self.save(update_fields=["overall_score", "updated_at"])
        return self.overall_score


class InterviewQuestion(models.Model):
    """
    Individual question within an interview session.
    Stores prompt text, rubric, user response, and evaluation feedback.
    """

    DIFFICULTY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name="questions",
        db_index=True,
    )
    order = models.PositiveSmallIntegerField(
        default=1,
        help_text="1-based sequence order of the question in the session",
    )
    skill_focus = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Primary technical skill or topic tested by this question",
    )
    difficulty = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default="intermediate",
    )
    question_text = models.TextField(help_text="The interview question presented to the candidate")
    expected_points = models.JSONField(
        default=list,
        blank=True,
        help_text="Key engineering concepts or rubric points expected in a strong answer",
    )
    user_answer = models.TextField(
        blank=True,
        default="",
        help_text="Candidate's submitted answer text",
    )
    answered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the candidate submitted their answer",
    )
    score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Evaluated score for this question (0 - 100)",
    )
    evaluation = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured feedback: technical_accuracy, depth, strengths, improvements, ideal_answer",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "interview_questions"
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(fields=["session", "order"], name="iq_session_order_idx"),
        ]
        verbose_name = "Interview Question"
        verbose_name_plural = "Interview Questions"

    def __str__(self) -> str:
        return f"Q{self.order} ({self.skill_focus}): {self.question_text[:50]}..."
