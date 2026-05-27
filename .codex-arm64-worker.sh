set -Eeuo pipefail
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"
echo "$LOG_PREFIX Starting ARM64 tar.gz build"
AMD_ID=$(podman image inspect scratch-universal:latest --format '{{.ID}}')
echo "Current local latest: ${AMD_ID}"
restore_latest() {
    podman tag "$AMD_ID" scratch-universal:latest >/dev/null 2>&1 || true
}
trap restore_latest EXIT
rm -f scratch-universal-arm64.tar scratch-universal-arm64.tar.gz scratch-universal-arm64.tar.gz.sha256
podman build --platform linux/arm64 --ulimit nofile=65536:65536 -f Dockerfile.universal -t scratch-universal:arm64-export .
podman image inspect scratch-universal:arm64-export --format 'Built ARM image: {{.ID}} {{.Architecture}}/{{.Os}}'
podman tag scratch-universal:arm64-export scratch-universal:latest
podman save scratch-universal:latest | gzip -c > scratch-universal-arm64.tar.gz
sha256sum scratch-universal-arm64.tar.gz > scratch-universal-arm64.tar.gz.sha256
restore_latest
trap - EXIT
podman image inspect scratch-universal:latest --format 'Restored local latest: {{.ID}} {{.Architecture}}/{{.Os}}'
ls -lh scratch-universal-arm64.tar.gz scratch-universal-arm64.tar.gz.sha256
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ARM64 tar.gz build complete"