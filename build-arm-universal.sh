#!/bin/bash

# Universal build script - creates one image for both frontend and backend
# Significantly smaller than two separate images

set -e

# Check parameter for full cleanup
CLEAN_ALL=false
if [ "$1" = "--clean-all" ] || [ "$1" = "-c" ]; then
    CLEAN_ALL=true
    echo "⚠️  Full cache cleanup enabled (build will be slower, but cleaner)"
fi

# Detect target architecture
HOST_ARCH=$(uname -m)
if [ "$HOST_ARCH" = "x86_64" ] || [ "$HOST_ARCH" = "amd64" ]; then
    TARGET_ARCH="amd64"
    TARGET_PLATFORM="linux/amd64"
    ARCH_SUFFIX="amd64"
    echo "🧪 Test build on x86_64"
else
    TARGET_ARCH="arm64"
    TARGET_PLATFORM="linux/arm64"
    ARCH_SUFFIX="arm64"
    echo "🚀 Production build for ARM64 (Raspberry Pi)"
fi

echo "💻 Host architecture: $HOST_ARCH"
echo "🎯 Target: $TARGET_PLATFORM"
echo "📦 Universal image (frontend + backend in one)"
echo ""

# Check Podman
if ! podman version >/dev/null 2>&1; then
    echo "❌ Podman is not available"
    exit 1
fi

# Set limits
ulimit -n 65536
ulimit -Hn 65536

# Chunk size in MB (1.8GB = 1843MB for safety)
CHUNK_SIZE_MB=1843

# Function to split tar archive into parts
split_tar() {
    local tar_file="$1"
    local base_name="$2"
    
    if [ ! -f "$tar_file" ]; then
        echo "❌ File $tar_file does not exist"
        return 1
    fi
    
    local file_size_mb=$(du -m "$tar_file" | cut -f1)
    
    echo "📦 Splitting $tar_file (${file_size_mb}MB)..."
    
    if [ "$file_size_mb" -lt "$CHUNK_SIZE_MB" ]; then
        echo "✅ File is smaller than ${CHUNK_SIZE_MB}MB, no need to split"
        return 0
    fi
    
    # Split into parts using split
    split -b "${CHUNK_SIZE_MB}M" -d "$tar_file" "${base_name}.part"
    
    # Rename parts
    local part_num=0
    for part in "${base_name}.part"*; do
        if [ -f "$part" ]; then
            mv "$part" "${base_name}.tar.$(printf "%02d" $part_num)"
            echo "  ✓ Created part: ${base_name}.tar.$(printf "%02d" $part_num)"
            part_num=$((part_num + 1))
        fi
    done
    
    # Remove original tar
    rm -f "$tar_file"
    
    echo "✅ Split into $part_num parts"
}

# Cleanup
if [ "$CLEAN_ALL" = true ]; then
    # Full cleanup - removes all cache for clean build
    echo "🧹 Full cache cleanup (build will be slower)..."
    npm cache clean --force 2>/dev/null || true
    rm -rf ~/.npm/_cacache 2>/dev/null || true
    podman image prune -f 2>/dev/null || true
    podman system prune -f 2>/dev/null || true
else
    # Optimized cleanup - keep build cache for faster build
    # Keep Podman build cache for acceleration - if package.json doesn't change,
    # Podman will use cached layer with npm install, which significantly speeds up build
    echo "🧹 Cleaning only dangling images (build cache remains for faster build)..."
    echo "💡 For full cleanup use: $0 --clean-all"
    # Remove only dangling images (those with <none> tag) - saves space, but doesn't affect build cache
    podman image prune -f 2>/dev/null || true
    # NOT USED: podman system prune - would delete build cache and slow down build
    # NOT USED: npm cache clean - npm cache can speed up package downloads
fi

# Build universal image
echo "🔨 Building Universal image (frontend + backend)..."
echo "💡 Runtime stage already contains only jsdom (backend is bundled, saves ~1.2GB)"
podman build --platform $TARGET_PLATFORM \
    --ulimit nofile=65536:65536 \
    -f Dockerfile.universal \
    -t scratch-universal:latest .

echo "📦 Saving universal image to tar..."
rm -f scratch-universal-${ARCH_SUFFIX}.tar*
podman save -o scratch-universal-${ARCH_SUFFIX}.tar scratch-universal:latest

# Split tar if needed
split_tar "scratch-universal-${ARCH_SUFFIX}.tar" "scratch-universal-${ARCH_SUFFIX}"

# Cleanup
echo "🧹 Cleaning temporary images..."
podman rmi scratch-universal:latest 2>/dev/null || true

echo ""
echo "✅ Done! Created files:"
echo ""
echo "📊 Universal image files:"
ls -lh scratch-universal-${ARCH_SUFFIX}.tar* 2>/dev/null
echo ""
echo "💡 Usage instructions:"
echo ""
echo "  # Reassemble (if split):"
echo "  cat scratch-universal-${ARCH_SUFFIX}.tar.* > scratch-universal-${ARCH_SUFFIX}.tar"
echo ""
echo "  # Load:"
echo "  podman load -i scratch-universal-${ARCH_SUFFIX}.tar"
echo ""
echo "  # Run backend:"
echo "  podman run -d --name scratch-backend -p 3001:3001 -p 3002:3002 \\"
echo "    -e APP_MODE=backend -e PORT=3001 scratch-universal:latest"
echo ""
echo "  # Run frontend:"
echo "  podman run -d --name scratch-frontend -p 8601:8601 \\"
echo "    -e APP_MODE=frontend -e PORT=8601 scratch-universal:latest"




