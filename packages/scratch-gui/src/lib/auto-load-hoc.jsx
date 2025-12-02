import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {setProjectTitle} from '../reducers/project-title';
import {getApiUrl} from './api-config.js';

/**
 * Higher Order Component pro automatické načtení uloženého projektu při inicializaci
 */
const AutoLoadHOC = function (WrappedComponent) {
    class AutoLoadComponent extends React.Component {
        constructor (props) {
            super(props);
            this.state = {
                hasCheckedForSavedProject: false
            };
        }

        async componentDidMount () {
            // Automatické načítání uloženého projektu je zakázáno
            // await this.checkForSavedProject();
        }

        async checkForSavedProject () {
            if (this.state.hasCheckedForSavedProject) {
                return;
            }

            try {
                // Zkontroluj, jestli existuje uložený projekt
                const apiUrl = getApiUrl('/saved-project');
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const projectInfo = await response.json();
                    
                    if (projectInfo.exists) {
                        console.log('Našel jsem uložený projekt, načítám...', projectInfo);
                        
                        // Načti projekt
                        await this.loadSavedProject();
                    } else {
                        console.log('Žádný uložený projekt nenalezen');
                    }
                }
            } catch (error) {
                console.error('Chyba při kontrole uloženého projektu:', error);
            } finally {
                this.setState({ hasCheckedForSavedProject: true });
            }
        }

        async loadSavedProject () {
            try {
                const apiUrl = getApiUrl('/saved-project/load');
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.success && data.projectData) {
                        console.log('Načítám uložený projekt do VM:', data.projectData);
                        
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
                        
                        // Načti projekt přímo do VM - loadProject() přijímá JSON string
                        await this.props.vm.loadProject(projectData);
                        
                        // Aktualizuj název projektu
                        if (data.projectName) {
                            this.props.setProjectTitle(data.projectName);
                        }
                        
                        console.log('Projekt úspěšně načten do VM');
                    } else {
                        console.error('Chyba při načítání projektu:', data.error || 'Neznámá chyba');
                    }
                } else {
                    console.error('Chyba při načítání projektu:', response.statusText);
                }
            } catch (error) {
                console.error('Chyba při načítání uloženého projektu:', error);
            }
        }

        render () {
            return <WrappedComponent {...this.props} />;
        }
    }

    AutoLoadComponent.propTypes = {
        vm: PropTypes.object.isRequired,
        setProjectTitle: PropTypes.func.isRequired
    };

    const mapStateToProps = state => ({
        vm: state.scratchGui.vm
    });

    const mapDispatchToProps = dispatch => ({
        setProjectTitle: (title) => dispatch(setProjectTitle(title))
    });

    return connect(mapStateToProps, mapDispatchToProps)(AutoLoadComponent);
};

export default AutoLoadHOC;
