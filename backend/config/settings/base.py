"""
Base Django settings for SkillBridge AI.
Shared across all environments (development, testing, production).
"""
from datetime import timedelta
from pathlib import Path
import environ
import dj_database_url

# Build paths: BASE_DIR is 'backend', PROJECT_ROOT is repository root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

# Initialize environment variables handler
env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_SECRET_KEY=(str, "insecure-dev-key-change-in-production"),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)

# Read .env file from project root if present
env_file = PROJECT_ROOT / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_celery_results",

    # Local apps
    "apps.accounts",
    "apps.jobs",
    "apps.resumes",
    "apps.skills",
    "apps.interviews",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # Must be before CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database Configuration
# Fallback to local SQLite when DATABASE_URL is not set or in test mode
default_db_url = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
DATABASES = {
    "default": dj_database_url.config(
        default=env("DATABASE_URL", default=default_db_url),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files (User uploads such as resumes)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

# Simple JWT Configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# Celery Configuration
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "django-cache"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes

# Job Data Providers Configuration
JOB_PROVIDERS = {
    "adzuna": {
        "enabled": True,
        "priority": 1,
        "app_id": env("ADZUNA_APP_ID", default=""),
        "app_key": env("ADZUNA_APP_KEY", default=""),
        "default_country": "in",
        "rate_limit_per_minute": 25,
    },
    # Future providers (e.g., Reed, Jooble) can be enabled here:
    # "reed": {
    #     "enabled": False,
    #     "priority": 2,
    #     "api_key": env("REED_API_KEY", default=""),
    # },
}

# Celery Beat Periodic Schedule
CELERY_BEAT_SCHEDULE = {
    "daily-job-ingestion": {
        "task": "tasks.ingestion.fetch_and_store_jobs",
        "schedule": 86400.0,  # Run daily (every 24 hours)
        "kwargs": {
            "max_pages_per_query": 2,
            "auto_trigger_processing": True,
        },
    },
}

# NLP & Machine Learning Settings
SPACY_MODEL = env("SPACY_MODEL", default="en_core_web_sm")
EMBEDDING_MODEL_NAME = env("EMBEDDING_MODEL_NAME", default="all-MiniLM-L6-v2")

# Knowledge Graph (Neo4j) Settings
NEO4J_URI = env("NEO4J_URI", default="bolt://localhost:7687")
NEO4J_USER = env("NEO4J_USER", default="neo4j")
NEO4J_PASSWORD = env("NEO4J_PASSWORD", default="neo4j_dev_pass")
NEO4J_DATABASE = env("NEO4J_DATABASE", default="neo4j")
NEO4J_MAX_CONNECTION_POOL_SIZE = env.int("NEO4J_MAX_CONNECTION_POOL_SIZE", default=50)

# Vector Store (Qdrant) Settings
QDRANT_URL = env("QDRANT_URL", default="http://localhost:6333")
QDRANT_API_KEY = env("QDRANT_API_KEY", default="")
QDRANT_COLLECTION_NAME = env("QDRANT_COLLECTION_NAME", default="job_postings")
QDRANT_IN_MEMORY = env.bool("QDRANT_IN_MEMORY", default=False)

# LLM (Ollama) & Agent Settings
OLLAMA_BASE_URL = env("OLLAMA_BASE_URL", default="http://localhost:11434")
OLLAMA_MODEL = env("OLLAMA_MODEL", default="llama3.1")
OLLAMA_TIMEOUT = env.float("OLLAMA_TIMEOUT", default=30.0)
LLM_FALLBACK_MODE = env.bool("LLM_FALLBACK_MODE", default=True)
PROMPTS_DIR = BASE_DIR / "prompts"

# Speech & Audio Processing (Phase 3.3 - TASK-055 & TASK-056)
WHISPER_MODEL_SIZE = env("WHISPER_MODEL_SIZE", default="base.en")
WHISPER_DEVICE = env("WHISPER_DEVICE", default="cpu")
WHISPER_COMPUTE_TYPE = env("WHISPER_COMPUTE_TYPE", default="int8")
WHISPER_CPU_THREADS = env.int("WHISPER_CPU_THREADS", default=4)
WHISPER_MOCK_MODE = env.bool("WHISPER_MOCK_MODE", default=False)
MAX_AUDIO_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_AUDIO_DURATION_SECONDS = 180  # 3 minutes

# Text-to-Speech (TTS) Settings
TTS_PROVIDER = env("TTS_PROVIDER", default="piper")
TTS_VOICE = env("TTS_VOICE", default="en_US-lessac-medium")
TTS_CACHE_DIR = BASE_DIR / "media" / "tts_cache"

