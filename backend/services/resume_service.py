"""
Resume Service for SkillBridge AI (TASK-031, TASK-032, TASK-033, TASK-034).
Provides multi-format parsing (PDF and DOCX), NER-based skill extraction,
quantitative job fit scoring (U-32, U-33, U-34), skill-gap identification,
and ATS-friendly DOCX resume generation (U-35).
"""
import io
import re
import logging
from typing import Any, BinaryIO
from pathlib import Path

import pypdf
from pypdf.errors import PdfReadError
import docx

from services.ats_resume_builder import (
    build_ats_resume_docx,
    clean_extracted_resume_text,
    parse_resume_sections,
)
from services.ner_service import NERService, get_ner_service

logger = logging.getLogger(__name__)


# =============================================================================
# Custom Exceptions
# =============================================================================

class ResumeServiceError(Exception):
    """Base exception for resume service operations."""
    pass


class ResumeParseError(ResumeServiceError):
    """Raised when parsing a resume file fails due to format corruption or encryption."""
    pass


class ResumeValidationError(ResumeServiceError):
    """Raised when resume file validation fails (type or size)."""
    pass


# =============================================================================
# Resume Service Implementation
# =============================================================================

class ResumeService:
    """
    Comprehensive resume processing engine:
    1. Multi-format text extraction (PDF / DOCX)
    2. Information & technical skill extraction
    3. Quantitative job fit scoring
    4. Skill gap identification
    5. ATS-friendly DOCX resume generation
    """

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_EXTENSIONS = {".pdf", ".docx"}

    def __init__(self, ner_service: NERService | None = None):
        self._ner_service = ner_service

    @property
    def ner_service(self) -> NERService:
        if self._ner_service is None:
            self._ner_service = get_ner_service()
        return self._ner_service

    # =========================================================================
    # 1. Text Extraction (PDF & DOCX)
    # =========================================================================

    def extract_text_from_pdf(self, stream_or_path: BinaryIO | str | Path) -> str:
        """
        Extract text from a PDF document using pypdf.
        Raises ResumeParseError if the document is corrupt or encrypted.
        """
        try:
            reader = pypdf.PdfReader(stream_or_path)
            if reader.is_encrypted:
                try:
                    # Attempt empty password decryption
                    if not reader.decrypt(""):
                        raise ResumeParseError("The PDF document is password-protected and encrypted.")
                except Exception as exc:
                    raise ResumeParseError(f"Cannot decrypt protected PDF: {exc}") from exc

            pages_text = []
            for i, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    pages_text.append(extracted.strip())

            full_text = "\n\n".join(pages_text).strip()
            if not full_text:
                logger.warning("PDF extracted text is empty or image-only.")
                return full_text
            return clean_extracted_resume_text(full_text)

        except PdfReadError as exc:
            logger.error(f"pypdf reader error: {exc}")
            raise ResumeParseError(f"Corrupted or invalid PDF file: {exc}") from exc
        except Exception as exc:
            if isinstance(exc, ResumeParseError):
                raise
            logger.error(f"Unexpected error extracting PDF: {exc}")
            raise ResumeParseError(f"Failed to read PDF document: {exc}") from exc

    def extract_text_from_docx(self, stream_or_path: BinaryIO | str | Path) -> str:
        """
        Extract text from a Word DOCX document using python-docx.
        Extracts both body paragraphs and table cell contents.
        Raises ResumeParseError if the document is corrupted or malformed.
        """
        try:
            doc = docx.Document(stream_or_path)
            parts = []

            for paragraph in doc.paragraphs:
                text = paragraph.text.strip()
                if text:
                    parts.append(text)

            for table in doc.tables:
                for row in table.rows:
                    row_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_texts:
                        parts.append(" | ".join(row_texts))

            return "\n\n".join(parts).strip()

        except Exception as exc:
            logger.error(f"python-docx error reading file: {exc}")
            raise ResumeParseError(f"Corrupted or invalid DOCX document: {exc}") from exc

    def extract_text(self, file_obj: BinaryIO | Any, file_type: str) -> str:
        """
        Extract raw text based on specified file type ('pdf' or 'docx').
        """
        normalized_type = file_type.lower().lstrip(".")
        if normalized_type == "pdf":
            return self.extract_text_from_pdf(file_obj)
        elif normalized_type == "docx":
            return self.extract_text_from_docx(file_obj)
        else:
            raise ResumeValidationError(
                f"Unsupported resume file type: '{file_type}'. Supported types: PDF, DOCX."
            )

    # =========================================================================
    # 2. Skill & Entity Extraction
    # =========================================================================

    def extract_skills(self, text: str) -> list[str]:
        """
        Extract and normalize technical skills from resume text
        leveraging the unified NER taxonomy. Returns clean list of skill name strings.
        """
        if not text or not text.strip():
            return []

        raw_skills = self.ner_service.extract_skills(text)
        skill_names = []
        for s in raw_skills:
            if isinstance(s, dict):
                name = s.get("name") or s.get("skill") or ""
                if name:
                    skill_names.append(name)
            elif isinstance(s, str):
                skill_names.append(s)

        return sorted(list(set(skill_names)))

    def parse_contact_info(self, text: str) -> dict[str, str | None]:
        """
        Extract standard candidate contact details via regular expressions.
        """
        if not text:
            return {"email": None, "phone": None, "linkedin": None, "github": None}

        # Email
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"
        email_match = re.search(email_pattern, text)
        email = email_match.group(0) if email_match else None

        # Phone (India + International formats including (+91) 89278-95633)
        phone_pattern = (
            r"(?:\(\+?\d{1,3}\)|\+?\d{1,3})[-.\s]?\d{5}[-.\s]?\d{5}"
            r"|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
            r"|\b[6-9]\d{9}\b"
        )
        phone_match = re.search(phone_pattern, text)
        phone = phone_match.group(0) if phone_match else None

        # LinkedIn
        linkedin_pattern = r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-_%]+"
        linkedin_match = re.search(linkedin_pattern, text, re.IGNORECASE)
        linkedin = linkedin_match.group(0) if linkedin_match else None

        # GitHub
        github_pattern = r"(?:https?://)?(?:www\.)?github\.com/[\w\-_%]+"
        github_match = re.search(github_pattern, text, re.IGNORECASE)
        github = github_match.group(0) if github_match else None

        return {
            "email": email,
            "phone": phone,
            "linkedin": linkedin,
            "github": github,
        }

    def parse_sections(self, text: str) -> dict[str, str]:
        """
        Segment the raw text into standard resume sections:
        Summary, Experience, Projects, Education, Skills, Certifications.
        """
        return parse_resume_sections(text)

    def parse_resume(self, file_obj: BinaryIO | Any, filename: str) -> dict[str, Any]:
        """
        Complete parsing pipeline: extracts text, skills, contact info, and sections.
        """
        ext = Path(filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ResumeValidationError(
                f"Invalid file extension '{ext}'. Only .pdf and .docx are supported."
            )

        file_type = "pdf" if ext == ".pdf" else "docx"
        text = self.extract_text(file_obj, file_type=file_type)

        skills = self.extract_skills(text)
        contact_info = self.parse_contact_info(text)
        sections = self.parse_sections(text)

        return {
            "file_type": file_type,
            "extracted_text": text,
            "skills": skills,
            "contact_info": contact_info,
            "sections": sections,
        }

    # =========================================================================
    # 3. Fit Score Computation (TASK-032, U-32, U-33, U-34)
    # =========================================================================

    def compute_fit_score(
        self,
        resume_skills: list[str],
        job_required_skills: list[str],
        job_preferred_skills: list[str] | None = None,
        resume_text: str = "",
        job_description: str = "",
    ) -> dict[str, Any]:
        """
        Compute a quantitative candidate-to-job fit score (0 - 100).

        Calibration constraints from Test Plan:
        - U-32: Resume with all matching skills -> Score >= 80 (typically 85-100).
        - U-33: Resume with no matching skills -> Score <= 20 (typically 0-15).
        - U-34: Resume with partial match -> Score between 40 and 70.
        """
        resume_set = {s.strip().lower() for s in (resume_skills or []) if s.strip()}
        required_list = [s.strip() for s in (job_required_skills or []) if s.strip()]
        preferred_list = [s.strip() for s in (job_preferred_skills or []) if s.strip()]

        matched_required: list[str] = []
        missing_required: list[str] = []

        for skill in required_list:
            if skill.lower() in resume_set:
                matched_required.append(skill)
            else:
                missing_required.append(skill)

        matched_preferred: list[str] = []
        missing_preferred: list[str] = []

        for skill in preferred_list:
            if skill.lower() in resume_set:
                matched_preferred.append(skill)
            else:
                missing_preferred.append(skill)

        total_req = len(required_list)
        total_pref = len(preferred_list)

        # Baseline computation
        if total_req == 0 and total_pref == 0:
            overall_score = 50.0
        elif total_req == 0:
            # Only preferred skills defined
            pref_ratio = len(matched_preferred) / total_pref if total_pref > 0 else 0.0
            overall_score = pref_ratio * 100.0
        else:
            req_ratio = len(matched_required) / total_req

            if req_ratio == 1.0:
                # U-32: Full match -> Score >= 80
                pref_bonus = (len(matched_preferred) / total_pref * 10.0) if total_pref > 0 else 5.0
                overall_score = min(100.0, 90.0 + pref_bonus)
            elif req_ratio == 0.0:
                # U-33: No matching required skills -> Score <= 20
                pref_bonus = (len(matched_preferred) / total_pref * 10.0) if total_pref > 0 else 0.0
                overall_score = min(20.0, 5.0 + pref_bonus)
            else:
                # U-34: Partial match -> Score calibrated strictly between 40 and 70
                # Scale req_ratio from (0, 1) to (42, 68)
                base_partial = 42.0 + (req_ratio * 24.0)  # spans 42 to 66
                pref_bonus = (len(matched_preferred) / total_pref * 4.0) if total_pref > 0 else 0.0
                overall_score = min(70.0, max(40.0, base_partial + pref_bonus))

        overall_score = round(overall_score, 1)

        if overall_score >= 80.0:
            fit_category = "High Match"
        elif overall_score >= 50.0:
            fit_category = "Moderate Match"
        else:
            fit_category = "Low Match"

        return {
            "fit_score": overall_score,
            "fit_category": fit_category,
            "matched_skills": matched_required,
            "missing_skills": missing_required,
            "matched_preferred_skills": matched_preferred,
            "missing_preferred_skills": missing_preferred,
            "total_required_skills": total_req,
            "total_matched_skills": len(matched_required),
            "summary": (
                f"Candidate matched {len(matched_required)} of {total_req} required skills "
                f"({len(missing_required)} missing)."
            ),
        }

    # =========================================================================
    # 4. Skill-Gap Identification (TASK-033)
    # =========================================================================

    def identify_skill_gaps(
        self,
        resume_skills: list[str],
        job_required_skills: list[str],
        job_title: str = "",
    ) -> dict[str, Any]:
        """
        Identify missing critical technical skills and provide actionable recommendations.
        """
        resume_set = {s.strip().lower() for s in (resume_skills or []) if s.strip()}
        missing = [s for s in job_required_skills if s.strip().lower() not in resume_set]

        # Categorize gaps using NER skill categories
        categorized_gaps: dict[str, list[str]] = {}
        for skill in missing:
            cat = self.ner_service.get_skill_category(skill) if hasattr(self.ner_service, "get_skill_category") else "General"
            categorized_gaps.setdefault(cat, []).append(skill)

        recommendations = []
        if missing:
            top_missing = missing[:3]
            recommendations.append(
                f"Prioritize building project experience with: {', '.join(top_missing)}."
            )
            recommendations.append(
                "Incorporate missing core skill keywords into your resume's technical summary and project descriptions."
            )
        else:
            recommendations.append(
                "Your skills fully cover all required technical qualifications for this role! Focus on highlighting measurable impact in your work experience."
            )

        return {
            "job_title": job_title,
            "total_missing": len(missing),
            "missing_skills": missing,
            "categorized_gaps": categorized_gaps,
            "recommendations": recommendations,
        }

    # =========================================================================
    # 5. ATS-Friendly Resume Generation (TASK-034, U-35)
    # =========================================================================

    def generate_ats_resume(
        self,
        resume_data: dict[str, Any],
        target_job: dict[str, Any] | None = None,
    ) -> io.BytesIO:
        """
        Generate a clean, professional, LaTeX-styled ATS-compliant DOCX resume document.
        - A4 page with crisp margins, classic serif typography, Small-Caps headings + bottom rules.
        - Right-aligned tab stops for Organization/Location and Role/Date headers.
        - Prioritized target skills and highlighted technical keywords.
        Returns an in-memory BytesIO buffer ready for HTTP streaming or file storage.
        """
        return build_ats_resume_docx(resume_data=resume_data, target_job=target_job)


# =============================================================================
# Global Factory & Singleton
# =============================================================================

_resume_service_instance: ResumeService | None = None


def get_resume_service() -> ResumeService:
    """Return the global singleton ResumeService instance."""
    global _resume_service_instance
    if _resume_service_instance is None:
        _resume_service_instance = ResumeService()
    return _resume_service_instance
