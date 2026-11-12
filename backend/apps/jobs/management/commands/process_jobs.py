"""
Management command to run NER entity extraction on unprocessed JobPostings directly from CLI
without requiring Celery or Redis.
"""
from django.core.management.base import BaseCommand
from ...models import JobPosting
from services.ner_service import get_ner_service
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Run NER skill and role extraction on unprocessed JobPostings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Maximum number of unprocessed jobs to process (default 100, 0 for all)",
        )

    def handle(self, *args, **options):
        limit = options.get("limit", 100)
        qs = JobPosting.objects.filter(is_processed=False)
        total_available = qs.count()

        if total_available == 0:
            self.stdout.write(self.style.SUCCESS("All jobs are already processed!"))
            return

        if limit > 0:
            jobs_to_process = qs[:limit]
        else:
            jobs_to_process = qs.all()

        total = jobs_to_process.count()
        self.stdout.write(
            self.style.NOTICE(
                f"Starting NER extraction for {total} jobs (out of {total_available} unprocessed)..."
            )
        )

        ner = get_ner_service()
        processed_count = 0

        for idx, job in enumerate(jobs_to_process, start=1):
            try:
                extraction = ner.process_text(job.description, title=job.title)
                job.extracted_skills = extraction.get("skill_names", [])
                if extraction.get("role", {}).get("normalized_role"):
                    job.extracted_role = extraction["role"]["normalized_role"]
                job.is_processed = True
                job.save(update_fields=["extracted_skills", "extracted_role", "is_processed"])
                processed_count += 1
                if idx % 25 == 0 or idx == total:
                    self.stdout.write(f"  Processed {idx}/{total} jobs...")
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f"  Error processing job '{job.title}': {exc}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully extracted skills for {processed_count} job postings!"
            )
        )
