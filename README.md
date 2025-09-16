# Scratch Editor AlbiLAB

Modifikovaný Scratch editor s integrací do AlbiLAB ekosystému. Tento projekt poskytuje webové rozhraní pro vytváření a spouštění Scratch projektů s možností jejich ukládání a načítání.

## 🚀 Rychlý start

### Předpoklady

- **Docker** nebo **Podman** nainstalovaný v systému
- **Docker Compose** nebo **Podman Compose** nainstalovaný
- Minimálně 2GB volného místa na disku
- Porty 3000 a 3001 dostupné v systému

### Spuštění

1. **Naklonujte repository:**
   ```bash
   git clone <repository-url>
   cd scratch-editor-albilab
   ```

2. **Spusťte aplikaci:**
   
   **S Docker Compose:**
   ```bash
   docker-compose up --build
   ```
   
   **S Podman Compose:**
   ```bash
   podman-compose up --build
   ```

3. **Otevřete aplikaci v prohlížeči:**
   - Scratch Editor: http://localhost:3000
   - Backend API: http://localhost:3001

## 📋 Funkce

### Základní funkce
- **Scratch Editor**: Plnohodnotný webový editor Scratch projektů
- **Ukládání projektů**: Projekty se automaticky ukládají do AlbiLAB
- **Načítání projektů**: Možnost načíst dříve uložené projekty
- **Průběžné ukládání**: Automatické ukládání změn každých 30 sekund

### Modifikované menu
- **Skryté tlačítka**: Share/Shared, Remix, See Project Page
- **Skryté sekce**: My Stuff, Scratch Cat
- **Nové tlačítka**:
  - "Nahrát do AlbiLAB" - nahrání a spuštění projektu
  - "Načíst z AlbiLAB" - načtení uloženého projektu
  - Indikátor průběžného ukládání

## 🏗️ Architektura

### Služby

1. **scratch-gui-app** (Port 3000)
   - React frontend aplikace
   - Scratch editor interface
   - WebSocket připojení k backendu

2. **scratch-backend-app** (Port 3001)
   - Node.js/Express backend server
   - REST API pro správu projektů
   - WebSocket server pro real-time komunikaci
   - Automatické spouštění uložených projektů

### Datové svazky (Volumes)

- **scratch-uploads**: Trvalé uložení projektů a konfigurace
  - `saved-project.json` - aktuálně uložený projekt
  - `uploads/` - složka pro nahrávané soubory

## 🔧 Konfigurace

### Environment proměnné

**scratch-gui-app:**
```yaml
REACT_APP_BACKEND_URL: http://localhost:3001
```

**scratch-backend-app:**
```yaml
PORT: 3001
WEBSOCKET_PORT: 3002
```

### Porty

- **3000**: Frontend aplikace (Scratch Editor)
- **3001**: Backend API
- **3002**: WebSocket server (interní komunikace)

## 📡 API Endpoints

### Projekty
- `POST /api/start` - Spuštění nového projektu
- `POST /api/stop` - Zastavení běžícího projektu
- `GET /api/status` - Stav služby
- `GET /api/logs` - Logy služby

### Uložené projekty
- `GET /api/saved-project` - Informace o uloženém projektu
- `GET /api/saved-project/load` - Načtení dat projektu
- `POST /api/saved-project/auto-save` - Automatické uložení
- `DELETE /api/saved-project` - Smazání uloženého projektu

## 🛠️ Vývoj

### Lokální vývoj

1. **Nainstalujte závislosti:**
   ```bash
   # Frontend
   cd packages/scratch-gui
   npm install
   
   # Backend
   cd packages/scratch-backend
   npm install
   ```

2. **Spusťte v development módu:**
   ```bash
   # Frontend (port 3000)
   cd packages/scratch-gui
   npm start
   
   # Backend (port 3001)
   cd packages/scratch-backend
   npm run dev
   ```

### Rebuild kontejnerů

```bash
# Docker Compose
docker-compose down
docker-compose up --build

# Podman Compose
podman-compose down
podman-compose up --build
```

## 📁 Struktura projektu

```
scratch-editor-albilab/
├── packages/
│   ├── scratch-gui/                 # Frontend aplikace
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── menu-bar/        # Modifikované menu komponenty
│   │   │   ├── containers/          # Redux kontejnery
│   │   │   └── lib/                 # Utility funkce
│   │   └── Dockerfile
│   └── scratch-backend/             # Backend aplikace
│       ├── src/
│       │   ├── server.js            # Hlavní server
│       │   └── startup.js           # Startup skripty
│       └── Dockerfile.backend
├── docker-compose.yml               # Orchestrace služeb
└── README.md
```

## 🔍 Troubleshooting

### Časté problémy

1. **Porty jsou obsazené:**
   ```bash
   # Zkontrolujte obsazené porty
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :3001
   
   # Zastavte konflikující služby nebo změňte porty v docker-compose.yml
   ```

2. **Kontejnery se nespustí:**
   ```bash
   # Zkontrolujte logy
   docker-compose logs
   # nebo
   podman-compose logs
   
   # Zkuste rebuild
   docker-compose up --build --force-recreate
   ```

3. **Projekty se neukládají:**
   ```bash
   # Zkontrolujte volume mounty
   docker volume ls
   
   # Zkontrolujte oprávnění složky uploads
   ls -la uploads/
   ```

4. **WebSocket připojení selhává:**
   - Zkontrolujte, že backend běží na portu 3001
   - Ověřte firewall nastavení
   - Zkontrolujte logy backendu pro chyby

### Logy

```bash
# Všechny služby
docker-compose logs -f

# Konkrétní služba
docker-compose logs -f scratch-gui-app
docker-compose logs -f scratch-backend-app

# Posledních 50 řádků
docker-compose logs --tail=50
```

## 🔄 Aktualizace

### Aktualizace kódu

1. **Zastavte služby:**
   ```bash
   docker-compose down
   ```

2. **Aktualizujte kód:**
   ```bash
   git pull origin main
   ```

3. **Restartujte s rebuild:**
   ```bash
   docker-compose up --build
   ```

### Zálohování dat

```bash
# Zálohování uploads složky
docker run --rm -v scratch-editor-albilab_scratch-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# Obnovení zálohy
docker run --rm -v scratch-editor-albilab_scratch-uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

## 🚀 Produkční nasazení

### Doporučené nastavení

1. **Reverse Proxy** (nginx/Apache):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **SSL certifikát** (Let's Encrypt):
   ```bash
   certbot --nginx -d your-domain.com
   ```

3. **Automatický restart** (systemd):
   ```ini
   [Unit]
   Description=Scratch Editor AlbiLAB
   After=docker.service
   
   [Service]
   Type=oneshot
   RemainAfterExit=yes
   WorkingDirectory=/path/to/scratch-editor-albilab
   ExecStart=/usr/bin/docker-compose up -d
   ExecStop=/usr/bin/docker-compose down
   
   [Install]
   WantedBy=multi-user.target
   ```

## 📝 Changelog

### v1.0.0
- Základní Scratch editor s AlbiLAB integrací
- Ukládání a načítání projektů
- Průběžné ukládání
- Modifikované menu (skryté tlačítka)
- Docker/Podman Compose podpora

## 🤝 Podpora

Pro technickou podporu nebo hlášení problémů:
- Vytvořte issue v repository
- Kontaktujte vývojový tým AlbiLAB

## 📄 Licence

Tento projekt je licencován pod [MIT License](LICENSE).

---

**Poznámka**: Tento projekt je modifikací oficiálního Scratch editoru a je určen pro použití v AlbiLAB ekosystému.