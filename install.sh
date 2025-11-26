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

# Funkce pro stažení a sestavení chunked tar archivu
download_and_assemble_chunked() {
    local base_name="$1"
    local full_tar="${base_name}-arm64.tar"
    
    print_info "Stahuji ${base_name}..."
    
    # Zkusíme stáhnout celý tar nejdřív
    if wget --spider "${RELEASE_URL}/${full_tar}" 2>/dev/null; then
        print_info "Celý tar archiv existuje, stahuji..."
        if [ -f "$full_tar" ]; then
            local local_size=$(stat -c%s "$full_tar" 2>/dev/null || echo "0")
            local remote_size=$(wget --spider --server-response "${RELEASE_URL}/${full_tar}" 2>&1 | grep -i content-length | awk '{print $2}' | tail -1)
            
            if [ -n "$remote_size" ] && [ "$remote_size" != "0" ] && [ "$local_size" = "$remote_size" ]; then
                print_info "$full_tar je aktuální, přeskakujeme stahování"
                return 0
            fi
        fi
        
        wget --progress=bar:force "${RELEASE_URL}/${full_tar}" -O "${full_tar}"
        print_success "${base_name} stažen jako jeden soubor"
        return 0
    fi
    
    # Pokud celý neexistuje, zkusíme chunked verzi
    print_info "Hledám rozdělené části..."
    
    local part_num=0
    local parts_found=0
    local parts_to_download=()
    local needs_download=false
    
    # Zjistíme, kolik částí existuje (zkusíme až 10 částí)
    while [ $part_num -lt 10 ]; do
        local part_file="${base_name}-arm64.tar.$(printf "%02d" $part_num)"
        local part_url="${RELEASE_URL}/${part_file}"
        
        if wget --spider "$part_url" 2>/dev/null; then
            parts_to_download+=("$part_file")
            parts_found=$((parts_found + 1))
            
            # Kontrola, zda už nemáme lokální kopii
            if [ ! -f "$part_file" ]; then
                needs_download=true
            else
                local local_size=$(stat -c%s "$part_file" 2>/dev/null || echo "0")
                local remote_size=$(wget --spider --server-response "$part_url" 2>&1 | grep -i content-length | awk '{print $2}' | tail -1)
                
                if [ -z "$remote_size" ] || [ "$remote_size" = "0" ] || [ "$local_size" != "$remote_size" ]; then
                    needs_download=true
                fi
            fi
            
            print_info "Našel jsem část: $part_file"
        else
            break
        fi
        
        part_num=$((part_num + 1))
    done
    
    if [ $parts_found -eq 0 ]; then
        print_error "Nepodařilo se najít ani celý tar, ani jeho části pro ${base_name}"
        return 1
    fi
    
    if [ "$needs_download" = true ]; then
        # Stáhneme všechny části
        print_info "Stahuji $parts_found částí..."
        for part_file in "${parts_to_download[@]}"; do
            local part_url="${RELEASE_URL}/${part_file}"
            print_info "Stahuji ${part_file}..."
            wget --progress=bar:force "$part_url" -O "$part_file"
        done
    else
        print_info "Všechny části jsou aktuální, přeskakuji stahování"
    fi
    
    # Sestavíme tar archiv ze všech částí (pokud ještě neexistuje nebo je starší)
    if [ ! -f "$full_tar" ] || [ "$needs_download" = true ]; then
        print_info "Sestavuji tar archiv ze všech částí..."
        cat "${base_name}-arm64.tar."* > "${full_tar}"
    else
        print_info "Sestavený tar archiv už existuje a je aktuální"
    fi
    
    # Ověříme integritu
    if [ ! -s "${full_tar}" ]; then
        print_error "Sestavení tar archivu selhalo"
        return 1
    fi
    
    print_success "${base_name} připraven ($(du -h ${full_tar} | cut -f1), ze $parts_found částí)"
    
    # Smažeme části (už nejsou potřeba)
    rm -f "${base_name}-arm64.tar."*
    
    return 0
}

# Stažení kontejnerů
download_containers() {
    print_step "6" "Stažení Universal ARM64 kontejneru..."
    
    # Stáhneme universal image (jeden tar pro obě aplikace)
    if ! download_and_assemble_chunked "scratch-universal"; then
        print_error "Nepodařilo se stáhnout universal image"
        exit 1
    fi
    
    print_success "Universal kontejner připraven"
}

# Načtení kontejnerů
load_containers() {
    print_step "7" "Načítání Universal kontejneru do Podman..."
    
    # Načtení universal tar archivu (obsahuje obě aplikace)
    print_info "Načítání universal image..."
    podman load -i scratch-universal-arm64.tar
    
    # Příprava image pro spuštění
    print_info "Připravuji image pro spuštění..."
    
    # Najdeme správný tag pro universal image
    if podman images | grep -q "scratch-universal"; then
        UNIVERSAL_TAG=$(podman images --format "{{.Repository}}:{{.Tag}}" | grep "scratch-universal" | head -1)
        # Tagujeme stejný image pod různými názvy pro kompatibilitu
        podman tag "$UNIVERSAL_TAG" scratch-universal:latest
        podman tag "$UNIVERSAL_TAG" scratch-gui
        podman tag "$UNIVERSAL_TAG" scratch-backend
    else
        print_error "Universal image nebyl nalezen po načtení"
        exit 1
    fi
    
    print_success "Universal kontejner načten (použitelný pro frontend i backend)"
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
  # Scratch GUI aplikace (používá universal image s APP_MODE=frontend)
  scratch-gui:
    image: scratch-universal:latest
    container_name: scratch-gui-app
    ports:
      - "8601:8601"
    environment:
      - NODE_ENV=production
      - APP_MODE=frontend
      - PORT=8601
    restart: unless-stopped

  # Backend server pro trvalý běh projektů (používá universal image s APP_MODE=backend)
  scratch-backend-app:
    image: scratch-universal:latest
    container_name: scratch-backend-app
    ports:
      - "3001:3001"
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - APP_MODE=backend
      - PORT=3001
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
EOF

    print_success "docker-compose.yml vytvořen (universal image pro obě služby)"
}

# Vytvoření systemd služby
create_systemd_service() {
    print_step "10" "Vytvoření systemd služby..."
    
    # Zjištění cesty k podman-compose
    PODMAN_COMPOSE_PATH=$(which podman-compose)
    
    if [ -z "$PODMAN_COMPOSE_PATH" ]; then
        print_error "podman-compose nebyl nalezen v PATH"
        exit 1
    fi
    
    print_info "Používá se podman-compose z: $PODMAN_COMPOSE_PATH"
    
    sudo tee /etc/systemd/system/scratch-albilab.service > /dev/null << EOF
[Unit]
Description=Scratch Editor AlbiLAB
After=network.target
Wants=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=$PODMAN_COMPOSE_PATH up -d
ExecStop=$PODMAN_COMPOSE_PATH down
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
        print_info "Zkontrolujte stav: sudo systemctl status scratch-albilab.service"
        
        # Zobrazení posledních logů
        print_info "Poslední logy:"
        sudo journalctl -u scratch-albilab.service --no-pager -n 10
        
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
