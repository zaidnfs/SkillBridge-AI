export interface ParsedDescriptionSection {
  heading?: string;
  body: string;
}

const SECTION_HEADINGS = [
  'Description',
  'Job Description',
  'Job Summary',
  'Role Overview',
  'About the Role',
  'About Us',
  'About the Company',
  'Key Responsibilities',
  'Responsibilities',
  'What You Will Do',
  "What You'll Do",
  'Requirements',
  'Required Qualifications',
  'Preferred Qualifications',
  'Qualifications',
  'Required Skills',
  'Technical Skills',
  'Skills',
  'Experience',
  'Benefits',
  'Perks & Benefits',
  'Compensation',
];

export function isSafeHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatNumberForCurrency(value: number, currency: string): string {
  const locale = currency.toUpperCase() === 'INR' ? 'en-IN' : 'en-US';
  return Math.round(value).toLocaleString(locale);
}

export function formatSalaryRange(
  salaryMin?: string | number | null,
  salaryMax?: string | number | null,
  currency = 'INR'
): string | null {
  const minVal = salaryMin !== null && salaryMin !== undefined && salaryMin !== '' ? Number(salaryMin) : null;
  const maxVal = salaryMax !== null && salaryMax !== undefined && salaryMax !== '' ? Number(salaryMax) : null;

  if ((minVal === null || Number.isNaN(minVal)) && (maxVal === null || Number.isNaN(maxVal))) {
    return null;
  }

  const code = (currency || 'INR').toUpperCase();

  if (minVal !== null && maxVal !== null && minVal !== maxVal) {
    return `${code} ${formatNumberForCurrency(minVal, code)} – ${formatNumberForCurrency(maxVal, code)}`;
  }

  const single = minVal ?? maxVal ?? 0;
  return `${code} ${formatNumberForCurrency(single, code)}`;
}

export function formatInrLpaHint(
  salaryMin?: string | number | null,
  salaryMax?: string | number | null,
  currency = 'INR'
): string | null {
  if ((currency || 'INR').toUpperCase() !== 'INR') return null;

  const minVal = salaryMin !== null && salaryMin !== undefined && salaryMin !== '' ? Number(salaryMin) : null;
  const maxVal = salaryMax !== null && salaryMax !== undefined && salaryMax !== '' ? Number(salaryMax) : null;

  const toLpa = (val: number) => `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;

  if (minVal !== null && minVal >= 100000 && maxVal !== null && maxVal >= 100000 && minVal !== maxVal) {
    return `${toLpa(minVal)} – ${toLpa(maxVal)} p.a.`;
  }
  const single = minVal ?? maxVal;
  if (single !== null && single >= 100000) {
    return `${toLpa(single)} p.a.`;
  }
  return null;
}

export function formatFullDate(isoDate?: string | null): string | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeDate(isoDate?: string | null): string | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

export function parseJobDescriptionSections(description?: string | null): ParsedDescriptionSection[] {
  if (!description || !description.trim()) {
    return [];
  }

  let normalized = description.trim();

  // Insert clean line breaks before known section headings that appear inline in scraped text
  const escapedHeadings = SECTION_HEADINGS.map((h) =>
    h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');
  const inlineHeadingRegex = new RegExp(
    `(?:^|\\s)(${escapedHeadings})(?:\\s*[:-]+|\\s+(?=[A-Z0-9•\\-]))`,
    'g'
  );

  normalized = normalized.replace(inlineHeadingRegex, (match, heading) => {
    // Avoid breaking mid-sentence if preceded by lowercase words
    if (/^[a-z]/.test(match) && !match.startsWith('\n')) {
      return match;
    }
    return `\n\n### ${heading.trim()}\n`;
  });

  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const sections: ParsedDescriptionSection[] = [];
  for (const block of rawBlocks) {
    if (block.startsWith('### ')) {
      const lines = block.split('\n');
      const heading = lines[0].replace(/^###\s+/, '').trim();
      const body = lines.slice(1).join('\n').trim();
      if (body) {
        sections.push({ heading, body });
      }
    } else {
      sections.push({ body: block });
    }
  }

  return sections.length > 0 ? sections : [{ body: description.trim() }];
}
