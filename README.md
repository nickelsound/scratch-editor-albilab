# Scratch Editor AlbiLAB

**🇨🇿 [Česká verze / Czech version](README_cs.md)**

**Program your AlbiLAB scientific station with Scratch!** 🧪🔬

This project extends the innovative [AlbiLAB scientific station](https://www.albilab.cz) with programming capabilities through Scratch. AlbiLAB is a modular educational kit that combines electronics, construction blocks, and laboratory equipment to create a complete scientific workstation for children and families.

## What is AlbiLAB?

AlbiLAB is an innovative scientific station that includes:
- **Electronics**: Control board, LED rings, color display, wires, power bank, adapter, USB cable
- **Construction blocks**: Magnetic cubes, covers and reducers for internal equipment, metallized strips, cutter
- **Laboratory equipment**: Test tubes, syringe, beaker, pipette, magnifying glass, Petri dishes, tweezers, pH papers
- **Growing kit**: Growing containers and substrate, expanded clay, Arabidopsis thaliana seeds, scientific diary

## What does this project add?

This Scratch Editor AlbiLAB project allows you to:
- **Program your AlbiLAB station** using the familiar Scratch visual programming language
- **Control experiments** and scientific measurements through code
- **Create interactive projects** that respond to sensors and control outputs
- **Save and load projects** directly to/from your AlbiLAB station
- **Learn programming** while conducting real scientific experiments

Perfect for children, parents, and educators who want to combine hands-on science with programming education!

<a href="docs/albilab-scratch.png" target="_blank">
  <img src="docs/albilab-scratch.png" alt="AlbiLAB Scratch Editor" width="600" style="max-width: 100%; height: auto;">
</a>
*Screenshot of the Scratch Editor AlbiLAB interface showing the modified menu with AlbiLAB integration buttons (click to view full size)*

## Continuous Operation Required

**This solution must run continuously** because the created Scratch programs run on this backend service and control the AlbiLAB station through its API. Once you upload a project, it runs on this backend and communicates with the AlbiLAB station to execute the programmed logic.

## 🚀 Quick Start

### Prerequisites

- **Docker** or **Podman** installed in the system
- **Docker Compose** or **Podman Compose** installed
- At least 2GB of free disk space
- Ports 8601 and 3001 available in the system

### Running the Application

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd scratch-editor-albilab
   ```

2. **Start the application:**
   
   **With Docker Compose:**
   ```bash
   docker-compose up --build
   ```
   
   **With Podman Compose:**
   ```bash
   podman-compose up --build
   ```

3. **Open the application in your browser:**
   - Scratch Editor: http://localhost:8601
   - Backend API: http://localhost:3001

## 📋 Features

### Core Features
- **Scratch Editor**: Full-featured web editor for Scratch projects
- **AlbiLAB Integration**: Direct connection to your AlbiLAB scientific station
- **Project Saving**: Projects are automatically saved to AlbiLAB station
- **Project Loading**: Ability to load previously saved projects from AlbiLAB
- **Auto-save**: Automatic saving of changes every 30 seconds
- **Real-time Control**: Control your AlbiLAB experiments through Scratch code

### AlbiLAB-Specific Features
- **Sensor Integration**: Read data from AlbiLAB sensors (temperature, light, pH, etc.)
- **Output Control**: Control LED rings, displays, and other AlbiLAB components
- **Experiment Automation**: Automate scientific experiments and data collection
- **Data Logging**: Record and analyze experimental data over time
- **IP Configuration**: Set AlbiLAB device IP address using Scratch blocks
- **Validation**: Automatic validation of required IP configuration component

### Modified Menu
- **Hidden buttons**: Share/Shared, Remix, See Project Page
- **Hidden sections**: My Stuff, Scratch Cat
- **New buttons**:
  - "Upload to AlbiLAB" - upload and run project on your station
  - "Load from AlbiLAB" - load saved project from your station
  - Auto-save indicator

## 🏗️ Architecture

### Services

1. **scratch-gui** (Port 8601)
   - React frontend application
   - Scratch editor interface
   - WebSocket connection to backend

2. **scratch-backend-app** (Port 3001)
   - Node.js/Express backend server
   - REST API for project management
   - WebSocket server for real-time communication
   - Automatic execution of saved projects

### Data Volumes

- **./uploads**: Persistent storage for projects and configuration (bind mount)
  - `saved-project.json` - currently saved project
  - `uploads/` - folder for uploaded files

## 🔧 Configuration

### AlbiLAB IP Address Configuration

**IMPORTANT**: The AlbiLAB device IP address is configured **only** using the Scratch block "set AlbiLAB IP address to [IP]" in each project. This component is **mandatory** for any project using AlbiLAB functions.

### Environment Variables

**scratch-gui:**
```yaml
REACT_APP_BACKEND_URL: http://localhost:3001
PORT: 8601
```

**scratch-backend-app:**
```yaml
PORT: 3001
WEBSOCKET_PORT: 3002
```

### Runtime Backend URL Configuration

The frontend can be configured to call the backend on a different address (e.g., behind a reverse proxy) using environment variables in `docker-compose.yml`. This is useful when running the system behind a reverse proxy.

**Configuration in docker-compose.yml:**

```yaml
services:
  scratch-gui:
    environment:
      - NODE_ENV=production
      - APP_MODE=frontend
      - PORT=8601
      # Runtime backend URL configuration (optional)
      # If not set, defaults to localhost:3001
      - REACT_APP_API_BASE_URL=http://10.0.0.106:8080
      - REACT_APP_WS_BASE_URL=ws://10.0.0.106:8080
```

**Examples:**

1. **Direct backend connection:**
   ```yaml
   - REACT_APP_API_BASE_URL=http://10.0.0.106:8080
   - REACT_APP_WS_BASE_URL=ws://10.0.0.106:8080
   ```

2. **Reverse proxy with /api prefix:**
   ```yaml
   - REACT_APP_API_BASE_URL=http://reverse-proxy.example.com/api
   - REACT_APP_WS_BASE_URL=wss://reverse-proxy.example.com/api
   ```

3. **HTTPS/WSS:**
   ```yaml
   - REACT_APP_API_BASE_URL=https://example.com
   - REACT_APP_WS_BASE_URL=wss://example.com
   ```

**Note:** The frontend automatically adds `/api` prefix to endpoints, so if your backend expects paths like `/api/status`, use the base URL without `/api`. If your reverse proxy already includes `/api` in the URL, add it to the base URL.

### Ports

- **8601**: Frontend application (Scratch Editor)
- **3001**: Backend API
- **3002**: WebSocket server (internal communication)

## 📡 API Endpoints

### Projects
- `POST /api/start-service-json` - Start new project (JSON data)
- `POST /api/start-service` - Start new project (file upload)
- `POST /api/stop-service` - Stop running project
- `GET /api/status` - Service status
- `GET /api/logs` - Service logs

### Saved Projects
- `GET /api/saved-project` - Information about saved project
- `GET /api/saved-project/load` - Load project data
- `POST /api/saved-project/auto-save` - Auto-save
- `DELETE /api/saved-project` - Delete saved project

## 🛠️ Development

### Local Development

1. **Install dependencies:**
   ```bash
   # Frontend
   cd packages/scratch-gui
   npm install
   
   # Backend
   cd packages/scratch-backend
   npm install
   ```

2. **Run in development mode:**
   ```bash
   # Frontend (port 8601)
   cd packages/scratch-gui
   npm start
   
   # Backend (port 3001)
   cd packages/scratch-backend
   npm run dev
   ```

### Rebuild Containers

```bash
# Docker Compose
docker-compose down
docker-compose up --build

# Podman Compose
podman-compose down
podman-compose up --build
```

## 📁 Project Structure

```
scratch-editor-albilab/
├── packages/
│   ├── scratch-gui/                 # Frontend application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── menu-bar/        # Modified menu components
│   │   │   ├── containers/          # Redux containers
│   │   │   └── lib/                 # Utility functions
│   │   └── Dockerfile
│   └── scratch-backend/             # Backend application
│       ├── src/
│       │   ├── server.js            # Main server
│       │   └── startup.js           # Startup scripts
│       └── Dockerfile.universal
├── docker-compose.yml               # Service orchestration
└── README.md
```

## 🔍 Troubleshooting

### Common Issues

1. **Ports are occupied:**
   ```bash
   # Check occupied ports
   netstat -tulpn | grep :8601
   netstat -tulpn | grep :3001
   
   # Stop conflicting services or change ports in docker-compose.yml
   ```

2. **Containers won't start:**
   ```bash
   # Check logs
   docker-compose logs
   # or
   podman-compose logs
   
   # Try rebuild
   docker-compose up --build --force-recreate
   ```

3. **Projects won't save:**
   ```bash
   # Check volume mounts
   docker volume ls
   
   # Check uploads folder permissions
   ls -la uploads/
   ```

4. **WebSocket connection fails:**
   - Check that backend is running on port 3001
   - Verify firewall settings
   - Check backend logs for errors

5. **AlbiLAB communication issues:**
   - Ensure project contains "set AlbiLAB IP address to [IP]" block with filled IP address
   - Check network connection to AlbiLAB device
   - Verify IP address in the block is correct

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f scratch-gui
docker-compose logs -f scratch-backend-app

# Last 50 lines
docker-compose logs --tail=50
```

## 🔄 Updates

### Code Updates

1. **Stop services:**
   ```bash
   docker-compose down
   ```

2. **Update code:**
   ```bash
   git pull origin main
   ```

3. **Restart with rebuild:**
   ```bash
   docker-compose up --build
   ```

### Data Backup

```bash
# Backup uploads folder
tar czf uploads-backup.tar.gz -C ./uploads .

# Restore backup
tar xzf uploads-backup.tar.gz -C ./uploads
```

## 🍓 ARM Processors (Raspberry Pi)

### 🚀 One-Command Installation

For Raspberry Pi OS Lite, you can install everything with a single command:

```bash
curl -sSL https://raw.githubusercontent.com/nickelsound/scratch-editor-albilab/refs/heads/main/install.sh | bash
```

**Or manually:**
```bash
wget https://raw.githubusercontent.com/nickelsound/scratch-editor-albilab/refs/heads/main/install.sh
chmod +x install.sh
./install.sh
```

The installation script will:
- ✅ Check system compatibility (Raspberry Pi OS, ARM64)
- ✅ Install Podman and podman-compose
- ✅ Download universal ARM64 container from GitHub releases
- ✅ Load container into Podman
- ✅ Create systemd service for auto-start
- ✅ Start the application in background
- ✅ Display IP address for network access

After installation, access the application at `http://[RASPBERRY_PI_IP]:8601`

### Manual Installation

If you prefer manual installation or need to build containers yourself:

#### Prerequisites for ARM build

- **Podman** installed in the system
- **Docker Compose** or **Podman Compose**
- At least 4GB RAM for build process
- Sufficient disk space (build may require 10GB+)

#### Building ARM versions

1. **Run Universal ARM build script:**
   ```bash
   chmod +x build-arm-universal.sh
   ./build-arm-universal.sh
   ```

2. **Result:**
   - `scratch-universal-arm64.tar` - Universal container for ARM64 (contains both frontend and backend)
   - If the file is larger than 1.8GB, it will be split into parts: `scratch-universal-arm64.tar.00`, `scratch-universal-arm64.tar.01`, etc.

#### Manual Deployment on Raspberry Pi

1. **Transfer tar archive to Raspberry Pi:**
   
   If the file was split into parts, first assemble it:
   ```bash
   cat scratch-universal-arm64.tar.* > scratch-universal-arm64.tar
   ```
   
   Then transfer to Raspberry Pi:
   ```bash
   scp scratch-universal-arm64.tar pi@raspberry-pi-ip:~/
   ```

2. **On Raspberry Pi load image:**
   ```bash
   podman load -i scratch-universal-arm64.tar
   
   # Tag the image for docker-compose.yml
   podman tag scratch-universal:latest scratch-universal:latest
   ```

3. **Create docker-compose.yml and start the application:**
   ```bash
   # Create docker-compose.yml (see install.sh for reference)
   # Or use the one created by install.sh
   podman-compose up -d
   ```

#### ARM specific configurations

**Ports for ARM version:**
- **8601**: Frontend application
- **3001**: Backend API
- **3002**: WebSocket server

**Environment variables for ARM:**
```yaml
# scratch-gui (ARM)
REACT_APP_BACKEND_URL: http://localhost:3001
PORT: 8601

# scratch-backend-app (ARM)
PORT: 3001
WEBSOCKET_PORT: 3002
```

#### ARM build troubleshooting

1. **Build fails due to memory:**
   ```bash
   # Increase swap
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **NPM timeout errors:**
   ```bash
   # Increase timeout before build
   npm config set fetch-timeout 300000
   npm config set fetch-retry-mintimeout 20000
   ```

3. **Podman build errors:**
   ```bash
   # Clean cache
   podman system prune -a -f
   npm cache clean --force
   ```

#### Complete Raspberry Pi setup

For complete setup on Raspberry Pi with touchscreen see [README-RPI.md](README-RPI.md).

#### Service Management

After installation, you can manage the service with:

```bash
# Check service status
sudo systemctl status scratch-albilab

# Stop service
sudo systemctl stop scratch-albilab

# Start service
sudo systemctl start scratch-albilab

# Restart service
sudo systemctl restart scratch-albilab

# View logs
cd /opt/scratch-albilab
podman-compose logs -f
```

For detailed installation instructions, see [README-INSTALL.md](README-INSTALL.md).

## 🤝 Support

For technical support or issue reporting:
- Create an issue in the repository
- Contact the AlbiLAB development team

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**Note**: This project is a modification of the official Scratch editor specifically designed to enable programming of AlbiLAB scientific stations. It bridges the gap between visual programming education and hands-on scientific experimentation, making it perfect for children, families, and educators who want to combine coding with real-world science.
