import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';

import AlbilabIPPromptComponent from '../components/albilab-ip-prompt/albilab-ip-prompt.jsx';
import {closeAlbilabIPPrompt} from '../reducers/modals';
import * as albilabIPStorage from '../lib/albilab-ip-storage';

class AlbilabIPPrompt extends React.Component {
    handleOk = (ipAddress) => {
        if (ipAddress && ipAddress.trim()) {
            albilabIPStorage.setAlbilabIP(ipAddress);
            albilabIPStorage.markPromptAsShown();
            // Trigger event to update blocks if needed
            window.dispatchEvent(new CustomEvent('albilabIPChanged', {detail: {ip: ipAddress}}));
            // Reload page to update IP address in all components
            window.location.reload();
        } else {
            this.props.onRequestClose();
        }
    }

    handleCancel = () => {
        albilabIPStorage.markPromptAsShown();
        this.props.onRequestClose();
    }

    render () {
        if (!this.props.isOpen) {
            return null;
        }

        const currentIP = albilabIPStorage.getAlbilabIP();

        return (
            <AlbilabIPPromptComponent
                currentIP={currentIP}
                defaultValue={currentIP || ''}
                intl={this.props.intl}
                onCancel={this.handleCancel}
                onOk={this.handleOk}
            />
        );
    }
}

AlbilabIPPrompt.propTypes = {
    intl: PropTypes.object.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onRequestClose: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    isOpen: state.scratchGui.modals.albilabIPPrompt || false
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeAlbilabIPPrompt())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(AlbilabIPPrompt));



