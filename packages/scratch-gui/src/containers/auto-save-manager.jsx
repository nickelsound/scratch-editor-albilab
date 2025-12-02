import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {injectIntl, intlShape} from 'react-intl';
import AutoSaveManagerComponent from '../components/menu-bar/auto-save-manager.jsx';
import {setProjectTitle} from '../reducers/project-title.js';
import {getApiUrl} from '../lib/api-config.js';
import notificationService from '../lib/notification-service.js';

const AutoSaveManager = (props) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [projects, setProjects] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    // Použij globální notification službu
    const showSuccess = notificationService.showSuccess.bind(notificationService);
    const showError = notificationService.showError.bind(notificationService);
    const showWarning = notificationService.showWarning.bind(notificationService);
    const showInfo = notificationService.showInfo.bind(notificationService);

    React.useEffect(() => {
        // Přidej event listener pro otevření manageru
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
            console.log('Načítám projekty z URL:', apiUrl);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API odpověď:', data);
                if (data.success) {
                    console.log('Načteno projektů:', data.projects.length);
                    setProjects(data.projects);
                } else {
                    console.error('Chyba při načítání seznamu projektů:', data.error);
                    setProjects([]);
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.loadingProjects'}), props.intl.formatMessage({id: 'gui.errors.error'}));
                }
            } else {
                console.error('Chyba při načítání seznamu projektů:', response.statusText);
                setProjects([]);
                showError(props.intl.formatMessage({id: 'gui.errors.loadingProjectsWithDetails'}, {details: response.statusText}), props.intl.formatMessage({id: 'gui.errors.error'}));
            }
        } catch (error) {
            console.error('Chyba při načítání seznamu projektů:', error);
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
                    // projectData může být string (JSON string) nebo už objekt (kvůli escape-ování)
                    let projectData = data.projectData;
                    
                    // Pokud je to string, použijeme ho přímo (vm.loadProject() přijímá string)
                    // Pokud je to objekt, převedeme ho na JSON string
                    if (typeof projectData === 'object' && projectData !== null) {
                        // Objekt - převedeme na JSON string
                        projectData = JSON.stringify(projectData);
                    }
                    
                    // Ověř, že projectData je string
                    if (typeof projectData !== 'string') {
                        throw new Error('Invalid project data format');
                    }
                    
                    // Zkontroluj a oprav projekt před načtením
                    let parsedProject;
                    try {
                        parsedProject = JSON.parse(projectData);
                        console.log('Načtený projekt - validace:', {
                            hasTargets: !!parsedProject.targets,
                            targetsCount: parsedProject.targets ? parsedProject.targets.length : 0,
                            projectVersion: parsedProject.projectVersion,
                            hasMeta: !!parsedProject.meta
                        });
                        
                        let needsFix = false;
                        
                        // Zkontroluj targets a oprav případné problémy
                        if (parsedProject.targets && Array.isArray(parsedProject.targets)) {
                            // Najdi stage (měla by být jen jedna a na prvním místě)
                            let stageIndex = -1;
                            parsedProject.targets.forEach((target, index) => {
                                if (target.isStage === true) {
                                    if (stageIndex === -1) {
                                        stageIndex = index;
                                    } else {
                                        // Více než jedna stage - oprav
                                        console.warn(`Opravuji duplicitní stage na indexu ${index}: ${target.name}`);
                                        target.isStage = false;
                                        needsFix = true;
                                    }
                                }
                            });
                            
                            // Oprav všechny sprites - isStage musí být false
                            parsedProject.targets.forEach((target, index) => {
                                if (index !== stageIndex && target.isStage !== false) {
                                    console.warn(`Opravuji isStage pro sprite ${index}: ${target.name}`, {
                                        oldValue: target.isStage,
                                        newValue: false
                                    });
                                    target.isStage = false;
                                    needsFix = true;
                                }
                            });
                            
                            if (needsFix) {
                                // Přeparsuj opravený projekt
                                projectData = JSON.stringify(parsedProject);
                                console.log('Projekt byl opraven před načtením');
                            }
                        }
                    } catch (parseError) {
                        console.error('Chyba při parsování projektu před načtením:', parseError);
                        // Pokračujeme i přes chybu - možná to loadProject zvládne
                    }
                    
                    // Načti projekt do VM - loadProject() přijímá JSON string
                    await props.vm.loadProject(projectData);
                    
                    // Aktualizuj název projektu
                    props.setProjectTitle(data.projectName);
                    
                    // Zavři manager
                    handleClose();
                    
                    showSuccess(`Projekt "${data.projectName}" byl úspěšně načten!`);
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.loadingProject'}));
                }
            }
        } catch (error) {
            console.error('Chyba při načítání projektu:', error);
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
                    // Aktualizuj seznam projektů
                    loadProjects();
                    showSuccess(`Projekt "${projectName}" byl nasazen.`);
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            }
        } catch (error) {
            console.error('Chyba při nasazování projektu:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
        }
    };

    const handleDeployCurrentProject = async () => {
        try {
            if (!props.vm) {
                showWarning(props.intl.formatMessage({id: 'gui.errors.noProjectLoaded'}));
                return;
            }

            // Získej aktuální data projektu z VM
            const projectData = props.vm.toJSON();
            const projectName = props.projectTitle || 'Neznámý projekt';

            // Nejdříve ulož projekt do auto-save
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

            // Pak nasaď projekt
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
                    // Aktualizuj seznam projektů
                    loadProjects();
                    showSuccess(`Aktuální projekt "${projectName}" byl nasazen do AlbiLAB.`);
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await deployResponse.json();
                    showError(errorData.error || deployResponse.statusText, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                } catch (parseError) {
                    showError(deployResponse.statusText, props.intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            }
        } catch (error) {
            console.error('Chyba při nasazování aktuálního projektu:', error);
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
                    // Aktualizuj seznam projektů
                    loadProjects();
                    showSuccess(`Projekt "${projectName}" byl spuštěn.`);
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.startingProject'}));
                }
            }
        } catch (error) {
            console.error('Chyba při spouštění projektu:', error);
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
                    // Aktualizuj seznam projektů
                    loadProjects();
                    showSuccess(`Projekt "${projectName}" byl zastaven.`);
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
                }
            }
        } catch (error) {
            console.error('Chyba při zastavování projektu:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.stoppingProject'}));
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
                    // Aktualizuj seznam projektů
                    loadProjects();
                    showSuccess(`Projekt "${projectName}" byl smazán.`);
                } else {
                    showError(data.error || props.intl.formatMessage({id: 'gui.errors.unknownError'}), props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                } catch (parseError) {
                    showError(response.statusText, props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
                }
            }
        } catch (error) {
            console.error('Chyba při mazání projektu:', error);
            showError(error.message, props.intl.formatMessage({id: 'gui.errors.deletingProject'}));
        }
    };

    return (
        <AutoSaveManagerComponent
            isOpen={isOpen}
            projects={projects}
            isLoading={isLoading}
            onClose={handleClose}
            onLoadProject={handleLoadProject}
            onDeployProject={handleDeployProject}
            onDeployCurrentProject={handleDeployCurrentProject}
            onStartProject={handleStartProject}
            onStopProject={handleStopProject}
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
    intl: intlShape.isRequired,
    vm: PropTypes.object,
    projectTitle: PropTypes.string,
    setProjectTitle: PropTypes.func
};

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(AutoSaveManager));