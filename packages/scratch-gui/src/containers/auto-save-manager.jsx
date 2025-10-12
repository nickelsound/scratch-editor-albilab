import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import AutoSaveManagerComponent from '../components/menu-bar/auto-save-manager.jsx';
import {setProjectTitle} from '../reducers/project-title.js';
import {getApiUrl} from '../lib/api-config.js';

class AutoSaveManager extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: false,
            projects: [],
            isLoading: false
        };
    }

    componentDidMount() {
        // Přidej event listener pro otevření manageru
        window.addEventListener('openAutoSaveManager', this.handleOpen);
    }

    componentWillUnmount() {
        window.removeEventListener('openAutoSaveManager', this.handleOpen);
    }

    handleOpen = () => {
        this.setState({ isOpen: true });
        this.loadProjects();
    };

    handleClose = () => {
        this.setState({ isOpen: false });
    };

    loadProjects = async () => {
        this.setState({ isLoading: true });
        
        try {
            const apiUrl = getApiUrl('projects-status');
            console.log('Načítám projekty z URL:', apiUrl);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API odpověď:', data);
                if (data.success) {
                    console.log('Načteno projektů:', data.projects.length);
                    this.setState({ projects: data.projects });
                } else {
                    console.error('Chyba při načítání seznamu projektů:', data.error);
                    this.setState({ projects: [] });
                }
            } else {
                console.error('Chyba při načítání seznamu projektů:', response.statusText);
                this.setState({ projects: [] });
            }
        } catch (error) {
            console.error('Chyba při načítání seznamu projektů:', error);
            this.setState({ projects: [] });
        } finally {
            this.setState({ isLoading: false });
        }
    };

    handleLoadProject = async (projectName) => {
        try {
            const apiUrl = getApiUrl(`/saved-project/auto-save/load?projectName=${encodeURIComponent(projectName)}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.projectData) {
                    // Načti projekt do VM
                    await this.props.vm.loadProject(data.projectData);
                    
                    // Aktualizuj název projektu
                    this.props.setProjectTitle(data.projectName);
                    
                    // Zavři manager
                    this.handleClose();
                    
                    alert(`Projekt "${data.projectName}" byl úspěšně načten!`);
                } else {
                    alert('Chyba při načítání projektu: ' + (data.error || 'Neznámá chyba'));
                }
            } else {
                alert('Chyba při načítání projektu: ' + response.statusText);
            }
        } catch (error) {
            console.error('Chyba při načítání projektu:', error);
            alert('Chyba při načítání projektu: ' + error.message);
        }
    };

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
                    // Aktualizuj seznam projektů
                    this.loadProjects();
                    alert(`Projekt "${projectName}" byl nasazen.`);
                } else {
                    alert('Chyba při nasazování projektu: ' + (data.error || 'Neznámá chyba'));
                }
            } else {
                alert('Chyba při nasazování projektu: ' + response.statusText);
            }
        } catch (error) {
            console.error('Chyba při nasazování projektu:', error);
            alert('Chyba při nasazování projektu: ' + error.message);
        }
    };

    handleDeployCurrentProject = async () => {
        try {
            if (!this.props.vm) {
                alert('Žádný projekt není načten v editoru');
                return;
            }

            // Získej aktuální data projektu z VM
            const projectData = this.props.vm.toJSON();
            const projectName = this.props.projectTitle || 'Neznámý projekt';

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
                alert('Chyba při ukládání projektu: ' + autoSaveResponse.statusText);
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
                    this.loadProjects();
                    alert(`Aktuální projekt "${projectName}" byl nasazen do AlbiLAB.`);
                } else {
                    alert('Chyba při nasazování projektu: ' + (data.error || 'Neznámá chyba'));
                }
            } else {
                alert('Chyba při nasazování projektu: ' + deployResponse.statusText);
            }
        } catch (error) {
            console.error('Chyba při nasazování aktuálního projektu:', error);
            alert('Chyba při nasazování aktuálního projektu: ' + error.message);
        }
    };

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
                    // Aktualizuj seznam projektů
                    this.loadProjects();
                    alert(`Projekt "${projectName}" byl spuštěn.`);
                } else {
                    alert('Chyba při spouštění projektu: ' + (data.error || 'Neznámá chyba'));
                }
            } else {
                alert('Chyba při spouštění projektu: ' + response.statusText);
            }
        } catch (error) {
            console.error('Chyba při spouštění projektu:', error);
            alert('Chyba při spouštění projektu: ' + error.message);
        }
    };

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
                    // Aktualizuj seznam projektů
                    this.loadProjects();
                    alert(`Projekt "${projectName}" byl zastaven.`);
                } else {
                    alert('Chyba při zastavování projektu: ' + (data.error || 'Neznámá chyba'));
                }
            } else {
                alert('Chyba při zastavování projektu: ' + response.statusText);
            }
        } catch (error) {
            console.error('Chyba při zastavování projektu:', error);
            alert('Chyba při zastavování projektu: ' + error.message);
        }
    };

    handleDeleteProject = async (projectName) => {
        try {
            const apiUrl = getApiUrl(`/saved-project/auto-save?projectName=${encodeURIComponent(projectName)}`);
            const response = await fetch(apiUrl, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Aktualizuj seznam projektů
                    this.loadProjects();
                    alert(`Projekt "${projectName}" byl smazán.`);
                } else {
                    alert('Chyba při mazání projektu: ' + (data.error || 'Neznámá chyba'));
                }
            } else {
                alert('Chyba při mazání projektu: ' + response.statusText);
            }
        } catch (error) {
            console.error('Chyba při mazání projektu:', error);
            alert('Chyba při mazání projektu: ' + error.message);
        }
    };

    render() {
        return (
            <AutoSaveManagerComponent
                isOpen={this.state.isOpen}
                projects={this.state.projects}
                isLoading={this.state.isLoading}
                onClose={this.handleClose}
                onLoadProject={this.handleLoadProject}
                onDeployProject={this.handleDeployProject}
                onDeployCurrentProject={this.handleDeployCurrentProject}
                onStartProject={this.handleStartProject}
                onStopProject={this.handleStopProject}
                onDeleteProject={this.handleDeleteProject}
            />
        );
    }
}

AutoSaveManager.propTypes = {
    vm: PropTypes.object,
    projectTitle: PropTypes.string,
    setProjectTitle: PropTypes.func
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectTitle: state.scratchGui.projectTitle
});

const mapDispatchToProps = dispatch => ({
    setProjectTitle: (title) => dispatch(setProjectTitle(title))
});

export default connect(mapStateToProps, mapDispatchToProps)(AutoSaveManager);
