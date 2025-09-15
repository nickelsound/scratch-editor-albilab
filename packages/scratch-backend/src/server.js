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
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    serviceStatus.logs.push(logEntry);
    
    // Udržuj pouze posledních 100 logů
    if (serviceStatus.logs.length > 100) {
        serviceStatus.logs = serviceStatus.logs.slice(-100);
    }
    
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
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
        
        log(`Spouštím novou službu: ${projectName}`, 'info');
        
        // Vytvoř novou VM instanci
        const vm = new VirtualMachine();
        
        // Připoj AlbiLAB extension
        await vm.extensionManager.loadExtensionURL('albilab');
        
        // Spusť VM
        vm.start();
        
        // Načti projekt
        await vm.loadProject(projectData);
        
        // Spusť projekt
        vm.greenFlag();
        
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
        
        log(`Služba ${projectName} byla úspěšně spuštěna`, 'success');
        broadcast({ type: 'serviceStarted', data: { projectName, startTime: currentService.startTime } });
        
        // Sleduj chyby VM
        vm.on('error', (error) => {
            log(`VM chyba: ${error.message}`, 'error');
        });
        
        // Sleduj ukončení VM
        vm.on('quit', () => {
            log('VM byla ukončena', 'info');
            currentService = null;
            serviceStatus.running = false;
            serviceStatus.projectName = null;
            serviceStatus.startTime = null;
            broadcast({ type: 'serviceStopped' });
        });
        
    } catch (error) {
        log(`Chyba při spouštění služby: ${error.message}`, 'error');
        throw error;
    }
}

// API Routes

// Stav služby
app.get('/api/status', (req, res) => {
    res.json({
        ...serviceStatus,
        uptime: serviceStatus.startTime ? Date.now() - serviceStatus.startTime.getTime() : 0
    });
});

// Spuštění služby ze souboru
app.post('/api/start-service', upload.single('project'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Žádný soubor nebyl nahrán' });
        }
        
        const projectName = req.body.projectName || req.file.originalname || 'Neznámý projekt';
        
        // Načti projekt ze souboru
        const projectData = await fs.readFile(req.file.path, 'utf8');
        const projectJson = JSON.parse(projectData);
        
        // Spusť službu
        await startService(projectJson, projectName);
        
        // Smaž dočasný soubor
        await fs.remove(req.file.path);
        
        res.json({ 
            success: true, 
            message: `Služba ${projectName} byla spuštěna`,
            projectName: projectName
        });
        
    } catch (error) {
        log(`Chyba při spouštění služby: ${error.message}`, 'error');
        res.status(500).json({ 
            error: 'Chyba při spouštění služby', 
            details: error.message 
        });
    }
});

// Spuštění služby z JSON dat
app.post('/api/start-service-json', async (req, res) => {
    try {
        const { projectData, projectName } = req.body;
        
        if (!projectData) {
            return res.status(400).json({ error: 'Chybí projectData' });
        }
        
        const name = projectName || 'Neznámý projekt';
        
        // Spusť službu
        await startService(projectData, name);
        
        res.json({ 
            success: true, 
            message: `Služba ${name} byla spuštěna`,
            projectName: name
        });
        
    } catch (error) {
        log(`Chyba při spouštění služby: ${error.message}`, 'error');
        res.status(500).json({ 
            error: 'Chyba při spouštění služby', 
            details: error.message 
        });
    }
});

// Zastavení služby
app.post('/api/stop-service', async (req, res) => {
    try {
        await stopCurrentService();
        res.json({ success: true, message: 'Služba byla zastavena' });
    } catch (error) {
        log(`Chyba při zastavování služby: ${error.message}`, 'error');
        res.status(500).json({ 
            error: 'Chyba při zastavování služby', 
            details: error.message 
        });
    }
});

// Logy služby
app.get('/api/logs', (req, res) => {
    res.json(serviceStatus.logs);
});

// WebSocket připojení
wss.on('connection', (ws) => {
    log('Nové WebSocket připojení', 'info');
    
    // Pošli aktuální stav
    ws.send(JSON.stringify({ 
        type: 'status', 
        data: {
            ...serviceStatus,
            uptime: serviceStatus.startTime ? Date.now() - serviceStatus.startTime.getTime() : 0
        }
    }));
    
    ws.on('close', () => {
        log('WebSocket připojení ukončeno', 'info');
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
