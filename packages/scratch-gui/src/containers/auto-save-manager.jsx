import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import AutoSaveManagerComponent from '../components/menu-bar/auto-save-manager.jsx';
import {setProjectTitle} from '../reducers/project-title.js';
import {getApiUrl} from '../lib/api-config.js';
import notificationService from '../lib/notification-service.js';

const AutoSaveManager = (props) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [projects, setProjects] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    // Use global notification service
    const showSuccess = notificationService.showSuccess.bind(notificationService);
    const showError = notificationService.showError.bind(notificationService);
    const showWarning = notificationService.showWarning.bind(notificationService);
    const showInfo = notificationService.showInfo.bind(notificationService);

    React.useEffect(() => {
        // Add event listener for opening manager
        const handleOpenEvent = () => {
            setIsOpen(true);
            loadProjects();
        };
        window.addEventListener('openAutoSaveManager', handleOpenEvent);
        
        return () => {
            window.removeEventListener('openAutoSaveManager', handleOpenEvent);
        };
    }, []);

    const handleOpen = () => {
        setIsOpen(true);
        loadProjects();
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    const loadProjects = async () => {
        setIsLoading(true);
        
        try {
            const apiUrl = getApiUrl('projects-status');
            console.log('Loading projects from URL:', apiUrl);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API response:', data);
                if (data.success) {
                    console.log('Loaded projects:', data.projects.length);
                    setProjects(data.projects);
                } else {
                    console.error('Error loading project list:', data.error);
                    setProjects([]);
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.loadingProjects'}), props.intl.formatMessage({id: 'gui.errors.error'}));
                }
            } else {
                console.error('Error loading project list:', response.statusText);
                setProjects([]);
                showError(props.intl.formatMessage({id: 'gui.errors.loadingProjectsWithDetails'}, {details: response.statusText}), props.intl.formatMessage({id: 'gui.errors.error'}));
            }
        } catch (error) {
            console.error('Error loading project list:', error);
            setProjects([]);
            showError(props.intl.formatMessage({id: 'gui.errors.loadingProjectsWithDetails'}, {details: error.message}), props.intl.formatMessage({id: 'gui.errors.error'}));
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadProject = async (projectName) => {
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
                        await props.vm.loadProject(projectData);
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
                    props.setProjectTitle(data.projectName);
                    
                    // Close manager
                    handleClose();
                    
                    showSuccess(props.intl.formatMessage({id: 'gui.success.projectLoaded'}, {name: data.projectName}));
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                }
            }
        } catch (error) {
            console.error('Error loading project:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
        }
    };

    const handleDeployProject = async (projectName) => {
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
                    // Update project list
                    loadProjects();
                    showSuccess(props.intl.formatMessage({id: 'gui.success.projectDeployed'}, {name: projectName}));
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            }
        } catch (error) {
            console.error('Error deploying project:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
        }
    };

    const handleDeployCurrentProject = async () => {
        try {
            if (!props.vm) {
                showWarning(props.intl.formatMessage({id: 'gui.errors.noProjectLoaded'}));
                return;
            }

            // Get current project data from VM
            const projectData = props.vm.toJSON();
            const projectName = props.projectTitle || props.intl.formatMessage({id: 'gui.gui.unknownProject'});

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
                showError(props.intl.formatMessage({id: 'gui.errors.savingProjectWithDetails'}, {details: autoSaveResponse.statusText}));
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
                            loadProjects();
                            showSuccess(props.intl.formatMessage({id: 'gui.success.currentProjectDeployedAndStarted'}, {name: projectName}));
                        } else {
                            // Update project list
                            loadProjects();
                            showSuccess(props.intl.formatMessage({id: 'gui.success.currentProjectDeployed'}, {name: projectName}));
                            showWarning(props.intl.formatMessage({id: 'gui.warnings.projectDeployedButNotStarted'}));
                        }
                    } else {
                        // Update project list
                        loadProjects();
                        showSuccess(props.intl.formatMessage({id: 'gui.success.currentProjectDeployed'}, {name: projectName}));
                        showWarning(props.intl.formatMessage({id: 'gui.warnings.projectDeployedButNotStarted'}));
                    }
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await deployResponse.json();
                    showError(errorData.error || deployResponse.statusText, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                } catch (parseError) {
                    showError(deployResponse.statusText, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            }
        } catch (error) {
            console.error('Error deploying current project:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.deployingCurrentProject'}));
        }
    };

    const handleStartProject = async (projectName) => {
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
                    loadProjects();
                    showSuccess(props.intl.formatMessage({id: 'gui.success.projectStarted'}, {name: projectName}));
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                }
            }
        } catch (error) {
            console.error('Error starting project:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.startingProject'}));
        }
    };

    const handleStopProject = async (projectName) => {
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
                    loadProjects();
                    showSuccess(props.intl.formatMessage({id: 'gui.success.projectStopped'}, {name: projectName}));
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                }
            }
        } catch (error) {
            console.error('Error stopping project:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
        }
    };

    const handleRestoreFromDeploy = async (projectName) => {
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
                    loadProjects();
                    
                    // If project data is returned, load it into editor
                    if (data.projectData && props.vm) {
                        try {
                            let projectData = data.projectData;
                            
                            // Ensure projectData is a string
                            if (typeof projectData !== 'string') {
                                projectData = JSON.stringify(projectData);
                            }
                            
                            // Load project into VM
                            await props.vm.loadProject(projectData);
                            
                            // Update project title
                            props.setProjectTitle(projectName);
                            
                            // Close manager
                            handleClose();
                            
                            showSuccess(props.intl.formatMessage({id: 'gui.success.projectRestoredFromDeploy'}, {name: projectName}));
                        } catch (loadError) {
                            console.error('Error loading restored project:', loadError);
                            showSuccess(props.intl.formatMessage({id: 'gui.success.projectRestoredFromDeploy'}, {name: projectName}));
                            showWarning(props.intl.formatMessage({id: 'gui.warnings.projectRestoredButNotLoaded'}));
                        }
                    } else {
                        showSuccess(props.intl.formatMessage({id: 'gui.success.projectRestoredFromDeploy'}, {name: projectName}));
                    }
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.restoringFromDeploy'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.restoringFromDeploy'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.restoringFromDeploy'}));
                }
            }
        } catch (error) {
            console.error('Error restoring from deploy:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.restoringFromDeploy'}));
        }
    };

    const handleDeleteProject = async (projectName) => {
        try {
            const apiUrl = getApiUrl(`/saved-project/auto-save?projectName=${encodeURIComponent(projectName)}`);
            const response = await fetch(apiUrl, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update project list
                    loadProjects();
                    showSuccess(props.intl.formatMessage({id: 'gui.success.projectDeleted'}, {name: projectName}));
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                }
            } else {
                // Try to load error message from response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                }
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
        }
    };

    return (
        <AutoSaveManagerComponent
            isOpen={isOpen}
            projects={projects}
            isLoading={isLoading}
            currentProjectTitle={props.projectTitle}
            onClose={handleClose}
            onLoadProject={handleLoadProject}
            onDeployProject={handleDeployProject}
            onDeployCurrentProject={handleDeployCurrentProject}
            onStartProject={handleStartProject}
            onStopProject={handleStopProject}
            onRestoreFromDeploy={handleRestoreFromDeploy}
            onDeleteProject={handleDeleteProject}
        />
    );
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectTitle: state.scratchGui.projectTitle
});

const mapDispatchToProps = dispatch => ({
    setProjectTitle: title => dispatch(setProjectTitle(title))
});

AutoSaveManager.propTypes = {
    intl: PropTypes.object.isRequired,
    vm: PropTypes.object,
    projectTitle: PropTypes.string,
    setProjectTitle: PropTypes.func
};

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(AutoSaveManager));