const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const WebSocket = require('ws');
const VirtualMachine = require('@scratch/scratch-vm');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Multer pro upload souborů
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Globální stav služby
let currentService = null;
let serviceStatus = {
    running: false,
    projectName: null,
    startTime: null,
    logs: []
};

// WebSocket server
const wss = new WebSocket.Server({ port: 3002 });

// Broadcast funkce pro WebSocket
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Logging funkce
function log(message, type = 'info', details = null) {
    const timestamp = new Date().toISOString();
    
    // Bezpečně serializuj details pro uložení do logů
    let safeDetails = null;
    if (details) {
        try {
            safeDetails = JSON.parse(JSON.stringify(details));
        } catch (error) {
            safeDetails = { error: 'Nelze serializovat details', originalType: typeof details };
        }
    }
    
    const logEntry = { timestamp, message, type, details: safeDetails };
    serviceStatus.logs.push(logEntry);
    
    // Udržuj pouze posledních 100 logů
    if (serviceStatus.logs.length > 100) {
        serviceStatus.logs = serviceStatus.logs.slice(-100);
    }
    
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    if (details) {
        try {
            console.log(`[${timestamp}] DETAILS:`, JSON.stringify(details, null, 2));
        } catch (error) {
            console.log(`[${timestamp}] DETAILS: [Cirkulární reference - nelze serializovat]`);
        }
    }
    broadcast({ type: 'log', data: logEntry });
}

// Zastavení aktuální služby
async function stopCurrentService() {
    if (currentService) {
        try {
            log('Zastavuji aktuální službu...', 'info');
            currentService.vm.stopAll();
            currentService.vm.quit();
            currentService = null;
            
            serviceStatus.running = false;
            serviceStatus.projectName = null;
            serviceStatus.startTime = null;
            
            log('Služba byla zastavena', 'success');
            broadcast({ type: 'serviceStopped' });
        } catch (error) {
            log(`Chyba při zastavování služby: ${error.message}`, 'error');
        }
    }
}

// Spuštění nové služby
async function startService(projectData, projectName) {
    try {
        // Zastav aktuální službu
        await stopCurrentService();
        
        log(`Spouštím novou službu: ${projectName}`, 'info', { 
            projectName, 
            projectDataSize: JSON.stringify(projectData).length,
            spritesCount: projectData.targets ? projectData.targets.length : 0
        });
        
        // Vytvoř novou VM instanci
        const vm = new VirtualMachine();
        log('Virtual Machine instance vytvořena', 'info');
        
        // Připoj AlbiLAB extension
        log('Načítám AlbiLAB extension...', 'info');
        await vm.extensionManager.loadExtensionURL('albilab');
        log('AlbiLAB extension úspěšně načtena', 'success');
        
        // Spusť VM
        vm.start();
        log('Virtual Machine spuštěna', 'info');
        
        // Načti projekt
        log('Načítám projekt do VM...', 'info');
        await vm.loadProject(projectData);
        log('Projekt úspěšně načten do VM', 'success');
        
        // Spusť projekt
        log('Spouštím projekt (green flag)...', 'info');
        vm.greenFlag();
        log('Projekt spuštěn', 'success');
        
        // Ulož referenci na službu
        currentService = {
            vm: vm,
            projectName: projectName,
            startTime: new Date()
        };
        
        // Aktualizuj stav
        serviceStatus.running = true;
        serviceStatus.projectName = projectName;
        serviceStatus.startTime = currentService.startTime;
        
        log(`Služba ${projectName} byla úspěšně spuštěna`, 'success', {
            startTime: currentService.startTime.toISOString(),
            vmState: 'running'
        });
        broadcast({ type: 'serviceStarted', data: { projectName, startTime: currentService.startTime } });
        
        // Sleduj chyby VM
        vm.on('error', (error) => {
            log(`VM chyba: ${error.message}`, 'error', {
                errorName: error.name,
                errorStack: error.stack,
                vmState: vm.runtime ? 'running' : 'stopped'
            });
        });
        
        // Sleduj ukončení VM
        vm.on('quit', () => {
            log('VM byla ukončena', 'info', {
                quitTime: new Date().toISOString(),
                uptime: currentService ? Date.now() - currentService.startTime.getTime() : 0
            });
            currentService = null;
            serviceStatus.running = false;
            serviceStatus.projectName = null;
            serviceStatus.startTime = null;
            broadcast({ type: 'serviceStopped' });
        });
        
        // Sleduj runtime události
        if (vm.runtime) {
            vm.runtime.on('PROJECT_LOADED', () => {
                log('Projekt byl načten do runtime', 'info');
            });
            
            vm.runtime.on('PROJECT_RUN_START', () => {
                log('Projekt začal běžet', 'info');
            });
            
            vm.runtime.on('PROJECT_RUN_STOP', () => {
                log('Projekt byl zastaven', 'info');
            });
        }
        
    } catch (error) {
        log(`Chyba při spouštění služby: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName
        });
        throw error;
    }
}

// API Routes

// Stav služby
app.get('/api/status', (req, res) => {
    const statusData = {
        ...serviceStatus,
        uptime: serviceStatus.startTime ? Date.now() - serviceStatus.startTime.getTime() : 0
    };
    
    log('API: Status requested', 'info', {
        serviceRunning: serviceStatus.running,
        projectName: serviceStatus.projectName,
        uptime: statusData.uptime,
        logsCount: serviceStatus.logs.length
    });
    
    res.json(statusData);
});

// Spuštění služby ze souboru
app.post('/api/start-service', upload.single('project'), async (req, res) => {
    try {
        log('API: Start service from file called', 'info', {
            hasFile: !!req.file,
            fileName: req.file ? req.file.originalname : null,
            fileSize: req.file ? req.file.size : null,
            projectName: req.body.projectName,
            currentService: currentService ? currentService.projectName : null
        });
        
        if (!req.file) {
            log('API: No file uploaded', 'error');
            return res.status(400).json({ error: 'Žádný soubor nebyl nahrán' });
        }
        
        const projectName = req.body.projectName || req.file.originalname || 'Neznámý projekt';
        
        // Načti projekt ze souboru
        log(`API: Reading project file: ${req.file.path}`, 'info');
        const projectData = await fs.readFile(req.file.path, 'utf8');
        const projectJson = JSON.parse(projectData);
        
        log(`API: Project file parsed successfully`, 'info', {
            projectName,
            fileSize: projectData.length,
            spritesCount: projectJson.targets ? projectJson.targets.length : 0
        });
        
        // Spusť službu
        await startService(projectJson, projectName);
        
        // Smaž dočasný soubor
        await fs.remove(req.file.path);
        log(`API: Temporary file removed: ${req.file.path}`, 'info');
        
        const response = { 
            success: true, 
            message: `Služba ${projectName} byla spuštěna`,
            projectName: projectName
        };
        
        log(`API: Service started successfully`, 'success', response);
        res.json(response);
        
    } catch (error) {
        log(`API: Error starting service from file: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            fileName: req.file ? req.file.originalname : null
        });
        res.status(500).json({ 
            error: 'Chyba při spouštění služby', 
            details: error.message 
        });
    }
});

// Spuštění služby z JSON dat
app.post('/api/start-service-json', async (req, res) => {
    try {
        log('API: Start service from JSON called', 'info', {
            hasProjectData: !!req.body.projectData,
            projectName: req.body.projectName,
            requestBodySize: JSON.stringify(req.body).length,
            currentService: currentService ? currentService.projectName : null
        });
        
        const { projectData, projectName } = req.body;
        
        if (!projectData) {
            log('API: Missing projectData in request', 'error');
            return res.status(400).json({ error: 'Chybí projectData' });
        }
        
        const name = projectName || 'Neznámý projekt';
        
        log(`API: Starting service with JSON data`, 'info', {
            projectName: name,
            projectDataSize: JSON.stringify(projectData).length,
            spritesCount: projectData.targets ? projectData.targets.length : 0
        });
        
        // Spusť službu
        await startService(projectData, name);
        
        const response = { 
            success: true, 
            message: `Služba ${name} byla spuštěna`,
            projectName: name
        };
        
        log(`API: Service started successfully from JSON`, 'success', response);
        res.json(response);
        
    } catch (error) {
        log(`API: Error starting service from JSON: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName: req.body.projectName
        });
        res.status(500).json({ 
            error: 'Chyba při spouštění služby', 
            details: error.message 
        });
    }
});

// Zastavení služby
app.post('/api/stop-service', async (req, res) => {
    try {
        log('API: Stop service called', 'info', {
            currentService: currentService ? currentService.projectName : null,
            serviceRunning: serviceStatus.running,
            uptime: currentService ? Date.now() - currentService.startTime.getTime() : 0
        });
        
        await stopCurrentService();
        
        const response = { success: true, message: 'Služba byla zastavena' };
        log('API: Service stopped successfully', 'success', response);
        res.json(response);
        
    } catch (error) {
        log(`API: Error stopping service: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            currentService: currentService ? currentService.projectName : null
        });
        res.status(500).json({ 
            error: 'Chyba při zastavování služby', 
            details: error.message 
        });
    }
});

// Logy služby
app.get('/api/logs', (req, res) => {
    log('API: Logs requested', 'info', {
        logsCount: serviceStatus.logs.length,
        oldestLog: serviceStatus.logs.length > 0 ? serviceStatus.logs[0].timestamp : null,
        newestLog: serviceStatus.logs.length > 0 ? serviceStatus.logs[serviceStatus.logs.length - 1].timestamp : null
    });
    
    res.json(serviceStatus.logs);
});

// WebSocket připojení
wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    log(`Nové WebSocket připojení (ID: ${clientId})`, 'info', {
        clientId,
        totalConnections: wss.clients.size,
        clientIP: ws._socket ? ws._socket.remoteAddress : 'unknown'
    });
    
    // Pošli aktuální stav
    const statusData = {
        type: 'status', 
        data: {
            ...serviceStatus,
            uptime: serviceStatus.startTime ? Date.now() - serviceStatus.startTime.getTime() : 0
        }
    };
    
    ws.send(JSON.stringify(statusData));
    log(`Status data odeslána klientovi ${clientId}`, 'info', {
        clientId,
        statusType: statusData.type,
        serviceRunning: statusData.data.running,
        projectName: statusData.data.projectName,
        logsCount: statusData.data.logs ? statusData.data.logs.length : 0
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            log(`WebSocket zpráva od klienta ${clientId}`, 'info', {
                clientId,
                messageType: data.type,
                messageData: data
            });
        } catch (error) {
            log(`Chyba při parsování WebSocket zprávy od klienta ${clientId}`, 'error', {
                clientId,
                rawMessage: message.toString(),
                error: error.message
            });
        }
    });
    
    ws.on('close', (code, reason) => {
        log(`WebSocket připojení ukončeno (ID: ${clientId})`, 'info', {
            clientId,
            closeCode: code,
            closeReason: reason ? reason.toString() : 'no reason',
            remainingConnections: wss.clients.size - 1
        });
    });
    
    ws.on('error', (error) => {
        log(`WebSocket chyba pro klienta ${clientId}`, 'error', {
            clientId,
            error: error.message,
            errorStack: error.stack
        });
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    log('Přijat SIGINT, ukončuji server...', 'info');
    await stopCurrentService();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('Přijat SIGTERM, ukončuji server...', 'info');
    await stopCurrentService();
    process.exit(0);
});

// Spusť server
app.listen(PORT, () => {
    log(`Backend server běží na portu ${PORT}`, 'info');
    log(`WebSocket server běží na portu 3002`, 'info');
});

module.exports = app;
