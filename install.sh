#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# DesignFlow — One-Command Setup
# ─────────────────────────────────────────────────────────────
# Usage: chmod +x install.sh && ./install.sh
# ─────────────────────────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
step() { echo -e "\n${CYAN}▸${NC} ${BOLD}$1${NC}"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║        DesignFlow — Quick Setup          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Prerequisites ────────────────────────────────────────────

step "Memeriksa prasyarat..."

command -v node >/dev/null 2>&1 || fail "Node.js tidak ditemukan. Install dari https://nodejs.org"
command -v docker >/dev/null 2>&1 || fail "Docker tidak ditemukan. Install dari https://docker.com"
command -v docker compose >/dev/null 2>&1 || fail "Docker Compose tidak ditemukan."

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 18 ] || fail "Minimal Node.js 18 (terinstall: $(node -v))"

log "Node.js $(node -v), Docker $(docker -v)"
log "Prasyarat terpenuhi."

# ── Environment ──────────────────────────────────────────────

step "Menyiapkan environment..."

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  warn "server/.env dibuat dari .env.example — sesuaikan jika perlu."
else
  log "server/.env sudah ada."
fi

# ── Database ─────────────────────────────────────────────────

step "Menjalankan database & Mailpit..."

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'designflow_db'; then
  log "Database sudah berjalan."
else
  docker compose up -d
  log "Database & Mailpit berjalan."
fi

log "Menunggu PostgreSQL siap..."
for i in $(seq 1 30); do
  if docker exec designflow_db pg_isready -U designflow >/dev/null 2>&1; then
    log "PostgreSQL siap."
    break
  fi
  [ "$i" -eq 30 ] && fail "PostgreSQL tidak merespon dalam 30 detik."
  sleep 1
done

# ── Server dependencies ──────────────────────────────────────

step "Menginstall dependensi server..."
cd server
npm install
log "Dependensi server terinstall."

step "Men-generate Prisma Client & migrasi..."
npx prisma generate
if ! npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
  npx prisma migrate dev --name init
  log "Migrasi database selesai."
else
  log "Database sudah up-to-date."
fi
cd ..

# ── Client dependencies ──────────────────────────────────────

step "Menginstall dependensi client..."
cd client
npm install
log "Dependensi client terinstall."
cd ..

# ── Done ─────────────────────────────────────────────────────

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║            Setup Selesai! 🎉             ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Jalankan aplikasi di 3 terminal terpisah:"
echo ""
echo "  Terminal 1 — Backend:"
echo "    cd server && npm run dev"
echo ""
echo "  Terminal 2 — Frontend:"
echo "    cd client && npm run dev"
echo ""
echo "  Buka http://localhost:5173"
echo "  Mailpit UI: http://localhost:8025"
echo ""

# vim: ts=2 sw=2 et
