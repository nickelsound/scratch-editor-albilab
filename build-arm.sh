#!/bin/bash

# Script pro cross-compilation ARM build na x86_64 systému
# Spustit na výkonnějším systému (x86_64) - build pro Raspberry Pi

set -e

echo "🚀 Cross-compilation ARM build pro Raspberry Pi"
echo "💻 Build na: $(uname -m) systému"
echo "🎯 Target: ARM64 (Raspberry Pi 3 64bit)"
echo ""

# Zkontrolujeme, jestli máme buildx
echo "🔧 Kontroluji buildx podporu..."
if ! podman buildx version >/dev/null 2>&1; then
    echo "❌ buildx není dostupný"
    echo "💡 Nainstalujte buildx nebo použijte Docker místo Podman"
    exit 1
fi

echo "✅ buildx je dostupný"
echo ""

# Build GUI image pro ARM64 (Raspberry Pi)
echo "🔨 Sestavuji GUI image pro ARM64 (může trvat 10-20 minut)..."
podman buildx build --platform linux/arm64 \
    -f Dockerfile \
    -t scratch-gui \
    --load .

# Build Backend image pro ARM64 (Raspberry Pi)
echo "🔨 Sestavuji Backend image pro ARM64 (může trvat 10-20 minut)..."
podman buildx build --platform linux/arm64 \
    -f Dockerfile.backend \
    -t scratch-backend \
    --load .

echo ""
echo "✅ ARM64 images byly úspěšně sestaveny!"
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
