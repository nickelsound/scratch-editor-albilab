import React, {useCallback} from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import intlShape from '../../lib/intlShape.js';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import addExtensionIcon from '../gui/icon--extensions.svg';
import styles from './extension-button.css';
import './extension-button.raw.css';

const messages = defineMessages({
    addExtension: {
        id: 'gui.gui.addExtension',
        description: 'Button to add an extension in the target pane',
        defaultMessage: 'Add Extension'
    },
});

const ExtensionButton = props => {
    const {
        intl,
        onExtensionButtonClick
    } = props;

    const handleExtensionButtonClick = useCallback(() => {
        onExtensionButtonClick?.();
    }, [onExtensionButtonClick]);

    return (
        <Box className={styles.extensionButtonContainer}>
            <button
                className={styles.extensionButton}
                title={intl.formatMessage(messages.addExtension)}
                onClick={handleExtensionButtonClick}
            >
                <img
                    className={styles.extensionButtonIcon}
                    draggable={false}
                    src={addExtensionIcon}
                />
            </button>
        </Box>
    );
};

ExtensionButton.propTypes = {
    intl: intlShape.isRequired,
    onExtensionButtonClick: PropTypes.func
};

const ExtensionButtonIntl = injectIntl(ExtensionButton);

export default ExtensionButtonIntl;
