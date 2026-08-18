import PropTypes from 'prop-types';
import React from 'react';
import Modal from '../../containers/modal.jsx';
import Box from '../box/box.jsx';
import {useIntl} from 'react-intl';

import styles from './pi-camera-modal.css';

const PI_CAMERA_PANEL_VERSION = '2026-08-17b';
const getGallerySrc = lang => `/pi-kamera/gallery-embed?ui=v7&modal=1&lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(PI_CAMERA_PANEL_VERSION)}`;

const getNormalizedLang = locale => (String(locale || '').toLowerCase().startsWith('cs') ? 'cs' : 'en');

const getTitle = lang => (lang === 'cs' ? 'Pi Kamera' : 'Pi Camera');

const getFrameTitle = lang => (lang === 'cs' ? 'Galerie Pi Kamery' : 'Pi Camera Gallery');

const PiCameraModal = props => {
    const intl = useIntl();
    const lang = getNormalizedLang(intl.locale);
    const title = getTitle(lang);
    return (
        <Modal
            id="pi-camera"
            className={styles.modalContent}
            headerClassName={styles.header}
            contentLabel={title}
            onRequestClose={props.onRequestClose}
        >
            <Box className={styles.body}>
                <div className={styles.frameWrap}>
                    <iframe
                        className={styles.frame}
                        src={getGallerySrc(lang)}
                        title={getFrameTitle(lang)}
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
