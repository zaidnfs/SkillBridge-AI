"""
Celery asynchronous background processing tasks for SkillBridge AI.
Processes unprocessed JobPosting records by:
1. Extracting skills & roles via spaCy NER (ner_service)
2. Ingesting entities & relationships into Neo4j Knowledge Graph (graph_service)
3. Generating dense sentence embeddings & indexing in Qdrant Vector Store (embedding_service & vector_service)
4. Marking records as processed.
"""
import logging
from typing import Any

from celery import shared_task
from django.utils import timezone

from apps.jobs.models import JobPosting
from services.embedding_service import get_embedding_service
from services.graph_service import get_graph_service
from services.ner_service import get_ner_service
from services.vector_service import get_vector_service

logger = logging.getLogger(__name__)


@shared_task(name="tasks.processing.process_unprocessed_jobs")
def process_unprocessed_jobs(
    batch_size: int = 100,
    populate_graph: bool = True,
    populate_vector: bool = True,
) -> dict[str, Any]:
    """
    Process unprocessed JobPosting records through the complete intelligence pipeline:
    NER entity extraction -> Neo4j Knowledge Graph -> Qdrant Vector Store -> DB state update.

    Args:
        batch_size: Maximum number of records to process in a single batch.
        populate_graph: If True, merges entities into the Neo4j knowledge graph.
        populate_vector: If True, computes embeddings and stores in Qdrant vector store.

    Returns:
        Summary dict containing counts of processed, graph-indexed, and vector-indexed records.
    """
    logger.info(f"Starting job processing task (batch size: {batch_size})")
    unprocessed_jobs = JobPosting.objects.filter(is_processed=False)[:batch_size]

    if not unprocessed_jobs.exists():
        logger.info("No unprocessed job postings found.")
        return {
            "processed_count": 0,
            "graph_ingested_count": 0,
            "vector_ingested_count": 0,
            "errors_count": 0,
            "status": "idle",
        }

    ner_service = get_ner_service()
    embedding_service = get_embedding_service() if populate_vector else None
    graph_service = get_graph_service() if populate_graph else None
    vector_service = get_vector_service() if populate_vector else None

    processed_count = 0
    graph_ingested_count = 0
    vector_ingested_count = 0
    errors: list[str] = []

    for job in unprocessed_jobs:
        try:
            # 1. Run NER extraction on description + title
            extraction = ner_service.process_text(job.description, title=job.title)
            job.extracted_skills = extraction["skill_names"]
            job.extracted_role = extraction["role"]["normalized_role"]

            # 2. Ingest into Neo4j Knowledge Graph (if enabled)
            if populate_graph and graph_service is not None:
                try:
                    skill_cats = {s["name"]: s.get("category", "General") for s in extraction.get("skills", [])}
                    graph_payload = {
                        "id": str(job.id),
                        "title": job.title,
                        "description": job.description,
                        "company": job.company,
                        "location_city": job.location_city,
                        "location_country": job.location_country,
                        "salary_min": float(job.salary_min) if job.salary_min else None,
                        "salary_max": float(job.salary_max) if job.salary_max else None,
                        "posted_date": job.posted_date.isoformat() if job.posted_date else None,
                        "source_url": job.source_url,
                        "source_provider": job.source_provider,
                        "extracted_role": job.extracted_role,
                        "extracted_skills": job.extracted_skills,
                        "skill_categories": skill_cats,
                    }
                    graph_service.ingest_job_posting(graph_payload)
                    graph_ingested_count += 1
                except Exception as g_exc:
                    logger.warning(
                        f"Knowledge graph ingestion failed for job {job.id}: {g_exc}"
                    )

            # 3. Compute dense embedding and store in Vector Store (if enabled)
            if populate_vector and embedding_service is not None and vector_service is not None:
                try:
                    embed_text = embedding_service.format_job_for_embedding(
                        title=job.title,
                        description=job.description,
                        skills=job.extracted_skills,
                    )
                    vector = embedding_service.generate_embedding(embed_text)
                    vector_payload = {
                        "job_id": str(job.id),
                        "title": job.title,
                        "company": job.company,
                        "location_city": job.location_city,
                        "location_country": job.location_country,
                        "is_remote": job.is_remote,
                        "category": job.category,
                        "role": job.extracted_role,
                        "skills": job.extracted_skills,
                        "salary_min": float(job.salary_min) if job.salary_min else None,
                        "salary_max": float(job.salary_max) if job.salary_max else None,
                        "posted_date": job.posted_date.isoformat() if job.posted_date else None,
                    }
                    vector_service.upsert_job(
                        job_id=str(job.id),
                        vector=vector,
                        payload=vector_payload,
                    )
                    vector_ingested_count += 1
                except Exception as v_exc:
                    logger.warning(
                        f"Vector store ingestion failed for job {job.id}: {v_exc}"
                    )

            # 4. Mark JobPosting as processed
            job.is_processed = True
            job.processed_at = timezone.now()
            job.save(
                update_fields=[
                    "extracted_skills",
                    "extracted_role",
                    "is_processed",
                    "processed_at",
                    "updated_at",
                ]
            )
            processed_count += 1

        except Exception as exc:
            logger.error(f"Error processing JobPosting {job.id}: {exc}")
            errors.append(f"{job.id}: {str(exc)}")

    logger.info(
        f"Pipeline processing completed. Processed: {processed_count}, "
        f"Graph: {graph_ingested_count}, Vector: {vector_ingested_count}, Errors: {len(errors)}"
    )

    return {
        "processed_count": processed_count,
        "graph_ingested_count": graph_ingested_count,
        "vector_ingested_count": vector_ingested_count,
        "errors_count": len(errors),
        "status": "completed",
    }
