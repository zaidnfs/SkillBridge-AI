"""
ATS Resume Builder & Structured Text Normalization Helpers.

Produces a clean, single-column (plus borderless 2-column certifications grid),
LaTeX-inspired ATS-compliant DOCX resume matching crisp academic/engineering typography:
- A4 paper with 0.5in side margins and 0.45in top/bottom margins
- Classic serif typography (Times New Roman) with Small-Caps section headers + bottom rules
- Right-aligned tab stops for Organization/Location and Role/Date headers
- Merged, properly spaced bullet points with bolded target-job & technical keywords
"""
import io
import re
from typing import Any

import docx
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

# A4 dimensions & margins matching LaTeX geometry
PAGE_WIDTH_INCHES = 8.27
PAGE_HEIGHT_INCHES = 11.69
MARGIN_LR_INCHES = 0.50
MARGIN_TB_INCHES = 0.45
CONTENT_WIDTH_INCHES = PAGE_WIDTH_INCHES - (2 * MARGIN_LR_INCHES)

FONT_FAMILY = "Times New Roman"
COLOR_TEXT = RGBColor(20, 20, 20)
COLOR_DARKGRAY = RGBColor(60, 60, 60)
COLOR_RULE_HEX = "262626"

# Section heading regex definitions (supports "& Interests", "& Training", etc.)
SECTION_HEADER_SPECS: list[tuple[str, str]] = [
    ("summary", r"(?:professional\s+summary|career\s+objective|summary|profile|about\s+me)"),
    ("experience", r"(?:work\s+experience|professional\s+experience|employment\s+history|work\s+history|experience|internships)"),
    ("projects", r"(?:personal\s+projects|academic\s+projects|key\s+projects|projects)"),
    ("education", r"(?:academic\s+background|academic\s+qualifications|education)"),
    (
        "skills",
        r"(?:skills\s*(?:&|and)\s*interests|technical\s+skills|core\s+competencies|skills\s*(?:&|and)\s*tools|technologies|skills)",
    ),
    (
        "certifications",
        r"(?:certifications\s*(?:&|and)\s*training|licenses\s*(?:&|and)\s*certifications|certifications|certificates|licenses)",
    ),
]

_SOFT_WRAP_SUFFIXES = {
    "tem", "netes", "neous", "ment", "ments", "tion", "tions", "sion", "sions",
    "ing", "ers", "ies", "able", "ible", "cal", "ally", "ize", "ise", "ship",
    "ware", "form", "work", "tect", "tected", "tecture", "line", "lines",
}

_PROTECTED_GLUED_PREFIXES = (
    "a", "an", "in", "on", "at", "by", "to", "of", "or", "as", "via",
    "with", "and", "for", "from", "using", "within", "across", "into",
    "over", "under", "the", "raw", "standard", "pretrained", "concurrent",
    "sustaining", "achieving", "building", "built", "designed", "delivering",
    "supporting", "automated", "multi-tenant", "per-tenant",
)

_KNOWN_TECH_WORDS = (
    "HuggingFace", "Transformers", "PostgreSQL", "Kubernetes", "JavaScript",
    "TypeScript", "MongoDB", "Express\\.js", "Node\\.js", "FastAPI", "GitHub",
    "Tailwind", "Python", "Django", "Pandas", "NumPy", "Docker", "HTMX",
    "React", "Flask", "Linux", "Redis", "BERT", "RBAC", "CRUD", "CI/CD",
    "REST", "NLP", "AWS", "GCP", "Git",
)

# Tech words safe to split before a lowercase continuation word (excludes Go/SQL/Git)
_SUFFIX_SAFE_TECH_WORDS = (
    "HuggingFace", "Transformers", "PostgreSQL", "Kubernetes", "JavaScript",
    "TypeScript", "MongoDB", "FastAPI", "GitHub", "Tailwind", "Python",
    "Django", "Pandas", "NumPy", "Docker", "HTMX", "React", "Flask",
    "Linux", "Redis", "BERT", "RBAC", "CRUD", "CI/CD", "REST", "NLP",
)

_CITY_NAME_PATTERN = (
    r"(?:Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|New\s+Delhi|Chennai|"
    r"Lucknow|Kolkata|Noida|Gurgaon|Gurugram|West\s+Bengal|San\s+Francisco|"
    r"New\s+York|London|Berlin|Singapore|Remote)"
)

_LOCATION_RE = re.compile(_CITY_NAME_PATTERN, re.IGNORECASE)

_DATE_SPAN_RE = re.compile(
    r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}"
    r"(?:\s*[–\-—]+\s*(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}))?"
    r"|\b20\d{2}\s*[–\-—]+\s*(?:Present|Current|20\d{2})\b)",
    re.IGNORECASE,
)


def _fix_hyphen_wrap(match: re.Match[str]) -> str:
    left = match.group(1)
    right = match.group(2)
    if (
        len(left) <= 4
        or right.lower() in _SOFT_WRAP_SUFFIXES
        or left.lower() in {"sys", "kuber", "simulta", "deploy"}
        or right.lower().startswith("netes")
    ):
        return f"{left}{right}"
    return f"{left}-{right}"


def clean_extracted_resume_text(text: str) -> str:
    """
    Normalize PDF/DOCX extracted text by repairing line-wrap hyphenations and
    LaTeX font-switch spacing artifacts without mutating CamelCase brand names.
    """
    if not text:
        return ""

    cleaned = text.replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ")

    # 1. Rejoin hyphenated line wraps (e.g. "sys-\ntem" -> "system", "NLP-\nbased" -> "NLP-based")
    cleaned = re.sub(r"([A-Za-z]{2,})-\s*\n\s*([a-z]{2,})", _fix_hyphen_wrap, cleaned)

    # 2. Clean pipes, bullets, and colons
    cleaned = re.sub(r"\s*\|\s*", " | ", cleaned)
    cleaned = re.sub(r"•\s*", "• ", cleaned)
    cleaned = re.sub(r"(?<!https)(?<!http)(?<!mailto):(?=[A-Za-z])", ": ", cleaned)

    # 3. Clean parentheses boundaries (e.g. "Platform(GitHub)January")
    cleaned = re.sub(r"([A-Za-z0-9])\((?=[A-Za-z])", r"\1 (", cleaned)
    cleaned = re.sub(r"\)([A-Za-z0-9])", r") \1", cleaned)

    # 4. Clean digit/percent/plus boundaries (e.g. "achieving100%data", "a24-houruniversity")
    cleaned = re.sub(r"\b([a-z]+)(?=(?:\d+[%+\-]|~\d+%))", r"\1 ", cleaned)
    cleaned = re.sub(r"(~?\d+[%+])(?=[A-Za-z])", r"\1 ", cleaned)
    cleaned = re.sub(r"(-hour|-year|-month|-day)(?=[a-z])", r"\1 ", cleaned)

    # 5. Repair font-switch glued words around known tech terms & prepositions
    tech_alt = "|".join(_KNOWN_TECH_WORDS)
    suffix_safe_alt = "|".join(_SUFFIX_SAFE_TECH_WORDS)
    prefix_alt = "|".join(_PROTECTED_GLUED_PREFIXES)
    # Run prefix/suffix separation without trailing \b so middle-glued tokens
    # like "inPythonfor", "usingHTMXand", "multi-tenantPostgreSQLbackend" split cleanly.
    cleaned = re.sub(
        rf"\b({prefix_alt}|[a-z]+-tenant)(?=(?:{tech_alt}))",
        r"\1 ",
        cleaned,
    )
    cleaned = re.sub(
        rf"([a-z])({tech_alt})(?=\b|[^A-Za-z]|[a-z])",
        r"\1 \2",
        cleaned,
    )
    cleaned = re.sub(
        rf"\b({suffix_safe_alt})(?=[a-z]{{3,}})",
        r"\1 ",
        cleaned,
    )
    cleaned = re.sub(
        rf"\b({tech_alt})\s+(and|or|in|on|by|to|of|as|for|via|with|from|using|within|across|while|that|is|are|was|were)\b",
        r"\1 \2",
        cleaned,
    )
    cleaned = re.sub(
        r"\b([A-Z]{2,})(and|or|in|on|by|to|of|as|for|via|with|from|using|within|across|while)\b",
        r"\1 \2",
        cleaned,
    )
    # Handle glued monospace/bold spans like "net/httplibrary", "socketsinGo", "rawTCP"
    cleaned = re.sub(r"\b(raw)(TCP)\b", r"\1 \2", cleaned)
    cleaned = re.sub(r"\b(standard)(net/http)(?=[a-z])", r"\1 \2 ", cleaned)
    cleaned = re.sub(r"(net/http)(?=[a-z])", r"\1 ", cleaned)
    cleaned = re.sub(r"\b(sockets)(in)(Go)\b", r"\1 \2 \3", cleaned)
    cleaned = re.sub(r"\b(sockets)(in)\b", r"\1 \2", cleaned)
    cleaned = re.sub(r"\b(using)(goroutines)(and)\b", r"\1 \2 \3", cleaned)
    cleaned = re.sub(r"\b(goroutines)(and)\b", r"\1 \2", cleaned)
    cleaned = re.sub(r"(-based)(?=[a-z])", r"\1 ", cleaned)
    cleaned = re.sub(r"\b(modules)(for)(event)(creation)\b", r"\1 \2 \3 \4", cleaned)
    cleaned = re.sub(r"\b(participant)(registration)\b", r"\1 \2", cleaned)
    cleaned = re.sub(r"\b(and)(scheduling)\b", r"\1 \2", cleaned)
    cleaned = re.sub(r"\b(supporting)(management)\b", r"\1 \2", cleaned)
    cleaned = re.sub(r"\b(NLP)\s+(based)\b", r"\1-\2", cleaned)

    # Normalize extra spaces inside lines while preserving newlines
    lines = [re.sub(r"[ \t]{2,}", " ", line).strip() for line in cleaned.split("\n")]
    return "\n".join(lines).strip()


def parse_resume_sections(text: str) -> dict[str, str]:
    """
    Segment resume text into canonical sections (`summary`, `experience`,
    `projects`, `education`, `skills`, `certifications`) supporting both standalone
    heading lines and inline `Header: content` lines.
    """
    if not text or not text.strip():
        return {}

    cleaned = clean_extracted_resume_text(text)
    header_alt = "|".join(
        f"(?P<{name}>{regex})" for name, regex in SECTION_HEADER_SPECS
    )

    # Match either standalone heading line OR "Heading: inline content"
    line_pattern = re.compile(
        rf"(?im)^[ \t]*(?:{header_alt})[ \t]*(?::[ \t]*(?P<inline>.*)|[ \t]*)$"
    )

    sections: dict[str, str] = {}
    preamble_lines: list[str] = []
    current_section: str | None = None
    buffers: dict[str, list[str]] = {}

    for raw_line in cleaned.split("\n"):
        match = line_pattern.match(raw_line)
        if match:
            matched_name = None
            for name, _ in SECTION_HEADER_SPECS:
                if match.group(name):
                    matched_name = name
                    break
            if matched_name:
                current_section = matched_name
                buffers.setdefault(current_section, [])
                inline = (match.group("inline") or "").strip()
                if inline:
                    buffers[current_section].append(inline)
                continue

        if current_section is None:
            if raw_line.strip():
                preamble_lines.append(raw_line.strip())
        else:
            buffers[current_section].append(raw_line)

    if not buffers:
        sections["body"] = cleaned.strip()
        return sections

    if preamble_lines:
        sections["header"] = "\n".join(preamble_lines).strip()

    for name, lines in buffers.items():
        content = "\n".join(lines).strip()
        if content:
            sections[name] = content

    return sections


def extract_candidate_header_details(
    text: str,
    fallback_name: str = "",
    contact_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Extract candidate display name, location, and formatted contact lines from
    the top preamble of a resume.
    """
    sections = parse_resume_sections(text)
    header_block = sections.get("header", "")
    header_lines = [line.strip() for line in header_block.split("\n") if line.strip()]

    contact = dict(contact_info or {})
    candidate_name = fallback_name.strip()
    location = ""

    if header_lines:
        first_line = header_lines[0]
        # Treat first line as candidate name if it has no email/URL/phone/pipe
        if (
            "@" not in first_line
            and "|" not in first_line
            and "http" not in first_line.lower()
            and not re.search(r"\d{5,}", first_line)
            and len(first_line.split()) <= 6
        ):
            # Strip role suffix if written like "Jane Smith - Machine Learning Engineer"
            candidate_name = first_line.split(" - ")[0].strip()

        for line in header_lines[1:]:
            for segment in [seg.strip() for seg in line.split("|") if seg.strip()]:
                if (
                    "@" not in segment
                    and "linkedin" not in segment.lower()
                    and "github" not in segment.lower()
                    and not re.search(r"\d{4,}", segment)
                    and _LOCATION_RE.search(segment)
                ):
                    location = segment
                    break
            if location:
                break

    if not candidate_name:
        candidate_name = "Candidate Name"

    primary_contact: list[str] = []
    if location:
        primary_contact.append(location)
    if contact.get("phone"):
        primary_contact.append(str(contact["phone"]))
    if contact.get("email"):
        primary_contact.append(str(contact["email"]))

    links_contact: list[str] = []
    if contact.get("linkedin"):
        links_contact.append(re.sub(r"^https?://(www\.)?", "", str(contact["linkedin"]), flags=re.I))
    if contact.get("github"):
        links_contact.append(re.sub(r"^https?://(www\.)?", "", str(contact["github"]), flags=re.I))

    return {
        "candidate_name": candidate_name,
        "location": location,
        "primary_contact": primary_contact,
        "links_contact": links_contact,
    }


def _merge_wrapped_lines(raw_text: str) -> list[str]:
    """
    Combine wrapped continuation lines inside bullets or prose while keeping
    bullet boundaries, entry headers, and date/location lines distinct.
    """
    raw_lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
    merged: list[str] = []

    for line in raw_lines:
        is_bullet = line.startswith(("•", "-", "*")) and not line.startswith("---")
        has_date_or_loc = bool(_DATE_SPAN_RE.search(line) or _LOCATION_RE.search(line))

        if is_bullet:
            merged.append(f"• {line.lstrip('•-* ').strip()}")
        elif not merged:
            merged.append(line)
        elif merged[-1].startswith("• "):
            # Continue previous bullet unless this line clearly starts a new entry header
            if has_date_or_loc and len(line) < 95 and not merged[-1].endswith((",", ";", "and", "or")):
                merged.append(line)
            else:
                merged[-1] = f"{merged[-1]} {line}"
        else:
            merged.append(line)

    return merged


def _split_left_right_header(line: str) -> tuple[str, str]:
    """
    Split a two-column entry header line (e.g. 'Company Bangalore, India' or
    'Role Name Jan 2026 - Present') into (left, right).
    """
    date_match = _DATE_SPAN_RE.search(line)
    if date_match and date_match.start() > 0:
        left = line[: date_match.start()].strip(" -|–—")
        right = line[date_match.start() :].strip()
        if left and right:
            return left, right

    # Look for trailing known "City, Country" / "City, State"
    loc_match = re.search(
        rf"\s+({_CITY_NAME_PATTERN}(?:,\s*(?:India|USA|UK|Canada|Germany|Singapore|[A-Z]{{2}}))?)$",
        line,
        re.IGNORECASE,
    )
    if loc_match:
        left = line[: loc_match.start()].strip(" -|–—")
        right = loc_match.group(1).strip()
        if left and right:
            return left, right

    # Fallback: single capitalized city word + ", Country"
    generic_loc = re.search(
        r"\s+([A-Z][a-z]+,\s*(?:India|USA|UK|Canada|Germany|Singapore|[A-Z]{2}))$",
        line,
    )
    if generic_loc:
        left = line[: generic_loc.start()].strip(" -|–—")
        right = generic_loc.group(1).strip()
        if left and right:
            return left, right

    return line, ""


def _parse_entry_blocks(section_text: str, mode: str) -> list[dict[str, Any]]:
    """
    Parse Work Experience, Projects, or Education text into structured entry dicts:
    { title_left, title_right, sub_left, sub_right, bullets: list[str] }.
    """
    lines = _merge_wrapped_lines(section_text)
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("• "):
            if current is None:
                current = {
                    "title_left": "",
                    "title_right": "",
                    "sub_left": "",
                    "sub_right": "",
                    "bullets": [],
                }
                entries.append(current)
            current["bullets"].append(line[2:].strip())
            i += 1
            continue

        left, right = _split_left_right_header(line)
        # Start a new entry block
        current = {
            "title_left": left,
            "title_right": right,
            "sub_left": "",
            "sub_right": "",
            "bullets": [],
        }

        # Check next line for role / degree / tech-stack subtitle
        if i + 1 < len(lines) and not lines[i + 1].startswith("• "):
            next_line = lines[i + 1]
            # Avoid consuming the next distinct project/company if current line had no right-hand date/loc
            next_left, next_right = _split_left_right_header(next_line)
            if mode == "projects" or next_right or not right:
                current["sub_left"] = next_left
                current["sub_right"] = next_right
                i += 1

        entries.append(current)
        i += 1

    return entries


def _add_bottom_border(paragraph: docx.text.paragraph.Paragraph) -> None:
    """Add a crisp horizontal rule directly beneath a section heading (\titlerule)."""
    p_pr = paragraph._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), COLOR_RULE_HEX)
    p_bdr.append(bottom)
    p_pr.append(p_bdr)


def _add_small_caps_heading(doc: docx.Document, title: str) -> None:
    """
    Render an uppercase section heading with LaTeX small-caps proportions
    (first letter of each word 11.5pt, remaining letters 9.5pt) + bottom rule.
    Preserves exact uppercase `paragraph.text` for ATS parsers and tests.
    """
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2.5)
    p.paragraph_format.keep_with_next = True

    tokens = re.split(r"(\s+)", title.upper())
    for token in tokens:
        if not token:
            continue
        if token.isspace():
            r = p.add_run(token)
            r.font.name = FONT_FAMILY
            r.font.size = Pt(11)
            r.font.bold = True
            continue

        lead = p.add_run(token[0])
        lead.font.name = FONT_FAMILY
        lead.font.size = Pt(11.5)
        lead.font.bold = True
        lead.font.color.rgb = COLOR_TEXT

        if len(token) > 1:
            tail = p.add_run(token[1:])
            tail.font.name = FONT_FAMILY
            tail.font.size = Pt(9.5)
            tail.font.bold = True
            tail.font.color.rgb = COLOR_TEXT

    _add_bottom_border(p)


def _add_rich_runs_with_keyword_bolding(
    paragraph: docx.text.paragraph.Paragraph,
    text: str,
    highlight_terms: list[str],
    font_size: float = 9.5,
) -> None:
    """
    Add text runs to a paragraph, bolding matched technical/target keywords
    and key quantitative metrics (e.g., 100%, 500+, ~30%) like LaTeX \\textbf{...}.
    """
    terms = sorted(
        {t.strip() for t in highlight_terms if t and len(t.strip()) >= 2},
        key=len,
        reverse=True,
    )
    patterns: list[str] = [r"~?\d+(?:\.\d+)?[%+]"]
    for term in terms[:35]:
        escaped = re.escape(term)
        if re.match(r"^[A-Za-z0-9]", term):
            patterns.append(rf"\b{escaped}\b")
        else:
            patterns.append(escaped)

    combined = re.compile(f"({'|'.join(patterns)})", re.IGNORECASE) if patterns else None
    if not combined:
        run = paragraph.add_run(text)
        run.font.name = FONT_FAMILY
        run.font.size = Pt(font_size)
        run.font.color.rgb = COLOR_TEXT
        return

    cursor = 0
    for match in combined.finditer(text):
        if match.start() > cursor:
            plain_run = paragraph.add_run(text[cursor : match.start()])
            plain_run.font.name = FONT_FAMILY
            plain_run.font.size = Pt(font_size)
            plain_run.font.color.rgb = COLOR_TEXT

        bold_run = paragraph.add_run(match.group(0))
        bold_run.font.name = FONT_FAMILY
        bold_run.font.size = Pt(font_size)
        bold_run.font.bold = True
        bold_run.font.color.rgb = COLOR_TEXT
        cursor = match.end()

    if cursor < len(text):
        tail_run = paragraph.add_run(text[cursor:])
        tail_run.font.name = FONT_FAMILY
        tail_run.font.size = Pt(font_size)
        tail_run.font.color.rgb = COLOR_TEXT


def _add_entry_header(
    doc: docx.Document,
    left: str,
    right: str,
    bold: bool = True,
    italic: bool = False,
    space_before: float = 3.0,
) -> None:
    """Render a left/right justified header line using an exact right-aligned tab stop."""
    if not left and not right:
        return
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(0.5)
    p.paragraph_format.line_spacing = 1.08
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.tab_stops.add_tab_stop(
        Inches(CONTENT_WIDTH_INCHES), WD_TAB_ALIGNMENT.RIGHT
    )

    run_left = p.add_run(left)
    run_left.font.name = FONT_FAMILY
    run_left.font.size = Pt(10)
    run_left.font.bold = bold
    run_left.font.italic = italic
    run_left.font.color.rgb = COLOR_TEXT

    if right:
        run_right = p.add_run(f"\t{right}")
        run_right.font.name = FONT_FAMILY
        run_right.font.size = Pt(10)
        run_right.font.bold = bold
        run_right.font.italic = italic
        run_right.font.color.rgb = COLOR_TEXT


def _add_bullet_paragraph(
    doc: docx.Document,
    text: str,
    highlight_terms: list[str],
) -> None:
    """Render a crisp, compact bullet item matching LaTeX itemize spacing."""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.22)
    p.paragraph_format.first_line_indent = Inches(-0.14)
    p.paragraph_format.space_before = Pt(0.5)
    p.paragraph_format.space_after = Pt(1.5)
    p.paragraph_format.line_spacing = 1.08

    bullet_run = p.add_run("•  ")
    bullet_run.font.name = FONT_FAMILY
    bullet_run.font.size = Pt(9.5)
    bullet_run.font.color.rgb = COLOR_TEXT

    _add_rich_runs_with_keyword_bolding(p, text, highlight_terms, font_size=9.5)


def _remove_table_borders(table: docx.table.Table) -> None:
    """Strip all visible borders from a layout table (for 2-column certifications)."""
    tbl_pr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "none")
        borders.append(el)
    tbl_pr.append(borders)


def _render_skills_section(
    doc: docx.Document,
    skills_text: str,
    candidate_skills: list[str],
    target_skills: list[str],
) -> None:
    """
    Render Technical Skills cleanly: preserves categorized lines if present
    (e.g. 'Languages: Python, Go...'), prioritizing and bolding target-matched
    skills, or falls back to a clean Core Competencies row.
    """
    _add_small_caps_heading(doc, "TECHNICAL SKILLS")
    target_lower = {s.strip().lower() for s in target_skills if s.strip()}

    parsed_rows: list[tuple[str, str]] = []
    if skills_text:
        for line in _merge_wrapped_lines(skills_text):
            clean = line.lstrip("•-* ").strip()
            if ":" in clean:
                label, rest = clean.split(":", 1)
                if len(label.split()) <= 5 and rest.strip():
                    parsed_rows.append((label.strip(), rest.strip()))
            elif clean:
                if parsed_rows:
                    prev_label, prev_rest = parsed_rows[-1]
                    parsed_rows[-1] = (prev_label, f"{prev_rest} {clean}")
                else:
                    parsed_rows.append(("Core Competencies", clean))

    if parsed_rows:
        for label, items_str in parsed_rows:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(0.5)
            p.paragraph_format.space_after = Pt(1.5)
            p.paragraph_format.line_spacing = 1.08

            lbl_run = p.add_run(f"{label}: ")
            lbl_run.font.name = FONT_FAMILY
            lbl_run.font.size = Pt(9.5)
            lbl_run.font.bold = True
            lbl_run.font.color.rgb = COLOR_TEXT

            # Prioritize target-matched skills within the category row
            tokens = [tok.strip() for tok in items_str.split(",") if tok.strip()]
            if len(tokens) > 1 and target_lower:
                matched_toks = [t for t in tokens if t.lower() in target_lower]
                other_toks = [t for t in tokens if t.lower() not in target_lower]
                ordered_str = ", ".join(matched_toks + other_toks)
            else:
                ordered_str = items_str

            _add_rich_runs_with_keyword_bolding(
                p, ordered_str, target_skills, font_size=9.5
            )
        return

    # Flat candidate skills fallback
    matched = [s for s in candidate_skills if s.lower() in target_lower]
    other = [s for s in candidate_skills if s not in matched]
    ordered_skills = matched + other

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(2)

    lbl_run = p.add_run("Core Competencies: ")
    lbl_run.font.name = FONT_FAMILY
    lbl_run.font.size = Pt(9.5)
    lbl_run.font.bold = True
    lbl_run.font.color.rgb = COLOR_TEXT

    skills_str = (
        ", ".join(ordered_skills)
        if ordered_skills
        else "Software Engineering, Problem Solving, Data Structures, Algorithms"
    )
    _add_rich_runs_with_keyword_bolding(p, skills_str, target_skills, font_size=9.5)


def _render_certifications_section(doc: docx.Document, certs_text: str) -> None:
    """
    Render Certifications & Training in a compact, borderless 2-column grid
    mirroring the LaTeX minipage layout.
    """
    # Split inline multi-bullet lines such as "• Cert A • Cert B"
    raw_items: list[str] = []
    for chunk in re.split(r"•", certs_text):
        clean = " ".join(chunk.split()).strip(" -*")
        if clean:
            raw_items.append(clean)

    if not raw_items:
        return

    _add_small_caps_heading(doc, "CERTIFICATIONS & TRAINING")

    rows_needed = (len(raw_items) + 1) // 2
    table = doc.add_table(rows=rows_needed, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    _remove_table_borders(table)

    col_width = Inches(CONTENT_WIDTH_INCHES / 2)
    for idx, cert in enumerate(raw_items):
        row_idx = idx // 2
        col_idx = idx % 2
        cell = table.cell(row_idx, col_idx)
        cell.width = col_width

        p = cell.paragraphs[0]
        p.paragraph_format.left_indent = Inches(0.16)
        p.paragraph_format.first_line_indent = Inches(-0.12)
        p.paragraph_format.space_before = Pt(0.5)
        p.paragraph_format.space_after = Pt(1.5)
        p.paragraph_format.line_spacing = 1.05

        bullet = p.add_run("• ")
        bullet.font.name = FONT_FAMILY
        bullet.font.size = Pt(9.5)
        bullet.font.color.rgb = COLOR_TEXT

        # Bold title portion before " — " or " - "
        parts = re.split(r"\s*[—–]\s*|\s+-\s+", cert, maxsplit=1)
        title_run = p.add_run(parts[0].strip())
        title_run.font.name = FONT_FAMILY
        title_run.font.size = Pt(9.5)
        title_run.font.bold = True
        title_run.font.color.rgb = COLOR_TEXT

        if len(parts) > 1:
            rest_run = p.add_run(f" — {parts[1].strip()}")
            rest_run.font.name = FONT_FAMILY
            rest_run.font.size = Pt(9.5)
            rest_run.font.color.rgb = COLOR_TEXT


def build_ats_resume_docx(
    resume_data: dict[str, Any],
    target_job: dict[str, Any] | None = None,
) -> io.BytesIO:
    """
    Build a high-craft, LaTeX-matched ATS DOCX document from parsed resume data
    and optional target job requirements.
    """
    doc = docx.Document()

    # Configure A4 page & LaTeX-matched margins
    for sec in doc.sections:
        sec.page_width = Inches(PAGE_WIDTH_INCHES)
        sec.page_height = Inches(PAGE_HEIGHT_INCHES)
        sec.top_margin = Inches(MARGIN_TB_INCHES)
        sec.bottom_margin = Inches(MARGIN_TB_INCHES)
        sec.left_margin = Inches(MARGIN_LR_INCHES)
        sec.right_margin = Inches(MARGIN_LR_INCHES)

    extracted_text = resume_data.get("extracted_text") or ""
    contact = resume_data.get("contact_info", {}) or {}
    candidate_skills = list(resume_data.get("skills", []) or [])

    # Re-parse clean sections when extracted_text is available to ensure
    # Skills & Interests / Certifications & Training are separated cleanly.
    sections = dict(resume_data.get("sections", {}) or {})
    if extracted_text:
        reparsed = parse_resume_sections(extracted_text)
        if reparsed:
            sections = reparsed

    header_info = extract_candidate_header_details(
        extracted_text,
        fallback_name=resume_data.get("candidate_name") or "",
        contact_info=contact,
    )

    target_skills: list[str] = []
    target_title = ""
    if target_job:
        target_skills = list(
            target_job.get("extracted_skills", []) or target_job.get("skills", []) or []
        )
        target_title = str(target_job.get("title") or "").strip()

    highlight_terms = list(dict.fromkeys(target_skills + candidate_skills))

    # -------------------------------------------------------------------------
    # Header Block (Centered Name + Contact Lines)
    # -------------------------------------------------------------------------
    name_p = doc.add_paragraph()
    name_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_p.paragraph_format.space_before = Pt(0)
    name_p.paragraph_format.space_after = Pt(2)
    name_run = name_p.add_run(header_info["candidate_name"])
    name_run.font.name = FONT_FAMILY
    name_run.font.size = Pt(20)
    name_run.font.bold = True
    name_run.font.color.rgb = COLOR_TEXT

    if header_info["primary_contact"]:
        c1 = doc.add_paragraph()
        c1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c1.paragraph_format.space_before = Pt(0)
        c1.paragraph_format.space_after = Pt(1)
        r1 = c1.add_run(" | ".join(header_info["primary_contact"]))
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_DARKGRAY

    if header_info["links_contact"]:
        c2 = doc.add_paragraph()
        c2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c2.paragraph_format.space_before = Pt(0)
        c2.paragraph_format.space_after = Pt(2)
        r2 = c2.add_run(" | ".join(header_info["links_contact"]))
        r2.font.name = FONT_FAMILY
        r2.font.size = Pt(9.5)
        r2.font.color.rgb = COLOR_DARKGRAY

    # -------------------------------------------------------------------------
    # Optional Summary (rendered if present in resume or if resume lacks sections)
    # -------------------------------------------------------------------------
    summary_text = sections.get("summary", "").strip()
    if summary_text or (not sections.get("experience") and not sections.get("projects")):
        _add_small_caps_heading(doc, "PROFESSIONAL SUMMARY")
        if not summary_text:
            role_phrase = f" seeking opportunities as {target_title}" if target_title else ""
            top_skills = ", ".join(candidate_skills[:6]) if candidate_skills else "software engineering"
            summary_text = (
                f"Results-driven technical professional{role_phrase}. "
                f"Proficient in {top_skills}, with demonstrated engineering foundations."
            )
        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(1)
        sp.paragraph_format.space_after = Pt(2)
        sp.paragraph_format.line_spacing = 1.1
        _add_rich_runs_with_keyword_bolding(sp, summary_text, highlight_terms, font_size=9.5)

    # -------------------------------------------------------------------------
    # Work / Professional Experience
    # -------------------------------------------------------------------------
    _add_small_caps_heading(doc, "PROFESSIONAL EXPERIENCE")
    exp_text = sections.get("experience", "").strip()
    if exp_text:
        for entry in _parse_entry_blocks(exp_text, mode="experience"):
            if entry["title_left"] or entry["title_right"]:
                _add_entry_header(
                    doc, entry["title_left"], entry["title_right"], bold=True, italic=False, space_before=2.5
                )
            if entry["sub_left"] or entry["sub_right"]:
                _add_entry_header(
                    doc, entry["sub_left"], entry["sub_right"], bold=False, italic=True, space_before=0.0
                )
            for bullet in entry["bullets"]:
                _add_bullet_paragraph(doc, bullet, highlight_terms)
    else:
        _add_bullet_paragraph(
            doc,
            "Developed and maintained scalable software components following modern engineering practices.",
            highlight_terms,
        )

    # -------------------------------------------------------------------------
    # Projects
    # -------------------------------------------------------------------------
    proj_text = sections.get("projects", "").strip()
    if proj_text:
        _add_small_caps_heading(doc, "PROJECTS")
        for idx, entry in enumerate(_parse_entry_blocks(proj_text, mode="projects")):
            if entry["title_left"] or entry["title_right"]:
                _add_entry_header(
                    doc,
                    entry["title_left"],
                    entry["title_right"],
                    bold=True,
                    italic=False,
                    space_before=1.5 if idx == 0 else 3.5,
                )
            if entry["sub_left"] or entry["sub_right"]:
                _add_entry_header(
                    doc, entry["sub_left"], entry["sub_right"], bold=False, italic=True, space_before=0.0
                )
            for bullet in entry["bullets"]:
                _add_bullet_paragraph(doc, bullet, highlight_terms)

    # -------------------------------------------------------------------------
    # Education
    # -------------------------------------------------------------------------
    edu_text = sections.get("education", "").strip()
    if edu_text:
        _add_small_caps_heading(doc, "EDUCATION")
        for entry in _parse_entry_blocks(edu_text, mode="education"):
            if entry["title_left"] or entry["title_right"]:
                _add_entry_header(
                    doc, entry["title_left"], entry["title_right"], bold=True, italic=False, space_before=2.0
                )
            if entry["sub_left"] or entry["sub_right"]:
                _add_entry_header(
                    doc, entry["sub_left"], entry["sub_right"], bold=True, italic=True, space_before=0.0
                )
            for bullet in entry["bullets"]:
                _add_bullet_paragraph(doc, bullet, highlight_terms)

    # -------------------------------------------------------------------------
    # Technical Skills
    # -------------------------------------------------------------------------
    _render_skills_section(
        doc,
        skills_text=sections.get("skills", "").strip(),
        candidate_skills=candidate_skills,
        target_skills=target_skills,
    )

    # -------------------------------------------------------------------------
    # Certifications & Training (2-column borderless grid)
    # -------------------------------------------------------------------------
    certs_text = sections.get("certifications", "").strip()
    if certs_text:
        _render_certifications_section(doc, certs_text)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer

