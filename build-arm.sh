#!/bin/bash

# Script pro build na Raspberry Pi s opravenými limity
# Spustit přímo na Raspberry Pi

set -e

echo "🚀 Build pro Raspberry Pi s opravenými limity"
echo "💻 Build na: $(uname -m) systému"
echo "🎯 Target: ARM64 (Raspberry Pi 3 64bit)"
echo ""

# Zkontrolujeme, jestli máme Podman
echo "🔧 Kontroluji Podman..."
if ! podman version >/dev/null 2>&1; then
    echo "❌ Podman není dostupný"
    exit 1
fi

echo "✅ Podman je dostupný"

# Opravíme limity pro build
echo "🔧 Opravuji limity otevřených souborů..."
ulimit -n 65536
ulimit -Hn 65536
echo "✅ Limity nastaveny: $(ulimit -n)"

echo ""

# Build GUI image (nativní ARM64)
echo "🔨 Sestavuji GUI image (může trvat 30-60 minut)..."
podman build -f Dockerfile -t scratch-gui .

# Build Backend image (nativní ARM64)
echo "🔨 Sestavuji Backend image (může trvat 20-40 minut)..."
podman build -f Dockerfile.backend -t scratch-backend .

echo ""
echo "✅ ARM64 images byly úspěšně sestaveny!"

# Ověříme architekturu images
echo "🔍 Ověřuji architekturu images..."
echo "GUI image architektura:"
podman inspect scratch-gui | grep -i arch
echo "Backend image architektura:"
podman inspect scratch-backend | grep -i arch
echo ""

# Uložíme images do tar archivů
echo "💾 Ukládám images do tar archivů..."

# Uložíme GUI image
echo "📦 Ukládám GUI image..."
podman save -o scratch-gui-arm64.tar scratch-gui

# Uložíme Backend image
echo "📦 Ukládám Backend image..."
podman save -o scratch-backend-arm64.tar scratch-backend

echo ""
echo "✅ Hotovo! Vytvořené tar soubory:"
echo "  - scratch-gui-arm64.tar"
echo "  - scratch-backend-arm64.tar"
echo ""
echo "📊 Velikosti souborů:"
ls -lh *.tar
echo ""
echo "🚀 Nyní můžete přenést tar soubory na Raspberry Pi"
