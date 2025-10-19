#!/bin/bash

# Scratch Editor AlbiLAB - Instalační skript pro Raspberry Pi
# Automatická instalace a konfigurace pro ARM64

set -e  # Ukončit při chybě

# Barvy pro výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurace
INSTALL_DIR="/opt/scratch-albilab"
SERVICE_NAME="scratch-albilab"
GITHUB_REPO="https://github.com/nickelsound/scratch-editor-albilab"
RELEASE_URL="https://github.com/nickelsound/scratch-editor-albilab/releases/download/arm64"

# Funkce pro výpis
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Scratch Editor AlbiLAB - Instalace${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

print_step() {
    echo -e "${YELLOW}[KROK $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Kontrola, zda běžíme jako root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Tento skript nesmí běžet jako root. Spusťte ho jako běžný uživatel."
        exit 1
    fi
}

# Kontrola operačního systému
check_system() {
    print_step "1" "Kontrola systému..."
    
    # Kontrola distribuce
    if [[ ! -f /etc/os-release ]]; then
        print_error "Nepodporovaný operační systém"
        exit 1
    fi
    
    source /etc/os-release
    
    if [[ "$ID" != "raspbian" && "$ID" != "debian" ]]; then
        print_error "Tento skript je určen pro Raspberry Pi OS (Raspbian/Debian)"
        exit 1
    fi
    
    # Kontrola architektury
    ARCH=$(uname -m)
    if [[ "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
        print_error "Tento skript je určen pro ARM64 architekturu"
        exit 1
    fi
    
    print_success "Systém je kompatibilní: $PRETTY_NAME ($ARCH)"
}

# Aktualizace systému
update_system() {
    print_step "2" "Aktualizace systému..."
    
    sudo apt update -y
    sudo apt upgrade -y
    
    print_success "Systém aktualizován"
}

# Instalace Podman
install_podman() {
    print_step "3" "Instalace Podman..."
    
    # Kontrola, zda už není nainstalován
    if command -v podman &> /dev/null; then
        print_info "Podman je již nainstalován"
        return
    fi
    
    # Instalace z oficiální distribuce
    sudo apt install -y podman
    
    print_success "Podman nainstalován"
}

# Instalace podman-compose
install_podman_compose() {
    print_step "4" "Instalace podman-compose..."
    
    # Kontrola, zda už není nainstalován
    if command -v podman-compose &> /dev/null; then
        print_info "podman-compose je již nainstalován"
        return
    fi
    
    # Instalace z oficiální distribuce
    sudo apt install -y podman-compose
    
    print_success "podman-compose nainstalován"
}

# Vytvoření instalačního adresáře
create_install_directory() {
    print_step "5" "Vytvoření instalačního adresáře..."
    
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown $USER:$USER "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    print_success "Instalační adresář vytvořen: $INSTALL_DIR"
}

# Stažení kontejnerů
download_containers() {
    print_step "6" "Stažení ARM64 kontejnerů..."
    
    # Stažení GUI kontejneru
    print_info "Stahování scratch-gui-arm64.tar..."
    wget -q "$RELEASE_URL/scratch-gui-arm64.tar" -O scratch-gui-arm64.tar
    
    # Stažení backend kontejneru
    print_info "Stahování scratch-backend-arm64.tar..."
    wget -q "$RELEASE_URL/scratch-backend-arm64.tar" -O scratch-backend-arm64.tar
    
    print_success "Kontejnery staženy"
}

# Načtení kontejnerů
load_containers() {
    print_step "7" "Načítání kontejnerů do Podman..."
    
    # Načtení GUI kontejneru
    print_info "Načítání scratch-gui..."
    podman load -i scratch-gui-arm64.tar
    
    # Načtení backend kontejneru
    print_info "Načítání scratch-backend..."
    podman load -i scratch-backend-arm64.tar
    
    # Přejmenování images podle docker-compose.yml
    podman tag localhost/scratch-gui-temp:latest scratch-gui
    podman tag localhost/scratch-backend-temp:latest scratch-backend
    
    print_success "Kontejnery načteny"
}

# Vytvoření adresářové struktury
create_directories() {
    print_step "8" "Vytvoření adresářové struktury..."
    
    mkdir -p uploads/auto-save
    mkdir -p uploads/deployed-projects
    
    # Vytvoření ukázkových souborů
    cat > uploads/auto-save/Scratch_Project.json << 'EOF'
{
  "targets": [],
  "monitors": [],
  "extensions": [],
  "meta": {
    "semver": "3.0.0",
    "vm": "0.2.0",
    "agent": "Mozilla/5.0"
  }
}
EOF

    cat > uploads/deployed-projects/Scratch_Project.json << 'EOF'
{
  "targets": [],
  "monitors": [],
  "extensions": [],
  "meta": {
    "semver": "3.0.0",
    "vm": "0.2.0",
    "agent": "Mozilla/5.0"
  }
}
EOF

    print_success "Adresářová struktura vytvořena"
}

# Vytvoření production docker-compose.yml
create_docker_compose() {
    print_step "9" "Vytvoření docker-compose.yml pro produkci..."
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Scratch GUI aplikace
  scratch-gui:
    image: scratch-gui
    container_name: scratch-gui-app
    ports:
      - "8601:8601"
    environment:
      - NODE_ENV=production
      - PORT=8601
    restart: unless-stopped

  # Backend server pro trvalý běh projektů
  scratch-backend-app:
    image: scratch-backend
    container_name: scratch-backend-app
    ports:
      - "3001:3001"
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
EOF

    print_success "docker-compose.yml vytvořen"
}

# Vytvoření systemd služby
create_systemd_service() {
    print_step "10" "Vytvoření systemd služby..."
    
    sudo tee /etc/systemd/system/scratch-albilab.service > /dev/null << EOF
[Unit]
Description=Scratch Editor AlbiLAB
After=network.target
Wants=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/local/bin/podman-compose up -d
ExecStop=/usr/local/bin/podman-compose down
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd a povolení služby
    sudo systemctl daemon-reload
    sudo systemctl enable scratch-albilab.service
    
    print_success "Systemd služba vytvořena a povolena"
}

# Zjištění IP adresy
get_ip_address() {
    # Získání primární IP adresy
    IP=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || echo "localhost")
    
    # Fallback na hostname -I
    if [[ "$IP" == "" || "$IP" == "127.0.0.1" ]]; then
        IP=$(hostname -I | awk '{print $1}')
    fi
    
    # Fallback na localhost
    if [[ "$IP" == "" ]]; then
        IP="localhost"
    fi
    
    echo "$IP"
}

# Spuštění služby
start_service() {
    print_step "11" "Spuštění služby..."
    
    # Spuštění služby
    sudo systemctl start scratch-albilab.service
    
    # Čekání na spuštění
    sleep 5
    
    # Kontrola stavu
    if sudo systemctl is-active --quiet scratch-albilab.service; then
        print_success "Služba úspěšně spuštěna"
    else
        print_error "Služba se nepodařilo spustit"
        print_info "Zkontrolujte logy: sudo journalctl -u scratch-albilab.service"
        exit 1
    fi
}

# Výpis finálních instrukcí
show_final_instructions() {
    IP=$(get_ip_address)
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Scratch Editor AlbiLAB - Instalace dokončena! ✓${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Služba je nyní spuštěna a běží na pozadí.${NC}"
    echo ""
    echo -e "${YELLOW}Přístup k aplikaci:${NC}"
    echo -e "  Frontend: http://$IP:8601"
    echo -e "  Backend API: http://$IP:3001"
    echo ""
    echo -e "${YELLOW}Na jiném zařízení v síti otevřete prohlížeč a zadejte:${NC}"
    echo -e "  ${GREEN}http://$IP:8601${NC}"
    echo ""
    echo -e "${YELLOW}Užitečné příkazy:${NC}"
    echo -e "  Status služby:   ${BLUE}sudo systemctl status scratch-albilab${NC}"
    echo -e "  Zastavit službu: ${BLUE}sudo systemctl stop scratch-albilab${NC}"
    echo -e "  Spustit službu:  ${BLUE}sudo systemctl start scratch-albilab${NC}"
    echo -e "  Restart služby:  ${BLUE}sudo systemctl restart scratch-albilab${NC}"
    echo -e "  Zobrazit logy:   ${BLUE}podman-compose logs -f${NC}"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
}

# Hlavní funkce
main() {
    print_header
    
    check_root
    check_system
    update_system
    install_podman
    install_podman_compose
    create_install_directory
    download_containers
    load_containers
    create_directories
    create_docker_compose
    create_systemd_service
    start_service
    show_final_instructions
}

# Spuštění hlavní funkce
main "$@"
