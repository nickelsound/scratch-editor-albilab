# Scratch Editor AlbiLAB

Scratch editor s podporou AlbiLAB zařízení pro Raspberry Pi.

## Rychlý start

```bash
# 1. Klonování repozitáře
git clone <repository-url>
cd scratch-editor-albilab

# 2. Sestavení a spuštění
podman-compose build
podman-compose up -d

# 3. Otevření aplikace
# Scratch GUI: http://localhost:8601
# Backend API: http://localhost:3001
```

## Služby

### Scratch GUI (Port 8601)
- Webové rozhraní Scratch editoru
- Hot reload pro development
- Podpora AlbiLAB extension

### Backend API (Port 3001)
- REST API pro spouštění/zastavování služeb
- WebSocket server (Port 3002) pro real-time komunikaci
- Správa Scratch projektů jako služeb

## API Endpoints

- `GET /api/status` - Stav služby
- `POST /api/start-service-json` - Spuštění služby z JSON dat
- `POST /api/stop-service` - Zastavení služby
- `GET /api/logs` - Logy služby

## Konfigurace

### AlbiLAB IP adresa
Nastavte IP adresu AlbiLAB zařízení v `docker-compose.yml`:

```yaml
environment:
  - ALBILAB_API_URL=http://10.0.0.108  # Změňte na vaši IP
```

### Porty
- **8601**: Scratch GUI
- **3001**: Backend API
- **3002**: WebSocket server

## Development

### Hot reload
Zdrojové soubory jsou automaticky mapovány do kontejnerů pro hot reload.

### Logy
```bash
# Všechny služby
podman-compose logs -f

# Pouze backend
podman-compose logs -f scratch-backend

# Pouze GUI
podman-compose logs -f scratch-gui
```

### Restart služby
```bash
# Restart backend
podman-compose restart scratch-backend

# Restart GUI
podman-compose restart scratch-gui

# Restart vše
podman-compose restart
```

## Troubleshooting

### Problémy s buildem
```bash
# Vyčištění a rebuild
podman-compose down
podman-compose build --no-cache
podman-compose up -d
```

### Problémy s porty
Zkontrolujte, že porty 8601, 3001 a 3002 nejsou obsazené:
```bash
netstat -tulpn | grep -E ':(8601|3001|3002)'
```

### Problémy s AlbiLAB
- Zkontrolujte IP adresu v `docker-compose.yml`
- Ověřte, že AlbiLAB zařízení je dostupné v síti
- Zkontrolujte logy backend služby pro chyby komunikace

## Struktura projektu

```
├── packages/
│   ├── scratch-gui/          # Webové rozhraní
│   ├── scratch-backend/      # Backend API
│   ├── scratch-vm/           # Scratch VM s AlbiLAB extension
│   ├── scratch-render/       # Render engine
│   └── scratch-svg-renderer/ # SVG renderer
├── docker-compose.yml        # Docker konfigurace
├── Dockerfile               # GUI image
└── Dockerfile.backend       # Backend image
```