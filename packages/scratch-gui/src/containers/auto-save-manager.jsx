import React from 'react';
import {connect} from 'react-redux';
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
                    showError(data.error || 'Chyba při načítání projektů');
                }
            } else {
                console.error('Chyba při načítání seznamu projektů:', response.statusText);
                setProjects([]);
                showError('Chyba při načítání projektů: ' + response.statusText);
            }
        } catch (error) {
            console.error('Chyba při načítání seznamu projektů:', error);
            setProjects([]);
            showError('Chyba při načítání projektů: ' + error.message);
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
                    // Načti projekt do VM
                    await props.vm.loadProject(data.projectData);
                    
                    // Aktualizuj název projektu
                    props.setProjectTitle(data.projectName);
                    
                    // Zavři manager
                    handleClose();
                    
                    showSuccess(`Projekt "${data.projectName}" byl úspěšně načten!`);
                } else {
                    showError(data.error || 'Neznámá chyba', 'Chyba při načítání projektu');
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, 'Chyba při načítání projektu');
                } catch (parseError) {
                    showError(response.statusText, 'Chyba při načítání projektu');
                }
            }
        } catch (error) {
            console.error('Chyba při načítání projektu:', error);
            showError(error.message, 'Chyba při načítání projektu');
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
                    showError(data.error || 'Neznámá chyba', 'Chyba při nasazování projektu');
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, 'Chyba při nasazování projektu');
                } catch (parseError) {
                    showError(response.statusText, 'Chyba při nasazování projektu');
                }
            }
        } catch (error) {
            console.error('Chyba při nasazování projektu:', error);
            showError(error.message, 'Chyba při nasazování projektu');
        }
    };

    const handleDeployCurrentProject = async () => {
        try {
            if (!props.vm) {
                showWarning('Žádný projekt není načten v editoru');
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
                showError('Chyba při ukládání projektu: ' + autoSaveResponse.statusText);
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
                    showError(data.error || 'Neznámá chyba', 'Chyba při nasazování projektu');
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await deployResponse.json();
                    showError(errorData.error || deployResponse.statusText, 'Chyba při nasazování projektu');
                } catch (parseError) {
                    showError(deployResponse.statusText, 'Chyba při nasazování projektu');
                }
            }
        } catch (error) {
            console.error('Chyba při nasazování aktuálního projektu:', error);
            showError(error.message, 'Chyba při nasazování aktuálního projektu');
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
                    showError(data.error || 'Neznámá chyba', 'Chyba při spouštění projektu');
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, 'Chyba při spouštění projektu');
                } catch (parseError) {
                    showError(response.statusText, 'Chyba při spouštění projektu');
                }
            }
        } catch (error) {
            console.error('Chyba při spouštění projektu:', error);
            showError(error.message, 'Chyba při spouštění projektu');
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
                    showError(data.error || 'Neznámá chyba', 'Chyba při zastavování projektu');
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, 'Chyba při zastavování projektu');
                } catch (parseError) {
                    showError(response.statusText, 'Chyba při zastavování projektu');
                }
            }
        } catch (error) {
            console.error('Chyba při zastavování projektu:', error);
            showError(error.message, 'Chyba při zastavování projektu');
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
                    showError(data.error || 'Neznámá chyba', 'Chyba při mazání projektu');
                }
            } else {
                // Pokus se načíst chybovou zprávu z response body
                try {
                    const errorData = await response.json();
                    showError(errorData.error || response.statusText, 'Chyba při mazání projektu');
                } catch (parseError) {
                    showError(response.statusText, 'Chyba při mazání projektu');
                }
            }
        } catch (error) {
            console.error('Chyba při mazání projektu:', error);
            showError(error.message, 'Chyba při mazání projektu');
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

export default connect(mapStateToProps, mapDispatchToProps)(AutoSaveManager);