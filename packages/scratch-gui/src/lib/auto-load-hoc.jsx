import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {setProjectTitle} from '../reducers/project-title';
import {getApiUrl} from './api-config.js';

/**
 * Higher Order Component for automatic loading of saved project on initialization
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
            // Automatic loading of saved project is disabled
            // await this.checkForSavedProject();
        }

        async checkForSavedProject () {
            if (this.state.hasCheckedForSavedProject) {
                return;
            }

            try {
                // Check if saved project exists
                const apiUrl = getApiUrl('/saved-project');
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const projectInfo = await response.json();
                    
                    if (projectInfo.exists) {
                        console.log('Found saved project, loading...', projectInfo);
                        
                        // Load project
                        await this.loadSavedProject();
                    } else {
                        console.log('No saved project found');
                    }
                }
            } catch (error) {
                console.error('Error checking for saved project:', error);
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
                        console.log('Loading saved project into VM:', data.projectData);
                        
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
                        
                        // Load project directly into VM - loadProject() accepts JSON string
                        await this.props.vm.loadProject(projectData);
                        
                        // Update project title
                        if (data.projectName) {
                            this.props.setProjectTitle(data.projectName);
                        }
                        
                        console.log('Project successfully loaded into VM');
                    } else {
                        console.error('Error loading project:', data.error || 'Unknown error');
                    }
                } else {
                    console.error('Error loading project:', response.statusText);
                }
            } catch (error) {
                console.error('Error loading saved project:', error);
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
