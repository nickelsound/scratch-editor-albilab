#!/bin/bash

# Layered ARM64 build script pro Raspberry Pi
# Vytvoří společnou base image a pak nástavby pro backend/frontend

set -e

echo "🚀 Layered ARM64 Build pro Raspberry Pi"
echo "💻 Architektura: $(uname -m)"
echo "🎯 Target: linux/arm64"
echo "📦 Layered approach: Base + Backend/Frontend nástavby"
echo ""

# Kontrola Podman
echo "🔧 Kontroluji Podman..."
if ! podman version >/dev/null 2>&1; then
    echo "❌ Podman není dostupný"
    exit 1
fi
echo "✅ Podman je dostupný"

# Nastavení limitů pro ARM build
echo "🔧 Nastavuji limity pro ARM build..."
ulimit -n 65536
ulimit -Hn 65536
echo "✅ Limity nastaveny: $(ulimit -n)"

# Vyčištění cache a starých images
echo "🧹 Čistím npm cache..."
npm cache clean --force 2>/dev/null || true
rm -rf ~/.npm/_cacache 2>/dev/null || true
echo "✅ NPM cache vyčištěna"

echo "🧹 Čistím staré Podman images..."
podman image prune -f 2>/dev/null || true
podman image prune -a --filter "until=24h" -f 2>/dev/null || true
podman system prune -f 2>/dev/null || true
echo "✅ Podman cache vyčištěna"

echo ""

# Stage 1: Build společné base image
echo "🔨 Sestavuji společnou base image (všechny závislosti + build)..."
podman build --platform linux/arm64 \
    --ulimit nofile=65536:65536 \
    -f Dockerfile.base.arm \
    -t scratch-base-arm:latest .

echo "📦 Ukládám base image do tar archivu..."
podman save -o scratch-base-arm64.tar scratch-base-arm:latest

# Stage 2: Build backend nástavbu
echo "🔨 Sestavuji backend nástavbu nad base image..."
podman build --platform linux/arm64 \
    --ulimit nofile=65536:65536 \
    -f Dockerfile.backend.layer.arm \
    -t scratch-backend-temp .

echo "📦 Ukládám backend image do tar archivu..."
podman save -o scratch-backend-arm64.tar scratch-backend-temp

# Stage 3: Build frontend nástavbu
echo "🔨 Sestavuji frontend nástavbu nad base image..."
podman build --platform linux/arm64 \
    --ulimit nofile=65536:65536 \
    -f Dockerfile.frontend.layer.arm \
    -t scratch-frontend-temp .

echo "📦 Ukládám frontend image do tar archivu..."
podman save -o scratch-frontend-arm64.tar scratch-frontend-temp

# Vyčistíme dočasné images
echo "🧹 Čistím dočasné images..."
podman rmi scratch-backend-temp scratch-frontend-temp 2>/dev/null || true

# Finální čištění
echo "🧹 Finální čištění Podman cache..."
podman image prune -f 2>/dev/null || true
podman system prune -f 2>/dev/null || true
echo "✅ Finální čištění dokončeno"

echo ""
echo "✅ Layered ARM64 tar archivy byly úspěšně vytvořeny!"

echo ""
echo "✅ Hotovo! Vytvořené soubory:"
echo "  - scratch-base-arm64.tar      (společná base image)"
echo "  - scratch-backend-arm64.tar   (backend nástavba)"
echo "  - scratch-frontend-arm64.tar  (frontend nástavba)"
echo ""
echo "📊 Velikosti souborů:"
ls -lh *.tar
echo ""
echo "💾 Layered approach výhody:"
echo "  - Společná base image obsahuje všechny závislosti"
echo "  - Backend/Frontend nástavby jsou malé (~50-100MB)"
echo "  - Při nasazení se načte base + jedna nástavba"
echo "  - Úspora místa při společném nasazení"
echo ""
echo "🚀 Images jsou připraveny pro nasazení na Raspberry Pi"
echo ""
echo "📋 Nasazení:"
echo "  1. Načtěte base image: podman load -i scratch-base-arm64.tar"
echo "  2. Načtěte backend: podman load -i scratch-backend-arm64.tar"
echo "  3. Načtěte frontend: podman load -i scratch-frontend-arm64.tar"
echo "  4. Spusťte kontejnery podle potřeby"
