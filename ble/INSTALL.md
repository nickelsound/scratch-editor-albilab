# Instalace a spuštění RPi BLE WiFi Server

## Požadavky

- Raspberry Pi s Bluetooth podporou
- Python 3.7 nebo vyšší
- Root oprávnění (sudo)
- bluez (Bluetooth stack)

## Krok 1: Instalace závislostí

```bash
# Aktualizace systému
sudo apt-get update
sudo apt-get upgrade -y

# Instalace bluez a Python závislostí
sudo apt-get install -y bluez python3-pip python3-dbus python3-gi python3-venv

# Instalace vývojových knihoven pro PyGObject, pycairo a dbus-python
sudo apt-get install -y \
    python3-dev \
    build-essential \
    pkg-config \
    libcairo2-dev \
    libgirepository1.0-dev \
    libgirepository-2.0-dev \
    libglib2.0-dev \
    libdbus-1-dev \
    gobject-introspection

# Ověření, že pkg-config najde potřebné knihovny
pkg-config --exists girepository-2.0 && echo "girepository-2.0: OK" || echo "girepository-2.0: NOT FOUND"
pkg-config --exists cairo && echo "cairo: OK" || echo "cairo: NOT FOUND"
pkg-config --exists dbus-1 && echo "dbus-1: OK" || echo "dbus-1: NOT FOUND"

# Vytvoření a aktivace virtuálního prostředí
cd /path/to/RPiBLEConfig/rpi
python3 -m venv venv
source venv/bin/activate

# Instalace Python balíčků do virtuálního prostředí
pip install -r requirements.txt
```

## Krok 2: Kontrola Bluetooth

```bash
# Zkontrolujte, že Bluetooth je aktivní
sudo systemctl status bluetooth

# Pokud není aktivní, spusťte ho
sudo systemctl enable bluetooth
sudo systemctl start bluetooth

# Zkontrolujte, že Bluetooth adaptér je viditelný
hciconfig
# nebo
bluetoothctl show
```

## Krok 3: Nastavení oprávnění

BLE server potřebuje root oprávnění pro:
- Úpravu `/etc/wpa_supplicant/wpa_supplicant.conf`
- Restart WiFi služeb

## Krok 4: Spuštění BLE serveru

```bash
cd /path/to/RPiBLEConfig/rpi

# Aktivujte virtuální prostředí
source venv/bin/activate

# Spusťte server (vyžaduje sudo)
sudo venv/bin/python3 ble_wifi_server.py
```

Server začne inzerovat BLE službu a čekat na připojení z Android aplikace.

## Krok 5: Testování

1. Spusťte Android aplikaci
2. V záložce "WiFi Config" klepněte na "Scan for RPi"
3. Po připojení zadejte SSID a heslo WiFi
4. Klepněte na "Send Configuration"
5. Po úspěšné konfiguraci se IP adresa zobrazí v záložce "AlbiLAB"

## Automatické spuštění při bootu (volitelné)

Vytvořte systemd service pro automatické spuštění:

```bash
sudo nano /etc/systemd/system/rpi-ble-wifi.service
```

Přidejte následující obsah:

```ini
[Unit]
Description=RPi BLE WiFi Configuration Server
After=bluetooth.service
Requires=bluetooth.service

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/RPiBLEConfig/rpi
ExecStart=/path/to/RPiBLEConfig/rpi/venv/bin/python3 /path/to/RPiBLEConfig/rpi/ble_wifi_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Aktivujte service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rpi-ble-wifi.service
sudo systemctl start rpi-ble-wifi.service
```

## Řešení problémů

### Chyba "externally-managed-environment" při instalaci balíčků
Pokud se zobrazí chyba o externě spravovaném prostředí, ujistěte se, že:
- Máte nainstalovaný `python3-venv`: `sudo apt-get install python3-venv`
- Vytváříte a aktivujete virtuální prostředí před instalací balíčků
- Používáte `pip` místo `pip3` po aktivaci virtuálního prostředí

### Chyba při instalaci pycairo, PyGObject nebo dbus-python
Pokud se zobrazí chyba o chybějící závislosti (např. "cairo", "dbus-1", "girepository-2.0") nebo jiné build chyby:
```bash
# Nainstalujte vývojové knihovny
sudo apt-get install -y \
    python3-dev \
    build-essential \
    pkg-config \
    libcairo2-dev \
    libgirepository1.0-dev \
    libgirepository-2.0-dev \
    libglib2.0-dev \
    libdbus-1-dev \
    gobject-introspection

# Ověřte, že pkg-config najde knihovny
pkg-config --exists girepository-2.0 && echo "girepository-2.0: OK" || echo "girepository-2.0: NOT FOUND"
pkg-config --exists cairo && echo "cairo: OK" || echo "cairo: NOT FOUND"
pkg-config --exists dbus-1 && echo "dbus-1: OK" || echo "dbus-1: NOT FOUND"
```
Pokud některá knihovna není nalezena, zkuste:
```bash
# Aktualizujte databázi balíčků
sudo apt-get update

# Zkontrolujte, zda je balíček nainstalován
dpkg -l | grep girepository

# Zkontrolujte, zda existuje .pc soubor
find /usr -name "girepository-2.0.pc" 2>/dev/null

# Pokud soubor existuje, zkontrolujte PKG_CONFIG_PATH
echo $PKG_CONFIG_PATH
pkg-config --variable pc_path pkg-config

# Znovu nainstalujte pkg-config a vývojové knihovny
sudo apt-get install --reinstall pkg-config libgirepository1.0-dev gobject-introspection

# Pokud stále není nalezeno, zkuste najít správný balíček
apt-cache search girepository | grep dev
```
Pokud `girepository-2.0` stále není nalezeno, může být potřeba:
```bash
# Nainstalujte všechny související balíčky
sudo apt-get install -y \
    libgirepository1.0-dev \
    gobject-introspection \
    libgirepository-1.0-1 \
    gir1.2-glib-2.0

# Zkontrolujte, zda pkg-config najde knihovnu
pkg-config --modversion girepository-2.0
```
Poté znovu zkuste instalaci balíčků v aktivovaném virtuálním prostředí.

### Chyba "Py_TRASHCAN_SAFE_BEGIN" nebo nekompatibilita PyGObject s Python 3.13
Pokud používáte Python 3.13 a PyGObject se nedaří zkompilovat kvůli chybějícím makrům:
- PyGObject 3.42.2 nepodporuje Python 3.13
- V `requirements.txt` je PyGObject bez verze, takže pip nainstaluje nejnovější kompatibilní verzi
- Pokud problém přetrvá, zvažte použití Python 3.11 nebo 3.12:
  ```bash
  # Vytvořte venv s konkrétní verzí Pythonu (pokud je nainstalována)
  python3.11 -m venv venv
  # nebo
  python3.12 -m venv venv
  ```

### Bluetooth není viditelný
```bash
sudo hciconfig hci0 up
sudo hciconfig hci0 piscan
```

### BLE server se nespustí
- Zkontrolujte, že máte root oprávnění (sudo)
- Ověřte, že bluez běží: `sudo systemctl status bluetooth`
- Zkontrolujte logy: `sudo journalctl -u rpi-ble-wifi.service -f`

### Chyba "No object received" při registraci aplikace
Pokud se zobrazí chyba "org.bluez.Error.Failed: No object received":
- Ujistěte se, že používáte nejnovější verzi `ble_wifi_server.py` (Application musí implementovat ObjectManager)
- Zkontrolujte, že Bluetooth adaptér je aktivní: `sudo hciconfig hci0 up`
- Zkontrolujte, že Bluetooth je v discoverable režimu: `sudo hciconfig hci0 piscan`
- Zkuste restartovat Bluetooth službu: `sudo systemctl restart bluetooth`
- Ověřte, že máte oprávnění pro D-Bus (spouštějte jako root/sudo)

### WiFi se nekonfiguruje
- Ověřte, že SSID a heslo jsou správné
- Zkontrolujte logy serveru
- Ověřte, že `/etc/wpa_supplicant/wpa_supplicant.conf` existuje a je zapisovatelný

### IP adresa se nezobrazí
- Počkejte několik sekund po připojení k WiFi
- Zkontrolujte, že WiFi adaptér získal IP: `ip addr show wlan0`
- Ověřte, že dhcpcd běží: `sudo systemctl status dhcpcd`

