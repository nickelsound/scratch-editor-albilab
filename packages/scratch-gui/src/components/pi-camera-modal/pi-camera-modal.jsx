import PropTypes from 'prop-types';
import React from 'react';
import Modal from '../../containers/modal.jsx';
import Box from '../box/box.jsx';
import {defineMessages, FormattedMessage, useIntl} from 'react-intl';

import {getAlbilabIP} from '../../lib/albilab-ip-storage';
import styles from './pi-camera-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Pi Kamera',
        description: 'Title for the Pi Kamera gallery modal',
        id: 'gui.piCameraModal.title'
    }
});

const getGallerySrc = () => {
    const fallbackHost = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'localhost';
    const stored = getAlbilabIP();
    let host = fallbackHost;

    if (stored) {
        try {
            const parsed = stored.startsWith('http://') || stored.startsWith('https://') ?
                new URL(stored) : new URL(`http://${stored}`);
            host = parsed.hostname || fallbackHost;
        } catch (error) {
            host = stored.replace(/^https?:\/\//, '').split('/')[0].split(':')[0] || fallbackHost;
        }
    }

    return `http://${host}:8088/gallery-embed?ui=v6&modal=1`;
};

const PiCameraModal = props => {
    const intl = useIntl();
    return (
        <Modal
            id="pi-camera"
            className={styles.modalContent}
            contentLabel={intl.formatMessage(messages.title)}
            onRequestClose={props.onRequestClose}
        >
            <Box className={styles.body}>
                <div className={styles.infoRow}>
                    <FormattedMessage
                        defaultMessage="Galerie a trénování pro Pi Kameru"
                        description="Short description shown above the Pi Kamera iframe"
                        id="gui.piCameraModal.description"
                    />
                </div>
                <div className={styles.frameWrap}>
                    <iframe
                        className={styles.frame}
                        src={getGallerySrc()}
                        title={intl.formatMessage(messages.title)}
                    />
                </div>
            </Box>
        </Modal>
    );
};

PiCameraModal.propTypes = {
    onRequestClose: PropTypes.func.isRequired
};

export default PiCameraModal;
