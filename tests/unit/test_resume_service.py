"""
Unit tests for ResumeService (TASK-031, TASK-032, TASK-033, TASK-034, TASK-036).
Covers test plan cases U-29 through U-37.
"""
import io
import pytest
import docx

from services.resume_service import (
    ResumeService,
    ResumeServiceError,
    ResumeParseError,
    ResumeValidationError,
    get_resume_service,
)


@pytest.fixture
def resume_service():
    return ResumeService()


@pytest.fixture
def sample_pdf_bytes():
    """Create a valid in-memory PDF containing technical resume text."""
    text = "John Doe - Backend Software Engineer Python Django Docker PostgreSQL"
    stream_content = f"BT\n/F1 12 Tf\n72 712 Td\n({text}) Tj\nET\n".encode("latin1")
    length = len(stream_content)
    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length " + str(length).encode("ascii") + b" >>\nstream\n"
        + stream_content +
        b"endstream\nendobj\n"
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000244 00000 n \n"
        b"0000000366 00000 n \n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n450\n%%EOF"
    )
    return pdf


@pytest.fixture
def sample_docx_bytes():
    """Create a valid in-memory DOCX containing structured resume text."""
    doc = docx.Document()
    doc.add_paragraph("Jane Smith - Machine Learning Engineer")
    doc.add_paragraph("Email: jane.smith@example.com | Phone: +1-555-0199")
    doc.add_paragraph("LinkedIn: https://linkedin.com/in/janesmith-ai | GitHub: https://github.com/janesmith")
    doc.add_paragraph("Summary: Experienced ML practitioner specializing in PyTorch, Python, and MLOps.")
    doc.add_paragraph("Technical Skills: Python, PyTorch, TensorFlow, Docker, Kubernetes, SQL")
    doc.add_paragraph("Experience: Built real-time inference systems serving 10M daily requests.")
    doc.add_paragraph("Education: Master of Science in Computer Science, Stanford University")

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()


class TestResumeService:
    """Unit tests for ResumeService operations and scoring."""

    def test_u29_parse_pdf_extract_text(self, resume_service, sample_pdf_bytes):
        """
        U-29: Parse PDF resume, extract text.
        Expected: Clean text extracted.
        """
        stream = io.BytesIO(sample_pdf_bytes)
        text = resume_service.extract_text_from_pdf(stream)

        assert "John Doe" in text
        assert "Backend Software Engineer" in text
        assert "Python" in text
        assert "Django" in text

    def test_u30_parse_docx_extract_text(self, resume_service, sample_docx_bytes):
        """
        U-30: Parse DOCX resume, extract text.
        Expected: Clean text extracted.
        """
        stream = io.BytesIO(sample_docx_bytes)
        text = resume_service.extract_text_from_docx(stream)

        assert "Jane Smith" in text
        assert "Machine Learning Engineer" in text
        assert "PyTorch" in text
        assert "TensorFlow" in text

    def test_u31_extract_skills_from_resume_text(self, resume_service):
        """
        U-31: Extract skills from resume text.
        Expected: Normalized skill list returned.
        """
        text = (
            "Backend Developer with expertise in Python, Django, FastAPI, Docker, and PostgreSQL. "
            "Familiar with AWS, Git, and Redis caching."
        )
        skills = resume_service.extract_skills(text)

        assert isinstance(skills, list)
        assert "Python" in skills
        assert "Django" in skills
        assert "Docker" in skills
        assert "PostgreSQL" in skills
        assert "AWS" in skills
        assert "Redis" in skills

    def test_u32_compute_fit_score_all_matching_skills(self, resume_service):
        """
        U-32: Compute fit score: resume with all matching skills.
        Expected: Score >= 80.
        """
        resume_skills = ["Python", "Django", "PostgreSQL", "Docker", "Git"]
        job_required_skills = ["Python", "Django", "PostgreSQL"]

        result = resume_service.compute_fit_score(
            resume_skills=resume_skills,
            job_required_skills=job_required_skills,
        )

        assert result["fit_score"] >= 80.0
        assert len(result["missing_skills"]) == 0
        assert len(result["matched_skills"]) == 3
        assert result["fit_category"] == "High Match"

    def test_u33_compute_fit_score_no_matching_skills(self, resume_service):
        """
        U-33: Compute fit score: resume with no matching skills.
        Expected: Score <= 20.
        """
        resume_skills = ["Photoshop", "Illustrator", "Graphic Design", "Typography"]
        job_required_skills = ["Python", "Django", "Kubernetes", "PostgreSQL"]

        result = resume_service.compute_fit_score(
            resume_skills=resume_skills,
            job_required_skills=job_required_skills,
        )

        assert result["fit_score"] <= 20.0
        assert len(result["matched_skills"]) == 0
        assert len(result["missing_skills"]) == 4
        assert result["fit_category"] == "Low Match"

    def test_u34_compute_fit_score_partial_match(self, resume_service):
        """
        U-34: Compute fit score: resume with partial match.
        Expected: Score between 40 and 70.
        """
        resume_skills = ["Python", "Git", "HTML", "CSS"]
        job_required_skills = ["Python", "Django", "Docker", "PostgreSQL"]  # 1 out of 4 matched

        result = resume_service.compute_fit_score(
            resume_skills=resume_skills,
            job_required_skills=job_required_skills,
        )

        assert 40.0 <= result["fit_score"] <= 70.0
        assert "Python" in result["matched_skills"]
        assert "Django" in result["missing_skills"]
        assert len(result["missing_skills"]) == 3

    def test_u35_generate_ats_resume_docx(self, resume_service):
        """
        U-35: Generate ATS resume (DOCX output).
        Expected: Valid DOCX file generated with expected section titles and content.
        """
        resume_data = {
            "candidate_name": "Alex Mercer",
            "contact_info": {
                "email": "alex.mercer@example.com",
                "phone": "+1-555-0144",
                "linkedin": "https://linkedin.com/in/alexmercer",
                "github": "https://github.com/alexmercer",
            },
            "skills": ["Python", "Django", "Docker", "PostgreSQL", "FastAPI"],
            "sections": {
                "summary": "Full-Stack Engineer with 3+ years experience building cloud applications.",
                "experience": "Software Engineer at TechCorp: Developed high-throughput microservices.",
                "projects": "SkillBridge AI: Engineered agentic career navigation platform.",
                "education": "BS in Computer Science, Tech Institute, 2024.",
            },
        }
        target_job = {
            "title": "Backend Python Developer",
            "skills": ["Python", "Django", "Docker"],
        }

        docx_buffer = resume_service.generate_ats_resume(
            resume_data=resume_data,
            target_job=target_job,
        )

        assert isinstance(docx_buffer, io.BytesIO)
        assert docx_buffer.getbuffer().nbytes > 0

        # Verify readability as a valid Word document
        doc = docx.Document(docx_buffer)
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "Alex Mercer" in full_text
        assert "PROFESSIONAL SUMMARY" in full_text
        assert "TECHNICAL SKILLS" in full_text
        assert "PROFESSIONAL EXPERIENCE" in full_text
        assert "Python" in full_text
        assert "Django" in full_text

    def test_u36_handle_corrupted_pdf_upload(self, resume_service):
        """
        U-36: Handle corrupted PDF upload.
        Expected: ResumeParseError raised, no unhandled crash.
        """
        corrupted_bytes = b"This is not a valid PDF file stream at all."
        with pytest.raises(ResumeParseError) as exc_info:
            resume_service.extract_text_from_pdf(io.BytesIO(corrupted_bytes))

        assert "corrupted" in str(exc_info.value).lower() or "invalid" in str(exc_info.value).lower()

    def test_u37_handle_oversized_file_upload(self, resume_service):
        """
        U-37: Handle oversized file upload (> 5MB).
        Expected: Rejected with size limit message.
        """
        assert resume_service.MAX_FILE_SIZE == 5 * 1024 * 1024

    def test_contact_info_extraction(self, resume_service):
        """
        Verify contact information parsing from text.
        """
        text = (
            "Contact: zaid@example.com, Phone: +91 9876543210. "
            "Profiles: https://linkedin.com/in/zaid-alam and https://github.com/zaid-alam"
        )
        contact = resume_service.parse_contact_info(text)

        assert contact["email"] == "zaid@example.com"
        assert contact["phone"] is not None
        assert "linkedin.com/in/zaid-alam" in contact["linkedin"]
        assert "github.com/zaid-alam" in contact["github"]

    def test_skill_gaps_identification(self, resume_service):
        """
        Verify skill-gap analysis identifies missing skills and recommendations.
        """
        resume_skills = ["Python", "Django"]
        job_skills = ["Python", "Django", "Docker", "Kubernetes", "AWS"]

        gaps = resume_service.identify_skill_gaps(
            resume_skills=resume_skills,
            job_required_skills=job_skills,
            job_title="DevOps Engineer",
        )

        assert gaps["total_missing"] == 3
        assert "Docker" in gaps["missing_skills"]
        assert "Kubernetes" in gaps["missing_skills"]
        assert "AWS" in gaps["missing_skills"]
        assert len(gaps["recommendations"]) > 0

    def test_get_resume_service_singleton(self):
        """
        Verify factory get_resume_service returns a singleton instance.
        """
        s1 = get_resume_service()
        s2 = get_resume_service()
        assert s1 is s2

    def test_parse_sections_handles_latex_style_headings(self, resume_service):
        """
        Verify Work Experience, Skills & Interests, and Certifications & Training
        are cleanly segmented instead of being swallowed into Education.
        """
        text = (
            "Mohammad Zaid Alam\n"
            "West Bengal, India | (+91) 89278-95633 | zaidlc319@gmail.com\n"
            "linkedin.com/in/zaid-alam | github.com/zaidnfs\n"
            "Work Experience\n"
            "Salire Attitude Private Limited Bangalore, India\n"
            "Lead Full-Stack Developer & Architect (Intern) Jan 2026 – Present\n"
            "• Architected STREAM, a Python/Django-based platform.\n"
            "Projects\n"
            "HTTP Server from Scratch (GitHub) June 2025\n"
            "Go, TCP/IP, Concurrency\n"
            "• Built HTTP/1.1 server from raw TCP sockets in Go.\n"
            "Education\n"
            "Integral University Lucknow, India\n"
            "B.Tech, Computer Science & Engineering Aug 2023 – Aug 2027\n"
            "• Competitive Programming: Ranked Tier 1.\n"
            "Skills & Interests\n"
            "Languages: Python, Go, SQL\n"
            "Backend: Django, REST APIs\n"
            "Certifications & Training\n"
            "• Full Stack Web Development — Udemy, 2023 • Prompt Engineering — Udemy, 2024\n"
        )

        sections = resume_service.parse_sections(text)
        assert "experience" in sections
        assert "projects" in sections
        assert "education" in sections
        assert "skills" in sections
        assert "certifications" in sections
        assert "Skills & Interests" not in sections["education"]
        assert "Certifications" not in sections["education"]

        contact = resume_service.parse_contact_info(text)
        assert contact["phone"] == "(+91) 89278-95633"

    def test_generate_ats_resume_latex_layout_structure(self, resume_service):
        """
        Verify LaTeX-style ATS DOCX uses A4 geometry, 0.5in margins, right-aligned
        entry tabs, small-caps headings with bottom rules, and 2-column certifications.
        """
        raw_text = (
            "Mohammad Zaid Alam\n"
            "West Bengal, India | (+91) 89278-95633 | zaidlc319@gmail.com\n"
            "linkedin.com/in/zaid-alam | github.com/zaidnfs\n"
            "Work Experience\n"
            "Salire Attitude Private Limited Bangalore, India\n"
            "Lead Full-Stack Developer & Architect (Intern) Jan 2026 – Present\n"
            "• Architected STREAM, a Python/Django-based SaaS platform.\n"
            "Education\n"
            "Integral University Lucknow, India\n"
            "B.Tech, Computer Science & Engineering Aug 2023 – Aug 2027\n"
            "Skills & Interests\n"
            "Languages: Python, Go, SQL\n"
            "Backend: Django, REST APIs\n"
            "Certifications & Training\n"
            "• Full Stack Web Development — Udemy, 2023 • Prompt Engineering — Udemy, 2024\n"
        )
        docx_buffer = resume_service.generate_ats_resume(
            resume_data={
                "candidate_name": "Zaid Alam",
                "extracted_text": raw_text,
                "contact_info": resume_service.parse_contact_info(raw_text),
                "skills": ["Python", "Django", "Go", "SQL"],
            },
            target_job={"title": "Python Backend Developer", "extracted_skills": ["Python", "Django"]},
        )

        doc = docx.Document(docx_buffer)
        sec = doc.sections[0]
        assert round(sec.page_width.inches, 2) == 8.27
        assert round(sec.left_margin.inches, 2) == 0.50
        assert round(sec.top_margin.inches, 2) == 0.45

        paragraphs = [p.text for p in doc.paragraphs]
        assert "Mohammad Zaid Alam" in paragraphs
        assert "West Bengal, India | (+91) 89278-95633 | zaidlc319@gmail.com" in paragraphs
        assert "Salire Attitude Private Limited\tBangalore, India" in paragraphs
        assert "Integral University\tLucknow, India" in paragraphs
        assert "CERTIFICATIONS & TRAINING" in paragraphs
        assert len(doc.tables) == 1
        assert "Full Stack Web Development — Udemy, 2023" in doc.tables[0].cell(0, 0).text
        assert "Prompt Engineering — Udemy, 2024" in doc.tables[0].cell(0, 1).text
