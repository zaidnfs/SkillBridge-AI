"""
DRF Serializers for the interviews app (TASK-052).
Validates session creation, answer submissions, and serializes question/session state.
"""
from typing import Any
from rest_framework import serializers

from apps.interviews.models import InterviewSession, InterviewQuestion


class CreateSessionSerializer(serializers.Serializer):
    """
    Validates payload to initiate a new AI mock interview session.
    """

    role_title = serializers.CharField(
        max_length=150,
        min_length=2,
        required=True,
        trim_whitespace=True,
        help_text="Target role (e.g. 'Backend Developer', 'Frontend Developer')",
    )
    target_skills = serializers.ListField(
        child=serializers.CharField(max_length=100, trim_whitespace=True),
        required=False,
        default=list,
        help_text="Optional custom or gap skills to focus on during the interview",
    )
    num_questions = serializers.IntegerField(
        min_value=1,
        max_value=5,
        default=3,
        required=False,
        help_text="Number of questions in the interview session (1 to 5)",
    )
    difficulty = serializers.ChoiceField(
        choices=["beginner", "intermediate", "advanced"],
        default="intermediate",
        required=False,
        help_text="Target difficulty tier",
    )


class SubmitAnswerSerializer(serializers.Serializer):
    """
    Validates candidate's submitted answer for an active interview question.
    """

    question_id = serializers.UUIDField(
        required=True,
        help_text="UUID of the question being answered",
    )
    answer = serializers.CharField(
        min_length=10,
        max_length=5000,
        required=True,
        trim_whitespace=True,
        help_text="Candidate's technical response text (min 10 characters)",
    )


class InterviewQuestionPublicSerializer(serializers.ModelSerializer):
    """
    Serializes an interview question.
    Enforces security by concealing expected rubric criteria until the question is answered.
    """

    class Meta:
        model = InterviewQuestion
        fields = [
            "id",
            "order",
            "skill_focus",
            "difficulty",
            "question_text",
            "expected_points",
            "user_answer",
            "answered_at",
            "score",
            "evaluation",
            "created_at",
        ]
        read_only_fields = fields

    def to_representation(self, instance: InterviewQuestion) -> dict[str, Any]:
        data = super().to_representation(instance)
        # Redact expected criteria if not yet answered to prevent answer leakage
        if not instance.answered_at:
            data["expected_points"] = []
        return data


class InterviewSessionDetailSerializer(serializers.ModelSerializer):
    """
    Full session detail serializer with nested questions.
    """

    questions = InterviewQuestionPublicSerializer(many=True, read_only=True)

    class Meta:
        model = InterviewSession
        fields = [
            "id",
            "role_title",
            "target_skills",
            "status",
            "total_questions",
            "current_question_index",
            "overall_score",
            "summary_feedback",
            "questions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class InterviewSessionListSerializer(serializers.ModelSerializer):
    """
    Lightweight summary serializer for listing candidate's past interview sessions.
    """

    questions_answered = serializers.SerializerMethodField()

    class Meta:
        model = InterviewSession
        fields = [
            "id",
            "role_title",
            "target_skills",
            "status",
            "total_questions",
            "current_question_index",
            "questions_answered",
            "overall_score",
            "summary_feedback",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_questions_answered(self, obj: InterviewSession) -> int:
        return obj.questions.filter(score__isnull=False).count()


class AudioTranscriptionSerializer(serializers.Serializer):
    """
    Validates audio file upload for Speech-to-Text transcription (TASK-055).
    """

    audio = serializers.FileField(
        required=True,
        help_text="Audio file payload (WebM, WAV, OGG, MP4, up to 10MB)",
    )
    language = serializers.CharField(
        max_length=10,
        required=False,
        default="en",
        help_text="Spoken language code (default 'en')",
    )
    prompt = serializers.CharField(
        max_length=200,
        required=False,
        default="",
        help_text="Optional domain vocabulary context hint",
    )

    def validate_audio(self, value):
        from django.conf import settings
        max_size = getattr(settings, "MAX_AUDIO_UPLOAD_SIZE", 10 * 1024 * 1024)

        if value.size == 0:
            raise serializers.ValidationError("Audio file is empty.")

        if value.size > max_size:
            raise serializers.ValidationError(
                f"Audio file size ({round(value.size / (1024 * 1024), 2)}MB) exceeds maximum allowed limit of {max_size // (1024 * 1024)}MB."
            )

        name = (value.name or "").lower()
        content_type = (getattr(value, "content_type", "") or "").lower()

        allowed_extensions = {".webm", ".wav", ".ogg", ".mp4", ".m4a", ".mp3"}
        allowed_types = {
            "audio/webm",
            "audio/wav",
            "audio/x-wav",
            "audio/ogg",
            "audio/mp4",
            "audio/mpeg",
            "audio/m4a",
            "audio/x-m4a",
            "video/webm",
            "application/octet-stream",
        }

        has_valid_ext = any(name.endswith(ext) for ext in allowed_extensions)
        has_valid_mime = content_type in allowed_types or content_type.startswith("audio/")

        if not (has_valid_ext or has_valid_mime):
            raise serializers.ValidationError(
                "Unsupported audio format. Supported formats include WebM, WAV, OGG, MP4, and MP3."
            )

        return value


class SpeechSynthesisSerializer(serializers.Serializer):
    """
    Validates input for text-to-speech synthesis (TASK-056).
    """

    text = serializers.CharField(
        min_length=1,
        max_length=3000,
        required=True,
        trim_whitespace=True,
        help_text="Text to synthesize into speech",
    )
    voice = serializers.CharField(
        max_length=100,
        required=False,
        default="",
        help_text="Optional TTS voice identifier",
    )

