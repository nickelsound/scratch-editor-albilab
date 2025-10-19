# Scratch Editor AlbiLAB

**Programujte svou AlbiLAB vědeckou stanici pomocí Scratch!** 🧪🔬

Tento projekt rozšiřuje inovativní [AlbiLAB vědeckou stanici](https://www.albilab.cz) o možnosti programování přes Scratch. AlbiLAB je modulární vzdělávací sada, která kombinuje elektroniku, stavební kostky a laboratorní vybavení pro vytvoření kompletní vědecké pracovní stanice pro děti a rodiny.

## Co je AlbiLAB?

AlbiLAB je inovativní vědecká stanice, která obsahuje:
- **Elektroniku**: Řídící deska, LED kroužky, barevný displej, vodiče, powerbanka, adaptér, USB kabel
- **Stavebnici**: Magnetické kostky, kryty a redukce pro vnitřní vybavení, pokovené pásky, řezáček
- **Laboratoř**: Zkumavky, střička, kádinka, pipeta, lupa, Petriho misky, pinzeta, pH papírky
- **Pěstování**: Pěstební nádoby a substrát, keramzit, semínka Huseníčku rolního, vědecký deník

## Co tento projekt přidává?

Projekt Scratch Editor AlbiLAB vám umožňuje:
- **Programovat svou AlbiLAB stanici** pomocí známého vizuálního programovacího jazyka Scratch
- **Ovládat experimenty** a vědecká měření pomocí kódu
- **Vytvářet interaktivní projekty**, které reagují na senzory a ovládají výstupy
- **Ukládat a načítat projekty** přímo do/z vaší AlbiLAB stanice
- **Učit se programování** při provádění skutečných vědeckých experimentů

Perfektní pro děti, rodiče a pedagogy, kteří chtějí spojit praktickou vědu s výukou programování!

<a href="docs/albilab-scratch.png" target="_blank">
  <img src="docs/albilab-scratch.png" alt="AlbiLAB Scratch Editor" width="600" style="max-width: 100%; height: auto;">
</a>
*Screenshot rozhraní Scratch Editor AlbiLAB s modifikovaným menu a tlačítky pro integraci s AlbiLAB (klikněte pro plné rozlišení)*

## Vyžaduje trvalý provoz

**Toto řešení musí běžet trvale**, protože vytvořené Scratch programy běží na této backend službě a ovládají AlbiLAB stanici přes její API. Jakmile nahrajete projekt, běží na tomto backendu a komunikuje s AlbiLAB stanicí pro vykonávání naprogramované logiky.


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
- **AlbiLAB integrace**: Přímé připojení k vaší AlbiLAB vědecké stanici
- **Ukládání projektů**: Projekty se automaticky ukládají do AlbiLAB stanice
- **Načítání projektů**: Možnost načíst dříve uložené projekty z AlbiLAB
- **Průběžné ukládání**: Automatické ukládání změn každých 30 sekund
- **Real-time ovládání**: Ovládání AlbiLAB experimentů pomocí Scratch kódu

### AlbiLAB specifické funkce
- **Integrace senzorů**: Čtení dat z AlbiLAB senzorů (teplota, světlo, pH, atd.)
- **Ovládání výstupů**: Ovládání LED kroužků, displejů a dalších AlbiLAB komponent
- **Automatizace experimentů**: Automatizace vědeckých experimentů a sběru dat
- **Záznam dat**: Zaznamenávání a analýza experimentálních dat v čase
- **Konfigurace IP**: Nastavení IP adresy AlbiLAB zařízení pomocí Scratch bloků
- **Validace**: Automatická kontrola povinné IP konfigurační komponenty

### Modifikované menu
- **Skryté tlačítka**: Share/Shared, Remix, See Project Page
- **Skryté sekce**: My Stuff, Scratch Cat
- **Nové tlačítka**:
  - "Nahrát do AlbiLAB" - nahrání a spuštění projektu na vaší stanici
  - "Načíst z AlbiLAB" - načtení uloženého projektu z vaší stanice
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

### Nastavení IP adresy AlbiLAB

**DŮLEŽITÉ**: IP adresa AlbiLAB zařízení se nastavuje **pouze** pomocí Scratch bloku "nastavit IP adresu AlbiLAB na [IP]" v každém projektu. Tato komponenta je **povinná** pro jakýkoliv projekt používající AlbiLAB funkce.

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

5. **Problémy s komunikací AlbiLAB:**
   - Zkontrolujte, že projekt obsahuje blok "nastavit IP adresu AlbiLAB na [IP]" s vyplněnou IP adresou
   - Zkontrolujte síťové připojení k AlbiLAB zařízení
   - Ověřte, že IP adresa v bloku je správná

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

## 🍓 ARM procesory (Raspberry Pi)

### 🚀 Jednopříkazová instalace

Pro Raspberry Pi OS Lite můžete nainstalovat vše jedním příkazem:

```bash
curl -sSL https://raw.githubusercontent.com/nickelsound/scratch-editor-albilab/refs/heads/develop/install.sh | bash
```

**Nebo manuálně:**
```bash
wget https://raw.githubusercontent.com/nickelsound/scratch-editor-albilab/refs/heads/develop/install.sh
chmod +x install.sh
./install.sh
```

Instalační skript provede:
- ✅ Kontrolu kompatibility systému (Raspberry Pi OS, ARM64)
- ✅ Instalaci Podman a podman-compose
- ✅ Stažení ARM64 kontejnerů z GitHub releases
- ✅ Načtení kontejnerů do Podman
- ✅ Vytvoření systemd služby pro automatický start
- ✅ Spuštění aplikace na pozadí
- ✅ Zobrazení IP adresy pro síťový přístup

Po instalaci přistupte k aplikaci na `http://[RASPBERRY_PI_IP]:8601`

### Manuální instalace

Pokud preferujete manuální instalaci nebo potřebujete sestavit kontejnery sami:

#### Předpoklady pro ARM build

- **Podman** nainstalovaný v systému
- **Docker Compose** nebo **Podman Compose**
- Minimálně 4GB RAM pro build proces
- Dostatek místa na disku (build může vyžadovat 10GB+)

#### Sestavení ARM verzí

1. **Spusťte ARM build script:**
   ```bash
   chmod +x build-arm.sh
   ./build-arm.sh
   ```

2. **Výsledek:**
   - `scratch-gui-arm64.tar` - GUI kontejner pro ARM64
   - `scratch-backend-arm64.tar` - Backend kontejner pro ARM64

#### Manuální nasazení na Raspberry Pi

1. **Přeneste tar archivy na Raspberry Pi:**
   ```bash
   scp scratch-gui-arm64.tar scratch-backend-arm64.tar pi@raspberry-pi-ip:~/
   ```

2. **Na Raspberry Pi načtěte images:**
   ```bash
   podman load -i scratch-gui-arm64.tar
   podman load -i scratch-backend-arm64.tar
   
   # Přetagujte podle docker-compose.yml
   podman tag localhost/scratch-gui-temp:latest scratch-gui
   podman tag localhost/scratch-backend-temp:latest scratch-backend
   ```

3. **Spusťte aplikaci:**
   ```bash
   podman-compose up -d
   ```

#### ARM specifické konfigurace

**Porty pro ARM verzi:**
- **8601**: Frontend aplikace (místo 3000)
- **3001**: Backend API
- **3002**: WebSocket server

**Environment proměnné pro ARM:**
```yaml
# scratch-gui-app (ARM)
REACT_APP_BACKEND_URL: http://localhost:3001
PORT: 8601

# scratch-backend-app (ARM)
PORT: 3001
WEBSOCKET_PORT: 3002
```

#### Troubleshooting ARM build

1. **Build selhává kvůli paměti:**
   ```bash
   # Zvyšte swap
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **NPM timeout chyby:**
   ```bash
   # Zvyšte timeout před buildem
   npm config set fetch-timeout 300000
   npm config set fetch-retry-mintimeout 20000
   ```

3. **Podman build chyby:**
   ```bash
   # Vyčistěte cache
   podman system prune -a -f
   npm cache clean --force
   ```

#### Kompletní Raspberry Pi setup

Pro kompletní nastavení na Raspberry Pi s dotykovým displejem viz [README-RPI.md](README-RPI.md).

#### Správa služby

Po instalaci můžete spravovat službu pomocí:

```bash
# Zkontrolovat stav služby
sudo systemctl status scratch-albilab

# Zastavit službu
sudo systemctl stop scratch-albilab

# Spustit službu
sudo systemctl start scratch-albilab

# Restart služby
sudo systemctl restart scratch-albilab

# Zobrazit logy
cd /opt/scratch-albilab
podman-compose logs -f
```

Pro podrobné instalační instrukce viz [README-INSTALL.md](README-INSTALL.md).

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

**Poznámka**: Tento projekt je modifikací oficiálního Scratch editoru speciálně navrženou pro umožnění programování AlbiLAB vědeckých stanic. Spojuje vizuální programovací vzdělávání s praktickými vědeckými experimenty, což je ideální pro děti, rodiny a pedagogy, kteří chtějí spojit programování se skutečnou vědou.