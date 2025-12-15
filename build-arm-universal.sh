#!/bin/bash

# Universal build script - vytvoří jeden image pro frontend i backend
# Výrazně menší než dva samostatné images

set -e

# Kontrola parametru pro úplné čištění
CLEAN_ALL=false
if [ "$1" = "--clean-all" ] || [ "$1" = "-c" ]; then
    CLEAN_ALL=true
    echo "⚠️  Úplné čištění cache zapnuto (build bude pomalejší, ale čistší)"
fi

# Detekce cílové architektury
HOST_ARCH=$(uname -m)
if [ "$HOST_ARCH" = "x86_64" ] || [ "$HOST_ARCH" = "amd64" ]; then
    TARGET_ARCH="amd64"
    TARGET_PLATFORM="linux/amd64"
    ARCH_SUFFIX="amd64"
    echo "🧪 Test build na x86_64"
else
    TARGET_ARCH="arm64"
    TARGET_PLATFORM="linux/arm64"
    ARCH_SUFFIX="arm64"
    echo "🚀 Produkční build pro ARM64 (Raspberry Pi)"
fi

echo "💻 Host architektura: $HOST_ARCH"
echo "🎯 Target: $TARGET_PLATFORM"
echo "📦 Universal image (frontend + backend v jednom)"
echo ""

# Kontrola Podman
if ! podman version >/dev/null 2>&1; then
    echo "❌ Podman není dostupný"
    exit 1
fi

# Nastavení limitů
ulimit -n 65536
ulimit -Hn 65536

# Velikost chunku v MB (1.8GB = 1843MB pro bezpečnost)
CHUNK_SIZE_MB=1843

# Funkce pro rozdělení tar archivu na části
split_tar() {
    local tar_file="$1"
    local base_name="$2"
    
    if [ ! -f "$tar_file" ]; then
        echo "❌ Soubor $tar_file neexistuje"
        return 1
    fi
    
    local file_size_mb=$(du -m "$tar_file" | cut -f1)
    
    echo "📦 Rozděluji $tar_file (${file_size_mb}MB)..."
    
    if [ "$file_size_mb" -lt "$CHUNK_SIZE_MB" ]; then
        echo "✅ Soubor je menší než ${CHUNK_SIZE_MB}MB, není potřeba rozdělovat"
        return 0
    fi
    
    # Rozdělíme na části pomocí split
    split -b "${CHUNK_SIZE_MB}M" -d "$tar_file" "${base_name}.part"
    
    # Přejmenujeme části
    local part_num=0
    for part in "${base_name}.part"*; do
        if [ -f "$part" ]; then
            mv "$part" "${base_name}.tar.$(printf "%02d" $part_num)"
            echo "  ✓ Vytvořena část: ${base_name}.tar.$(printf "%02d" $part_num)"
            part_num=$((part_num + 1))
        fi
    done
    
    # Smažeme původní tar
    rm -f "$tar_file"
    
    echo "✅ Rozděleno na $part_num částí"
}

# Vyčištění
if [ "$CLEAN_ALL" = true ]; then
    # Úplné čištění - smaže všechny cache pro čistý build
    echo "🧹 Úplné čištění cache (build bude pomalejší)..."
    npm cache clean --force 2>/dev/null || true
    rm -rf ~/.npm/_cacache 2>/dev/null || true
    podman image prune -f 2>/dev/null || true
    podman system prune -f 2>/dev/null || true
else
    # Optimalizované čištění - ponecháváme build cache pro rychlejší build
    # Ponecháváme Podman build cache pro urychlení - pokud se nezmění package.json,
    # Podman použije cached vrstvu s npm install, což výrazně urychlí build
    echo "🧹 Čistím pouze dangling images (build cache zůstává pro rychlejší build)..."
    echo "💡 Pro úplné čištění použijte: $0 --clean-all"
    # Smažeme pouze dangling images (ty s <none> tagem) - ušetří místo, ale neovlivní build cache
    podman image prune -f 2>/dev/null || true
    # NEPOUŽÍVÁME: podman system prune - to by smazalo build cache a zpomalilo build
    # NEPOUŽÍVÁME: npm cache clean - npm cache může urychlit stahování balíčků
fi

# Build universal image
echo "🔨 Sestavuji Universal image (frontend + backend)..."
podman build --platform $TARGET_PLATFORM \
    --ulimit nofile=65536:65536 \
    -f Dockerfile.universal \
    -t scratch-universal:latest .

# Optimalizace: odstraníme zbytečné balíčky z node_modules (ušetří ~1.2GB)
echo "🧹 Odstraňuji zbytečné balíčky z node_modules (backend je zabundlovaný, ušetří ~1.2GB)..."
CONTAINER_NAME="scratch-cleanup-$$"
podman run --name "$CONTAINER_NAME" scratch-universal:latest sh -c "
    # Ponecháme pouze jsdom (potřebné pro runtime, @scratch/scratch-vm je zabundlovaný)
    # Nejjednodušší způsob: odstraníme všechny balíčky a pak nainstalujeme pouze jsdom
    if [ -d /app/node_modules ]; then
        # Zkopírujeme package.json pro reinstalaci
        cp /app/package.json /tmp/package.json.bak 2>/dev/null || true
        # Odstraníme všechny node_modules
        rm -rf /app/node_modules
        # Nainstalujeme pouze jsdom (a jeho dependencies se nainstalují automaticky)
        cd /app && \
        npm install jsdom --save --ignore-scripts --no-audit --no-fund 2>/dev/null || true && \
        npm cache clean --force 2>/dev/null || true && \
        echo '✅ Zbytečné balíčky odstraněny, ponechán pouze jsdom a jeho dependencies'
    else
        echo '⚠️  node_modules již neexistuje'
    fi
" || true

# Vytvoříme nový image z vyčištěného kontejneru
echo "💾 Vytvářím optimalizovaný image..."
podman commit "$CONTAINER_NAME" scratch-universal:latest
podman rm "$CONTAINER_NAME" 2>/dev/null || true

echo "📦 Ukládám optimalizovaný universal image do tar..."
rm -f scratch-universal-${ARCH_SUFFIX}.tar*
podman save -o scratch-universal-${ARCH_SUFFIX}.tar scratch-universal:latest

# Rozdělíme tar pokud je potřeba
split_tar "scratch-universal-${ARCH_SUFFIX}.tar" "scratch-universal-${ARCH_SUFFIX}"

# Cleanup
echo "🧹 Čistím dočasné images..."
podman rmi scratch-universal:latest 2>/dev/null || true

echo ""
echo "✅ Hotovo! Vytvořené soubory:"
echo ""
echo "📊 Universal image soubory:"
ls -lh scratch-universal-${ARCH_SUFFIX}.tar* 2>/dev/null
echo ""
echo "💡 Instrukce pro použití:"
echo ""
echo "  # Sestavení (pokud byl rozdělen):"
echo "  cat scratch-universal-${ARCH_SUFFIX}.tar.* > scratch-universal-${ARCH_SUFFIX}.tar"
echo ""
echo "  # Načtení:"
echo "  podman load -i scratch-universal-${ARCH_SUFFIX}.tar"
echo ""
echo "  # Spuštění backend:"
echo "  podman run -d --name scratch-backend -p 3001:3001 -p 3002:3002 \\"
echo "    -e APP_MODE=backend -e PORT=3001 scratch-universal:latest"
echo ""
echo "  # Spuštění frontend:"
echo "  podman run -d --name scratch-frontend -p 8601:8601 \\"
echo "    -e APP_MODE=frontend -e PORT=8601 scratch-universal:latest"




