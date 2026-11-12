"""
Django models for the resumes app.
Stores uploaded candidate resumes, extracted text, and structured parsed sections.
"""
import uuid
from django.db import models
from django.conf import settings


class Resume(models.Model):
    """
    Candidate resume model tracking uploaded document files,
    extracted raw text, and structured parsed entities.
    """

    FILE_TYPE_CHOICES = [
        ("pdf", "PDF"),
        ("docx", "DOCX"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resumes",
        db_index=True,
    )
    file = models.FileField(upload_to="resumes/%Y/%m/")
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")

    extracted_text = models.TextField(blank=True, default="")
    parsed_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured entities: skills, experience, education, contact_info",
    )
    is_parsed = models.BooleanField(default=False)
    parsed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resumes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"], name="resumes_user_created_idx"),
            models.Index(fields=["is_parsed"], name="resumes_is_parsed_idx"),
        ]

    def __str__(self) -> str:
        return f"Resume({self.original_filename} - {self.user.email})"

    @property
    def skills(self) -> list[str]:
        """Convenience property for extracted skills."""
        return self.parsed_data.get("skills", [])

    @property
    def contact_info(self) -> dict:
        """Convenience property for parsed contact details."""
        return self.parsed_data.get("contact_info", {})

    @property
    def sections(self) -> dict:
        """Convenience property for parsed resume sections."""
        return self.parsed_data.get("sections", {})
