"""
Unit tests for SpeechService (STT) and TTSService (TTS) (TASK-055 & TASK-056).
Validates speech transcription, text-to-speech normalization, audio caching, and fallback modes (U-49 to U-55).
"""
import io
import os
import tempfile
import wave
from unittest.mock import MagicMock, patch
import pytest

from django.conf import settings
from services.speech_service import SpeechService, get_speech_service
from services.tts_service import TTSService, get_tts_service


class TestSpeechServiceSTT:
    """Test suite for faster-whisper speech-to-text service (U-49 to U-52)."""

    def test_u49_transcribe_audio_mock_mode(self):
        """U-49: Transcribe valid audio in mock mode returns structured transcription payload."""
        svc = SpeechService()
        dummy_audio = b"RIFF" + b"\x00" * 200

        result = svc.transcribe_audio(dummy_audio, language="en")
        assert isinstance(result, dict)
        assert "text" in result
        assert "duration" in result
        assert "language" in result
        assert "confidence" in result
        assert len(result["text"]) > 0
        assert result["language"] == "en"

    def test_u49_transcribe_audio_from_file_path(self):
        """U-49: Transcribe audio from a valid filesystem path."""
        svc = SpeechService()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(b"RIFF" + b"\x00" * 300)
            tmp_path = tmp.name

        try:
            result = svc.transcribe_audio(tmp_path, language="en")
            assert isinstance(result, dict)
            assert result["text"]
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_u50_empty_audio_raises_value_error(self):
        """U-50: Empty audio bytes or file must raise ValueError."""
        svc = SpeechService()
        with pytest.raises(ValueError, match="empty or corrupted"):
            svc.transcribe_audio(b"")

    def test_u51_nonexistent_file_path_raises_value_error(self):
        """U-51: Nonexistent audio file path must raise ValueError."""
        svc = SpeechService()
        with pytest.raises(ValueError, match="does not exist"):
            svc.transcribe_audio("non_existent_audio_sample_xyz.wav")

    def test_u52_singleton_instance(self):
        """U-52: Verify get_speech_service returns singleton instance."""
        svc1 = get_speech_service()
        svc2 = get_speech_service()
        assert svc1 is svc2


class TestTTSService:
    """Test suite for Piper / neural TTS service (U-53 to U-55)."""

    def test_u53_clean_text_for_speech_strips_markdown(self):
        """U-53: clean_text_for_speech normalizes code fences, backticks, and markdown formatting."""
        tts = TTSService()
        raw_text = (
            "### Python Question:\n"
            "Explain how `asyncio.gather()` works compared to `threading`.\n"
            "```python\nimport asyncio\nasync def f(): pass\n```\n"
            "Refer to [Python Docs](https://python.org) for details."
        )
        cleaned = tts.clean_text_for_speech(raw_text)

        assert "###" not in cleaned
        assert "`" not in cleaned
        assert "[code snippet omitted]" in cleaned
        assert "import asyncio" not in cleaned
        assert "Python Docs" in cleaned
        assert "https://python.org" not in cleaned

    def test_u54_empty_text_raises_value_error(self):
        """U-54: Synthesize speech with blank text raises ValueError."""
        tts = TTSService()
        with pytest.raises(ValueError, match="cannot be empty"):
            tts.synthesize_speech("   ")

    def test_u55_synthesize_speech_emits_valid_wav(self):
        """U-55: Synthesize speech emits valid standard RIFF WAV byte stream."""
        tts = TTSService()
        text = "Explain the difference between a process and a thread."
        wav_bytes = tts.synthesize_speech(text)

        assert isinstance(wav_bytes, bytes)
        assert len(wav_bytes) >= 44
        assert wav_bytes.startswith(b"RIFF")

        # Validate with python's standard wave library
        buf = io.BytesIO(wav_bytes)
        with wave.open(buf, "rb") as wf:
            assert wf.getnchannels() == 1
            assert wf.getsampwidth() == 2
            assert wf.getframerate() == 16000

    def test_u55_caching_mechanism(self):
        """U-55: Repeated synthesis of identical text hits cached audio file."""
        tts = TTSService()
        text = "This is a repeated test interview question for caching validation."
        audio1 = tts.synthesize_speech(text)
        audio2 = tts.synthesize_speech(text)

        assert audio1 == audio2
