import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import AutoSaveManagerComponent from '../components/menu-bar/auto-save-manager.jsx';
import {setProjectTitle} from '../reducers/project-title.js';
import {getApiUrl} from '../lib/api-config.js';
import notificationService from '../lib/notification-service.js';
import DragRecognizer from '../lib/drag-recognizer';
import DragConstants from '../lib/drag-constants';
import {updateAssetDrag} from '../reducers/asset-drag';

class AutoSaveManager extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: false,
            projects: [],
            isLoading: false
        };
        bindAll(this, [
            'handleOpen',
            'handleClose',
            'loadProjects',
            'handleLoadProject',
            'handleDeployProject',
            'handleDeployCurrentProject',
            'handleStartProject',
            'handleStopProject',
            'handleRestoreFromDeploy',
            'handleDeleteProject',
            'handleDrag',
            'handleDragEnd',
            'handleDropDraft',
            'handleDropDeployed'
        ]);
        this.dragRecognizers = new Map();
    }

    componentDidMount() {
        // Add event listener for opening manager
        this.handleOpenEvent = () => {
            this.handleOpen();
        };
        window.addEventListener('openAutoSaveManager', this.handleOpenEvent);
    }

    componentWillUnmount() {
        window.removeEventListener('openAutoSaveManager', this.handleOpenEvent);
        // Clean up drag recognizers
        this.dragRecognizers.forEach(recognizer => recognizer.reset());
        this.dragRecognizers.clear();
    }

    handleOpen() {
        this.setState({isOpen: true});
        this.loadProjects();
    }

    handleClose() {
        this.setState({isOpen: false});
    }

    loadProjects = async () => {
        this.setState({isLoading: true});
        
        try {
            const apiUrl = getApiUrl('projects-status');
            console.log('Loading projects from URL:', apiUrl);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API response:', data);
                if (data.success) {
                    console.log('Loaded projects:', data.projects.length);
                    this.setState({projects: data.projects});
                } else {
                    console.error('Error loading project list:', data.error);
                    this.setState({projects: []});
                    notificationService.showError(data.error || this.props.intl.formatMessage({id: 'gui.errors.loadingProjects'}), this.props.intl.formatMessage({id: 'gui.errors.error'}));
                }
            } else {
                console.error('Error loading project list:', response.statusText);
                this.setState({projects: []});
                notificationService.showError(this.props.intl.formatMessage({id: 'gui.errors.loadingProjectsWithDetails'}, {details: response.statusText}), this.props.intl.formatMessage({id: 'gui.errors.error'}));
            }
        } catch (error) {
            console.error('Error loading project list:', error);
            this.setState({projects: []});
            notificationService.showError(this.props.intl.formatMessage({id: 'gui.errors.loadingProjectsWithDetails'}, {details: error.message}), this.props.intl.formatMessage({id: 'gui.errors.error'}));
        } finally {
            this.setState({isLoading: false});
        }
    }

    handleLoadProject = async (projectName) => {
        try {
            const apiUrl = getApiUrl(`/saved-project/auto-save/load?projectName=${encodeURIComponent(projectName)}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.projectData) {
                    // projectData can be a string (JSON string) or already an object (due to escaping)
                    let projectData = data.projectData;
                    
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
                    
                    // Check and fix project before loading
                    let parsedProject;
                    try {
                        parsedProject = JSON.parse(projectData);
                        console.log('Loaded project - validation:', {
                            hasTargets: !!parsedProject.targets,
                            targetsCount: parsedProject.targets ? parsedProject.targets.length : 0,
                            projectVersion: parsedProject.projectVersion,
                            hasMeta: !!parsedProject.meta
                        });
                        
                        // Ensure project has projectVersion = 3 (SB3 format)
                        if (!parsedProject.projectVersion) {
                            console.warn('Project does not have projectVersion, setting to 3');
                            parsedProject.projectVersion = 3;
                        }
                        
                        // Ensure project has meta object
                        if (!parsedProject.meta) {
                            console.warn('Project does not have meta object, creating it');
                            parsedProject.meta = {
                                semver: '3.0.0',
                                vm: '0.2.0',
                                agent: 'Mozilla/5.0'
                            };
                        }
                        
                        let needsFix = false;
                        
                        // Check targets and fix any problems
                        if (!parsedProject.targets || !Array.isArray(parsedProject.targets) || parsedProject.targets.length === 0) {
                            console.warn('Project has no targets! Creating minimal valid project with stage.');
                            // Create minimal valid project with stage
                            parsedProject.targets = [{
                                isStage: true,
                                name: 'Stage',
                                variables: {},
                                lists: {},
                                broadcasts: {},
                                blocks: {},
                                currentCostume: 0,
                                costumes: [{
                                    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                                    name: 'backdrop1',
                                    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                                    dataFormat: 'svg',
                                    rotationCenterX: 240,
                                    rotationCenterY: 180
                                }],
                                sounds: [],
                                volume: 100
                            }];
                            needsFix = true;
                        }
                        
                        if (parsedProject.targets && Array.isArray(parsedProject.targets) && parsedProject.targets.length > 0) {
                            // Find stage (should be only one and at first position)
                            let stageIndex = -1;
                            let stageTarget = null;
                            
                            // Find stage
                            parsedProject.targets.forEach((target, index) => {
                                if (target.isStage === true) {
                                    if (stageIndex === -1) {
                                        stageIndex = index;
                                        stageTarget = target;
                                    } else {
                                        // More than one stage - fix
                                        console.warn(`Fixing duplicate stage at index ${index}: ${target.name}`);
                                        target.isStage = false;
                                        needsFix = true;
                                    }
                                }
                            });
                            
                            // If stage doesn't exist, create it from first target or add new one
                            if (stageIndex === -1) {
                                console.warn('Stage not found, creating it from first target');
                                if (parsedProject.targets.length > 0) {
                                    // Use first target as stage
                                    parsedProject.targets[0].isStage = true;
                                    parsedProject.targets[0].name = 'Stage';
                                    stageIndex = 0;
                                    stageTarget = parsedProject.targets[0];
                                    needsFix = true;
                                } else {
                                    console.error('Project has no targets! Creating new stage.');
                                    // Create new stage
                                    const newStage = {
                                        isStage: true,
                                        name: 'Stage',
                                        variables: {},
                                        lists: {},
                                        broadcasts: {},
                                        blocks: {},
                                        currentCostume: 0,
                                        costumes: [{
                                            assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                                            name: 'backdrop1',
                                            md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                                            dataFormat: 'svg',
                                            rotationCenterX: 240,
                                            rotationCenterY: 180
                                        }],
                                        sounds: [],
                                        volume: 100
                                    };
                                    parsedProject.targets.unshift(newStage);
                                    stageIndex = 0;
                                    stageTarget = newStage;
                                    needsFix = true;
                                }
                            }
                            
                            // Ensure stage is at first position
                            if (stageIndex > 0 && stageTarget) {
                                console.warn(`Moving stage from index ${stageIndex} to index 0`);
                                parsedProject.targets.splice(stageIndex, 1);
                                parsedProject.targets.unshift(stageTarget);
                                stageIndex = 0;
                                needsFix = true;
                            }
                            
                            // Ensure stage has isStage = true
                            if (stageTarget && stageTarget.isStage !== true) {
                                console.warn('Fixing isStage for stage to true');
                                stageTarget.isStage = true;
                                needsFix = true;
                            }
                            
                            // Ensure stage has all necessary properties
                            if (stageTarget) {
                                if (!stageTarget.variables) {
                                    console.warn('Adding empty variables to stage');
                                    stageTarget.variables = {};
                                    needsFix = true;
                                }
                                if (!stageTarget.lists) {
                                    console.warn('Adding empty lists to stage');
                                    stageTarget.lists = {};
                                    needsFix = true;
                                }
                                if (!stageTarget.broadcasts) {
                                    console.warn('Adding empty broadcasts to stage');
                                    stageTarget.broadcasts = {};
                                    needsFix = true;
                                }
                                if (!stageTarget.blocks) {
                                    console.warn('Adding empty blocks to stage');
                                    stageTarget.blocks = {};
                                    needsFix = true;
                                }
                                if (!stageTarget.costumes || !Array.isArray(stageTarget.costumes) || stageTarget.costumes.length === 0) {
                                    console.warn('Adding default costume to stage');
                                    if (!stageTarget.costumes) {
                                        stageTarget.costumes = [];
                                    }
                                    if (stageTarget.costumes.length === 0) {
                                        stageTarget.costumes.push({
                                            assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                                            name: 'backdrop1',
                                            md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                                            dataFormat: 'svg',
                                            rotationCenterX: 240,
                                            rotationCenterY: 180
                                        });
                                    }
                                    stageTarget.currentCostume = 0;
                                    needsFix = true;
                                }
                            }
                            
                            // Fix all sprites - isStage must be false
                            parsedProject.targets.forEach((target, index) => {
                                if (index !== 0 && target.isStage !== false) {
                                    console.warn(`Fixing isStage for sprite ${index}: ${target.name}`, {
                                        oldValue: target.isStage,
                                        newValue: false
                                    });
                                    target.isStage = false;
                                    needsFix = true;
                                }
                            });
                            
                            if (needsFix) {
                                // Re-parse fixed project
                                projectData = JSON.stringify(parsedProject);
                                console.log('Project was fixed before loading');
                            }
                            
                            // Final check - verify that stage exists and has all necessary properties
                            const finalStage = parsedProject.targets && parsedProject.targets.length > 0 && parsedProject.targets[0].isStage === true
                                ? parsedProject.targets[0]
                                : null;
                            
                            if (!finalStage) {
                                throw new Error('Project does not have valid stage at first position. Cannot load project.');
                            }
                            
                            // Check that stage has all critical properties
                            if (!finalStage.variables || !finalStage.lists || !finalStage.broadcasts || !finalStage.blocks) {
                                console.warn('Stage does not have all necessary properties, adding them...');
                                finalStage.variables = finalStage.variables || {};
                                finalStage.lists = finalStage.lists || {};
                                finalStage.broadcasts = finalStage.broadcasts || {};
                                finalStage.blocks = finalStage.blocks || {};
                                projectData = JSON.stringify(parsedProject);
                            }
                            
                            if (!finalStage.costumes || !Array.isArray(finalStage.costumes) || finalStage.costumes.length === 0) {
                                console.warn('Stage does not have costumes, adding default...');
                                finalStage.costumes = [{
                                    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                                    name: 'backdrop1',
                                    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                                    dataFormat: 'svg',
                                    rotationCenterX: 240,
                                    rotationCenterY: 180
                                }];
                                finalStage.currentCostume = 0;
                                projectData = JSON.stringify(parsedProject);
                            }
                        } else {
                            // If targets don't exist, create minimal project
                            console.warn('Project does not have targets array, creating minimal valid project');
                            parsedProject.targets = [{
                                isStage: true,
                                name: 'Stage',
                                variables: {},
                                lists: {},
                                broadcasts: {},
                                blocks: {},
                                currentCostume: 0,
                                costumes: [{
                                    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                                    name: 'backdrop1',
                                    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                                    dataFormat: 'svg',
                                    rotationCenterX: 240,
                                    rotationCenterY: 180
                                }],
                                sounds: [],
                                volume: 100
                            }];
                            projectData = JSON.stringify(parsedProject);
                        }
                    } catch (parseError) {
                        console.error('Error parsing project before loading:', parseError);
                        throw new Error(`Error parsing project: ${parseError.message}`);
                    }
                    
                    // Load project into VM - loadProject() accepts JSON string
                    try {
                        await this.props.vm.loadProject(projectData);
                    } catch (loadError) {
                        console.error('Error loading project into VM:', loadError);
                        // Try to check if problem is with stage
                        try {
                            const parsed = JSON.parse(projectData);
                            if (parsed.targets && parsed.targets.length > 0) {
                                const firstTarget = parsed.targets[0];
                                if (!firstTarget.isStage) {
                                    throw new Error('First target is not stage. Project has invalid structure.');
                                }
                            }
                        } catch (checkError) {
                            console.error('Error checking project structure:', checkError);
                        }
                        throw loadError;
                    }
                    
                    // Update project title
                    this.props.setProjectTitle(data.projectName);
                    
                    // Close manager
                    this.handleClose();
                    
                    notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectLoaded'}, {name: data.projectName}));
                } else {
                    notificationService.showError(data.error || this.props.intl.formatMessage({id: 'gui.errors.unknownError'}), this.props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    notificationService.showError(errorData.error || response.statusText, this.props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                } catch (parseError) {
                    notificationService.showError(response.statusText, this.props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                }
            }
        } catch (error) {
            console.error('Error loading project:', error);
            notificationService.showError(error.message, this.props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
        }
    }

    handleDeployProject = async (projectName) => {
        try {
            const apiUrl = getApiUrl('deploy-project');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ projectName })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // After successful deployment, start the project (Run permanently = deploy + start)
                    const startUrl = getApiUrl('start-project');
                    const startResponse = await fetch(startUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ projectName })
                    });
                    
                    if (startResponse.ok) {
                        const startData = await startResponse.json();
                        if (startData.success) {
                            // Update project list
                            this.loadProjects();
                            notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.currentProjectDeployedAndStarted'}, {name: projectName}));
                        } else {
                            // Update project list
                            this.loadProjects();
                            notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectDeployed'}, {name: projectName}));
                            notificationService.showWarning(this.props.intl.formatMessage({id: 'gui.warnings.projectDeployedButNotStarted'}));
                        }
                    } else {
                        // Update project list
                        this.loadProjects();
                        notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectDeployed'}, {name: projectName}));
                        notificationService.showWarning(this.props.intl.formatMessage({id: 'gui.warnings.projectDeployedButNotStarted'}));
                    }
                } else {
                    notificationService.showError(data.error || this.props.intl.formatMessage({id: 'gui.errors.unknownError'}), this.props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    notificationService.showError(errorData.error || response.statusText, this.props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                } catch (parseError) {
                    notificationService.showError(response.statusText, this.props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            }
        } catch (error) {
            console.error('Error deploying project:', error);
            notificationService.showError(error.message, this.props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
        }
    }

    handleDeployCurrentProject = async () => {
        try {
            if (!this.props.vm) {
                notificationService.showWarning(this.props.intl.formatMessage({id: 'gui.errors.noProjectLoaded'}));
                return;
            }

            // Get current project data from VM
            const projectData = this.props.vm.toJSON();
            const projectName = this.props.projectTitle || this.props.intl.formatMessage({id: 'gui.gui.unknownProject'});

            // First save project to auto-save
            const autoSaveUrl = getApiUrl('/saved-project/auto-save');
            const autoSaveResponse = await fetch(autoSaveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectData: projectData,
                    projectName: projectName
                })
            });

            if (!autoSaveResponse.ok) {
                notificationService.showError(this.props.intl.formatMessage({id: 'gui.errors.savingProjectWithDetails'}, {details: autoSaveResponse.statusText}));
                return;
            }

            // Then deploy project
            const deployUrl = getApiUrl('deploy-project');
            const deployResponse = await fetch(deployUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ projectName })
            });
            
            if (deployResponse.ok) {
                const data = await deployResponse.json();
                if (data.success) {
                    // After successful deployment, start the project
                    const startUrl = getApiUrl('start-project');
                    const startResponse = await fetch(startUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ projectName })
                    });
                    
                    if (startResponse.ok) {
                        const startData = await startResponse.json();
                        if (startData.success) {
                            // Update project list
                            this.loadProjects();
                            notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.currentProjectDeployedAndStarted'}, {name: projectName}));
                        } else {
                            // Update project list
                            this.loadProjects();
                            notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.currentProjectDeployed'}, {name: projectName}));
                            notificationService.showWarning(this.props.intl.formatMessage({id: 'gui.warnings.projectDeployedButNotStarted'}));
                        }
                    } else {
                        // Update project list
                        this.loadProjects();
                        notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.currentProjectDeployed'}, {name: projectName}));
                        notificationService.showWarning(this.props.intl.formatMessage({id: 'gui.warnings.projectDeployedButNotStarted'}));
                    }
                } else {
                    notificationService.showError(data.error || this.props.intl.formatMessage({id: 'gui.errors.unknownError'}), this.props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await deployResponse.json();
                    notificationService.showError(errorData.error || deployResponse.statusText, this.props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                } catch (parseError) {
                    notificationService.showError(deployResponse.statusText, this.props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            }
        } catch (error) {
            console.error('Error deploying current project:', error);
            notificationService.showError(error.message, this.props.intl.formatMessage({id: 'gui.errors.deployingCurrentProject'}));
        }
    }

    handleStartProject = async (projectName) => {
        try {
            const apiUrl = getApiUrl('start-project');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ projectName })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update project list
                    this.loadProjects();
                    notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectStarted'}, {name: projectName}));
                } else {
                    notificationService.showError(data.error || this.props.intl.formatMessage({id: 'gui.errors.unknownError'}), this.props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    notificationService.showError(errorData.error || response.statusText, this.props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                } catch (parseError) {
                    notificationService.showError(response.statusText, this.props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                }
            }
        } catch (error) {
            console.error('Error starting project:', error);
            notificationService.showError(error.message, this.props.intl.formatMessage({id: 'gui.errors.startingProject'}));
        }
    }

    handleStopProject = async (projectName) => {
        try {
            const apiUrl = getApiUrl('stop-project');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ projectName })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update project list
                    this.loadProjects();
                    notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectStopped'}, {name: projectName}));
                } else {
                    notificationService.showError(data.error || this.props.intl.formatMessage({id: 'gui.errors.unknownError'}), this.props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    notificationService.showError(errorData.error || response.statusText, this.props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                } catch (parseError) {
                    notificationService.showError(response.statusText, this.props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                }
            }
        } catch (error) {
            console.error('Error stopping project:', error);
            notificationService.showError(error.message, this.props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
        }
    }

    handleRestoreFromDeploy = async (projectName) => {
        // Show warning before loading project to editor
        const confirmMessage = this.props.intl.formatMessage(
            {id: 'gui.menuBar.autoSaveManager.confirmLoadToEditor'},
            {defaultMessage: 'Loading this project will overwrite your current work in the editor. If you want to keep your current work, you can export it first using File → Save to your computer. Do you want to continue?'}
        );
        
        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) {
            return;
        }

        try {
            const apiUrl = getApiUrl('restore-from-deploy');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ projectName })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update project list
                    this.loadProjects();
                    
                    // If project data is returned, load it into editor
                    if (data.projectData && this.props.vm) {
                        try {
                            let projectData = data.projectData;
                            
                            // Ensure projectData is a string
                            if (typeof projectData !== 'string') {
                                projectData = JSON.stringify(projectData);
                            }
                            
                            // Load project into VM
                            await this.props.vm.loadProject(projectData);
                            
                            // Update project title
                            this.props.setProjectTitle(projectName);
                            
                            // Close manager
                            this.handleClose();
                            
                            notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectRestoredFromDeploy'}, {name: projectName}));
                        } catch (loadError) {
                            console.error('Error loading restored project:', loadError);
                            notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectRestoredFromDeploy'}, {name: projectName}));
                            notificationService.showWarning(this.props.intl.formatMessage({id: 'gui.warnings.projectRestoredButNotLoaded'}));
                        }
                    } else {
                        notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectRestoredFromDeploy'}, {name: projectName}));
                    }
                } else {
                    notificationService.showError(data.error || this.props.intl.formatMessage({id: 'gui.errors.unknownError'}), this.props.intl.formatMessage({id: 'gui.errors.restoringFromDeploy'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    notificationService.showError(errorData.error || response.statusText, this.props.intl.formatMessage({id: 'gui.errors.restoringFromDeploy'}));
                } catch (parseError) {
                    notificationService.showError(response.statusText, this.props.intl.formatMessage({id: 'gui.errors.restoringFromDeploy'}));
                }
            }
        } catch (error) {
            console.error('Error restoring from deploy:', error);
            notificationService.showError(error.message, this.props.intl.formatMessage({id: 'gui.errors.restoringFromDeploy'}));
        }
    }

    handleDeleteProject = async (projectName, isDeployed) => {
        try {
            // Determine delete type based on project location
            const deleteType = isDeployed ? 'deployed' : 'auto-save';
            const apiUrl = getApiUrl(`/saved-project/auto-save?projectName=${encodeURIComponent(projectName)}&type=${deleteType}`);
            const response = await fetch(apiUrl, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update project list
                    this.loadProjects();
                    notificationService.showSuccess(this.props.intl.formatMessage({id: 'gui.success.projectDeleted'}, {name: projectName}));
                } else {
                    notificationService.showError(data.error || this.props.intl.formatMessage({id: 'gui.errors.unknownError'}), this.props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    notificationService.showError(errorData.error || response.statusText, this.props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                } catch (parseError) {
                    notificationService.showError(response.statusText, this.props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                }
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            notificationService.showError(error.message, this.props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
        }
    }

    handleDrag = (projectIndex, project, isDeployedSection, currentOffset) => {
        // Create a detailed SVG representation that looks like the project card
        const projectName = project.projectName.length > 25 ? project.projectName.substring(0, 22) + '...' : project.projectName;
        const statusText = project.isRunning ? 'Running' : (project.isDeployed ? 'Stopped' : 'Not deployed');
        const statusColor = project.isRunning ? '#4C97FF' : (project.isDeployed ? '#575E75' : '#E5E5E5');
        const statusTextColor = project.isRunning ? '#FFFFFF' : (project.isDeployed ? '#FFFFFF' : '#575E75');
        
        // Format date if available
        let dateText = '';
        if (project.savedAt) {
            try {
                const date = new Date(project.savedAt);
                dateText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } catch (e) {
                dateText = '';
            }
        }
        
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                    <feOffset dx="2" dy="2" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.3"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <rect width="320" height="100" fill="#E5E5E5" stroke="#4C97FF" stroke-width="2" rx="6" filter="url(#shadow)"/>
            <rect x="2" y="2" width="316" height="96" fill="#FFFFFF" rx="5"/>
            <text x="16" y="28" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#575E75">${this.escapeXml(projectName)}</text>
            ${dateText ? `<text x="16" y="50" font-family="Arial, sans-serif" font-size="12" fill="#575E75" opacity="0.7">${this.escapeXml(dateText)}</text>` : ''}
            <rect x="16" y="62" width="80" height="20" fill="${statusColor}" rx="12"/>
            <text x="56" y="75" font-family="Arial, sans-serif" font-size="10" font-weight="600" fill="${statusTextColor}" text-anchor="middle">${this.escapeXml(statusText)}</text>
        </svg>`;
        const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
        
        this.props.onDrag({
            img: svgDataUri,
            currentOffset: currentOffset,
            dragging: true,
            dragType: DragConstants.PROJECT,
            index: projectIndex,
            payload: {
                projectName: project.projectName,
                isDeployed: isDeployedSection ? project.isDeployed : false // Track which section we're dragging from
            }
        });
    }

    escapeXml = (text) => {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    getProjectDragHandler = (project, index, isDeployedSection) => {
        return (currentOffset) => {
            this.handleDrag(index, project, isDeployedSection, currentOffset);
        };
    }

    handleDragEnd = () => {
        this.props.onDrag({
            img: null,
            currentOffset: null,
            dragging: false,
            dragType: null,
            index: null,
            payload: null
        });
    }

    handleDropDraft = (dragInfo) => {
        if (dragInfo.dragType === DragConstants.PROJECT && dragInfo.payload) {
            const {projectName, isDeployed} = dragInfo.payload;
            // If dragging from deployed section, load deployed version to editor
            if (isDeployed) {
                this.handleRestoreFromDeploy(projectName);
            }
            // If dragging from draft section, do nothing (already in draft section)
        }
    }

    handleDropDeployed = (dragInfo) => {
        if (dragInfo.dragType === DragConstants.PROJECT && dragInfo.payload) {
            const {projectName, isDeployed} = dragInfo.payload;
            // If dragging from draft section, deploy and start it
            if (!isDeployed) {
                this.handleDeployProject(projectName);
            }
            // If dragging from deployed section, do nothing (already in deployed section)
        }
    }

    render() {
        const {projects, isLoading, isOpen} = this.state;
        
        // Create drag recognizers for each project
        // Need to track both draft and deployed versions separately
        const projectsWithDrag = projects.map((project, index) => {
            // Create separate keys for draft and deployed versions
            const draftKey = `${project.projectName}-draft-${index}`;
            const deployedKey = `${project.projectName}-deployed-${index}`;
            
            // Create recognizers for both versions if they don't exist
            if (!this.dragRecognizers.has(draftKey)) {
                this.dragRecognizers.set(draftKey, new DragRecognizer({
                    onDrag: this.getProjectDragHandler(project, index, false),
                    onDragEnd: this.handleDragEnd
                }));
            }
            if (project.isDeployed && !this.dragRecognizers.has(deployedKey)) {
                this.dragRecognizers.set(deployedKey, new DragRecognizer({
                    onDrag: this.getProjectDragHandler(project, index, true),
                    onDragEnd: this.handleDragEnd
                }));
            }
            
            return {
                ...project,
                dragRecognizerDraft: this.dragRecognizers.get(draftKey),
                dragRecognizerDeployed: project.isDeployed ? this.dragRecognizers.get(deployedKey) : null
            };
        });

        return (
            <AutoSaveManagerComponent
                isOpen={isOpen}
                projects={projectsWithDrag}
                isLoading={isLoading}
                currentProjectTitle={this.props.projectTitle}
                onClose={this.handleClose}
                onLoadProject={this.handleLoadProject}
                onDeployProject={this.handleDeployProject}
                onDeployCurrentProject={this.handleDeployCurrentProject}
                onStartProject={this.handleStartProject}
                onStopProject={this.handleStopProject}
                onRestoreFromDeploy={this.handleRestoreFromDeploy}
                onDeleteProject={this.handleDeleteProject}
                onDropDraft={this.handleDropDraft}
                onDropDeployed={this.handleDropDeployed}
            />
        );
    }
}

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectTitle: state.scratchGui.projectTitle
});

const mapDispatchToProps = dispatch => ({
    setProjectTitle: title => dispatch(setProjectTitle(title)),
    onDrag: (dragInfo) => dispatch(updateAssetDrag(dragInfo))
});

AutoSaveManager.propTypes = {
    intl: PropTypes.object.isRequired,
    vm: PropTypes.object,
    projectTitle: PropTypes.string,
    setProjectTitle: PropTypes.func,
    onDrag: PropTypes.func.isRequired
};

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(AutoSaveManager));