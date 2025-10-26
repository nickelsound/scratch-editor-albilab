#!/bin/bash

# ARM64 build script pro Raspberry Pi
# Spustit přímo na Raspberry Pi

set -e

echo "🚀 ARM64 Build pro Raspberry Pi"
echo "💻 Architektura: $(uname -m)"
echo "🎯 Target: linux/arm64"
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
# Smažeme dangling images (ty s <none> tagem)
podman image prune -f 2>/dev/null || true
# Smažeme nepoužívané images (starší než 1 den)
podman image prune -a --filter "until=24h" -f 2>/dev/null || true
# Smažeme build cache
podman system prune -f 2>/dev/null || true
echo "✅ Podman cache vyčištěna"

echo ""

# Build GUI image (ARM64) přímo do tar archivu
echo "🔨 Sestavuji GUI image pro ARM64..."
podman build --platform linux/arm64 \
    --ulimit nofile=65536:65536 \
    -f Dockerfile.arm \
    -t scratch-gui-temp .

echo "📦 Ukládám GUI image do tar archivu..."
podman save -o scratch-gui-arm64.tar scratch-gui-temp

# Build Backend image (ARM64) přímo do tar archivu
echo "🔨 Sestavuji Backend image pro ARM64..."
podman build --platform linux/arm64 \
    --ulimit nofile=65536:65536 \
    -f Dockerfile.backend.arm \
    -t scratch-backend-temp .

echo "📦 Ukládám Backend image do tar archivu..."
podman save -o scratch-backend-arm64.tar scratch-backend-temp

# Vyčistíme dočasné images
echo "🧹 Čistím dočasné images..."
podman rmi scratch-gui-temp scratch-backend-temp 2>/dev/null || true

# Finální čištění - smažeme všechny nepoužívané images a cache
echo "🧹 Finální čištění Podman cache..."
podman image prune -f 2>/dev/null || true
podman system prune -f 2>/dev/null || true
echo "✅ Finální čištění dokončeno"

echo ""
echo "✅ ARM64 tar archivy byly úspěšně vytvořeny!"

echo ""
echo "✅ Hotovo! Vytvořené soubory:"
echo "  - scratch-gui-arm64.tar"
echo "  - scratch-backend-arm64.tar"
echo ""
echo "📊 Velikosti souborů:"
ls -lh *.tar
echo ""
echo "💾 Úspora místa:"
echo "  - Dangling images smazány"
echo "  - Build cache vyčištěna"
echo "  - Staré images odstraněny"
echo ""
echo "🚀 Images jsou připraveny pro nasazení na Raspberry Pi"