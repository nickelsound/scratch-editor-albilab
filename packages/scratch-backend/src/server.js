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

// Global service state - support for multiple parallel services
let runningServices = new Map(); // Map<projectName, serviceInfo>
let serviceLogs = [];

// Path to saved project - we save to uploads volume, which is persistent
// In Docker/Podman container, process.cwd() is /app/packages/scratch-backend, but uploads is mapped to /app/uploads
// For local execution, we use relative path to project root
// __dirname is packages/scratch-backend/src, so ../../../uploads is root/uploads
// Container detection: check for existence of .dockerenv (Docker) or .containerenv (Podman) file
// or environment variable IS_CONTAINER, or if process.cwd() starts with /app
const isContainer = fs.existsSync('/.dockerenv') || 
                    fs.existsSync('/run/.containerenv') ||
                    process.env.IS_CONTAINER === 'true' ||
                    process.env.IS_DOCKER === 'true' ||
                    process.cwd().startsWith('/app');
const UPLOADS_BASE = isContainer ? '/app/uploads' : path.join(__dirname, '../../../uploads');
const SAVED_PROJECT_PATH = path.join(UPLOADS_BASE, 'saved-project.json');
const AUTO_SAVE_DIR = path.join(UPLOADS_BASE, 'auto-save');
const RUNNING_PROJECTS_PATH = path.join(UPLOADS_BASE, 'running-projects.json');

// Multer for file uploads
const upload = multer({ 
    dest: UPLOADS_BASE + '/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// WebSocket server
const wss = new WebSocket.Server({ port: 3002 });

// Broadcast function for WebSocket
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Get service information
function getServiceInfo(projectName) {
    return runningServices.get(projectName);
}

// Get list of all running services
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

// Helper function for sanitizing file name (same as when saving)
function sanitizeFileName(projectName) {
    return projectName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
}

// Check if service is deployed (saved in AlbiLAB)
async function isProjectDeployed(projectName) {
    try {
        // Check if project is saved in AlbiLAB (deployed-projects directory)
        const deployedProjectsDir = path.join(UPLOADS_BASE, 'deployed-projects');
        const safeFileName = sanitizeFileName(projectName);
        const deployedProjectPath = path.join(deployedProjectsDir, safeFileName);
        return await fs.pathExists(deployedProjectPath);
    } catch (error) {
        log(`Error checking deployment status for project ${projectName}: ${error.message}`, 'error');
        return false;
    }
}

// Save project to persistent storage
async function saveProject(projectData, projectName, isAutoSave = false) {
    try {
        // Verify that projectData is a string (vm.toJSON() returns string)
        if (typeof projectData !== 'string') {
            log(`Error: projectData is not a string when saving project ${projectName}, type: ${typeof projectData}`, 'error');
            return false;
        }
        
        // Check if it's a valid JSON string
        try {
            const parsed = JSON.parse(projectData);
            // If parsing succeeded, check if it's not a string again (double-encoded)
            if (typeof parsed === 'string') {
                log(`Warning: projectData appears to be double-encoded for project ${projectName}`, 'warn');
                // Use the already parsed string
                projectData = parsed;
            }
        } catch (parseError) {
            // If it can't be parsed, it might be a problem
            log(`Warning: projectData may not be valid JSON for project ${projectName}: ${parseError.message}`, 'warn');
        }
        
        const projectInfo = {
            projectData: projectData, // Save as JSON string (vm.toJSON() returns string)
            projectName: projectName,
            savedAt: new Date().toISOString(),
            version: '1.0',
            isAutoSave: isAutoSave
        };
        
        let filePath;
        if (isAutoSave) {
            // For auto-save, create directory and save by project name
            await fs.ensureDir(AUTO_SAVE_DIR);
            const safeFileName = sanitizeFileName(projectName);
            filePath = path.join(AUTO_SAVE_DIR, safeFileName);
        } else {
            // For deployed projects, create deployed-projects directory
            const deployedProjectsDir = path.join(UPLOADS_BASE, 'deployed-projects');
            await fs.ensureDir(deployedProjectsDir);
            const safeFileName = sanitizeFileName(projectName);
            filePath = path.join(deployedProjectsDir, safeFileName);
        }
        
        // Save using writeJson, which correctly handles string in object
        await fs.writeJson(filePath, projectInfo, { spaces: 2 });
        log(`Project ${projectName} saved to persistent storage`, 'success', {
            savedAt: projectInfo.savedAt,
            filePath: filePath,
            isAutoSave: isAutoSave
        });
        
        return true;
    } catch (error) {
        log(`Error saving project: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName,
            isAutoSave: isAutoSave
        });
        return false;
    }
}

// Load saved project
async function loadSavedProject() {
    try {
        if (await fs.pathExists(SAVED_PROJECT_PATH)) {
            const projectInfo = await fs.readJson(SAVED_PROJECT_PATH);
            log(`Loaded saved project: ${projectInfo.projectName}`, 'info', {
                savedAt: projectInfo.savedAt,
                version: projectInfo.version
            });
            return projectInfo;
        } else {
            log('No saved project found', 'info');
            return null;
        }
    } catch (error) {
        log(`Error loading saved project: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack
        });
        return null;
    }
}

// Load auto-save project by name
async function loadAutoSaveProject(projectName) {
    try {
        if (!projectName || projectName === 'Unknown project') {
            log('Project name not provided for auto-save loading', 'info');
            return null;
        }
        
        // If directory doesn't exist, project doesn't exist
        if (!await fs.pathExists(AUTO_SAVE_DIR)) {
            log(`Auto-save project ${projectName} not found - directory does not exist`, 'info');
            return null;
        }
        
        // First try to find file directly by sanitized name (faster)
        const safeFileName = sanitizeFileName(projectName);
        const directFilePath = path.join(AUTO_SAVE_DIR, safeFileName);
        
        if (await fs.pathExists(directFilePath)) {
            try {
                const projectInfo = await fs.readJson(directFilePath);
                // Verify that original name in file matches searched name
                if (projectInfo.projectName === projectName) {
                    log(`Auto-save project loaded (direct access): ${projectInfo.projectName}`, 'info', {
                        savedAt: projectInfo.savedAt,
                        version: projectInfo.version,
                        filePath: directFilePath
                    });
                    return projectInfo;
                }
            } catch (error) {
                log(`Error loading file ${safeFileName}: ${error.message}`, 'error');
            }
        }
        
        // Fallback: Go through all files and search by original name
        // (in case sanitization created duplicate names)
        const files = await fs.readdir(AUTO_SAVE_DIR);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(AUTO_SAVE_DIR, file);
                    const projectInfo = await fs.readJson(filePath);
                    
                    // Compare original names (case-sensitive)
                    if (projectInfo.projectName === projectName) {
                        log(`Auto-save project loaded (fallback): ${projectInfo.projectName}`, 'info', {
                            savedAt: projectInfo.savedAt,
                            version: projectInfo.version,
                            filePath: filePath
                        });
                        return projectInfo;
                    }
                } catch (error) {
                    log(`Error loading file ${file}: ${error.message}`, 'error');
                }
            }
        }
        
        log(`Auto-save project ${projectName} not found`, 'info');
        return null;
    } catch (error) {
        log(`Error loading auto-save project: ${error.message}`, 'error');
        return null;
    }
}

// Automatic startup of saved project on server start
async function autoStartSavedProject() {
    try {
        log('Checking saved project for automatic startup...', 'info');
        
        const savedProject = await loadSavedProject();
        if (savedProject) {
            log(`Automatically starting saved project: ${savedProject.projectName}`, 'info');
            await startService(savedProject.projectData, savedProject.projectName);
            return true;
        } else {
            log('No project for automatic startup', 'info');
            return false;
        }
    } catch (error) {
        log(`Error during automatic project startup: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack
        });
        return false;
    }
}

// Save list of running projects
async function saveRunningProjects() {
    try {
        // Ensure that uploads directory exists
        await fs.ensureDir(UPLOADS_BASE);
        log(`Uploads directory ensured: ${UPLOADS_BASE}`, 'info');
        
        const runningProjectsList = Array.from(runningServices.keys());
        log(`Running projects: ${JSON.stringify(runningProjectsList)}`, 'info');
        
        const data = {
            projects: runningProjectsList,
            lastUpdated: new Date().toISOString()
        };
        
        log(`Writing to file: ${RUNNING_PROJECTS_PATH}`, 'info');
        await fs.writeJson(RUNNING_PROJECTS_PATH, data, { spaces: 2 });
        
        // Verify that file actually exists
        const fileExists = await fs.pathExists(RUNNING_PROJECTS_PATH);
        if (fileExists) {
            const fileContent = await fs.readJson(RUNNING_PROJECTS_PATH);
            log(`List of running projects successfully saved to ${RUNNING_PROJECTS_PATH}: ${JSON.stringify(fileContent)}`, 'success');
        } else {
            log(`ERROR: File ${RUNNING_PROJECTS_PATH} was not created!`, 'error');
        }
    } catch (error) {
        log(`Error saving list of running projects: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            path: RUNNING_PROJECTS_PATH
        });
        // We don't want the server to crash due to error saving the list
        // throw error;
    }
}

// Load list of running projects
async function loadRunningProjects() {
    try {
        if (await fs.pathExists(RUNNING_PROJECTS_PATH)) {
            const data = await fs.readJson(RUNNING_PROJECTS_PATH);
            return data.projects || [];
        }
        return [];
    } catch (error) {
        log(`Error loading list of running projects: ${error.message}`, 'error');
        return [];
    }
}

// Remove project from running-projects.json file (even if not in runningServices map)
async function removeProjectFromRunningProjects(projectName) {
    try {
        if (!await fs.pathExists(RUNNING_PROJECTS_PATH)) {
            log(`running-projects.json does not exist, nothing to remove`, 'info');
            return true;
        }
        
        const data = await fs.readJson(RUNNING_PROJECTS_PATH);
        const projects = data.projects || [];
        
        // Remove project from list if it exists
        const index = projects.indexOf(projectName);
        if (index !== -1) {
            projects.splice(index, 1);
            
            const updatedData = {
                projects: projects,
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeJson(RUNNING_PROJECTS_PATH, updatedData, { spaces: 2 });
            log(`Project ${projectName} removed from running-projects.json`, 'success');
            return true;
        } else {
            log(`Project ${projectName} not found in running-projects.json`, 'info');
            return true; // Not an error if project is not in the list
        }
    } catch (error) {
        log(`Error removing project from running-projects.json: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName
        });
        return false;
    }
}

// Check and start projects that should be running but aren't
// This function is used both at startup and in periodic checks
async function checkAndStartMissingProjects() {
    try {
        log('Checking for projects that should be running...', 'info');
        
        // Load list of projects that should be running
        const runningProjectsList = await loadRunningProjects();
        
        if (runningProjectsList.length === 0) {
            log('No projects in running-projects.json', 'info');
            return 0;
        }
        
        log(`Found ${runningProjectsList.length} project(s) that should be running`, 'info');
        
        // Check which projects are already running
        const missingProjectNames = runningProjectsList.filter(name => !runningServices.has(name));
        
        if (missingProjectNames.length === 0) {
            log(`All ${runningProjectsList.length} project(s) are already running`, 'info');
            return 0;
        }
        
        log(`${missingProjectNames.length} project(s) should be running but aren't: ${missingProjectNames.join(', ')}`, 'info');
        
        // Search for projects by looking into JSON files in deployed-projects (not by filename)
        // Projects in running-projects.json must be deployed, so we only check deployed-projects
        const deployedProjectsDir = path.join(UPLOADS_BASE, 'deployed-projects');
        
        if (!await fs.pathExists(deployedProjectsDir)) {
            log('deployed-projects directory does not exist', 'info');
            return 0;
        }
        
        // Create a map of projectName -> projectInfo from all files in deployed-projects
        const availableProjects = new Map();
        
        try {
            const files = await fs.readdir(deployedProjectsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(deployedProjectsDir, file);
                        const projectInfo = await fs.readJson(filePath);
                        if (projectInfo && projectInfo.projectName) {
                            availableProjects.set(projectInfo.projectName, projectInfo);
                            log(`Found project "${projectInfo.projectName}" in deployed-projects/${file}`, 'info');
                        }
                    } catch (error) {
                        log(`Error reading file ${file}: ${error.message}`, 'error');
                    }
                }
            }
        } catch (error) {
            log(`Error reading deployed-projects directory: ${error.message}`, 'error');
            return 0;
        }
        
        // Now try to start missing projects
        let startedCount = 0;
        for (const projectName of missingProjectNames) {
            try {
                const projectInfo = availableProjects.get(projectName);
                
                if (!projectInfo) {
                    log(`Project "${projectName}" not found in deployed-projects, skipped`, 'warn');
                    continue;
                }
                
                log(`Project "${projectName}" found, processing...`, 'info');
                
                // Process projectData - can be string or object
                let actualProjectData = projectInfo.projectData;
                if (typeof actualProjectData === 'string') {
                    try {
                        actualProjectData = JSON.parse(actualProjectData);
                    } catch (parseError) {
                        log(`Error parsing projectData for ${projectName}: ${parseError.message}`, 'error');
                        continue;
                    }
                }
                
                // Validate presence of IP component
                if (!validateAlbiLABIPComponent(actualProjectData)) {
                    log(`Project ${projectName} does not have AlbiLAB IP component, skipped`, 'warn');
                    continue;
                }
                
                // Start project
                log(`Starting project ${projectName}...`, 'info');
                await startService(actualProjectData, projectName);
                startedCount++;
                log(`Project ${projectName} started successfully`, 'success');
                
                // Wait a bit between starting projects
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                log(`Error starting project ${projectName}: ${error.message}`, 'error', {
                    errorName: error.name,
                    errorStack: error.stack
                });
            }
        }
        
        log(`Started ${startedCount} out of ${missingProjectNames.length} missing project(s)`, startedCount > 0 ? 'success' : 'info');
        return startedCount;
        
    } catch (error) {
        log(`Error during check: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack
        });
        return 0;
    }
}

// Logging function
function log(message, type = 'info', details = null) {
    const timestamp = new Date().toISOString();
    
    // Safely serialize details for saving to logs
    let safeDetails = null;
    if (details) {
        try {
            safeDetails = JSON.parse(JSON.stringify(details));
        } catch (error) {
            safeDetails = { error: 'Cannot serialize details', originalType: typeof details };
        }
    }
    
    const logEntry = { timestamp, message, type, details: safeDetails };
    serviceLogs.push(logEntry);
    
    // Keep only last 100 logs
    if (serviceLogs.length > 100) {
        serviceLogs = serviceLogs.slice(-100);
    }
    
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    if (details) {
        try {
            console.log(`[${timestamp}] DETAILS:`, JSON.stringify(details, null, 2));
        } catch (error) {
            console.log(`[${timestamp}] DETAILS: [Circular reference - cannot serialize]`);
        }
    }
    broadcast({ type: 'log', data: logEntry });
}

// Stop specific service
async function stopService(projectName, saveRunningProjectsList = true) {
    const serviceInfo = runningServices.get(projectName);
    if (serviceInfo) {
        try {
            log(`Stopping service: ${projectName}`, 'info');
            serviceInfo.vm.stopAll();
            serviceInfo.vm.quit();
            runningServices.delete(projectName);
            
            // Save updated list of running projects (only if not shutting down server)
            if (saveRunningProjectsList) {
                await saveRunningProjects();
            }
            
            log(`Service ${projectName} stopped`, 'success');
            broadcast({ type: 'serviceStopped', data: { projectName } });
            return true;
        } catch (error) {
            log(`Error stopping service ${projectName}: ${error.message}`, 'error');
            return false;
        }
    } else {
        // Project is not in runningServices map, but might be in running-projects.json
        // Remove it from the file if it exists there
        if (saveRunningProjectsList) {
            log(`Project ${projectName} not in runningServices map, removing from running-projects.json if present`, 'info');
            await removeProjectFromRunningProjects(projectName);
        }
        return true; // Return true even if not in map, as we've handled the file update
    }
}

// Stop all services
async function stopAllServices(saveRunningProjectsList = true) {
    const projectNames = Array.from(runningServices.keys());
    for (const projectName of projectNames) {
        await stopService(projectName, saveRunningProjectsList);
    }
}

// Start new service
async function startService(projectData, projectName) {
    try {
        // If service is already running, stop it
        if (runningServices.has(projectName)) {
            await stopService(projectName);
        }
        
        log(`Starting service: ${projectName}`, 'info', { 
            projectName, 
            projectDataSize: JSON.stringify(projectData).length,
            spritesCount: projectData.targets ? projectData.targets.length : 0,
            runningServicesCount: runningServices.size
        });
        
        // Create new VM instance
        const vm = new VirtualMachine();
        log(`Virtual Machine instance created for ${projectName}`, 'info');
        
        // Attach AlbiLAB extension
        log(`Loading AlbiLAB extension for ${projectName}...`, 'info');
        await vm.extensionManager.loadExtensionURL('albilab');
        log(`AlbiLAB extension successfully loaded for ${projectName}`, 'success');
        
        // Start VM
        vm.start();
        log(`Virtual Machine started for ${projectName}`, 'info');
        
        // Load project
        log(`Loading project into VM for ${projectName}...`, 'info');
        await vm.loadProject(projectData);
        log(`Project successfully loaded into VM for ${projectName}`, 'success');
        
        // Start project
        log(`Starting project (green flag) for ${projectName}...`, 'info');
        vm.greenFlag();
        log(`Project started for ${projectName}`, 'success');
        
        // Save reference to service
        const serviceInfo = {
            vm: vm,
            projectName: projectName,
            startTime: new Date()
        };
        runningServices.set(projectName, serviceInfo);
        
        log(`Service ${projectName} successfully started`, 'success', {
            startTime: serviceInfo.startTime.toISOString(),
            vmState: 'running',
            totalRunningServices: runningServices.size
        });
        broadcast({ type: 'serviceStarted', data: { projectName, startTime: serviceInfo.startTime } });
        
        // Save updated list of running projects
        log(`Saving list of running projects after starting ${projectName}...`, 'info');
        await saveRunningProjects();
        log(`List of running projects saved after starting ${projectName}`, 'success');
        
        // Monitor VM errors
        vm.on('error', (error) => {
            log(`VM error for ${projectName}: ${error.message}`, 'error', {
                errorName: error.name,
                errorStack: error.stack,
                vmState: vm.runtime ? 'running' : 'stopped',
                projectName
            });
        });
        
        // Monitor VM termination
        // Note: When VM terminates, we remove it from runningServices map for consistency,
        // but we do NOT update running-projects.json file. The project should remain in the file
        // unless explicitly stopped via STOP or DELETE command.
        vm.on('quit', () => {
            log(`VM terminated for ${projectName}`, 'info', {
                quitTime: new Date().toISOString(),
                uptime: serviceInfo ? Date.now() - serviceInfo.startTime.getTime() : 0,
                projectName
            });
            runningServices.delete(projectName);
            // Do NOT call saveRunningProjects() here - project should remain in running-projects.json
            // It will only be removed when user explicitly stops or deletes it
            broadcast({ type: 'serviceStopped', data: { projectName } });
        });
        
        // Monitor runtime events
        if (vm.runtime) {
            vm.runtime.on('PROJECT_LOADED', () => {
                log(`Project loaded into runtime for ${projectName}`, 'info');
            });
            
            vm.runtime.on('PROJECT_RUN_START', () => {
                log(`Project started running for ${projectName}`, 'info');
            });
            
            vm.runtime.on('PROJECT_RUN_STOP', () => {
                log(`Project stopped for ${projectName}`, 'info');
            });
        }
        
    } catch (error) {
        log(`Error starting service ${projectName}: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack,
            projectName
        });
        throw error;
    }
}

// API Routes

// Service status
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

// Start service from file
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
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const projectName = req.body.projectName || req.file.originalname || 'Unknown project';
        
        // Load project from file
        log(`API: Reading project file: ${req.file.path}`, 'info');
        const projectData = await fs.readFile(req.file.path, 'utf8');
        const projectJson = JSON.parse(projectData);
        
        log(`API: Project file parsed successfully`, 'info', {
            projectName,
            fileSize: projectData.length,
            spritesCount: projectJson.targets ? projectJson.targets.length : 0
        });
        
        // Validate presence of IP component
        if (!validateAlbiLABIPComponent(projectJson)) {
            // Delete temporary file
            await fs.remove(req.file.path);
            return res.status(400).json({ 
                success: false,
                error: 'Missing AlbiLAB IP address component. Add the "set AlbiLAB IP address to [IP]" block to your project.' 
            });
        }
        
        // Start service
        await startService(projectJson, projectName);
        
        // Delete temporary file
        await fs.remove(req.file.path);
        log(`API: Temporary file removed: ${req.file.path}`, 'info');
        
        const response = { 
            success: true, 
            message: `Service ${projectName} started`,
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

// Start service from JSON data
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
        
        const name = projectName || 'Unknown project';
        
        log(`API: Starting service with JSON data`, 'info', {
            projectName: name,
            projectDataSize: JSON.stringify(projectData).length,
            spritesCount: projectData.targets ? projectData.targets.length : 0
        });
        
        // Validate presence of IP component
        if (!validateAlbiLABIPComponent(projectData)) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing AlbiLAB IP address component. Add the "set AlbiLAB IP address to [IP]" block to your project.' 
            });
        }
        
        // Start service
        await startService(projectData, name);
        
        const response = { 
            success: true, 
            message: `Service ${name} started`,
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

// Stop all services
app.post('/api/stop-service', async (req, res) => {
    try {
        log('API: Stop all services called', 'info', {
            runningServicesCount: runningServices.size,
            runningServices: Array.from(runningServices.keys())
        });
        
        await stopAllServices();
        
        const response = { success: true, message: 'All services stopped' };
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

// Service logs
app.get('/api/logs', (req, res) => {
    log('API: Logs requested', 'info', {
        logsCount: serviceLogs.length,
        runningServicesCount: runningServices.size
    });
    
    res.json(serviceLogs);
});

// Information about saved project
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

// Load saved project for frontend
app.get('/api/saved-project/load', async (req, res) => {
    try {
        log('API: Load saved project for frontend requested', 'info');
        
        const savedProject = await loadSavedProject();
        if (savedProject) {
            // Return projectData as JSON string, because vm.toJSON() returns string
            // and vm.loadProject() expects either string or object
            // If projectData is already a string, use it directly
            // If it's an object (old format), convert it to JSON string
            let actualProjectData = savedProject.projectData;
            
            if (typeof actualProjectData === 'object' && actualProjectData !== null) {
                // Old format - object, convert to JSON string
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
            
            // Verify that projectData is a string
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
                error: 'No saved project found'
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

// Load auto-save project for frontend by name
app.get('/api/saved-project/auto-save/load', async (req, res) => {
    try {
        const projectName = req.query.projectName;
        log('API: Load auto-save project for frontend requested', 'info', { projectName });
        
        if (!projectName) {
            return res.status(400).json({
                success: false,
                error: 'Project name is required'
            });
        }
        
        const autoSaveProject = await loadAutoSaveProject(projectName);
        if (autoSaveProject) {
            // Process projectData - can be string or object (due to escaping in JSON file)
            let actualProjectData = autoSaveProject.projectData;
            
            // If it's an object, convert it to JSON string
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
            
            // If it's a string, check if it's not escaped (double-encoded)
            if (typeof actualProjectData === 'string') {
                // Try to parse - if it succeeds and result is a string again, then it's double-encoded
                try {
                    const parsed = JSON.parse(actualProjectData);
                    if (typeof parsed === 'string') {
                        // Double-encoded - use parsed string
                        log(`API: Detected double-encoded projectData for project: ${projectName}, fixing...`, 'info');
                        actualProjectData = parsed;
                    }
                    // If parsed is not a string, then actualProjectData was already an object, which shouldn't happen
                } catch (parseError) {
                    // If it can't be parsed, it might already be a correctly formatted JSON string of the project
                    // (which is fine - that's what we want)
                    log(`API: projectData is a JSON string (not double-encoded) for project: ${projectName}`, 'info');
                }
            }
            
            // Verify that projectData is a string
            if (typeof actualProjectData !== 'string') {
                log(`API: projectData is not a string for project ${projectName}, type: ${typeof actualProjectData}`, 'error');
                return res.status(500).json({
                    success: false,
                    error: 'Invalid project data format'
                });
            }
            
            // Return projectData as JSON string - Express automatically escapes it in JSON response
            // Frontend then parses it using response.json() and gets the correct string
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
                error: `Auto-save project "${projectName}" not found`
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

// Continuous project saving (without starting service)
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
        
        const name = projectName || 'Unknown project';
        
        // Save projectData as string (JSON string), because vm.toJSON() returns string
        // and loadProject() expects either string or object (which gets converted to string)
        // If projectData is already a string, use it directly
        // If it's an object, convert it to JSON string
        const actualProjectData = typeof projectData === 'string' 
            ? projectData 
            : JSON.stringify(projectData);
        
        // Save project without starting service (auto-save)
        const saved = await saveProject(actualProjectData, name, true);
        
        if (saved) {
            const response = { 
                success: true, 
                message: `Project ${name} automatically saved`,
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

// Delete saved project
app.delete('/api/saved-project', async (req, res) => {
    try {
        log('API: Delete saved project requested', 'info');
        
        if (await fs.pathExists(SAVED_PROJECT_PATH)) {
            await fs.remove(SAVED_PROJECT_PATH);
            log('Saved project deleted', 'success');
            res.json({ success: true, message: 'Saved project deleted' });
        } else {
            res.json({ success: true, message: 'No saved project found' });
        }
    } catch (error) {
        log(`API: Error deleting saved project: ${error.message}`, 'error');
        res.status(500).json({ 
            error: 'Error deleting saved project', 
            details: error.message 
        });
    }
});

// Delete auto-save project by name
app.delete('/api/saved-project/auto-save', async (req, res) => {
    try {
        const projectName = req.query.projectName;
        log('API: Delete auto-save project requested', 'info', { projectName });
        
        if (!projectName) {
            return res.status(400).json({
                success: false,
                error: 'Project name is required'
            });
        }
        
        // If project is running, stop it (this updates the list of running projects)
        if (runningServices.has(projectName)) {
            log(`Project ${projectName} is running, stopping it before deletion...`, 'info');
            await stopService(projectName);
        } else {
            // Even if project is not running, remove it from running-projects.json
            // (it might have been terminated but still be in the file)
            log(`Project ${projectName} not running, removing from running-projects.json if present...`, 'info');
            await removeProjectFromRunningProjects(projectName);
        }
        
        // If directory doesn't exist, project doesn't exist
        if (!await fs.pathExists(AUTO_SAVE_DIR)) {
            return res.json({ success: true, message: `Auto-save project "${projectName}" not found` });
        }
        
        // First try to find file directly by sanitized name (faster)
        const safeFileName = sanitizeFileName(projectName);
        const directFilePath = path.join(AUTO_SAVE_DIR, safeFileName);
        
        if (await fs.pathExists(directFilePath)) {
            try {
                const projectInfo = await fs.readJson(directFilePath);
                // Verify that original name in file matches searched name
                if (projectInfo.projectName === projectName) {
                    await fs.remove(directFilePath);
                    log(`Auto-save project ${projectName} deleted (direct access)`, 'success');
                    return res.json({ success: true, message: `Auto-save project "${projectName}" deleted` });
                }
            } catch (error) {
                log(`Error loading file ${safeFileName}: ${error.message}`, 'error');
            }
        }
        
        // Fallback: Go through all files and search by original name
        const files = await fs.readdir(AUTO_SAVE_DIR);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(AUTO_SAVE_DIR, file);
                    const projectInfo = await fs.readJson(filePath);
                    
                    // Compare original names (case-sensitive)
                    if (projectInfo.projectName === projectName) {
                        await fs.remove(filePath);
                        log(`Auto-save project ${projectName} deleted (fallback)`, 'success');
                        return res.json({ success: true, message: `Auto-save project "${projectName}" deleted` });
                    }
                } catch (error) {
                    log(`Error loading file ${file}: ${error.message}`, 'error');
                }
            }
        }
        
        res.json({ success: true, message: `Auto-save project "${projectName}" not found` });
    } catch (error) {
        log(`API: Error deleting auto-save project: ${error.message}`, 'error');
        res.status(500).json({ 
            error: 'Error deleting auto-save project', 
            details: error.message 
        });
    }
});

// List all auto-save projects
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
                    log(`Error loading file ${file}: ${error.message}`, 'error');
                }
            }
        }
        
        // Sort by save time (newest first)
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

// Function to check for presence of IP component in project
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
        
        // Iterate through all sprites and stage
        for (const target of projectData.targets) {
            if (target.blocks) {
                log(`Checking target ${target.name} with ${Object.keys(target.blocks).length} blocks`, 'info');
                // Iterate through all blocks
                for (const blockId in target.blocks) {
                    const block = target.blocks[blockId];
                    log(`Checking block ${blockId}: opcode=${block.opcode}`, 'info');
                    // Check if this is an AlbiLAB block for setting IP
                    if (block.opcode === 'albilab_setDeviceIP' && block.inputs && block.inputs.IP) {
                        const ipValue = block.inputs.IP[1][1]; // [1][1] to get the actual value
                        log(`Found AlbiLAB IP block with IP: ${ipValue}`, 'info');
                        // Check if IP has a value (not empty)
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

// Deploy project (save to AlbiLAB)
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
        
        // Load project from auto-save
        const projectData = await loadAutoSaveProject(projectName);
        if (!projectData) {
            return res.status(404).json({ 
                success: false,
                error: `Project ${projectName} not found in auto-save` 
            });
        }
        
        // Validate presence of IP component
        // If projectData is a string, parse it
        const actualProjectData = typeof projectData.projectData === 'string' 
            ? JSON.parse(projectData.projectData) 
            : projectData.projectData;
        
        if (!validateAlbiLABIPComponent(actualProjectData)) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing AlbiLAB IP address component. Add the "set AlbiLAB IP address to [IP]" block to your project.' 
            });
        }
        
        // Save project to AlbiLAB (deploy)
        // saveProject expects a string, so convert object back to JSON string
        const projectDataString = typeof actualProjectData === 'string' 
            ? actualProjectData 
            : JSON.stringify(actualProjectData);
        const saved = await saveProject(projectDataString, projectName, false);
        
        if (saved) {
            const response = { 
                success: true, 
                message: `Project ${projectName} has been deployed to AlbiLAB`,
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

// Start deployed project
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
        
        // Check if project is deployed
        const isDeployed = await isProjectDeployed(projectName);
        if (!isDeployed) {
            return res.status(404).json({ 
                success: false,
                error: `Project ${projectName} is not deployed. Deploy it first.` 
            });
        }
        
        // Check if it's already running
        if (runningServices.has(projectName)) {
            return res.status(409).json({ 
                success: false,
                error: `Project ${projectName} is already running` 
            });
        }
        
        // Load project from auto-save
        const projectData = await loadAutoSaveProject(projectName);
        if (!projectData) {
            return res.status(404).json({ 
                success: false,
                error: `Project ${projectName} not found` 
            });
        }
        
        // Validate presence of IP component
        // If projectData.projectData is a string, parse it
        const actualProjectData = typeof projectData.projectData === 'string' 
            ? JSON.parse(projectData.projectData) 
            : projectData.projectData;
        
        if (!validateAlbiLABIPComponent(actualProjectData)) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing AlbiLAB IP address component. Add the "set AlbiLAB IP address to [IP]" block to your project.' 
            });
        }
        
        // Start service
        await startService(actualProjectData, projectName);
        
        const response = { 
            success: true, 
            message: `Project ${projectName} has been started`,
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

// Stop specific project
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
        
        // Stop service (this will handle both running services and projects in running-projects.json)
        const stopped = await stopService(projectName);
        
        if (stopped) {
            const response = { 
                success: true, 
                message: `Project ${projectName} has been stopped and removed from running projects`,
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

// List of projects with their status
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
                    log(`Error loading file ${file}: ${error.message}`, 'error');
                }
            }
        }
        
        // Sort by save time (newest first)
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

// WebSocket connection
wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    log(`New WebSocket connection (ID: ${clientId})`, 'info', {
        clientId,
        totalConnections: wss.clients.size,
        clientIP: ws._socket ? ws._socket.remoteAddress : 'unknown'
    });
    
    // Send current status
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
    log(`Status data sent to client ${clientId}`, 'info', {
        clientId,
        statusType: statusData.type,
        serviceRunning: statusData.data.running,
        projectName: statusData.data.projectName,
        logsCount: statusData.data.logs ? statusData.data.logs.length : 0
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            log(`WebSocket message from client ${clientId}`, 'info', {
                clientId,
                messageType: data.type,
                messageData: data
            });
        } catch (error) {
            log(`Error parsing WebSocket message from client ${clientId}`, 'error', {
                clientId,
                rawMessage: message.toString(),
                error: error.message
            });
        }
    });
    
    ws.on('close', (code, reason) => {
        log(`WebSocket connection closed (ID: ${clientId})`, 'info', {
            clientId,
            closeCode: code,
            closeReason: reason ? reason.toString() : 'no reason',
            remainingConnections: wss.clients.size - 1
        });
    });
    
    ws.on('error', (error) => {
        log(`WebSocket error for client ${clientId}`, 'error', {
            clientId,
            error: error.message,
            errorStack: error.stack
        });
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    log('Received SIGINT, shutting down server...', 'info');
    // When shutting down server, we don't save the list of running projects, to preserve it for automatic startup after restart
    await stopAllServices(false);
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('Received SIGTERM, shutting down server...', 'info');
    // When shutting down server, we don't save the list of running projects, to preserve it for automatic startup after restart
    await stopAllServices(false);
    process.exit(0);
});

// Startup script - runs on every server start
async function runServerStartupScript() {
    try {
        log('Running startup script...', 'info');
        
        // Run external startup script
        await runStartupScript();
        
        // Wait a bit for server to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Automatic startup of all deployed projects
        await checkAndStartMissingProjects();
        
        log('Startup script completed', 'success');
    } catch (error) {
        log(`Error in startup script: ${error.message}`, 'error', {
            errorName: error.name,
            errorStack: error.stack
        });
        // We don't want the server to fail to start due to auto-start error
        // throw error; // Commented out - server will start even if auto-start fails
    }
}


// Start server
app.listen(PORT, async () => {
    log(`Backend server running on port ${PORT}`, 'info');
    log(`WebSocket server running on port 3002`, 'info');
    
    // Run startup script after server starts
    await runServerStartupScript();
    
    // Start periodic check for missing projects (every 5 minutes)
    setInterval(async () => {
        log('Periodic check: Running scheduled check...', 'info');
        await checkAndStartMissingProjects();
    }, 5 * 60 * 1000); // 5 minutes = 300000 ms
    
    log('Periodic project check started (every 5 minutes)', 'info');
});

module.exports = app;
