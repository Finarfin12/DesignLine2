<#
.SYNOPSIS
  DesignFlow — One-Command Setup (PowerShell)
.DESCRIPTION
  Menginstall dependensi, menjalankan database, dan menyiapkan environment.
#>

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "DesignFlow Setup"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║        DesignFlow — Quick Setup          ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Prerequisites ────────────────────────────────────────────

Write-Host "▸ Memeriksa prasyarat..." -ForegroundColor Cyan

$nodeOk = $false
try { $nodeVer = node -v; $nodeOk = $true } catch {}
if (-not $nodeOk) { Write-Host "✗ Node.js tidak ditemukan. Install dari https://nodejs.org" -ForegroundColor Red; exit 1 }

$dockerOk = $false
try { $dockerVer = docker -v; $dockerOk = $true } catch {}
if (-not $dockerOk) { Write-Host "✗ Docker tidak ditemukan. Install dari https://docker.com" -ForegroundColor Red; exit 1 }

Write-Host "✓ Node.js $nodeVer" -ForegroundColor Green
Write-Host "✓ Docker tersedia" -ForegroundColor Green
Write-Host "✓ Prasyarat terpenuhi." -ForegroundColor Green

# ── Environment ──────────────────────────────────────────────

Write-Host "`n▸ Menyiapkan environment..." -ForegroundColor Cyan

if (-not (Test-Path "server\.env")) {
  Copy-Item "server\.env.example" "server\.env"
  Write-Host "⚠ server\.env dibuat dari .env.example — sesuaikan jika perlu." -ForegroundColor Yellow
} else {
  Write-Host "✓ server\.env sudah ada." -ForegroundColor Green
}

# ── Database ─────────────────────────────────────────────────

Write-Host "`n▸ Menjalankan database & Mailpit..." -ForegroundColor Cyan

$dbRunning = $false
try { $dbRunning = (docker ps --format '{{.Names}}' | Select-String -Quiet 'designflow_db') } catch {}

if (-not $dbRunning) {
  docker compose up -d
  Write-Host "✓ Database & Mailpit berjalan." -ForegroundColor Green
} else {
  Write-Host "✓ Database sudah berjalan." -ForegroundColor Green
}

Write-Host "Menunggu PostgreSQL siap..." -NoNewline
for ($i = 0; $i -lt 30; $i++) {
  try {
    $ready = docker exec designflow_db pg_isready -U designflow 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host " siap." -ForegroundColor Green; break }
  } catch {}
  Start-Sleep -Seconds 1
  Write-Host "." -NoNewline
}
if ($i -eq 30) { Write-Host "`n✗ PostgreSQL tidak merespon." -ForegroundColor Red; exit 1 }

# ── Server dependencies ──────────────────────────────────────

Write-Host "`n▸ Menginstall dependensi server..." -ForegroundColor Cyan
Set-Location -LiteralPath "server"
npm install
if (-not $?) { Write-Host "✗ Gagal install dependensi server." -ForegroundColor Red; exit 1 }
Write-Host "✓ Dependensi server terinstall." -ForegroundColor Green

Write-Host "▸ Men-generate Prisma Client & migrasi..." -ForegroundColor Cyan
npx prisma generate
npx prisma migrate dev --name init 2>$null
Write-Host "✓ Prisma siap." -ForegroundColor Green

Set-Location -LiteralPath ".."

# ── Client dependencies ──────────────────────────────────────

Write-Host "`n▸ Menginstall dependensi client..." -ForegroundColor Cyan
Set-Location -LiteralPath "client"
npm install
if (-not $?) { Write-Host "✗ Gagal install dependensi client." -ForegroundColor Red; exit 1 }
Write-Host "✓ Dependensi client terinstall." -ForegroundColor Green

Set-Location -LiteralPath ".."

# ── Done ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║            Setup Selesai!               ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Jalankan aplikasi di 2 terminal terpisah:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 — Backend:" -ForegroundColor Yellow
Write-Host "    cd server; npm run dev"
Write-Host ""
Write-Host "  Terminal 2 — Frontend:" -ForegroundColor Yellow
Write-Host "    cd client; npm run dev"
Write-Host ""
Write-Host "  Buka http://localhost:5173"
Write-Host "  Mailpit UI: http://localhost:8025"
Write-Host ""
