import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import AutoSaveIndicatorComponent from '../components/menu-bar/auto-save-indicator.jsx';
import autoSaveService from '../lib/auto-save.js';

class AutoSaveIndicator extends React.Component {
    constructor (props) {
        super(props);
        
        this.state = {
            status: 'idle',
            lastSaveTime: null,
            isSaving: false
        };
    }

    componentDidMount () {
        // Inicializuj auto-save službu
        autoSaveService.initialize(
            this.props.vm,
            this.props.projectTitle,
            this.handleSaveStatusChange
        );

        // Spusť auto-save
        autoSaveService.start();
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
        this.setState({
            status: statusInfo.status,
            lastSaveTime: statusInfo.lastSaveTime,
            isSaving: statusInfo.isSaving
        });
    };

    render () {
        return (
            <AutoSaveIndicatorComponent
                status={this.state.status}
                lastSaveTime={this.state.lastSaveTime}
                isSaving={this.state.isSaving}
            />
        );
    }
}

AutoSaveIndicator.propTypes = {
    vm: PropTypes.object,
    projectTitle: PropTypes.string
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectTitle: state.scratchGui.projectTitle
});

export default connect(mapStateToProps)(AutoSaveIndicator);
