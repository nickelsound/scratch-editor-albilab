import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import AutoSaveIndicatorComponent from '../components/menu-bar/auto-save-indicator.jsx';
import autoSaveService from '../lib/auto-save.js';
import {setAutoSaveStatus, setLastSaveTime, setSaveError} from '../exported-reducers.ts';

class AutoSaveIndicator extends React.Component {

    async componentDidMount () {
        // Initialize auto-save service
        autoSaveService.initialize(
            this.props.vm,
            this.props.projectTitle,
            this.handleSaveStatusChange
        );

        // Start auto-save (asynchronously to load existing project)
        await autoSaveService.start();

        // Add event listener for forcing save
        window.addEventListener('forceAutoSave', this.handleForceSave);
    }

    componentDidUpdate (prevProps) {
        // Update project title if it changed
        if (prevProps.projectTitle !== this.props.projectTitle) {
            autoSaveService.setProjectTitle(this.props.projectTitle);
        }

        // Update VM if it changed
        if (prevProps.vm !== this.props.vm) {
            autoSaveService.initialize(
                this.props.vm,
                this.props.projectTitle,
                this.handleSaveStatusChange
            );
        }
    }

    componentWillUnmount () {
        // Stop auto-save service
        autoSaveService.stop();
        
        // Remove event listener
        window.removeEventListener('forceAutoSave', this.handleForceSave);
    }

    handleForceSave = () => {
        // Force immediate save
        autoSaveService.forceSave();
    };

    handleSaveStatusChange = (statusInfo) => {
        // Update Redux state
        this.props.setAutoSaveStatus(statusInfo.isSaving);
        
        if (statusInfo.status === 'saved') {
            this.props.setLastSaveTime(statusInfo.lastSaveTime);
        } else if (statusInfo.status === 'error') {
            this.props.setSaveError(statusInfo.error);
        }
    };

    render () {
        return (
            <AutoSaveIndicatorComponent
                isSaving={this.props.isSaving}
                lastSaveTime={this.props.lastSaveTime}
                saveError={this.props.saveError}
            />
        );
    }
}

AutoSaveIndicator.propTypes = {
    vm: PropTypes.object,
    projectTitle: PropTypes.string,
    isSaving: PropTypes.bool,
    lastSaveTime: PropTypes.string,
    saveError: PropTypes.string,
    setAutoSaveStatus: PropTypes.func,
    setLastSaveTime: PropTypes.func,
    setSaveError: PropTypes.func
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectTitle: state.scratchGui.projectTitle,
    isSaving: state.autoSave.isSaving,
    lastSaveTime: state.autoSave.lastSaveTime,
    saveError: state.autoSave.saveError
});

const mapDispatchToProps = dispatch => ({
    setAutoSaveStatus: (isSaving) => dispatch(setAutoSaveStatus(isSaving)),
    setLastSaveTime: (lastSaveTime) => dispatch(setLastSaveTime(lastSaveTime)),
    setSaveError: (error) => dispatch(setSaveError(error))
});

export default connect(mapStateToProps, mapDispatchToProps)(AutoSaveIndicator);
