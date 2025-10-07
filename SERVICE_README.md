# Scratch Editor s AlbiLAB - Spuštění jako služba

Tento projekt rozšiřuje Scratch editor o možnost spouštět projekty jako trvalé služby na Raspberry Pi, podobně jako LEGO SPIKE hub.

## Funkce

- **Tlačítko "Spustit jako službu"** v menu baru
- **Backend server** pro trvalý běh projektů
- **WebSocket komunikace** pro sledování stavu
- **Automatické zastavení** předchozí služby při spuštění nové
- **Komunikace s AlbiLAB hardware** přes API

## Architektura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Scratch GUI   │    │  Backend Server │    │  AlbiLAB Device │
│   (Port 8601)   │◄──►│  (Port 3001)    │◄──►│  (10.0.0.108)   │
│                 │    │  WebSocket 3002 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Spuštění

### 1. Sestavení a spuštění

```bash
# Sestavte celý projekt
npm run build

# Spusťte pomocí Docker Compose
docker-compose up -d
```

### 2. Přístup k aplikaci

- **Scratch Editor**: http://raspberry-pi-ip:8601
- **Backend API**: http://raspberry-pi-ip:3001
- **WebSocket**: ws://raspberry-pi-ip:3002

## Použití

### Spuštění projektu jako služby

1. **Otevřete Scratch Editor** v prohlížeči
2. **Vytvořte nebo načtěte projekt** s AlbiLAB bloky
3. **Klikněte na tlačítko "Spustit jako službu"** v menu baru
4. **Projekt se spustí na pozadí** a poběží trvale

### Stav služby

- **Modré tlačítko**: Služba není spuštěna
- **Oranžové pulzující tlačítko**: Služba běží
- **Kliknutím na běžící tlačítko**: Služba se zastaví

### API Endpointy

#### GET /api/status
Získá aktuální stav služby

```json
{
  "running": true,
  "projectName": "Můj projekt",
  "startTime": "2024-01-01T12:00:00.000Z",
  "uptime": 3600000,
  "logs": [...]
}
```

#### POST /api/start-service-json
Spustí službu z JSON dat

```json
{
  "projectData": {...},
  "projectName": "Název projektu"
}
```

#### POST /api/stop-service
Zastaví aktuální službu

#### GET /api/logs
Získá logy služby

## Konfigurace

### AlbiLAB API URL
Nastavte v `docker-compose.yml`:

```yaml
environment:
  - ALBILAB_API_URL=http://10.0.0.108
```

### Porty
- **8601**: Scratch GUI
- **3001**: Backend HTTP API
- **3002**: WebSocket

## Vývoj

### Lokální vývoj

```bash
# Backend server
cd packages/scratch-backend
npm run dev

# Frontend (v jiném terminálu)
cd packages/scratch-gui
npm start
```

### Struktura souborů

```
packages/
├── scratch-gui/           # Frontend aplikace
│   ├── src/components/menu-bar/
│   │   ├── service-button.jsx
│   │   └── service-icon.svg
│   └── src/containers/
│       └── service-button.jsx
├── scratch-backend/       # Backend server
│   ├── src/
│   │   └── server.js
│   └── package.json
└── scratch-vm/           # Virtual Machine
    └── src/extensions/scratch3_albilab/
```

## Řešení problémů

### Služba se nespustí
1. Zkontrolujte, že backend server běží na portu 3001
2. Zkontrolujte logy: `docker-compose logs scratch-backend`
3. Zkontrolujte připojení k AlbiLAB zařízení

### WebSocket chyby
1. Zkontrolujte, že port 3002 je otevřený
2. Zkontrolujte firewall nastavení

### AlbiLAB komunikace
1. Zkontrolujte IP adresu AlbiLAB zařízení
2. Zkontrolujte síťové připojení
3. Zkontrolujte API endpointy v config.js

## Bezpečnost

- Backend server běží pouze v lokální síti
- Žádné externí API klíče nejsou vystaveny
- WebSocket komunikace je lokální

## Podpora

Pro problémy a dotazy kontaktujte vývojový tým.
