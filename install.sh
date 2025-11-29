#!/bin/bash

# Scratch Editor AlbiLAB - Installation script for Raspberry Pi
# Automatic installation and configuration for ARM64

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/scratch-albilab"
SERVICE_NAME="scratch-albilab"
GITHUB_REPO="https://github.com/nickelsound/scratch-editor-albilab"

# Release version from which tar files are downloaded (GitHub tag)
# If empty, the latest version from GitHub releases will be used
RELEASE_VERSION="${RELEASE_VERSION:-}"
GITHUB_REPO_API="https://api.github.com/repos/nickelsound/scratch-editor-albilab"

# Function to get the latest version from GitHub releases
get_latest_version() {
    local latest_tag=$(curl -s "${GITHUB_REPO_API}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "")
    if [ -z "$latest_tag" ]; then
        # Fallback: try to get the latest tag another way
        latest_tag=$(curl -s "${GITHUB_REPO_API}/releases" | grep '"tag_name":' | head -1 | sed -E 's/.*"([^"]+)".*/\1/' || echo "")
    fi
    if [ -z "$latest_tag" ]; then
        # If we couldn't get it, use default version
        echo "0.0.1"
    else
        echo "$latest_tag"
    fi
}

# Determine version to use
if [ -z "$RELEASE_VERSION" ]; then
    print_info "Detecting latest version from GitHub releases..."
    RELEASE_VERSION=$(get_latest_version)
    print_info "Using version: $RELEASE_VERSION"
else
    print_info "Using specified version: $RELEASE_VERSION"
fi

RELEASE_URL="https://github.com/nickelsound/scratch-editor-albilab/releases/download/${RELEASE_VERSION}"

# Output functions
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Scratch Editor AlbiLAB - Installation${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

print_step() {
    echo -e "${YELLOW}[STEP $1]${NC} $2"
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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script must not run as root. Please run it as a regular user."
        exit 1
    fi
}

# Check operating system
check_system() {
    print_step "1" "Checking system..."
    
    # Check distribution
    if [[ ! -f /etc/os-release ]]; then
        print_error "Unsupported operating system"
        exit 1
    fi
    
    source /etc/os-release
    
    if [[ "$ID" != "raspbian" && "$ID" != "debian" ]]; then
        print_error "This script is intended for Raspberry Pi OS (Raspbian/Debian)"
        exit 1
    fi
    
    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
        print_error "This script is intended for ARM64 architecture"
        exit 1
    fi
    
    print_success "System is compatible: $PRETTY_NAME ($ARCH)"
}

# Update system
update_system() {
    print_step "2" "Updating system..."
        
    sudo apt update -y
    sudo apt upgrade -y
    
    print_success "System updated"
}

# Install Podman
install_podman() {
    print_step "3" "Installing Podman..."
    
    # Check if already installed
    if command -v podman &> /dev/null; then
        print_info "Podman is already installed"
        return
    fi
    
    # Install from official distribution
    sudo apt install -y podman
    
    print_success "Podman installed"
}

# Install podman-compose
install_podman_compose() {
    print_step "4" "Installing podman-compose..."
    
    # Check if already installed
    if command -v podman-compose &> /dev/null; then
        print_info "podman-compose is already installed"
        return
    fi
    
    # Install from official distribution
    sudo apt install -y podman-compose
    
    print_success "podman-compose installed"
}

# Create installation directory
create_install_directory() {
    print_step "5" "Creating installation directory..."
    
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown $USER:$USER "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    print_success "Installation directory created: $INSTALL_DIR"
}

# Function to download and assemble chunked tar archive
download_and_assemble_chunked() {
    local base_name="$1"
    local full_tar="${base_name}-arm64.tar"
    
    print_info "Downloading ${base_name}..."
    
    # Try to download the full tar first
    if wget --spider "${RELEASE_URL}/${full_tar}" 2>/dev/null; then
        print_info "Full tar archive exists, downloading..."
        if [ -f "$full_tar" ]; then
            local local_size=$(stat -c%s "$full_tar" 2>/dev/null || echo "0")
            local remote_size=$(wget --spider --server-response "${RELEASE_URL}/${full_tar}" 2>&1 | grep -i content-length | awk '{print $2}' | tail -1)
            
            if [ -n "$remote_size" ] && [ "$remote_size" != "0" ] && [ "$local_size" = "$remote_size" ]; then
                print_info "$full_tar is up to date, skipping download"
                return 0
            fi
        fi
        
        wget --progress=bar:force "${RELEASE_URL}/${full_tar}" -O "${full_tar}"
        print_success "${base_name} downloaded as single file"
        return 0
    fi
    
    # If full doesn't exist, try chunked version
    print_info "Looking for split parts..."
    
    local part_num=0
    local parts_found=0
    local parts_to_download=()
    local needs_download=false
    
    # Find out how many parts exist (try up to 10 parts)
    while [ $part_num -lt 10 ]; do
        local part_file="${base_name}-arm64.tar.$(printf "%02d" $part_num)"
        local part_url="${RELEASE_URL}/${part_file}"
        
        if wget --spider "$part_url" 2>/dev/null; then
            parts_to_download+=("$part_file")
            parts_found=$((parts_found + 1))
            
            # Check if we already have a local copy
            if [ ! -f "$part_file" ]; then
                needs_download=true
            else
                local local_size=$(stat -c%s "$part_file" 2>/dev/null || echo "0")
                local remote_size=$(wget --spider --server-response "$part_url" 2>&1 | grep -i content-length | awk '{print $2}' | tail -1)
                
                if [ -z "$remote_size" ] || [ "$remote_size" = "0" ] || [ "$local_size" != "$remote_size" ]; then
                    needs_download=true
                fi
            fi
            
            print_info "Found part: $part_file"
        else
            break
        fi
        
        part_num=$((part_num + 1))
    done
    
    if [ $parts_found -eq 0 ]; then
        print_error "Could not find either full tar or its parts for ${base_name}"
        return 1
    fi
    
    if [ "$needs_download" = true ]; then
        # Download all parts
        print_info "Downloading $parts_found parts..."
        for part_file in "${parts_to_download[@]}"; do
            local part_url="${RELEASE_URL}/${part_file}"
            print_info "Downloading ${part_file}..."
            wget --progress=bar:force "$part_url" -O "$part_file"
        done
    else
        print_info "All parts are up to date, skipping download"
    fi
    
    # Assemble tar archive from all parts (if it doesn't exist or is older)
    if [ ! -f "$full_tar" ] || [ "$needs_download" = true ]; then
        print_info "Assembling tar archive from all parts..."
        cat "${base_name}-arm64.tar."* > "${full_tar}"
    else
        print_info "Assembled tar archive already exists and is up to date"
    fi
    
    # Verify integrity
    if [ ! -s "${full_tar}" ]; then
        print_error "Failed to assemble tar archive"
        return 1
    fi
    
    print_success "${base_name} ready ($(du -h ${full_tar} | cut -f1), from $parts_found parts)"
    
    # Delete parts (no longer needed)
    rm -f "${base_name}-arm64.tar."*
    
    return 0
}

# Download containers
download_containers() {
    print_step "6" "Downloading Universal ARM64 container..."
    
    # Download universal image (one tar for both applications)
    if ! download_and_assemble_chunked "scratch-universal"; then
        print_error "Failed to download universal image"
        exit 1
    fi
    
    print_success "Universal container ready"
}

# Load containers
load_containers() {
    print_step "7" "Loading Universal container into Podman..."
    
    # If running containers already exist, stop them before update
    if [ -f "docker-compose.yml" ]; then
        print_info "Stopping existing containers before update..."
        podman-compose down 2>/dev/null || true
    fi
    
    # Load universal tar archive (contains both applications)
    print_info "Loading universal image..."
    podman load -i scratch-universal-arm64.tar
    
    # Prepare image for running
    print_info "Preparing image for running..."
    
    # Find the correct tag for universal image
    if podman images | grep -q "scratch-universal"; then
        UNIVERSAL_TAG=$(podman images --format "{{.Repository}}:{{.Tag}}" | grep "scratch-universal" | head -1)
        # Tag the same image under different names for compatibility
        podman tag "$UNIVERSAL_TAG" scratch-universal:latest
        podman tag "$UNIVERSAL_TAG" scratch-gui
        podman tag "$UNIVERSAL_TAG" scratch-backend
        print_info "Image tagged as: scratch-universal:latest"
    else
        print_error "Universal image not found after loading"
        exit 1
    fi
    
    print_success "Universal container loaded (usable for both frontend and backend)"
}

# Create directory structure
create_directories() {
    print_step "8" "Creating directory structure..."
    
    mkdir -p uploads/auto-save
    mkdir -p uploads/deployed-projects
    
    # Create sample files
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

    print_success "Directory structure created"
}

# Create production docker-compose.yml
create_docker_compose() {
    print_step "9" "Creating docker-compose.yml for production..."
    
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
    restart: always

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
    restart: always
EOF

    print_success "docker-compose.yml created (universal image for both services)"
}

# Create systemd service
create_systemd_service() {
    print_step "10" "Creating systemd service..."
    
    # Find path to podman-compose
    PODMAN_COMPOSE_PATH=$(which podman-compose)
    
    if [ -z "$PODMAN_COMPOSE_PATH" ]; then
        print_error "podman-compose not found in PATH"
        exit 1
    fi
    
    print_info "Using podman-compose from: $PODMAN_COMPOSE_PATH"
    
    sudo tee /etc/systemd/system/scratch-albilab.service > /dev/null << EOF
[Unit]
Description=Scratch Editor AlbiLAB
After=network.target podman.service
Wants=network.target
Requires=podman.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=$PODMAN_COMPOSE_PATH up -d
ExecStop=$PODMAN_COMPOSE_PATH down
ExecReload=$PODMAN_COMPOSE_PATH restart
Restart=on-failure
RestartSec=10
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable scratch-albilab.service
    
    print_success "Systemd service created and enabled"
}

# Get IP address
get_ip_address() {
    # Get primary IP address
    IP=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || echo "localhost")
    
    # Fallback to hostname -I
    if [[ "$IP" == "" || "$IP" == "127.0.0.1" ]]; then
        IP=$(hostname -I | awk '{print $1}')
    fi
    
    # Fallback to localhost
    if [[ "$IP" == "" ]]; then
        IP="localhost"
    fi
    
    echo "$IP"
}

# Create script for automatic update check
create_update_check_script() {
    print_step "11" "Creating automatic update script..."
    
    sudo tee "$INSTALL_DIR/update-check.sh" > /dev/null << 'UPDATE_SCRIPT_EOF'
#!/bin/bash
# Script for automatic update check and installation for Scratch Editor AlbiLAB

set -e

INSTALL_DIR="/opt/scratch-albilab"
GITHUB_REPO_API="https://api.github.com/repos/nickelsound/scratch-editor-albilab"
LOG_FILE="$INSTALL_DIR/update-check.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to get latest version from GitHub releases
get_latest_version() {
    local latest_tag=$(curl -s "${GITHUB_REPO_API}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "")
    if [ -z "$latest_tag" ]; then
        # Fallback: try to get the latest tag another way
        latest_tag=$(curl -s "${GITHUB_REPO_API}/releases" | grep '"tag_name":' | head -1 | sed -E 's/.*"([^"]+)".*/\1/' || echo "")
    fi
    echo "$latest_tag"
}

# Function to get currently installed version
get_installed_version() {
    if [ -f "$INSTALL_DIR/.installed_version" ]; then
        cat "$INSTALL_DIR/.installed_version"
    else
        echo "unknown"
    fi
}

# Function to download and update
download_and_update() {
    local version="$1"
    local release_url="https://github.com/nickelsound/scratch-editor-albilab/releases/download/${version}"
    local tar_file="scratch-universal-arm64.tar"
    
    cd "$INSTALL_DIR"
    
    log "Downloading new version ${version}..."
    
    # Download tar archive
    if wget --spider "${release_url}/${tar_file}" 2>/dev/null; then
        wget --progress=bar:force "${release_url}/${tar_file}" -O "${tar_file}"
        log "Tar archive downloaded"
    else
        log "Error: Tar archive does not exist at ${release_url}/${tar_file}"
        return 1
    fi
    
    # Load new image into Podman
    log "Loading new image into Podman..."
    podman load -i "${tar_file}" || {
        log "Error: Failed to load image"
        return 1
    }
    
    # Tag image
    if podman images | grep -q "scratch-universal"; then
        UNIVERSAL_TAG=$(podman images --format "{{.Repository}}:{{.Tag}}" | grep "scratch-universal" | head -1)
        podman tag "$UNIVERSAL_TAG" scratch-universal:latest
        podman tag "$UNIVERSAL_TAG" scratch-gui
        podman tag "$UNIVERSAL_TAG" scratch-backend
        log "Image tagged as scratch-universal:latest"
    fi
    
    # Restart service (use sudo because service runs as User)
    log "Restarting service with new image..."
    sudo systemctl restart scratch-albilab.service || {
        log "Error: Failed to restart service"
        return 1
    }
    
    # Save new version
    echo "$version" > "$INSTALL_DIR/.installed_version"
    
    log "Update to version ${version} completed successfully"
    return 0
}

# Main logic
main() {
    log "=== Update Check ==="
    
    # Check internet connection
    if ! ping -c 1 github.com > /dev/null 2>&1; then
        log "Error: No internet connection"
        exit 1
    fi
    
    # Get latest version
    latest_version=$(get_latest_version)
    if [ -z "$latest_version" ]; then
        log "Error: Failed to get latest version"
        exit 1
    fi
    
    # Get currently installed version
    installed_version=$(get_installed_version)
    
    log "Currently installed version: ${installed_version}"
    log "Latest available version: ${latest_version}"
    
    # Compare versions
    if [ "$installed_version" = "$latest_version" ]; then
        log "Application is already on the latest version"
        exit 0
    fi
    
    log "New version found! Updating from ${installed_version} to ${latest_version}..."
    
    # Perform update
    if download_and_update "$latest_version"; then
        log "Update completed successfully"
        exit 0
    else
        log "Error during update"
        exit 1
    fi
}

main "$@"
UPDATE_SCRIPT_EOF

    sudo chmod +x "$INSTALL_DIR/update-check.sh"
    sudo chown $USER:$USER "$INSTALL_DIR/update-check.sh"
    
    print_success "Automatic update script created"
}

# Create systemd service and timer for automatic updates
create_update_timer() {
    print_step "12" "Creating systemd timer for automatic updates..."
    
    # Create systemd service for update check
    sudo tee /etc/systemd/system/scratch-albilab-update.service > /dev/null << EOF
[Unit]
Description=Scratch Editor AlbiLAB - Automatic Update Check
After=network.target

[Service]
Type=oneshot
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/update-check.sh
User=$USER
Group=$USER
StandardOutput=journal
StandardError=journal
# Note: Script uses sudo to restart service
# Sudoers rule needs to be set for proper operation

[Install]
WantedBy=multi-user.target
EOF

    # Create sudoers rule for update script (allows service restart without password)
    print_info "Setting up sudoers rule for automatic updates..."
    sudo tee /etc/sudoers.d/scratch-albilab-update > /dev/null << SUDOERS_EOF
# Allow service restart for update script
$USER ALL=(ALL) NOPASSWD: /bin/systemctl restart scratch-albilab.service
SUDOERS_EOF

    sudo chmod 0440 /etc/sudoers.d/scratch-albilab-update

    # Create systemd timer (runs every day at 3:00)
    sudo tee /etc/systemd/system/scratch-albilab-update.timer > /dev/null << EOF
[Unit]
Description=Scratch Editor AlbiLAB - Automatic Update Timer
Requires=scratch-albilab-update.service

[Timer]
# Runs every day at 3:00:00
OnCalendar=*-*-* 03:00:00
Persistent=true
# Random delay 0-5 minutes to distribute load
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF

    # Reload systemd and enable timer
    sudo systemctl daemon-reload
    sudo systemctl enable scratch-albilab-update.timer
    sudo systemctl start scratch-albilab-update.timer
    
    print_success "Systemd timer created and enabled (runs every day at 3:00)"
}

# Start service
start_service() {
    print_step "13" "Starting service..."
    
    # If service is already running, restart it (for update)
    if sudo systemctl is-active --quiet scratch-albilab.service 2>/dev/null; then
        print_info "Service is already running, restarting to apply update..."
        sudo systemctl restart scratch-albilab.service
    else
        # Start service
        sudo systemctl start scratch-albilab.service
    fi
    
    # Wait for startup
    sleep 5
    
    # Check status
    if sudo systemctl is-active --quiet scratch-albilab.service; then
        print_success "Service started/restarted successfully"
    else
        print_error "Failed to start service"
        print_info "Check logs: sudo journalctl -u scratch-albilab.service"
        print_info "Check status: sudo systemctl status scratch-albilab.service"
        
        # Show last logs
        print_info "Last logs:"
        sudo journalctl -u scratch-albilab.service --no-pager -n 10
        
        exit 1
    fi
}

# Print final instructions
show_final_instructions() {
    IP=$(get_ip_address)
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Scratch Editor AlbiLAB - Installation completed! ✓${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Service is now running in the background.${NC}"
    echo ""
    echo -e "${YELLOW}Application access:${NC}"
    echo -e "  Frontend: http://$IP:8601"
    echo -e "  Backend API: http://$IP:3001"
    echo ""
    echo -e "${YELLOW}On another device on the network, open a browser and enter:${NC}"
    echo -e "  ${GREEN}http://$IP:8601${NC}"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo -e "  Service status:  ${BLUE}sudo systemctl status scratch-albilab${NC}"
    echo -e "  Stop service:     ${BLUE}sudo systemctl stop scratch-albilab${NC}"
    echo -e "  Start service:   ${BLUE}sudo systemctl start scratch-albilab${NC}"
    echo -e "  Restart service: ${BLUE}sudo systemctl restart scratch-albilab${NC}"
    echo -e "  View logs:       ${BLUE}podman-compose logs -f${NC}"
    echo ""
    echo -e "${YELLOW}Automatic updates:${NC}"
    echo -e "  Timer status:    ${BLUE}sudo systemctl status scratch-albilab-update.timer${NC}"
    echo -e "  Run check:        ${BLUE}sudo systemctl start scratch-albilab-update.service${NC}"
    echo -e "  View logs:        ${BLUE}sudo journalctl -u scratch-albilab-update.service${NC}"
    echo -e "  View log file:    ${BLUE}cat /opt/scratch-albilab/update-check.log${NC}"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
}

# Save current version
save_installed_version() {
    print_step "14" "Saving installed version information..."
    
    echo "$RELEASE_VERSION" > "$INSTALL_DIR/.installed_version"
    chmod 644 "$INSTALL_DIR/.installed_version"
    
    print_success "Version $RELEASE_VERSION saved"
}

# Main function
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
    create_update_check_script
    create_update_timer
    start_service
    save_installed_version
    show_final_instructions
}

# Run main function
main "$@"
