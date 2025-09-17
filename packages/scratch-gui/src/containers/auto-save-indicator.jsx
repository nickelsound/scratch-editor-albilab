import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import AutoSaveIndicatorComponent from '../components/menu-bar/auto-save-indicator.jsx';
import autoSaveService from '../lib/auto-save.js';
import {setAutoSaveStatus, setLastSaveTime, setSaveError} from '../exported-reducers.ts';

class AutoSaveIndicator extends React.Component {

    async componentDidMount () {
        // Inicializuj auto-save službu
        autoSaveService.initialize(
            this.props.vm,
            this.props.projectTitle,
            this.handleSaveStatusChange
        );

        // Spusť auto-save (asynchronně pro načtení existujícího projektu)
        await autoSaveService.start();
    }

    componentDidUpdate (prevProps) {
        // Aktualizuj název projektu pokud se změnil
        if (prevProps.projectTitle !== this.props.projectTitle) {
            autoSaveService.setProjectTitle(this.props.projectTitle);
        }

        // Aktualizuj VM pokud se změnila
        if (prevProps.vm !== this.props.vm) {
            autoSaveService.initialize(
                this.props.vm,
                this.props.projectTitle,
                this.handleSaveStatusChange
            );
        }
    }

    componentWillUnmount () {
        // Zastav auto-save službu
        autoSaveService.stop();
    }

    handleSaveStatusChange = (statusInfo) => {
        // Aktualizuj Redux state
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
