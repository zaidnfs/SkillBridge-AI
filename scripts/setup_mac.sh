#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== SkillBridge AI — macOS Setup ==="

# 1. Locate Python 3.11 or 3.12 (recommended for ML/NLP wheels on macOS)
PYTHON_BIN=""
for candidate in python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    VER="$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    if [[ "$VER" == "3.11" || "$VER" == "3.12" ]]; then
      PYTHON_BIN="$candidate"
      break
    elif [[ -z "$PYTHON_BIN" ]]; then
      PYTHON_BIN="$candidate"
    fi
  fi
done

if [[ -z "$PYTHON_BIN" ]]; then
  echo "Error: Python 3.11+ is required. Install with: brew install python@3.12"
  exit 1
fi

PY_VER="$("$PYTHON_BIN" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
echo "Using Python $PY_VER ($PYTHON_BIN)"
if [[ "$PY_VER" != "3.11" && "$PY_VER" != "3.12" ]]; then
  echo "Warning: Python 3.11 or 3.12 is recommended for macOS prebuilt wheels (spacy/faster-whisper)."
fi

# 2. Check Node.js
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Error: Node.js 18+ and npm are required. Install with: brew install node"
  exit 1
fi
echo "Using Node $(node -v) / npm $(npm -v)"

# 3. Create virtual environment & install backend dependencies
if [[ ! -d ".venv" ]]; then
  echo "Creating Python virtual environment at .venv..."
  "$PYTHON_BIN" -m venv .venv
fi

# shellcheck disable=SC1091
source ".venv/bin/activate"
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

# 4. Download spaCy English model (optional if offline)
echo "Checking spaCy en_core_web_sm model..."
python -m spacy download en_core_web_sm || echo "Warning: Could not download en_core_web_sm (app will use built-in regex + blank tokenizer fallback)."

# 5. Initialize .env if absent
if [[ ! -f ".env" ]]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  GEN_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
  python -c "from pathlib import Path; p = Path('.env'); p.write_text(p.read_text().replace('DJANGO_SECRET_KEY=', 'DJANGO_SECRET_KEY=${GEN_KEY}', 1))"
fi

# 6. Run migrations & seed demo data
echo "Running Django database migrations..."
python backend/manage.py migrate

echo "Seeding learning resources..."
python backend/manage.py seed_learning_resources

echo "Seeding demo job postings..."
python backend/manage.py seed_demo_jobs

# 7. Install frontend dependencies
echo "Installing frontend dependencies..."
npm --prefix frontend install

echo ""
echo "=== Setup complete! ==="
echo "Run the app anytime with: bash scripts/run_demo_mac.sh"

