"""
Django models for the skills app (TASK-045).
Stores curated free learning resources mapped to specific technical skills.
"""
import uuid
from django.db import models


class LearningResource(models.Model):
    """
    Curated free learning resource mapped to a specific technical skill.
    Each resource links to a free external platform (YouTube, MDN, freeCodeCamp, etc.)
    and is categorized by difficulty, type, and estimated completion time.
    """

    RESOURCE_TYPE_CHOICES = [
        ("course", "Course"),
        ("tutorial", "Tutorial"),
        ("documentation", "Documentation"),
        ("video", "Video"),
        ("article", "Article"),
        ("interactive", "Interactive Exercise"),
        ("project", "Project-Based"),
    ]

    DIFFICULTY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    PLATFORM_CHOICES = [
        ("youtube", "YouTube"),
        ("freecodecamp", "freeCodeCamp"),
        ("mdn", "MDN Web Docs"),
        ("w3schools", "W3Schools"),
        ("geeksforgeeks", "GeeksforGeeks"),
        ("roadmap_sh", "roadmap.sh"),
        ("realpython", "Real Python"),
        ("official_docs", "Official Documentation"),
        ("github", "GitHub"),
        ("coursera", "Coursera"),
        ("khan_academy", "Khan Academy"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    skill_name = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Normalized lowercase skill name (e.g., 'python', 'react', 'docker')",
    )
    skill_category = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Skill category (e.g., 'Programming Language', 'Framework', 'DevOps')",
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    url = models.URLField(max_length=500)
    platform = models.CharField(max_length=30, choices=PLATFORM_CHOICES, default="other")
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPE_CHOICES, default="tutorial")
    difficulty = models.CharField(max_length=15, choices=DIFFICULTY_CHOICES, default="beginner")

    estimated_hours = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Estimated completion time in hours",
    )
    is_free = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "learning_resources"
        ordering = ["skill_name", "difficulty", "platform"]
        indexes = [
            models.Index(fields=["skill_name", "is_active"], name="lr_skill_active_idx"),
            models.Index(fields=["skill_category"], name="lr_category_idx"),
        ]
        verbose_name = "Learning Resource"
        verbose_name_plural = "Learning Resources"

    def __str__(self) -> str:
        return f"{self.title} ({self.skill_name} - {self.platform})"
