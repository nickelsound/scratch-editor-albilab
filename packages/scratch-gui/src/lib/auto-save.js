import {getApiUrl} from './api-config.js';

/**
 * Auto-save service for automatic project saving
 */
class AutoSaveService {
    constructor() {
        this.isEnabled = true;
        this.saveInterval = 30000; // 30 seconds
        this.lastSaveTime = null;
        this.isSaving = false;
        this.saveTimeout = null;
        this.vm = null;
        this.projectTitle = 'Unknown project';
        this.onSaveStatusChange = null;
    }

    /**
     * Sets VM instance and callback for status changes
     */
    initialize(vm, projectTitle, onSaveStatusChange = null) {
        this.vm = vm;
        this.projectTitle = projectTitle || 'Unknown project';
        this.onSaveStatusChange = onSaveStatusChange;
        
        console.log('Auto-save service initialized', {
            projectTitle: this.projectTitle,
            saveInterval: this.saveInterval
        });
    }

    /**
     * Starts automatic saving
     */
    async start() {
        if (!this.isEnabled || !this.vm) {
            console.log('Auto-save cannot be started - not initialized');
            return;
        }

        console.log('Starting auto-save service');
        
        // Try to load existing auto-save project
        await this.loadExistingProject();
        
        this.scheduleNextSave();
    }

    /**
     * Stops automatic saving
     */
    stop() {
        console.log('Stopping auto-save service');
        this.isEnabled = false;
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }

    /**
     * Loads existing auto-save project by name
     */
    async loadExistingProject() {
        if (!this.projectTitle || this.projectTitle === 'Unknown project') {
            console.log('Project name not provided - cannot load auto-save project');
            return;
        }

        try {
            const apiUrl = getApiUrl(`/saved-project/auto-save/load?projectName=${encodeURIComponent(this.projectTitle)}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.projectData) {
                    console.log(`Loading existing auto-save project: ${result.projectName}`);
                    
                    // projectData can be a string (JSON string) or already an object (due to escaping)
                    let projectData = result.projectData;
                    
                    // If it's a string, use it directly (vm.loadProject() accepts string)
                    // If it's an object, convert it to JSON string
                    if (typeof projectData === 'object' && projectData !== null) {
                        // Object - convert to JSON string
                        projectData = JSON.stringify(projectData);
                    }
                    
                    // Verify that projectData is a string
                    if (typeof projectData !== 'string') {
                        throw new Error('Invalid project data format');
                    }
                    
                    // Load project into VM - loadProject() accepts JSON string
                    await this.vm.loadProject(projectData);
                    
                    // Update last save time
                    this.lastSaveTime = new Date(result.savedAt);
                    this.updateSaveStatus('loaded');
                    
                    console.log('Auto-save project successfully loaded');
                } else {
                    console.log('No auto-save project found for:', this.projectTitle);
                }
            } else {
                console.log('Auto-save project not found for:', this.projectTitle);
            }
        } catch (error) {
            console.error('Error loading auto-save project:', error);
        }
    }

    /**
     * Schedules next save
     */
    scheduleNextSave() {
        if (!this.isEnabled) return;

        this.saveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, this.saveInterval);
    }

    /**
     * Performs automatic save
     */
    async performAutoSave() {
        if (this.isSaving || !this.vm) {
            this.scheduleNextSave();
            return;
        }

        try {
            // Get current project data from VM as JSON
            const projectData = this.vm.toJSON();
            
            // Check if project is empty (has no blocks) - if so, skip saving
            const isEmpty = this.isProjectEmpty(projectData);
            if (isEmpty) {
                console.log('Project is empty (no blocks) - skipping auto-save');
                this.scheduleNextSave();
                return;
            }
            
            console.log('Project has blocks - proceeding with auto-save');

            this.isSaving = true;
            this.updateSaveStatus('saving');

            console.log('Performing automatic project save...');
            
            // Send to backend
            const apiUrl = getApiUrl('/saved-project/auto-save');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectData: projectData,
                    projectName: this.projectTitle
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.lastSaveTime = new Date();
                console.log('Project automatically saved:', result);
                this.isSaving = false;
                this.updateSaveStatus('saved');
            } else {
                console.error('Error during automatic save:', response.status, response.statusText);
                this.isSaving = false;
                this.updateSaveStatus('error');
            }

        } catch (error) {
            console.error('Error during automatic save:', error);
            this.isSaving = false;
            this.updateSaveStatus('error');
        } finally {
            this.scheduleNextSave();
        }
    }

    /**
     * Updates save status
     */
    updateSaveStatus(status) {
        if (this.onSaveStatusChange) {
            this.onSaveStatusChange({
                status: status,
                lastSaveTime: this.lastSaveTime,
                isSaving: status === 'saving' ? true : false
            });
        }
    }

    /**
     * Checks if project is empty (has no blocks)
     */
    isProjectEmpty(projectData) {
        try {
            // Parse project data if it's a string
            let parsed = projectData;
            if (typeof projectData === 'string') {
                try {
                    parsed = JSON.parse(projectData);
                } catch (parseError) {
                    console.error('Error parsing project data:', parseError);
                    // If we can't parse, assume it's not empty to be safe (don't skip saving)
                    return false;
                }
            }
            
            if (!parsed || typeof parsed !== 'object') {
                console.log('Project is empty: invalid parsed data', { type: typeof parsed });
                return true;
            }
            
            if (!parsed.targets || !Array.isArray(parsed.targets)) {
                console.log('Project is empty: invalid targets structure', {
                    hasTargets: !!parsed.targets,
                    isArray: Array.isArray(parsed.targets)
                });
                return true;
            }
            
            // Check all targets for blocks
            for (const target of parsed.targets) {
                if (!target || typeof target !== 'object') {
                    continue;
                }
                
                // Check if target has blocks property
                if (target.blocks !== null && target.blocks !== undefined) {
                    // blocks is an object (not array) - check for keys
                    if (typeof target.blocks === 'object' && !Array.isArray(target.blocks)) {
                        const blockKeys = Object.keys(target.blocks);
                        // Filter out any null/undefined values - any key that exists is a valid block
                        const validBlockKeys = blockKeys.filter(key => target.blocks[key] != null);
                        // If there are any valid blocks, project is not empty
                        if (validBlockKeys.length > 0) {
                            console.log('Project has blocks: found', validBlockKeys.length, 'blocks in target', target.name || target.id);
                            return false;
                        }
                    } else if (Array.isArray(target.blocks) && target.blocks.length > 0) {
                        // blocks is an array (shouldn't happen in SB3, but be safe)
                        console.log('Project has blocks: found blocks array with length', target.blocks.length);
                        return false;
                    }
                }
            }
            
            // No blocks found in any target
            console.log('Project is empty: no blocks found in any target', {
                targetCount: parsed.targets.length,
                targets: parsed.targets.map(t => ({
                    name: t.name,
                    hasBlocks: !!(t && t.blocks),
                    blocksType: t && t.blocks ? typeof t.blocks : 'undefined',
                    blocksKeys: t && t.blocks && typeof t.blocks === 'object' && !Array.isArray(t.blocks) 
                        ? Object.keys(t.blocks).length 
                        : 'N/A'
                }))
            });
            return true;
        } catch (error) {
            console.error('Error checking if project is empty:', error);
            // If we can't parse, assume it's not empty to be safe (don't skip saving)
            return false;
        }
    }

    /**
     * Sets project title
     */
    setProjectTitle(title) {
        this.projectTitle = title || 'Unknown project';
        console.log('Project title updated:', this.projectTitle);
    }

    /**
     * Sets save interval (in milliseconds)
     */
    setSaveInterval(interval) {
        this.saveInterval = Math.max(5000, interval); // Minimum 5 seconds
        console.log('Save interval set to:', this.saveInterval, 'ms');
    }

    /**
     * Forces immediate save
     */
    async forceSave() {
        if (this.isSaving) {
            console.log('Save already in progress...');
            return false;
        }

        console.log('Forcing immediate save...');
        await this.performAutoSave();
        return true;
    }

    /**
     * Gets auto-save status information
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            isSaving: this.isSaving,
            lastSaveTime: this.lastSaveTime,
            saveInterval: this.saveInterval,
            projectTitle: this.projectTitle
        };
    }
}

// Create global instance
const autoSaveService = new AutoSaveService();

export default autoSaveService;
