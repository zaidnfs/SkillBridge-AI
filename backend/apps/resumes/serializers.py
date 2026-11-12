"""
DRF Serializers for the resumes app (TASK-030, TASK-035).
Handles file upload validation, detail views, and job fit analysis requests.
"""
from pathlib import Path
from rest_framework import serializers
from .models import Resume
from apps.jobs.models import JobPosting


class ResumeUploadSerializer(serializers.Serializer):
    """
    Serializer for uploading resume files (.pdf, .docx).
    Validates file extension and ensures file size <= 5MB (U-37).
    """

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_EXTENSIONS = {".pdf", ".docx"}

    file = serializers.FileField(required=True)

    def validate_file(self, value):
        # 1. Size check
        if value.size > self.MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size exceeds 5MB limit ({value.size / (1024 * 1024):.1f}MB uploaded)."
            )

        # 2. Extension check
        ext = Path(value.name).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file extension '{ext}'. Only .pdf and .docx are permitted."
            )

        return value


class ResumeListSerializer(serializers.ModelSerializer):
    """
    Lightweight summary serializer for listing candidate resumes.
    """

    skills = serializers.ReadOnlyField()

    class Meta:
        model = Resume
        fields = [
            "id",
            "original_filename",
            "file_type",
            "file_size",
            "is_parsed",
            "skills",
            "created_at",
        ]


class ResumeDetailSerializer(serializers.ModelSerializer):
    """
    Full detail serializer including extracted text, parsed sections, and contact info.
    """

    skills = serializers.ReadOnlyField()
    contact_info = serializers.ReadOnlyField()
    sections = serializers.ReadOnlyField()

    class Meta:
        model = Resume
        fields = [
            "id",
            "original_filename",
            "file_type",
            "file_size",
            "extracted_text",
            "parsed_data",
            "skills",
            "contact_info",
            "sections",
            "is_parsed",
            "parsed_at",
            "created_at",
            "updated_at",
        ]


class ResumeAnalyzeSerializer(serializers.Serializer):
    """
    Serializer for requesting resume fit scoring against a job posting
    or an explicit list of required skills.
    """

    job_id = serializers.UUIDField(required=False, allow_null=True)
    job_title = serializers.CharField(required=False, allow_blank=True, default="")
    job_required_skills = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    job_preferred_skills = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )

    def validate(self, attrs):
        job_id = attrs.get("job_id")
        job_required_skills = attrs.get("job_required_skills", [])

        if not job_id and not job_required_skills:
            raise serializers.ValidationError(
                "Either 'job_id' or 'job_required_skills' must be provided for fit analysis."
            )

        if job_id:
            try:
                job = JobPosting.objects.get(id=job_id)
                attrs["job_instance"] = job
                if not attrs.get("job_title"):
                    attrs["job_title"] = job.title
                if not job_required_skills:
                    attrs["job_required_skills"] = job.extracted_skills
            except JobPosting.DoesNotExist:
                raise serializers.ValidationError(f"Job posting with ID {job_id} not found.")

        return attrs


class FitScoreResponseSerializer(serializers.Serializer):
    """
    Serializer representing the quantitative fit score analysis.
    """

    resume_id = serializers.UUIDField()
    job_id = serializers.UUIDField(required=False, allow_null=True)
    job_title = serializers.CharField()
    fit_score = serializers.FloatField()
    fit_category = serializers.CharField()
    matched_skills = serializers.ListField(child=serializers.CharField())
    missing_skills = serializers.ListField(child=serializers.CharField())
    matched_preferred_skills = serializers.ListField(child=serializers.CharField(), required=False)
    missing_preferred_skills = serializers.ListField(child=serializers.CharField(), required=False)
    total_required_skills = serializers.IntegerField()
    total_matched_skills = serializers.IntegerField()
    summary = serializers.CharField()
    recommendations = serializers.ListField(child=serializers.CharField(), required=False)
