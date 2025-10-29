#!/bin/bash

# Split ARM64 build script pro Raspberry Pi
# Vytvoří několik tar archivů pod 2GB pro snadný přenos

set -e

echo "🚀 Split ARM64 Build pro Raspberry Pi"
echo "💻 Architektura: $(uname -m)"
echo "🎯 Target: linux/arm64"
echo "📦 Rozdělené tar archivy pod 2GB"
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

# Kontrola existujících tar archivů
echo "🔍 Kontroluji existující tar archivy..."
if [ -f "scratch-base-split-arm64.tar" ]; then
    echo "⚠️  scratch-base-split-arm64.tar už existuje - přeskočím base build"
    SKIP_BASE=true
else
    echo "✅ Base tar neexistuje - budu buildit"
    SKIP_BASE=false
fi

if [ -f "scratch-backend-split-arm64.tar" ]; then
    echo "⚠️  scratch-backend-split-arm64.tar už existuje - přeskočím backend build"
    SKIP_BACKEND=true
else
    echo "✅ Backend tar neexistuje - budu buildit"
    SKIP_BACKEND=false
fi

if [ -f "scratch-frontend-split-arm64.tar" ]; then
    echo "⚠️  scratch-frontend-split-arm64.tar už existuje - přeskočím frontend build"
    SKIP_FRONTEND=true
else
    echo "✅ Frontend tar neexistuje - budu buildit"
    SKIP_FRONTEND=false
fi

echo ""

# Stage 1: Build base image s všemi závislostmi
if [ "$SKIP_BASE" = "false" ]; then
    echo "🔨 Sestavuji base image (závislosti + build tools)..."
    podman build --platform linux/arm64 \
        --ulimit nofile=65536:65536 \
        -f Dockerfile.base.split.arm \
        -t scratch-base-split:latest .

    echo "📦 Ukládám base image do tar archivu..."
    podman save -o scratch-base-split-arm64.tar scratch-base-split:latest
else
    echo "📦 Načítám existující base image..."
    podman load -i scratch-base-split-arm64.tar
fi

# Stage 2: Build všech balíčků pomocí base image
echo "🔨 Sestavuji všechny balíčky pomocí base image..."

# Vytvoříme dočasný Dockerfile pro build
cat > Dockerfile.build.temp << EOF
FROM scratch-base-split:latest AS builder

WORKDIR /app

# Zkopírujeme všechny zdrojové soubory
COPY packages/ ./packages/

# Sestavíme všechny balíčky
RUN npm run build --workspace=packages/scratch-svg-renderer
RUN npm run build --workspace=packages/scratch-render
RUN npm run build --workspace=packages/scratch-vm
RUN npm run build --workspace=packages/scratch-gui
EOF

podman build --platform linux/arm64 \
    --ulimit nofile=65536:65536 \
    -f Dockerfile.build.temp \
    -t scratch-build-temp:latest .

# Zkopírujeme build výstup z kontejneru
echo "📦 Kopíruji build výstupy..."
mkdir -p frontend-build
podman create --name temp-container scratch-build-temp:latest
podman cp temp-container:/app/packages/scratch-gui/build ./frontend-build/
podman rm temp-container

# Stage 3: Build backend aplikace
if [ "$SKIP_BACKEND" = "false" ]; then
    echo "🔨 Sestavuji backend aplikaci..."
    podman build --platform linux/arm64 \
        --ulimit nofile=65536:65536 \
        -f Dockerfile.backend.split.arm \
        -t scratch-backend-split:latest .

    echo "📦 Ukládám backend aplikaci do tar archivu..."
    podman save -o scratch-backend-split-arm64.tar scratch-backend-split:latest
else
    echo "📦 Načítám existující backend aplikaci..."
    podman load -i scratch-backend-split-arm64.tar
fi

# Stage 4: Build frontend aplikace s build výstupem
if [ "$SKIP_FRONTEND" = "false" ]; then
    echo "🔨 Sestavuji frontend aplikaci s build výstupem..."
    # Vytvoříme dočasný Dockerfile s build výstupem
    cat > Dockerfile.frontend.temp << EOF
FROM scratch-base-split:latest AS frontend-app

WORKDIR /app

# Zkopírujeme build výstup
COPY frontend-build/ ./build/

# Exponujeme port
EXPOSE 8601

# Nastavíme environment proměnné
ENV NODE_ENV=production
ENV PORT=8601

# Spustíme frontend server
CMD ["serve", "-s", "build", "-l", "8601"]
EOF

    podman build --platform linux/arm64 \
        --ulimit nofile=65536:65536 \
        -f Dockerfile.frontend.temp \
        -t scratch-frontend-split:latest .

    echo "📦 Ukládám frontend aplikaci do tar archivu..."
    podman save -o scratch-frontend-split-arm64.tar scratch-frontend-split:latest
else
    echo "📦 Načítám existující frontend aplikaci..."
    podman load -i scratch-frontend-split-arm64.tar
fi

# Vyčistíme dočasné soubory
echo "🧹 Čistím dočasné soubory..."
rm -f Dockerfile.frontend.temp Dockerfile.build.temp
rm -rf frontend-build/

# Vyčistíme pouze dočasné images (ne ty načtené z tar archivů)
if [ "$SKIP_BASE" = "false" ]; then
    podman rmi scratch-base-split:latest 2>/dev/null || true
fi
if [ "$SKIP_BACKEND" = "false" ]; then
    podman rmi scratch-backend-split:latest 2>/dev/null || true
fi
if [ "$SKIP_FRONTEND" = "false" ]; then
    podman rmi scratch-frontend-split:latest 2>/dev/null || true
fi
podman rmi scratch-build-temp:latest 2>/dev/null || true

# Finální čištění
echo "🧹 Finální čištění Podman cache..."
podman image prune -f 2>/dev/null || true
podman system prune -f 2>/dev/null || true
echo "✅ Finální čištění dokončeno"

echo ""
echo "✅ Split ARM64 tar archivy byly úspěšně vytvořeny!"

echo ""
echo "✅ Hotovo! Vytvořené soubory:"
echo "  - scratch-base-split-arm64.tar     (závislosti + build tools)"
echo "  - scratch-backend-split-arm64.tar  (backend aplikace)"
echo "  - scratch-frontend-split-arm64.tar (frontend aplikace)"
echo ""
echo "📊 Velikosti souborů:"
ls -lh *-split-arm64.tar
echo ""
echo "💾 Split approach výhody:"
echo "  - Každý tar archiv pod 2GB"
echo "  - Snadný přenos po částech"
echo "  - Base image obsahuje všechny závislosti"
echo "  - Backend/Frontend jsou malé aplikace"
echo ""
echo "🚀 Nasazení:"
echo "  1. Načtěte base: podman load -i scratch-base-split-arm64.tar"
echo "  2. Načtěte backend: podman load -i scratch-backend-split-arm64.tar"
echo "  3. Načtěte frontend: podman load -i scratch-frontend-split-arm64.tar"
echo "  4. Spusťte kontejnery podle potřeby"
