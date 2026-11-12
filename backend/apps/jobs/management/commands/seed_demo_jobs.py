"""
Django management command to seed demo job postings from JSON fixture.
Allows instant offline/demo startup on macOS or fresh environments without
requiring external Adzuna API calls.
Idempotent: updates or creates records matched by (source_provider, source_id).
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone

try:
    from apps.jobs.models import JobPosting
except ImportError:
    from backend.apps.jobs.models import JobPosting


class Command(BaseCommand):
    help = "Seed the database with curated demo job postings from JSON fixture."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing job postings before seeding.",
        )
        parser.add_argument(
            "--fixture",
            type=str,
            default="",
            help="Custom path to JSON fixture file. Defaults to apps/jobs/fixtures/demo_jobs.json",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count, _ = JobPosting.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {count} existing job postings."))

        fixture_path = options["fixture"]
        if not fixture_path:
            fixture_path = (
                Path(__file__).resolve().parent.parent.parent
                / "fixtures"
                / "demo_jobs.json"
            )
        else:
            fixture_path = Path(fixture_path).resolve()

        if not fixture_path.exists():
            self.stderr.write(self.style.ERROR(f"Fixture file not found at: {fixture_path}"))
            return

        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            self.stderr.write(self.style.ERROR("Expected fixture JSON to be a list of objects."))
            return

        created_count = 0
        updated_count = 0

        for item in data:
            source_provider = str(item.get("source_provider") or "adzuna").strip()
            source_id = str(item.get("source_id") or "").strip()
            title = str(item.get("title") or "").strip()
            company = str(item.get("company") or "").strip()

            if not source_id or not title or not company:
                continue

            posted_raw = item.get("posted_date")
            posted_date = None
            if isinstance(posted_raw, str) and posted_raw:
                try:
                    posted_date = datetime.fromisoformat(posted_raw.replace("Z", "+00:00"))
                except ValueError:
                    posted_date = timezone.now()

            location_city = str(item.get("location_city") or "")[:100]
            defaults = {
                "title": title[:255],
                "company": company[:255],
                "description": item.get("description") or "",
                "location_city": location_city,
                "location_country": str(item.get("location_country") or "IN")[:10],
                "is_remote": bool(item.get("is_remote", False)),
                "salary_min": item.get("salary_min"),
                "salary_max": item.get("salary_max"),
                "currency": str(item.get("currency") or "INR")[:10],
                "posted_date": posted_date,
                "category": str(item.get("category") or "")[:100],
                "source_url": str(item.get("source_url") or "https://www.adzuna.in")[:1024],
                "dedup_hash": JobPosting.compute_dedup_hash(title, company, location_city),
                "raw_data": item.get("raw_data") or {},
                "extracted_skills": item.get("extracted_skills") or [],
                "extracted_role": str(item.get("extracted_role") or "")[:255],
                "is_processed": bool(item.get("is_processed", True)),
                "processed_at": timezone.now() if item.get("is_processed", True) else None,
            }

            _, created = JobPosting.objects.update_or_create(
                source_provider=source_provider,
                source_id=source_id,
                defaults=defaults,
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded demo job postings successfully: {created_count} created, {updated_count} updated."
            )
        )

