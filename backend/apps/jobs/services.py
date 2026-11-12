"""
Service helpers for the jobs app.
Provides safe metadata extraction from provider payloads, role-level market
benchmarks, and similar job recommendations using the Django ORM.
"""
from collections import Counter
from typing import Any

from django.db.models import Avg, Q

from .models import JobPosting

CONTRACT_TIME_LABELS: dict[str, str] = {
    "full_time": "Full-time",
    "part_time": "Part-time",
}

CONTRACT_TYPE_LABELS: dict[str, str] = {
    "permanent": "Permanent",
    "contract": "Contract",
    "temporary": "Temporary",
    "internship": "Internship",
}


def extract_provider_metadata(job: JobPosting) -> dict[str, Any]:
    """
    Extract safe, user-facing metadata from `job.raw_data` without exposing
    internal provider tracking keys (e.g., `adref`, `__CLASS__`).
    """
    raw = job.raw_data if isinstance(job.raw_data, dict) else {}
    location_raw = raw.get("location") if isinstance(raw.get("location"), dict) else {}

    area_raw = location_raw.get("area")
    location_area = (
        [str(item).strip() for item in area_raw if str(item).strip()]
        if isinstance(area_raw, list)
        else []
    )

    display_name = location_raw.get("display_name")
    if isinstance(display_name, str) and display_name.strip():
        location_display = display_name.strip()
    elif job.location_city:
        location_display = (
            f"{job.location_city}, {job.location_country}"
            if job.location_country
            else job.location_city
        )
    else:
        location_display = job.location_country or "India"

    raw_contract_time = str(raw.get("contract_time") or "").strip().lower()
    contract_time = CONTRACT_TIME_LABELS.get(
        raw_contract_time,
        raw_contract_time.replace("_", " ").title() if raw_contract_time else "",
    )

    raw_contract_type = str(raw.get("contract_type") or "").strip().lower()
    contract_type = CONTRACT_TYPE_LABELS.get(
        raw_contract_type,
        raw_contract_type.replace("_", " ").title() if raw_contract_type else "",
    )

    predicted_val = raw.get("salary_is_predicted")
    salary_is_predicted = str(predicted_val).strip().lower() in ("1", "true", "yes")

    return {
        "location_display": location_display,
        "location_area": location_area,
        "contract_time": contract_time,
        "contract_type": contract_type,
        "salary_is_predicted": salary_is_predicted,
    }


def _get_peer_queryset(job: JobPosting):
    """
    Return a queryset of peer job postings matching the job's role or category.
    """
    if job.extracted_role:
        peers = JobPosting.objects.filter(extracted_role__iexact=job.extracted_role)
        if peers.exists():
            return peers, job.extracted_role

    if job.category:
        peers = JobPosting.objects.filter(category__iexact=job.category)
        if peers.exists():
            return peers, job.category

    return JobPosting.objects.filter(id=job.id), (job.extracted_role or job.category or job.title)


def get_job_market_insights(job: JobPosting) -> dict[str, Any]:
    """
    Compute lightweight market benchmarks for the given job's role/category
    from stored JobPosting records.
    """
    peers, role_label = _get_peer_queryset(job)
    matching_jobs_count = peers.count()

    salary_agg = peers.filter(
        Q(salary_min__isnull=False) | Q(salary_max__isnull=False)
    ).aggregate(
        avg_min=Avg("salary_min"),
        avg_max=Avg("salary_max"),
    )

    avg_salary_min = (
        round(float(salary_agg["avg_min"]), 0) if salary_agg["avg_min"] is not None else None
    )
    avg_salary_max = (
        round(float(salary_agg["avg_max"]), 0) if salary_agg["avg_max"] is not None else None
    )

    job_skill_set = {
        str(skill).strip().lower()
        for skill in (job.extracted_skills or [])
        if str(skill).strip()
    }

    skill_counter: Counter[str] = Counter()
    city_counter: Counter[str] = Counter()

    # Cap scan to latest 250 peer rows for sub-20ms response times
    for peer_skills, peer_city in peers.order_by("-posted_date", "-created_at").values_list(
        "extracted_skills", "location_city"
    )[:250]:
        if isinstance(peer_skills, list):
            seen_in_peer: set[str] = set()
            for skill in peer_skills:
                clean_skill = str(skill).strip()
                if clean_skill and clean_skill.lower() not in seen_in_peer:
                    skill_counter[clean_skill] += 1
                    seen_in_peer.add(clean_skill.lower())
        if isinstance(peer_city, str) and peer_city.strip():
            city_counter[peer_city.strip()] += 1

    top_role_skills = [
        {
            "skill": skill_name,
            "count": count,
            "in_this_job": skill_name.lower() in job_skill_set,
        }
        for skill_name, count in skill_counter.most_common(10)
    ]

    top_hiring_cities = [
        {"city": city_name, "count": count}
        for city_name, count in city_counter.most_common(5)
    ]

    return {
        "role_title": role_label,
        "matching_jobs_count": matching_jobs_count,
        "avg_salary_min": avg_salary_min,
        "avg_salary_max": avg_salary_max,
        "currency": job.currency or "INR",
        "top_role_skills": top_role_skills,
        "top_hiring_cities": top_hiring_cities,
    }


def get_similar_jobs(job: JobPosting, limit: int = 4) -> list[dict[str, Any]]:
    """
    Retrieve similar job postings sharing the same canonical role or category.
    """
    base_qs = JobPosting.objects.exclude(id=job.id)

    if job.extracted_role:
        candidates = list(
            base_qs.filter(extracted_role__iexact=job.extracted_role).order_by(
                "-posted_date", "-created_at"
            )[:limit]
        )
    else:
        candidates = []

    if len(candidates) < limit and job.category:
        seen_ids = {item.id for item in candidates}
        fallback = (
            base_qs.filter(category__iexact=job.category)
            .exclude(id__in=seen_ids)
            .order_by("-posted_date", "-created_at")[: limit - len(candidates)]
        )
        candidates.extend(list(fallback))

    return [
        {
            "id": str(item.id),
            "title": item.title,
            "company": item.company,
            "location_city": item.location_city,
            "is_remote": item.is_remote,
            "salary_min": item.salary_min,
            "salary_max": item.salary_max,
            "currency": item.currency,
            "extracted_skills": item.extracted_skills or [],
            "extracted_role": item.extracted_role,
            "posted_date": item.posted_date.isoformat() if item.posted_date else None,
        }
        for item in candidates
    ]

