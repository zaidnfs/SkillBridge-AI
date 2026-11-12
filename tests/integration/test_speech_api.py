"""
Integration tests for Speech-to-Text and Text-to-Speech API endpoints (TASK-055 & TASK-056).
Validates audio upload transcription, audio stream synthesis, and security isolation (I-16 to I-18).
"""
import uuid
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.interviews.models import InterviewSession


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        email="speech.candidate@example.com",
        password="SecureSpeechPass123!",
        first_name="Voice",
        last_name="Candidate",
    )


@pytest.fixture
def other_user():
    return User.objects.create_user(
        email="other.speaker@example.com",
        password="SecureOtherPass123!",
        first_name="Other",
        last_name="Speaker",
    )


@pytest.fixture
def authenticated_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


@pytest.fixture
def active_session(auth_user):
    return InterviewSession.objects.create(
        user=auth_user,
        role_title="Backend Developer",
        target_skills=["Python", "Django", "PostgreSQL"],
        status="in_progress",
        total_questions=3,
    )


@pytest.mark.django_db
class TestSpeechAPIIntegration:
    """Test suite for Speech endpoints: STT and TTS."""

    def test_i16_transcribe_audio_endpoint_success(self, authenticated_client):
        """I-16: Upload valid audio file for speech transcription."""
        audio_content = b"RIFF" + b"\x00" * 500
        audio_file = SimpleUploadedFile(
            "candidate_voice.webm",
            audio_content,
            content_type="audio/webm",
        )

        response = authenticated_client.post(
            "/api/interviews/transcribe/",
            {"audio": audio_file, "language": "en"},
            format="multipart",
        )

        assert response.status_code == 200
        assert "text" in response.data
        assert "duration" in response.data
        assert len(response.data["text"]) > 0

    def test_i16_session_transcribe_audio_endpoint_success(self, authenticated_client, active_session):
        """I-16: Upload audio scoped to an active interview session."""
        audio_content = b"RIFF" + b"\x00" * 500
        audio_file = SimpleUploadedFile(
            "session_answer.wav",
            audio_content,
            content_type="audio/wav",
        )

        response = authenticated_client.post(
            f"/api/interviews/sessions/{active_session.id}/transcribe/",
            {"audio": audio_file},
            format="multipart",
        )

        assert response.status_code == 200
        assert "text" in response.data

    def test_i16_transcribe_rejects_empty_file(self, authenticated_client):
        """I-16: Transcribe rejects 0-byte audio file with 400 Bad Request."""
        empty_file = SimpleUploadedFile(
            "empty.wav",
            b"",
            content_type="audio/wav",
        )

        response = authenticated_client.post(
            "/api/interviews/transcribe/",
            {"audio": empty_file},
            format="multipart",
        )

        assert response.status_code == 400
        assert "audio" in response.data or "detail" in response.data

    def test_i16_transcribe_rejects_invalid_mime(self, authenticated_client):
        """I-16: Transcribe rejects non-audio file formats."""
        invalid_file = SimpleUploadedFile(
            "malicious.exe",
            b"MZ\x90\x00\x03\x00\x00\x00",
            content_type="application/x-msdownload",
        )

        response = authenticated_client.post(
            "/api/interviews/transcribe/",
            {"audio": invalid_file},
            format="multipart",
        )

        assert response.status_code == 400

    def test_i17_synthesize_speech_endpoint_success(self, authenticated_client):
        """I-17: Request text-to-speech returns audio/wav stream."""
        response = authenticated_client.post(
            "/api/interviews/synthesize/",
            {
                "text": "Explain how the Python Global Interpreter Lock affects multi-threaded programs.",
                "voice": "en_US-lessac-medium",
            },
            format="json",
        )

        assert response.status_code == 200
        assert response["Content-Type"] == "audio/wav"
        assert response.has_header("Content-Length")
        assert len(response.content) >= 44
        assert response.content.startswith(b"RIFF")

    def test_i18_unauthenticated_requests_blocked(self, api_client):
        """I-18: Unauthenticated access to transcribe and synthesize returns 401."""
        dummy_file = SimpleUploadedFile("test.wav", b"RIFF123", content_type="audio/wav")

        res_transcribe = api_client.post("/api/interviews/transcribe/", {"audio": dummy_file}, format="multipart")
        assert res_transcribe.status_code == 401

        res_synthesize = api_client.post("/api/interviews/synthesize/", {"text": "Hello world"}, format="json")
        assert res_synthesize.status_code == 401

    def test_i18_session_transcribe_ownership_isolation(self, api_client, other_user, active_session):
        """I-18: User cannot transcribe into another user's session (IDOR protection)."""
        api_client.force_authenticate(user=other_user)
        audio_file = SimpleUploadedFile("test.wav", b"RIFF12345", content_type="audio/wav")

        response = api_client.post(
            f"/api/interviews/sessions/{active_session.id}/transcribe/",
            {"audio": audio_file},
            format="multipart",
        )
        assert response.status_code == 404
