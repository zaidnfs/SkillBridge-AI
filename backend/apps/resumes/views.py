"""
DRF Views for the resumes app (TASK-030, TASK-035).
Provides resume uploading, parsing, listing, fit analysis, and ATS document export.
All endpoints enforce user isolation and JWT authentication.
"""
import logging
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Resume
from .serializers import (
    ResumeUploadSerializer,
    ResumeListSerializer,
    ResumeDetailSerializer,
    ResumeAnalyzeSerializer,
    FitScoreResponseSerializer,
)
from apps.jobs.models import JobPosting
from services import (
    get_resume_service,
    ResumeServiceError,
    ResumeParseError,
    ResumeValidationError,
)

logger = logging.getLogger(__name__)


class ResumeUploadView(views.APIView):
    """
    POST /api/resumes/upload/
    Uploads a candidate resume file (.pdf or .docx).
    Validates file size (max 5MB) and type.
    Extracts text, identifies skills, and stores structured metadata.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        serializer = ResumeUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = serializer.validated_data["file"]
        service = get_resume_service()

        try:
            # Parse resume contents
            parsed = service.parse_resume(uploaded_file, filename=uploaded_file.name)
        except (ResumeParseError, ResumeValidationError) as exc:
            logger.warning(f"Resume parsing failed for '{uploaded_file.name}': {exc}")
            return Response(
                {"error": f"Failed to parse resume: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.error(f"Unexpected error parsing resume: {exc}")
            return Response(
                {"error": "An unexpected error occurred while processing the resume document."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Reset stream pointer for saving to storage
        uploaded_file.seek(0)

        # Store resume record associated with authenticated user
        resume = Resume.objects.create(
            user=request.user,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            file_type=parsed["file_type"],
            file_size=uploaded_file.size,
            extracted_text=parsed["extracted_text"],
            parsed_data={
                "candidate_name": f"{request.user.first_name} {request.user.last_name}".strip(),
                "skills": parsed["skills"],
                "contact_info": parsed["contact_info"],
                "sections": parsed["sections"],
            },
            is_parsed=True,
            parsed_at=timezone.now(),
        )

        return Response(ResumeDetailSerializer(resume).data, status=status.HTTP_201_CREATED)


class ResumeListView(generics.ListAPIView):
    """
    GET /api/resumes/
    List all resumes belonging to the currently authenticated user.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ResumeListSerializer

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)


class ResumeDetailView(generics.RetrieveDestroyAPIView):
    """
    GET /api/resumes/<uuid:id>/
    DELETE /api/resumes/<uuid:id>/
    Retrieve full details or delete an uploaded resume.
    Enforces strict user isolation.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ResumeDetailSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)


class ResumeAnalyzeView(views.APIView):
    """
    POST /api/resumes/<uuid:id>/analyze/
    Compute quantitative fit score and identify skill gaps against a target job.
    Accepts {"job_id": "<uuid>"} or {"job_title": "...", "job_required_skills": [...]}.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        resume = get_object_or_404(Resume, id=id, user=request.user)

        serializer = ResumeAnalyzeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        job_title = serializer.validated_data.get("job_title", "Target Role")
        required_skills = serializer.validated_data.get("job_required_skills", [])
        preferred_skills = serializer.validated_data.get("job_preferred_skills", [])
        job_id = serializer.validated_data.get("job_id")

        service = get_resume_service()

        # Compute fit score
        fit_result = service.compute_fit_score(
            resume_skills=resume.skills,
            job_required_skills=required_skills,
            job_preferred_skills=preferred_skills,
            resume_text=resume.extracted_text,
        )

        # Identify skill gaps & recommendations
        gap_result = service.identify_skill_gaps(
            resume_skills=resume.skills,
            job_required_skills=required_skills,
            job_title=job_title,
        )

        response_payload = {
            "resume_id": resume.id,
            "job_id": job_id,
            "job_title": job_title,
            "fit_score": fit_result["fit_score"],
            "fit_category": fit_result["fit_category"],
            "matched_skills": fit_result["matched_skills"],
            "missing_skills": fit_result["missing_skills"],
            "matched_preferred_skills": fit_result.get("matched_preferred_skills", []),
            "missing_preferred_skills": fit_result.get("missing_preferred_skills", []),
            "total_required_skills": fit_result["total_required_skills"],
            "total_matched_skills": fit_result["total_matched_skills"],
            "summary": fit_result["summary"],
            "recommendations": gap_result.get("recommendations", []),
        }

        return Response(FitScoreResponseSerializer(response_payload).data, status=status.HTTP_200_OK)


class ResumeGenerateATSView(views.APIView):
    """
    POST /api/resumes/<uuid:id>/generate-ats/
    Generate and stream a tailored, ATS-compliant DOCX resume document.
    Optionally accepts {"job_id": "<uuid>"} to prioritize keywords for a specific role.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        resume = get_object_or_404(Resume, id=id, user=request.user)

        target_job = None
        job_id = request.data.get("job_id")
        if job_id:
            try:
                job_instance = JobPosting.objects.get(id=job_id)
                target_job = {
                    "title": job_instance.title,
                    "extracted_skills": job_instance.extracted_skills,
                }
            except (JobPosting.DoesNotExist, ValueError):
                pass

        service = get_resume_service()
        resume_payload = dict(resume.parsed_data or {})
        if resume.extracted_text:
            resume_payload["extracted_text"] = resume.extracted_text
        docx_buffer = service.generate_ats_resume(
            resume_data=resume_payload,
            target_job=target_job,
        )

        filename = f"SkillBridge_ATS_{resume.original_filename.rsplit('.', 1)[0]}.docx"
        response = HttpResponse(
            docx_buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
