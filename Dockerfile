# Multi-platform build - automaticky se rozhodne podle architektury
# Podporuje x86_64 (amd64) i ARM64 (arm64) pro Raspberry Pi
FROM --platform=$BUILDPLATFORM docker.io/library/node:22-alpine

# Pro ARM64 nastavíme systemové limity
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        echo "* soft nofile 65536" >> /etc/security/limits.conf && \
        echo "* hard nofile 65536" >> /etc/security/limits.conf; \
    fi

# Nastavíme pracovní adresář
WORKDIR /app

# Zkopírujeme package.json a package-lock.json pro lepší cache vrstvy
COPY package*.json ./
COPY packages/scratch-gui/package*.json ./packages/scratch-gui/
COPY packages/scratch-vm/package*.json ./packages/scratch-vm/
COPY packages/scratch-render/package*.json ./packages/scratch-render/
COPY packages/scratch-svg-renderer/package*.json ./packages/scratch-svg-renderer/

# Zkopírujeme scripts adresář pro prepare script
COPY packages/scratch-gui/scripts ./packages/scratch-gui/scripts/

# Nainstalujeme závislosti v root (monorepo)
# Podmíněné optimalizace pro RPi (pouze pokud je TARGETPLATFORM arm64):
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        npm install -g yarn && \
        yarn config set network-timeout 300000 && \
        yarn config set network-concurrency 1 && \
        yarn install --ignore-scripts --no-audit --no-fund; \
    else \
        npm install --ignore-scripts; \
    fi

# Zkopírujeme pouze potřebné zdrojové soubory pro GUI
COPY packages/scratch-gui/ ./packages/scratch-gui/
COPY packages/scratch-vm/ ./packages/scratch-vm/
COPY packages/scratch-render/ ./packages/scratch-render/
COPY packages/scratch-svg-renderer/ ./packages/scratch-svg-renderer/
COPY scripts/ ./scripts/

# Spustíme prepare script pro scratch-gui (stáhne microbit hex soubor)
RUN npm run prepare --workspace=packages/scratch-gui

# Sestavíme závislé balíčky v správném pořadí
# Nejdříve scratch-svg-renderer a scratch-render (závislosti pro scratch-vm)
RUN npm run build --workspace=packages/scratch-svg-renderer
RUN npm run build --workspace=packages/scratch-render

# Poté scratch-vm (závisí na výše uvedených balíčcích)
RUN npm run build --workspace=packages/scratch-vm

# Pro produkční režim sestavíme scratch-gui
RUN npm run build --workspace=packages/scratch-gui

# Exponujeme port 8601
EXPOSE 8601

# Nastavíme environment proměnné pro produkční režim
ENV NODE_ENV=production
ENV PORT=8601

# Pro produkční režim použijeme statický server místo webpack dev server
# Nainstalujeme serve pro statické soubory
RUN npm install -g serve

# Spustíme statický server pro produkční build
CMD ["serve", "-s", "packages/scratch-gui/build", "-l", "8601"]
