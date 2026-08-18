# Scratch Editor pro Raspberry Pi

Kompletní návod pro nasazení Scratch Editoru na Raspberry Pi s dotykovým displejem.

## 📋 Požadavky

- Raspberry Pi 4 (doporučeno)
- Raspberry Pi OS Lite
- Dotykový displej (testováno s D-WAV WS170120)
- CSI kamera kompatibilní s `rpicam-still`
- Podman

## 🚀 Rychlý start

### 1. Instalace základních komponent

```bash
# Aktualizuj systém
sudo apt update && sudo apt upgrade -y

# Instaluj Podman
sudo apt install -y podman podman-compose

# Nainstaluj nástroj pro ověření CSI kamery; v kontejneru jej instaluje pi-camera-service
sudo apt install -y rpicam-apps

# Ověř CSI kameru ještě před spuštěním kontejnerů
rpicam-hello --list-cameras

# Instaluj X server a Chromium
sudo apt install -y xserver-xorg xinit chromium-browser
```

### 2. Nastavení automatického přihlášení

```bash
# Povol automatické přihlášení pro root
sudo systemctl set-default multi-user.target
sudo systemctl enable getty@tty1.service

# Uprav getty konfiguraci
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin root --noclear %I $TERM
EOF

# Reload systemd
sudo systemctl daemon-reload
```

### 3. Konfigurace dotykového displeje

```bash
# Instaluj touchscreen drivery
sudo apt install -y xserver-xorg-input-libinput xinput-calibrator

# Vytvoř konfiguraci pro tablet režim
sudo tee /etc/X11/xorg.conf.d/99-tablet-touchscreen.conf << 'EOF'
Section "InputClass"
    Identifier "touchscreen"
    MatchIsTouchscreen "on"
    Driver "libinput"
    Option "CalibrationMatrix" "1 0 0 0 1 0 0 0 1"
    Option "TransformationMatrix" "1 0 0 0 1 0 0 0 1"
    Option "ButtonMapping" "1 2 3"
    Option "ScrollMethod" "twofinger"
    Option "ClickMethod" "clickfinger"
    Option "DisableWhileTyping" "on"
    Option "AccelProfile" "flat"
    Option "AccelSpeed" "0.0"
EndSection
EOF
```

### 4. Nastavení automatického spuštění

```bash
# Vytvoř .xinitrc pro automatické spuštění
cat > ~/.xinitrc << 'EOF'
#!/bin/bash
# Počkej na síť
sleep 10

# Spusť Scratch aplikace
cd ~/scratch-editor-albilab && podman-compose up -d

# Počkej na spuštění
sleep 15

# Spusť Chromium v tablet režimu
chromium-browser --kiosk --no-sandbox \
  --touch-events=enabled \
  --enable-pinch \
  --enable-touch-drag-drop \
  --enable-smooth-scrolling \
  --disable-pull-to-refresh-effect \
  --overscroll-history-navigation=0 \
  --disable-overscroll \
  --enable-features=TouchEventFeatureDetection \
  http://localhost:8601
EOF

chmod +x ~/.xinitrc

# Nastav automatické spuštění po bootu
echo "if [[ -z \$DISPLAY ]] && [[ \$(tty) = /dev/tty1 ]]; then startx; fi" >> ~/.bashrc
```

## 📦 Nasazení aplikace

### 1. Vyčištění systému

```bash
# Zastav všechny běžící kontejnery
podman stop $(podman ps -aq) 2>/dev/null || true

# Smaž všechny kontejnery
podman rm $(podman ps -aq) 2>/dev/null || true

# Smaž všechny images
podman rmi $(podman images -aq) 2>/dev/null || true

# Vyčisti systém
podman system prune -a -f --volumes
```

### 2. Načtení tar archivů

```bash
# Načti GUI image
podman load -i scratch-gui-arm64.tar

# Načti Backend image  
podman load -i scratch-backend-arm64.tar

# Přetaguj images podle docker-compose.yml
podman tag localhost/scratch-gui-temp:latest scratch-gui
podman tag localhost/scratch-backend-temp:latest scratch-backend

# Ověř že images jsou načtené
podman images | grep scratch
```

### 3. Spuštění aplikace

```bash
# Sestav a spusť aplikace včetně interní služby CSI kamery
podman-compose up -d --build

# Zkontroluj běžící kontejnery
podman ps

# Zkontroluj logy
podman logs scratch-backend
podman logs scratch-gui
podman logs scratch-pi-camera
```

### Pi Kamera a rozpoznání květiny

Služba `pi-camera-service` běží pouze uvnitř Podman Compose sítě. Přistupuje k CSI zařízení přes
`rpicam-still`; port 8088 se nevystavuje na síť Raspberry Pi. Backend po vyfocení odešle JPEG na
endpoint nastavený proměnnou `FLOWER_API_BASE_URL` a výsledek vrátí blokům Pi Květina i panelu Pi Kamera.

Compose konfigurace je určená pro 64bitový Raspberry Pi OS (`linux/arm64`) a pro přístup k CSI zařízení
služba potřebuje `privileged: true` a read-only mount `/run/udev`. Před nasazením proto ověřte kameru na
konkrétním zařízení a po spuštění zkontrolujte:

```bash
podman ps --format '{{.Names}}'
podman logs scratch-pi-camera
curl http://localhost:8601/pi-kamera/health
```

Před spuštěním nastavte adresu Flower API mimo Git, například do lokálního souboru `.env`:

```bash
FLOWER_API_BASE_URL=<adresa Flower API>
```

### Showroom režim

Pro showroom nebo kiosk, kde se projekty nemají nasazovat a běžet na pozadí, spusťte compose s:

```bash
DISABLE_BACKGROUND_PROJECTS=true podman-compose up -d --force-recreate
```

Tím se schová raketka/deploy ovládání v GUI, backend odmítne nové background spuštění a při startu vyčistí uložené běžící projekty. Zelená vlajka ve Scratch editoru zůstává dostupná pro běh projektu přímo v GUI.

Zpět na běžný režim přepnete:

```bash
DISABLE_BACKGROUND_PROJECTS=false podman-compose up -d --force-recreate
```

Aktuální stav ověříte:

```bash
curl http://localhost:3001/api/status
```

Ve výstupu hledejte položku `backgroundProjectsDisabled`.

## 🔧 Údržba

### Užitečné příkazy

```bash
# Zastavit kontejnery
podman stop scratch-backend scratch-gui scratch-pi-camera

# Restart kontejnerů
podman restart scratch-backend scratch-gui scratch-pi-camera

# Sledovat logy v reálném čase
podman logs -f scratch-backend
podman logs -f scratch-gui
podman logs -f scratch-pi-camera

# Test připojení
curl http://localhost:3001
curl http://localhost:8601
```

### Kalibrace touchscreenu

```bash
# Spusť kalibraci
xinput_calibrator

# Test touchscreen
xinput test-xi2 --root

# Zobraz input zařízení
xinput list
```

## 🎯 Výsledek

Po restartu se automaticky:
1. Spustí Scratch aplikace (`podman-compose up -d`)
2. Spustí Chromium v fullscreen módu s tablet podporou
3. Zobrazí Scratch Editor na dotykovém displeji

## 🐛 Řešení problémů

### Touchscreen nefunguje
```bash
# Zkontroluj USB zařízení
lsusb

# Zkontroluj input zařízení
ls /dev/input/
cat /proc/bus/input/devices | grep -E "Name|Handlers"
```

### Aplikace se nespustí
```bash
# Zkontroluj logy
podman logs scratch-backend
podman logs scratch-gui

# Restart kontejnerů
podman-compose restart
```

### Chromium se nespustí
```bash
# Test X serveru
startx

# Zkontroluj .xinitrc
cat ~/.xinitrc
```

## 📝 Poznámky

- Aplikace běží na portech 3001 (backend) a 8601 (GUI)
- Touchscreen je optimalizován pro tablet režim
- Automatické spuštění po každém bootu
- Kiosk mód - žádné browser UI

## 🔗 Odkazy

- [Scratch Editor GitHub](https://github.com/scratchfoundation/scratch-editor)
- [Podman dokumentace](https://podman.io/docs/)
- [Raspberry Pi OS](https://www.raspberrypi.org/downloads/)
