FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg && \
    curl -fsSL https://archive.raspberrypi.com/debian/raspberrypi.gpg.key | gpg --dearmor -o /usr/share/keyrings/raspberrypi-archive-keyring.gpg && \
    echo 'deb [signed-by=/usr/share/keyrings/raspberrypi-archive-keyring.gpg] https://archive.raspberrypi.com/debian/ bookworm main' > /etc/apt/sources.list.d/raspberrypi.list && \
    apt-get update && apt-get install -y --no-install-recommends rpicam-apps && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.js ./

ENV PORT=8088
ENV CAMERA_WIDTH=1280
ENV CAMERA_HEIGHT=720
ENV CAMERA_TIMEOUT_MS=10000

EXPOSE 8088
CMD ["node", "server.js"]
