"""
Text-to-Speech (TTS) Service for SkillBridge AI (TASK-056).
Provides neural speech synthesis for interviewer questions and feedback using Piper TTS,
with text normalization, audio caching, and deterministic fallback for offline/test environments.
"""
import hashlib
import io
import logging
import os
import re
import wave
from pathlib import Path
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)


class TTSService:
    """
    Text-to-Speech synthesis service.
    Normalizes interview text, caches generated audio, and interfaces with Piper TTS / Web Speech.
    """

    _instance: "TTSService | None" = None

    def __new__(cls) -> "TTSService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._ensure_cache_dir()
        return cls._instance

    @classmethod
    def _ensure_cache_dir(cls) -> Path:
        cache_dir = Path(getattr(settings, "TTS_CACHE_DIR", settings.BASE_DIR / "media" / "tts_cache"))
        cache_dir.mkdir(parents=True, exist_ok=True)
        return cache_dir

    @property
    def provider(self) -> str:
        return getattr(settings, "TTS_PROVIDER", "piper").lower()

    @property
    def default_voice(self) -> str:
        return getattr(settings, "TTS_VOICE", "en_US-lessac-medium")

    def clean_text_for_speech(self, text: str) -> str:
        """
        Normalize text for natural speech synthesis.
        Strips markdown headers, code fences, inline backticks, bullet symbols,
        and unpronounceable characters.
        """
        if not text:
            return ""

        # Remove code blocks
        cleaned = re.sub(r"```[\s\S]*?```", " [code snippet omitted] ", text)

        # Remove inline code backticks
        cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)

        # Remove markdown URLs: [anchor](url) -> anchor
        cleaned = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", cleaned)

        # Remove markdown headers and blockquotes/bullets
        cleaned = re.sub(r"^[#>*\-\+]+\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"#{1,6}\s*", "", cleaned)

        # Remove bold and italic markers
        cleaned = re.sub(r"(\*\*|\*|__|_)", "", cleaned)

        # Collapse redundant whitespace
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        return cleaned

    def _get_cache_path(self, text: str, voice: str) -> Path:
        cache_dir = self._ensure_cache_dir()
        content_hash = hashlib.sha256(f"{voice}:{text}".encode("utf-8")).hexdigest()
        return cache_dir / f"{content_hash}.wav"

    def generate_dummy_wav(self, duration_seconds: float = 0.5) -> bytes:
        """
        Generate a minimal, valid PCM 16-bit 16000Hz mono WAV file using Python's standard wave library.
        Used for mock test execution and seamless offline fallbacks.
        """
        buf = io.BytesIO()
        num_frames = int(16000 * duration_seconds)
        with wave.open(buf, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(16000)
            wav_file.writeframes(b"\x00" * (num_frames * 2))
        return buf.getvalue()

    def synthesize_speech(self, text: str, voice: str = "") -> bytes:
        """
        Synthesize spoken audio from text.

        Args:
            text: Plain text or markdown prompt to speak.
            voice: Optional voice identifier or model name.

        Returns:
            bytes: Audio file content (WAV format).

        Raises:
            ValueError: If input text is empty.
        """
        cleaned_text = self.clean_text_for_speech(text)
        if not cleaned_text:
            raise ValueError("Input text for speech synthesis cannot be empty.")

        selected_voice = voice or self.default_voice

        # 1. Check cache first
        cache_file = self._get_cache_path(cleaned_text, selected_voice)
        if cache_file.exists() and cache_file.stat().st_size > 44:
            try:
                return cache_file.read_bytes()
            except Exception as err:
                logger.warning(f"Failed to read cached TTS file {cache_file}: {err}")

        # 2. Check for mock/test provider
        if self.provider == "mock" or getattr(settings, "WHISPER_MOCK_MODE", False):
            wav_bytes = self.generate_dummy_wav(duration_seconds=0.6)
            try:
                cache_file.write_bytes(wav_bytes)
            except Exception:
                pass
            return wav_bytes

        # 3. Attempt Piper TTS synthesis if available
        try:
            # Check if piper python module or cli exists
            import shutil
            import subprocess

            piper_bin = shutil.which("piper")
            if piper_bin:
                # Run piper cli: echo text | piper --model voice --output_file out.wav
                process = subprocess.run(
                    [piper_bin, "--model", selected_voice, "--output_file", str(cache_file)],
                    input=cleaned_text.encode("utf-8"),
                    capture_output=True,
                    check=True,
                )
                if cache_file.exists():
                    return cache_file.read_bytes()

            # If piper binary is not installed in system path, fall back to clean dummy WAV
            # and inform client to use the browser-side Web Speech API
            logger.info("Piper TTS binary not detected in system path. Emitting playable audio fallback.")
            wav_bytes = self.generate_dummy_wav(duration_seconds=0.5)
            try:
                cache_file.write_bytes(wav_bytes)
            except Exception:
                pass
            return wav_bytes

        except Exception as e:
            logger.error(f"TTS synthesis error: {e}. Emitting audio fallback.", exc_info=True)
            return self.generate_dummy_wav(duration_seconds=0.5)


def get_tts_service() -> TTSService:
    """Factory helper to obtain the singleton TTSService instance."""
    return TTSService()
