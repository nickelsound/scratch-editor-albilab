import classNames from 'classnames';
import {defineMessages, FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';

import styles from './albilab-ip-prompt.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'AlbiLAB IP Address Setup',
        description: 'Title for AlbiLAB IP address prompt modal',
        id: 'gui.albilabIPPrompt.title'
    },
    label: {
        defaultMessage: 'Enter the IP address of your primary AlbiLAB device:',
        description: 'Label for IP address input field',
        id: 'gui.albilabIPPrompt.label'
    },
    description: {
        defaultMessage: 'This IP address will be automatically pre-filled in all AlbiLAB components. You can change it later in settings.',
        description: 'Description text explaining what the IP address will be used for',
        id: 'gui.albilabIPPrompt.description'
    },
    reloadNotice: {
        defaultMessage: 'After saving, the page will reload to propagate the value to all components.',
        description: 'Notice that page will reload after saving',
        id: 'gui.albilabIPPrompt.reloadNotice'
    },
    placeholder: {
        defaultMessage: 'e.g. 192.168.1.100 or albilab.home or https://albilab.home:8040',
        description: 'Placeholder text for IP address input',
        id: 'gui.albilabIPPrompt.placeholder'
    },
    currentIPLabel: {
        defaultMessage: 'Current IP address: {ip}',
        description: 'Label showing current IP address',
        id: 'gui.albilabIPPrompt.currentIPLabel'
    },
    noCurrentIP: {
        defaultMessage: 'No IP address is currently set',
        description: 'Message when no IP address is set',
        id: 'gui.albilabIPPrompt.noCurrentIP'
    },
    invalidIP: {
        defaultMessage: 'Invalid IP address format',
        description: 'Error message for invalid IP address',
        id: 'gui.albilabIPPrompt.invalidIP'
    },
    ok: {
        defaultMessage: 'OK',
        description: 'OK button in IP prompt',
        id: 'gui.albilabIPPrompt.ok'
    },
    cancel: {
        defaultMessage: 'Cancel',
        description: 'Cancel button in IP prompt',
        id: 'gui.albilabIPPrompt.cancel'
    }
});

/**
 * Validate IP address, domain, or URL
 * @param {string} address - IP address, domain, or URL to validate
 * @returns {boolean} True if valid
 */
const isValidAddress = (address) => {
    if (!address || typeof address !== 'string') {
        return false;
    }
    
    const trimmed = address.trim();
    if (!trimmed) {
        return false;
    }
    
    // Check if it's a valid URL format
    try {
        // If it has protocol, validate as URL
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            new URL(trimmed);
            return true;
        }
        
        // If no protocol, try adding http:// to validate
        new URL(`http://${trimmed}`);
        return true;
    } catch (e) {
        return false;
    }
};

class AlbilabIPPromptComponent extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            ipValue: props.defaultValue || '',
            isValid: true
        };
    }

    handleChange = (e) => {
        const value = e.target.value;
        this.setState({
            ipValue: value,
            isValid: !value || isValidAddress(value)
        });
    }

    handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            this.handleOk();
        }
    }

    handleOk = () => {
        const trimmedIP = this.state.ipValue.trim();
        if (trimmedIP && isValidAddress(trimmedIP)) {
            this.props.onOk(trimmedIP);
        } else if (!trimmedIP) {
            // Empty IP is allowed - user can cancel
            this.props.onCancel();
        } else {
            // Invalid IP - show error but don't close
            this.setState({isValid: false});
        }
    }

    handleCancel = () => {
        this.props.onCancel();
    }

    render () {
        return (
            <Modal
                className={styles.modalContent}
                contentLabel={this.props.intl.formatMessage(messages.title)}
                onRequestClose={this.handleCancel}
            >
                <Box className={styles.body}>
                    <Box className={styles.label}>
                        <FormattedMessage {...messages.label} />
                    </Box>
                    {this.props.currentIP && (
                        <Box className={styles.currentIPInfo}>
                            <FormattedMessage
                                {...messages.currentIPLabel}
                                values={{ip: this.props.currentIP}}
                            />
                        </Box>
                    )}
                    {!this.props.currentIP && (
                        <Box className={styles.currentIPInfo}>
                            <FormattedMessage {...messages.noCurrentIP} />
                        </Box>
                    )}
                    <Box>
                        <input
                            autoFocus
                            className={classNames(styles.ipInput, {
                                [styles.invalid]: !this.state.isValid
                            })}
                            value={this.state.ipValue}
                            placeholder={this.props.intl.formatMessage(messages.placeholder)}
                            onChange={this.handleChange}
                            onKeyPress={this.handleKeyPress}
                        />
                    </Box>
                    {!this.state.isValid && (
                        <Box className={styles.errorMessage}>
                            <FormattedMessage {...messages.invalidIP} />
                        </Box>
                    )}
                    <Box className={styles.description}>
                        <FormattedMessage {...messages.description} />
                    </Box>
                    <Box className={styles.reloadNotice}>
                        <FormattedMessage {...messages.reloadNotice} />
                    </Box>
                    <Box className={styles.buttonRow}>
                        <button
                            className={styles.cancelButton}
                            onClick={this.handleCancel}
                        >
                            <FormattedMessage {...messages.cancel} />
                        </button>
                        <button
                            className={styles.okButton}
                            onClick={this.handleOk}
                            disabled={!this.state.ipValue.trim()}
                        >
                            <FormattedMessage {...messages.ok} />
                        </button>
                    </Box>
                </Box>
            </Modal>
        );
    }
}

AlbilabIPPromptComponent.propTypes = {
    currentIP: PropTypes.string,
    defaultValue: PropTypes.string,
    intl: PropTypes.object.isRequired,
    onCancel: PropTypes.func.isRequired,
    onOk: PropTypes.func.isRequired
};

export default AlbilabIPPromptComponent;




