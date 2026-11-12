"""
Django management command to seed curated free learning resources (TASK-046).
Loads resources from apps/skills/fixtures/learning_resources.json into PostgreSQL.
Idempotent: updates existing records matched by (skill_name, url) or creates new ones.
"""
from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

try:
    from apps.skills.models import LearningResource
except ImportError:
    from backend.apps.skills.models import LearningResource


class Command(BaseCommand):
    help = "Seed the database with curated free learning resources from JSON fixture."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing learning resources before seeding.",
        )
        parser.add_argument(
            "--fixture",
            type=str,
            default="",
            help="Custom path to JSON fixture file. Defaults to apps/skills/fixtures/learning_resources.json",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count, _ = LearningResource.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {count} existing learning resources."))

        fixture_path = options["fixture"]
        if not fixture_path:
            # Default fixture path relative to this file's parent apps/skills/fixtures
            fixture_path = (
                Path(__file__).resolve().parent.parent.parent
                / "fixtures"
                / "learning_resources.json"
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
            skill_name = str(item.get("skill_name", "")).strip().lower()
            url = str(item.get("url", "")).strip()

            if not skill_name or not url:
                continue

            defaults = {
                "skill_category": item.get("skill_category", ""),
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "platform": item.get("platform", "other"),
                "resource_type": item.get("resource_type", "tutorial"),
                "difficulty": item.get("difficulty", "beginner"),
                "estimated_hours": item.get("estimated_hours"),
                "is_free": item.get("is_free", True),
                "is_active": item.get("is_active", True),
            }

            obj, created = LearningResource.objects.update_or_create(
                skill_name=skill_name,
                url=url,
                defaults=defaults,
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        total = LearningResource.objects.count()
        distinct_skills = LearningResource.objects.values("skill_name").distinct().count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded learning resources: {created_count} created, "
                f"{updated_count} updated. Total active: {total} across {distinct_skills} distinct skills."
            )
        )
