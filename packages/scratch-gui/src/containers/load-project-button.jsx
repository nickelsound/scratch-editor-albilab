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
            
            // Načti uložený projekt z backend API
            const apiUrl = getApiUrl('/saved-project/load');
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // TODO: Přidat lokalizační klíč pro "Žádný uložený projekt nebyl nalezen"
                    alert('Žádný uložený projekt nebyl nalezen');
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.projectData) {
                // Načti projekt do Scratch VM - data.projectData je už JSON objekt
                await this.props.vm.loadProject(data.projectData);
                
                // Aktualizuj název projektu
                if (this.props.onUpdateProjectTitle) {
                    this.props.onUpdateProjectTitle(data.projectName);
                }
                
                alert(`Projekt "${data.projectName}" byl úspěšně načten do editoru!`);
            } else {
                const errorMsg = this.props.intl.formatMessage({id: 'gui.errors.loadingProject'});
                const unknownError = this.props.intl.formatMessage({id: 'gui.errors.unknownError'});
                alert(`${errorMsg}: ${data.error || unknownError}`);
            }
            
        } catch (error) {
            console.error('Chyba při načítání projektu:', error);
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
