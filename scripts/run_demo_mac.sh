#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d ".venv" ]]; then
  echo "Virtual environment not found. Running setup first..."
  bash scripts/setup_mac.sh
fi

# Ensure macOS native Vite rolldown binding exists
if [[ "$(uname -s)" == "Darwin" ]]; then
  ARCH_BINDING="frontend/node_modules/@rolldown/binding-darwin-arm64"
  if [[ "$(uname -m)" != "arm64" ]]; then
    ARCH_BINDING="frontend/node_modules/@rolldown/binding-darwin-x64"
  fi
  if [[ ! -d "$ARCH_BINDING" ]]; then
    echo "Notice: Detected missing macOS native Vite binding ($ARCH_BINDING)."
    echo "Rebuilding frontend dependencies for macOS..."
    rm -rf frontend/node_modules frontend/package-lock.json
    npm --prefix frontend install
  fi
elif [[ ! -d "frontend/node_modules" ]]; then
  echo "Frontend dependencies missing. Installing..."
  npm --prefix frontend install
fi

# shellcheck disable=SC1091
source ".venv/bin/activate"

# Optional: start Docker services if --docker flag is passed
if [[ "${1:-}" == "--docker" ]]; then
  if command -v docker >/dev/null 2>&1; then
    echo "Starting Docker services (PostgreSQL, Neo4j, Redis, Qdrant)..."
    docker compose up -d
  else
    echo "Warning: docker CLI not found, continuing with local SQLite/in-memory mode."
  fi
fi

# Ensure migrations & seed data exist before starting
python manage.py migrate --noinput >/dev/null

cleanup() {
  echo ""
  echo "Shutting down SkillBridge AI servers..."
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "Starting Django backend on http://127.0.0.1:8000 ..."
python manage.py runserver 127.0.0.1:8000 &
BACKEND_PID=$!

echo "Starting Vite frontend on http://localhost:5173 ..."
npm --prefix frontend run dev &
FRONTEND_PID=$!

echo ""
echo "SkillBridge AI Demo is running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://127.0.0.1:8000/api/health/"
echo "Press Ctrl+C to stop both servers."
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
