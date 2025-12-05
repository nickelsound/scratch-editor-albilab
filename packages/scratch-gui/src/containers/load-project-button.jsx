import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl, intlShape} from 'react-intl';
import VM from '@scratch/scratch-vm';

import LoadProjectButtonComponent from '../components/menu-bar/load-project-button.jsx';
import {getApiUrl} from '../lib/api-config.js';

class LoadProjectButton extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClick'
        ]);
        
        this.state = {
            isLoading: false
        };
    }

    async handleClick () {
        if (this.state.isLoading) return;
        
        try {
            this.setState({ isLoading: true });
            
            // Load saved project from backend API
            const apiUrl = getApiUrl('/saved-project/load');
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                if (response.status === 404) {
                    alert(this.props.intl.formatMessage({id: 'gui.errors.noSavedProjectFound'}));
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
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
                
                // Load project into Scratch VM - loadProject() accepts JSON string
                await this.props.vm.loadProject(projectData);
                
                // Update project title
                if (this.props.onUpdateProjectTitle) {
                    this.props.onUpdateProjectTitle(data.projectName);
                }
                
                alert(this.props.intl.formatMessage({id: 'gui.success.projectLoadedToEditor'}, {name: data.projectName}));
            } else {
                const errorMsg = this.props.intl.formatMessage({id: 'gui.errors.loadingProject'});
                const unknownError = this.props.intl.formatMessage({id: 'gui.errors.unknownError'});
                alert(`${errorMsg}: ${data.error || unknownError}`);
            }
            
        } catch (error) {
            console.error('Error loading project:', error);
            const errorMsg = this.props.intl.formatMessage({id: 'gui.errors.loadingProject'});
            alert(`${errorMsg}: ${error.message}`);
        } finally {
            this.setState({ isLoading: false });
        }
    }

    render () {
        return (
            <LoadProjectButtonComponent
                isLoading={this.state.isLoading}
                onClick={this.handleClick}
            />
        );
    }
}

LoadProjectButton.propTypes = {
    intl: intlShape.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired,
    onUpdateProjectTitle: PropTypes.func
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

export default injectIntl(connect(mapStateToProps)(LoadProjectButton));
