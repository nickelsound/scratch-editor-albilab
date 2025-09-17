import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import AutoSaveManagerComponent from '../components/menu-bar/auto-save-manager.jsx';
import {setProjectTitle} from '../reducers/project-title.js';

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
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/saved-project/auto-save/list`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
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
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/saved-project/auto-save/load?projectName=${encodeURIComponent(projectName)}`;
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

    handleDeleteProject = async (projectName) => {
        try {
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/saved-project/auto-save?projectName=${encodeURIComponent(projectName)}`;
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
                onDeleteProject={this.handleDeleteProject}
            />
        );
    }
}

AutoSaveManager.propTypes = {
    vm: PropTypes.object,
    setProjectTitle: PropTypes.func
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    setProjectTitle: (title) => dispatch(setProjectTitle(title))
});

export default connect(mapStateToProps, mapDispatchToProps)(AutoSaveManager);
