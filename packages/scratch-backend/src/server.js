const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const WebSocket = require('ws');
const VirtualMachine = require('@scratch/scratch-vm');
const { runStartupScript } = require('./startup');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Multer pro upload souborů
const upload = multer({ 
    dest: '/app/uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Globální stav služeb - podpora pro více paralelních služeb
let runningServices = new Map(); // Map<projectName, serviceInfo>
let serviceLogs = [];

// Cesta k uloženému projektu - ukládáme do uploads volume, které je trvalé
// V Docker kontejneru je process.cwd() /app/packages/scratch-backend, ale uploads je mapováno na /app/uploads
const SAVED_PROJECT_PATH = path.join('/app', 'uploads', 'saved-project.json');
const AUTO_SAVE_DIR = path.join('/app', 'uploads', 'auto-save');
const RUNNING_PROJECTS_PATH = path.join('/app', 'uploads', 'running-projects.json');

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

// Získání informací o službě
function getServiceInfo(projectName) {
    return runningServices.get(projectName);
}

// Získání seznamu všech běžících služeb
function getAllRunningServices() {
    const services = [];
    for (const [projectName, serviceInfo] of runningServices) {
        services.push({
            projectName,
            isRunning: true,
            startTime: serviceInfo.startTime,
            uptime: Date.now() - serviceInfo.startTime.getTime()
        });
    }
    return services;
}

// Pomocná funkce pro sanitizaci názvu souboru (stejná jako při ukládání)
function sanitizeFileName(projectName) {
    return projectName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
}

// Kontrola, zda je služba nasazena (uložena v AlbiLAB)
async function isProjectDeployed(projectName) {
    try {
        // Zkontroluj, zda je projekt uložen v AlbiLAB (deployed-projects adresář)
        const deployedProjectsDir = path.join('/app', 'uploads', 'deployed-projects');
        const safeFileName = sanitizeFileName(projectName);
        const deployedProjectPath = path.join(deployedProjectsDir, safeFileName);
        return await fs.pathExists(deployedProjectPath);
    } catch (error) {
        log(`Chyba při kontrole nasazení projektu ${projectName}: ${error.message}`, 'error');
        return false;
    }
}

// Uložení projektu do trvalého úložiště
async function saveProject(projectData, projectName, isAutoSave = false) {
    try {
        // Ověř, že projectData je string (vm.toJSON() vrací string)
        if (typeof projectData !== 'string') {
            log(`Error: projectData is not a string when saving project ${projectName}, type: ${typeof projectData}`, 'error');
            return false;
        }
        
        // Zkontroluj, jestli je to validní JSON string
        try {
            const parsed = JSON.parse(projectData);
            // Pokud se to podařilo parsovat, zkontroluj, jestli to není znovu string (double-encoded)
            if (typeof parsed === 'string') {
                log(`Warning: projectData appears to be double-encoded for project ${projectName}`, 'warn');
                // Použijeme už parsovaný string
                projectData = parsed;
            }
        } catch (parseError) {
            // Pokud se to nedá parsovat, může to být problém
            log(`Warning: projectData may not be valid JSON for project ${projectName}: ${parseError.message}`, 'warn');
        }
        
        const projectInfo = {
            projectData: projectData, // Ukládáme jako JSON string (vm.toJSON() vrací string)
            projectName: projectName,
            savedAt: new Date().toISOString(),
            version: '1.0',
            isAutoSave: isAutoSave
        };
        
        let filePath;
        if (isAutoSave) {
            // Pro auto-save vytvoř adresář a ulož podle názvu projektu
            await fs.ensureDir(AUTO_SAVE_DIR);
            const safeFileName = sanitizeFileName(projectName);
            filePath = path.join(AUTO_SAVE_DIR, safeFileName);
        } else {
            // Pro nasazené projekty vytvoř adresář deployed-projects
            const deployedProjectsDir = path.join('/app', 'uploads', 'deployed-projects');
            await fs.ensureDir(deployedProjectsDir);
            const safeFileName = sanitizeFileName(projectName);
            filePath = path.join(deployedProjectsDir, safeFileName);
        }
        
        // Ulož pomocí writeJson, který správně zpracuje string v objektu
        await fs.writeJson(filePath, projectInfo, { spaces: 2 });
        log(`Projekt ${projectName} byl uložen do trvalého úložiště`, 'success', {
            savedAt: projectInfo.savedAt,
            filePath: filePath,
            isAutoSave: isAutoSave
        });
        
        return true;
    } catch (error) {
        log(`Chyba při ukládání projektu: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName,
            isAutoSave: isAutoSave
        });
        return false;
    }
}

// Načtení uloženého projektu
async function loadSavedProject() {
    try {
        if (await fs.pathExists(SAVED_PROJECT_PATH)) {
            const projectInfo = await fs.readJson(SAVED_PROJECT_PATH);
            log(`Načten uložený projekt: ${projectInfo.projectName}`, 'info', {
                savedAt: projectInfo.savedAt,
                version: projectInfo.version
            });
            return projectInfo;
        } else {
            log('Žádný uložený projekt nebyl nalezen', 'info');
            return null;
        }
    } catch (error) {
        log(`Chyba při načítání uloženého projektu: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack
        });
        return null;
    }
}

// Načtení auto-save projektu podle názvu
async function loadAutoSaveProject(projectName) {
    try {
        if (!projectName || projectName === 'Neznámý projekt') {
            log('Název projektu není zadán pro auto-save načtení', 'info');
            return null;
        }
        
        // Pokud adresář neexistuje, projekt neexistuje
        if (!await fs.pathExists(AUTO_SAVE_DIR)) {
            log(`Auto-save projekt ${projectName} nebyl nalezen - adresář neexistuje`, 'info');
            return null;
        }
        
        // Nejdříve zkus najít soubor přímo podle sanitizovaného názvu (rychlejší)
        const safeFileName = sanitizeFileName(projectName);
        const directFilePath = path.join(AUTO_SAVE_DIR, safeFileName);
        
        if (await fs.pathExists(directFilePath)) {
            try {
                const projectInfo = await fs.readJson(directFilePath);
                // Ověř, že originální název v souboru odpovídá hledanému názvu
                if (projectInfo.projectName === projectName) {
                    log(`Auto-save projekt načten (přímý přístup): ${projectInfo.projectName}`, 'info', {
                        savedAt: projectInfo.savedAt,
                        version: projectInfo.version,
                        filePath: directFilePath
                    });
                    return projectInfo;
                }
            } catch (error) {
                log(`Chyba při načítání souboru ${safeFileName}: ${error.message}`, 'error');
            }
        }
        
        // Fallback: Projdi všechny soubory a hledej podle originálního názvu
        // (pro případ, že sanitizace vytvořila duplicitní názvy)
        const files = await fs.readdir(AUTO_SAVE_DIR);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(AUTO_SAVE_DIR, file);
                    const projectInfo = await fs.readJson(filePath);
                    
                    // Porovnej originální názvy (case-sensitive)
                    if (projectInfo.projectName === projectName) {
                        log(`Auto-save projekt načten (fallback): ${projectInfo.projectName}`, 'info', {
                            savedAt: projectInfo.savedAt,
                            version: projectInfo.version,
                            filePath: filePath
                        });
                        return projectInfo;
                    }
                } catch (error) {
                    log(`Chyba při načítání souboru ${file}: ${error.message}`, 'error');
                }
            }
        }
        
        log(`Auto-save projekt ${projectName} nebyl nalezen`, 'info');
        return null;
    } catch (error) {
        log(`Chyba při načítání auto-save projektu: ${error.message}`, 'error');
        return null;
    }
}

// Automatické spuštění uloženého projektu při startu
async function autoStartSavedProject() {
    try {
        log('Kontroluji uložený projekt pro automatické spuštění...', 'info');
        
        const savedProject = await loadSavedProject();
        if (savedProject) {
            log(`Spouštím automaticky uložený projekt: ${savedProject.projectName}`, 'info');
            await startService(savedProject.projectData, savedProject.projectName);
            return true;
        } else {
            log('Žádný projekt k automatickému spuštění', 'info');
            return false;
        }
    } catch (error) {
        log(`Chyba při automatickém spuštění projektu: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack
        });
        return false;
    }
}

// Uložení seznamu běžících projektů
async function saveRunningProjects() {
    try {
        const runningProjectsList = Array.from(runningServices.keys());
        const data = {
            projects: runningProjectsList,
            lastUpdated: new Date().toISOString()
        };
        await fs.writeJson(RUNNING_PROJECTS_PATH, data, { spaces: 2 });
    } catch (error) {
        log(`Chyba při ukládání seznamu běžících projektů: ${error.message}`, 'error');
    }
}

// Načtení seznamu běžících projektů
async function loadRunningProjects() {
    try {
        if (await fs.pathExists(RUNNING_PROJECTS_PATH)) {
            const data = await fs.readJson(RUNNING_PROJECTS_PATH);
            return data.projects || [];
        }
        return [];
    } catch (error) {
        log(`Chyba při načítání seznamu běžících projektů: ${error.message}`, 'error');
        return [];
    }
}

// Automatické spuštění projektů, které byly spuštěné před restartem
async function autoStartDeployedProjects() {
    try {
        log('Kontroluji projekty, které byly spuštěné před restartem...', 'info');
        
        // Načti seznam projektů, které byly spuštěné
        const runningProjectsList = await loadRunningProjects();
        
        if (runningProjectsList.length === 0) {
            log('Žádné projekty k automatickému spuštění (nebyly spuštěné před restartem)', 'info');
            return 0;
        }
        
        log(`Našel ${runningProjectsList.length} projektů, které byly spuštěné před restartem`, 'info');
        
        const deployedProjectsDir = path.join('/app', 'uploads', 'deployed-projects');
        
        // Zkontroluj, zda adresář existuje
        if (!await fs.pathExists(deployedProjectsDir)) {
            log('Adresář deployed-projects neexistuje, žádné projekty k automatickému spuštění', 'info');
            return 0;
        }
        
        let startedCount = 0;
        for (const projectName of runningProjectsList) {
            try {
                // Načti projekt z deployed-projects nebo auto-save
                let projectInfo = null;
                
                // Nejdříve zkus najít v deployed-projects
                const safeFileName = sanitizeFileName(projectName);
                const deployedProjectPath = path.join(deployedProjectsDir, safeFileName);
                
                if (await fs.pathExists(deployedProjectPath)) {
                    projectInfo = await fs.readJson(deployedProjectPath);
                } else {
                    // Pokud není v deployed-projects, zkus auto-save
                    projectInfo = await loadAutoSaveProject(projectName);
                }
                
                if (!projectInfo) {
                    log(`Projekt ${projectName} nebyl nalezen v deployed-projects ani auto-save, přeskočeno`, 'warn');
                    continue;
                }
                
                // Zpracuj projectData - může být string nebo objekt
                let actualProjectData = projectInfo.projectData;
                if (typeof actualProjectData === 'string') {
                    try {
                        actualProjectData = JSON.parse(actualProjectData);
                    } catch (parseError) {
                        log(`Chyba při parsování projectData pro ${projectName}: ${parseError.message}`, 'error');
                        continue;
                    }
                }
                
                // Validace přítomnosti IP komponenty
                if (!validateAlbiLABIPComponent(actualProjectData)) {
                    log(`Projekt ${projectName} nemá AlbiLAB IP komponentu, přeskočeno`, 'warn');
                    continue;
                }
                
                // Spusť projekt
                log(`Spouštím automaticky projekt, který byl spuštěný před restartem: ${projectName}`, 'info');
                await startService(actualProjectData, projectName);
                startedCount++;
                
                // Počkej chvilku mezi spouštěním projektů
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                log(`Chyba při automatickém spuštění projektu ${projectName}: ${error.message}`, 'error', {
                    errorName: error.name,
                    errorStack: error.stack
                });
            }
        }
        
        log(`Automaticky spuštěno ${startedCount} z ${runningProjectsList.length} projektů, které byly spuštěné před restartem`, startedCount > 0 ? 'success' : 'info');
        return startedCount;
        
    } catch (error) {
        log(`Chyba při automatickém spuštění projektů: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack
        });
        return 0;
    }
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
    serviceLogs.push(logEntry);
    
    // Udržuj pouze posledních 100 logů
    if (serviceLogs.length > 100) {
        serviceLogs = serviceLogs.slice(-100);
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

// Zastavení konkrétní služby
async function stopService(projectName) {
    const serviceInfo = runningServices.get(projectName);
    if (serviceInfo) {
        try {
            log(`Zastavuji službu: ${projectName}`, 'info');
            serviceInfo.vm.stopAll();
            serviceInfo.vm.quit();
            runningServices.delete(projectName);
            
            // Ulož aktualizovaný seznam běžících projektů
            await saveRunningProjects();
            
            log(`Služba ${projectName} byla zastavena`, 'success');
            broadcast({ type: 'serviceStopped', data: { projectName } });
            return true;
        } catch (error) {
            log(`Chyba při zastavování služby ${projectName}: ${error.message}`, 'error');
            return false;
        }
    }
    return false;
}

// Zastavení všech služeb
async function stopAllServices() {
    const projectNames = Array.from(runningServices.keys());
    for (const projectName of projectNames) {
        await stopService(projectName);
    }
}

// Spuštění nové služby
async function startService(projectData, projectName) {
    try {
        // Pokud služba už běží, zastav ji
        if (runningServices.has(projectName)) {
            await stopService(projectName);
        }
        
        log(`Spouštím službu: ${projectName}`, 'info', { 
            projectName, 
            projectDataSize: JSON.stringify(projectData).length,
            spritesCount: projectData.targets ? projectData.targets.length : 0,
            runningServicesCount: runningServices.size
        });
        
        // Vytvoř novou VM instanci
        const vm = new VirtualMachine();
        log(`Virtual Machine instance vytvořena pro ${projectName}`, 'info');
        
        // Připoj AlbiLAB extension
        log(`Načítám AlbiLAB extension pro ${projectName}...`, 'info');
        await vm.extensionManager.loadExtensionURL('albilab');
        log(`AlbiLAB extension úspěšně načtena pro ${projectName}`, 'success');
        
        // Spusť VM
        vm.start();
        log(`Virtual Machine spuštěna pro ${projectName}`, 'info');
        
        // Načti projekt
        log(`Načítám projekt do VM pro ${projectName}...`, 'info');
        await vm.loadProject(projectData);
        log(`Projekt úspěšně načten do VM pro ${projectName}`, 'success');
        
        // Spusť projekt
        log(`Spouštím projekt (green flag) pro ${projectName}...`, 'info');
        vm.greenFlag();
        log(`Projekt spuštěn pro ${projectName}`, 'success');
        
        // Ulož referenci na službu
        const serviceInfo = {
            vm: vm,
            projectName: projectName,
            startTime: new Date()
        };
        runningServices.set(projectName, serviceInfo);
        
        log(`Služba ${projectName} byla úspěšně spuštěna`, 'success', {
            startTime: serviceInfo.startTime.toISOString(),
            vmState: 'running',
            totalRunningServices: runningServices.size
        });
        broadcast({ type: 'serviceStarted', data: { projectName, startTime: serviceInfo.startTime } });
        
        // Ulož aktualizovaný seznam běžících projektů
        await saveRunningProjects();
        
        // Sleduj chyby VM
        vm.on('error', (error) => {
            log(`VM chyba pro ${projectName}: ${error.message}`, 'error', {
                errorName: error.name,
                errorStack: error.stack,
                vmState: vm.runtime ? 'running' : 'stopped',
                projectName
            });
        });
        
        // Sleduj ukončení VM
        vm.on('quit', async () => {
            log(`VM byla ukončena pro ${projectName}`, 'info', {
                quitTime: new Date().toISOString(),
                uptime: serviceInfo ? Date.now() - serviceInfo.startTime.getTime() : 0,
                projectName
            });
            runningServices.delete(projectName);
            // Ulož aktualizovaný seznam běžících projektů
            await saveRunningProjects();
            broadcast({ type: 'serviceStopped', data: { projectName } });
        });
        
        // Sleduj runtime události
        if (vm.runtime) {
            vm.runtime.on('PROJECT_LOADED', () => {
                log(`Projekt byl načten do runtime pro ${projectName}`, 'info');
            });
            
            vm.runtime.on('PROJECT_RUN_START', () => {
                log(`Projekt začal běžet pro ${projectName}`, 'info');
            });
            
            vm.runtime.on('PROJECT_RUN_STOP', () => {
                log(`Projekt byl zastaven pro ${projectName}`, 'info');
            });
        }
        
    } catch (error) {
        log(`Chyba při spouštění služby ${projectName}: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName
        });
        throw error;
    }
}

// API Routes

// Stav služeb
app.get('/api/status', (req, res) => {
    const runningServicesList = getAllRunningServices();
    const statusData = {
        runningServices: runningServicesList,
        totalRunningServices: runningServices.size,
        logsCount: serviceLogs.length
    };
    
    log('API: Status requested', 'info', {
        totalRunningServices: runningServices.size,
        runningServices: runningServicesList.map(s => s.projectName),
        logsCount: serviceLogs.length
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
            runningServicesCount: runningServices.size
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
        
        // Validace přítomnosti IP komponenty
        if (!validateAlbiLABIPComponent(projectJson)) {
            // Smaž dočasný soubor
            await fs.remove(req.file.path);
            return res.status(400).json({ 
                success: false,
                error: 'Missing AlbiLAB IP address component. Add the "set AlbiLAB IP address to [IP]" block to your project.' 
            });
        }
        
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
            error: 'Error starting service', 
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
            return res.status(400).json({ error: 'Missing projectData' });
        }
        
        const name = projectName || 'Neznámý projekt';
        
        log(`API: Starting service with JSON data`, 'info', {
            projectName: name,
            projectDataSize: JSON.stringify(projectData).length,
            spritesCount: projectData.targets ? projectData.targets.length : 0
        });
        
        // Validace přítomnosti IP komponenty
        if (!validateAlbiLABIPComponent(projectData)) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing AlbiLAB IP address component. Add the "set AlbiLAB IP address to [IP]" block to your project.' 
            });
        }
        
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
            error: 'Error starting service', 
            details: error.message 
        });
    }
});

// Zastavení všech služeb
app.post('/api/stop-service', async (req, res) => {
    try {
        log('API: Stop all services called', 'info', {
            runningServicesCount: runningServices.size,
            runningServices: Array.from(runningServices.keys())
        });
        
        await stopAllServices();
        
        const response = { success: true, message: 'Všechny služby byly zastaveny' };
        log('API: All services stopped successfully', 'success', response);
        res.json(response);
        
    } catch (error) {
        log(`API: Error stopping services: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            runningServicesCount: runningServices.size
        });
        res.status(500).json({ 
            error: 'Error stopping services', 
            details: error.message 
        });
    }
});

// Logy služeb
app.get('/api/logs', (req, res) => {
    log('API: Logs requested', 'info', {
        logsCount: serviceLogs.length,
        runningServicesCount: runningServices.size
    });
    
    res.json(serviceLogs);
});

// Informace o uloženém projektu
app.get('/api/saved-project', async (req, res) => {
    try {
        log('API: Saved project info requested', 'info');
        
        const savedProject = await loadSavedProject();
        if (savedProject) {
            res.json({
                exists: true,
                projectName: savedProject.projectName,
                savedAt: savedProject.savedAt,
                version: savedProject.version
            });
        } else {
            res.json({
                exists: false
            });
        }
    } catch (error) {
        log(`API: Error getting saved project info: ${error.message}`, 'error');
        res.status(500).json({ 
            error: 'Error getting saved project information', 
            details: error.message 
        });
    }
});

// Načtení uloženého projektu pro frontend
app.get('/api/saved-project/load', async (req, res) => {
    try {
        log('API: Load saved project for frontend requested', 'info');
        
        const savedProject = await loadSavedProject();
        if (savedProject) {
            // Vracíme projectData jako JSON string, protože vm.toJSON() vrací string
            // a vm.loadProject() očekává buď string nebo objekt
            // Pokud je projectData už string, použijeme ho přímo
            // Pokud je objekt (starý formát), převedeme ho na JSON string
            let actualProjectData = savedProject.projectData;
            
            if (typeof actualProjectData === 'object' && actualProjectData !== null) {
                // Starý formát - objekt, převedeme na JSON string
                try {
                    actualProjectData = JSON.stringify(actualProjectData);
                    log(`API: Converted projectData from object to JSON string for saved project`, 'info');
                } catch (stringifyError) {
                    log(`API: Error stringifying projectData for saved project: ${stringifyError.message}`, 'error');
                    return res.status(500).json({
                        success: false,
                        error: 'Error converting project data to string',
                        details: stringifyError.message
                    });
                }
            }
            
            // Ověř, že projectData je string
            if (typeof actualProjectData !== 'string') {
                log(`API: projectData is not a string for saved project, type: ${typeof actualProjectData}`, 'error');
                return res.status(500).json({
                    success: false,
                    error: 'Invalid project data format'
                });
            }
            
            res.json({
                success: true,
                projectData: actualProjectData,
                projectName: savedProject.projectName,
                savedAt: savedProject.savedAt,
                version: savedProject.version
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Žádný uložený projekt nebyl nalezen'
            });
        }
    } catch (error) {
        log(`API: Error loading saved project for frontend: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false,
            error: 'Error loading saved project', 
            details: error.message 
        });
    }
});

// Načtení auto-save projektu pro frontend podle názvu
app.get('/api/saved-project/auto-save/load', async (req, res) => {
    try {
        const projectName = req.query.projectName;
        log('API: Load auto-save project for frontend requested', 'info', { projectName });
        
        if (!projectName) {
            return res.status(400).json({
                success: false,
                error: 'Název projektu je povinný'
            });
        }
        
        const autoSaveProject = await loadAutoSaveProject(projectName);
        if (autoSaveProject) {
            // Zpracuj projectData - může být string nebo objekt (kvůli escape-ování v JSON souboru)
            let actualProjectData = autoSaveProject.projectData;
            
            // Pokud je to objekt, převedeme ho na JSON string
            if (typeof actualProjectData === 'object' && actualProjectData !== null) {
                try {
                    actualProjectData = JSON.stringify(actualProjectData);
                    log(`API: Converted projectData from object to JSON string for project: ${projectName}`, 'info');
                } catch (stringifyError) {
                    log(`API: Error stringifying projectData for project ${projectName}: ${stringifyError.message}`, 'error');
                    return res.status(500).json({
                        success: false,
                        error: 'Error converting project data to string',
                        details: stringifyError.message
                    });
                }
            }
            
            // Pokud je to string, zkontroluj, jestli není escape-ovaný (double-encoded)
            if (typeof actualProjectData === 'string') {
                // Zkus parsovat - pokud se to podaří a výsledek je znovu string, pak je to double-encoded
                try {
                    const parsed = JSON.parse(actualProjectData);
                    if (typeof parsed === 'string') {
                        // Double-encoded - použijeme parsovaný string
                        log(`API: Detected double-encoded projectData for project: ${projectName}, fixing...`, 'info');
                        actualProjectData = parsed;
                    }
                    // Pokud parsed není string, pak actualProjectData už byl objekt, což by nemělo nastat
                } catch (parseError) {
                    // Pokud se to nedá parsovat, může to být už správně formátovaný JSON string projektu
                    // (což je v pořádku - to je to, co chceme)
                    log(`API: projectData is a JSON string (not double-encoded) for project: ${projectName}`, 'info');
                }
            }
            
            // Ověř, že projectData je string
            if (typeof actualProjectData !== 'string') {
                log(`API: projectData is not a string for project ${projectName}, type: ${typeof actualProjectData}`, 'error');
                return res.status(500).json({
                    success: false,
                    error: 'Invalid project data format'
                });
            }
            
            // Vracíme projectData jako JSON string - Express ho automaticky escape-uje v JSON odpovědi
            // Frontend ho pak parsuje pomocí response.json() a dostane správný string
            res.json({
                success: true,
                projectData: actualProjectData,
                projectName: autoSaveProject.projectName,
                savedAt: autoSaveProject.savedAt,
                version: autoSaveProject.version,
                isAutoSave: true
            });
        } else {
            res.status(404).json({
                success: false,
                error: `Auto-save projekt "${projectName}" nebyl nalezen`
            });
        }
    } catch (error) {
        log(`API: Error loading auto-save project for frontend: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false,
            error: 'Error loading auto-save project', 
            details: error.message 
        });
    }
});

// Průběžné ukládání projektu (bez spuštění služby)
app.post('/api/saved-project/auto-save', async (req, res) => {
    try {
        log('API: Auto-save project requested', 'info', {
            hasProjectData: !!req.body.projectData,
            projectName: req.body.projectName,
            requestBodySize: JSON.stringify(req.body).length
        });
        
        const { projectData, projectName } = req.body;
        
        if (!projectData) {
            log('API: Missing projectData in auto-save request', 'error');
            return res.status(400).json({ error: 'Missing projectData' });
        }
        
        const name = projectName || 'Neznámý projekt';
        
        // Ukládáme projectData jako string (JSON string), protože vm.toJSON() vrací string
        // a loadProject() očekává buď string nebo objekt (který se převede na string)
        // Pokud je projectData už string, použijeme ho přímo
        // Pokud je objekt, převedeme ho na JSON string
        const actualProjectData = typeof projectData === 'string' 
            ? projectData 
            : JSON.stringify(projectData);
        
        // Ulož projekt bez spuštění služby (auto-save)
        const saved = await saveProject(actualProjectData, name, true);
        
        if (saved) {
            const response = { 
                success: true, 
                message: `Projekt ${name} byl automaticky uložen`,
                projectName: name,
                savedAt: new Date().toISOString()
            };
            
            log(`API: Project auto-saved successfully`, 'success', response);
            res.json(response);
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Error auto-saving project' 
            });
        }
        
    } catch (error) {
        log(`API: Error auto-saving project: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName: req.body.projectName
        });
        res.status(500).json({ 
            success: false,
            error: 'Error auto-saving project', 
            details: error.message 
        });
    }
});

// Smazání uloženého projektu
app.delete('/api/saved-project', async (req, res) => {
    try {
        log('API: Delete saved project requested', 'info');
        
        if (await fs.pathExists(SAVED_PROJECT_PATH)) {
            await fs.remove(SAVED_PROJECT_PATH);
            log('Uložený projekt byl smazán', 'success');
            res.json({ success: true, message: 'Uložený projekt byl smazán' });
        } else {
            res.json({ success: true, message: 'Žádný uložený projekt nebyl nalezen' });
        }
    } catch (error) {
        log(`API: Error deleting saved project: ${error.message}`, 'error');
        res.status(500).json({ 
            error: 'Error deleting saved project', 
            details: error.message 
        });
    }
});

// Smazání auto-save projektu podle názvu
app.delete('/api/saved-project/auto-save', async (req, res) => {
    try {
        const projectName = req.query.projectName;
        log('API: Delete auto-save project requested', 'info', { projectName });
        
        if (!projectName) {
            return res.status(400).json({
                success: false,
                error: 'Název projektu je povinný'
            });
        }
        
        // Pokud adresář neexistuje, projekt neexistuje
        if (!await fs.pathExists(AUTO_SAVE_DIR)) {
            return res.json({ success: true, message: `Auto-save projekt "${projectName}" nebyl nalezen` });
        }
        
        // Nejdříve zkus najít soubor přímo podle sanitizovaného názvu (rychlejší)
        const safeFileName = sanitizeFileName(projectName);
        const directFilePath = path.join(AUTO_SAVE_DIR, safeFileName);
        
        if (await fs.pathExists(directFilePath)) {
            try {
                const projectInfo = await fs.readJson(directFilePath);
                // Ověř, že originální název v souboru odpovídá hledanému názvu
                if (projectInfo.projectName === projectName) {
                    await fs.remove(directFilePath);
                    log(`Auto-save projekt ${projectName} byl smazán (přímý přístup)`, 'success');
                    return res.json({ success: true, message: `Auto-save projekt "${projectName}" byl smazán` });
                }
            } catch (error) {
                log(`Chyba při načítání souboru ${safeFileName}: ${error.message}`, 'error');
            }
        }
        
        // Fallback: Projdi všechny soubory a hledej podle originálního názvu
        const files = await fs.readdir(AUTO_SAVE_DIR);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(AUTO_SAVE_DIR, file);
                    const projectInfo = await fs.readJson(filePath);
                    
                    // Porovnej originální názvy (case-sensitive)
                    if (projectInfo.projectName === projectName) {
                        await fs.remove(filePath);
                        log(`Auto-save projekt ${projectName} byl smazán (fallback)`, 'success');
                        return res.json({ success: true, message: `Auto-save projekt "${projectName}" byl smazán` });
                    }
                } catch (error) {
                    log(`Chyba při načítání souboru ${file}: ${error.message}`, 'error');
                }
            }
        }
        
        res.json({ success: true, message: `Auto-save projekt "${projectName}" nebyl nalezen` });
    } catch (error) {
        log(`API: Error deleting auto-save project: ${error.message}`, 'error');
        res.status(500).json({ 
            error: 'Error deleting auto-save project', 
            details: error.message 
        });
    }
});

// Seznam všech auto-save projektů
app.get('/api/saved-project/auto-save/list', async (req, res) => {
    try {
        log('API: List auto-save projects requested', 'info');
        
        if (!await fs.pathExists(AUTO_SAVE_DIR)) {
            return res.json({
                success: true,
                projects: []
            });
        }
        
        const files = await fs.readdir(AUTO_SAVE_DIR);
        const projects = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(AUTO_SAVE_DIR, file);
                    const projectInfo = await fs.readJson(filePath);
                    projects.push({
                        fileName: file,
                        projectName: projectInfo.projectName,
                        savedAt: projectInfo.savedAt,
                        version: projectInfo.version
                    });
                } catch (error) {
                    log(`Chyba při načítání souboru ${file}: ${error.message}`, 'error');
                }
            }
        }
        
        // Seřaď podle času uložení (nejnovější první)
        projects.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        
        res.json({
            success: true,
            projects: projects
        });
        
    } catch (error) {
        log(`API: Error listing auto-save projects: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false,
            error: 'Error getting auto-save projects list', 
            details: error.message 
        });
    }
});

// Funkce pro kontrolu přítomnosti IP komponenty v projektu
function validateAlbiLABIPComponent(projectData) {
    try {
        log(`Validating AlbiLAB IP component`, 'info', {
            hasProjectData: !!projectData,
            hasTargets: projectData && projectData.targets ? projectData.targets.length : 0
        });
        
        if (!projectData || !projectData.targets) {
            log(`Validation failed: No project data or targets`, 'error');
            return false;
        }
        
        // Projdi všechny sprites a stage
        for (const target of projectData.targets) {
            if (target.blocks) {
                log(`Checking target ${target.name} with ${Object.keys(target.blocks).length} blocks`, 'info');
                // Projdi všechny bloky
                for (const blockId in target.blocks) {
                    const block = target.blocks[blockId];
                    log(`Checking block ${blockId}: opcode=${block.opcode}`, 'info');
                    // Zkontroluj, zda je to AlbiLAB blok pro nastavení IP
                    if (block.opcode === 'albilab_setDeviceIP' && block.inputs && block.inputs.IP) {
                        const ipValue = block.inputs.IP[1][1]; // [1][1] pro získání skutečné hodnoty
                        log(`Found AlbiLAB IP block with IP: ${ipValue}`, 'info');
                        // Zkontroluj, zda má IP hodnotu (není prázdná)
                        if (ipValue && ipValue.trim() !== '') {
                            log(`Validation successful: IP component found with value: ${ipValue}`, 'success');
                            return true;
                        }
                    }
                }
            }
        }
        
        log(`Validation failed: No AlbiLAB IP component found`, 'error');
        return false;
    } catch (error) {
        log(`Error validating AlbiLAB IP component: ${error.message}`, 'error');
        return false;
    }
}

// Nasazení projektu (uložení do AlbiLAB)
app.post('/api/deploy-project', async (req, res) => {
    try {
        const { projectName } = req.body;
        
        if (!projectName) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing project name' 
            });
        }
        
        log(`API: Deploy project called for ${projectName}`, 'info', {
            projectName,
            runningServicesCount: runningServices.size
        });
        
        // Načti projekt z auto-save
        const projectData = await loadAutoSaveProject(projectName);
        if (!projectData) {
            return res.status(404).json({ 
                success: false,
                error: `Project ${projectName} not found in auto-save` 
            });
        }
        
        // Validace přítomnosti IP komponenty
        // Pokud je projectData string, parsuj ho
        const actualProjectData = typeof projectData.projectData === 'string' 
            ? JSON.parse(projectData.projectData) 
            : projectData.projectData;
        
        if (!validateAlbiLABIPComponent(actualProjectData)) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing AlbiLAB IP address component. Add the "set AlbiLAB IP address to [IP]" block to your project.' 
            });
        }
        
        // Ulož projekt do AlbiLAB (nasadit)
        // saveProject očekává string, takže převedeme objekt zpět na JSON string
        const projectDataString = typeof actualProjectData === 'string' 
            ? actualProjectData 
            : JSON.stringify(actualProjectData);
        const saved = await saveProject(projectDataString, projectName, false);
        
        if (saved) {
            const response = { 
                success: true, 
                message: `Projekt ${projectName} byl nasazen do AlbiLAB`,
                projectName: projectName
            };
            
            log(`API: Project deployed successfully`, 'success', response);
            res.json(response);
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Error deploying project' 
            });
        }
        
    } catch (error) {
        log(`API: Error deploying project: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName: req.body.projectName
        });
        res.status(500).json({ 
            success: false,
            error: 'Error deploying project', 
            details: error.message 
        });
    }
});

// Spuštění nasazeného projektu
app.post('/api/start-project', async (req, res) => {
    try {
        const { projectName } = req.body;
        
        if (!projectName) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing project name' 
            });
        }
        
        log(`API: Start project called for ${projectName}`, 'info', {
            projectName,
            runningServicesCount: runningServices.size
        });
        
        // Zkontroluj, zda je projekt nasazen
        const isDeployed = await isProjectDeployed(projectName);
        if (!isDeployed) {
            return res.status(404).json({ 
                success: false,
                error: `Project ${projectName} is not deployed. Deploy it first.` 
            });
        }
        
        // Zkontroluj, zda už neběží
        if (runningServices.has(projectName)) {
            return res.status(409).json({ 
                success: false,
                error: `Project ${projectName} is already running` 
            });
        }
        
        // Načti projekt z auto-save
        const projectData = await loadAutoSaveProject(projectName);
        if (!projectData) {
            return res.status(404).json({ 
                success: false,
                error: `Project ${projectName} not found` 
            });
        }
        
        // Validace přítomnosti IP komponenty
        // Pokud je projectData.projectData string, parsuj ho
        const actualProjectData = typeof projectData.projectData === 'string' 
            ? JSON.parse(projectData.projectData) 
            : projectData.projectData;
        
        if (!validateAlbiLABIPComponent(actualProjectData)) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing AlbiLAB IP address component. Add the "set AlbiLAB IP address to [IP]" block to your project.' 
            });
        }
        
        // Spusť službu
        await startService(actualProjectData, projectName);
        
        const response = { 
            success: true, 
            message: `Projekt ${projectName} byl spuštěn`,
            projectName: projectName
        };
        
        log(`API: Project started successfully`, 'success', response);
        res.json(response);
        
    } catch (error) {
        log(`API: Error starting project: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName: req.body.projectName
        });
        res.status(500).json({ 
            success: false,
            error: 'Error starting project', 
            details: error.message 
        });
    }
});

// Zastavení konkrétního projektu
app.post('/api/stop-project', async (req, res) => {
    try {
        const { projectName } = req.body;
        
        if (!projectName) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing project name' 
            });
        }
        
        log(`API: Stop project called for ${projectName}`, 'info', {
            projectName,
            runningServicesCount: runningServices.size
        });
        
        // Zkontroluj, zda projekt běží
        if (!runningServices.has(projectName)) {
            return res.status(404).json({ 
                success: false,
                error: `Project ${projectName} is not running` 
            });
        }
        
        // Zastav službu
        const stopped = await stopService(projectName);
        
        if (stopped) {
            const response = { 
                success: true, 
                message: `Projekt ${projectName} byl zastaven`,
                projectName: projectName
            };
            
            log(`API: Project stopped successfully`, 'success', response);
            res.json(response);
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Error stopping project' 
            });
        }
        
    } catch (error) {
        log(`API: Error stopping project: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName: req.body.projectName
        });
        res.status(500).json({ 
            success: false,
            error: 'Error stopping project', 
            details: error.message 
        });
    }
});

// Seznam projektů s jejich stavem
app.get('/api/projects-status', async (req, res) => {
    try {
        log('API: Projects status requested', 'info');
        
        if (!await fs.pathExists(AUTO_SAVE_DIR)) {
            return res.json({
                success: true,
                projects: []
            });
        }
        
        const files = await fs.readdir(AUTO_SAVE_DIR);
        const projects = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(AUTO_SAVE_DIR, file);
                    const projectInfo = await fs.readJson(filePath);
                    
                    const projectName = projectInfo.projectName;
                    const isRunning = runningServices.has(projectName);
                    const isDeployed = await isProjectDeployed(projectName);
                    
                    projects.push({
                        fileName: file,
                        projectName: projectName,
                        savedAt: projectInfo.savedAt,
                        version: projectInfo.version,
                        isRunning: isRunning,
                        isDeployed: isDeployed
                    });
                } catch (error) {
                    log(`Chyba při načítání souboru ${file}: ${error.message}`, 'error');
                }
            }
        }
        
        // Seřaď podle času uložení (nejnovější první)
        projects.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        
        res.json({
            success: true,
            projects: projects
        });
        
    } catch (error) {
        log(`API: Error getting projects status: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false,
            error: 'Error getting projects status', 
            details: error.message 
        });
    }
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
    const runningServicesList = getAllRunningServices();
    const statusData = {
        type: 'status', 
        data: {
            runningServices: runningServicesList,
            totalRunningServices: runningServices.size,
            logsCount: serviceLogs.length
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
    await stopAllServices();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('Přijat SIGTERM, ukončuji server...', 'info');
    await stopAllServices();
    process.exit(0);
});

// Startup script - spustí se při každém startu serveru
async function runServerStartupScript() {
    try {
        log('Spouštím startup script...', 'info');
        
        // Spusť externí startup script
        await runStartupScript();
        
        // Počkej chvilku, aby se server stabilizoval
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Automatické spuštění všech nasazených projektů
        await autoStartDeployedProjects();
        
        log('Startup script dokončen', 'success');
    } catch (error) {
        log(`Chyba v startup scriptu: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack
        });
        // Nechceme, aby se server nespustil kvůli chybě v auto-startu
        // throw error; // Zakomentováno - server se spustí i při chybě auto-startu
    }
}

// Spusť server
app.listen(PORT, async () => {
    log(`Backend server běží na portu ${PORT}`, 'info');
    log(`WebSocket server běží na portu 3002`, 'info');
    
    // Spusť startup script po spuštění serveru
    await runServerStartupScript();
});

module.exports = app;
